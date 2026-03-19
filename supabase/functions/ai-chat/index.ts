/**
 * ai-chat/index.ts — Supabase Edge Function
 *
 * Handles open coaching chat messages from the athlete.
 *
 * Routing (classification passed from client):
 *   program     → coaching-context + qa-doctrine + athlete state
 *   technique   → exercise-technique + athlete state
 *   science     → qa-doctrine + coaching-context
 *   nutrition   → nutrition-context
 *   injury      → injury-pain + exercise-technique + athlete state
 *   general     → coaching-context + qa-doctrine + athlete state
 *
 * Conversation history: last 20 turns (client sends full array).
 * Response is streamed back as SSE.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.20.1';

const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 1024;
const MAX_HISTORY_TURNS = 20;

type MessageClassification =
  | 'program'
  | 'technique'
  | 'science'
  | 'nutrition'
  | 'injury'
  | 'general';

interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')!;

  // ── Authenticate ─────────────────────────────────────────────────────────────
  // verify_jwt = false in config.toml so Supabase gateway skips verification.
  // We verify manually here using auth.getUser() which validates the signature
  // server-side against the Supabase auth service.
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return jsonError('Missing Authorization header', 401);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) {
    return jsonError('Unauthorized', 401);
  }
  const userId = user.id;

  const admin = createClient(supabaseUrl, serviceRoleKey);

  // ── Parse payload ─────────────────────────────────────────────────────────────
  let payload: {
    message: string;
    classification: MessageClassification;
    history: ConversationTurn[];
  };
  try {
    payload = await req.json();
  } catch {
    return jsonError('Invalid JSON body', 400);
  }

  const { message, classification, history } = payload;
  if (!message) {
    return jsonError('message is required', 400);
  }

  // ── Read athlete state for context ────────────────────────────────────────────
  const athleteState = await readAthleteState(admin, userId);

  // ── Load knowledge docs based on classification ───────────────────────────────
  const docsToLoad = getDocsForClassification(classification);
  const loadedDocs = await loadDocs(docsToLoad);

  // ── Build system prompt ────────────────────────────────────────────────────────
  const systemBlocks = buildSystemBlocks(loadedDocs, athleteState, classification);

  // ── Build conversation history (capped at MAX_HISTORY_TURNS) ─────────────────
  const recentHistory = (history ?? []).slice(-MAX_HISTORY_TURNS);
  const messages: Anthropic.MessageParam[] = [
    ...recentHistory.map((turn) => ({
      role: turn.role as 'user' | 'assistant',
      content: turn.content,
    })),
    { role: 'user', content: message },
  ];

  // ── Call Claude API (streaming) ───────────────────────────────────────────────
  const anthropic = new Anthropic({ apiKey: anthropicKey });

  const stream = await anthropic.messages.stream({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: systemBlocks,
    messages,
  });

  // ── Stream response as SSE ────────────────────────────────────────────────────
  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            const sseData = `data: ${JSON.stringify({ text: event.delta.text })}\n\n`;
            controller.enqueue(encoder.encode(sseData));
          } else if (event.type === 'message_stop') {
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          }
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: errMsg })}\n\n`),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*',
    },
  });
});

// ── Knowledge doc routing ──────────────────────────────────────────────────────

type DocKey =
  | 'coaching-context'
  | 'qa-doctrine'
  | 'exercise-technique'
  | 'nutrition-context'
  | 'injury-pain';

const DOC_FILE_MAP: Record<DocKey, string> = {
  'coaching-context': '../_shared/docs/forge-coaching-context.md',
  'qa-doctrine': '../_shared/docs/forge-qa-doctrine.md',
  'exercise-technique': '../_shared/docs/forge-exercise-technique.md',
  'nutrition-context': '../_shared/docs/forge-nutrition-context.md',
  'injury-pain': '../_shared/docs/forge-injury-pain.md',
};

const CLASSIFICATION_DOCS: Record<MessageClassification, DocKey[]> = {
  program:   ['coaching-context', 'qa-doctrine'],
  technique: ['exercise-technique'],
  science:   ['qa-doctrine', 'coaching-context'],
  nutrition: ['nutrition-context'],
  injury:    ['injury-pain', 'exercise-technique'],
  general:   ['coaching-context', 'qa-doctrine'],
};

function getDocsForClassification(classification: MessageClassification): DocKey[] {
  return CLASSIFICATION_DOCS[classification] ?? CLASSIFICATION_DOCS.general;
}

async function loadDocs(keys: DocKey[]): Promise<Record<DocKey, string>> {
  const entries = await Promise.all(
    keys.map(async (key) => {
      const content = await Deno.readTextFile(
        new URL(DOC_FILE_MAP[key], import.meta.url),
      );
      return [key, content] as [DocKey, string];
    }),
  );
  return Object.fromEntries(entries) as Record<DocKey, string>;
}

// ── System prompt construction ────────────────────────────────────────────────

function buildSystemBlocks(
  docs: Record<DocKey, string>,
  athleteState: string,
  classification: MessageClassification,
): Anthropic.TextBlockParam[] {
  const blocks: Anthropic.TextBlockParam[] = [];

  // Add each loaded doc as a cached block
  for (const [, content] of Object.entries(docs)) {
    blocks.push({
      type: 'text',
      text: content,
      // @ts-ignore: cache_control is a valid Anthropic API parameter
      cache_control: { type: 'ephemeral' },
    });
  }

  // Add athlete state summary (not cached — changes each call)
  const needsAthleteState = ['program', 'technique', 'injury', 'general'].includes(classification);
  if (needsAthleteState && athleteState) {
    blocks.push({
      type: 'text',
      text: `## Current Athlete State\n\n${athleteState}`,
    });
  }

  // Add behaviour instructions (last, not cached)
  blocks.push({
    type: 'text',
    text: CHAT_BEHAVIOUR_INSTRUCTIONS,
  });

  return blocks;
}

const CHAT_BEHAVIOUR_INSTRUCTIONS = `
## Chat Behaviour Instructions

You are FORGE's coaching AI. You answer athlete questions using the knowledge above.

Rules:
- Never modify the athlete's program. If asked to change volumes, loads, or exercises, explain that program changes happen through the engine at the next weekly run.
- Never provide specific medical advice or diagnoses. Follow the injury triage protocol from your injury-pain context.
- Never generate numbers (pillar scores, gate colour, loads, volumes) — these come from the engine only.
- Keep answers concise and direct. No padding.
- If the athlete reports sharp, radiating, or joint pain, immediately advise stopping and refer to a medical professional.
- Reference specific data from the athlete state when it strengthens your answer.
`.trim();

// ── Athlete state summary ─────────────────────────────────────────────────────

async function readAthleteState(
  admin: ReturnType<typeof createClient>,
  userId: string,
): Promise<string> {
  try {
    const [profileResult, mesocycleResult, weeklyReportResult] = await Promise.all([
      admin
        .from('athlete_profiles')
        .select('training_age, phase, current_gate, bodyweight_kg')
        .eq('user_id', userId)
        .single(),
      admin
        .from('mesocycle_state')
        .select('cycle_number, current_week, week_type')
        .eq('user_id', userId)
        .single(),
      admin
        .from('weekly_reports')
        .select('week_starting, pillar_scores_json')
        .eq('user_id', userId)
        .order('week_starting', { ascending: false })
        .limit(1)
        .single(),
    ]);

    const profile = profileResult.data;
    const mesocycle = mesocycleResult.data;
    const report = weeklyReportResult.data;

    if (!profile) return '';

    const lines: string[] = [
      `Gate: ${profile.current_gate ?? 'unknown'}`,
      `Phase: ${profile.phase ?? 'unknown'} | Training age: ${profile.training_age ?? 'unknown'}`,
      `Bodyweight: ${profile.bodyweight_kg ?? 'unknown'}kg`,
    ];

    if (mesocycle) {
      lines.push(
        `Mesocycle: Cycle ${mesocycle.cycle_number}, Week ${mesocycle.current_week} (${mesocycle.week_type})`,
      );
    }

    if (report?.pillar_scores_json) {
      const scores = report.pillar_scores_json as Record<string, number>;
      lines.push(
        `Pillar scores (week of ${report.week_starting}): Strength ${scores.strength_score ?? 'N/A'} | Skill ${scores.skill_score ?? 'N/A'} | Cardio ${scores.cardio_score ?? 'N/A'} | Mobility ${scores.mobility_score ?? 'N/A'}`,
      );
    }

    // Read active substitutes from strength_state
    const { data: subs } = await admin
      .from('strength_state')
      .select('movement_name, active_substitute')
      .eq('user_id', userId)
      .not('active_substitute', 'is', null);

    if (subs && subs.length > 0) {
      const subList = subs
        .map((s: { movement_name: string; active_substitute: string }) =>
          `${s.movement_name} → ${s.active_substitute}`)
        .join(', ');
      lines.push(`Active substitutes: ${subList}`);
    }

    // Count sessions logged this week
    const monday = getMondayString(new Date());
    const { data: sessionCount } = await admin
      .from('session_logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('date', monday);

    if (sessionCount !== null) {
      lines.push(`Sessions logged this week: ${sessionCount}`);
    }

    return lines.join('\n');
  } catch {
    return '';
  }
}

function getMondayString(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}

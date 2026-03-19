/**
 * ai-weekly-report/index.ts — Supabase Edge Function
 *
 * Called by engine-run after all engine decisions are written.
 * Reads the engine_decisions row for this week, calls Claude API,
 * and writes the coaching_report_text back to weekly_reports.
 *
 * System prompt uses prompt caching on coaching-context + engine-constants.
 * Retries once on failure; sets report_generation_failed = true if both fail.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.20.1';

const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 1024;

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
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return jsonError('Missing Authorization header', 401);
  }

  // Try to verify as a user JWT. If verified, use user.id and ignore body.user_id.
  // If not (service role call from engine-run), accept user_id from the body.
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authError } = await userClient.auth.getUser();

  const admin = createClient(supabaseUrl, serviceRoleKey);

  // ── Parse payload ─────────────────────────────────────────────────────────────
  let body: { user_id?: string; week_ending: string };
  try {
    body = await req.json();
  } catch {
    return jsonError('Invalid JSON body', 400);
  }

  let userId: string;
  if (!authError && user) {
    // Authenticated user — use their verified ID, ignore any body.user_id
    userId = user.id;
  } else {
    // Service role call (e.g. from engine-run) — accept user_id from body
    if (!body.user_id) {
      return jsonError('user_id required', 400);
    }
    userId = body.user_id;
  }

  const { week_ending } = body;

  // ── Read engine decisions for this week ───────────────────────────────────────
  const { data: engineRow, error: engineError } = await admin
    .from('engine_decisions')
    .select('*')
    .eq('user_id', userId)
    .eq('week_ending', week_ending)
    .single();

  if (engineError || !engineRow) {
    return jsonError(`Engine decisions not found for week_ending ${week_ending}`, 404);
  }

  // ── Read weekly report row (to get pillar scores + context) ───────────────────
  const { data: weeklyReport } = await admin
    .from('weekly_reports')
    .select('*')
    .eq('user_id', userId)
    .eq('week_ending', week_ending)
    .single();

  // ── Read previous week report for context ─────────────────────────────────────
  const prevWeekEnding = new Date(week_ending);
  prevWeekEnding.setDate(prevWeekEnding.getDate() - 7);
  const prevWeekEndingStr = prevWeekEnding.toISOString().slice(0, 10);

  const { data: prevWeekReport } = await admin
    .from('weekly_reports')
    .select('coaching_report, strength_score, skill_score, cardio_score, mobility_score')
    .eq('user_id', userId)
    .eq('week_ending', prevWeekEndingStr)
    .single();

  // ── Read athlete profile ───────────────────────────────────────────────────────
  const { data: profile } = await admin
    .from('athlete_profiles')
    .select('training_age, phase, bodyweight_kg, current_gate')
    .eq('user_id', userId)
    .single();

  // ── Load knowledge docs ────────────────────────────────────────────────────────
  const coachingContext = await Deno.readTextFile(
    new URL('../_shared/docs/forge-coaching-context.md', import.meta.url),
  );
  const engineConstants = await Deno.readTextFile(
    new URL('../_shared/docs/forge-engine-constants.md', import.meta.url),
  );

  // ── Build system prompt (cached) ──────────────────────────────────────────────
  const systemPrompt = `${coachingContext}\n\n---\n\n${engineConstants}`;

  // ── Build user message ────────────────────────────────────────────────────────
  const pillarScores = {
    strength_score: weeklyReport?.strength_score ?? null,
    skill_score: weeklyReport?.skill_score ?? null,
    cardio_score: weeklyReport?.cardio_score ?? null,
    mobility_score: weeklyReport?.mobility_score ?? null,
  };
  const gateColour = profile?.current_gate ?? engineRow.recovery_gate ?? 'green';

  const userMessage = buildUserMessage({
    weekEnding: week_ending,
    gateColour,
    pillarScores,
    engineDecisions: engineRow,
    athleteProfile: profile,
    prevWeekReport: prevWeekReport ?? null,
  });

  // ── Call Claude API (with one retry) ─────────────────────────────────────────
  const anthropic = new Anthropic({ apiKey: anthropicKey });

  let reportText: string | null = null;
  let lastError: string | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: [
          {
            type: 'text',
            text: systemPrompt,
            // @ts-ignore: cache_control is a valid Anthropic API parameter
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages: [
          {
            role: 'user',
            content: userMessage,
          },
        ],
      });

      const textBlock = response.content.find((b) => b.type === 'text');
      if (textBlock && textBlock.type === 'text') {
        reportText = textBlock.text;
        break;
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      if (attempt === 0) {
        // Wait 2 seconds before retry
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
  }

  // ── Write result back to weekly_reports ──────────────────────────────────────
  if (reportText) {
    await admin
      .from('weekly_reports')
      .update({
        coaching_report: reportText,
        report_generated_at: new Date().toISOString(),
        report_generation_failed: false,
      })
      .eq('user_id', userId)
      .eq('week_ending', week_ending);

    return new Response(
      JSON.stringify({ success: true, report_length: reportText.length }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      },
    );
  } else {
    await admin
      .from('weekly_reports')
      .update({ report_generation_failed: true })
      .eq('user_id', userId)
      .eq('week_ending', week_ending);

    return jsonError(`Report generation failed: ${lastError}`, 500);
  }
});

// ── Helpers ────────────────────────────────────────────────────────────────────

function buildUserMessage(params: {
  weekEnding: string;
  gateColour: string;
  pillarScores: Record<string, number | null>;
  engineDecisions: Record<string, unknown>;
  athleteProfile: Record<string, unknown> | null;
  prevWeekReport: { coaching_report: string | null; strength_score: number | null; skill_score: number | null; cardio_score: number | null; mobility_score: number | null } | null;
}): string {
  const { weekEnding, gateColour, pillarScores, engineDecisions, athleteProfile, prevWeekReport } = params;

  const lines: string[] = [
    `## Weekly Report Request — Week ending ${weekEnding}`,
    '',
    `**Recovery Gate:** ${gateColour.toUpperCase()}`,
    `**Athlete Phase:** ${athleteProfile?.phase ?? 'unknown'}`,
    `**Training Age:** ${athleteProfile?.training_age ?? 'unknown'}`,
    `**Bodyweight:** ${athleteProfile?.bodyweight_kg ?? 'unknown'}kg`,
    '',
    '### Pillar Scores (This Week)',
    `- Strength: ${pillarScores.strength_score ?? 'N/A'}/100`,
    `- Skill: ${pillarScores.skill_score ?? 'N/A'}/100`,
    `- Cardio: ${pillarScores.cardio_score ?? 'N/A'}/100`,
    `- Mobility: ${pillarScores.mobility_score ?? 'N/A'}/100`,
    '',
    '### Engine Decisions',
    JSON.stringify(engineDecisions, null, 2),
  ];

  if (prevWeekReport?.coaching_report) {
    lines.push('', '### Previous Week Coaching Report (for continuity)', prevWeekReport.coaching_report);
  }

  if (prevWeekReport && (prevWeekReport.strength_score !== null || prevWeekReport.skill_score !== null)) {
    lines.push(
      '',
      '### Previous Week Pillar Scores',
      `- Strength: ${prevWeekReport.strength_score ?? 'N/A'}`,
      `- Skill: ${prevWeekReport.skill_score ?? 'N/A'}`,
      `- Cardio: ${prevWeekReport.cardio_score ?? 'N/A'}`,
      `- Mobility: ${prevWeekReport.mobility_score ?? 'N/A'}`,
    );
  }

  lines.push(
    '',
    '---',
    '',
    'Generate the weekly coaching report now. Follow the format and voice guidelines in your system prompt.',
    'Target 150–200 words. Be specific about the data above.',
  );

  return lines.join('\n');
}

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}

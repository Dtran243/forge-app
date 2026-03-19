/**
 * ai-form-cue/index.ts — Supabase Edge Function
 *
 * Returns a concise technique cue for a specific exercise.
 * Called from the active session screen when athlete taps a form cue.
 *
 * - System prompt: forge-exercise-technique.md (prompt cached)
 * - Response is short (≤200 words), non-streamed
 * - Client caches per exercise per session to avoid repeat calls
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.20.1';
import { forgeExerciseTechnique } from '../_shared/docs/forge-exercise-technique.ts';

const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 300;

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
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')!;

  // ── Authenticate ─────────────────────────────────────────────────────────────
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

  // ── Parse payload ─────────────────────────────────────────────────────────────
  let payload: { exercise_name: string; context?: string };
  try {
    payload = await req.json();
  } catch {
    return jsonError('Invalid JSON body', 400);
  }

  const { exercise_name, context } = payload;
  if (!exercise_name) {
    return jsonError('exercise_name is required', 400);
  }

  try {
    const techniqueDoc = forgeExerciseTechnique;

    // ── Call Claude API ─────────────────────────────────────────────────────────
    const anthropic = new Anthropic({ apiKey: anthropicKey });

    const userMessage = context
      ? `Give me a form cue for: ${exercise_name}\n\nContext: ${context}`
      : `Give me a form cue for: ${exercise_name}`;

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: [
        {
          type: 'text',
          text: techniqueDoc,
          // @ts-ignore: cache_control is a valid Anthropic API parameter
          cache_control: { type: 'ephemeral' },
        },
        {
          type: 'text',
          text:
            'You are a strength coach giving real-time form cues during a workout. ' +
            'Be concise (2–4 sentences max). Focus on the 1–2 most important cues for this exercise. ' +
            'Use the technique document above as your source of truth. ' +
            'Write in plain text only — no markdown, no asterisks, no bullet points, no headers. No padding, no preamble.',
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
    if (!textBlock || textBlock.type !== 'text') {
      return jsonError('No response from AI', 500);
    }

    return new Response(
      JSON.stringify({ cue: textBlock.text }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('ai-form-cue error:', message);
    return jsonError(`Internal error: ${message}`, 500);
  }
});

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}

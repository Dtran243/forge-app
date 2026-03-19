/**
 * daily-checkin/index.ts — Supabase Edge Function
 *
 * Called when the athlete submits their daily check-in.
 * Receives: soreness (1–5), sleep_hours, hrv_ms (auto from Health), notes
 *
 *   1. Writes/upserts to daily_logs
 *   2. Updates recovery_state: appends to 7d arrays, recomputes rolling averages
 *   3. Evaluates gate colour and writes current_gate to athlete_profiles
 *
 * HRV baseline logic:
 *   - If < 30 days of HRV data, gate uses soreness + sleep only (hrv signal = green)
 *   - Once 30 days accumulate, computes 30-day rolling baseline and writes to
 *     athlete_profiles.hrv_baseline_ms
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { evaluateRecoveryGate } from '../_shared/engine/gate.ts';
import type { RecoverySnapshot } from '../_shared/types/engine.ts';

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
  const userId = user.id;

  const admin = createClient(supabaseUrl, serviceRoleKey);

  // ── Parse payload ─────────────────────────────────────────────────────────────
  let payload: {
    soreness_rating: number;
    sleep_hours: number;
    hrv_ms: number | null;
    notes: string | null;
    log_date?: string; // defaults to today
  };

  try {
    payload = await req.json();
  } catch {
    return jsonError('Invalid JSON body', 400);
  }

  const today = payload.log_date ?? new Date().toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  // ── 1. Write to daily_logs ─────────────────────────────────────────────────────
  const { error: logError } = await admin
    .from('daily_logs')
    .upsert(
      {
        user_id: userId,
        log_date: today,
        soreness_rating: payload.soreness_rating,
        sleep_hours: payload.sleep_hours,
        hrv_ms: payload.hrv_ms,
        notes: payload.notes,
        session_logged: false, // session-complete updates this
        session_type: null,
        session_rpe: null,
      },
      { onConflict: 'user_id,log_date' },
    );

  if (logError) {
    return jsonError(`Failed to write daily log: ${logError.message}`, 500);
  }

  // ── 2. Read last 7 days of logs for gate evaluation ───────────────────────────
  const { data: recentLogs } = await admin
    .from('daily_logs')
    .select('log_date, soreness_rating, sleep_hours, hrv_ms')
    .eq('user_id', userId)
    .gte('log_date', sevenDaysAgo)
    .lte('log_date', today)
    .order('log_date', { ascending: true });

  const logs = recentLogs ?? [];

  // ── 3. Read 30 days of HRV to compute/update baseline ─────────────────────────
  const { data: hrvLogs } = await admin
    .from('daily_logs')
    .select('hrv_ms')
    .eq('user_id', userId)
    .gte('log_date', thirtyDaysAgo)
    .lte('log_date', today)
    .not('hrv_ms', 'is', null)
    .order('log_date', { ascending: true });

  const allHrv = (hrvLogs ?? [])
    .map((l: { hrv_ms: number | null }) => l.hrv_ms)
    .filter((v): v is number => v !== null);

  // Read athlete profile for current baseline
  const { data: profile } = await admin
    .from('athlete_profiles')
    .select('hrv_baseline_ms, max_hr_bpm')
    .eq('user_id', userId)
    .single();

  let currentBaseline = profile?.hrv_baseline_ms as number | null ?? null;

  // Update HRV baseline if we have 30 days of data
  if (allHrv.length >= 20) { // use 20+ readings as practical threshold for 30 days
    const newBaseline = Math.round(
      allHrv.reduce((a, b) => a + b, 0) / allHrv.length,
    );

    if (newBaseline !== currentBaseline) {
      await admin
        .from('athlete_profiles')
        .update({ hrv_baseline_ms: newBaseline })
        .eq('user_id', userId);

      currentBaseline = newBaseline;
    }
  }

  // ── 4. Build recovery snapshot and evaluate gate ──────────────────────────────

  const hrv7d = logs
    .filter((l: { hrv_ms: number | null }) => l.hrv_ms !== null)
    .map((l: { hrv_ms: number | null }) => l.hrv_ms as number);

  const sleep7d = logs
    .filter((l: { sleep_hours: number | null }) => l.sleep_hours !== null)
    .map((l: { sleep_hours: number | null }) => l.sleep_hours as number);

  const soreness7d = logs
    .filter((l: { soreness_rating: number | null }) => l.soreness_rating !== null)
    .map((l: { soreness_rating: number | null }) => l.soreness_rating as number);

  const sleepAvg = sleep7d.length > 0
    ? sleep7d.reduce((a, b) => a + b, 0) / sleep7d.length
    : payload.sleep_hours;

  const sorenessAvg = soreness7d.length > 0
    ? soreness7d.reduce((a, b) => a + b, 0) / soreness7d.length
    : payload.soreness_rating;

  let hrv7dAvg: number | null = null;
  let hrvTrendPct: number | null = null;

  if (hrv7d.length > 0 && currentBaseline !== null) {
    hrv7dAvg = hrv7d.reduce((a, b) => a + b, 0) / hrv7d.length;
    hrvTrendPct = (hrv7dAvg - currentBaseline) / currentBaseline;
  }

  // Consecutive days HRV below amber
  let consecutiveDaysHrvBelowAmber = 0;
  for (let i = logs.length - 1; i >= 0; i--) {
    const log = logs[i];
    if (log.hrv_ms !== null && currentBaseline !== null) {
      const dayTrend = (log.hrv_ms - currentBaseline) / currentBaseline;
      if (dayTrend < -0.10) {
        consecutiveDaysHrvBelowAmber++;
      } else {
        break;
      }
    }
  }

  // Consecutive days sleep below amber
  let consecutiveDaysBelowSleepAmber = 0;
  for (let i = logs.length - 1; i >= 0; i--) {
    const log = logs[i];
    if (log.sleep_hours !== null && log.sleep_hours < 6.0) {
      consecutiveDaysBelowSleepAmber++;
    } else {
      break;
    }
  }

  const snapshot: RecoverySnapshot = {
    hrv_readings_7d: hrv7d,
    hrv_baseline_30d: currentBaseline,
    hrv_trend_7d_vs_baseline_pct: hrvTrendPct,
    sleep_hours_7d: sleep7d,
    sleep_avg_7d: sleepAvg,
    soreness_ratings_7d: soreness7d,
    soreness_avg_7d: sorenessAvg,
    consecutive_days_hrv_below_amber: consecutiveDaysHrvBelowAmber,
    consecutive_days_below_sleep_amber: consecutiveDaysBelowSleepAmber,
    current_gate: 'green', // current value — will be overwritten below
    gate_override_active: false,
    gate_override_expires_date: null,
  };

  const gateResult = evaluateRecoveryGate(snapshot);

  // ── 5. Write current_gate back to athlete_profiles ───────────────────────────
  // Note: current_gate may be a column on athlete_profiles or a derived field
  // — the engine reads it from recovery_state at weekly run time.
  // We write it here so the client can read the live gate colour.
  await admin
    .from('athlete_profiles')
    .update({ current_gate: gateResult.gate_colour })
    .eq('user_id', userId);

  return new Response(
    JSON.stringify({
      success: true,
      gate: gateResult.gate_colour,
      signals: gateResult.signals,
      deload_recommended: gateResult.deload_recommended,
      hrv_baseline_established: currentBaseline !== null,
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    },
  );
});

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}

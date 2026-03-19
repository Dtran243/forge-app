/**
 * engine-run/index.ts — Supabase Edge Function
 *
 * The weekly Sunday engine run. Reads the full athlete state snapshot,
 * calls runEngine(), writes all decisions to the database, then triggers
 * the ai-weekly-report function.
 *
 * Can be invoked manually for testing. In production, configure a Supabase
 * cron job to fire every Sunday at a consistent time (e.g. 23:00 UTC).
 *
 * Auth: Requires a valid user JWT in the Authorization header OR a service-role
 * key in the x-service-role header for scheduled invocations.
 *
 * Body: { user_id: string } — the user to run the engine for.
 *       For scheduled runs, iterate over all users with onboarding_complete = true.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { runEngine } from '../_shared/engine/index.ts';
import type {
  EngineInputSnapshot,
  RecoverySnapshot,
  VolumeSnapshot,
  MobilitySnapshot,
} from '../_shared/types/engine.ts';
import type {
  MuscleGroup,
  LadderName,
  TrackedMovement,
  MobilityArea,
  FlexibilityTrend,
} from '../_shared/types/athlete.ts';

const MUSCLE_GROUPS: MuscleGroup[] = [
  'chest', 'back', 'shoulders', 'biceps', 'triceps',
  'quads', 'hamstrings', 'glutes', 'calves', 'core',
];

const LADDER_NAMES: LadderName[] = [
  'push_ladder', 'pull_ladder', 'core_ladder', 'squat_ladder',
];

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    return await handleRequest(req);
  } catch (err) {
    const message = err instanceof Error ? `${err.message}\n${err.stack}` : String(err);
    return new Response(JSON.stringify({ error: 'Unhandled exception', detail: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
});

async function handleRequest(req: Request): Promise<Response> {

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  // ── Authenticate ─────────────────────────────────────────────────────────────
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return jsonError('Missing Authorization header', 401);
  }

  // Try to verify the token as a user JWT via auth.getUser().
  // If it succeeds, the caller is a real authenticated user.
  // If it fails, the caller is using the service role key (cron job) — in that
  // case we accept user_id from the request body.
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authError } = await userClient.auth.getUser();

  let body: { user_id?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  let userId: string;
  if (!authError && user) {
    // Authenticated user — use their verified ID, ignore any body.user_id
    userId = user.id;
  } else {
    // No verified user — must be a service role call (cron job)
    if (!body.user_id) {
      return jsonError('user_id required', 400);
    }
    userId = body.user_id;
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);

  // ── 1. Read full athlete state snapshot ───────────────────────────────────────

  const today = new Date().toISOString().slice(0, 10);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const weekStartMonday = getMondayString(new Date());

  // athlete_profiles
  const { data: profile, error: profileError } = await admin
    .from('athlete_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (profileError || !profile) {
    return jsonError(`Failed to read athlete profile: ${profileError?.message}`, 500);
  }

  // mesocycle_state
  const { data: mesocycle, error: mesocycleError } = await admin
    .from('mesocycle_state')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (mesocycleError || !mesocycle) {
    return jsonError(`Failed to read mesocycle state: ${mesocycleError?.message}`, 500);
  }

  // strength_state — all rows for this user
  const { data: strengthRows } = await admin
    .from('strength_state')
    .select('*')
    .eq('user_id', userId);

  const strength: Record<string, object> = {};
  for (const row of strengthRows ?? []) {
    // Remap DB column names to engine type field names
    strength[row.movement_name] = {
      ...row,
      consecutive_top: row.consecutive_sessions_at_top_of_range ?? 0,
      consecutive_fail: row.consecutive_sessions_below_range ?? 0,
    };
  }

  // volume_state — current week rows
  const { data: volumeRows } = await admin
    .from('volume_state')
    .select('*')
    .eq('user_id', userId)
    .eq('week_starting', weekStartMonday);

  const currentWeekSets: Record<MuscleGroup, number> = {} as Record<MuscleGroup, number>;
  const targetSetsThisWeek: Record<MuscleGroup, number | null> = {} as Record<MuscleGroup, number | null>;
  for (const muscle of MUSCLE_GROUPS) {
    currentWeekSets[muscle] = 0;
    targetSetsThisWeek[muscle] = null;
  }
  for (const row of volumeRows ?? []) {
    currentWeekSets[row.muscle_group as MuscleGroup] = row.actual_sets ?? 0;
    targetSetsThisWeek[row.muscle_group as MuscleGroup] = row.target_sets ?? null;
  }

  // Previous week volume completion
  const prevWeekStart = getPrevMondayString(new Date());
  const { data: prevVolumeRows } = await admin
    .from('volume_state')
    .select('*')
    .eq('user_id', userId)
    .eq('week_starting', prevWeekStart);

  const volumeCompletionLastWeek: Record<MuscleGroup, number | null> = {} as Record<MuscleGroup, number | null>;
  for (const muscle of MUSCLE_GROUPS) {
    volumeCompletionLastWeek[muscle] = null;
  }
  for (const row of prevVolumeRows ?? []) {
    const muscle = row.muscle_group as MuscleGroup;
    if (row.target_sets > 0) {
      volumeCompletionLastWeek[muscle] = (row.actual_sets ?? 0) / row.target_sets;
    }
  }

  const volumeSnapshot: VolumeSnapshot = {
    current_week_sets: currentWeekSets,
    target_sets_this_week: targetSetsThisWeek,
    volume_completion_pct_last_week: volumeCompletionLastWeek,
  };

  // skill_state
  const { data: skillRows } = await admin
    .from('skill_state')
    .select('*')
    .eq('user_id', userId);

  const skill: Record<string, object> = {};
  for (const row of skillRows ?? []) {
    // Remap DB column names to engine type field names
    skill[row.ladder] = {
      ...row,
      consecutive_weeks_met: row.consecutive_weeks_meeting_standard ?? 0,
      consecutive_sessions_failed: row.consecutive_sessions_failing ?? 0,
    };
  }

  // cardio_state — current week
  const { data: cardioRow } = await admin
    .from('cardio_state')
    .select('*')
    .eq('user_id', userId)
    .eq('week_starting', weekStartMonday)
    .maybeSingle();

  const cardio = cardioRow ?? {
    user_id: userId,
    week_starting: weekStartMonday,
    zone2_minutes: 0,
    zone2_target: 180,
    intervals_completed: false,
    pillar_score: null,
  };

  // daily_logs — last 7 days
  const { data: dailyLogs } = await admin
    .from('daily_logs')
    .select('*')
    .eq('user_id', userId)
    .gte('log_date', sevenDaysAgo)
    .lte('log_date', today)
    .order('log_date', { ascending: true });

  const logs = dailyLogs ?? [];

  // session_logs — this week
  const { data: sessionLogs } = await admin
    .from('session_logs')
    .select('*')
    .eq('user_id', userId)
    .gte('session_date', weekStartMonday)
    .lte('session_date', today)
    .order('session_date', { ascending: true });

  // ── 2. Build recovery snapshot ────────────────────────────────────────────────

  const hrv7d = logs
    .filter((l) => l.hrv_ms !== null)
    .map((l) => l.hrv_ms as number);

  const sleep7d = logs
    .filter((l) => l.sleep_hours !== null)
    .map((l) => l.sleep_hours as number);

  const soreness7d = logs
    .filter((l) => l.soreness_rating !== null)
    .map((l) => l.soreness_rating as number);

  const sleepAvg = sleep7d.length > 0
    ? sleep7d.reduce((a, b) => a + b, 0) / sleep7d.length
    : 7.0;

  const sorenessAvg = soreness7d.length > 0
    ? soreness7d.reduce((a, b) => a + b, 0) / soreness7d.length
    : 1.0;

  const baseline = profile.hrv_baseline_ms as number | null;
  let hrv7dAvg: number | null = null;
  let hrvTrendPct: number | null = null;

  if (hrv7d.length > 0 && baseline !== null) {
    hrv7dAvg = hrv7d.reduce((a, b) => a + b, 0) / hrv7d.length;
    hrvTrendPct = (hrv7dAvg - baseline) / baseline;
  }

  // Count consecutive days HRV below amber threshold
  let consecutiveDaysHrvBelowAmber = 0;
  for (let i = logs.length - 1; i >= 0; i--) {
    const log = logs[i];
    if (log.hrv_ms !== null && baseline !== null) {
      const dayTrend = (log.hrv_ms - baseline) / baseline;
      if (dayTrend < -0.10) {
        consecutiveDaysHrvBelowAmber++;
      } else {
        break;
      }
    }
  }

  // Count consecutive days below sleep amber (< 6h)
  let consecutiveDaysBelowSleepAmber = 0;
  for (let i = logs.length - 1; i >= 0; i--) {
    const log = logs[i];
    if (log.sleep_hours !== null && log.sleep_hours < 6.0) {
      consecutiveDaysBelowSleepAmber++;
    } else {
      break;
    }
  }

  const recoverySnapshot: RecoverySnapshot = {
    hrv_readings_7d: hrv7d,
    hrv_baseline_30d: baseline,
    hrv_trend_7d_vs_baseline_pct: hrvTrendPct,
    sleep_hours_7d: sleep7d,
    sleep_avg_7d: sleepAvg,
    soreness_ratings_7d: soreness7d,
    soreness_avg_7d: sorenessAvg,
    consecutive_days_hrv_below_amber: consecutiveDaysHrvBelowAmber,
    consecutive_days_below_sleep_amber: consecutiveDaysBelowSleepAmber,
    current_gate: (profile as { current_gate?: string }).current_gate as 'green' | 'amber' | 'red' ?? 'green',
    gate_override_active: false,
    gate_override_expires_date: null,
  };

  // ── 3. Build mobility snapshot ────────────────────────────────────────────────

  const mobilityAreas: MobilityArea[] = [
    'hip_flexor', 'thoracic_rotation', 'posterior_chain',
    'shoulder_internal_rotation', 'ankle_dorsiflexion', 'adductors',
  ];
  const mobilityIndex = mesocycle.cycle_number % mobilityAreas.length;

  const mobilitySnapshot: MobilitySnapshot = {
    sessions_completed_this_week: (sessionLogs ?? []).filter(
      (s: { session_type: string }) => s.session_type === 'mobility',
    ).length,
    sessions_planned_this_week: mesocycle.week_type === 'deload' ? 2 : 1,
    embedded_work_completed_this_week: 0, // TODO: derive from session logs
    embedded_work_sessions_this_week: (sessionLogs ?? []).filter(
      (s: { session_type: string }) => s.session_type === 'strength_calisthenics',
    ).length,
    current_rotation_area: mobilityAreas[mobilityIndex],
    next_rotation_area: mobilityAreas[(mobilityIndex + 1) % mobilityAreas.length],
    rotation_week: (mesocycle.cycle_number % 2 === 0 ? 1 : 2) as 1 | 2,
    subjective_flexibility_trend: null,
    mobility_pillar_score_last_week: null,
  };

  // ── 4. Assemble full snapshot ──────────────────────────────────────────────────

  const snapshot: EngineInputSnapshot = {
    athlete: {
      user_id: profile.user_id,
      training_age: profile.training_age,
      phase: profile.phase,
      bodyweight_kg: profile.bodyweight_kg,
      max_hr_bpm: profile.max_hr_bpm,
      hrv_baseline_ms: profile.hrv_baseline_ms,
      equipment_json: profile.equipment,
      onboarding_complete: profile.onboarding_complete,
    },
    mesocycle: {
      user_id: mesocycle.user_id,
      cycle_number: mesocycle.cycle_number,
      current_week: mesocycle.current_week,
      week_type: mesocycle.week_type,
      mev_increment_applied: mesocycle.mev_increment_applied ?? 0,
      deload_triggered_early: mesocycle.deload_triggered_early ?? false,
      deload_trigger_reason: mesocycle.deload_trigger_reason ?? null,
      travel_mode_active: isTravelActive(
        mesocycle.travel_mode_active,
        mesocycle.travel_mode_start_date,
        mesocycle.travel_mode_end_date,
        today,
      ),
      travel_mode_start_date: mesocycle.travel_mode_start_date ?? null,
      travel_mode_end_date: mesocycle.travel_mode_end_date ?? null,
    },
    strength: strength as EngineInputSnapshot['strength'],
    volume: volumeSnapshot,
    skill: skill as EngineInputSnapshot['skill'],
    cardio: cardio as EngineInputSnapshot['cardio'],
    mobility: mobilitySnapshot,
    recovery: recoverySnapshot,
    session_logs_this_week: (sessionLogs ?? []) as EngineInputSnapshot['session_logs_this_week'],
    daily_logs_7d: logs as EngineInputSnapshot['daily_logs_7d'],
  };

  // ── 5. Run the engine ──────────────────────────────────────────────────────────
  console.log('step5: about to run engine, snapshot keys:', Object.keys(snapshot));
  console.log('step5: athlete phase:', snapshot.athlete.phase, 'training_age:', snapshot.athlete.training_age);
  console.log('step5: mesocycle week:', snapshot.mesocycle.current_week, 'week_type:', snapshot.mesocycle.week_type);
  console.log('step5: equipment_json:', JSON.stringify(snapshot.athlete.equipment_json));

  let output;
  try {
    output = runEngine(snapshot);
    console.log('step5: engine complete, week_ending:', output.week_ending);
  } catch (engineErr) {
    const msg = engineErr instanceof Error ? `${engineErr.message}\n${engineErr.stack}` : String(engineErr);
    console.error('step5: engine THREW:', msg);
    throw engineErr;
  }

  // ── 6. Write engine outputs to DB ─────────────────────────────────────────────

  const weekEnding = output.week_ending;
  const nextWeekStart = getMondayFromSunday(weekEnding);

  // weekly_reports — upsert program + pillar scores
  const { error: reportError } = await admin
    .from('weekly_reports')
    .upsert(
      {
        user_id: userId,
        week_ending: weekEnding,
        week_starting: nextWeekStart,
        cycle_number: mesocycle.cycle_number,
        mesocycle_week: mesocycle.current_week,
        strength_score: output.pillar_scores.strength_score,
        skill_score: output.pillar_scores.skill_score,
        cardio_score: output.pillar_scores.cardio_score,
        mobility_score: output.pillar_scores.mobility_score,
        gate_colour: output.gate_evaluation.gate_colour,
        days_trained: output.days_programmed,
        program: output.session_plan,
        coaching_report: null, // will be filled by ai-weekly-report
        report_generation_failed: false,
      },
      { onConflict: 'user_id,week_ending' },
    );

  if (reportError) {
    console.error('Failed to upsert weekly_report:', reportError);
  }

  // engine_decisions
  const { error: decisionsError } = await admin
    .from('engine_decisions')
    .upsert(
      {
        user_id: userId,
        week_ending: weekEnding,
        mesocycle_week: mesocycle.current_week,
        recovery_gate: output.gate_evaluation.gate_colour,
        days_programmed: output.days_programmed,
        deload_triggered: output.deload_triggered,
        volume_changes: output.volume_decisions,
        load_changes: output.load_decisions,
        ladder_changes: output.ladder_decisions,
        flags: output.flags,
      },
      { onConflict: 'user_id,week_ending' },
    );

  if (decisionsError) {
    console.error('Failed to upsert engine_decisions:', decisionsError);
  }

  // strength_state — update loads from overload decisions
  for (const decision of output.load_decisions) {
    if (decision.new_load_kg !== decision.previous_load_kg) {
      const { error } = await admin
        .from('strength_state')
        .update({
          current_load_kg: decision.new_load_kg,
          overload_due: false,
          consecutive_top: decision.overload_triggered ? 0 : undefined,
        })
        .eq('user_id', userId)
        .eq('movement_name', decision.movement);

      if (error) {
        console.error(`Failed to update strength_state for ${decision.movement}:`, error);
      }
    }
  }

  // skill_state — update rungs from ladder decisions
  for (const decision of output.ladder_decisions) {
    if (decision.from_rung !== decision.to_rung) {
      const updateDate = new Date().toISOString().slice(0, 10);
      const { error } = await admin
        .from('skill_state')
        .update({
          current_rung: decision.to_rung,
          current_movement: decision.new_movement,
          current_standard: decision.new_standard,
          consecutive_weeks_met: decision.change === 'advancement' ? 0 : undefined,
          consecutive_sessions_failed: decision.change === 'regression' ? 0 : undefined,
          advancement_due: false,
          regression_due: false,
          last_advancement_date: decision.change === 'advancement' ? updateDate : undefined,
          last_regression_date: decision.change === 'regression' ? updateDate : undefined,
        })
        .eq('user_id', userId)
        .eq('ladder_name', decision.ladder);

      if (error) {
        console.error(`Failed to update skill_state for ${decision.ladder}:`, error);
      }
    }
  }

  // volume_state — write next week's target sets
  for (const decision of output.volume_decisions) {
    const { error } = await admin
      .from('volume_state')
      .upsert(
        {
          user_id: userId,
          week_starting: nextWeekStart,
          muscle_group: decision.muscle_group,
          target_sets: decision.new_target_sets,
          actual_sets: 0,
        },
        { onConflict: 'user_id,week_starting,muscle_group' },
      );

    if (error) {
      console.error(`Failed to upsert volume_state for ${decision.muscle_group}:`, error);
    }
  }

  // mesocycle_state — auto-deactivate travel mode if end date has passed
  if (mesocycle.travel_mode_active && mesocycle.travel_mode_end_date && today > mesocycle.travel_mode_end_date) {
    await admin
      .from('mesocycle_state')
      .update({ travel_mode_active: false, travel_mode_start_date: null, travel_mode_end_date: null })
      .eq('user_id', userId);
  }

  // mesocycle_state — advance week counter
  const nextWeek = mesocycle.current_week >= 4 ? 1 : mesocycle.current_week + 1;
  const nextCycleNumber = mesocycle.current_week >= 4
    ? mesocycle.cycle_number + 1
    : mesocycle.cycle_number;
  const nextWeekType = nextWeek === 4 ? 'deload' : 'loading';
  const newMevIncrement = mesocycle.current_week >= 4
    ? Math.min(mesocycle.mev_increment_applied + 1, 3) // cap at +3
    : mesocycle.mev_increment_applied;

  const { error: mesocycleError2 } = await admin
    .from('mesocycle_state')
    .update({
      current_week: nextWeek,
      cycle_number: nextCycleNumber,
      week_type: nextWeekType,
      mev_increment_applied: newMevIncrement,
      deload_triggered_early: output.deload_triggered && mesocycle.current_week < 4,
      deload_trigger_reason: output.deload_triggered && mesocycle.current_week < 4
        ? output.gate_evaluation.gate_colour === 'red' ? 'red_gate' : null
        : null,
    })
    .eq('user_id', userId);

  if (mesocycleError2) {
    console.error('Failed to update mesocycle_state:', mesocycleError2);
  }

  // ── 7. Trigger AI weekly report ───────────────────────────────────────────────
  try {
    const reportResp = await fetch(`${supabaseUrl}/functions/v1/ai-weekly-report`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ user_id: userId, week_ending: weekEnding }),
    });

    if (!reportResp.ok) {
      console.error('ai-weekly-report trigger failed:', await reportResp.text());
    }
  } catch (e) {
    console.error('Failed to trigger ai-weekly-report:', e);
  }

  return new Response(
    JSON.stringify({
      success: true,
      week_ending: weekEnding,
      gate: output.gate_evaluation.gate_colour,
      days_programmed: output.days_programmed,
      deload_triggered: output.deload_triggered,
      flags: output.flags,
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    },
  );
}

// ── Travel mode helpers ───────────────────────────────────────────────────────

function isTravelActive(
  flag: boolean,
  startDate: string | null,
  endDate: string | null,
  today: string,
): boolean {
  if (!flag) return false;
  if (endDate && today > endDate) return false;          // past end — expired
  if (startDate && today < startDate) return false;      // not started yet
  return true;
}

// ── Date helpers ──────────────────────────────────────────────────────────────

function getMondayString(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function getPrevMondayString(date: Date): string {
  const d = new Date(date);
  d.setDate(d.getDate() - 7);
  return getMondayString(d);
}

function getMondayFromSunday(sundayISO: string): string {
  const d = new Date(sundayISO);
  d.setDate(d.getDate() - 6);
  return d.toISOString().slice(0, 10);
}

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}

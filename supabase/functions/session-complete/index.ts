/**
 * session-complete/index.ts — Supabase Edge Function
 *
 * Called when the athlete taps "Complete Session" in the active session screen.
 * Receives the completed session log and:
 *
 *   1. Writes the session to session_logs
 *   2. Updates strength_state: consecutive counters + overload_due + PR check
 *   3. Updates volume_state: increments actual_sets per muscle group
 *   4. Updates skill_state: consecutive counters for advancement/regression
 *   5. Updates daily_logs: session_logged = true, session_type, session_rpe
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { MuscleGroup, TrackedMovement, LadderName } from '../_shared/types/athlete.ts';
import type { LoggedExercise } from '../_shared/types/athlete.ts';

const MUSCLE_GROUPS: MuscleGroup[] = [
  'chest', 'back', 'shoulders', 'biceps', 'triceps',
  'quads', 'hamstrings', 'glutes', 'calves', 'core',
];

// Maps exercise pattern to muscle groups it trains (primary)
const PATTERN_TO_MUSCLES: Record<string, MuscleGroup[]> = {
  h_push:  ['chest', 'triceps', 'shoulders'],
  v_push:  ['shoulders', 'triceps'],
  h_pull:  ['back', 'biceps'],
  v_pull:  ['back', 'biceps'],
  hinge:   ['hamstrings', 'glutes'],
  quad:    ['quads', 'glutes'],
};

// Maps exercise display name to tracked movement key
const NAME_TO_MOVEMENT: Record<string, TrackedMovement> = {
  'Deadlift':                   'deadlift',
  'Romanian deadlift':          'romanian_deadlift',
  'Barbell squat':              'barbell_squat',
  'Hack squat':                 'hack_squat',
  'Barbell bench press':        'barbell_bench_press',
  'Dumbbell bench press':       'dumbbell_bench_press',
  'Barbell overhead press':     'barbell_overhead_press',
  'Dumbbell overhead press':    'dumbbell_overhead_press',
  'Barbell row':                'barbell_row',
  'Cable row':                  'cable_row',
  'Weighted pull-up':           'weighted_pull_up',
  'Lat pulldown':               'lat_pulldown',
};

// Rep range bounds used for double-progression evaluation
const REP_RANGE_BOUNDS: Record<string, { min: number; max: number }> = {
  '4-6':   { min: 4,  max: 6  },
  '8-12':  { min: 8,  max: 12 },
  '15-20': { min: 15, max: 20 },
};

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

  // ── Authenticate ──────────────────────────────────────────────────────────────
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
    date: string;
    session_type: string;
    session_rpe: number | null;
    duration_minutes: number | null;
    exercises_json: {
      exercises: LoggedExercise[];
      cardio: object | null;
      mobility: object | null;
    };
    gate_at_time: string;
  };

  try {
    payload = await req.json();
  } catch {
    return jsonError('Invalid JSON body', 400);
  }

  // ── 1. Write session_logs (idempotency guard) ─────────────────────────────────
  // Check for an existing row to prevent duplicate submissions (double-tap, network retry).
  const { data: existing } = await admin
    .from('session_logs')
    .select('id')
    .eq('user_id', userId)
    .eq('session_date', payload.date)
    .eq('session_type', payload.session_type)
    .maybeSingle();

  if (existing) {
    // Already logged — return success without inserting a duplicate.
    console.log(`Duplicate session-complete call skipped: ${userId} ${payload.date} ${payload.session_type}`);
    return new Response(
      JSON.stringify({ success: true, duplicate: true }),
      { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } },
    );
  }

  const { error: sessionError } = await admin
    .from('session_logs')
    .insert({
      user_id: userId,
      session_date: payload.date,
      session_type: payload.session_type,
      session_rpe: payload.session_rpe,
      duration_minutes: payload.duration_minutes,
      exercises: payload.exercises_json.exercises,
      cardio: payload.exercises_json.cardio,
      mobility: payload.exercises_json.mobility,
      gate_at_time: payload.gate_at_time,
    });

  if (sessionError) {
    console.error('session_logs insert error:', JSON.stringify(sessionError));
    return jsonError(`Failed to write session log: ${sessionError.message}`, 500);
  }

  // ── 2. Update strength_state ──────────────────────────────────────────────────
  if (payload.session_type === 'strength_calisthenics') {
    for (const exercise of payload.exercises_json.exercises) {
      if (exercise.tier !== 'primary') continue;

      const movementKey = NAME_TO_MOVEMENT[exercise.name];
      if (!movementKey) continue;

      // Read current state
      const { data: currentState } = await admin
        .from('strength_state')
        .select('*')
        .eq('user_id', userId)
        .eq('movement_name', movementKey)
        .maybeSingle();

      if (!currentState) continue;

      const repRange = REP_RANGE_BOUNDS[currentState.current_rep_range] ??
        { min: 4, max: 6 };

      // Evaluate all sets: did the athlete hit top of range with good RPE?
      const completedReps = exercise.sets.map((s) => s.reps_completed ?? 0);
      const completedLoad = exercise.sets[0]?.load_kg ?? 0;
      const avgRpe = exercise.sets
        .map((s) => s.rpe_reported ?? 8)
        .reduce((a, b) => a + b, 0) / exercise.sets.length;

      const hitTopOfRange = completedReps.every((r) => r >= repRange.max) && avgRpe <= 7;
      const failedBottomOfRange = completedReps.some((r) => r < repRange.min);

      let newConsecutiveTop = currentState.consecutive_top;
      let newConsecutiveFail = currentState.consecutive_fail;
      let overloadDue = currentState.overload_due;

      if (hitTopOfRange) {
        newConsecutiveTop = currentState.consecutive_top + 1;
        newConsecutiveFail = 0;
        if (newConsecutiveTop >= 2) {
          overloadDue = true;
        }
      } else if (failedBottomOfRange) {
        newConsecutiveFail = currentState.consecutive_fail + 1;
        newConsecutiveTop = 0;
        overloadDue = false;
      } else {
        // Hit within range but not at top — reset top counter
        newConsecutiveTop = 0;
      }

      // PR check
      const currentPr = currentState.pr_kg ?? 0;
      const newPr = completedLoad > currentPr ? completedLoad : currentPr;

      await admin
        .from('strength_state')
        .update({
          consecutive_top: newConsecutiveTop,
          consecutive_fail: newConsecutiveFail,
          overload_due: overloadDue,
          pr_kg: newPr > 0 ? newPr : currentState.pr_kg,
        })
        .eq('user_id', userId)
        .eq('movement_name', movementKey);
    }

    // ── 3. Update volume_state ────────────────────────────────────────────────────
    const weekStartMonday = getMondayString(new Date(payload.date));
    const setsByMuscle: Record<MuscleGroup, number> = {} as Record<MuscleGroup, number>;
    for (const muscle of MUSCLE_GROUPS) {
      setsByMuscle[muscle] = 0;
    }

    for (const exercise of payload.exercises_json.exercises) {
      const muscles = PATTERN_TO_MUSCLES[exercise.pattern] ?? [];
      const setPrimary = muscles[0];
      if (setPrimary) {
        setsByMuscle[setPrimary] = (setsByMuscle[setPrimary] ?? 0) + exercise.sets.length;
      }
      // Indirect sets for secondary muscles (at 0.5 weight)
      // For simplicity we track only the primary muscle per set
    }

    for (const [muscle, sets] of Object.entries(setsByMuscle)) {
      if (sets === 0) continue;

      // Read current row
      const { data: volumeRow } = await admin
        .from('volume_state')
        .select('actual_sets')
        .eq('user_id', userId)
        .eq('week_starting', weekStartMonday)
        .eq('muscle_group', muscle)
        .maybeSingle();

      const currentActual = volumeRow?.actual_sets ?? 0;

      await admin
        .from('volume_state')
        .upsert(
          {
            user_id: userId,
            week_starting: weekStartMonday,
            muscle_group: muscle,
            actual_sets: currentActual + sets,
          },
          { onConflict: 'user_id,week_starting,muscle_group' },
        );
    }

    // ── 4. Update skill_state ─────────────────────────────────────────────────────
    const ladderPatterns: Record<string, LadderName> = {
      'pull_ladder': 'pull_ladder',
      'push_ladder': 'push_ladder',
      'core_ladder': 'core_ladder',
      'squat_ladder': 'squat_ladder',
    };

    // Check calisthenics exercises logged in this session
    for (const exercise of payload.exercises_json.exercises) {
      if (exercise.tier !== 'accessory') continue;

      // Determine which ladder this exercise belongs to by checking names
      for (const [, ladderName] of Object.entries(ladderPatterns)) {
        const { data: skillState } = await admin
          .from('skill_state')
          .select('*')
          .eq('user_id', userId)
          .eq('ladder_name', ladderName)
          .maybeSingle();

        if (!skillState) continue;
        if (exercise.name !== skillState.current_movement) continue;

        // Evaluate: did athlete complete the standard?
        const completedReps = exercise.sets.map((s) => s.reps_completed ?? 0);
        const avgRir = exercise.sets
          .map((s) => s.rir_reported ?? 1)
          .reduce((a, b) => a + b, 0) / exercise.sets.length;

        const metStandard = completedReps.every((r) => r >= 5) && avgRir >= 2;
        const failedMinimum = completedReps.some((r) => r < 3);

        let newConsecutiveWeeksMet = skillState.consecutive_weeks_met;
        let newConsecutiveSessionsFailed = skillState.consecutive_sessions_failed;
        let advancementDue = skillState.advancement_due;
        let regressionDue = skillState.regression_due;

        if (metStandard) {
          newConsecutiveWeeksMet = skillState.consecutive_weeks_met + 1;
          newConsecutiveSessionsFailed = 0;
          if (newConsecutiveWeeksMet >= 2) {
            advancementDue = true;
          }
        } else if (failedMinimum) {
          newConsecutiveSessionsFailed = skillState.consecutive_sessions_failed + 1;
          newConsecutiveWeeksMet = 0;
          if (newConsecutiveSessionsFailed >= 2) {
            regressionDue = true;
          }
        }

        await admin
          .from('skill_state')
          .update({
            consecutive_weeks_met: newConsecutiveWeeksMet,
            consecutive_sessions_failed: newConsecutiveSessionsFailed,
            advancement_due: advancementDue,
            regression_due: regressionDue,
          })
          .eq('user_id', userId)
          .eq('ladder_name', ladderName);

        break; // found the matching ladder
      }
    }
  }

  // ── 5. Update daily_logs ──────────────────────────────────────────────────────
  const { error: dailyError } = await admin
    .from('daily_logs')
    .update({
      session_logged: true,
      session_type: payload.session_type,
      session_rpe: payload.session_rpe,
    })
    .eq('user_id', userId)
    .eq('log_date', payload.date);

  if (dailyError) {
    // Non-fatal — daily log may not exist yet for today
    console.error('Failed to update daily_logs:', dailyError);
  }

  return new Response(
    JSON.stringify({ success: true }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    },
  );
});

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

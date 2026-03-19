/**
 * onboarding-complete/index.ts — Supabase Edge Function
 *
 * Called once when the athlete completes onboarding.
 * Receives the full onboarding payload from the client and:
 *
 *   1. Upserts the athlete_profiles row (creates it for the first time).
 *   2. Calls initialise_athlete_state(user_id) to seed all other state tables
 *      (mesocycle_state, recovery_state, cardio_state, mobility_state).
 *   3. Upserts strength_state rows for each assessed movement with the
 *      confirmed working load.
 *   4. Upserts skill_state rows for each ladder with the self-placement rung.
 *   5. Sets onboarding_complete = true on the athlete_profiles row.
 *
 * This function uses the service role key to bypass RLS — it is only reachable
 * with a valid user JWT (the client passes the user's access token in the
 * Authorization header and we verify it before proceeding).
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ── Ladder data (mirrors forge-engine-constants.md Section 15) ────────────────

const PUSH_LADDER = [
  { rung: 1, name: 'Incline push-up', standard: '3x12 RIR2' },
  { rung: 2, name: 'Push-up', standard: '3x15 RIR2' },
  { rung: 3, name: 'Diamond push-up', standard: '3x12 RIR2' },
  { rung: 4, name: 'Archer push-up', standard: '3x8 each RIR2' },
  { rung: 5, name: 'Pseudo planche push-up', standard: '3x8 RIR2' },
  { rung: 6, name: 'Ring push-up', standard: '3x10 RIR2' },
  { rung: 7, name: 'Ring dip', standard: '3x8 RIR2' },
  { rung: 8, name: 'Weighted ring dip', standard: '3x6 +10kg RIR2' },
];

const PULL_LADDER = [
  { rung: 1, name: 'Band-assisted pull-up', standard: '3x10 RIR2' },
  { rung: 2, name: 'Pull-up', standard: '3x8 RIR2' },
  { rung: 3, name: 'Weighted pull-up', standard: '3x6 +10kg RIR2' },
  { rung: 4, name: 'L-sit pull-up', standard: '3x5 RIR2' },
  { rung: 5, name: 'Archer pull-up', standard: '3x4 each RIR2' },
  { rung: 6, name: 'Weighted pull-up +20kg', standard: '3x5 RIR2' },
  { rung: 7, name: 'One-arm negative', standard: '3x3 each controlled' },
];

const CORE_LADDER = [
  { rung: 1, name: 'Hollow body hold', standard: '3x30s' },
  { rung: 2, name: 'Tuck L-sit (floor)', standard: '3x20s' },
  { rung: 3, name: 'L-sit (floor)', standard: '3x15s' },
  { rung: 4, name: 'L-sit (parallettes)', standard: '3x20s' },
  { rung: 5, name: 'Tuck V-sit', standard: '3x10s' },
  { rung: 6, name: 'V-sit', standard: '3x10s' },
  { rung: 7, name: 'Manna progression', standard: '3x5s' },
];

const SQUAT_LADDER = [
  { rung: 1, name: 'Assisted pistol squat', standard: '3x8 each RIR2' },
  { rung: 2, name: 'Shrimp squat', standard: '3x6 each RIR2' },
  { rung: 3, name: 'Pistol squat', standard: '3x5 each RIR2' },
  { rung: 4, name: 'Weighted pistol squat', standard: '3x4 each +10kg RIR2' },
  { rung: 5, name: 'Nordic curl', standard: '3x5 RIR2' },
  { rung: 6, name: 'Weighted Nordic curl', standard: '3x5 +10kg RIR2' },
];

const LADDERS: Record<string, typeof PUSH_LADDER> = {
  push_ladder: PUSH_LADDER,
  pull_ladder: PULL_LADDER,
  core_ladder: CORE_LADDER,
  squat_ladder: SQUAT_LADDER,
};

// ── Handler ───────────────────────────────────────────────────────────────────

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

  // ── Authenticate the caller ─────────────────────────────────────────────────
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return jsonError('Missing Authorization header', 401);
  }

  // Pass the token explicitly — auth.getUser() without an argument does not
  // use the global Authorization header in the Deno Edge Function environment.
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const userClient = createClient(supabaseUrl, anonKey);
  const token = authHeader.replace('Bearer ', '');
  const { data: userData, error: userError } = await userClient.auth.getUser(token);
  if (userError || !userData.user) {
    return jsonError(`Invalid or expired token: ${userError?.message ?? 'no user'}`, 401);
  }
  const userId = userData.user.id;

  // ── Parse payload ───────────────────────────────────────────────────────────
  let payload: {
    age: number | null;
    bodyweight_kg: number | null;
    height_cm: number | null;
    training_age: string;
    phase: string;
    equipment: Record<string, boolean>;
    assessment_loads: { movementKey: string; displayName: string; loadKg: number }[];
    ladder_placements: Record<string, number>;
  };

  try {
    payload = await req.json();
  } catch {
    return jsonError('Invalid JSON body', 400);
  }

  // ── Service role client (bypasses RLS) ──────────────────────────────────────
  const admin = createClient(supabaseUrl, serviceRoleKey);

  // ── 1. Upsert athlete_profiles ───────────────────────────────────────────────
  const maxHr = payload.age ? 220 - payload.age : null;
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const { error: profileError } = await admin
    .from('athlete_profiles')
    .upsert(
      {
        user_id: userId,
        training_age: payload.training_age,
        phase: payload.phase,
        bodyweight_kg: payload.bodyweight_kg,
        height_cm: payload.height_cm,
        age: payload.age,
        max_hr_bpm: maxHr,
        equipment: payload.equipment,
        onboarding_complete: false, // will be set to true at the end
        onboarding_date: today,
      },
      { onConflict: 'user_id' },
    );

  if (profileError) {
    return jsonError(`Failed to create athlete profile: ${profileError.message}`, 500);
  }

  // ── 2. Call initialise_athlete_state() SQL function ──────────────────────────
  const { error: initError } = await admin.rpc('initialise_athlete_state', {
    p_user_id: userId,
  });

  if (initError) {
    console.error('initialise_athlete_state error:', initError);
    // Non-fatal — tables may already exist if this was a retry. Continue.
  }

  // ── 3. Upsert strength_state rows with assessed loads ────────────────────────
  if (payload.assessment_loads.length > 0) {
    const strengthRows = payload.assessment_loads.map((load) => ({
      user_id: userId,
      movement_name: load.movementKey,
      current_load_kg: load.loadKg,
      current_rep_range: '4-6',
      consecutive_top: 0,
      consecutive_fail: 0,
      overload_due: false,
    }));

    const { error: strengthError } = await admin
      .from('strength_state')
      .upsert(strengthRows, { onConflict: 'user_id,movement_name' });

    if (strengthError) {
      return jsonError(`Failed to set strength state: ${strengthError.message}`, 500);
    }
  }

  // ── 4. Upsert skill_state rows with ladder placements ─────────────────────────
  const ladderRows = Object.entries(payload.ladder_placements).map(([ladderKey, rung]) => {
    const ladder = LADDERS[ladderKey];
    const rungData = ladder?.find((r) => r.rung === rung) ?? ladder?.[0];
    return {
      user_id: userId,
      ladder_name: ladderKey,
      current_rung: rung,
      current_movement: rungData?.name ?? '',
      current_standard: rungData?.standard ?? '',
      consecutive_weeks_met: 0,
      consecutive_sessions_failed: 0,
      advancement_due: false,
      regression_due: false,
    };
  });

  if (ladderRows.length > 0) {
    const { error: skillError } = await admin
      .from('skill_state')
      .upsert(ladderRows, { onConflict: 'user_id,ladder_name' });

    if (skillError) {
      return jsonError(`Failed to set skill state: ${skillError.message}`, 500);
    }
  }

  // ── 5. Mark onboarding complete ───────────────────────────────────────────────
  const { error: completeError } = await admin
    .from('athlete_profiles')
    .update({ onboarding_complete: true })
    .eq('user_id', userId);

  if (completeError) {
    return jsonError(`Failed to mark onboarding complete: ${completeError.message}`, 500);
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
});

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

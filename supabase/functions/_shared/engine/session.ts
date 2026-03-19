/**
 * engine/session.ts
 *
 * generateSessionPlan(decisions, snapshot) → WeeklySessionPlan
 *
 * Builds the complete next-week program from engine decisions and athlete state.
 * Uses the Upper/Lower split with DUP assignment from forge-session-templates.md.
 *
 * Session sequence per gate/day count:
 *   5 days (green):  Upper A → Lower A → Zone 2 → Upper B → Lower B
 *   4 days (amber):  Upper A → Lower A → Upper B → Lower B
 *   3 days (red):    Upper A → Lower A → Upper B
 *   6 days (green, multiple low pillar scores): adds a Zone 2 or Mobility
 *
 * Deload weeks use the same session order but with:
 *   - compounds only (no accessories)
 *   - one rung regressed calisthenics
 *   - -20% load
 *   - hypertrophy zone only
 *   - 2 dedicated mobility sessions
 */

import type {
  PlannedSession,
  PlannedExercise,
  PlannedSet,
  SupersetInfo,
  WeekType,
  DayOfWeek,
  SessionType,
  MovementPattern,
  ExerciseTier,
  Pillar,
  LadderName,
} from '../types/athlete.ts';
import type { WeeklySessionPlan, VolumeDecision, LoadDecision, LadderDecision } from '../types/engine.ts';
import type { EngineInputSnapshot } from '../types/engine.ts';
import {
  REP_RANGES,
  CALISTHENICS_FINISHER_SETS,
  DAYS_GREEN_STANDARD,
  DAYS_GREEN_HIGH_PILLAR_GAPS,
  DAYS_AMBER,
  DAYS_RED,
  PILLAR_SCORE_DECREASE_THRESHOLD,
  ZONE2_WEEKLY_MINUTES_TARGET,
  DELOAD_INTENSITY_REDUCTION,
  LADDERS,
} from './constants.ts';
import { isTimedHold } from '../data/exercises.ts';

// ── Date helpers ─────────────────────────────────────────────────────────────

function addDaysToISO(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// ── Day-of-week sequence ──────────────────────────────────────────────────────

const DAYS_OF_WEEK: DayOfWeek[] = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
];

// ── Exercise pools (from forge-engine-constants.md Section 16) ────────────────

const EXERCISE_POOLS = {
  v_pull_primary:   ['Weighted pull-up', 'Lat pulldown'],
  h_push_primary:   ['Barbell bench press', 'Dumbbell bench press'],
  v_push_primary:   ['Barbell overhead press', 'Dumbbell overhead press'],
  h_pull_primary:   ['Barbell row', 'Cable row'],
  hinge_primary:    ['Deadlift', 'Romanian deadlift'],
  quad_primary:     ['Barbell squat', 'Hack squat', 'Leg press'],
  hinge_accessory:  ['Single-leg RDL', 'Good morning'],
  // Priority order: unilateral free movements first, machine last resort
  quad_accessory:   ['Bulgarian split squat', 'Step-up', 'Leg extension'],
  v_push_accessory: ['Lateral raise', 'Rear delt fly'],
  biceps:           ['Dumbbell curl', 'Hammer curl'],
  triceps:          ['Tricep pushdown', 'Overhead tricep extension'],
  glutes_calves:    ['Hip thrust', 'Standing calf raise'],
  // Nordic curl is bodyweight — no equipment required, used as fallback when no cable machine
  hamstring_iso:    ['Leg curl', 'Cable pull-through', 'Nordic curl'],
};

// ── Travel mode exercise pools ────────────────────────────────────────────────
// Bodyweight / minimal-equipment alternatives used when travel_mode_active = true.
// Assumes access to: bodyweight, a chair/step, and optionally a pull-up bar or table edge.

const TRAVEL_EXERCISE_POOLS = {
  v_pull_primary:   ['Pull-up', 'Inverted row'],
  h_push_primary:   ['Push-up', 'Archer push-up'],
  v_push_primary:   ['Pike push-up', 'Elevated pike push-up'],
  h_pull_primary:   ['Inverted row', 'Table row'],
  hinge_primary:    ['Single-leg RDL', 'Good morning'],
  quad_primary:     ['Bulgarian split squat', 'Pistol squat'],
  hinge_accessory:  ['Nordic curl', 'Glute bridge'],
  quad_accessory:   ['Reverse lunge', 'Step-up'],
  v_push_accessory: ['Wall shoulder tap', 'Pike push-up'],
  biceps:           ['Chin-up', 'Commando pull-up'],
  triceps:          ['Diamond push-up', 'Bench dip'],
  glutes_calves:    ['Glute bridge', 'Single-leg calf raise'],
  hamstring_iso:    ['Nordic curl', 'Single-leg glute bridge'],
} as const;

// ── Pool → travel pool mapping (avoids fragile reference-identity lookup) ─────

const POOL_TRAVEL_MAP = new Map<string[], readonly string[]>([
  [EXERCISE_POOLS.v_pull_primary,   TRAVEL_EXERCISE_POOLS.v_pull_primary],
  [EXERCISE_POOLS.h_push_primary,   TRAVEL_EXERCISE_POOLS.h_push_primary],
  [EXERCISE_POOLS.v_push_primary,   TRAVEL_EXERCISE_POOLS.v_push_primary],
  [EXERCISE_POOLS.h_pull_primary,   TRAVEL_EXERCISE_POOLS.h_pull_primary],
  [EXERCISE_POOLS.hinge_primary,    TRAVEL_EXERCISE_POOLS.hinge_primary],
  [EXERCISE_POOLS.quad_primary,     TRAVEL_EXERCISE_POOLS.quad_primary],
  [EXERCISE_POOLS.hinge_accessory,  TRAVEL_EXERCISE_POOLS.hinge_accessory],
  [EXERCISE_POOLS.quad_accessory,   TRAVEL_EXERCISE_POOLS.quad_accessory],
  [EXERCISE_POOLS.v_push_accessory, TRAVEL_EXERCISE_POOLS.v_push_accessory],
  [EXERCISE_POOLS.biceps,           TRAVEL_EXERCISE_POOLS.biceps],
  [EXERCISE_POOLS.triceps,          TRAVEL_EXERCISE_POOLS.triceps],
  [EXERCISE_POOLS.glutes_calves,    TRAVEL_EXERCISE_POOLS.glutes_calves],
  [EXERCISE_POOLS.hamstring_iso,    TRAVEL_EXERCISE_POOLS.hamstring_iso],
]);

// ── Equipment filtering ───────────────────────────────────────────────────────

function selectExercise(
  pool: string[],
  snapshot: EngineInputSnapshot,
  excludedNames: string[] = [],
): string {
  // Travel mode — override pool with bodyweight equivalent
  if (snapshot.mesocycle.travel_mode_active) {
    const travelPool = POOL_TRAVEL_MAP.get(pool);
    if (travelPool && travelPool.length > 0) {
      const filtered = [...travelPool].filter((n) => !excludedNames.includes(n));
      return filtered[0] ?? travelPool[0];
    }
  }

  const equipment = snapshot.athlete.equipment_json ?? {};
  console.log('[selectExercise] pool:', pool, '| equipment_json:', JSON.stringify(equipment));

  const filtered = pool.filter((name) => {
    if (excludedNames.includes(name)) return false;
    if (name.toLowerCase().includes('barbell') || name === 'Deadlift' || name === 'Good morning') {
      return (equipment as Record<string, boolean>).barbell_rack === true;
    }
    if (name.toLowerCase().includes('cable') || name === 'Leg curl' || name === 'Cable pull-through') {
      return (equipment as Record<string, boolean>).cable_machine === true;
    }
    if (name === 'Hack squat' || name === 'Leg press') {
      const eq = equipment as Record<string, boolean>;
      return eq.cable_machine === true || eq.machines === true || eq.barbell_rack !== true;
    }
    if (name === 'Leg extension') {
      const eq = equipment as Record<string, boolean>;
      return eq.cable_machine === true || eq.machines === true;
    }
    if (name === 'Weighted pull-up' || name === 'Lat pulldown') {
      return (equipment as Record<string, boolean>).pull_up_bar === true ||
             (equipment as Record<string, boolean>).cable_machine === true;
    }
    if (name === 'Goblet squat') {
      return (equipment as Record<string, boolean>).dumbbells === true;
    }
    if (name === 'Bulgarian split squat') {
      return (equipment as Record<string, boolean>).dumbbells !== false;
    }
    return true;
  });

  if (filtered.length === 0) {
    console.warn(`selectExercise: no equipment-compatible option in [${pool.join(', ')}], using last-resort fallback.`);
    return pool[pool.length - 1];
  }
  return filtered[0];
}

// ── Set builder ───────────────────────────────────────────────────────────────

function buildSets(
  setCount: number,
  zone: 'strength' | 'hypertrophy' | 'metabolic',
  loadKg: number | null,
  isDeload: boolean,
): PlannedSet[] {
  const range = REP_RANGES[zone];
  const effectiveLoad = isDeload && loadKg !== null
    ? Math.round(loadKg * (1 - DELOAD_INTENSITY_REDUCTION) / 2.5) * 2.5
    : loadKg;

  return Array.from({ length: setCount }, (_, i) => {
    const isFinalSet = i === setCount - 1;
    return {
      set_number: i + 1,
      target_reps_min: range.min,
      target_reps_max: range.max,
      hold_duration_seconds: null,
      load_kg: effectiveLoad,
      rir_target: isFinalSet ? range.rir_final : range.rir_target,
    };
  });
}

// ── Timed hold set builder (for core finisher) ────────────────────────────────

function buildTimedSets(setCount: number, standard: string): PlannedSet[] {
  const match = standard.match(/(\d+)x(\d+)s/);
  const holdSeconds = match ? Number(match[2]) : 30;

  return Array.from({ length: setCount }, (_, i) => ({
    set_number: i + 1,
    target_reps_min: null,
    target_reps_max: null,
    hold_duration_seconds: holdSeconds,
    load_kg: null,
    rir_target: null,
  }));
}

// ── Volume target lookup ──────────────────────────────────────────────────────

function setsForMuscle(
  muscle: string,
  volumeDecisions: VolumeDecision[],
  slotsForMuscle: number,
): number {
  const decision = volumeDecisions.find((d) => d.muscle_group === muscle);
  const weeklyTarget = decision?.new_target_sets ?? 10;
  return Math.max(2, Math.ceil(weeklyTarget / slotsForMuscle));
}

// ── Load lookup ───────────────────────────────────────────────────────────────

function loadForMovement(
  movementName: string,
  loadDecisions: LoadDecision[],
  snapshot: EngineInputSnapshot,
): number | null {
  for (const [, state] of Object.entries(snapshot.strength)) {
    const keyToName: Record<string, string> = {
      deadlift:                 'Deadlift',
      romanian_deadlift:        'Romanian deadlift',
      barbell_squat:            'Barbell squat',
      hack_squat:               'Hack squat',
      barbell_bench_press:      'Barbell bench press',
      dumbbell_bench_press:     'Dumbbell bench press',
      barbell_overhead_press:   'Barbell overhead press',
      dumbbell_overhead_press:  'Dumbbell overhead press',
      barbell_row:              'Barbell row',
      cable_row:                'Cable row',
      weighted_pull_up:         'Weighted pull-up',
      lat_pulldown:             'Lat pulldown',
    };
    const matched = loadDecisions.find((d) => {
      const displayName = keyToName[d.movement];
      return displayName === movementName;
    });
    if (matched) return matched.new_load_kg;
  }
  return null;
}

// ── Superset info builder ─────────────────────────────────────────────────────

function buildSupersetInfo(
  ladderKey: 'push_ladder' | 'pull_ladder' | 'squat_ladder',
  ladderDecisions: LadderDecision[],
): SupersetInfo {
  const decision = ladderDecisions.find((d) => d.ladder === ladderKey);
  const rungData = decision
    ? LADDERS[ladderKey].find((r) => r.rung === decision.to_rung)
    : null;
  const exerciseName = rungData?.name ?? LADDERS[ladderKey][0].name;
  const standard = rungData?.standard ?? '';
  const rung = decision?.to_rung ?? 1;

  return {
    name: exerciseName,
    ladder: ladderKey as LadderName,
    current_rung: rung,
    standard,
    is_timed_hold: isTimedHold(exerciseName),
    hold_duration_seconds: null,
  };
}

// ── Core finisher builder ─────────────────────────────────────────────────────

function buildCalisthenicsFinisher(
  ladderDecisions: LadderDecision[],
  setCount = CALISTHENICS_FINISHER_SETS,
  isDeload = false,
): PlannedExercise {
  const decision = ladderDecisions.find((d) => d.ladder === 'core_ladder');
  const rungData = decision
    ? LADDERS.core_ladder.find((r) => r.rung === decision.to_rung)
    : null;
  const exerciseName = rungData?.name ?? LADDERS.core_ladder[0].name;
  const standard = rungData?.standard ?? '3x30s';
  const sets = isDeload ? Math.max(1, setCount - 1) : setCount;

  return {
    name: exerciseName,
    pattern: 'v_pull',
    tier: 'accessory',
    pillar: 'skill',
    sets: buildTimedSets(sets, standard),
    rest_seconds: 45,
    superset: null,
  };
}

// ── Session builders ──────────────────────────────────────────────────────────

function buildUpperA(
  snapshot: EngineInputSnapshot,
  volumeDecisions: VolumeDecision[],
  loadDecisions: LoadDecision[],
  ladderDecisions: LadderDecision[],
  isDeload: boolean,
): PlannedExercise[] {
  const zone = isDeload ? 'hypertrophy' : 'strength';
  const exercises: PlannedExercise[] = [];
  const usedNames: string[] = [];

  const vPull = selectExercise(EXERCISE_POOLS.v_pull_primary, snapshot, usedNames);
  usedNames.push(vPull);
  exercises.push({
    name: vPull,
    pattern: 'v_pull',
    tier: 'primary',
    pillar: 'strength',
    sets: buildSets(isDeload ? 2 : setsForMuscle('back', volumeDecisions, 2), zone,
      loadForMovement(vPull, loadDecisions, snapshot), isDeload),
    rest_seconds: 90,
    superset: isDeload ? null : buildSupersetInfo('pull_ladder', ladderDecisions),
  });

  const hPush = selectExercise(EXERCISE_POOLS.h_push_primary, snapshot, usedNames);
  usedNames.push(hPush);
  exercises.push({
    name: hPush,
    pattern: 'h_push',
    tier: 'primary',
    pillar: 'strength',
    sets: buildSets(isDeload ? 2 : setsForMuscle('chest', volumeDecisions, 2), zone,
      loadForMovement(hPush, loadDecisions, snapshot), isDeload),
    rest_seconds: 90,
    superset: isDeload ? null : buildSupersetInfo('push_ladder', ladderDecisions),
  });

  const vPush = selectExercise(EXERCISE_POOLS.v_push_primary, snapshot, usedNames);
  usedNames.push(vPush);
  exercises.push({
    name: vPush,
    pattern: 'v_push',
    tier: 'primary',
    pillar: 'strength',
    sets: buildSets(isDeload ? 2 : setsForMuscle('shoulders', volumeDecisions, 2), zone,
      loadForMovement(vPush, loadDecisions, snapshot), isDeload),
    rest_seconds: 120,
    superset: null,
  });

  if (!isDeload) {
    const hPull = selectExercise(EXERCISE_POOLS.h_pull_primary, snapshot, usedNames);
    usedNames.push(hPull);
    exercises.push({
      name: hPull,
      pattern: 'h_pull',
      tier: 'primary',
      pillar: 'strength',
      sets: buildSets(setsForMuscle('back', volumeDecisions, 2), zone,
        loadForMovement(hPull, loadDecisions, snapshot), isDeload),
      rest_seconds: 90,
      superset: null,
    });

    const shoulderAcc = selectExercise(EXERCISE_POOLS.v_push_accessory, snapshot, usedNames);
    exercises.push({
      name: shoulderAcc,
      pattern: 'v_push',
      tier: 'accessory',
      pillar: 'strength',
      sets: buildSets(3, zone, null, isDeload),
      rest_seconds: 60,
      superset: null,
    });

    exercises.push(buildCalisthenicsFinisher(ladderDecisions, CALISTHENICS_FINISHER_SETS, isDeload));
  }

  return exercises;
}

function buildUpperB(
  snapshot: EngineInputSnapshot,
  volumeDecisions: VolumeDecision[],
  loadDecisions: LoadDecision[],
  ladderDecisions: LadderDecision[],
  isDeload: boolean,
): PlannedExercise[] {
  const zone = 'hypertrophy';
  const exercises: PlannedExercise[] = [];
  const usedNames: string[] = [];

  const hPush = selectExercise(EXERCISE_POOLS.h_push_primary, snapshot, usedNames);
  usedNames.push(hPush);
  exercises.push({
    name: hPush,
    pattern: 'h_push',
    tier: 'primary',
    pillar: 'strength',
    sets: buildSets(isDeload ? 2 : setsForMuscle('chest', volumeDecisions, 2), zone,
      loadForMovement(hPush, loadDecisions, snapshot), isDeload),
    rest_seconds: 75,
    superset: isDeload ? null : buildSupersetInfo('push_ladder', ladderDecisions),
  });

  const hPull = selectExercise(EXERCISE_POOLS.h_pull_primary, snapshot, usedNames);
  usedNames.push(hPull);
  exercises.push({
    name: hPull,
    pattern: 'h_pull',
    tier: 'primary',
    pillar: 'strength',
    sets: buildSets(isDeload ? 2 : setsForMuscle('back', volumeDecisions, 2), zone,
      loadForMovement(hPull, loadDecisions, snapshot), isDeload),
    rest_seconds: 75,
    superset: isDeload ? null : buildSupersetInfo('pull_ladder', ladderDecisions),
  });

  if (!isDeload) {
    const vPush = selectExercise(EXERCISE_POOLS.v_push_primary, snapshot, usedNames);
    exercises.push({
      name: vPush,
      pattern: 'v_push',
      tier: 'primary',
      pillar: 'strength',
      sets: buildSets(setsForMuscle('shoulders', volumeDecisions, 2), zone,
        loadForMovement(vPush, loadDecisions, snapshot), isDeload),
      rest_seconds: 90,
      superset: null,
    });

    const bicep = selectExercise(EXERCISE_POOLS.biceps, snapshot, usedNames);
    exercises.push({
      name: bicep,
      pattern: 'v_pull',
      tier: 'accessory',
      pillar: 'strength',
      sets: buildSets(3, zone, null, isDeload),
      rest_seconds: 60,
      superset: null,
    });

    const tricep = selectExercise(EXERCISE_POOLS.triceps, snapshot, usedNames);
    exercises.push({
      name: tricep,
      pattern: 'h_push',
      tier: 'accessory',
      pillar: 'strength',
      sets: buildSets(3, zone, null, isDeload),
      rest_seconds: 60,
      superset: null,
    });

    exercises.push(buildCalisthenicsFinisher(ladderDecisions, CALISTHENICS_FINISHER_SETS, isDeload));
  }

  return exercises;
}

function buildLowerA(
  snapshot: EngineInputSnapshot,
  volumeDecisions: VolumeDecision[],
  loadDecisions: LoadDecision[],
  ladderDecisions: LadderDecision[],
  isDeload: boolean,
): PlannedExercise[] {
  const zone = isDeload ? 'hypertrophy' : 'strength';
  const exercises: PlannedExercise[] = [];
  const usedNames: string[] = [];

  const hinge = selectExercise(EXERCISE_POOLS.hinge_primary, snapshot, usedNames);
  usedNames.push(hinge);
  exercises.push({
    name: hinge,
    pattern: 'hinge',
    tier: 'primary',
    pillar: 'strength',
    sets: buildSets(isDeload ? 2 : setsForMuscle('hamstrings', volumeDecisions, 2), zone,
      loadForMovement(hinge, loadDecisions, snapshot), isDeload),
    rest_seconds: 120,
    superset: isDeload ? null : buildSupersetInfo('squat_ladder', ladderDecisions),
  });

  const quad = selectExercise(EXERCISE_POOLS.quad_primary, snapshot, usedNames);
  usedNames.push(quad);
  exercises.push({
    name: quad,
    pattern: 'quad',
    tier: 'primary',
    pillar: 'strength',
    sets: buildSets(isDeload ? 2 : setsForMuscle('quads', volumeDecisions, 2), zone,
      loadForMovement(quad, loadDecisions, snapshot), isDeload),
    rest_seconds: 120,
    superset: null,
  });

  if (!isDeload) {
    const hingeAcc = selectExercise(EXERCISE_POOLS.hinge_accessory, snapshot, usedNames);
    exercises.push({
      name: hingeAcc,
      pattern: 'hinge',
      tier: 'accessory',
      pillar: 'strength',
      sets: buildSets(3, zone, null, isDeload),
      rest_seconds: 75,
      superset: null,
    });

    const quadAcc = selectExercise(EXERCISE_POOLS.quad_accessory, snapshot, usedNames);
    exercises.push({
      name: quadAcc,
      pattern: 'quad',
      tier: 'accessory',
      pillar: 'strength',
      sets: buildSets(3, zone, null, isDeload),
      rest_seconds: 60,
      superset: null,
    });

    const gluteCalve = selectExercise(EXERCISE_POOLS.glutes_calves, snapshot, usedNames);
    exercises.push({
      name: gluteCalve,
      pattern: 'hinge',
      tier: 'accessory',
      pillar: 'strength',
      sets: buildSets(3, zone, null, isDeload),
      rest_seconds: 60,
      superset: null,
    });

    exercises.push(buildCalisthenicsFinisher(ladderDecisions, CALISTHENICS_FINISHER_SETS, isDeload));
  }

  return exercises;
}

function buildLowerB(
  snapshot: EngineInputSnapshot,
  volumeDecisions: VolumeDecision[],
  loadDecisions: LoadDecision[],
  ladderDecisions: LadderDecision[],
  isDeload: boolean,
): PlannedExercise[] {
  const zone = 'hypertrophy';
  const exercises: PlannedExercise[] = [];
  const usedNames: string[] = [];

  const quad = selectExercise(EXERCISE_POOLS.quad_primary, snapshot, usedNames);
  usedNames.push(quad);
  exercises.push({
    name: quad,
    pattern: 'quad',
    tier: 'primary',
    pillar: 'strength',
    sets: buildSets(isDeload ? 2 : setsForMuscle('quads', volumeDecisions, 2), zone,
      loadForMovement(quad, loadDecisions, snapshot), isDeload),
    rest_seconds: 90,
    superset: isDeload ? null : buildSupersetInfo('squat_ladder', ladderDecisions),
  });

  // In travel mode, Deadlift won't appear (travel pool is bodyweight only).
  // In gym mode, exclude Deadlift to prefer RDL in the hypertrophy zone.
  const hingeExclude = snapshot.mesocycle.travel_mode_active ? [] : ['Deadlift'];
  const hinge = selectExercise(EXERCISE_POOLS.hinge_primary, snapshot, [...usedNames, ...hingeExclude]);
  exercises.push({
    name: hinge,
    pattern: 'hinge',
    tier: 'primary',
    pillar: 'strength',
    sets: buildSets(isDeload ? 2 : setsForMuscle('hamstrings', volumeDecisions, 2), zone,
      loadForMovement(hinge, loadDecisions, snapshot), isDeload),
    rest_seconds: 90,
    superset: null,
  });

  if (!isDeload) {
    const quadAcc = selectExercise(EXERCISE_POOLS.quad_accessory, snapshot, usedNames);
    exercises.push({
      name: quadAcc,
      pattern: 'quad',
      tier: 'accessory',
      pillar: 'strength',
      sets: buildSets(3, zone, null, isDeload),
      rest_seconds: 75,
      superset: null,
    });

    const hamstringIso = selectExercise(EXERCISE_POOLS.hamstring_iso, snapshot, usedNames);
    exercises.push({
      name: hamstringIso,
      pattern: 'hinge',
      tier: 'accessory',
      pillar: 'strength',
      sets: buildSets(3, zone, null, isDeload),
      rest_seconds: 60,
      superset: null,
    });

    const gluteCalve = selectExercise(EXERCISE_POOLS.glutes_calves, snapshot, usedNames);
    exercises.push({
      name: gluteCalve,
      pattern: 'hinge',
      tier: 'accessory',
      pillar: 'strength',
      sets: buildSets(3, zone, null, isDeload),
      rest_seconds: 60,
      superset: null,
    });

    exercises.push(buildCalisthenicsFinisher(ladderDecisions, CALISTHENICS_FINISHER_SETS, isDeload));
  }

  return exercises;
}

// ── Mobility exercise library (from forge-session-templates.md Section 11) ────

type MobilityExerciseDef = {
  name: string;
  sets: number;
  hold_duration_seconds: number | null;
  reps: number | null;
};

const MOBILITY_EXERCISES: Record<string, MobilityExerciseDef[]> = {
  hip_flexor: [
    { name: '90/90 hip stretch', sets: 2, hold_duration_seconds: 60, reps: null },
    { name: 'Kneeling hip flexor stretch', sets: 2, hold_duration_seconds: 45, reps: null },
    { name: 'Couch stretch', sets: 2, hold_duration_seconds: 60, reps: null },
  ],
  thoracic_rotation: [
    { name: 'Thoracic rotation (quadruped)', sets: 2, hold_duration_seconds: null, reps: 10 },
    { name: 'Open book stretch', sets: 2, hold_duration_seconds: null, reps: 10 },
    { name: 'Foam roller thoracic extension', sets: 2, hold_duration_seconds: null, reps: 8 },
  ],
  posterior_chain: [
    { name: 'Standing hamstring stretch (PNF)', sets: 3, hold_duration_seconds: 30, reps: null },
    { name: 'Seated forward fold', sets: 2, hold_duration_seconds: 60, reps: null },
    { name: 'Supine glute stretch (figure-4)', sets: 2, hold_duration_seconds: 45, reps: null },
  ],
  shoulder_internal_rotation: [
    { name: 'Sleeper stretch', sets: 3, hold_duration_seconds: 45, reps: null },
    { name: 'Cross-body shoulder stretch', sets: 2, hold_duration_seconds: 45, reps: null },
    { name: 'Wall internal rotation stretch', sets: 2, hold_duration_seconds: 30, reps: null },
  ],
  ankle_dorsiflexion: [
    { name: 'Knee-to-wall stretch', sets: 2, hold_duration_seconds: null, reps: 15 },
    { name: 'Banded ankle mobilisation', sets: 2, hold_duration_seconds: null, reps: 15 },
    { name: 'Single-leg calf raise (eccentric)', sets: 2, hold_duration_seconds: null, reps: 10 },
  ],
  adductors: [
    { name: 'Copenhagen adductor stretch', sets: 3, hold_duration_seconds: 45, reps: null },
    { name: 'Wide-stance hip shift', sets: 2, hold_duration_seconds: null, reps: 10 },
    { name: 'Frog stretch', sets: 2, hold_duration_seconds: 60, reps: null },
  ],
};

function buildZone2Session(): PlannedExercise[] {
  return [{
    name: 'Zone 2 cardio (cycling or rowing)',
    pattern: 'hinge',
    tier: 'accessory',
    pillar: 'cardio',
    sets: [{
      set_number: 1,
      target_reps_min: 45,
      target_reps_max: 60,
      hold_duration_seconds: null,
      load_kg: null,
      rir_target: 4,
    }],
    rest_seconds: 0,
    superset: null,
  }];
}

function buildMobilitySession(snapshot: EngineInputSnapshot): PlannedExercise[] {
  const area = snapshot.mobility.current_rotation_area;
  const defs = MOBILITY_EXERCISES[area] ?? MOBILITY_EXERCISES.hip_flexor;

  return defs.map((def) => ({
    name: def.name,
    pattern: 'hinge' as const,
    tier: 'accessory' as const,
    pillar: 'mobility' as const,
    sets: Array.from({ length: def.sets }, (_, i) => ({
      set_number: i + 1,
      target_reps_min: def.reps,
      target_reps_max: def.reps,
      hold_duration_seconds: def.hold_duration_seconds,
      load_kg: null,
      rir_target: null,
    })),
    rest_seconds: 30,
    superset: null,
  }));
}

// ── Day count determination ───────────────────────────────────────────────────

function determineDayCount(
  snapshot: EngineInputSnapshot,
  isDeload: boolean,
): number {
  if (isDeload) return DAYS_RED;

  const gate = snapshot.recovery.current_gate;

  const multipleGaps =
    Object.values(snapshot.volume.volume_completion_pct_last_week)
      .filter((v) => v !== null && v < 0.7).length >= 2;

  switch (gate) {
    case 'green':
      return multipleGaps ? DAYS_GREEN_HIGH_PILLAR_GAPS : DAYS_GREEN_STANDARD;
    case 'amber':
      return DAYS_AMBER;
    case 'red':
      return DAYS_RED;
  }
}

// ── Weekly schedule builder ───────────────────────────────────────────────────

type SessionSpec = {
  type: SessionType;
  label: string;
};

function getSessionSequence(dayCount: number, isDeload: boolean, gateIsGreen: boolean): SessionSpec[] {
  if (isDeload) {
    return [
      { type: 'strength_calisthenics', label: 'Upper A (Deload)' },
      { type: 'strength_calisthenics', label: 'Lower A (Deload)' },
      { type: 'mobility', label: 'Mobility' },
      { type: 'strength_calisthenics', label: 'Upper B (Deload)' },
    ];
  }

  switch (dayCount) {
    case 6:
      return [
        { type: 'strength_calisthenics', label: 'Upper A' },
        { type: 'strength_calisthenics', label: 'Lower A' },
        { type: 'zone2', label: 'Zone 2' },
        { type: 'strength_calisthenics', label: 'Upper B' },
        { type: 'strength_calisthenics', label: 'Lower B' },
        { type: gateIsGreen ? 'intervals' : 'mobility', label: gateIsGreen ? 'Intervals' : 'Mobility' },
      ];
    case 5:
      return [
        { type: 'strength_calisthenics', label: 'Upper A' },
        { type: 'strength_calisthenics', label: 'Lower A' },
        { type: 'zone2', label: 'Zone 2' },
        { type: 'strength_calisthenics', label: 'Upper B' },
        { type: 'strength_calisthenics', label: 'Lower B' },
        { type: 'mobility', label: 'Mobility' },
      ];
    case 4:
      return [
        { type: 'strength_calisthenics', label: 'Upper A' },
        { type: 'strength_calisthenics', label: 'Lower A' },
        { type: 'strength_calisthenics', label: 'Upper B' },
        { type: 'strength_calisthenics', label: 'Lower B' },
        { type: 'mobility', label: 'Mobility' },
      ];
    case 3:
    default:
      return [
        { type: 'strength_calisthenics', label: 'Upper A' },
        { type: 'strength_calisthenics', label: 'Lower A' },
        { type: 'strength_calisthenics', label: 'Upper B' },
        { type: 'mobility', label: 'Mobility' },
      ];
  }
}

// ── Session label → exercise builder ─────────────────────────────────────────

function buildExercisesForLabel(
  label: string,
  snapshot: EngineInputSnapshot,
  volumeDecisions: VolumeDecision[],
  loadDecisions: LoadDecision[],
  ladderDecisions: LadderDecision[],
  isDeload: boolean,
): PlannedExercise[] {
  if (label.startsWith('Upper A')) return buildUpperA(snapshot, volumeDecisions, loadDecisions, ladderDecisions, isDeload);
  if (label.startsWith('Upper B')) return buildUpperB(snapshot, volumeDecisions, loadDecisions, ladderDecisions, isDeload);
  if (label.startsWith('Lower A')) return buildLowerA(snapshot, volumeDecisions, loadDecisions, ladderDecisions, isDeload);
  if (label.startsWith('Lower B')) return buildLowerB(snapshot, volumeDecisions, loadDecisions, ladderDecisions, isDeload);
  if (label === 'Zone 2') return buildZone2Session();
  if (label === 'Mobility') return buildMobilitySession(snapshot);
  if (label === 'Intervals') return buildZone2Session();
  return [];
}

// ── Public function ───────────────────────────────────────────────────────────

interface GenerateSessionPlanInput {
  snapshot: EngineInputSnapshot;
  volumeDecisions: VolumeDecision[];
  loadDecisions: LoadDecision[];
  ladderDecisions: LadderDecision[];
  weekStarting: string;
  weekEnding: string;
  weekType: WeekType;
  mesocycleWeek: number;
}

export function generateSessionPlan({
  snapshot,
  volumeDecisions,
  loadDecisions,
  ladderDecisions,
  weekStarting,
  weekEnding,
  weekType,
  mesocycleWeek,
}: GenerateSessionPlanInput): WeeklySessionPlan {
  const isDeload = weekType === 'deload';
  const gateIsGreen = snapshot.recovery.current_gate === 'green';
  const dayCount = isDeload ? 4 : determineDayCount(snapshot, isDeload);
  const sessionSpecs = getSessionSequence(dayCount, isDeload, gateIsGreen);

  const sessions: PlannedSession[] = sessionSpecs.map((spec, index) => {
    const day = DAYS_OF_WEEK[index] ?? DAYS_OF_WEEK[0];

    // Compute this session's absolute date and check if it falls in travel range
    const sessionDate = addDaysToISO(weekStarting, index);
    const { travel_mode_start_date: tStart, travel_mode_end_date: tEnd } = snapshot.mesocycle;
    const isTravelDay = snapshot.mesocycle.travel_mode_active &&
      (!tStart || sessionDate >= tStart) &&
      (!tEnd   || sessionDate <= tEnd);
    const sessionSnapshot = isTravelDay === snapshot.mesocycle.travel_mode_active
      ? snapshot
      : { ...snapshot, mesocycle: { ...snapshot.mesocycle, travel_mode_active: isTravelDay } };

    const exercises = buildExercisesForLabel(
      spec.label,
      sessionSnapshot,
      volumeDecisions,
      loadDecisions,
      ladderDecisions,
      isDeload,
    );

    const estimatedDuration = spec.type === 'zone2' || spec.type === 'intervals'
      ? 50
      : spec.type === 'mobility'
      ? 25
      : isDeload
      ? 40
      : 65;

    return {
      day_of_week: day,
      session_type: spec.type,
      exercises,
      estimated_duration_minutes: estimatedDuration,
    };
  });

  return {
    week_starting: weekStarting,
    week_ending: weekEnding,
    week_type: weekType,
    mesocycle_week: mesocycleWeek,
    days_programmed: sessions.length,
    sessions,
  };
}

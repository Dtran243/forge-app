/**
 * engine/index.ts
 *
 * runEngine(snapshot) → EngineRunOutput
 *
 * Orchestrates all engine steps in order:
 *   1. evaluateRecoveryGate   — determine this week's gate colour
 *   2. computePillarScores    — score the four pillars from logged data
 *   3. computeVolumeTargets   — set next week's volume targets per muscle group
 *   4. evaluateOverload       — apply double-progression load decisions
 *   5. evaluateLadders        — advance/regress calisthenics skill rungs
 *   6. generateSessionPlan    — build the complete next-week program
 *
 * Returns EngineRunOutput — every field written to DB before Claude is called.
 * Pure TypeScript, no I/O. The Edge Function handles DB reads/writes.
 */

import type { EngineInputSnapshot, EngineRunOutput } from '../types/engine.ts';
import type { MuscleGroup, TrackedMovement, LadderName } from '../types/athlete.ts';
import { evaluateRecoveryGate } from './gate.ts';
import { computePillarScores } from './pillars.ts';
import { computeVolumeTargets } from './volume.ts';
import { evaluateOverload } from './overload.ts';
import { evaluateLadders } from './ladder.ts';
import { generateSessionPlan } from './session.ts';

// ── Date helpers ──────────────────────────────────────────────────────────────

function getNextSunday(from: Date = new Date()): Date {
  const d = new Date(from);
  const daysUntilSunday = (7 - d.getDay()) % 7 || 7;
  d.setDate(d.getDate() + daysUntilSunday);
  return d;
}

function getMondayOf(sunday: Date): Date {
  const d = new Date(sunday);
  d.setDate(d.getDate() - 6);
  return d;
}

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// ── Engine flags ──────────────────────────────────────────────────────────────

function collectFlags(snapshot: EngineInputSnapshot): string[] {
  const flags: string[] = [];

  // HRV still in baseline period
  if (snapshot.recovery.hrv_baseline_30d === null) {
    flags.push('hrv_baseline_not_yet_established');
  }

  // Low session count this week
  const sessionCount = snapshot.session_logs_this_week.filter(
    (s) => s.session_type !== 'rest',
  ).length;
  if (sessionCount < 3) {
    flags.push(`low_session_count_this_week_${sessionCount}`);
  }

  // Zone 2 HR consistently above ceiling
  for (const log of snapshot.session_logs_this_week) {
    if (log.session_type === 'zone2' && log.cardio) {
      const cardio = log.cardio;
      const maxHr = snapshot.athlete.max_hr_bpm;
      if (maxHr && cardio.avg_hr_bpm && cardio.avg_hr_bpm > maxHr * 0.75) {
        flags.push('zone2_hr_above_ceiling');
        break;
      }
    }
  }

  // No overload on any movement in a long time
  // (simple heuristic: all consecutive_top === 0 and no overload_due)
  const noOverloadAny = Object.values(snapshot.strength).every(
    (s) => s.consecutive_top === 0 && !s.overload_due,
  );
  if (noOverloadAny && Object.keys(snapshot.strength).length > 0) {
    flags.push('no_overload_triggered_this_cycle');
  }

  return flags;
}

// ── Public function ───────────────────────────────────────────────────────────

export function runEngine(snapshot: EngineInputSnapshot): EngineRunOutput {
  // Week dates for the upcoming week
  const nextSunday = getNextSunday();
  const nextMonday = getMondayOf(nextSunday);
  const weekEnding = toISO(nextSunday);
  const weekStarting = toISO(nextMonday);

  // Determine if this is a deload week
  const isDeload =
    snapshot.mesocycle.week_type === 'deload' ||
    snapshot.mesocycle.current_week === 4;

  const weekType = isDeload ? ('deload' as const) : ('loading' as const);

  // ── Step 1: Recovery gate ───────────────────────────────────────────────────
  const gate_evaluation = evaluateRecoveryGate(snapshot.recovery);

  // Red gate forces an immediate deload regardless of mesocycle week
  const effectiveDeload = isDeload || gate_evaluation.gate_colour === 'red';
  const effectiveWeekType = effectiveDeload ? ('deload' as const) : weekType;

  // ── Step 2: Pillar scores ───────────────────────────────────────────────────
  const { scores: pillar_scores, breakdowns: pillar_breakdowns } = computePillarScores(
    snapshot,
    weekEnding,
  );

  // ── Step 3: Volume decisions ────────────────────────────────────────────────
  // Build current targets from volume snapshot
  const currentTargets = {} as Record<MuscleGroup, number>;
  for (const [muscle, target] of Object.entries(snapshot.volume.target_sets_this_week)) {
    currentTargets[muscle as MuscleGroup] = target ?? 10;
  }

  const volume_decisions = computeVolumeTargets({
    scores: pillar_scores,
    gate: gate_evaluation,
    mesocycleWeek: snapshot.mesocycle.current_week,
    isDeload: effectiveDeload,
    currentTargets,
    phase: snapshot.athlete.phase,
    mevIncrementApplied: snapshot.mesocycle.mev_increment_applied,
  });

  // ── Step 4: Load decisions ──────────────────────────────────────────────────
  const load_decisions = evaluateOverload(
    snapshot.strength as Record<TrackedMovement, typeof snapshot.strength[TrackedMovement]>,
    effectiveDeload,
  );

  // ── Step 5: Ladder decisions ────────────────────────────────────────────────
  const ladder_decisions = evaluateLadders(
    snapshot.skill as Record<LadderName, typeof snapshot.skill[LadderName]>,
    effectiveDeload,
  );

  // ── Step 6: Session plan ────────────────────────────────────────────────────
  const session_plan = generateSessionPlan({
    snapshot,
    volumeDecisions: volume_decisions,
    loadDecisions: load_decisions,
    ladderDecisions: ladder_decisions,
    weekStarting,
    weekEnding,
    weekType: effectiveWeekType,
    mesocycleWeek: snapshot.mesocycle.current_week,
  });

  // ── Flags ───────────────────────────────────────────────────────────────────
  const flags = collectFlags(snapshot);

  if (effectiveDeload && !isDeload) {
    flags.push('red_gate_triggered_early_deload');
  }

  return {
    week_ending: weekEnding,
    gate_evaluation,
    pillar_scores,
    pillar_breakdowns,
    volume_decisions,
    load_decisions,
    ladder_decisions,
    session_plan,
    days_programmed: session_plan.days_programmed,
    deload_triggered: effectiveDeload,
    flags,
  };
}

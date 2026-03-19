/**
 * engine/volume.ts
 *
 * computeVolumeTargets(scores, gate, mesocycle) → VolumeDecision[]
 *
 * Determines next week's target sets per muscle group by:
 *   1. Starting from this week's target (or MEV if first cycle)
 *   2. Applying mesocycle week progression (+5–10% for loading weeks)
 *   3. Applying pillar score adjustments (< 60 = increase, ≥ 85 = hold)
 *   4. Applying gate-driven deload reductions (RED/AMBER gate)
 *   5. Enforcing MRV ceiling and 10% weekly spike limit
 *   6. Applying phase modifier (lean phase = −10%)
 *
 * Returns one VolumeDecision per muscle group.
 */

import type { MuscleGroup, TrainingPhase } from '../types/athlete.ts';
import type { GateEvaluationOutput, PillarScoreOutput, VolumeDecision } from '../types/engine.ts';
import {
  VOLUME_LANDMARKS,
  VOLUME_INCREASE_PER_WEEK_MIN,
  VOLUME_INCREASE_PER_WEEK_MAX,
  VOLUME_SPIKE_LIMIT,
  DELOAD_VOLUME_REDUCTION,
  PILLAR_SCORE_INCREASE_THRESHOLD,
  PILLAR_SCORE_DECREASE_THRESHOLD,
  MEV_INCREMENT_PER_CYCLE,
} from './constants.ts';

const MUSCLE_GROUPS: MuscleGroup[] = [
  'chest', 'back', 'shoulders', 'biceps', 'triceps',
  'quads', 'hamstrings', 'glutes', 'calves', 'core',
];

// Muscle group → which pillar score drives its volume decisions
const MUSCLE_TO_PILLAR: Record<MuscleGroup, keyof PillarScoreOutput> = {
  chest:      'strength_score',
  back:       'strength_score',
  shoulders:  'strength_score',
  biceps:     'strength_score',
  triceps:    'strength_score',
  quads:      'strength_score',
  hamstrings: 'strength_score',
  glutes:     'strength_score',
  calves:     'strength_score',
  core:       'skill_score',
};

interface ComputeVolumeTargetsInput {
  scores: PillarScoreOutput;
  gate: GateEvaluationOutput;
  mesocycleWeek: number; // 1–4
  isDeload: boolean;
  currentTargets: Record<MuscleGroup, number>;
  phase: TrainingPhase;
  mevIncrementApplied: number; // cumulative +1 set additions from past cycles
}

export function computeVolumeTargets({
  scores,
  gate,
  mesocycleWeek,
  isDeload,
  currentTargets,
  phase,
  mevIncrementApplied,
}: ComputeVolumeTargetsInput): VolumeDecision[] {
  const decisions: VolumeDecision[] = [];

  for (const muscle of MUSCLE_GROUPS) {
    const landmarks = VOLUME_LANDMARKS[muscle];
    const mev = landmarks.mev + mevIncrementApplied;
    const mav = landmarks.mav + mevIncrementApplied;
    const mrv = landmarks.mrv;

    const previousTarget = currentTargets[muscle] ?? mev;
    const pillarKey = MUSCLE_TO_PILLAR[muscle];
    const pillarScore = scores[pillarKey] as number;

    let newTarget: number;
    let reason: string;

    if (isDeload || gate.gate_colour === 'red') {
      // Deload: reduce to 60% of current target (−40%)
      newTarget = Math.max(
        Math.round(previousTarget * (1 - DELOAD_VOLUME_REDUCTION)),
        Math.ceil(mev * 0.5),
      );
      reason = gate.gate_colour === 'red'
        ? 'red_gate_forced_deload'
        : 'mesocycle_week_4_deload';
    } else {
      // Loading weeks: base progression by mesocycle week position
      let baseTarget = previousTarget;

      if (mesocycleWeek === 1) {
        // Start of new mesocycle — begin at MEV
        baseTarget = mev;
        reason = 'new_mesocycle_start_at_mev';
      } else {
        // Weeks 2–3: apply progression
        const progressionRate = pillarScore < PILLAR_SCORE_DECREASE_THRESHOLD
          ? VOLUME_INCREASE_PER_WEEK_MAX  // score < 60 → push harder
          : pillarScore >= PILLAR_SCORE_INCREASE_THRESHOLD
          ? 0                             // score ≥ 85 → hold volume
          : VOLUME_INCREASE_PER_WEEK_MIN; // 60–84 → standard increase

        baseTarget = Math.round(previousTarget * (1 + progressionRate));

        if (pillarScore < PILLAR_SCORE_DECREASE_THRESHOLD) {
          reason = `low_pillar_score_${Math.round(pillarScore)}_increase_volume`;
        } else if (pillarScore >= PILLAR_SCORE_INCREASE_THRESHOLD) {
          reason = `high_pillar_score_${Math.round(pillarScore)}_hold_volume`;
        } else {
          reason = `week_${mesocycleWeek}_standard_progression`;
        }
      }

      // Amber gate: cap at MAV (don't push to MRV)
      if (gate.gate_colour === 'amber') {
        baseTarget = Math.min(baseTarget, mav);
        reason = reason + '_amber_gate_cap_mav';
      }

      // Apply phase modifier
      if (phase === 'lean') {
        baseTarget = Math.round(baseTarget * 0.90);
        reason = reason + '_lean_phase_minus_10pct';
      }

      newTarget = baseTarget;
    }

    // Hard 10% spike limit vs previous week
    const spikeLimit = Math.round(previousTarget * (1 + VOLUME_SPIKE_LIMIT));
    if (newTarget > spikeLimit && !isDeload) {
      newTarget = spikeLimit;
      reason = reason + '_capped_by_10pct_spike_limit';
    }

    // MRV ceiling — never exceeded
    newTarget = Math.min(newTarget, mrv);

    // Floor at 1 set (we always programme something)
    newTarget = Math.max(newTarget, 1);

    decisions.push({
      muscle_group: muscle,
      previous_target_sets: previousTarget,
      new_target_sets: newTarget,
      reason,
      pillar_score: pillarScore,
      gate_colour: gate.gate_colour,
    });
  }

  return decisions;
}

/**
 * engine/pillars.ts
 *
 * computePillarScores(snapshot) → PillarScoreOutput
 *
 * Computes the four pillar scores (0–100) from the current week's logged data.
 * Each pillar has three weighted components:
 *   primary   (completion)  — did the athlete complete planned work?
 *   secondary (progress)    — did adaptation occur?
 *   tertiary  (quality)     — RPE trend / subjective quality
 *
 * Weights per pillar — see docs/forge-engine-constants.md Section 12.
 *
 * Returns PillarScoreOutput with week_ending, mesocycle_week, days_trained,
 * and all four scores plus per-pillar breakdowns.
 */

import type { EngineInputSnapshot } from '../types/engine.ts';
import type {
  PillarScoreOutput,
  PillarScoreBreakdown,
  PillarComponentScores,
} from '../types/engine.ts';
import type { Pillar } from '../types/athlete.ts';
import {
  PILLAR_WEIGHTS,
  PILLAR_SCORE_INCREASE_THRESHOLD,
  PILLAR_SCORE_DECREASE_THRESHOLD,
} from './constants.ts';

// Keep re-exports for callers that want the threshold values alongside scores
export { PILLAR_SCORE_INCREASE_THRESHOLD, PILLAR_SCORE_DECREASE_THRESHOLD };

// ── Helpers ───────────────────────────────────────────────────────────────────

function clamp(value: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, value));
}

function weightedScore(components: PillarComponentScores, pillar: Pillar): number {
  const w = PILLAR_WEIGHTS[pillar];
  const raw =
    components.primary   * w.completion +
    components.secondary * w.progress +
    components.tertiary  * w.quality;
  return Math.round(clamp(raw) * 100);
}

// ── Strength pillar ───────────────────────────────────────────────────────────

function computeStrengthScore(
  snapshot: EngineInputSnapshot,
): PillarScoreBreakdown {
  const logs = snapshot.session_logs_this_week.filter(
    (s) => s.session_type === 'strength_calisthenics',
  );

  // No sessions logged — score is 0, no defaults applied
  if (logs.length === 0) {
    return {
      pillar: 'strength',
      score: 0,
      component_scores: { primary: 0, secondary: 0, tertiary: 0 },
    };
  }

  // Primary: sets completed / sets targeted
  // Sum all logged strength exercises sets vs volume targets
  const targetedSets = Object.values(snapshot.volume.target_sets_this_week).reduce<number>(
    (sum, val) => sum + (val ?? 0),
    0,
  );
  const completedSets = Object.values(snapshot.volume.current_week_sets).reduce(
    (sum, val) => sum + val,
    0,
  );
  const primary = targetedSets > 0 ? clamp(completedSets / targetedSets) : 0;

  // Secondary: overload triggers / total tracked movements
  const strengthEntries = Object.values(snapshot.strength);
  const overloadCount = strengthEntries.filter((s) => s.overload_due).length;
  const secondary = strengthEntries.length > 0
    ? clamp(overloadCount / strengthEntries.length)
    : 0;

  // Tertiary: RPE quality — 1 − (avg_session_rpe − 7) / 3, clamped 0–1
  const sessionRpes = logs
    .map((l) => l.session_rpe)
    .filter((r): r is number => r !== null);
  let tertiary: number;
  if (sessionRpes.length === 0) {
    tertiary = 0.5; // no data — neutral
  } else {
    const avgRpe = sessionRpes.reduce((a, b) => a + b, 0) / sessionRpes.length;
    tertiary = clamp(1 - (avgRpe - 7) / 3);
  }

  const component_scores: PillarComponentScores = { primary, secondary, tertiary };
  return {
    pillar: 'strength',
    score: weightedScore(component_scores, 'strength'),
    component_scores,
  };
}

// ── Skill pillar ──────────────────────────────────────────────────────────────

function computeSkillScore(
  snapshot: EngineInputSnapshot,
): PillarScoreBreakdown {
  const logs = snapshot.session_logs_this_week.filter(
    (s) => s.session_type === 'strength_calisthenics',
  );

  // No sessions logged — score is 0, no defaults applied
  if (logs.length === 0) {
    return {
      pillar: 'skill',
      score: 0,
      component_scores: { primary: 0, secondary: 0, tertiary: 0 },
    };
  }

  // Primary: calisthenics sets completed vs programmed
  // Count sets from skill exercises in session logs
  let completedSkillSets = 0;
  let plannedSkillSets = 0;

  for (const log of logs) {
    for (const ex of log.exercises_json.exercises) {
      if (ex.tier === 'accessory' || ex.name.includes('ladder')) {
        completedSkillSets += ex.sets.length;
      }
    }
  }

  // Planned: CALISTHENICS_FINISHER_SETS × 2 supersets per strength session = 4 planned per session
  // Use 4 sets per session as a reasonable baseline
  const strengthSessionCount = logs.length;
  plannedSkillSets = strengthSessionCount * 4;

  const primary = plannedSkillSets > 0
    ? clamp(completedSkillSets / plannedSkillSets)
    : 0;

  // Secondary: any ladder advancement = 1, no change = 0.5, regression = 0
  const ladderEntries = Object.values(snapshot.skill);
  const hasAdvancement = ladderEntries.some((s) => s.advancement_due);
  const hasRegression = ladderEntries.some((s) => s.regression_due);
  let secondary: number;
  if (hasAdvancement) {
    secondary = 1.0;
  } else if (hasRegression) {
    secondary = 0.0;
  } else {
    secondary = 0.5;
  }

  // Tertiary: subjective quality from mobility_snapshot (closest proxy for skill quality)
  // Use 0.5 as default — no direct skill quality rating in current schema
  const tertiary = 0.5;

  const component_scores: PillarComponentScores = { primary, secondary, tertiary };
  return {
    pillar: 'skill',
    score: weightedScore(component_scores, 'skill'),
    component_scores,
  };
}

// ── Cardio pillar ─────────────────────────────────────────────────────────────

function computeCardioScore(
  snapshot: EngineInputSnapshot,
): PillarScoreBreakdown {
  const { cardio } = snapshot;

  const cardioLogs = snapshot.session_logs_this_week.filter(
    (s) => s.session_type === 'zone2' || s.session_type === 'intervals',
  );

  // No cardio logged at all — score is 0
  if (cardioLogs.length === 0 && cardio.zone2_minutes === 0) {
    return {
      pillar: 'cardio',
      score: 0,
      component_scores: { primary: 0, secondary: 0, tertiary: 0 },
    };
  }

  // Primary: zone2 minutes completed / zone2 target
  const primary = cardio.zone2_target > 0
    ? clamp(cardio.zone2_minutes / cardio.zone2_target)
    : 0;

  // Secondary: interval session completed?
  // If gate was green and interval was scheduled → 1 if completed, 0 if missed
  // If not scheduled (amber/red) → 0.5 (not applicable)
  let secondary: number;
  const gateWasGreen = snapshot.recovery.current_gate === 'green';
  if (gateWasGreen) {
    secondary = cardio.intervals_completed ? 1.0 : 0.0;
  } else {
    secondary = 0.5; // intervals not expected this week
  }

  // Tertiary: cardio sessions completed / planned
  const plannedCardio = gateWasGreen ? 2 : 1;
  const tertiary = clamp(cardioLogs.length / plannedCardio);

  const component_scores: PillarComponentScores = { primary, secondary, tertiary };
  return {
    pillar: 'cardio',
    score: weightedScore(component_scores, 'cardio'),
    component_scores,
  };
}

// ── Mobility pillar ───────────────────────────────────────────────────────────

function computeMobilityScore(
  snapshot: EngineInputSnapshot,
): PillarScoreBreakdown {
  const { mobility } = snapshot;

  // No sessions completed — score is 0
  if (mobility.sessions_completed_this_week === 0) {
    return {
      pillar: 'mobility',
      score: 0,
      component_scores: { primary: 0, secondary: 0, tertiary: 0 },
    };
  }

  // Primary: sessions completed / sessions planned
  const primary = mobility.sessions_planned_this_week > 0
    ? clamp(mobility.sessions_completed_this_week / mobility.sessions_planned_this_week)
    : 0;

  // Secondary: embedded work completed / total strength sessions
  // Only use neutral 0.5 when strength sessions exist but embedded tracking is absent
  const secondary = mobility.embedded_work_sessions_this_week > 0
    ? clamp(mobility.embedded_work_completed_this_week / mobility.embedded_work_sessions_this_week)
    : 0.5; // strength sessions exist but embedded work not tracked — neutral

  // Tertiary: subjective flexibility trend
  let tertiary: number;
  switch (mobility.subjective_flexibility_trend) {
    case 'improving': tertiary = 1.0; break;
    case 'stable':    tertiary = 0.5; break;
    case 'declining': tertiary = 0.0; break;
    default:          tertiary = 0.5; // no data
  }

  const component_scores: PillarComponentScores = { primary, secondary, tertiary };
  return {
    pillar: 'mobility',
    score: weightedScore(component_scores, 'mobility'),
    component_scores,
  };
}

// ── Public function ───────────────────────────────────────────────────────────

export interface PillarComputeResult {
  scores: PillarScoreOutput;
  breakdowns: PillarScoreBreakdown[];
}

export function computePillarScores(
  snapshot: EngineInputSnapshot,
  weekEndingDate: string,
): PillarComputeResult {
  const strengthBreakdown = computeStrengthScore(snapshot);
  const skillBreakdown = computeSkillScore(snapshot);
  const cardioBreakdown = computeCardioScore(snapshot);
  const mobilityBreakdown = computeMobilityScore(snapshot);

  const breakdowns: PillarScoreBreakdown[] = [
    strengthBreakdown,
    skillBreakdown,
    cardioBreakdown,
    mobilityBreakdown,
  ];

  const daysTrainedThisWeek = new Set(
    snapshot.session_logs_this_week
      .filter((s) => s.session_type !== 'rest')
      .map((s) => s.date),
  ).size;

  const scores: PillarScoreOutput = {
    strength_score: strengthBreakdown.score,
    skill_score:    skillBreakdown.score,
    cardio_score:   cardioBreakdown.score,
    mobility_score: mobilityBreakdown.score,
    week_ending_date: weekEndingDate,
    mesocycle_week: snapshot.mesocycle.current_week,
    days_trained: daysTrainedThisWeek,
  };

  return { scores, breakdowns };
}

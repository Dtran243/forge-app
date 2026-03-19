/**
 * engine.ts
 *
 * TypeScript types for the Forge adaptation engine's inputs and outputs.
 * The engine is a deterministic TypeScript function — it receives a snapshot
 * of athlete state, computes every adaptation decision, and returns a structured
 * result that is written to the database before Claude is called.
 *
 * These types cover:
 *   1. Engine input  — the state snapshot assembled before each weekly run
 *   2. Gate output   — result of the recovery gate evaluation step
 *   3. Pillar output — computed pillar scores and per-component breakdowns
 *   4. Session plan  — the generated next-week program
 *   5. Decision log  — the complete engine run result written to engine_decisions
 */

import type {
  AthleteProfile,
  CardioState,
  DailyLog,
  FlexibilityTrend,
  GateColour,
  LadderChange,
  LadderName,
  LoadChange,
  MobilityArea,
  MuscleGroup,
  Pillar,
  PillarScoresJson,
  ProgramJson,
  SessionLog,
  SkillState,
  StrengthState,
  TrackedMovement,
  VolumeChange,
  WeekType,
} from "./athlete";

// ─────────────────────────────────────────────────────────────────────────────
// 1. Engine input
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The 7-day rolling recovery data derived from daily_logs rows.
 * Assembled by the engine before gate evaluation. Arrays hold values in
 * chronological order, most recent last. Missing days are omitted (not padded).
 */
export interface RecoverySnapshot {
  /** HRV readings in milliseconds from the last 7 days, most recent last. */
  hrv_readings_7d: number[];
  /** 30-day rolling HRV baseline in ms. Null until 30 days of data exist. */
  hrv_baseline_30d: number | null;
  /**
   * How far the 7-day HRV average sits from the baseline as a decimal.
   * e.g. −0.08 means 8% below baseline. Null if baseline not yet established.
   */
  hrv_trend_7d_vs_baseline_pct: number | null;
  sleep_hours_7d: number[];
  sleep_avg_7d: number;
  /** Soreness ratings 1–5 from the last 7 days, most recent last. */
  soreness_ratings_7d: number[];
  soreness_avg_7d: number;
  /** Consecutive days the athlete's HRV has been below the amber threshold. */
  consecutive_days_hrv_below_amber: number;
  /** Consecutive days average sleep has been below the amber threshold (< 7h). */
  consecutive_days_below_sleep_amber: number;
  current_gate: GateColour;
  /** True when the athlete has used their one permitted amber-gate skip. */
  gate_override_active: boolean;
  /** ISO date the current gate override expires, or null if no override is active. */
  gate_override_expires_date: string | null;
}

/**
 * Current-week volume data assembled from volume_state rows.
 * The engine uses this to determine where each muscle group sits in the
 * MEV → MAV → MRV range and whether volume should increase, hold, or reduce.
 */
export interface VolumeSnapshot {
  /** Actual sets accumulated this week per muscle group. Resets each Monday. */
  current_week_sets: Record<MuscleGroup, number>;
  /** Engine-assigned target sets for this week per muscle group. Null before the weekly run. */
  target_sets_this_week: Record<MuscleGroup, number | null>;
  /** Prior week's actual / target ratio per muscle group. Input to pillar scoring. */
  volume_completion_pct_last_week: Record<MuscleGroup, number | null>;
}

/**
 * Mobility tracking data assembled from session_logs and the athlete's profile.
 * Not persisted in its own table — reconstructed each engine run from raw logs.
 */
export interface MobilitySnapshot {
  sessions_completed_this_week: number;
  sessions_planned_this_week: number;
  /** Strength sessions where an embedded pre/post mobility block was completed. */
  embedded_work_completed_this_week: number;
  /** Total strength sessions this week (denominator for embedded completion rate). */
  embedded_work_sessions_this_week: number;
  current_rotation_area: MobilityArea;
  next_rotation_area: MobilityArea;
  /** 1 or 2 — which half of the 2-week area rotation the athlete is in. */
  rotation_week: 1 | 2;
  /** Self-reported flexibility trend from the weekly check-in. */
  subjective_flexibility_trend: FlexibilityTrend | null;
  /** Mobility pillar score from the previous week, for trend context. */
  mobility_pillar_score_last_week: number | null;
}

/**
 * The complete athlete state snapshot passed to the engine at the start of each
 * weekly run. Assembled from all relevant Supabase tables immediately before
 * the engine function is invoked.
 */
export interface EngineInputSnapshot {
  athlete: AthleteProfile;
  mesocycle: {
    user_id: string;
    cycle_number: number;
    /** 1–4. Week 4 is deload unless deload_triggered_early is true. */
    current_week: number;
    week_type: WeekType;
    mev_increment_applied: number;
    deload_triggered_early: boolean;
    deload_trigger_reason: string | null;
    travel_mode_active: boolean;
    travel_mode_start_date: string | null;
    travel_mode_end_date: string | null;
  };
  /** All strength_state rows for the user, keyed by movement name. */
  strength: Record<TrackedMovement, StrengthState>;
  volume: VolumeSnapshot;
  /** All skill_state rows for the user, keyed by ladder name. */
  skill: Record<LadderName, SkillState>;
  /** The current week's cardio_state row. */
  cardio: CardioState;
  mobility: MobilitySnapshot;
  recovery: RecoverySnapshot;
  /** session_logs rows for the current week, used for pillar score computation. */
  session_logs_this_week: SessionLog[];
  /** daily_logs rows for the last 7 days, used for recovery gate evaluation. */
  daily_logs_7d: DailyLog[];
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Gate output
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The per-signal gate ratings evaluated independently before the combined
 * gate colour is determined. All three signals must be green for the gate to
 * be green; any red signal forces a red gate regardless of the others.
 */
export interface GateSignalDetail {
  hrv_signal: GateColour;
  sleep_signal: GateColour;
  soreness_signal: GateColour;
  /** The HRV vs baseline percentage that produced hrv_signal. Null if no baseline. */
  hrv_trend_pct: number | null;
  sleep_avg_7d: number;
  soreness_avg_7d: number;
}

/**
 * Full output of the recovery gate evaluation step.
 * Written to engine_decisions and used to derive the coaching report gate section.
 */
export interface GateEvaluationOutput {
  gate_colour: GateColour;
  signals: GateSignalDetail;
  /** True when the gate is amber and the engine recommends a deload week. */
  deload_recommended: boolean;
  /**
   * True only when gate is amber AND the athlete has not already used their
   * one permitted consecutive skip. Always false when gate is red.
   */
  deload_skippable: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Pillar output
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Pillar scores for the week, extending the JSONB shape with engine metadata.
 * Scores are 0–100. Scores below 60 trigger a volume increase next week;
 * scores ≥ 85 hold volume at current level.
 */
export interface PillarScoreOutput extends PillarScoresJson {
  /** ISO date YYYY-MM-DD of the Sunday that ends the scored week. */
  week_ending_date: string;
  mesocycle_week: number;
  /** Total training days completed this week (all session types except rest). */
  days_trained: number;
}

/**
 * The three weighted component scores that sum to one pillar's final score.
 * Stored in the engine decision log for coaching report transparency.
 */
export interface PillarComponentScores {
  /**
   * Completion component (50% weight for all pillars).
   * Strength: sets_completed / sets_programmed.
   * Skill: calisthenics_sets_completed / calisthenics_sets_programmed.
   * Cardio: zone2_minutes_completed / zone2_target.
   * Mobility: mobility_sessions_completed / mobility_sessions_planned.
   */
  primary: number;
  /**
   * Progress component (30% weight for all pillars).
   * Strength: overload_triggers_fired / total_movements.
   * Skill: 1 if any ladder advanced, 0.5 if held, 0 if regressed.
   * Cardio: 1 if interval session completed, 0 if missed (gate was green), 0.5 if not scheduled.
   * Mobility: embedded_sessions_completed / total_strength_sessions.
   */
  secondary: number;
  /**
   * Quality / trend component (20% weight for all pillars).
   * Strength: 1 − (avg_session_rpe − 7) / 3, clamped 0–1.
   * Skill: avg_subjective_quality / 5.
   * Cardio: cardio_sessions_completed / cardio_sessions_planned.
   * Mobility: subjective_flexibility_trend mapped improving=1, stable=0.5, declining=0.
   */
  tertiary: number;
}

/**
 * Full pillar score breakdown for one pillar.
 * The engine writes one of these per pillar to the decision log so the coaching
 * AI can explain why a score moved in a particular direction.
 */
export interface PillarScoreBreakdown {
  pillar: Pillar;
  /** Final 0–100 score. */
  score: number;
  component_scores: PillarComponentScores;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Session plan
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The complete next-week training plan produced by the engine's session-generation step.
 * This type is the engine's output representation; it serialises directly into
 * the program_json JSONB column of weekly_reports (see ProgramJson in athlete.ts).
 */
export type WeeklySessionPlan = ProgramJson;

// ─────────────────────────────────────────────────────────────────────────────
// 5. Decision log
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A volume decision for one muscle group, extending VolumeChange with the
 * engine inputs that caused it (gate colour, pillar score).
 */
export interface VolumeDecision extends VolumeChange {
  pillar_score: number;
  gate_colour: GateColour;
}

/**
 * A load decision for one tracked movement, extending LoadChange with the
 * double-progression state that triggered it.
 */
export interface LoadDecision extends LoadChange {
  /** consecutive_top value that was evaluated (≥ 2 triggers overload). */
  consecutive_top: number;
  /** consecutive_fail value that was evaluated (≥ 2 blocks overload). */
  consecutive_fail: number;
  last_session_rpe: number | null;
  /** True when overload conditions were met and load was increased. */
  overload_triggered: boolean;
  /** True when consecutive fails blocked the increase — athlete repeats the load. */
  load_held: boolean;
}

/**
 * A skill ladder change, extending LadderChange with the new movement the
 * athlete will train and the standard they must now meet.
 */
export interface LadderDecision extends LadderChange {
  /** consecutive_weeks_met value that triggered the advancement (must reach 2). */
  consecutive_weeks_met: number;
  /** consecutive_sessions_failed value that triggered regression (must reach 2). */
  consecutive_sessions_failed: number;
  /** Exercise name at the new rung the athlete has been placed on. */
  new_movement: string;
  /** Completion standard at the new rung (e.g. "3x8 RIR2"). */
  new_standard: string;
}

/**
 * The complete output of a single weekly engine run.
 * Every field is written to the database before the Claude API is called.
 * The engine_decisions row is assembled from this object; the weekly_reports
 * row receives pillar_scores and session_plan.
 */
export interface EngineRunOutput {
  /** ISO date YYYY-MM-DD of the Sunday that ends the week being planned for. */
  week_ending: string;
  gate_evaluation: GateEvaluationOutput;
  pillar_scores: PillarScoreOutput;
  /** One breakdown per pillar — used by the coaching AI to explain score changes. */
  pillar_breakdowns: PillarScoreBreakdown[];
  volume_decisions: VolumeDecision[];
  load_decisions: LoadDecision[];
  ladder_decisions: LadderDecision[];
  session_plan: WeeklySessionPlan;
  days_programmed: number;
  /**
   * True when the engine forced a deload this week (red gate or week 4).
   * If true, deload_trigger_reason in mesocycle_state is also written.
   */
  deload_triggered: boolean;
  /**
   * Plain-language flags the engine surfaced for the coaching AI.
   * Examples: "zone2_hr_consistently_above_ceiling", "no_overload_on_bench_in_6_weeks"
   */
  flags: string[];
}

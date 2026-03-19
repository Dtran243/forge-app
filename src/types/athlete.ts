/**
 * athlete.ts
 *
 * TypeScript types that mirror the Forge Supabase schema exactly.
 * Column names are snake_case to match the database. JSONB columns are
 * fully typed — no escape hatches.
 *
 * Sections:
 *   1. Union types  (shared vocabulary across the schema)
 *   2. JSONB sub-types  (shapes of each JSON/JSONB column)
 *   3. Table row types  (one interface per Supabase table)
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. Union types
// ─────────────────────────────────────────────────────────────────────────────

/** Training experience level. Controls volume modifier applied by the engine. */
export type TrainingAge = "beginner" | "intermediate" | "athlete";

/** Current nutritional / training phase. Changes engine volume and cardio targets. */
export type TrainingPhase = "build" | "lean" | "maintain";

/** Week classification within a mesocycle. Week 4 is always "deload". */
export type WeekType = "loading" | "deload";

/** Recovery gate colour computed daily from HRV, sleep, and soreness signals. */
export type GateColour = "green" | "amber" | "red";

/** Session category, used in daily_logs and session_logs. */
export type SessionType =
  | "strength_calisthenics"
  | "zone2"
  | "intervals"
  | "mobility"
  | "rest";

/** Cardio equipment or movement modality logged in a cardio session. */
export type CardioModality =
  | "cycling"
  | "running"
  | "rowing"
  | "walk"
  | "elliptical";

/** One of the four training pillars that every session element maps to. */
export type Pillar = "strength" | "skill" | "cardio" | "mobility";

/** Movement pattern category used to classify exercises in session logs. */
export type MovementPattern =
  | "hinge"
  | "quad"
  | "h_push"
  | "v_push"
  | "h_pull"
  | "v_pull";

/** Slot classification within a session — primary compounds vs rotating accessories. */
export type ExerciseTier = "primary" | "accessory";

/** DUP rep-range zone. Rotates across sessions so each muscle hits all three zones weekly. */
export type RepRange = "4-6" | "8-12" | "15-20";

/**
 * The ten muscle groups tracked by volume_state.
 * Every set logged maps to exactly one group.
 */
export type MuscleGroup =
  | "chest"
  | "back"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "quads"
  | "hamstrings"
  | "glutes"
  | "calves"
  | "core";

/**
 * The four calisthenics skill ladders tracked in skill_state.
 * Each ladder is an ordered sequence of movements the engine advances or regresses.
 */
export type LadderName =
  | "push_ladder"
  | "pull_ladder"
  | "core_ladder"
  | "squat_ladder";

/** Direction of a skill ladder change recorded in engine_decisions. */
export type LadderChangeDirection = "advancement" | "regression" | "no_change";

/**
 * The primary compound movements that receive individual rows in strength_state
 * and are tracked for double-progression load management.
 */
export type TrackedMovement =
  | "deadlift"
  | "romanian_deadlift"
  | "barbell_squat"
  | "hack_squat"
  | "barbell_bench_press"
  | "dumbbell_bench_press"
  | "barbell_overhead_press"
  | "dumbbell_overhead_press"
  | "barbell_row"
  | "cable_row"
  | "weighted_pull_up"
  | "lat_pulldown";

/** VO₂ max trend derived from the athlete's 4-week rolling device estimate. */
export type Vo2maxTrend = "improving" | "stable" | "declining";

/** Self-reported flexibility trend collected at the weekly check-in. */
export type FlexibilityTrend = "improving" | "stable" | "declining";

/** Body area covered by the 2-week mobility rotation cycle. */
export type MobilityArea =
  | "hip_flexor"
  | "thoracic_rotation"
  | "posterior_chain"
  | "shoulder_internal_rotation"
  | "ankle_dorsiflexion"
  | "adductors";

/** Day of the week used to anchor sessions in the generated program. */
export type DayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

// ─────────────────────────────────────────────────────────────────────────────
// 2. JSONB sub-types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Equipment the athlete has consistent access to.
 * Stored as JSONB in athlete_profiles.equipment_json.
 * The engine uses this to constrain exercise selection — an exercise requiring
 * rings is never scheduled unless rings is true.
 */
export interface EquipmentProfile {
  barbell_rack: boolean;
  dumbbells: boolean;
  cable_machine: boolean;
  pull_up_bar: boolean;
  rings: boolean;
  parallettes: boolean;
}

/**
 * A single set logged within a session exercise.
 * Element of LoggedExercise.sets inside ExercisesJson.
 */
export interface LoggedSet {
  set_number: number;
  load_kg: number | null;
  reps_completed: number | null;
  /** Reps in reserve reported by the athlete (0–4+). */
  rir_reported: number | null;
  /** RPE auto-calculated from RIR (1–10). */
  rpe_reported: number | null;
}

/**
 * A single exercise entry within a completed session.
 * Element of ExercisesJson.exercises.
 */
export interface LoggedExercise {
  name: string;
  pattern: MovementPattern;
  tier: ExerciseTier;
  sets: LoggedSet[];
  substitute_used: boolean;
  /** Name of the substitute movement if the athlete swapped this slot. */
  substitute_name: string | null;
  /** Reason the athlete gave or the engine assigned for the substitution. */
  substitute_reason: string | null;
  /** Superset partner embedded from the planned exercise, if any. */
  superset: SupersetInfo | null;
}

/**
 * Cardio data captured when session_type is "zone2" or "intervals".
 * Embedded in ExercisesJson.cardio.
 */
export interface LoggedCardioSession {
  type: "zone2" | "intervals";
  duration_minutes: number;
  avg_hr_bpm: number | null;
  max_hr_bpm: number | null;
  distance_km: number | null;
  modality: CardioModality;
  /** Minutes where HR stayed within the Zone 2 band (60–75% HRmax). Zone 2 only. */
  zone2_minutes?: number | null;
  /** Whether data came from Apple Health or was entered manually. */
  data_source?: "apple_health" | "manual";
  /** Number of 4-min work intervals completed. Intervals only. */
  interval_sets_completed?: number | null;
}

/**
 * Mobility data captured for a dedicated or embedded mobility block.
 * Embedded in ExercisesJson.mobility.
 */
export interface LoggedMobilitySession {
  area_trained: MobilityArea;
  session_duration_minutes: number;
  /** True when this block was embedded in a strength session rather than standalone. */
  embedded: boolean;
  /** Athlete's subjective quality rating for the block, 1–5. */
  subjective_quality: number | null;
  /** Number of exercises checked off during the session. */
  exercises_completed?: number | null;
  /** Total exercises in the rotation area. */
  exercises_total?: number | null;
}

/**
 * Full shape of the exercises_json JSONB column in session_logs.
 * Holds every exercise, set, and optional cardio / mobility sub-session for one completed workout.
 */
export interface ExercisesJson {
  exercises: LoggedExercise[];
  /** Populated only when session_type is "zone2" or "intervals". */
  cardio: LoggedCardioSession | null;
  /** Populated when a dedicated or embedded mobility block was performed. */
  mobility: LoggedMobilitySession | null;
}

/**
 * The four pillar scores for one week.
 * Stored as JSONB in weekly_reports.pillar_scores_json.
 * Each score is 0–100 as computed by the engine's weighted formulas.
 */
export interface PillarScoresJson {
  strength_score: number;
  skill_score: number;
  cardio_score: number;
  mobility_score: number;
}

/**
 * A single set within a programmed session, generated by the engine.
 * Element of PlannedExercise.sets inside ProgramJson.
 */
export interface PlannedSet {
  set_number: number;
  /** Null for timed hold exercises (use hold_duration_seconds instead). */
  target_reps_min: number | null;
  target_reps_max: number | null;
  /** Seconds to hold for timed exercises (hollow body, L-sit progressions). Null for rep-based. */
  hold_duration_seconds: number | null;
  /** Null for bodyweight calisthenics where load is not applicable. */
  load_kg: number | null;
  /** Reps in reserve target. Null for timed hold exercises. */
  rir_target: number | null;
}

/**
 * Calisthenics movement supersetted with a primary compound.
 * Nested inside PlannedExercise.superset — not a separate exercise entry.
 */
export interface SupersetInfo {
  /** Display name of the calisthenics movement. */
  name: string;
  ladder: LadderName;
  current_rung: number;
  /** Completion standard string, e.g. "3×8 each RIR2". */
  standard: string;
  /** True for timed hold movements (hollow body, L-sit progressions). */
  is_timed_hold: boolean;
  hold_duration_seconds: number | null;
}

/**
 * A single programmed exercise, generated by the engine for a session slot.
 * Element of PlannedSession.exercises inside ProgramJson.
 */
export interface PlannedExercise {
  name: string;
  pattern: MovementPattern;
  tier: ExerciseTier;
  /** Which of the four training pillars this exercise contributes to. */
  pillar: Pillar;
  sets: PlannedSet[];
  /** Programmed rest period in seconds between sets of this exercise. */
  rest_seconds: number;
  /**
   * Calisthenics movement supersetted with this compound.
   * Null for standalone exercises. When set, the UI renders the calisthenics
   * inline inside this card rather than as a separate exercise entry.
   */
  superset: SupersetInfo | null;
}

/**
 * A single programmed day within the weekly session plan.
 * Element of ProgramJson.sessions.
 */
export interface PlannedSession {
  day_of_week: DayOfWeek;
  session_type: SessionType;
  exercises: PlannedExercise[];
  estimated_duration_minutes: number;
}

/**
 * Full shape of the program_json JSONB column in weekly_reports.
 * Contains the complete next-week session plan written by the engine before the AI report is generated.
 */
export interface ProgramJson {
  week_starting: string; // ISO date YYYY-MM-DD
  week_ending: string;   // ISO date YYYY-MM-DD
  week_type: WeekType;
  mesocycle_week: number;
  days_programmed: number;
  sessions: PlannedSession[];
}

/**
 * A single volume change decision for one muscle group.
 * Element of engine_decisions.volume_changes_json.
 */
export interface VolumeChange {
  muscle_group: MuscleGroup;
  previous_target_sets: number;
  new_target_sets: number;
  /** Plain-language reason written by the engine (e.g. "week_2_progression"). */
  reason: string;
}

/**
 * A single load change decision for one tracked movement.
 * Element of engine_decisions.load_changes_json.
 */
export interface LoadChange {
  movement: TrackedMovement;
  previous_load_kg: number;
  new_load_kg: number;
  /** Plain-language reason (e.g. "double_progression_triggered"). */
  reason: string;
}

/**
 * A single skill ladder advancement or regression.
 * Element of engine_decisions.ladder_changes_json.
 */
export interface LadderChange {
  ladder: LadderName;
  change: LadderChangeDirection;
  from_rung: number;
  to_rung: number;
  /** Plain-language reason (e.g. "standard_met_2_consecutive_weeks"). */
  reason: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Table row types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Row in the athlete_profiles table.
 * One row per user. Stores the static profile established at onboarding
 * and editable via the Profile tab. Changes take effect at the next engine run.
 */
export interface AthleteProfile {
  user_id: string;
  training_age: TrainingAge;
  phase: TrainingPhase;
  bodyweight_kg: number | null;
  /** Used with max_hr_bpm to calculate Zone 2 and VO₂ max HR ceilings. */
  max_hr_bpm: number | null;
  /**
   * 30-day rolling HRV baseline in milliseconds. Null until 30 days of data
   * exist — the recovery gate uses soreness + sleep only until then.
   */
  hrv_baseline_ms: number | null;
  equipment_json: EquipmentProfile;
  onboarding_complete: boolean;
}

/**
 * Row in the mesocycle_state table.
 * One active row per user. Tracks the athlete's position within the current
 * 4-week training block (3 loading + 1 deload).
 */
export interface MesocycleState {
  user_id: string;
  /** Increments after each completed mesocycle. */
  cycle_number: number;
  /** 1–4. Week 4 is deload unless deload_triggered_early is true. */
  current_week: number;
  week_type: WeekType;
  /**
   * Cumulative count of MEV +1 set additions applied across completed cycles.
   * Caps when MRV − MAV < 2 sets.
   */
  mev_increment_applied: number;
  /** True when a red gate forced an early deload before week 4. */
  deload_triggered_early: boolean;
  /** Plain-language reason for an early deload, if applicable. */
  deload_trigger_reason: string | null;
}

/**
 * Row in the strength_state table.
 * One row per tracked compound movement per user.
 * The engine reads this to apply double-progression overload rules.
 */
export interface StrengthState {
  user_id: string;
  movement_name: TrackedMovement;
  current_load_kg: number | null;
  current_rep_range: RepRange;
  /**
   * Sessions where the athlete hit the top of the rep range at RPE ≤ 7.
   * Resets to 0 if not hit. Reaching 2 sets overload_due = true.
   */
  consecutive_top: number;
  /**
   * Sessions where reps completed fell below the rep range minimum.
   * Reaching 2 blocks any load increase — athlete repeats the weight.
   */
  consecutive_fail: number;
  overload_due: boolean;
  /** All-time best load at which the athlete completed at least the rep range minimum. */
  pr_kg: number | null;
  /**
   * Name of the active substitute movement for this slot, if the athlete has
   * swapped it. Engine uses this name for session generation until cleared.
   */
  active_substitute: string | null;
}

/**
 * Row in the volume_state table.
 * One row per muscle group per week per user.
 * Tracks target sets (engine-assigned) vs actual sets logged.
 */
export interface VolumeState {
  user_id: string;
  /** ISO date YYYY-MM-DD of the Monday that starts this week. */
  week_starting: string;
  muscle_group: MuscleGroup;
  target_sets: number;
  actual_sets: number;
}

/**
 * Row in the skill_state table.
 * One row per calisthenics ladder per user.
 * The engine reads this to evaluate advancement and regression at each weekly run.
 */
export interface SkillState {
  user_id: string;
  ladder_name: LadderName;
  /** 1-based index into the ladder array defined in forge-engine-constants.md. */
  current_rung: number;
  /** Display name of the exercise at the current rung. */
  current_movement: string;
  /** Completion standard for the current rung (e.g. "3x12 RIR2"). */
  current_standard: string;
  /**
   * Consecutive weeks the athlete met the standard with RIR ≥ 2.
   * Reaching 2 sets advancement_due = true.
   */
  consecutive_weeks_met: number;
  /**
   * Consecutive sessions the athlete failed to hit minimum reps.
   * Reaching 2 sets regression_due = true.
   */
  consecutive_sessions_failed: number;
  advancement_due: boolean;
  regression_due: boolean;
  last_advancement_date: string | null; // ISO date
  last_regression_date: string | null;  // ISO date
}

/**
 * Row in the cardio_state table.
 * One row per week per user. Tracks Zone 2 volume, interval completion,
 * and the cardio pillar score written by the engine at week end.
 */
export interface CardioState {
  user_id: string;
  /** ISO date YYYY-MM-DD of the Monday that starts this week. */
  week_starting: string;
  zone2_minutes: number;
  zone2_target: number;
  intervals_completed: boolean;
  /**
   * Cardio pillar score (0–100) for this week.
   * Null until the engine writes it at the Sunday weekly run.
   */
  pillar_score: number | null;
}

/**
 * Row in the daily_logs table.
 * One row per day per user. The primary source of recovery gate inputs.
 * Also records session completion and RPE for that day.
 */
export interface DailyLog {
  user_id: string;
  date: string; // ISO date YYYY-MM-DD
  /** Athlete's subjective soreness rating, 1 (fully recovered) to 5 (very sore). */
  soreness: number | null;
  sleep_hours: number | null;
  /** HRV in milliseconds, auto-populated from Apple Health / Google Fit. */
  hrv_ms: number | null;
  session_logged: boolean;
  session_type: SessionType | null;
  /** Overall session difficulty, 1–10, collected via single tap after the workout. */
  session_rpe: number | null;
  /** Free-text note, max 140 chars. Passed verbatim to the coaching report context. */
  notes: string | null;
}

/**
 * Row in the session_logs table.
 * One row per completed session per user.
 * Source of truth for strength state updates, volume accumulation, and pillar scoring.
 */
export interface SessionLog {
  user_id: string;
  date: string; // ISO date YYYY-MM-DD
  session_type: SessionType;
  /** Overall session RPE, 1–10. Null until the athlete submits the end-of-session tap. */
  session_rpe: number | null;
  duration_minutes: number | null;
  /** Full exercise, set, and optional cardio / mobility data for the session. */
  exercises_json: ExercisesJson;
  /** Gate colour at the time this session was completed — used for coaching context. */
  gate_at_time: GateColour;
}

/**
 * Row in the weekly_reports table.
 * One row per week per user. Stores the engine-computed program, pillar scores,
 * and the Claude-generated coaching report for that week.
 */
export interface WeeklyReport {
  user_id: string;
  /** ISO date YYYY-MM-DD of the Sunday that ends this week. */
  week_ending: string;
  pillar_scores_json: PillarScoresJson;
  gate_colour: GateColour;
  /** 150–200 word coaching report generated by Claude from the engine decision log. */
  coaching_report_text: string;
  /** The complete next-week session plan written by the engine. */
  program_json: ProgramJson;
}

/**
 * Row in the engine_decisions table.
 * One row per week per user. The engine's full decision log written before the
 * AI report is generated. The coaching AI reads this to explain decisions in plain language.
 */
export interface EngineDecision {
  user_id: string;
  /** ISO date YYYY-MM-DD of the Sunday that ends this week. */
  week_ending: string;
  volume_changes_json: VolumeChange[];
  load_changes_json: LoadChange[];
  ladder_changes_json: LadderChange[];
  /**
   * Plain-language engine flags that the AI should surface in the coaching report.
   * Examples: "zone2_hr_consistently_above_ceiling", "no_overload_on_bench_in_6_weeks"
   */
  flags_json: string[];
}

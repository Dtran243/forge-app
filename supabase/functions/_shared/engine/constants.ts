/**
 * engine/constants.ts
 *
 * Hard calibration values for the Forge adaptation engine.
 * Source of truth: docs/forge-engine-constants.md
 * Never put business logic here — pure data only.
 */

import type { MuscleGroup, MobilityArea } from '../types/athlete.ts';

// ── Volume landmarks ──────────────────────────────────────────────────────────

export interface VolumeLandmarks {
  mev: number;
  mav: number;
  mrv: number;
}

export const VOLUME_LANDMARKS: Record<MuscleGroup, VolumeLandmarks> = {
  chest:       { mev: 10, mav: 16, mrv: 22 },
  back:        { mev: 10, mav: 18, mrv: 25 },
  shoulders:   { mev:  8, mav: 14, mrv: 20 },
  biceps:      { mev:  6, mav: 12, mrv: 18 },
  triceps:     { mev:  6, mav: 12, mrv: 18 },
  quads:       { mev:  8, mav: 16, mrv: 22 },
  hamstrings:  { mev:  6, mav: 12, mrv: 18 },
  glutes:      { mev:  6, mav: 12, mrv: 16 },
  calves:      { mev:  8, mav: 14, mrv: 20 },
  core:        { mev:  6, mav: 10, mrv: 14 },
};

// ── Weekly volume progression ─────────────────────────────────────────────────

export const VOLUME_INCREASE_PER_WEEK_MIN = 0.05;
export const VOLUME_INCREASE_PER_WEEK_MAX = 0.10;
export const VOLUME_SPIKE_LIMIT = 0.10; // hard ceiling regardless of pillar scores

// ── Rep ranges (DUP) ─────────────────────────────────────────────────────────

export const REP_RANGES = {
  strength:     { min: 4,  max: 6,  rir_target: 2, rir_final: 1 },
  hypertrophy:  { min: 8,  max: 12, rir_target: 2, rir_final: 0 },
  metabolic:    { min: 15, max: 20, rir_target: 1, rir_final: 0 },
} as const;

// ── RPE targets ───────────────────────────────────────────────────────────────

export const RPE_WORKING_MIN = 7;
export const RPE_WORKING_MAX = 8;
export const RPE_TOP_SET = 9;

// ── Training frequency ────────────────────────────────────────────────────────

export const MIN_REST_HOURS_BETWEEN_SAME_MUSCLE = 48;

// ── Session structure ─────────────────────────────────────────────────────────

export const MAX_EXERCISES_PER_SESSION = 6;
export const MIN_EXERCISES_PER_SESSION = 3;
export const CALISTHENICS_FINISHER_SETS = 2;
export const SESSION_DURATION_TARGET_MINUTES = 60;
export const SESSION_DURATION_MAX_MINUTES = 75;

// ── Cardio targets ────────────────────────────────────────────────────────────

export const ZONE2_WEEKLY_MINUTES_MIN = 150;
export const ZONE2_WEEKLY_MINUTES_TARGET = 180;
export const ZONE2_WEEKLY_MINUTES_HIGH_FITNESS = 240;
export const ZONE2_HR_CEILING_PCT = 0.75;
export const ZONE2_HR_FLOOR_PCT = 0.60;
export const VO2MAX_SESSIONS_PER_WEEK_MAX = 1;
export const MIN_HOURS_BETWEEN_INTERVALS_AND_STRENGTH = 6;

// ── Mesocycle structure ───────────────────────────────────────────────────────

export const MESOCYCLE_LOADING_WEEKS = 3;
export const MESOCYCLE_DELOAD_WEEKS = 1;
export const MESOCYCLE_LENGTH_TOTAL = 4;
export const DELOAD_VOLUME_REDUCTION = 0.40;
export const DELOAD_INTENSITY_REDUCTION = 0.20;
export const DELOAD_RPE_CEILING = 7;
export const MEV_INCREMENT_PER_CYCLE = 1;

// ── Recovery gate thresholds ──────────────────────────────────────────────────

export const HRV_AMBER_THRESHOLD_PCT = -0.10; // 10% below baseline
export const HRV_CONSECUTIVE_DAYS_FOR_RED = 3;
export const HRV_ROLLING_WINDOW_DAYS = 7;

export const SORENESS_GREEN_MAX = 3;  // <= 3 = green
export const SORENESS_AMBER = 4;
export const SORENESS_RED = 5;

export const SLEEP_GREEN_HOURS = 7.0;
export const SLEEP_AMBER_HOURS = 6.0;
export const SLEEP_CONSECUTIVE_DAYS_FOR_RED = 5;

// ── Pillar scoring weights ────────────────────────────────────────────────────

export const PILLAR_WEIGHTS = {
  strength: { completion: 0.50, progress: 0.30, quality: 0.20 },
  skill:    { completion: 0.50, progress: 0.30, quality: 0.20 },
  cardio:   { completion: 0.50, progress: 0.30, quality: 0.20 },
  mobility: { completion: 0.60, progress: 0.20, quality: 0.20 },
} as const;

export const PILLAR_SCORE_INCREASE_THRESHOLD = 85;
export const PILLAR_SCORE_DECREASE_THRESHOLD = 60;

// ── Progressive overload ──────────────────────────────────────────────────────

export const OVERLOAD_CONSECUTIVE_TOP_REQUIRED = 2;
export const OVERLOAD_CONSECUTIVE_FAIL_BLOCKS = 2;
export const OVERLOAD_INCREMENT_BARBELL_UPPER_KG = 2.5;
export const OVERLOAD_INCREMENT_BARBELL_LOWER_KG = 5.0;
export const OVERLOAD_INCREMENT_DUMBBELL_KG = 2.0;

// ── Skill ladder progression ──────────────────────────────────────────────────

export const LADDER_ADVANCE_CONSECUTIVE_WEEKS = 2;
export const LADDER_REGRESS_CONSECUTIVE_SESSIONS = 2;

// ── Days per week ─────────────────────────────────────────────────────────────

export const DAYS_PER_WEEK_DEFAULT = 5;
export const DAYS_GREEN_STANDARD = 5;
export const DAYS_GREEN_HIGH_PILLAR_GAPS = 6;
export const DAYS_AMBER = 4;
export const DAYS_RED = 3;

// ── Mobility rotation ─────────────────────────────────────────────────────────

export const MOBILITY_AREAS: MobilityArea[] = [
  'hip_flexor',
  'thoracic_rotation',
  'posterior_chain',
  'shoulder_internal_rotation',
  'ankle_dorsiflexion',
  'adductors',
];
export const MOBILITY_ROTATION_WEEKS = 2;
export const MOBILITY_SESSION_DURATION_MINUTES = 20;
export const MOBILITY_SESSIONS_PER_WEEK_DELOAD = 2;

// ── Calisthenics ladders ──────────────────────────────────────────────────────

export interface LadderRung {
  rung: number;
  name: string;
  standard: string;
}

export const PUSH_LADDER: LadderRung[] = [
  { rung: 1, name: 'Incline push-up',          standard: '3x12 RIR2' },
  { rung: 2, name: 'Push-up',                  standard: '3x15 RIR2' },
  { rung: 3, name: 'Diamond push-up',          standard: '3x12 RIR2' },
  { rung: 4, name: 'Archer push-up',           standard: '3x8 each RIR2' },
  { rung: 5, name: 'Pseudo planche push-up',   standard: '3x8 RIR2' },
  { rung: 6, name: 'Ring push-up',             standard: '3x10 RIR2' },
  { rung: 7, name: 'Ring dip',                 standard: '3x8 RIR2' },
  { rung: 8, name: 'Weighted ring dip',        standard: '3x6 +10kg RIR2' },
];

export const PULL_LADDER: LadderRung[] = [
  { rung: 1, name: 'Band-assisted pull-up',    standard: '3x10 RIR2' },
  { rung: 2, name: 'Pull-up',                  standard: '3x8 RIR2' },
  { rung: 3, name: 'Weighted pull-up',         standard: '3x6 +10kg RIR2' },
  { rung: 4, name: 'L-sit pull-up',            standard: '3x5 RIR2' },
  { rung: 5, name: 'Archer pull-up',           standard: '3x4 each RIR2' },
  { rung: 6, name: 'Weighted pull-up +20kg',   standard: '3x5 RIR2' },
  { rung: 7, name: 'One-arm negative',         standard: '3x3 each controlled' },
];

export const CORE_LADDER: LadderRung[] = [
  { rung: 1, name: 'Hollow body hold',         standard: '3x30s' },
  { rung: 2, name: 'Tuck L-sit (floor)',       standard: '3x20s' },
  { rung: 3, name: 'L-sit (floor)',            standard: '3x15s' },
  { rung: 4, name: 'L-sit (parallettes)',      standard: '3x20s' },
  { rung: 5, name: 'Tuck V-sit',               standard: '3x10s' },
  { rung: 6, name: 'V-sit',                    standard: '3x10s' },
  { rung: 7, name: 'Manna progression',        standard: '3x5s' },
];

export const SQUAT_LADDER: LadderRung[] = [
  { rung: 1, name: 'Assisted pistol squat',    standard: '3x8 each RIR2' },
  { rung: 2, name: 'Shrimp squat',             standard: '3x6 each RIR2' },
  { rung: 3, name: 'Pistol squat',             standard: '3x5 each RIR2' },
  { rung: 4, name: 'Weighted pistol squat',    standard: '3x4 each +10kg RIR2' },
  { rung: 5, name: 'Nordic curl',              standard: '3x5 RIR2' },
  { rung: 6, name: 'Weighted Nordic curl',     standard: '3x5 +10kg RIR2' },
];

import type { LadderName } from '../types/athlete.ts';

export const LADDERS: Record<LadderName, LadderRung[]> = {
  push_ladder:  PUSH_LADDER,
  pull_ladder:  PULL_LADDER,
  core_ladder:  CORE_LADDER,
  squat_ladder: SQUAT_LADDER,
};

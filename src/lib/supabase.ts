/**
 * supabase.ts
 *
 * Typed Supabase client. The Database interface mirrors 001_initial_schema.sql
 * exactly — column names, nullability, and enum values are authoritative here.
 *
 * All app code should import { supabase } from this file, never call
 * createClient directly.
 */

import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  EquipmentProfile,
  LoggedExercise,
  LoggedCardioSession,
  LoggedMobilitySession,
  ProgramJson,
  VolumeChange,
  LoadChange,
  LadderChange,
} from '../types/athlete';

// ── DB enum types (match Postgres CREATE TYPE in the migration) ──────────────

type DbTrainingAge = 'beginner' | 'intermediate' | 'athlete';
type DbTrainingPhase = 'build' | 'lean' | 'maintain';
type DbWeekType = 'loading' | 'deload';
type DbGateColour = 'green' | 'amber' | 'red';
type DbSessionType = 'strength_calisthenics' | 'zone2' | 'intervals' | 'mobility' | 'rest';
type DbVo2maxTrend = 'improving' | 'stable' | 'declining';
type DbFlexibilityTrend = 'improving' | 'stable' | 'declining';
type DbLadderName = 'push_ladder' | 'pull_ladder' | 'core_ladder' | 'squat_ladder';
type DbMuscleGroup =
  | 'chest' | 'back' | 'shoulders' | 'biceps' | 'triceps'
  | 'quads' | 'hamstrings' | 'glutes' | 'calves' | 'core';
type DbMovementPattern =
  | 'hinge' | 'quad' | 'h_push' | 'v_push' | 'h_pull' | 'v_pull'
  | 'calisthenics' | 'accessory';
type DbExerciseTier = 'primary' | 'accessory' | 'calisthenics' | 'cardio' | 'mobility';

// ── Database type (one interface = one table) ────────────────────────────────

export interface Database {
  public: {
    Tables: {

      // ── athlete_profiles ──────────────────────────────────────────────────
      athlete_profiles: {
        Row: {
          id: string;
          user_id: string;
          training_age: DbTrainingAge;
          phase: DbTrainingPhase;
          bodyweight_kg: number | null;
          height_cm: number | null;
          age: number | null;
          max_hr_bpm: number | null;
          hrv_baseline_ms: number | null;
          /** JSONB column: equipment available to the athlete. */
          equipment: EquipmentProfile;
          /** 0 = Sunday, 1 = Monday (default). */
          week_start_day: number;
          units: 'kg' | 'lbs';
          onboarding_complete: boolean;
          onboarding_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          training_age?: DbTrainingAge;
          phase?: DbTrainingPhase;
          bodyweight_kg?: number | null;
          height_cm?: number | null;
          age?: number | null;
          max_hr_bpm?: number | null;
          hrv_baseline_ms?: number | null;
          equipment?: EquipmentProfile;
          week_start_day?: number;
          units?: 'kg' | 'lbs';
          onboarding_complete?: boolean;
          onboarding_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['athlete_profiles']['Insert']>;
      };

      // ── mesocycle_state ───────────────────────────────────────────────────
      mesocycle_state: {
        Row: {
          id: string;
          user_id: string;
          cycle_number: number;
          /** 1–4. Week 4 is always deload unless deload_triggered_early. */
          current_week: number;
          week_type: DbWeekType;
          loading_weeks_completed: number;
          deload_triggered_early: boolean;
          deload_trigger_reason: string | null;
          mev_increment_applied: number;
          travel_mode_active: boolean;
          travel_mode_start_date: string | null;
          travel_mode_end_date: string | null;
          updated_at: string;
        };
        Relationships: [];
        Insert: {
          id?: string;
          user_id: string;
          cycle_number?: number;
          current_week?: number;
          week_type?: DbWeekType;
          loading_weeks_completed?: number;
          deload_triggered_early?: boolean;
          deload_trigger_reason?: string | null;
          mev_increment_applied?: number;
          travel_mode_active?: boolean;
          travel_mode_start_date?: string | null;
          travel_mode_end_date?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          cycle_number?: number;
          current_week?: number;
          week_type?: DbWeekType;
          loading_weeks_completed?: number;
          deload_triggered_early?: boolean;
          deload_trigger_reason?: string | null;
          mev_increment_applied?: number;
          travel_mode_active?: boolean;
          travel_mode_start_date?: string | null;
          travel_mode_end_date?: string | null;
          updated_at?: string;
        };
      };

      // ── strength_state ────────────────────────────────────────────────────
      strength_state: {
        Row: {
          id: string;
          user_id: string;
          movement_name: string;
          pattern: DbMovementPattern | null;
          current_load_kg: number | null;
          current_rep_range: string;
          last_session_reps_completed: number | null;
          last_session_rpe: number | null;
          consecutive_sessions_at_top_of_range: number;
          consecutive_sessions_below_range: number;
          overload_due: boolean;
          last_overload_date: string | null;
          pr_kg: number | null;
          pr_date: string | null;
          active_substitute: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          movement_name: string;
          pattern?: DbMovementPattern | null;
          current_load_kg?: number | null;
          current_rep_range?: string;
          last_session_reps_completed?: number | null;
          last_session_rpe?: number | null;
          consecutive_sessions_at_top_of_range?: number;
          consecutive_sessions_below_range?: number;
          overload_due?: boolean;
          last_overload_date?: string | null;
          pr_kg?: number | null;
          pr_date?: string | null;
          active_substitute?: string | null;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['strength_state']['Insert']>;
      };

      // ── volume_state ──────────────────────────────────────────────────────
      volume_state: {
        Row: {
          id: string;
          user_id: string;
          week_starting: string;
          muscle_group: DbMuscleGroup;
          target_sets: number | null;
          actual_sets: number;
          /** Computed after the week ends: actual_sets / target_sets. */
          completion_pct: number | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          week_starting: string;
          muscle_group: DbMuscleGroup;
          target_sets?: number | null;
          actual_sets?: number;
          completion_pct?: number | null;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['volume_state']['Insert']>;
      };

      // ── skill_state ───────────────────────────────────────────────────────
      skill_state: {
        Row: {
          id: string;
          user_id: string;
          /** Column name in DB is "ladder", not "ladder_name". */
          ladder: DbLadderName;
          current_rung: number;
          current_movement: string;
          current_standard: string;
          consecutive_weeks_meeting_standard: number;
          consecutive_sessions_failing: number;
          advancement_due: boolean;
          regression_due: boolean;
          last_advancement_date: string | null;
          last_regression_date: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          ladder: DbLadderName;
          current_rung?: number;
          current_movement: string;
          current_standard: string;
          consecutive_weeks_meeting_standard?: number;
          consecutive_sessions_failing?: number;
          advancement_due?: boolean;
          regression_due?: boolean;
          last_advancement_date?: string | null;
          last_regression_date?: string | null;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['skill_state']['Insert']>;
      };

      // ── cardio_state ──────────────────────────────────────────────────────
      cardio_state: {
        Row: {
          id: string;
          user_id: string;
          week_starting: string;
          zone2_minutes_actual: number;
          zone2_minutes_target: number;
          intervals_completed: boolean;
          intervals_planned: boolean;
          sessions_completed: number;
          sessions_planned: number;
          avg_zone2_hr_last_session: number | null;
          estimated_vo2max: number | null;
          vo2max_trend: DbVo2maxTrend | null;
          pillar_score: number | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          week_starting: string;
          zone2_minutes_actual?: number;
          zone2_minutes_target?: number;
          intervals_completed?: boolean;
          intervals_planned?: boolean;
          sessions_completed?: number;
          sessions_planned?: number;
          avg_zone2_hr_last_session?: number | null;
          estimated_vo2max?: number | null;
          vo2max_trend?: DbVo2maxTrend | null;
          pillar_score?: number | null;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['cardio_state']['Insert']>;
      };

      // ── mobility_state ────────────────────────────────────────────────────
      mobility_state: {
        Row: {
          id: string;
          user_id: string;
          week_starting: string;
          sessions_completed: number;
          sessions_planned: number;
          embedded_completed: number;
          embedded_planned: number;
          current_rotation_area: string;
          next_rotation_area: string;
          rotation_week: 1 | 2;
          subjective_flexibility_trend: DbFlexibilityTrend | null;
          pillar_score: number | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          week_starting: string;
          sessions_completed?: number;
          sessions_planned?: number;
          embedded_completed?: number;
          embedded_planned?: number;
          current_rotation_area?: string;
          next_rotation_area?: string;
          rotation_week?: 1 | 2;
          subjective_flexibility_trend?: DbFlexibilityTrend | null;
          pillar_score?: number | null;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['mobility_state']['Insert']>;
      };

      // ── recovery_state ────────────────────────────────────────────────────
      recovery_state: {
        Row: {
          id: string;
          user_id: string;
          hrv_readings_7d: number[];
          hrv_baseline_30d: number | null;
          hrv_trend_vs_baseline_pct: number | null;
          sleep_hours_7d: number[];
          sleep_avg_7d: number | null;
          soreness_ratings_7d: number[];
          soreness_avg_7d: number | null;
          consecutive_days_hrv_below_amber: number;
          consecutive_days_sleep_below_amber: number;
          current_gate: DbGateColour;
          gate_override_active: boolean;
          gate_override_expires_date: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          hrv_readings_7d?: number[];
          hrv_baseline_30d?: number | null;
          hrv_trend_vs_baseline_pct?: number | null;
          sleep_hours_7d?: number[];
          sleep_avg_7d?: number | null;
          soreness_ratings_7d?: number[];
          soreness_avg_7d?: number | null;
          consecutive_days_hrv_below_amber?: number;
          consecutive_days_sleep_below_amber?: number;
          current_gate?: DbGateColour;
          gate_override_active?: boolean;
          gate_override_expires_date?: string | null;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['recovery_state']['Insert']>;
      };

      // ── daily_logs ────────────────────────────────────────────────────────
      daily_logs: {
        Row: {
          id: string;
          user_id: string;
          log_date: string;
          soreness_rating: number | null;
          sleep_hours: number | null;
          hrv_ms: number | null;
          session_logged: boolean;
          session_type: DbSessionType | null;
          session_rpe: number | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          log_date: string;
          soreness_rating?: number | null;
          sleep_hours?: number | null;
          hrv_ms?: number | null;
          session_logged?: boolean;
          session_type?: DbSessionType | null;
          session_rpe?: number | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['daily_logs']['Insert']>;
      };

      // ── session_logs ──────────────────────────────────────────────────────
      session_logs: {
        Row: {
          id: string;
          user_id: string;
          session_date: string;
          session_type: DbSessionType;
          session_rpe: number | null;
          gate_at_time: DbGateColour;
          duration_minutes: number | null;
          mesocycle_week: number | null;
          cycle_number: number | null;
          /** JSONB: LoggedExercise[] */
          exercises: LoggedExercise[];
          /** JSONB: LoggedCardioSession | null */
          cardio: LoggedCardioSession | null;
          /** JSONB: LoggedMobilitySession | null */
          mobility: LoggedMobilitySession | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          session_date: string;
          session_type: DbSessionType;
          session_rpe?: number | null;
          gate_at_time?: DbGateColour;
          duration_minutes?: number | null;
          mesocycle_week?: number | null;
          cycle_number?: number | null;
          exercises?: LoggedExercise[];
          cardio?: LoggedCardioSession | null;
          mobility?: LoggedMobilitySession | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['session_logs']['Insert']>;
      };

      // ── weekly_reports ────────────────────────────────────────────────────
      weekly_reports: {
        Row: {
          id: string;
          user_id: string;
          week_ending: string;
          week_starting: string;
          cycle_number: number | null;
          mesocycle_week: number | null;
          strength_score: number | null;
          skill_score: number | null;
          cardio_score: number | null;
          mobility_score: number | null;
          gate_colour: DbGateColour;
          days_trained: number | null;
          coaching_report: string | null;
          report_generated_at: string | null;
          /** JSONB: ProgramJson — the complete next-week session plan. */
          program: ProgramJson;
          report_generation_failed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          week_ending: string;
          week_starting: string;
          cycle_number?: number | null;
          mesocycle_week?: number | null;
          strength_score?: number | null;
          skill_score?: number | null;
          cardio_score?: number | null;
          mobility_score?: number | null;
          gate_colour: DbGateColour;
          days_trained?: number | null;
          coaching_report?: string | null;
          report_generated_at?: string | null;
          program?: ProgramJson;
          report_generation_failed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['weekly_reports']['Insert']>;
      };

      // ── engine_decisions ──────────────────────────────────────────────────
      engine_decisions: {
        Row: {
          id: string;
          user_id: string;
          week_ending: string;
          mesocycle_week: number | null;
          recovery_gate: DbGateColour;
          days_programmed: number | null;
          deload_triggered: boolean;
          /** JSONB: VolumeChange[] */
          volume_changes: VolumeChange[];
          /** JSONB: LoadChange[] */
          load_changes: LoadChange[];
          /** JSONB: LadderChange[] */
          ladder_changes: LadderChange[];
          /** text[] — plain-language flags for the coaching AI. */
          flags: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          week_ending: string;
          mesocycle_week?: number | null;
          recovery_gate: DbGateColour;
          days_programmed?: number | null;
          deload_triggered?: boolean;
          volume_changes?: VolumeChange[];
          load_changes?: LoadChange[];
          ladder_changes?: LadderChange[];
          flags?: string[];
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['engine_decisions']['Insert']>;
      };
    };

    Enums: {
      training_age: DbTrainingAge;
      training_phase: DbTrainingPhase;
      week_type: DbWeekType;
      gate_colour: DbGateColour;
      session_type: DbSessionType;
      vo2max_trend: DbVo2maxTrend;
      flexibility_trend: DbFlexibilityTrend;
      ladder_name: DbLadderName;
      muscle_group: DbMuscleGroup;
      movement_pattern: DbMovementPattern;
      exercise_tier: DbExerciseTier;
    };
  };
}

// ── Row type helpers — import these instead of indexing Database directly ────

export type AthleteProfileRow =
  Database['public']['Tables']['athlete_profiles']['Row'];
export type MesocycleStateRow =
  Database['public']['Tables']['mesocycle_state']['Row'];
export type StrengthStateRow =
  Database['public']['Tables']['strength_state']['Row'];
export type VolumeStateRow =
  Database['public']['Tables']['volume_state']['Row'];
export type SkillStateRow =
  Database['public']['Tables']['skill_state']['Row'];
export type CardioStateRow =
  Database['public']['Tables']['cardio_state']['Row'];
export type MobilityStateRow =
  Database['public']['Tables']['mobility_state']['Row'];
export type RecoveryStateRow =
  Database['public']['Tables']['recovery_state']['Row'];
export type DailyLogRow =
  Database['public']['Tables']['daily_logs']['Row'];
export type SessionLogRow =
  Database['public']['Tables']['session_logs']['Row'];
export type WeeklyReportRow =
  Database['public']['Tables']['weekly_reports']['Row'];
export type EngineDecisionRow =
  Database['public']['Tables']['engine_decisions']['Row'];

// ── Supabase client ──────────────────────────────────────────────────────────

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

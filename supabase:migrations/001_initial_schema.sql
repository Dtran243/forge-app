-- ============================================================
-- FORGE — Initial Schema
-- Migration: 001_initial_schema.sql
-- Run this first in Supabase SQL editor
-- ============================================================

-- Enable UUID extension (enabled by default in Supabase, but explicit is safer)
create extension if not exists "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================

create type training_age as enum ('beginner', 'intermediate', 'athlete');
create type training_phase as enum ('build', 'lean', 'maintain');
create type week_type as enum ('loading', 'deload');
create type gate_colour as enum ('green', 'amber', 'red');
create type session_type as enum ('strength_calisthenics', 'zone2', 'intervals', 'mobility', 'rest');
create type vo2max_trend as enum ('improving', 'stable', 'declining');
create type flexibility_trend as enum ('improving', 'stable', 'declining');
create type cardio_modality as enum ('cycling', 'running', 'rowing', 'walk', 'elliptical');
create type ladder_name as enum ('push_ladder', 'pull_ladder', 'core_ladder', 'squat_ladder');
create type muscle_group as enum (
  'chest', 'back', 'shoulders', 'biceps', 'triceps',
  'quads', 'hamstrings', 'glutes', 'calves', 'core'
);
create type movement_pattern as enum (
  'hinge', 'quad', 'h_push', 'v_push', 'h_pull', 'v_pull', 'calisthenics', 'accessory'
);
create type exercise_tier as enum ('primary', 'accessory', 'calisthenics', 'cardio', 'mobility');

-- ============================================================
-- ATHLETE PROFILES
-- One row per user. Created on onboarding completion.
-- ============================================================

create table athlete_profiles (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  training_age    training_age not null default 'athlete',
  phase           training_phase not null default 'build',
  bodyweight_kg   numeric(5,2),
  height_cm       numeric(5,1),
  age             smallint check (age between 14 and 100),
  max_hr_bpm      smallint check (max_hr_bpm between 100 and 220),
  hrv_baseline_ms numeric(6,2),             -- null until 30 days of data
  equipment       jsonb not null default '{}', -- { barbell: true, rings: false, ... }
  week_start_day  smallint not null default 1 check (week_start_day between 0 and 6), -- 0=Sun, 1=Mon
  units           text not null default 'kg' check (units in ('kg', 'lbs')),
  onboarding_complete boolean not null default false,
  onboarding_date date,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint athlete_profiles_user_id_unique unique (user_id)
);

-- ============================================================
-- MESOCYCLE STATE
-- One active row per user. Updated by the engine each week.
-- ============================================================

create table mesocycle_state (
  id                      uuid primary key default uuid_generate_v4(),
  user_id                 uuid not null references auth.users(id) on delete cascade,
  cycle_number            smallint not null default 1,
  current_week            smallint not null default 1 check (current_week between 1 and 4),
  week_type               week_type not null default 'loading',
  loading_weeks_completed smallint not null default 0,
  deload_triggered_early  boolean not null default false,
  deload_trigger_reason   text,
  mev_increment_applied   smallint not null default 0,
  travel_mode_active      boolean not null default false,
  travel_mode_end_date    date,
  updated_at              timestamptz not null default now(),

  constraint mesocycle_state_user_id_unique unique (user_id)
);

-- ============================================================
-- STRENGTH STATE
-- One row per movement per user. Tracks load and progression.
-- ============================================================

create table strength_state (
  id                                    uuid primary key default uuid_generate_v4(),
  user_id                               uuid not null references auth.users(id) on delete cascade,
  movement_name                         text not null,
  pattern                               movement_pattern,
  current_load_kg                       numeric(6,2),
  current_rep_range                     text not null default '8-12', -- e.g. "4-6", "8-12", "15-20"
  last_session_reps_completed           smallint,
  last_session_rpe                      numeric(3,1) check (last_session_rpe between 1 and 10),
  consecutive_sessions_at_top_of_range  smallint not null default 0,
  consecutive_sessions_below_range      smallint not null default 0,
  overload_due                          boolean not null default false,
  last_overload_date                    date,
  pr_kg                                 numeric(6,2),
  pr_date                               date,
  active_substitute                     text,                          -- null = no substitute active
  updated_at                            timestamptz not null default now(),

  constraint strength_state_user_movement_unique unique (user_id, movement_name)
);

-- ============================================================
-- VOLUME STATE
-- One row per muscle group per week per user.
-- Resets each new week — historical rows are kept for progress tracking.
-- ============================================================

create table volume_state (
  id                          uuid primary key default uuid_generate_v4(),
  user_id                     uuid not null references auth.users(id) on delete cascade,
  week_starting               date not null,
  muscle_group                muscle_group not null,
  target_sets                 smallint,
  actual_sets                 smallint not null default 0,
  completion_pct              numeric(5,2),                            -- computed after week ends
  updated_at                  timestamptz not null default now(),

  constraint volume_state_user_week_muscle_unique unique (user_id, week_starting, muscle_group)
);

-- ============================================================
-- SKILL STATE
-- One row per ladder per user.
-- ============================================================

create table skill_state (
  id                                  uuid primary key default uuid_generate_v4(),
  user_id                             uuid not null references auth.users(id) on delete cascade,
  ladder                              ladder_name not null,
  current_rung                        smallint not null default 1,
  current_movement                    text not null,
  current_standard                    text not null,                   -- e.g. "3x12 RIR2"
  consecutive_weeks_meeting_standard  smallint not null default 0,
  consecutive_sessions_failing        smallint not null default 0,
  advancement_due                     boolean not null default false,
  regression_due                      boolean not null default false,
  last_advancement_date               date,
  last_regression_date                date,
  updated_at                          timestamptz not null default now(),

  constraint skill_state_user_ladder_unique unique (user_id, ladder)
);

-- ============================================================
-- CARDIO STATE
-- One row per week per user.
-- ============================================================

create table cardio_state (
  id                          uuid primary key default uuid_generate_v4(),
  user_id                     uuid not null references auth.users(id) on delete cascade,
  week_starting               date not null,
  zone2_minutes_actual        smallint not null default 0,
  zone2_minutes_target        smallint not null default 180,
  intervals_completed         boolean not null default false,
  intervals_planned           boolean not null default false,
  sessions_completed          smallint not null default 0,
  sessions_planned            smallint not null default 0,
  avg_zone2_hr_last_session   smallint,
  estimated_vo2max            numeric(5,2),
  vo2max_trend                vo2max_trend,
  pillar_score                numeric(5,2),                            -- computed at week end
  updated_at                  timestamptz not null default now(),

  constraint cardio_state_user_week_unique unique (user_id, week_starting)
);

-- ============================================================
-- MOBILITY STATE
-- One active row per user for current rotation tracking.
-- ============================================================

create table mobility_state (
  id                              uuid primary key default uuid_generate_v4(),
  user_id                         uuid not null references auth.users(id) on delete cascade,
  week_starting                   date not null,
  sessions_completed              smallint not null default 0,
  sessions_planned                smallint not null default 1,
  embedded_completed              smallint not null default 0,
  embedded_planned                smallint not null default 0,
  current_rotation_area           text not null default 'hip_flexor',
  next_rotation_area              text not null default 'thoracic_rotation',
  rotation_week                   smallint not null default 1 check (rotation_week in (1, 2)),
  subjective_flexibility_trend    flexibility_trend,
  pillar_score                    numeric(5,2),                        -- computed at week end
  updated_at                      timestamptz not null default now(),

  constraint mobility_state_user_week_unique unique (user_id, week_starting)
);

-- ============================================================
-- RECOVERY STATE
-- One active row per user. Rolling window updated daily.
-- ============================================================

create table recovery_state (
  id                              uuid primary key default uuid_generate_v4(),
  user_id                         uuid not null references auth.users(id) on delete cascade,
  hrv_readings_7d                 numeric(6,2)[] not null default '{}',  -- array, newest last
  hrv_baseline_30d                numeric(6,2),
  hrv_trend_vs_baseline_pct       numeric(6,2),
  sleep_hours_7d                  numeric(4,2)[] not null default '{}',
  sleep_avg_7d                    numeric(4,2),
  soreness_ratings_7d             smallint[] not null default '{}',
  soreness_avg_7d                 numeric(4,2),
  consecutive_days_hrv_below_amber  smallint not null default 0,
  consecutive_days_sleep_below_amber smallint not null default 0,
  current_gate                    gate_colour not null default 'green',
  gate_override_active            boolean not null default false,
  gate_override_expires_date      date,
  updated_at                      timestamptz not null default now(),

  constraint recovery_state_user_id_unique unique (user_id)
);

-- ============================================================
-- DAILY LOGS
-- One row per day per user. Source of truth for recovery state.
-- ============================================================

create table daily_logs (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  log_date        date not null,
  soreness_rating smallint check (soreness_rating between 1 and 5),
  sleep_hours     numeric(4,2) check (sleep_hours between 0 and 24),
  hrv_ms          numeric(6,2),
  session_logged  boolean not null default false,
  session_type    session_type,
  session_rpe     numeric(3,1) check (session_rpe between 1 and 10),
  notes           text check (char_length(notes) <= 500),
  created_at      timestamptz not null default now(),

  constraint daily_logs_user_date_unique unique (user_id, log_date)
);

-- ============================================================
-- SESSION LOGS
-- One row per completed session. exercises stored as JSONB.
-- ============================================================

create table session_logs (
  id                            uuid primary key default uuid_generate_v4(),
  user_id                       uuid not null references auth.users(id) on delete cascade,
  session_date                  date not null,
  session_type                  session_type not null,
  session_rpe                   numeric(3,1) check (session_rpe between 1 and 10),
  gate_at_time                  gate_colour not null default 'green',
  duration_minutes              smallint check (duration_minutes between 1 and 300),
  mesocycle_week                smallint check (mesocycle_week between 1 and 4),
  cycle_number                  smallint,
  exercises                     jsonb not null default '[]',
  -- exercises schema:
  -- [{ name, pattern, tier, substitute_used, substitute_name, substitute_reason,
  --    sets: [{ set_number, load_kg, reps_completed, rir_reported, rpe_reported }] }]
  cardio                        jsonb,
  -- cardio schema:
  -- { type, duration_minutes, avg_hr_bpm, max_hr_bpm, distance_km, modality }
  mobility                      jsonb,
  -- mobility schema:
  -- { area_trained, session_duration_minutes, embedded, subjective_quality }
  notes                         text check (char_length(notes) <= 500),
  created_at                    timestamptz not null default now()
);

-- ============================================================
-- WEEKLY REPORTS
-- One row per week per user. Written by the engine + AI.
-- ============================================================

create table weekly_reports (
  id                  uuid primary key default uuid_generate_v4(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  week_ending         date not null,
  week_starting       date not null,
  cycle_number        smallint,
  mesocycle_week      smallint check (mesocycle_week between 1 and 4),

  -- Pillar scores
  strength_score      numeric(5,2) check (strength_score between 0 and 100),
  skill_score         numeric(5,2) check (skill_score between 0 and 100),
  cardio_score        numeric(5,2) check (cardio_score between 0 and 100),
  mobility_score      numeric(5,2) check (mobility_score between 0 and 100),

  -- Recovery
  gate_colour         gate_colour not null,
  days_trained        smallint,

  -- AI output
  coaching_report     text,                    -- 150-200 word coaching report
  report_generated_at timestamptz,

  -- Next week program — full session plan as JSONB
  program             jsonb not null default '{}',
  -- program schema:
  -- { days: [{ date, session_type, session_template, exercises: [...] }] }

  -- Status flags
  report_generation_failed boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint weekly_reports_user_week_unique unique (user_id, week_ending)
);

-- ============================================================
-- ENGINE DECISIONS
-- One row per weekly run per user. Written by the engine,
-- read by the AI when generating the coaching report.
-- ============================================================

create table engine_decisions (
  id                  uuid primary key default uuid_generate_v4(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  week_ending         date not null,
  mesocycle_week      smallint,
  recovery_gate       gate_colour not null,
  days_programmed     smallint,
  deload_triggered    boolean not null default false,

  volume_changes      jsonb not null default '[]',
  -- [{ muscle_group, previous_target_sets, new_target_sets, reason }]

  load_changes        jsonb not null default '[]',
  -- [{ movement, previous_load_kg, new_load_kg, reason }]

  ladder_changes      jsonb not null default '[]',
  -- [{ ladder, change, from_rung, to_rung, reason }]

  flags               text[] not null default '{}',
  -- plain-language flags for the AI coaching report

  created_at          timestamptz not null default now(),

  constraint engine_decisions_user_week_unique unique (user_id, week_ending)
);

-- ============================================================
-- INDEXES
-- Targeting the most common query patterns.
-- ============================================================

-- Daily logs: fetch by user + date range (recovery gate, 7-day window)
create index idx_daily_logs_user_date
  on daily_logs (user_id, log_date desc);

-- Session logs: fetch by user + date range (weekly summaries, progress charts)
create index idx_session_logs_user_date
  on session_logs (user_id, session_date desc);

-- Volume state: fetch current week by user
create index idx_volume_state_user_week
  on volume_state (user_id, week_starting desc);

-- Cardio state: fetch current week by user
create index idx_cardio_state_user_week
  on cardio_state (user_id, week_starting desc);

-- Mobility state: fetch current week by user
create index idx_mobility_state_user_week
  on mobility_state (user_id, week_starting desc);

-- Weekly reports: fetch most recent by user (Today tab + Progress tab)
create index idx_weekly_reports_user_week
  on weekly_reports (user_id, week_ending desc);

-- Engine decisions: fetch most recent by user
create index idx_engine_decisions_user_week
  on engine_decisions (user_id, week_ending desc);

-- Strength state: fetch all movements for a user
create index idx_strength_state_user
  on strength_state (user_id);

-- ============================================================
-- UPDATED_AT TRIGGER
-- Auto-updates updated_at on any row update.
-- ============================================================

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger athlete_profiles_updated_at
  before update on athlete_profiles
  for each row execute function update_updated_at();

create trigger mesocycle_state_updated_at
  before update on mesocycle_state
  for each row execute function update_updated_at();

create trigger strength_state_updated_at
  before update on strength_state
  for each row execute function update_updated_at();

create trigger volume_state_updated_at
  before update on volume_state
  for each row execute function update_updated_at();

create trigger skill_state_updated_at
  before update on skill_state
  for each row execute function update_updated_at();

create trigger cardio_state_updated_at
  before update on cardio_state
  for each row execute function update_updated_at();

create trigger mobility_state_updated_at
  before update on mobility_state
  for each row execute function update_updated_at();

create trigger recovery_state_updated_at
  before update on recovery_state
  for each row execute function update_updated_at();

create trigger weekly_reports_updated_at
  before update on weekly_reports
  for each row execute function update_updated_at();

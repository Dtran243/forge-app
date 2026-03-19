-- ============================================================
-- FORGE — Row Level Security Policies
-- Migration: 002_rls_policies.sql
-- Run after 001_initial_schema.sql
-- ============================================================

-- ============================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================

alter table athlete_profiles   enable row level security;
alter table mesocycle_state    enable row level security;
alter table strength_state     enable row level security;
alter table volume_state       enable row level security;
alter table skill_state        enable row level security;
alter table cardio_state       enable row level security;
alter table mobility_state     enable row level security;
alter table recovery_state     enable row level security;
alter table daily_logs         enable row level security;
alter table session_logs       enable row level security;
alter table weekly_reports     enable row level security;
alter table engine_decisions   enable row level security;

-- ============================================================
-- ATHLETE PROFILES
-- ============================================================

-- Users can only read their own profile
create policy "athlete_profiles_select_own"
  on athlete_profiles for select
  using (auth.uid() = user_id);

-- Users can only insert their own profile
create policy "athlete_profiles_insert_own"
  on athlete_profiles for insert
  with check (auth.uid() = user_id);

-- Users can only update their own profile
create policy "athlete_profiles_update_own"
  on athlete_profiles for update
  using (auth.uid() = user_id);

-- ============================================================
-- MESOCYCLE STATE
-- ============================================================

create policy "mesocycle_state_select_own"
  on mesocycle_state for select
  using (auth.uid() = user_id);

create policy "mesocycle_state_insert_own"
  on mesocycle_state for insert
  with check (auth.uid() = user_id);

create policy "mesocycle_state_update_own"
  on mesocycle_state for update
  using (auth.uid() = user_id);

-- ============================================================
-- STRENGTH STATE
-- ============================================================

create policy "strength_state_select_own"
  on strength_state for select
  using (auth.uid() = user_id);

create policy "strength_state_insert_own"
  on strength_state for insert
  with check (auth.uid() = user_id);

create policy "strength_state_update_own"
  on strength_state for update
  using (auth.uid() = user_id);

-- ============================================================
-- VOLUME STATE
-- ============================================================

create policy "volume_state_select_own"
  on volume_state for select
  using (auth.uid() = user_id);

create policy "volume_state_insert_own"
  on volume_state for insert
  with check (auth.uid() = user_id);

create policy "volume_state_update_own"
  on volume_state for update
  using (auth.uid() = user_id);

-- ============================================================
-- SKILL STATE
-- ============================================================

create policy "skill_state_select_own"
  on skill_state for select
  using (auth.uid() = user_id);

create policy "skill_state_insert_own"
  on skill_state for insert
  with check (auth.uid() = user_id);

create policy "skill_state_update_own"
  on skill_state for update
  using (auth.uid() = user_id);

-- ============================================================
-- CARDIO STATE
-- ============================================================

create policy "cardio_state_select_own"
  on cardio_state for select
  using (auth.uid() = user_id);

create policy "cardio_state_insert_own"
  on cardio_state for insert
  with check (auth.uid() = user_id);

create policy "cardio_state_update_own"
  on cardio_state for update
  using (auth.uid() = user_id);

-- ============================================================
-- MOBILITY STATE
-- ============================================================

create policy "mobility_state_select_own"
  on mobility_state for select
  using (auth.uid() = user_id);

create policy "mobility_state_insert_own"
  on mobility_state for insert
  with check (auth.uid() = user_id);

create policy "mobility_state_update_own"
  on mobility_state for update
  using (auth.uid() = user_id);

-- ============================================================
-- RECOVERY STATE
-- ============================================================

create policy "recovery_state_select_own"
  on recovery_state for select
  using (auth.uid() = user_id);

create policy "recovery_state_insert_own"
  on recovery_state for insert
  with check (auth.uid() = user_id);

create policy "recovery_state_update_own"
  on recovery_state for update
  using (auth.uid() = user_id);

-- ============================================================
-- DAILY LOGS
-- ============================================================

create policy "daily_logs_select_own"
  on daily_logs for select
  using (auth.uid() = user_id);

create policy "daily_logs_insert_own"
  on daily_logs for insert
  with check (auth.uid() = user_id);

create policy "daily_logs_update_own"
  on daily_logs for update
  using (auth.uid() = user_id);

-- ============================================================
-- SESSION LOGS
-- ============================================================

create policy "session_logs_select_own"
  on session_logs for select
  using (auth.uid() = user_id);

create policy "session_logs_insert_own"
  on session_logs for insert
  with check (auth.uid() = user_id);

-- Session logs are append-only from the client
-- Updates only allowed from Edge Functions (service role bypasses RLS)

-- ============================================================
-- WEEKLY REPORTS
-- ============================================================

create policy "weekly_reports_select_own"
  on weekly_reports for select
  using (auth.uid() = user_id);

-- Reports are written by Edge Functions only (service role)
-- No client insert/update policies — prevents tampering

-- ============================================================
-- ENGINE DECISIONS
-- ============================================================

create policy "engine_decisions_select_own"
  on engine_decisions for select
  using (auth.uid() = user_id);

-- Engine decisions are written by Edge Functions only (service role)
-- No client insert/update policies

-- ============================================================
-- SERVICE ROLE NOTE
-- ============================================================
-- Supabase Edge Functions use the service role key which bypasses
-- RLS entirely. This is intentional — the engine needs unrestricted
-- write access to update state across multiple tables in a single run.
--
-- The service role key must NEVER be exposed to the client.
-- All Edge Function calls from the client are authenticated via
-- the user's JWT — the function validates auth.uid() before
-- processing any request.
--
-- Edge Functions that write to state should always validate:
--   1. The requesting user's JWT is valid
--   2. All writes target rows where user_id = requesting user's id
--   3. No cross-user data is ever read or written

-- ============================================================
-- HELPER FUNCTIONS
-- Available to both client and Edge Functions
-- ============================================================

-- Get the current week's Monday date (week_starting reference)
create or replace function get_week_starting(for_date date default current_date)
returns date as $$
begin
  -- Returns the Monday of the week containing for_date
  return for_date - extract(isodow from for_date)::int + 1;
end;
$$ language plpgsql immutable;

-- Get the current week's Sunday date (week_ending reference)
create or replace function get_week_ending(for_date date default current_date)
returns date as $$
begin
  return get_week_starting(for_date) + 6;
end;
$$ language plpgsql immutable;

-- Check if a date is within the athlete's current active week
create or replace function is_current_week(check_date date)
returns boolean as $$
begin
  return check_date between get_week_starting() and get_week_ending();
end;
$$ language plpgsql immutable;

-- ============================================================
-- ONBOARDING HELPER
-- Creates all required state rows for a new user in one call.
-- Called by the onboarding Edge Function after profile creation.
-- ============================================================

create or replace function initialise_athlete_state(p_user_id uuid)
returns void as $$
declare
  v_week_start date := get_week_starting();
  v_muscle muscle_group;
  v_ladder ladder_name;
begin
  -- Mesocycle state
  insert into mesocycle_state (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  -- Recovery state
  insert into recovery_state (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  -- Volume state — one row per muscle group for the current week
  foreach v_muscle in array enum_range(null::muscle_group) loop
    insert into volume_state (user_id, week_starting, muscle_group, target_sets, actual_sets)
    values (p_user_id, v_week_start, v_muscle, null, 0)
    on conflict (user_id, week_starting, muscle_group) do nothing;
  end loop;

  -- Cardio state for current week
  insert into cardio_state (user_id, week_starting)
  values (p_user_id, v_week_start)
  on conflict (user_id, week_starting) do nothing;

  -- Mobility state for current week
  insert into mobility_state (user_id, week_starting)
  values (p_user_id, v_week_start)
  on conflict (user_id, week_starting) do nothing;

  -- Skill state — one row per ladder with default rung 1 values
  insert into skill_state (user_id, ladder, current_rung, current_movement, current_standard)
  values
    (p_user_id, 'push_ladder', 1, 'Incline push-up', '3x12 RIR2'),
    (p_user_id, 'pull_ladder', 1, 'Band-assisted pull-up', '3x10 RIR2'),
    (p_user_id, 'core_ladder', 1, 'Hollow body hold', '3x30s'),
    (p_user_id, 'squat_ladder', 1, 'Assisted pistol squat', '3x8 each RIR2')
  on conflict (user_id, ladder) do nothing;

end;
$$ language plpgsql security definer;

-- ============================================================
-- GRANT PERMISSIONS
-- Allow authenticated users to call helper functions
-- ============================================================

grant execute on function get_week_starting(date) to authenticated;
grant execute on function get_week_ending(date) to authenticated;
grant execute on function is_current_week(date) to authenticated;
-- initialise_athlete_state is security definer and called from Edge Functions only

-- 001_weekly_engine_cron.sql
--
-- Sets up the Sunday weekly engine cron job.
--
-- Prerequisites:
--   1. pg_net is enabled (enabled by default on all Supabase projects)
--   2. pg_cron is enabled — Dashboard → Database → Extensions → pg_cron
--
-- Before running this migration, store the service role key in the vault:
--
--   select vault.create_secret(
--     'SUPABASE_SERVICE_ROLE_KEY',
--     '<your service role key from Dashboard → Settings → API>'
--   );
--
-- Run this migration once in the Supabase SQL editor.

-- ── Enable required extensions ────────────────────────────────────────────────
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net  with schema extensions;

-- ── Scheduling function ────────────────────────────────────────────────────────

create or replace function public.trigger_weekly_engine_run()
returns void
language plpgsql
security definer
as $$
declare
  v_user      record;
  v_url       text;
  v_svc_key   text;
begin
  -- Resolve the Edge Function URL from the Supabase project URL
  v_url := current_setting('supabase_functions.url', true);
  if v_url is null or v_url = '' then
    -- Fallback: construct from project ref
    v_url := 'https://kaczfvjpjuphlimfugqf.supabase.co/functions/v1/engine-run';
  else
    v_url := v_url || '/engine-run';
  end if;

  -- Read the service role key from vault
  select decrypted_secret
  into   v_svc_key
  from   vault.decrypted_secrets
  where  name = 'SUPABASE_SERVICE_ROLE_KEY'
  limit  1;

  if v_svc_key is null then
    raise exception 'SUPABASE_SERVICE_ROLE_KEY not found in vault. Run vault.create_secret() first.';
  end if;

  -- Fire one HTTP POST per onboarded user
  for v_user in
    select user_id
    from   athlete_profiles
    where  onboarding_complete = true
  loop
    perform net.http_post(
      url     := v_url,
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || v_svc_key
      ),
      body              := jsonb_build_object('user_id', v_user.user_id),
      timeout_milliseconds := 55000
    );
  end loop;
end;
$$;

-- ── Schedule: every Sunday at 23:00 UTC ───────────────────────────────────────
-- Remove any existing job with this name before re-scheduling (idempotent).
do $$
begin
  perform cron.unschedule('weekly-engine-run');
exception when others then null;
end;
$$;

select cron.schedule(
  'weekly-engine-run',
  '0 23 * * 0',          -- 23:00 UTC every Sunday
  'select public.trigger_weekly_engine_run()'
);

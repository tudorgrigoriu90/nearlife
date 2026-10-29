-- 0016 — retention: the daily job that applies the privacy policy's windows (T-094).
--
-- The privacy policy (docs/legal/PRIVACY-POLICY.md) promises that inactive anonymous accounts are
-- deleted and that data is not kept forever. Until now nothing deleted anything. The windows are
-- lib/retention.ts's, pinned here by pipeline/tests/test_retention_job.py.
--
-- What is deleted, and why only this:
--   * notification_log rows older than 30 days. The sender's caps read 48 h. Older rows are a
--     history of which species each user was sent, with no operational use.
--   * ANONYMOUS accounts with no activity for 90 days. They are deleted with everything they own
--     (profiles, collection, push_devices, notification_log cascade from auth.users). Nobody can
--     recover an anonymous account anyway: its only key is a token on one device. Accounts with a
--     linked email are never touched here. The person chose to keep those, and only deletion
--     from Settings (T-093) removes them.
--   * Runtime location is never stored server-side (T-091: H3 cells, device only), and analytics
--     retention is a PostHog project setting, so neither has rows here.
--
-- "Activity" is the LATEST of every signal, because one alone is wrong. last_sign_in_at does not
-- move when the app refreshes its token, so a daily user would look 90 days inactive and be
-- deleted. Any sign of life (sign-in, session refresh, refresh-token rotation, a collection write,
-- a push-device re-registration) keeps the account. When in doubt the job keeps it: a deletion
-- cannot be undone, and a kept account only costs a row.

create or replace function public.apply_retention(now_at timestamptz default now())
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  logs_deleted  integer;
  users_deleted integer;
begin
  delete from public.notification_log
   where sent_at < now_at - interval '30 days'  -- notificationLogDays
  ;
  get diagnostics logs_deleted = row_count;

  with activity as (
    select u.id,
           greatest(
             u.created_at,
             u.last_sign_in_at,
             u.updated_at,
             (select max(greatest(s.updated_at, s.refreshed_at at time zone 'UTC', s.created_at))
                from auth.sessions s where s.user_id = u.id),
             (select max(greatest(r.updated_at, r.created_at))
                from auth.refresh_tokens r where r.user_id = u.id::text),
             (select max(greatest(c.created_at, c.spotted_at, c.caught_at, c.helped_at))
                from public.collection c where c.user_id = u.id),
             (select max(d.updated_at) from public.push_devices d where d.user_id = u.id)
           ) as last_active
      from auth.users u
     where u.is_anonymous
  )
  delete from auth.users u
   using activity a
   where a.id = u.id
     and a.last_active < now_at - interval '90 days'  -- inactiveAnonymousUserDays
  ;
  get diagnostics users_deleted = row_count;

  return jsonb_build_object(
    'notification_log_deleted', logs_deleted,
    'anonymous_users_deleted', users_deleted
  );
end;
$$;

revoke all on function public.apply_retention(timestamptz) from public, anon, authenticated;

-- Daily at 03:41 UTC: off-peak for Sweden, and off the hour so it misses the top-of-hour rush.
-- cron.schedule upserts by job name, so re-running this is safe.
select cron.schedule('apply-retention', '41 3 * * *', $cron$ select public.apply_retention(); $cron$);

-- Verify after applying: db-migrate.yml mode=verify (pipeline/db/verify.py, rolled back), and
--   select jobname, schedule from cron.job;   -- apply-retention, 41 3 * * *

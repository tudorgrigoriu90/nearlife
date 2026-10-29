-- 0019 — the retention job never expires an account that owns a purchase (T-094 × T-217).
--
-- T-094 deletes anonymous accounts idle for 90 days. Since T-217, an anonymous account can hold a
-- purchase, and deleting it would drop a paid entitlement and, for a Family owner, every member's
-- unlock. The store would still hold the purchase, but the person would have to find "Restore"
-- to get it back. A paying customer is kept however long they are away; only their
-- notification history still expires.
--
-- Same function as 20261029000004 with one added condition. The windows stay pinned to
-- lib/retention.ts by pipeline/tests/test_retention_job.py, which now reads this file.

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
     -- Never expire a customer: an account holding a purchase is kept however long it is idle.
     and not exists (select 1 from public.entitlements e where e.user_id = u.id and e.active)
  ;
  get diagnostics users_deleted = row_count;

  return jsonb_build_object(
    'notification_log_deleted', logs_deleted,
    'anonymous_users_deleted', users_deleted
  );
end;
$$;

revoke all on function public.apply_retention(timestamptz) from public, anon, authenticated;

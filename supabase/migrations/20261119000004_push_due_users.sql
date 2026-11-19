-- 0041 — the users due a notification this run, chosen in SQL (T-316 · review B-51).
--
-- The sender read every opted-in user's devices, profile, whole collection and two days of the
-- send log every hour, then matched rows to users in memory, though most users are not due in a
-- given hour (their slot is later, or they already had today's notification). This returns only
-- the due users, with what the planner needs aggregated: work grows with the users due, not with
-- everyone opted in. The species choice stays in the tested TypeScript (lib/pushDispatch.ts).
--
-- "Due" mirrors lib/cadence.ts and lib/sendSlot.ts: the Stockholm hour is a waking hour, the
-- user's slot has arrived (at-or-after, so a missed run heals later the same day), and no send
-- today (Stockholm) or within `min_interval_hours`. The waking hours come from the caller
-- (allowedHours() in TS), so quiet hours are defined once. The slot hash must equal preferredHour:
-- pipeline/tests/fixtures/send_slots.json pins both sides.

-- FNV-1a over the id's characters, 32-bit, as lib/sendSlot.ts hash().
create or replace function public.push_slot_hour(user_id text, allowed_hours integer[])
returns integer
language plpgsql
immutable
set search_path = ''
as $$
declare
  h bigint := 2166136261;
  i integer;
begin
  if coalesce(array_length(allowed_hours, 1), 0) = 0 then
    return null;
  end if;
  for i in 1 .. length(user_id) loop
    h := h # ascii(substr(user_id, i, 1));
    h := (h * 16777619) & 4294967295;
  end loop;
  return allowed_hours[(h % array_length(allowed_hours, 1)) + 1];
end;
$$;

create or replace function public.push_due_users(
  at timestamptz,
  allowed_hours integer[],
  min_interval_hours integer,
  only_user uuid default null,
  ignore_slot boolean default false
)
returns table (
  user_id uuid,
  home_region text,
  devices jsonb,
  collected text[],
  sent_at timestamptz[]
)
language sql
stable
security definer
set search_path = ''
as $$
  with clock as (
    select (at at time zone 'Europe/Stockholm')::date as today,
           extract(hour from at at time zone 'Europe/Stockholm')::integer as hour
  ),
  candidates as (
    select distinct d.user_id
      from public.push_devices d
     where only_user is null or d.user_id = only_user
  ),
  due as (
    select c.user_id
      from candidates c, clock
     where clock.hour = any (allowed_hours)
       and (
         ignore_slot
         or array_position(allowed_hours, clock.hour)
            >= array_position(allowed_hours, public.push_slot_hour(c.user_id::text, allowed_hours))
       )
       -- The smoke test (only_user + ignore_slot) also skips the caps, as the sender always did.
       and (ignore_slot or not exists (
         select 1 from public.notification_log l
          where l.user_id = c.user_id
            and ((l.sent_at at time zone 'Europe/Stockholm')::date = clock.today
                 or l.sent_at > at - make_interval(hours => min_interval_hours))
       ))
  )
  select
    u.user_id,
    p.home_region,
    (select jsonb_agg(jsonb_build_object(
              'token', d.token, 'platform', d.platform, 'locale', d.locale,
              'updated_at', d.updated_at) order by d.token)
       from public.push_devices d where d.user_id = u.user_id),
    coalesce((select array_agg(c.species_id order by c.species_id)
                from public.collection c where c.user_id = u.user_id), '{}'),
    coalesce((select array_agg(l.sent_at order by l.sent_at)
                from public.notification_log l
               where l.user_id = u.user_id and l.sent_at > at - interval '48 hours'), '{}')
  from due u
  left join public.profiles p on p.user_id = u.user_id
$$;

revoke all on function public.push_slot_hour(text, integer[]) from public, anon, authenticated;
revoke all on function public.push_due_users(timestamptz, integer[], integer, uuid, boolean)
  from public, anon, authenticated;

create index if not exists notification_log_user_sent_idx
  on public.notification_log (user_id, sent_at);

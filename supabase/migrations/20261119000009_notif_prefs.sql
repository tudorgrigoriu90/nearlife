-- 0046 — notification choices (T-341 · review F-03, USER-FLOWS §9).
--
-- `profiles.notif_prefs`: {frequency, window, groups}, each optional; '{}' is today's behaviour
-- (daily, any waking hour, every group). The owner writes it; the check keeps out anything the
-- sender would not understand. push_due_users applies the window and the frequency; the species
-- groups are applied by the sender's choice (lib/notifPrefs.ts). The numbers here are the same as
-- lib/notifPrefs.ts (__tests__/notifPrefsParity.test.js). Quiet hours 21–08 do not move: a window
-- only narrows the waking hours the sender passes in. Consent stays the master switch: a user with
-- no registered device is never a candidate.

create or replace function public.notif_prefs_valid(p jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(p) = 'object'
    and not exists (select 1 from jsonb_object_keys(p) k where k not in ('frequency', 'window', 'groups'))
    and (not p ? 'frequency' or p->>'frequency' in ('daily', 'everyOtherDay', 'weekly'))
    and (not p ? 'window' or jsonb_typeof(p->'window') = 'null' or p->>'window' in ('morning', 'midday', 'evening'))
    and (not p ? 'groups' or jsonb_typeof(p->'groups') = 'null' or (
      jsonb_typeof(p->'groups') = 'array'
      and jsonb_array_length(p->'groups') > 0
      and not exists (
        select 1 from jsonb_array_elements(p->'groups') g
         where jsonb_typeof(g) <> 'string' or g #>> '{}' not in ('bird', 'mammal', 'insect', 'plant', 'other')
      )
    ))
$$;

alter table public.profiles add column if not exists notif_prefs jsonb not null default '{}'::jsonb;
alter table public.profiles drop constraint if exists profiles_notif_prefs_valid;
alter table public.profiles add constraint profiles_notif_prefs_valid check (public.notif_prefs_valid(notif_prefs));

-- The owner may write their choices (and, as before, only the home county besides).
grant insert (user_id, home_region, notif_prefs) on public.profiles to authenticated;
grant update (user_id, home_region, notif_prefs) on public.profiles to authenticated;

-- push_due_users gains each user's window and gap, returns their choices for the species filter,
-- and seven days of sends (a weekly user's last one can be up to 164 hours back).
drop function if exists public.push_due_users(timestamptz, integer[], integer, uuid, boolean);

create function public.push_due_users(
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
  sent_at timestamptz[],
  prefs jsonb
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
  choice as (
    select c.user_id,
           coalesce(p.notif_prefs, '{}'::jsonb) as prefs,
           -- The window inside the waking hours, in send order (lib/notifPrefs.ts WINDOW_HOURS).
           case p.notif_prefs->>'window'
             when 'morning' then array(select h from unnest(allowed_hours) with ordinality w(h, o)
                                        where h = any ('{8,9,10}'::integer[]) order by o)
             when 'midday'  then array(select h from unnest(allowed_hours) with ordinality w(h, o)
                                        where h = any ('{11,12,13,14}'::integer[]) order by o)
             when 'evening' then array(select h from unnest(allowed_hours) with ordinality w(h, o)
                                        where h = any ('{15,16,17,18,19,20}'::integer[]) order by o)
             else allowed_hours
           end as hours,
           -- Hours between sends (lib/notifPrefs.ts MIN_INTERVAL_HOURS); daily is the caller's.
           case p.notif_prefs->>'frequency'
             when 'everyOtherDay' then 44
             when 'weekly' then 164
             else min_interval_hours
           end as gap
      from candidates c
      left join public.profiles p on p.user_id = c.user_id
  ),
  due as (
    select ch.user_id, ch.prefs
      from choice ch, clock
     -- The smoke test (only_user + ignore_slot) skips the window and the caps, as before.
     where clock.hour = any (case when ignore_slot then allowed_hours else ch.hours end)
       and (
         ignore_slot
         or array_position(ch.hours, clock.hour)
            >= array_position(ch.hours, public.push_slot_hour(ch.user_id::text, ch.hours))
       )
       and (ignore_slot or not exists (
         select 1 from public.notification_log l
          where l.user_id = ch.user_id
            and ((l.sent_at at time zone 'Europe/Stockholm')::date = clock.today
                 or l.sent_at > at - make_interval(hours => ch.gap))
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
               where l.user_id = u.user_id and l.sent_at > at - interval '7 days'), '{}'),
    u.prefs
  from due u
  left join public.profiles p on p.user_id = u.user_id
$$;

revoke all on function public.push_due_users(timestamptz, integer[], integer, uuid, boolean)
  from public, anon, authenticated;
-- notif_prefs_valid stays callable: the check runs it as the writing user, and it reads nothing.

-- Verify after applying: db-migrate.yml mode=verify (pipeline/db/verify.py, rolled back).

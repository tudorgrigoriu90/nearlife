-- 0013 — free catches enforced by the database, not the app (T-200 · TSD §5b · CLAUDE.md T-075).
--
-- CLAUDE.md lists free-catch enforcement as server-side and security-critical. It was not: the
-- count lived in React state on the phone (reset by every restart) and nothing on the server knew.
-- This makes the rule true where it cannot be edited — the moment a species becomes *caught* in
-- `collection`, a trigger counts it against the user's season and refuses the 4th.
--
-- Why a trigger rather than an Edge Function: catches are written straight to `collection` under
-- RLS (offline outbox, T-165). A function in front would only be a second door; the trigger sits
-- on the only door there is.
--
-- The season comes from the SERVER clock (Stockholm wall time), never from the client's
-- `caught_at`: a backdated timestamp would otherwise spend an old season's allowance. A catch made
-- offline at the end of a season and synced in the next counts in the next — the honest reading
-- of "when the server learned of it".

-- ── entitlement ─────────────────────────────────────────────────────────────
-- Set only by the server (the purchase flow, T-074/RevenueCat webhook, is not built yet). Users
-- cannot write it: see the column grants below.
alter table public.profiles add column if not exists full_game boolean not null default false;

-- ── season key, identical to lib/season.ts seasonKeyOf ──────────────────────
-- Meteorological seasons; December belongs to the next year's winter ("2027-winter").
create or replace function public.season_key(at timestamptz)
returns text
language sql
stable
set search_path = ''
as $$
  select
    (extract(year from l)::int + case when extract(month from l) = 12 then 1 else 0 end)::text
    || '-' ||
    case
      when extract(month from l) in (12, 1, 2) then 'winter'
      when extract(month from l) in (3, 4, 5) then 'spring'
      when extract(month from l) in (6, 7, 8) then 'summer'
      else 'autumn'
    end
  from (select at at time zone 'Europe/Stockholm' as l) as local_time
$$;

-- ── the rule ────────────────────────────────────────────────────────────────
-- 3 = FREE_CATCHES_PER_SEASON in lib/freeCatch.ts (a pipeline test keeps the two equal).
-- SECURITY DEFINER because it must write counters the user is not allowed to write. The profile
-- row is locked FOR UPDATE, so two catches syncing at once cannot both read "2 used".
create or replace function public.enforce_free_catch()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_season text := public.season_key(now());
  used integer;
  counted_season text;
  owns_full_game boolean;
begin
  -- What counts is a NEW catch: a row becoming caught, or a species caught in an earlier season
  -- caught again. Re-saving an unchanged row (a PostgREST upsert resends every column, e.g. when
  -- the user pledges help) and re-catching within the same season are free. This mirrors the app,
  -- which counts this season's catches in the collection (lib/freeCatch.ts freeCatchStateFrom).
  if new.caught_at is null then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.caught_at is not null then
    if new.caught_at is not distinct from old.caught_at
       or public.season_key(old.caught_at) = current_season then
      return new;
    end if;
  end if;

  insert into public.profiles (user_id) values (new.user_id) on conflict (user_id) do nothing;
  select p.free_catches_used, p.free_catch_season, p.full_game
    into used, counted_season, owns_full_game
    from public.profiles p
   where p.user_id = new.user_id
     for update;

  if owns_full_game then
    return new;
  end if;
  if counted_season is distinct from current_season then
    used := 0;
  end if;
  if used >= 3 then
    raise exception 'free_catch_limit'
      using errcode = 'P0001', hint = 'The free catches for this season are used up.';
  end if;

  update public.profiles
     set free_catches_used = used + 1, free_catch_season = current_season
   where user_id = new.user_id;
  return new;
end
$$;

revoke all on function public.enforce_free_catch() from public, anon, authenticated;

drop trigger if exists collection_enforce_free_catch on public.collection;
create trigger collection_enforce_free_catch
  before insert or update of caught_at on public.collection
  for each row execute function public.enforce_free_catch();

-- ── users may only write their region ───────────────────────────────────────
-- RLS limits a user to their own row; it does not limit *which columns* they write. Without this
-- anyone could reset free_catches_used or set full_game from the client. `user_id` stays writable
-- because a PostgREST upsert sets the conflict column too — RLS's `with check` still pins it to
-- auth.uid().
revoke insert, update on public.profiles from anon, authenticated;
grant insert (user_id, home_region) on public.profiles to authenticated;
grant update (user_id, home_region) on public.profiles to authenticated;

-- Verify after applying:
--   select public.season_key('2026-12-15'::timestamptz);   -- 2027-winter
--   select public.season_key('2026-11-30 23:30+00');        -- 2026-winter (00:30 1 Dec in Sweden)
--   select tgname from pg_trigger where tgname = 'collection_enforce_free_catch';

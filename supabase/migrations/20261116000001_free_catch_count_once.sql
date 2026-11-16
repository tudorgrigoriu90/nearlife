-- 0032 — a free catch is counted once (T-266 · review B-01).
--
-- The app writes every collection change as a PostgREST upsert (INSERT … ON CONFLICT DO UPDATE).
-- Postgres fires the BEFORE INSERT row trigger for that statement even when the row exists, and
-- then BEFORE UPDATE on the conflict. 0013 counted a catch in the INSERT firing whenever caught_at
-- was set, so spot-then-catch cost 2 of the 3 free catches, a help pledge on a caught species cost
-- 1, and the next real catch was refused.
--
-- Now the INSERT firing counts only a row that does not exist yet; for an existing row it lets the
-- UPDATE firing decide, where `old` is known. The existence check runs after the profile row is
-- locked, so two upserts of the same new species racing each other see each other's row and the
-- second costs nothing.

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
  -- caught again. Re-saving an unchanged row and re-catching within the same season are free.
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

  -- An upsert of an existing row: its UPDATE firing, which sees `old`, decides.
  if tg_op = 'INSERT' and exists (
    select 1 from public.collection c
     where c.user_id = new.user_id and c.species_id = new.species_id
  ) then
    return new;
  end if;

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

-- Repair the counters the double count inflated: this season's count is the number of species the
-- user has caught this season (at most 3, the most the trigger ever let through).
update public.profiles p
   set free_catches_used = least(3, coalesce((
         select count(*) from public.collection c
          where c.user_id = p.user_id
            and c.caught_at is not null
            and public.season_key(c.caught_at) = public.season_key(now())
       ), 0))
 where p.free_catch_season = public.season_key(now());

-- Verify after applying (pipeline/db/verify.py runs the upsert-shaped checks):
--   select count(*) from public.profiles where free_catches_used > 3;   -- 0

-- 0048 — move home county once a year (T-349 · review F-09).
--
-- The home county was changeable only by deleting the account. It may now change once per 365
-- days: the first county is set freely (onboarding), a change records when it happened, and a
-- second change within the year is refused. The date is the server's, in a column no client may
-- write, so clearing the phone does not reset it. The collection is untouched by a move. Re-sending
-- the same county (push registration does) is not a move.

alter table public.profiles add column if not exists home_region_moved_at timestamptz;

create or replace function public.home_region_move_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.home_region is not null and new.home_region is distinct from old.home_region then
    if old.home_region_moved_at is not null and old.home_region_moved_at > now() - interval '365 days' then
      raise exception 'home_move_limit'
        using detail = (old.home_region_moved_at + interval '365 days')::date::text;
    end if;
    new.home_region_moved_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_home_region_move on public.profiles;
create trigger profiles_home_region_move
  before update of home_region on public.profiles
  for each row execute function public.home_region_move_guard();

-- home_region_moved_at is deliberately absent from the column grants (0046 lists the writable ones).

-- Verify after applying: db-migrate.yml mode=verify (pipeline/db/verify.py, rolled back).

-- 0042 — the species data version without a shared lock (T-317).
--
-- 0035 bumped the version by updating one row after every write statement on a species table.
-- The row lock is held until the writer commits, so a long writer (the facts backfill commits per
-- language, minutes apart) made every other writer wait: the photo run hit the statement timeout
-- behind it. Each statement now inserts its own row instead; inserts never wait for each other.
--
-- The version must change when data commits, not before (else a phone could cache old data under
-- a new version and keep it). A bump row becomes visible at its transaction's commit, so the version
-- is the number of rows plus the largest id: a transaction that commits after a later one still adds
-- a row and changes the count. A rolled-back write leaves no row. A daily job prunes to one row,
-- which changes the version once a day (one extra county refresh per phone per day, harmless).

create table if not exists public.species_data_bumps (
  id bigint generated always as identity primary key,
  at timestamptz not null default now()
);
insert into public.species_data_bumps default values;

alter table public.species_data_bumps enable row level security;
revoke all on public.species_data_bumps from public, anon, authenticated;

create or replace function public.bump_species_data_version()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.species_data_bumps default values;
  return null;
end;
$$;
revoke all on function public.bump_species_data_version() from public, anon, authenticated;

create or replace function public.data_version()
returns text
language sql
stable
security definer
set search_path = ''
as $$ select count(*)::text || '.' || coalesce(max(id), 0)::text from public.species_data_bumps $$;
revoke all on function public.data_version() from public;
grant execute on function public.data_version() to anon, authenticated;

-- Keeps the newest row only. Never blocks a writer: it deletes committed rows below the maximum.
create or replace function public.prune_species_data_bumps()
returns void
language sql
security definer
set search_path = ''
as $$ delete from public.species_data_bumps where id < (select max(id) from public.species_data_bumps) $$;
revoke all on function public.prune_species_data_bumps() from public, anon, authenticated;

do $do$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('prune-species-data-bumps', '53 2 * * *',
                          $cron$ select public.prune_species_data_bumps() $cron$);
  end if;
end
$do$;

drop table if exists public.species_data_version;

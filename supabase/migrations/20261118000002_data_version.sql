-- 0035 — the species data version, for the phone's county cache (T-275 · review B-20).
--
-- The app keeps each county's presence and catalogue on the phone and asks only for this version
-- at launch; it downloads the county again only when the version changed. The version changes
-- whenever any table the county reads come from changes: a statement-level trigger on each bumps
-- it, so no loader, backfill or one-off fix can forget to.

create table if not exists public.species_data_version (
  id         smallint primary key default 1 check (id = 1),
  version    text not null,
  changed_at timestamptz not null default now()
);
insert into public.species_data_version (id, version) values (1, md5(now()::text))
on conflict (id) do nothing;

alter table public.species_data_version enable row level security;
revoke all on public.species_data_version from anon, authenticated;

create or replace function public.bump_species_data_version()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.species_data_version
     set version = md5(clock_timestamp()::text || random()::text), changed_at = now()
   where id = 1;
  return null;
end;
$$;
revoke all on function public.bump_species_data_version() from public, anon, authenticated;

do $$
declare
  t text;
begin
  foreach t in array array['species', 'species_presence', 'species_content', 'species_media', 'regions']
  loop
    execute format('drop trigger if exists bump_species_data_version on public.%I', t);
    execute format(
      'create trigger bump_species_data_version after insert or update or delete or truncate '
      'on public.%I for each statement execute function public.bump_species_data_version()', t);
  end loop;
end $$;

-- One tiny read for the app: the version text, nothing else.
create or replace function public.data_version()
returns text
language sql
stable
security definer
set search_path = ''
as $$ select version from public.species_data_version where id = 1 $$;
revoke all on function public.data_version() from public;
grant execute on function public.data_version() to anon, authenticated;

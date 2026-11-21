-- 0051 — duplicate species merged into GBIF's accepted key (T-373).
--
-- 19 scientific names were in the catalogue twice (2026-11-20) under different GBIF keys, one of
-- them often "doubtful" (Huperzia selago gbif:2688495 beside gbif:8190643): two cards for one
-- species, its records split between them. `merge_species(from, into)` folds one into the other
-- and records the pair in `species_aliases`, which the loader reads (pipeline/gbif/aliases.py) so
-- the next GBIF ingest does not split them again, and which a trigger uses to send a phone's write
-- for the old id to the new one.
--
-- A user who has both keeps one row. The row that holds a catch is kept and only re-pointed:
-- writing `caught_at` on the other would fire the free-catch trigger and spend a catch twice.

create table if not exists public.species_aliases (
  alias_id   text primary key references public.species (id) on delete cascade,
  species_id text not null references public.species (id) on delete cascade,
  merged_at  timestamptz not null default now(),
  check (alias_id <> species_id)
);

alter table public.species_aliases enable row level security;
drop policy if exists "species_aliases public read" on public.species_aliases;
create policy "species_aliases public read" on public.species_aliases for select using (true);
revoke insert, update, delete on public.species_aliases from anon, authenticated;

-- A write for a merged id lands on the species it became (an offline phone still holds old ids).
create or replace function public.redirect_species_alias()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target text;
begin
  select a.species_id into target from public.species_aliases a where a.alias_id = new.species_id;
  if target is not null then
    new.species_id := target;
  end if;
  return new;
end;
$$;
revoke all on function public.redirect_species_alias() from public, anon, authenticated;

drop trigger if exists collection_species_alias on public.collection;
create trigger collection_species_alias
  before insert or update of species_id on public.collection
  for each row execute function public.redirect_species_alias();

drop trigger if exists recognitions_species_alias on public.recognitions;
create trigger recognitions_species_alias
  before insert on public.recognitions
  for each row execute function public.redirect_species_alias();

create or replace function public.merge_species(p_from text, p_into text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  keep_id uuid;
  drop_id uuid;
begin
  if p_from = p_into then
    raise exception 'merge_species: % into itself', p_from;
  end if;
  if not exists (select 1 from public.species where id = p_into) then
    raise exception 'merge_species: unknown species %', p_into;
  end if;
  -- Anything already merged into p_from follows it to p_into.
  update public.species_aliases set species_id = p_into where species_id = p_from;
  insert into public.species_aliases (alias_id, species_id) values (p_from, p_into)
  on conflict (alias_id) do update set species_id = excluded.species_id, merged_at = now();

  -- Collections. A user with both: keep the row holding a catch (the earlier one), fill the other
  -- tiers from the second row, drop it, then re-point the kept row. `caught_at` is never written.
  for r in
    select f.id as from_id, i.id as into_id, f.caught_at as f_caught, i.caught_at as i_caught
      from public.collection f
      join public.collection i on i.user_id = f.user_id and i.species_id = p_into
     where f.species_id = p_from
  loop
    if r.f_caught is not null and (r.i_caught is null or r.f_caught < r.i_caught) then
      keep_id := r.from_id; drop_id := r.into_id;
    else
      keep_id := r.into_id; drop_id := r.from_id;
    end if;
    update public.collection k
       set spotted_at = least(k.spotted_at, d.spotted_at),
           helped_at = coalesce(k.helped_at, d.helped_at),
           helped_kind = case when k.helped_at is null then d.helped_kind else k.helped_kind end,
           helped_done_at = case when k.helped_at is null then d.helped_done_at else coalesce(k.helped_done_at, d.helped_done_at) end,
           prime_bonus = k.prime_bonus or (k.caught_at is null and d.prime_bonus)
      from public.collection d
     where k.id = keep_id and d.id = drop_id;
    delete from public.collection where id = drop_id;
  end loop;
  update public.collection set species_id = p_into where species_id = p_from;

  -- Recognitions: one per user and species.
  delete from public.recognitions f
   where f.species_id = p_from
     and exists (select 1 from public.recognitions i where i.user_id = f.user_id and i.species_id = p_into);
  update public.recognitions set species_id = p_into where species_id = p_from;

  update public.notification_log set species_id = p_into where species_id = p_from;
  update public.content_reports set species_id = p_into where species_id = p_from;

  -- Presence: the records were split between the keys, so they add up.
  insert into public.species_presence (region_id, species_id, active_months, occurrences, month_counts)
  select f.region_id, p_into, f.active_months, f.occurrences, f.month_counts
    from public.species_presence f where f.species_id = p_from
  on conflict (region_id, species_id) do update set
    occurrences = public.species_presence.occurrences + excluded.occurrences,
    active_months = (select array_agg(distinct m order by m)
                       from unnest(public.species_presence.active_months || excluded.active_months) m),
    month_counts = case
      when public.species_presence.month_counts is null then excluded.month_counts
      when excluded.month_counts is null then public.species_presence.month_counts
      else (select array_agg(a + b order by i)
              from unnest(public.species_presence.month_counts, excluded.month_counts) with ordinality as t(a, b, i))
    end;
  delete from public.species_presence where species_id = p_from;

  -- Content: the accepted species keeps its text; an empty field takes the other's.
  insert into public.species_content (species_id, locale, common_name, fact, when_how, give, protect, always_free, fact_source_url, fact_origin)
  select p_into, f.locale, f.common_name, f.fact, f.when_how, f.give, f.protect, f.always_free, f.fact_source_url, f.fact_origin
    from public.species_content f where f.species_id = p_from
  on conflict (species_id, locale) do update set
    common_name = coalesce(public.species_content.common_name, excluded.common_name),
    fact = coalesce(public.species_content.fact, excluded.fact),
    fact_source_url = case when public.species_content.fact is null then excluded.fact_source_url else public.species_content.fact_source_url end,
    fact_origin = case when public.species_content.fact is null then excluded.fact_origin else public.species_content.fact_origin end,
    when_how = coalesce(public.species_content.when_how, excluded.when_how),
    give = coalesce(public.species_content.give, excluded.give),
    protect = coalesce(public.species_content.protect, excluded.protect);

  -- One photo and one recording per species: the other's only where there is none.
  if not exists (select 1 from public.species_media where species_id = p_into and url is not null) then
    delete from public.species_media where species_id = p_into;
    update public.species_media set species_id = p_into where species_id = p_from;
  end if;
  if not exists (select 1 from public.species_sounds where species_id = p_into and url is not null) then
    delete from public.species_sounds where species_id = p_into;
    update public.species_sounds set species_id = p_into where species_id = p_from;
  end if;

  update public.species s
     set in_catalogue = s.in_catalogue or (select f.in_catalogue from public.species f where f.id = p_from),
         common_name = coalesce(s.common_name, (select f.common_name from public.species f where f.id = p_from))
   where s.id = p_into;
  update public.species set in_catalogue = false where id = p_from;
end;
$$;

revoke all on function public.merge_species(text, text) from public, anon, authenticated;

-- Verify after applying: db-migrate.yml mode=verify (pipeline/db/verify.py, rolled back).

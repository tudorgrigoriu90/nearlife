-- 0045 — legal status on the card: invasive now, protected next (T-336 · review F-01).
--
-- `invasive`: on the EU list of invasive alien species of Union concern (Regulation (EU)
-- 1143/2014), which applies in Sweden. `protected`: protected under the Species Protection
-- Ordinance (SFS 2007:845), filled by T-337. Null otherwise. One column, since no species is
-- both. Filled by pipeline/build_legal_status.py; region_catalogue returns it as a new last column.

alter table public.species add column if not exists legal_status text;
alter table public.species drop constraint if exists species_legal_status_known;
alter table public.species add constraint species_legal_status_known
  check (legal_status is null or legal_status in ('protected', 'invasive'));

drop function if exists public.region_catalogue(text, text);

create function public.region_catalogue(region text, loc text)
returns table (
  id               text,
  scientific_name  text,
  common_name      text,
  local_name       text,
  category         text,
  rarity           text,
  taxon_group      text,
  active_months    smallint[],
  occurrences      integer,
  photo_url        text,
  photo_source_url text,
  photo_author     text,
  photo_license    text,
  catch_habitats   text[],
  month_counts     integer[],
  iucn_status      text,
  redlist_se       text,
  legal_status     text
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    s.id,
    s.scientific_name,
    s.common_name,
    coalesce(nullif(trim(lc.common_name), ''), nullif(trim(en.common_name), '')) as local_name,
    s.category,
    s.rarity,
    s.taxon_group,
    p.active_months,
    p.occurrences,
    m.url,
    m.source_url,
    m.author,
    m.license,
    s.catch_habitats,
    p.month_counts,
    s.iucn_status,
    s.redlist_se,
    s.legal_status
  from public.species_presence p
  join public.species s on s.id = p.species_id
  left join public.species_content lc on lc.species_id = s.id and lc.locale = loc
  left join public.species_content en on en.species_id = s.id and en.locale = 'en'
  left join public.species_media m on m.species_id = s.id and m.url is not null
  where p.region_id = region
  order by p.occurrences desc, s.id
$$;

grant execute on function public.region_catalogue(text, text) to anon, authenticated;

-- 0031 — worldwide threat status, for the card (T-263).
--
-- Wikidata (CC0) carries the IUCN Red List category (P141) for ~1,350 catalogue species. Only the
-- threatened and near-threatened categories are stored: "least concern" is the default the card
-- says nothing about, and "data deficient" is not a status worth a badge. The card labels it as
-- worldwide, since IUCN assesses the global population, not Sweden's. Filled by
-- pipeline/build_iucn_status.py; region_catalogue returns it as a new last column.

alter table public.species add column if not exists iucn_status text;
alter table public.species drop constraint if exists species_iucn_status_known;
alter table public.species add constraint species_iucn_status_known
  check (iucn_status is null or iucn_status in ('NT', 'VU', 'EN', 'CR', 'EW', 'EX'));

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
  iucn_status      text
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
    s.iucn_status
  from public.species_presence p
  join public.species s on s.id = p.species_id
  left join public.species_content lc on lc.species_id = s.id and lc.locale = loc
  left join public.species_content en on en.species_id = s.id and en.locale = 'en'
  left join public.species_media m on m.species_id = s.id and m.url is not null
  where p.region_id = region
  order by p.occurrences desc, s.id
$$;

grant execute on function public.region_catalogue(text, text) to anon, authenticated;

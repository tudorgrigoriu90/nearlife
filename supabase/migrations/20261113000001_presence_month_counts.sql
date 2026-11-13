-- 0030 — sightings per month, per county (T-261).
--
-- The card's county section (T-262) shows when a species is seen in the user's county and when
-- most: a 12-month chart, arrival and departure for migrants, the peak months. GBIF's facets
-- already arrive per (county, month, species); the aggregation used to keep only which months.
-- `month_counts` keeps the counts, January first. It is null until the next presence load.
-- region_catalogue returns it as a new last column, so it is dropped and recreated as in 0025.
-- Older apps ignore the extra column.

alter table public.species_presence add column if not exists month_counts integer[];
alter table public.species_presence drop constraint if exists species_presence_month_counts_12;
alter table public.species_presence add constraint species_presence_month_counts_12
  check (month_counts is null or cardinality(month_counts) = 12);

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
  month_counts     integer[]
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
    p.month_counts
  from public.species_presence p
  join public.species s on s.id = p.species_id
  left join public.species_content lc on lc.species_id = s.id and lc.locale = loc
  left join public.species_content en on en.species_id = s.id and en.locale = 'en'
  left join public.species_media m on m.species_id = s.id and m.url is not null
  where p.region_id = region
  order by p.occurrences desc, s.id
$$;

grant execute on function public.region_catalogue(text, text) to anon, authenticated;

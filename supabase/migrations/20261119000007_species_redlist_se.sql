-- 0044 — Sweden's own Red List category, for the card (T-332 · review I-35).
--
-- The worldwide IUCN category (0031, T-263) can say Least Concern for a species threatened in
-- Sweden, and the reverse. SLU Artdatabanken's Swedish Red List 2025 (GBIF, CC0,
-- doi:10.15468/zbbyqv) gives the national category. Near threatened and worse are stored, plus
-- regionally extinct; data deficient and "not on the list" stay null, and the card then says
-- nothing. Filled by pipeline/build_redlist_se.py; region_catalogue returns it as a new last column.

alter table public.species add column if not exists redlist_se text;
alter table public.species drop constraint if exists species_redlist_se_known;
alter table public.species add constraint species_redlist_se_known
  check (redlist_se is null or redlist_se in ('NT', 'VU', 'EN', 'CR', 'RE'));

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
  redlist_se       text
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
    s.redlist_se
  from public.species_presence p
  join public.species s on s.id = p.species_id
  left join public.species_content lc on lc.species_id = s.id and lc.locale = loc
  left join public.species_content en on en.species_id = s.id and en.locale = 'en'
  left join public.species_media m on m.species_id = s.id and m.url is not null
  where p.region_id = region
  order by p.occurrences desc, s.id
$$;

grant execute on function public.region_catalogue(text, text) to anon, authenticated;

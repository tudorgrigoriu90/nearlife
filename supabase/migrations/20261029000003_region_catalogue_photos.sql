-- 0015 — region_catalogue also returns each species' photo (T-215).
--
-- The Almanac and This Week read species through region_catalogue / describeSpecies; adding the
-- photo here gives every card its hero image from `species_media` (T-202) in the same call,
-- instead of one request per card. The return type changes, so the function is dropped and
-- recreated (CREATE OR REPLACE cannot change a function's result columns).

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
  photo_license    text
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
    m.license
  from public.species_presence p
  join public.species s on s.id = p.species_id
  left join public.species_content lc on lc.species_id = s.id and lc.locale = loc
  left join public.species_content en on en.species_id = s.id and en.locale = 'en'
  left join public.species_media m on m.species_id = s.id and m.url is not null
  where p.region_id = region
  order by p.occurrences desc, s.id
$$;

grant execute on function public.region_catalogue(text, text) to anon, authenticated;

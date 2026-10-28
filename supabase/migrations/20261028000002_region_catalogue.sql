-- 0012 — region_catalogue(region, loc): a county's species with display names, one call (T-208).
--
-- The Almanac shows every species recorded in the user's county (~3,000). Assembling that from the
-- tables means presence + species + content in two locales — ~40 chunked requests from a phone.
-- This joins it server-side into one result the app pages through (PostgREST caps a response at
-- 1,000 rows), ordered by observation count so the most findable species come first.
--
-- `local_name` is the name in `loc`, else English, else null (the app then shows the binomial as a
-- binomial — never passed off as a common name, T-187). `active_months` is the county's own window.
--
-- SECURITY INVOKER: it reads only public-read tables, so it needs no privilege of its own and RLS
-- applies exactly as for direct reads. Measured on Kronoberg (3,020 rows): ~70 ms.

create or replace function public.region_catalogue(region text, loc text)
returns table (
  id              text,
  scientific_name text,
  common_name     text,
  local_name      text,
  category        text,
  rarity          text,
  taxon_group     text,
  active_months   smallint[],
  occurrences     integer
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
    p.occurrences
  from public.species_presence p
  join public.species s on s.id = p.species_id
  left join public.species_content lc on lc.species_id = s.id and lc.locale = loc
  left join public.species_content en on en.species_id = s.id and en.locale = 'en'
  where p.region_id = region
  order by p.occurrences desc, s.id
$$;

grant execute on function public.region_catalogue(text, text) to anon, authenticated;

-- Verify after applying:
--   select count(*) from public.region_catalogue('SWE.9_1', 'sv');   -- = Kronoberg presence rows

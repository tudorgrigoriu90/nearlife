-- 0052 — protected species on the card (T-337 · review F-01).
--
-- `protection`: the level under the Species Protection Ordinance (SFS 2007:845):
--   bird       every wild bird (4 §)
--   annex      annex 1, marked N or n (animals, 4 a §) or N (plants, 7 §)
--   strict / reinforced / basic / limited   annex 2 (5 a, 6, 8, 9 §§)
-- `protection_regions`: the counties an annex 2 entry is limited to (null = all of Sweden).
-- `legal_status` stays the card's switch ('protected' when `protection` is set, unless the species
-- is invasive). Filled by pipeline/build_protected.py. region_catalogue returns the level, and
-- whether it holds only in some counties; in a county outside the limit it returns neither.

alter table public.species add column if not exists protection text;
alter table public.species add column if not exists protection_regions text[];
alter table public.species drop constraint if exists species_protection_known;
alter table public.species add constraint species_protection_known
  check (protection is null or protection in ('bird', 'annex', 'strict', 'reinforced', 'basic', 'limited'));
alter table public.species drop constraint if exists species_protection_regions_need_a_level;
alter table public.species add constraint species_protection_regions_need_a_level
  check (protection_regions is null or (protection is not null and cardinality(protection_regions) > 0));

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
  legal_status     text,
  protection       text,
  protection_local boolean
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
    -- A protection limited to named counties is not shown in the others.
    case
      when s.legal_status = 'protected' and s.protection_regions is not null
        and not region = any(s.protection_regions) then null
      else s.legal_status
    end as legal_status,
    case
      when s.protection_regions is not null and not region = any(s.protection_regions) then null
      else s.protection
    end as protection,
    s.protection_regions is not null and region = any(s.protection_regions) as protection_local
  from public.species_presence p
  join public.species s on s.id = p.species_id
  left join public.species_content lc on lc.species_id = s.id and lc.locale = loc
  left join public.species_content en on en.species_id = s.id and en.locale = 'en'
  left join public.species_media m on m.species_id = s.id and m.url is not null
  where p.region_id = region
  order by p.occurrences desc, s.id
$$;

grant execute on function public.region_catalogue(text, text) to anon, authenticated;

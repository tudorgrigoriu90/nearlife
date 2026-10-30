-- 0024 — species_media remembers which photo sources were tried (T-220).
--
-- A null url meant "Wikipedia had no commercial-safe photo", and the weekly job never asked again.
-- With iNaturalist as a second source, a miss needs to say which sources missed, so each species
-- gets one iNaturalist look and is then left alone, like before. Every existing row was looked up
-- on Wikipedia (the curated 54 included), so they start with that.

alter table public.species_media
  add column if not exists sources_tried text[] not null default '{}';

update public.species_media set sources_tried = '{wikipedia}' where sources_tried = '{}';

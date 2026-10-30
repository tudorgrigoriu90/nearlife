-- 0021 — which catch spots each species can be met at (T-047).
--
-- land / freshwater / coast, the three spot habitats (pipeline/osm/rules.py), derived from the
-- species' GBIF realms (T-191) by pipeline/gbif/habitats.py and written by the species loader. The
-- catch flow (T-068) offers only spots whose habitat is in this list, so a pike is never sent to a
-- picnic table. Null until the loader has run with realm data; readers treat null as the
-- category default.

alter table public.species
  add column if not exists catch_habitats text[]
  check (catch_habitats <@ array['land', 'freshwater', 'coast']::text[]);

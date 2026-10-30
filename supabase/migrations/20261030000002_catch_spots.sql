-- 0022 — catch spots: designated public places to go catching (T-048 · T-049 · TSD §5).
--
-- Fetched from OpenStreetMap by pipeline/build_catch_spots.py and loaded by pipeline/osm/load.py.
-- Map data © OpenStreetMap contributors (ODbL); this derived table stays internal (T-008): users
-- read individual spots for their county, never an export.
--
-- PRIVACY: the app downloads its county's shown spots and finds the nearest one ON THE DEVICE. No
-- query here takes a user's position, so coordinates never leave the phone (PRIVACY §1).
--
-- SAFETY (T-049): a spot carrying ANY exclusion flag is kept here for the density audit (T-050)
-- but is invisible to every user. The read policy admits only rows with no flags, so no client
-- query, bug or future screen can surface one. The flags are private, major_road, water, reserve
-- and military.

create table if not exists public.catch_spots (
  id          text primary key,                       -- OSM id: n123 / w45 / r6
  region_id   text not null references public.regions (id) on delete cascade,
  kind        text not null,                          -- viewpoint, picnic_site, bird_hide, …
  habitat     text not null check (habitat in ('land', 'freshwater', 'coast')),
  name        text,
  lat         double precision not null check (lat between 55 and 70),
  lon         double precision not null check (lon between 10 and 25),
  flags       text[] not null default '{}'
              check (flags <@ array['private', 'major_road', 'water', 'reserve', 'military']::text[]),
  updated_at  timestamptz not null default now()
);

create index if not exists catch_spots_region_idx on public.catch_spots (region_id);

alter table public.catch_spots enable row level security;

create policy "shown catch spots are public"
  on public.catch_spots for select to anon, authenticated
  using (cardinality(flags) = 0);

revoke insert, update, delete on public.catch_spots from anon, authenticated;

-- Verify after applying: db-migrate.yml mode=verify (pipeline/db/verify.py, rolled back).

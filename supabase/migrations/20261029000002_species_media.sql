-- 0014 — species_media: one licence-clear hero photo per species, re-hosted in Storage (T-202).
--
-- Photos were a bundled manifest for the curated 54 (lib/species/media.kronoberg.ts); every other
-- species rendered a category glyph, notifications included. This table is the catalogue-wide
-- home, filled by pipeline/build_species_photos.py and read by the app + the notification sender.
--
-- A row with `url` null records "looked, no commercial-safe photo exists" — so the resumable job
-- does not re-query Wikipedia for it every run, and the app still falls back to the glyph.
-- Attribution (author + licence + source page) is a licence condition for CC-BY / CC-BY-SA, so it
-- is stored with every photo (invariant #8).

create table if not exists public.species_media (
  species_id text primary key references public.species (id) on delete cascade,
  url        text,                                   -- public Storage URL of the ~400 px thumbnail
  source_url text,                                   -- Commons file page (full size + licence)
  author     text,
  license    text check (license in ('CC0', 'CC-BY', 'CC-BY-SA')),
  checked_at timestamptz not null default now(),
  check ((url is null) = (license is null))          -- a photo always carries its licence
);

alter table public.species_media enable row level security;

create policy "species_media public read"
  on public.species_media for select to anon, authenticated using (true);

-- Writes are the pipeline's (service role / postgres), never a user's.

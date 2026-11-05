-- 0027 — species_sounds: one licence-clear bird recording per species, re-hosted in Storage (T-245).
--
-- Same shape and rules as species_media (0014): a row with `url` null records "looked, no
-- commercial-safe recording exists", so the resumable job does not ask again and the card simply
-- shows no Listen button. Attribution (recordist + licence + source page) is a licence condition
-- for CC-BY / CC-BY-SA, so it is stored with every clip (invariant #8).

create table if not exists public.species_sounds (
  species_id text primary key references public.species (id) on delete cascade,
  url        text,                                   -- public Storage URL of the ~20 s AAC clip
  source_url text,                                   -- the iNaturalist observation
  author     text,
  license    text check (license in ('CC0', 'CC-BY', 'CC-BY-SA')),
  checked_at timestamptz not null default now(),
  check ((url is null) = (license is null))          -- a clip always carries its licence
);

alter table public.species_sounds enable row level security;

create policy "species_sounds public read"
  on public.species_sounds for select to anon, authenticated using (true);

-- Writes are the pipeline's (service role / postgres), never a user's.
revoke insert, update, delete on public.species_sounds from anon, authenticated;

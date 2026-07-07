-- 0004 — production species + species_content reference tables (T-055).
--
-- Public read-only reference data: the species catalogue + the always-free Tier-1 content
-- (fact / when-how / give / protect). Writes are service-role only (pipeline / seed); RLS grants
-- SELECT to anon + authenticated so any user (incl. anonymous) can read the catalogue.
--
-- Applied to the live project via the Supabase connector (2026-07-07) and verified: both tables
-- have a single public-read SELECT policy (`using (true)` for {anon, authenticated}).

create table if not exists public.species (
  id              text primary key,
  scientific_name text not null,
  common_name     text not null,          -- English base; localized names live in species_content
  category        text not null check (category in ('bird','mammal','insect','plant','fish','fungus')),
  rarity          text not null check (rarity in ('common','uncommon','rare')),
  active_months   smallint[] not null default '{}',
  created_at      timestamptz not null default now()
);

create index if not exists species_category_idx on public.species (category);

create table if not exists public.species_content (
  species_id  text not null references public.species (id) on delete cascade,
  locale      text not null,
  common_name text,                        -- localized name; null → fall back to species.common_name
  fact        text not null,
  when_how    text not null,
  give        text not null,
  protect     text not null,
  -- Tier-1 fact + give/protect are ALWAYS FREE for every species, forever (invariant #2).
  always_free boolean not null default true,
  created_at  timestamptz not null default now(),
  primary key (species_id, locale)
);

create index if not exists species_content_locale_idx on public.species_content (locale);

alter table public.species enable row level security;
alter table public.species_content enable row level security;

create policy "species public read"
  on public.species for select to anon, authenticated using (true);

create policy "species_content public read"
  on public.species_content for select to anon, authenticated using (true);

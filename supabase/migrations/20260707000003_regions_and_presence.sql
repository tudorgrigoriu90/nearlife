-- 0006 — regions + species taxonomy + per-region presence (T-042/T-045 data model).
--
-- The GBIF presence pipeline produces, per Swedish county (region) and species, the months the
-- species was recorded there and its occurrence count (pipeline/data/presence_*.json). This is
-- the county-level presence proxy the notification engine + This Week screen consume — the
-- regional stand-in for the per-H3-cell `cell_species_month` (TSD §4) until H3 aggregation lands.
--
-- Honesty (TSD §7): GBIF records where observers went, not where animals are; CC0/CC-BY only.

-- ── regions: the 21 Swedish counties (GADM level-1) ──────────────────────────
create table if not exists public.regions (
  id         text primary key,            -- GADM GID, e.g. 'SWE.9_1' (Kronoberg)
  name       text not null,
  created_at timestamptz not null default now()
);

alter table public.regions enable row level security;
create policy "regions public read" on public.regions for select to anon, authenticated using (true);

-- ── species: taxonomy for the full fauna+flora catalogue ─────────────────────
-- The curated set used `category` (bird/mammal/insect/plant/fish/fungus). GBIF adds taxa with no
-- minigame category (amphibian/reptile/arachnid/mollusc), so `category` becomes nullable and the
-- authoritative classifier is `taxon_group` (+ `vertebrate`). `gbif_key` links to the backbone.
alter table public.species alter column category drop not null;
alter table public.species add column if not exists gbif_key    bigint;
alter table public.species add column if not exists taxon_group text;      -- bird/mammal/amphibian/reptile/fish/insect/arachnid/mollusc/plant/fungus
alter table public.species add column if not exists vertebrate  boolean;

create unique index if not exists species_gbif_key_idx on public.species (gbif_key) where gbif_key is not null;
create index if not exists species_taxon_group_idx on public.species (taxon_group);

-- ── species_presence: per-region, per-species presence (county proxy) ────────
create table if not exists public.species_presence (
  region_id     text not null references public.regions (id) on delete cascade,
  species_id    text not null references public.species (id) on delete cascade,
  active_months smallint[] not null default '{}',   -- months (1-12) the species was recorded
  occurrences   integer not null default 0,         -- observation count (rarity_flavor input, TSD §4)
  created_at    timestamptz not null default now(),
  primary key (region_id, species_id)
);

create index if not exists species_presence_region_idx on public.species_presence (region_id);

alter table public.species_presence enable row level security;
create policy "species_presence public read"
  on public.species_presence for select to anon, authenticated using (true);

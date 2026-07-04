-- 0001 — profiles + collection (T-056 groundwork).
--
-- Prototype persistence: a per-user profile (hometown + free-catch counters) and the
-- three-tier collection (spotted / caught / helped). Species and card content stay hardcoded
-- in the app for the fake-it prototype (TSD §8); Supabase stores only user state here.
--
-- Security model (answers the RLS question): RLS is ON for every table, and each policy
-- restricts rows to the signed-in owner (auth.uid() = user_id). Reference/content tables with
-- public-read policies arrive with the real data layer (E3/E4).
--
-- STATUS: authored, NOT YET APPLIED to the live database. Apply with `supabase db push`
-- (needs a Supabase access token) or by pasting into the dashboard SQL editor, then verify.

-- ── profiles ────────────────────────────────────────────────────────────────
-- App-specific user data keyed to the Supabase auth user.
create table if not exists public.profiles (
  user_id            uuid primary key references auth.users (id) on delete cascade,
  home_region        text,                        -- GPS-derived hometown, locked (ECONOMY.md)
  free_catches_used  integer not null default 0,  -- free-catch accounting (TSD §5b, T-113)
  free_catch_season  text,
  created_at         timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles selectable by owner"
  on public.profiles for select
  using (auth.uid() = user_id);

create policy "profiles insertable by owner"
  on public.profiles for insert
  with check (auth.uid() = user_id);

create policy "profiles updatable by owner"
  on public.profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── collection ──────────────────────────────────────────────────────────────
-- One row per (user, species); tier is derived from which timestamps are set (lib/collection.ts).
create table if not exists public.collection (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  species_id   text not null,
  spotted_at   timestamptz,
  caught_at    timestamptz,
  helped_at    timestamptz,
  helped_kind  text check (helped_kind in ('give', 'protect')),
  prime_bonus  boolean not null default false,
  created_at   timestamptz not null default now(),
  unique (user_id, species_id)
);

alter table public.collection enable row level security;

create policy "collection selectable by owner"
  on public.collection for select
  using (auth.uid() = user_id);

create policy "collection insertable by owner"
  on public.collection for insert
  with check (auth.uid() = user_id);

create policy "collection updatable by owner"
  on public.collection for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "collection deletable by owner"
  on public.collection for delete
  using (auth.uid() = user_id);

create index if not exists collection_user_idx on public.collection (user_id);

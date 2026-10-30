-- 0026 — Supabase advisor findings, the ones worth fixing (T-224, from the T-164 review).
--
-- 1. The owner-only policies on collection and profiles called auth.uid() once per row. Wrapped
--    in a select, Postgres evaluates it once per query (Supabase's documented fix). The policies
--    are also scoped to `authenticated`: the app always holds a session (anonymous sign-in), and a
--    request without one matched no rows anyway, so nobody loses access. The rules are unchanged:
--    a user reads and writes only their own rows.
-- 2. Two indexes duplicated the leading column of a unique index and were never used:
--    collection (user_id) is covered by (user_id, species_id), and species_presence (region_id) by
--    the primary key (region_id, species_id).

drop policy if exists "collection selectable by owner" on public.collection;
drop policy if exists "collection insertable by owner" on public.collection;
drop policy if exists "collection updatable by owner" on public.collection;
drop policy if exists "collection deletable by owner" on public.collection;

create policy "collection selectable by owner" on public.collection
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "collection insertable by owner" on public.collection
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "collection updatable by owner" on public.collection
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "collection deletable by owner" on public.collection
  for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "profiles selectable by owner" on public.profiles;
drop policy if exists "profiles insertable by owner" on public.profiles;
drop policy if exists "profiles updatable by owner" on public.profiles;

create policy "profiles selectable by owner" on public.profiles
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "profiles insertable by owner" on public.profiles
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "profiles updatable by owner" on public.profiles
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop index if exists public.collection_user_idx;
drop index if exists public.species_presence_region_idx;

-- 0047 — a pledge can be marked done (T-344 · review F-08).
--
-- Honour system, as the pledge itself: no proof. A pledge must exist first; the check says so,
-- since a "done" without a pledge would count a kept promise nobody made. The app keeps the first
-- time it was marked, merges by the earliest, and exports it with the collection row.

alter table public.collection add column if not exists helped_done_at timestamptz;
alter table public.collection drop constraint if exists collection_done_needs_pledge;
alter table public.collection add constraint collection_done_needs_pledge
  check (helped_done_at is null or helped_at is not null);

-- Verify after applying: db-migrate.yml mode=verify (pipeline/db/verify.py, rolled back).

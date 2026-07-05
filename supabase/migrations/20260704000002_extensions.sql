-- 0002 — enable PostGIS + pg_cron extensions (T-017).
--
-- PostGIS backs the spatial data layer (H3 cells, habitat, catch spots — E3/E4). pg_cron
-- schedules the notification engine server-side (T-030 prototype, T-064 production) with no
-- client dependency. Both are on Supabase's allow-list; this migration is the reproducible,
-- version-controlled way to enable them (equivalent to the dashboard Extensions toggles).
--
-- STATUS: authored, NOT YET APPLIED. This environment's network policy blocks *.supabase.co,
-- so apply Director-side — `supabase db push` (access token + DB password) or paste into the
-- dashboard SQL editor. Idempotent, so re-running is safe.

-- PostGIS into Supabase's conventional `extensions` schema.
create extension if not exists postgis with schema extensions;

-- pg_cron creates its own `cron` schema and must live in the default database (postgres).
create extension if not exists pg_cron;

-- Verify after applying:
--   select extname from pg_extension where extname in ('postgis','pg_cron');  -- 2 rows
--   select postgis_full_version();                                            -- PostGIS present
--   select * from cron.job;                                                   -- cron ready (empty)

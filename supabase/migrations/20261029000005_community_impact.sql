-- 0017 — community impact totals for the season (T-081).
--
-- "This season, N people pledged M actions for wildlife" (GDD §7). Pledges are the Helped rows of
-- `collection` (T-077), so this is one aggregate, computed on read. There is no impact_counters
-- table refreshed by cron: at MVP scale the scan costs milliseconds, and a counter table is a
-- second copy that can drift from the rows it counts. Revisit if collection grows past ~1M rows.
-- An index on helped_at with a season range predicate would be the first step.
--
-- `collection` RLS is owner-only, so the function is SECURITY DEFINER. It returns counts and
-- never a row, user id or species. The season is the server's (`public.season_key`, Stockholm
-- time), the same clock that stamps free catches, so "this season" means one thing everywhere.

create or replace function public.community_impact()
returns table (season text, helpers integer, pledges integer, give integer, protect integer)
language sql
stable
security definer
set search_path = ''
as $$
  with s as (select public.season_key(now()) as key)
  select
    s.key,
    count(distinct c.user_id)::integer,
    count(c.id)::integer,
    count(c.id) filter (where c.helped_kind = 'give')::integer,
    count(c.id) filter (where c.helped_kind = 'protect')::integer
  from s
  left join public.collection c
    on c.helped_at is not null and public.season_key(c.helped_at) = s.key
  group by s.key
$$;

revoke all on function public.community_impact() from public;
grant execute on function public.community_impact() to anon, authenticated;

-- Verify after applying: db-migrate.yml mode=verify (pipeline/db/verify.py, rolled back), and
--   select * from public.community_impact();   -- one row for the current season

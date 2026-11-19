-- 0040 — community totals: signed-in callers, and an index range (T-305 · review B-56).
--
-- community_impact() could be called with the shipped publishable key and no account, and it
-- evaluated season_key() for every helped row. The season is now a range on helped_at, from the
-- first day of the season's first month to three months later, both at midnight in Stockholm
-- (the clock season_key uses), so an index on helped_at serves it. Callers need an account; the
-- app always has one (an anonymous session) and asks for it first.

create index if not exists collection_helped_at_idx
  on public.collection (helped_at)
  where helped_at is not null;

-- The totals as they stand at `at`. Not callable by users; community_impact() passes now().
create or replace function public.community_impact_at(at timestamptz)
returns table (season text, helpers integer, pledges integer, give integer, protect integer)
language sql
stable
security definer
set search_path = ''
as $$
  with local as (select at at time zone 'Europe/Stockholm' as t),
  bounds as (
    -- December, March, June and September open a season: month % 3 months back from this one.
    select date_trunc('month', t) - make_interval(months => extract(month from t)::int % 3) as starts
      from local
  ),
  s as (
    select public.season_key(at) as key,
           (starts at time zone 'Europe/Stockholm') as from_at,
           ((starts + interval '3 months') at time zone 'Europe/Stockholm') as to_at
      from bounds
  )
  select
    s.key,
    count(distinct c.user_id)::integer,
    count(c.id)::integer,
    count(c.id) filter (where c.helped_kind = 'give')::integer,
    count(c.id) filter (where c.helped_kind = 'protect')::integer
  from s
  left join public.collection c
    on c.helped_at >= s.from_at and c.helped_at < s.to_at
  group by s.key
$$;

revoke all on function public.community_impact_at(timestamptz) from public, anon, authenticated;

create or replace function public.community_impact()
returns table (season text, helpers integer, pledges integer, give integer, protect integer)
language sql
stable
security definer
set search_path = ''
as $$
  select * from public.community_impact_at(now())
$$;

revoke all on function public.community_impact() from public, anon;
grant execute on function public.community_impact() to authenticated;

-- Verify after applying (db-migrate.yml mode=verify): an anonymous call is refused, a signed-in
-- one returns one row for the current season.

-- 0027 — Only catalogue species are served (T-225, invariant #1).
--
-- The T-136 noise filter decided catalogue.json (names, content, photos), but presence was loaded
-- for every recorded species, and everything with presence was served as "active in your region
-- this season". That included ~5,100 species the filter rejects: one-off records, escapees,
-- vagrants, misidentifications.
--
-- `species.in_catalogue` carries the filter's verdict. The loader sets it from the same rule as
-- catalogue.json (pipeline/gbif/db_rows.py). Users may read presence only for catalogue species,
-- and region_catalogue runs with the caller's rights, so the almanac and This Week inherit the
-- rule with no client change. The notification sender uses the service role, which bypasses RLS,
-- so it filters explicitly.
--
-- The initial fill below uses the same thresholds in SQL. The next species load replaces it with
-- the loader's exact verdict. pipeline/tests/test_in_catalogue_sql.py pins these numbers to
-- gbif/noise.Policy, so the two can never drift apart. The curated species (kebab-case ids, hand
-- checked) always ship.

alter table public.species add column if not exists in_catalogue boolean not null default false;

with signals as (
  select species_id, count(*) as counties, sum(occurrences) as occurrences
    from public.species_presence
   where region_id like 'SWE.%'
   group by species_id
)
update public.species s
   set in_catalogue = (
         sg.occurrences >= 1000                                   -- abundant_occurrences
         or (sg.occurrences >= 25                                 -- min_occurrences
             and (sg.counties >= 3                                -- min_counties
                  or sg.occurrences >= 100))                      -- local_occurrences (T-194 B)
       )
  from signals sg
 where sg.species_id = s.id;

update public.species set in_catalogue = true where id not like 'gbif:%';

drop policy if exists "species_presence public read" on public.species_presence;
create policy "species_presence catalogue read"
  on public.species_presence for select to anon, authenticated
  using (exists (select 1 from public.species s where s.id = species_id and s.in_catalogue));

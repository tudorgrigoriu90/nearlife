-- 0028 — catalogue cleanup: hybrids, duplicates and shared photos (T-254).
--
-- Found when "Jag såg… Älg" showed two identical moose (T-253):
--
-- 1. Three curated birds were linked to a hybrid's GBIF key by the seed (0007): its name matching
--    cut "Anas platyrhynchos x crecca" to "Anas platyrhynchos". So `mallard` carried the hybrid's
--    name and its thin presence (37 records), and the real Mallard came in again as gbif:9761484.
--    Same for `blue-tit` and `whooper-swan`. The curated row is re-attached to the real species,
--    and the duplicate is merged into it, users' collections included (earliest date per tier).
-- 2. Hybrids, a non-Swedish taxon (Alces americanus) and clear synonyms leave the catalogue. The
--    loader now applies the same rule (pipeline/gbif/noise.py), so the next load keeps it.
-- 3. A photo file shown by more than one catalogue species stays with the species it shows, and
--    the others go back to the photo job, which now refuses a file already in use. Their row is
--    left as a miss already tried on Wikipedia, so the next run looks on iNaturalist.

-- 1. Curated birds onto the real species.
do $$
declare
  r record;
  dup text;
begin
  for r in
    select * from (values
      ('mallard', 9761484::bigint, 'Anas platyrhynchos'),
      ('blue-tit', 2487879::bigint, 'Cyanistes caeruleus'),
      ('whooper-swan', 2498347::bigint, 'Cygnus cygnus')
    ) v(curated, real_key, real_name)
  loop
    dup := 'gbif:' || r.real_key;
    continue when not exists (select 1 from public.species where id = dup);  -- already merged

    -- Users who have both rows: one row, with the earliest date of each tier.
    update public.collection c
       set spotted_at  = least(c.spotted_at, d.spotted_at),
           caught_at   = least(c.caught_at, d.caught_at),
           helped_kind = case when d.helped_at is not null
                               and (c.helped_at is null or d.helped_at < c.helped_at)
                              then d.helped_kind else c.helped_kind end,
           helped_at   = least(c.helped_at, d.helped_at),
           prime_bonus = c.prime_bonus or d.prime_bonus
      from public.collection d
     where d.species_id = dup and c.species_id = r.curated and c.user_id = d.user_id;
    delete from public.collection d
     where d.species_id = dup
       and exists (select 1 from public.collection c where c.user_id = d.user_id and c.species_id = r.curated);
    update public.collection set species_id = r.curated where species_id = dup;
    update public.notification_log set species_id = r.curated where species_id = dup;

    -- The hybrid's presence goes; the species' presence and recording move over. The curated
    -- content and hand-checked photo stay; the duplicate's go with its row.
    delete from public.species_presence where species_id = r.curated;
    update public.species_presence set species_id = r.curated where species_id = dup;
    delete from public.species_sounds where species_id = r.curated;
    update public.species_sounds set species_id = r.curated where species_id = dup;

    update public.species s
       set active_months = d.active_months,
           catch_habitats = d.catch_habitats
      from public.species d
     where s.id = r.curated and d.id = dup;
    delete from public.species where id = dup;
    update public.species
       set gbif_key = r.real_key, scientific_name = r.real_name, in_catalogue = true
     where id = r.curated;
  end loop;
end $$;

-- 2. Hybrids, a misfiled foreign taxon, and synonyms of species the catalogue already has.
update public.species
   set in_catalogue = false
 where in_catalogue
   and (scientific_name ~* '\sx\s' or scientific_name like '%×%'
        or scientific_name in (
          'Alces americanus',
          'Lactuca alpina',
          'Gnaphalium norvegicum',
          'Gnaphalium sylvaticum',
          'Hieracium vulgatum',
          'Helictotrichon pratense',
          'Ruppia spiralis'));

-- 3. One catalogue species per photo file: a curated species first, then the species the file is
--    named after (earliest in the name: "Bombus_norvegicus_-_Veronica_spicata" is the bumblebee),
--    then the most widespread.
with ranked as (
  select m.species_id,
         row_number() over (
           partition by m.source_url
           order by (s.id not like 'gbif:%') desc,
                    nullif(strpos(m.source_url, replace(s.scientific_name, ' ', '_')), 0) nulls last,
                    (select count(*) from public.species_presence p where p.species_id = s.id) desc,
                    s.id
         ) as rank
    from public.species_media m
    join public.species s on s.id = m.species_id
   where m.source_url is not null and s.in_catalogue
)
update public.species_media m
   set url = null, source_url = null, author = null, license = null,
       sources_tried = '{wikipedia}', checked_at = now()
  from ranked r
 where r.species_id = m.species_id and r.rank > 1;

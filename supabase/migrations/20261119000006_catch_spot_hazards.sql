-- 0043 — catch spots: the hazard round (T-326 · review I-22 · invariant #5).
--
-- The pipeline now also flags a spot within 30 m of a cliff edge, or inside a quarry, a landfill or
-- an airport (pipeline/osm/rules.py EXCLUSION_FLAGS, which a pipeline test pins to this list). The
-- read policy is unchanged: any flag at all keeps a spot from every user, so the new flags are
-- hidden by the same rule as the old ones. Flagged spots stay in the table for the density audit.

alter table public.catch_spots drop constraint if exists catch_spots_flags_check;
alter table public.catch_spots
  add constraint catch_spots_flags_check
  check (flags <@ array['private', 'water', 'major_road', 'reserve', 'military',
                        'cliff', 'quarry', 'landfill', 'airport']::text[]);

-- Verify after applying: db-migrate.yml mode=verify (pipeline/db/verify.py, rolled back).

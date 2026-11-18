-- 0034 — where each fact comes from (T-276 · review B-59).
--
-- Catalogue facts are Wikipedia text (CC BY-SA 4.0) or machine translations of it (T-235). Reuse
-- requires credit (a link to the article), the licence, and a note when the text was changed. The
-- card shows "Text: Wikipedia · CC BY-SA 4.0" (or "Machine-translated from Wikipedia") linking to
-- `fact_source_url`. The curated species' facts are the project's own text: both columns stay null.

alter table public.species_content
  add column if not exists fact_source_url text,
  add column if not exists fact_origin text
    check (fact_origin in ('wikipedia', 'wikipedia-translated'));

-- A source only ever describes a fact that is there.
alter table public.species_content drop constraint if exists species_content_source_needs_fact;
alter table public.species_content add constraint species_content_source_needs_fact
  check (fact_source_url is null or (fact is not null and fact_origin is not null));

-- Verify after applying, once pipeline/backfill_fact_sources.py has run:
--   select count(*) from public.species_content
--    where species_id like 'gbif:%' and fact is not null and fact <> '' and fact_source_url is null;  -- 0

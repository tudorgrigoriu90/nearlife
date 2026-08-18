-- 0010 — species.common_name may be NULL (T-196, enabling T-187).
--
-- The column was `not null` from when the only species were the curated 54, every one of which had
-- a hand-written English name. The GBIF catalogue is different: most of its 11,936 species have no
-- common name in any language, and the loader used to paper over that by writing the binomial into
-- `common_name` — so the app rendered "Lutra lutra" as though that were what people call an otter.
--
-- T-187 stopped doing that and sends NULL instead, which is the honest value: the app can then
-- render a scientific name *as* a scientific name rather than passing it off as a common one. This
-- migration lets the column hold it. Same shape as species_content.fact (T-146), nullable for the
-- same reason: absent is a real state, and encoding it as a plausible-looking value is worse than
-- encoding it as nothing.
--
-- Nothing is lost: every curated species keeps its name, and vernacular names sourced from GBIF
-- (T-188) land in species_content.common_name per locale.

alter table public.species alter column common_name drop not null;

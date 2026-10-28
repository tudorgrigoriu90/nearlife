import type { Locale } from './i18n';
import { KRONOBERG_SPECIES } from './species/kronoberg';
import type { Species } from './species/types';
import type { SpeciesRepository } from './speciesRepository';

// What the Almanac lists (T-208). It used to be `listSpecies` — one unpaged read that PostgREST cut
// at 1,000 rows, i.e. an arbitrary tenth of the national catalogue. Now it is the user's own county,
// most-observed first, plus anything they have collected that the county list does not hold (the
// onboarding starter, or a species from before a county refresh) — a collection must never contain
// species the Almanac cannot show.

/** The base list: the county's catalogue, or the bundled set in preview mode (no hometown). */
export async function almanacBase(
  repo: SpeciesRepository,
  regionId: string | null,
  locale: Locale,
): Promise<Species[]> {
  return regionId === null ? [...KRONOBERG_SPECIES] : repo.regionCatalogue(regionId, locale);
}

/** Collected species missing from `base`, described so they can be shown. */
export async function collectedExtras(
  repo: SpeciesRepository,
  base: Species[],
  collectedIds: Iterable<string>,
  locale: Locale,
): Promise<Species[]> {
  const listed = new Set(base.map((s) => s.id));
  const missing = [...new Set(collectedIds)].filter((id) => !listed.has(id)).sort();
  if (missing.length === 0) return [];
  return (await repo.describeSpecies(missing, locale)).map((s) => s.species);
}

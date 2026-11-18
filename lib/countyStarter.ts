import { isActiveThisMonth, recordsInMonth } from './presence';
import type { SpeciesContent } from './species/content';
import { photoFor } from './species/media';
import type { Month, Species } from './species/types';
import type { RegionPresence, SpeciesSummary } from './speciesRepository';

// The onboarding first sighting from the user's county (T-275 · review B-16): its most recorded
// species this month that has a photo and a name, so the first card a new user sees is a species
// recorded where they live in this season (invariant #1), and looks like one.

/** How many of the most recorded species are looked at for one with a photo and a name. */
const CANDIDATES = 40;

export async function pickCountyStarter(
  presence: RegionPresence[],
  month: Month,
  describe: (ids: string[]) => Promise<SpeciesSummary[]>,
  getContent: (speciesId: string) => Promise<SpeciesContent | null>,
): Promise<{ species: Species; content: SpeciesContent | null } | null> {
  const ranked = presence
    .filter((p) => isActiveThisMonth(p, month))
    .sort((a, b) => recordsInMonth(b, month) - recordsInMonth(a, month))
    .slice(0, CANDIDATES);
  if (ranked.length === 0) return null;
  const summaries = await describe(ranked.map((p) => p.speciesId));
  const pick = summaries.find(
    (s) => photoFor(s.species) !== null && s.commonName !== s.species.scientificName,
  );
  if (!pick) return null;
  return { species: pick.species, content: await getContent(pick.species.id).catch(() => null) };
}

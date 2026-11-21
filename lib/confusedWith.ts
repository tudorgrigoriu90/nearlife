import { groupOf } from './species/group';
import { photoFor } from './species/media';
import type { Species } from './species/types';

// "Often confused with" (T-352 · review F-13): up to three species of the same genus in the
// county, each with a photo, the commonest there first, since those are the ones a reader is most
// likely to mix up with this one. Only the genus counts: the quiz (T-241) falls back to anything
// of the same group to make four choices, but a card saying a moose is "often confused with" a
// roe deer would be wrong, so a species with no genus mate in the county shows no section.

export const CONFUSED_WITH_MAX = 3;

export const genusOf = (s: Species): string => s.scientificName.trim().split(/\s+/)[0]?.toLowerCase() ?? '';

/**
 * Same genus, as a reader would mean it (T-385). A genus name may be used once in each kingdom:
 * Linaria is both the twite and linnet's genus and the toadflaxes'. The group tells them apart.
 */
export const sameGenus = (a: Species, b: Species): boolean => genusOf(a) === genusOf(b) && groupOf(a) === groupOf(b);

/**
 * What identifies a picture (T-253). Some species share a photo file: synonyms, and Wikipedia
 * pages that redirect (Alces americanus shows Alces alces). The original file identifies it; the
 * re-hosted URL differs per species.
 */
export function pictureKey(s: Species): string {
  const p = photoFor(s);
  return p ? p.sourceUrl || p.url : `none:${s.id}`;
}

export function confusedWith(target: Species, pool: Species[]): Species[] {
  const mates = pool
    .filter((s) => s.id !== target.id && sameGenus(s, target) && photoFor(s) !== null)
    .sort((a, b) => (b.county?.occurrences ?? 0) - (a.county?.occurrences ?? 0) || a.id.localeCompare(b.id));
  const seen = new Set([pictureKey(target)]);
  const picks: Species[] = [];
  for (const s of mates) {
    if (picks.length === CONFUSED_WITH_MAX) break;
    const key = pictureKey(s);
    if (seen.has(key)) continue;
    seen.add(key);
    picks.push(s);
  }
  return picks;
}

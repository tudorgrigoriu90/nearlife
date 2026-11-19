import type { CollectionRecord } from './collection';
import { seasonKeyOf } from './season';

// The tier marks on the species card (T-298 · review B-29, USER-FLOWS §4): which of Spotted,
// Caught and Helped the user reached, each with its date.

export type Tier = 'spotted' | 'caught' | 'helped';

export interface TierMark {
  tier: Tier;
  /** Day and month in the reader's language. */
  date: string;
}

export function tierMarks(record: CollectionRecord | null | undefined, locale: string): TierMark[] {
  if (!record) return [];
  const at: [Tier, string | null][] = [
    ['spotted', record.spottedAt],
    ['caught', record.caughtAt],
    ['helped', record.helpedAt],
  ];
  return at.flatMap(([tier, iso]) =>
    iso ? [{ tier, date: new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'short' }) }] : [],
  );
}

/** Caught in the current season: the card offers no second catch (a catch counts once a season). */
export function caughtThisSeason(record: CollectionRecord | null | undefined, now: Date): boolean {
  return !!record?.caughtAt && seasonKeyOf(new Date(record.caughtAt)) === seasonKeyOf(now);
}

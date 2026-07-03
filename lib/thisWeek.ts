import { activeSpecies } from './season';
import type { Month, Rarity, Species } from './species/types';

// "Active this week" selection (T-111). Pure core of the This Week screen (T-028 / T-078) and
// the notification-independent pull surface (USER-FLOWS §3, TSD §4b). Given the species list,
// the current month, and what the user has already collected, it returns the active species
// ordered by interest: not-yet-collected first, then rarer-before-common so the feed is not
// "all sparrows" (TSD §4). Order within a tie is stable (input order preserved).

export interface ThisWeekEntry {
  species: Species;
  /** True if the user has not spotted this species yet — surfaced first and flagged NEW. */
  isNew: boolean;
}

const RARITY_RANK: Record<Rarity, number> = { rare: 0, uncommon: 1, common: 2 };

export function thisWeek(
  species: Species[],
  month: Month,
  collectedIds: ReadonlySet<string>,
): ThisWeekEntry[] {
  const entries = activeSpecies(species, month).map((s, index) => ({
    species: s,
    isNew: !collectedIds.has(s.id),
    index,
  }));

  entries.sort((a, b) => {
    if (a.isNew !== b.isNew) return a.isNew ? -1 : 1; // new first
    const rarity = RARITY_RANK[a.species.rarity] - RARITY_RANK[b.species.rarity];
    if (rarity !== 0) return rarity; // rarer first
    return a.index - b.index; // stable tie-break
  });

  return entries.map(({ species: s, isNew }) => ({ species: s, isNew }));
}

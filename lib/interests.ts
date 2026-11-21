import { PREF_GROUPS, prefGroupOf, type PrefGroup } from './notifPrefs';
import { SEASONAL_EVENTS } from './seasonalEvents';
import { groupOf } from './species/group';
import type { Species } from './species/types';

// "Show me" (T-390): which kinds of species the user wants, for the whole app — This Week, its
// arriving/leaving strips and events, the nature calendar, and the notification groups (T-341,
// which now follow this choice). The groups are the notification groups (birds, mammals, fish,
// insects, plants, everything else). The Almanac is the user's collection and shows everything.
// null = everything, as before; stored on the phone and erased with the account (`nearby.`).

export type Interests = PrefGroup[] | null;

const isGroup = (v: unknown): v is PrefGroup => typeof v === 'string' && (PREF_GROUPS as readonly string[]).includes(v);

export function parseInterests(raw: string | null): Interests {
  if (!raw) return null;
  try {
    const v: unknown = JSON.parse(raw);
    if (!Array.isArray(v)) return null;
    const groups = [...new Set(v.filter(isGroup))];
    return groups.length > 0 ? groups : null;
  } catch {
    return null;
  }
}

export function shows(interests: Interests, species: Pick<Species, 'category' | 'group'>): boolean {
  return interests === null || interests.includes(prefGroupOf(groupOf(species)));
}

/** One group on or off. All on is null; the last one cannot be turned off (nothing is no choice). */
export function toggleInterest(interests: Interests, group: PrefGroup): Interests {
  const on = interests ?? [...PREF_GROUPS];
  const next = on.includes(group) ? on.filter((g) => g !== group) : [...on, group];
  if (next.length === 0) return interests;
  return PREF_GROUPS.every((g) => next.includes(g)) ? null : PREF_GROUPS.filter((g) => next.includes(g));
}

/** Ids of the species the choice hides, or null when it hides nothing. Unknown ids are not hidden. */
export function hiddenIds(interests: Interests, pool: Species[]): ReadonlySet<string> | null {
  if (interests === null) return null;
  return new Set(pool.filter((s) => !shows(interests, s)).map((s) => s.id));
}

/** A seasonal event (T-357) shows when its species, or its group, is chosen. */
export function eventShown(interests: Interests, eventId: string, pool: Species[]): boolean {
  if (interests === null) return true;
  const event = SEASONAL_EVENTS.find((e) => e.id === eventId);
  if (!event) return true;
  if ('group' in event.indicator) return interests.includes(prefGroupOf(event.indicator.group));
  const name = event.indicator.scientificName;
  const species = pool.find((s) => s.scientificName === name);
  return species ? shows(interests, species) : true;
}

// The name trainer (T-351 · review F-06): species names as vocabulary, Swedish beside the second
// language, for the species the user has spotted. A card marked "still learning" comes back after
// 1, then 3, then 7 days (and weekly after that); "knew it" retires it. Pure; the device keeps the
// state (`nearby.nameTrainer.v1`), and the data export lists it.

import type { ContentLocale } from './i18n/contentLocale';
import { commonNameInLocale } from './species/localized';
import type { Species } from './species/types';

export const REVIEW_DAYS = [1, 3, 7] as const;
export const CARDS_PER_DAY = 10;

export type TrainerEntry = { due: string; reviews: number } | { known: true; reviews: number };
export type TrainerState = Record<string, TrainerEntry>;

const DAY = /^\d{4}-\d{2}-\d{2}$/;

function addDays(day: string, n: number): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** The state after one answer on `today` (YYYY-MM-DD). */
export function answer(state: TrainerState, speciesId: string, result: 'knew' | 'learning', today: string): TrainerState {
  const reviews = (state[speciesId]?.reviews ?? 0) + 1;
  if (result === 'knew') return { ...state, [speciesId]: { known: true, reviews } };
  const gap = REVIEW_DAYS[Math.min(reviews, REVIEW_DAYS.length) - 1];
  return { ...state, [speciesId]: { due: addDays(today, gap), reviews } };
}

/**
 * Today's cards from the spotted species, in the order given: the ones due first, then ones never
 * asked, at most CARDS_PER_DAY. Known cards and cards not yet due are left out.
 */
export function todaysQueue(spotted: string[], state: TrainerState, today: string): string[] {
  const due = spotted.filter((id) => {
    const e = state[id];
    return e !== undefined && !('known' in e) && e.due <= today;
  });
  const fresh = spotted.filter((id) => state[id] === undefined);
  return [...due, ...fresh].slice(0, CARDS_PER_DAY);
}

export function parseTrainer(raw: string | null): TrainerState {
  if (raw === null) return {};
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    const out: TrainerState = {};
    for (const [id, e] of Object.entries(value as Record<string, unknown>)) {
      if (!e || typeof e !== 'object') continue;
      const entry = e as Record<string, unknown>;
      if (typeof entry.reviews !== 'number') continue;
      if (entry.known === true) out[id] = { known: true, reviews: entry.reviews };
      else if (typeof entry.due === 'string' && DAY.test(entry.due)) out[id] = { due: entry.due, reviews: entry.reviews };
    }
    return out;
  } catch {
    return {};
  }
}

/**
 * The language set beside Swedish: the second language when one is on, else the app language,
 * else English (a Swedish-speaking user without a second language learns the English names).
 */
export function trainerLocale(appLocale: ContentLocale, secondLocale: ContentLocale | null): ContentLocale {
  if (secondLocale !== null && secondLocale !== 'sv') return secondLocale;
  return appLocale === 'sv' ? 'en' : appLocale;
}

/**
 * Both names of a card, or null when either is missing: a guessed or fallback name would teach a
 * wrong word. An English "name" that is only the binomial does not count.
 */
export function trainerNames(species: Species, other: ContentLocale): { sv: string; other: string } | null {
  const sv = commonNameInLocale(species, 'sv');
  const theirs = commonNameInLocale(species, other);
  if (sv === undefined || theirs === undefined || theirs === species.scientificName) return null;
  return { sv, other: theirs };
}

export interface NameTrainerStore {
  load(): Promise<TrainerState>;
  save(state: TrainerState): Promise<void>;
}

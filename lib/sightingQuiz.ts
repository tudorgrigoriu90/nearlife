import AsyncStorage from '@react-native-async-storage/async-storage';
import { normaliseName } from './almanac';
import type { ContentLocale } from './i18n/contentLocale';
import { groupOf } from './species/group';
import { commonNameFor } from './species/localized';
import type { Month, Species } from './species/types';

// "I saw…" sighting quiz (T-241). The user names what they saw by its exact name, then picks it out
// of four photos: the species and three lookalikes. A right answer spots it (or, if already
// spotted, praises them); it checks that they can recognise it, not that they were there, which is
// what Spotted means on the honour system. Catching stays location-checked.
//
// Director's choices (2026-11-05): the exact name, not autocomplete, so a typed name never leaks
// the county list; and one try per species per day, so the quiz can't be passed by guessing.

/** The names a species answers to: app language, English, Latin, and any carried locale names. */
function namesOf(species: Species, locale: ContentLocale): string[] {
  return [
    commonNameFor(species, locale),
    species.commonName,
    species.scientificName,
    ...Object.values(species.names ?? {}).filter((n): n is string => typeof n === 'string'),
  ];
}

/** Species in `pool` whose name is exactly `input` (case and accents ignored). */
export function findByExactName(pool: Species[], input: string, locale: ContentLocale): Species[] {
  const wanted = normaliseName(input);
  if (!wanted) return [];
  return pool.filter((s) => namesOf(s, locale).some((n) => normaliseName(n) === wanted));
}

const genusOf = (s: Species) => s.scientificName.trim().split(/\s+/)[0]?.toLowerCase() ?? '';

/** A small deterministic generator, so the same seed gives the same choices (mulberry32). */
function seededRandom(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled<T>(items: T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Up to `count` lookalikes for `target` from the county `pool`, each with a photo: first the same
 * genus, then the same group active in `month`, then the same group at any time. Similar species
 * make it a real test; a moose against a butterfly would not be.
 */
export function pickLookalikes(
  target: Species,
  pool: Species[],
  month: Month,
  count: number,
  seed: string,
): Species[] {
  const random = seededRandom(`${seed}:${target.id}`);
  const candidates = pool.filter((s) => s.id !== target.id && s.photo !== undefined);
  const group = groupOf(target);
  const genus = genusOf(target);
  const tiers = [
    candidates.filter((s) => genusOf(s) === genus),
    candidates.filter(
      (s) => genusOf(s) !== genus && groupOf(s) === group && s.activeMonths.includes(month),
    ),
    candidates.filter(
      (s) => genusOf(s) !== genus && groupOf(s) === group && !s.activeMonths.includes(month),
    ),
  ];
  return tiers.flatMap((tier) => shuffled(tier, random)).slice(0, count);
}

/** The four choices in a stable, seed-dependent order. */
export function quizOptions(target: Species, lookalikes: Species[], seed: string): Species[] {
  return shuffled([target, ...lookalikes], seededRandom(`${seed}:order:${target.id}`));
}

/** speciesId → the day ("YYYY-MM-DD", device-local) of its last try. */
export type QuizAttempts = Record<string, string>;

export function canAttempt(attempts: QuizAttempts, speciesId: string, today: string): boolean {
  return attempts[speciesId] !== today;
}

/** Records today's try and drops earlier days, which no longer block anything. */
export function recordAttempt(
  attempts: QuizAttempts,
  speciesId: string,
  today: string,
): QuizAttempts {
  const kept = Object.fromEntries(Object.entries(attempts).filter(([, day]) => day === today));
  return { ...kept, [speciesId]: today };
}

/** Device-local day key, e.g. "2026-11-05". */
export function dayKey(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export const QUIZ_STORAGE_KEY = 'nearby.quizAttempts';

export class AsyncStorageQuizAttemptStore {
  async load(): Promise<QuizAttempts> {
    try {
      const raw = await AsyncStorage.getItem(QUIZ_STORAGE_KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as QuizAttempts)
        : {};
    } catch {
      return {};
    }
  }

  async save(attempts: QuizAttempts): Promise<void> {
    await AsyncStorage.setItem(QUIZ_STORAGE_KEY, JSON.stringify(attempts));
  }
}

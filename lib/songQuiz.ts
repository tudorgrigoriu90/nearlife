import { groupOf } from './species/group';
import { photoFor } from './species/media';
import type { Month, Species } from './species/types';
import { pickLookalikes, quizOptions } from './sightingQuiz';

// "Whose song is this?" (T-247): a bird of the user's county is played, and the user picks it out
// of four photos. Hearing a bird is not seeing it, so a right answer counts as recognised (the
// T-243 badges) and never adds to the almanac.

/** Birds of the county with a recording and a photo, those active this month first. */
export function songCandidates(pool: Species[], withSound: Set<string>, month: Month): Species[] {
  const birds = pool.filter(
    (s) => groupOf(s) === 'bird' && withSound.has(s.id) && photoFor(s) !== null,
  );
  const now = birds.filter((s) => s.activeMonths.includes(month));
  return now.length > 0 ? now : birds;
}

export interface SongRound {
  target: Species;
  options: Species[];
}

/**
 * The round for `seed` (a day and a round number): a target from `candidates` and three other
 * birds with photos. Null when there is nothing to play, or too few birds to make four choices.
 * `avoid` keeps the previous target from coming straight back.
 */
export function songRound(
  candidates: Species[],
  pool: Species[],
  month: Month,
  seed: string,
  avoid?: string,
): SongRound | null {
  const choosable = candidates.length > 1 ? candidates.filter((s) => s.id !== avoid) : candidates;
  if (choosable.length === 0) return null;
  const target = choosable[hashIndex(seed, choosable.length)];
  const lookalikes = pickLookalikes(target, pool, month, 3, seed);
  if (lookalikes.length < 3) return null;
  return { target, options: quizOptions(target, lookalikes, seed) };
}

function hashIndex(seed: string, length: number): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return (h >>> 0) % length;
}

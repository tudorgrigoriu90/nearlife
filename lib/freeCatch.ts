import { seasonKeyOf } from './season';

// Free-catch accounting (T-113). Pure core of the server-side free-catch enforcement (T-075,
// TSD §5b): a free user gets FREE_CATCHES_PER_SEASON catches, the count resets when the season
// key rolls over, and the Full Game entitlement grants unlimited catches (ECONOMY).
//
// This module is intentionally clock-free and storage-free: callers pass the current season
// key (from seasonKeyOf, T-110) and the state derived from the collection. The real enforcement
// is the database's (migration 20261029000001, T-075), never client-trusted; this module is what
// the app shows and checks before it asks.

export const FREE_CATCHES_PER_SEASON = 3; // = the 3 in migration 20261029000001 (test_free_catch_limit.py)

export interface FreeCatchState {
  /** Full Game entitlement → unlimited catches. */
  fullGame: boolean;
  /** Free catches used within `freeCatchSeason`. */
  freeCatchesUsed: number;
  /** Season key the count belongs to; null before the first catch. */
  freeCatchSeason: string | null;
}

/** Used count for the *current* season — 0 if the stored season has rolled over. */
function usedThisSeason(state: FreeCatchState, currentSeasonKey: string): number {
  return state.freeCatchSeason === currentSeasonKey ? state.freeCatchesUsed : 0;
}

/** Remaining free catches this season; Infinity for Full Game owners. */
export function remainingFreeCatches(state: FreeCatchState, currentSeasonKey: string): number {
  if (state.fullGame) return Infinity;
  return Math.max(0, FREE_CATCHES_PER_SEASON - usedThisSeason(state, currentSeasonKey));
}

/** Whether the user may catch right now. */
export function canCatch(state: FreeCatchState, currentSeasonKey: string): boolean {
  return remainingFreeCatches(state, currentSeasonKey) > 0;
}

/**
 * The app's free-catch state, derived from the collection itself (T-200). It used to be a separate
 * counter in component state — reset by every restart, so the limit did not even hold on the
 * device. Counting this season's catches in the persisted collection cannot drift from what was
 * actually caught, and a catch the server refuses is un-caught by the outbox, so it drops out of
 * the count too. The server trigger remains the authority; this only drives the UI.
 */
export function freeCatchStateFrom(
  records: { caughtAt: string | null }[],
  currentSeasonKey: string,
  fullGame = false,
  seasonOfTimestamp: (iso: string) => string = (iso) => seasonKeyOf(new Date(iso)),
): FreeCatchState {
  const used = records.filter(
    (r) => r.caughtAt !== null && seasonOfTimestamp(r.caughtAt) === currentSeasonKey,
  ).length;
  return { fullGame, freeCatchesUsed: used, freeCatchSeason: currentSeasonKey };
}

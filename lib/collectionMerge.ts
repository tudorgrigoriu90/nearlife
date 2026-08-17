import type { CollectionRecord } from './collection';

// Convergent merge for collection records (T-165).
//
// This is what lets the offline outbox get away without a CRDT. A collection row is per-species
// and its timestamps are monotonic and one-way — a species is spotted once, caught once, helped
// once, and none of those ever un-happen. So "earliest non-null wins", applied field by field, is
// commutative, associative and idempotent: replaying the outbox in any order, more than once, or
// against a server copy that raced with it, always lands on the same record.
//
// The alternative — last-write-wins on the whole row — would let a stale server copy erase a catch
// made in a forest an hour earlier, which is the exact data loss this task exists to stop.

/** The earlier of two ISO timestamps, ignoring nulls. */
function earliest(a: string | null, b: string | null): string | null {
  if (a === null) return b;
  if (b === null) return a;
  return a <= b ? a : b;
}

/** Merge two versions of the same species' record. Order-independent. */
export function mergeRecords(a: CollectionRecord, b: CollectionRecord): CollectionRecord {
  const caughtAt = earliest(a.caughtAt, b.caughtAt);
  const helpedAt = earliest(a.helpedAt, b.helpedAt);

  // primeBonus and helpedKind are facts *about* a specific event, so they travel with the
  // timestamp that won rather than being merged independently — OR-ing primeBonus would award a
  // bonus for a catch that never happened inside the active window.
  const caughtSide = caughtAt === null ? null : a.caughtAt === caughtAt ? a : b;
  const helpedSide = helpedAt === null ? null : a.helpedAt === helpedAt ? a : b;

  return {
    speciesId: a.speciesId,
    spottedAt: earliest(a.spottedAt, b.spottedAt),
    caughtAt,
    helpedAt,
    helpedKind: helpedSide?.helpedKind ?? null,
    primeBonus: caughtSide?.primeBonus ?? false,
  };
}

/**
 * Merge two collections by species. A record present on only one side is kept — dropping it is
 * how an offline catch would disappear.
 *
 * Output is sorted by species id so a sync never reshuffles what the user is looking at.
 */
export function mergeLists(
  a: readonly CollectionRecord[],
  b: readonly CollectionRecord[],
): CollectionRecord[] {
  const by = new Map<string, CollectionRecord>();
  for (const record of [...a, ...b]) {
    const existing = by.get(record.speciesId);
    by.set(record.speciesId, existing ? mergeRecords(existing, record) : record);
  }
  return [...by.values()].sort((x, y) => x.speciesId.localeCompare(y.speciesId));
}

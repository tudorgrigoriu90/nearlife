import type { CollectionRecord } from './collection';
import { blankRecord } from './collectionStore';
import { mergeRecords, mergeLists } from './collectionMerge';

// The convergence properties are the whole reason the outbox (T-165) needs no CRDT: a collection
// row is per-species with monotonic, one-way timestamps, so a field-wise earliest-non-null-wins
// merge is commutative, associative and idempotent. If any of these break, a catch made offline
// can be silently overwritten by a stale server copy on the next sync.

const rec = (over: Partial<CollectionRecord>): CollectionRecord => ({
  ...blankRecord('red-fox'),
  ...over,
});

const T1 = '2026-05-01T10:00:00.000Z';
const T2 = '2026-06-01T10:00:00.000Z';

describe('mergeRecords', () => {
  it('keeps the earliest spotting — a later sync cannot push the date forward', () => {
    expect(mergeRecords(rec({ spottedAt: T2 }), rec({ spottedAt: T1 })).spottedAt).toBe(T1);
  });

  it('fills a null field from the other side', () => {
    const merged = mergeRecords(rec({ spottedAt: T1 }), rec({ caughtAt: T2 }));
    expect(merged.spottedAt).toBe(T1);
    expect(merged.caughtAt).toBe(T2);
  });

  it('carries primeBonus from whichever side owns the winning catch', () => {
    // primeBonus describes *that* catch, so it must not be OR-ed independently of caughtAt —
    // that would award a bonus for a catch that never happened in the active window.
    const early = rec({ caughtAt: T1, primeBonus: false });
    const late = rec({ caughtAt: T2, primeBonus: true });
    expect(mergeRecords(early, late).primeBonus).toBe(false);
    expect(mergeRecords(late, early).primeBonus).toBe(false);
  });

  it('carries helpedKind with the winning helpedAt', () => {
    const a = rec({ helpedAt: T1, helpedKind: 'give' });
    const b = rec({ helpedAt: T2, helpedKind: 'protect' });
    expect(mergeRecords(a, b).helpedKind).toBe('give');
    expect(mergeRecords(b, a).helpedKind).toBe('give');
  });

  it('is commutative', () => {
    const a = rec({ spottedAt: T1, caughtAt: T2, primeBonus: true });
    const b = rec({ spottedAt: T2, helpedAt: T1, helpedKind: 'protect' });
    expect(mergeRecords(a, b)).toEqual(mergeRecords(b, a));
  });

  it('is idempotent — re-draining the outbox cannot change the result', () => {
    const a = rec({ spottedAt: T1, caughtAt: T2, primeBonus: true });
    expect(mergeRecords(a, a)).toEqual(a);
    expect(mergeRecords(mergeRecords(a, a), a)).toEqual(a);
  });

  it('is associative', () => {
    const a = rec({ spottedAt: T2 });
    const b = rec({ caughtAt: T1, primeBonus: true });
    const c = rec({ spottedAt: T1, helpedAt: T2, helpedKind: 'give' });
    expect(mergeRecords(mergeRecords(a, b), c)).toEqual(mergeRecords(a, mergeRecords(b, c)));
  });
});

describe('mergeLists', () => {
  it('merges per species and keeps species present on only one side', () => {
    const local = [rec({ speciesId: 'red-fox', caughtAt: T1 })];
    const remote = [
      { ...blankRecord('red-fox'), spottedAt: T2 },
      { ...blankRecord('moose'), spottedAt: T1 },
    ];
    const merged = mergeLists(local, remote);
    expect(merged).toHaveLength(2);
    const fox = merged.find((r) => r.speciesId === 'red-fox');
    expect(fox?.caughtAt).toBe(T1);
    expect(fox?.spottedAt).toBe(T2);
    expect(merged.find((r) => r.speciesId === 'moose')?.spottedAt).toBe(T1);
  });

  it('never drops a local-only record — the offline catch survives a server that has not seen it', () => {
    const merged = mergeLists([rec({ speciesId: 'osprey', caughtAt: T1 })], []);
    expect(merged.map((r) => r.speciesId)).toEqual(['osprey']);
  });

  it('is deterministic in ordering, so renders do not reshuffle after a sync', () => {
    const a = [rec({ speciesId: 'moose' }), rec({ speciesId: 'red-fox' })];
    const b = [rec({ speciesId: 'red-fox' }), rec({ speciesId: 'moose' })];
    expect(mergeLists(a, b).map((r) => r.speciesId)).toEqual(
      mergeLists(b, a).map((r) => r.speciesId),
    );
  });
});

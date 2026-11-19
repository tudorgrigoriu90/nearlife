import type { CollectionRecord } from './collection';
import { caughtThisSeason, tierMarks } from './tierMarks';

// T-298 · review B-29: the card shows which tiers the user reached, and when.

const rec = (over: Partial<CollectionRecord>): CollectionRecord => ({
  speciesId: 'moose',
  spottedAt: null,
  caughtAt: null,
  helpedAt: null,
  helpedKind: null,
  primeBonus: false,
  ...over,
});

describe('tierMarks', () => {
  it('nothing for a species not in the collection', () => {
    expect(tierMarks(null, 'en')).toEqual([]);
  });

  it('lists the reached tiers in order, each with its date', () => {
    const marks = tierMarks(
      rec({ spottedAt: '2026-06-03T10:00:00Z', caughtAt: '2026-06-05T10:00:00Z', helpedAt: '2026-06-06T10:00:00Z' }),
      'en',
    );
    expect(marks.map((m) => m.tier)).toEqual(['spotted', 'caught', 'helped']);
    expect(marks[0].date).toBe(new Date('2026-06-03T10:00:00Z').toLocaleDateString('en', { day: 'numeric', month: 'short' }));
  });

  it('skips tiers not reached', () => {
    expect(tierMarks(rec({ spottedAt: '2026-06-03T10:00:00Z' }), 'sv').map((m) => m.tier)).toEqual(['spotted']);
  });
});

describe('caughtThisSeason', () => {
  it('true only for a catch in the current season', () => {
    expect(caughtThisSeason(rec({ caughtAt: '2026-06-05T10:00:00Z' }), new Date('2026-07-01T00:00:00Z'))).toBe(true);
    expect(caughtThisSeason(rec({ caughtAt: '2026-01-05T10:00:00Z' }), new Date('2026-07-01T00:00:00Z'))).toBe(false);
    expect(caughtThisSeason(rec({}), new Date('2026-07-01T00:00:00Z'))).toBe(false);
    expect(caughtThisSeason(null, new Date())).toBe(false);
  });
});

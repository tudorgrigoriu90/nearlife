import type { CollectionRecord } from './collection';
import { impactSummary } from './impact';

function rec(overrides: Partial<CollectionRecord> & { speciesId: string }): CollectionRecord {
  return {
    spottedAt: '2026-06-01T10:00:00Z',
    caughtAt: null,
    helpedAt: null,
    helpedKind: null,
    primeBonus: false,
    ...overrides,
  };
}

describe('impactSummary', () => {
  it('is all zero with no help pledges', () => {
    expect(impactSummary([rec({ speciesId: 'swift' })])).toEqual({
      helpedSpecies: 0,
      totalPledges: 0,
      give: 0,
      protect: 0,
    });
  });

  it('counts give and protect pledges and distinct helped species', () => {
    const records = [
      rec({ speciesId: 'swift', helpedAt: 'x', helpedKind: 'give' }),
      rec({ speciesId: 'robin', helpedAt: 'x', helpedKind: 'protect' }),
      rec({ speciesId: 'hedgehog', helpedAt: 'x', helpedKind: 'give' }),
      rec({ speciesId: 'osprey' }), // spotted only, not helped
    ];
    expect(impactSummary(records)).toEqual({
      helpedSpecies: 3,
      totalPledges: 3,
      give: 2,
      protect: 1,
    });
  });

  it('aggregates the same way for a community (union of records)', () => {
    const community = [
      rec({ speciesId: 'swift', helpedAt: 'x', helpedKind: 'give' }),
      rec({ speciesId: 'swift', helpedAt: 'x', helpedKind: 'give' }), // another member, same species
    ];
    const summary = impactSummary(community);
    expect(summary.totalPledges).toBe(2); // two pledges
    expect(summary.helpedSpecies).toBe(1); // one distinct species
    expect(summary.give).toBe(2);
  });

  it('counts only pledges made in the given season (T-216)', () => {
    const records = [
      rec({ speciesId: 'swift', helpedAt: '2026-06-10T10:00:00Z', helpedKind: 'give' }),
      rec({ speciesId: 'robin', helpedAt: '2026-10-20T10:00:00Z', helpedKind: 'protect' }),
    ];
    expect(impactSummary(records, '2026-autumn')).toEqual({
      helpedSpecies: 1,
      totalPledges: 1,
      give: 0,
      protect: 1,
    });
  });

  it('groups December with the following winter, like the server season', () => {
    const december = [rec({ speciesId: 'swift', helpedAt: '2026-12-10T10:00:00Z', helpedKind: 'give' })];
    expect(impactSummary(december, '2027-winter').totalPledges).toBe(1);
    expect(impactSummary(december, '2026-winter').totalPledges).toBe(0);
  });
});

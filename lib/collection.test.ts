import {
  CollectionRecord,
  progressSummary,
  spottedIds,
  tierStateFor,
  tierStateOf,
} from './collection';

function record(overrides: Partial<CollectionRecord> & { speciesId: string }): CollectionRecord {
  return {
    spottedAt: null,
    caughtAt: null,
    helpedAt: null,
    helpedKind: null,
    primeBonus: false,
    ...overrides,
  };
}

const swiftAllTiers = record({
  speciesId: 'swift',
  spottedAt: '2026-06-01T10:00:00Z',
  caughtAt: '2026-06-02T10:00:00Z',
  helpedAt: '2026-06-03T10:00:00Z',
  helpedKind: 'give',
  primeBonus: true,
});
const robinSpottedOnly = record({ speciesId: 'robin', spottedAt: '2026-06-01T10:00:00Z' });

describe('tierStateOf', () => {
  it('derives tier flags from which timestamps are set', () => {
    expect(tierStateOf(swiftAllTiers)).toEqual({ spotted: true, caught: true, helped: true });
    expect(tierStateOf(robinSpottedOnly)).toEqual({
      spotted: true,
      caught: false,
      helped: false,
    });
  });
});

describe('tierStateFor', () => {
  const records = [swiftAllTiers, robinSpottedOnly];

  it('returns the record’s state when present', () => {
    expect(tierStateFor(records, 'robin').spotted).toBe(true);
  });

  it('returns an all-false state for an uncollected species', () => {
    expect(tierStateFor(records, 'osprey')).toEqual({
      spotted: false,
      caught: false,
      helped: false,
    });
  });
});

describe('progressSummary', () => {
  it('counts each tier independently', () => {
    expect(progressSummary([swiftAllTiers, robinSpottedOnly])).toEqual({
      spotted: 2,
      caught: 1,
      helped: 1,
    });
  });

  it('is all zero for an empty collection', () => {
    expect(progressSummary([])).toEqual({ spotted: 0, caught: 0, helped: 0 });
  });
});

describe('spottedIds', () => {
  it('collects only ids that have been spotted', () => {
    const notYet = record({ speciesId: 'ghost' }); // no timestamps
    const ids = spottedIds([swiftAllTiers, robinSpottedOnly, notYet]);
    expect(ids.has('swift')).toBe(true);
    expect(ids.has('robin')).toBe(true);
    expect(ids.has('ghost')).toBe(false);
  });
});

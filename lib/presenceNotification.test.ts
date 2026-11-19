import { pickWeightedPresence, presenceWeight, selectFromPresence } from './presenceNotification';
import type { RegionPresence } from './speciesRepository';

const common: RegionPresence = { speciesId: 'common', activeMonths: [6], occurrences: 100_000 };
const rare: RegionPresence = { speciesId: 'rare', activeMonths: [6], occurrences: 10 };
const unquantified: RegionPresence = { speciesId: 'unq', activeMonths: [6], occurrences: 0 };

describe('presenceWeight', () => {
  it('increases with occurrences but log-compresses the range', () => {
    expect(presenceWeight(rare)).toBeCloseTo(1 + Math.log10(11), 6);
    expect(presenceWeight(common)).toBeCloseTo(1 + 5, 4);
    // Compression: 10_000× more observations is only ~3× the weight, not 10_000×.
    expect(presenceWeight(common) / presenceWeight(rare)).toBeLessThan(3);
  });

  it('gives an active-but-unquantified species a nonzero floor', () => {
    expect(presenceWeight(unquantified)).toBe(1);
  });
});

describe('pickWeightedPresence', () => {
  it('returns null on an empty candidate list', () => {
    expect(pickWeightedPresence([], () => 0)).toBeNull();
  });

  it('picks the heavier species low in the [0,1) range', () => {
    // common weight 6, rare weight ~2.04; total ~8.04. rng 0 lands in the first (common) slice.
    expect(pickWeightedPresence([common, rare], () => 0)?.speciesId).toBe('common');
  });

  it('picks the lighter species high in the range', () => {
    expect(pickWeightedPresence([common, rare], () => 0.99)?.speciesId).toBe('rare');
  });
});

describe('selectFromPresence', () => {
  it('season-gates, dedupes, then samples', () => {
    const off: RegionPresence = { speciesId: 'off', activeMonths: [1], occurrences: 500 };
    const picked = selectFromPresence([common, rare, off], 6, new Set(['common']), () => 0);
    // 'off' is out of season, 'common' is collected → only 'rare' remains.
    expect(picked?.speciesId).toBe('rare');
  });

  it('returns null when nothing is active and uncollected', () => {
    expect(selectFromPresence([common], 6, new Set(['common']), () => 0)).toBeNull();
  });
});

// T-268 · review B-04: weight by this month's records when they are known.
describe('presenceWeight in a month', () => {
  const counts = [0, 0, 0, 0, 9, 999, 0, 0, 0, 0, 0, 0];
  const entry = { speciesId: 'x', activeMonths: [5, 6], occurrences: 1008, monthCounts: counts };

  it("uses the month's records, not the all-year total", () => {
    expect(presenceWeight(entry, undefined, 5)).toBeCloseTo(1 + 1, 6); // log10(10)
    expect(presenceWeight(entry, undefined, 6)).toBeCloseTo(1 + 3, 6); // log10(1000)
  });

  it('uses the all-year total without a month or monthly counts', () => {
    expect(presenceWeight(entry)).toBeCloseTo(1 + Math.log10(1009), 6);
    expect(presenceWeight({ ...entry, monthCounts: null }, undefined, 5)).toBeCloseTo(
      1 + Math.log10(1009),
      6,
    );
  });
});

// T-306 · review B-55: the day's one notification is about a species with a name and a photo
// whenever the county has one in season.
describe('selectFromPresence prefers presentable species', () => {
  const bare: RegionPresence = { speciesId: 'bare', activeMonths: [6], occurrences: 1_000_000 };
  const shown: RegionPresence = { speciesId: 'shown', activeMonths: [6], occurrences: 1 };

  it('never picks an unnamed or photo-less species while a presentable one exists', () => {
    for (const r of [0, 0.25, 0.5, 0.75, 0.999]) {
      const picked = selectFromPresence([bare, shown], 6, new Set(), () => r, undefined, (id) => id === 'shown');
      expect(picked?.speciesId).toBe('shown');
    }
  });

  it('falls back to every candidate when none is presentable', () => {
    expect(selectFromPresence([bare], 6, new Set(), () => 0, undefined, () => false)?.speciesId).toBe('bare');
  });

  it('a collected presentable species does not count', () => {
    expect(
      selectFromPresence([bare, shown], 6, new Set(['shown']), () => 0, undefined, (id) => id === 'shown')
        ?.speciesId,
    ).toBe('bare');
  });
});

import {
  pickWeightedPresence,
  presenceWeight,
  selectFromPresence,
} from './presenceNotification';
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

import { weightFor } from './notification';
import { presenceWeight } from './presenceNotification';
import { DEFAULT_TUNING, type NotificationTuning } from './tuning';
import type { Species } from './species/types';
import type { RegionPresence } from './speciesRepository';

const species = (rarity: Species['rarity']): Species => ({
  id: 'x', scientificName: 'X', commonName: 'X', category: 'bird', rarity, activeMonths: [6],
});
const presence = (occurrences: number): RegionPresence => ({
  speciesId: 'x', activeMonths: [6], occurrences,
});

describe('DEFAULT_TUNING', () => {
  it('drives the default weights', () => {
    expect(weightFor(species('rare'))).toBe(DEFAULT_TUNING.rarityFlavor.rare);
    expect(presenceWeight(presence(0))).toBe(DEFAULT_TUNING.presenceWeight.base);
  });
});

describe('tuning overrides', () => {
  it('re-shapes the rarity-band curve without touching engine code', () => {
    const flat: NotificationTuning = { ...DEFAULT_TUNING, rarityFlavor: { common: 1, uncommon: 1, rare: 1 } };
    expect(weightFor(species('rare'), flat)).toBe(1);
    expect(weightFor(species('common'), flat)).toBe(1);
  });

  it('re-shapes the presence-weight base and scale', () => {
    const tuned: NotificationTuning = { ...DEFAULT_TUNING, presenceWeight: { base: 2, scale: 3 } };
    expect(presenceWeight(presence(0), tuned)).toBe(2); // base floor
    expect(presenceWeight(presence(9), tuned)).toBeCloseTo(2 + 3 * 1, 6); // log10(10) = 1
  });
});

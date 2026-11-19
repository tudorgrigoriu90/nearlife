import { presenceWeight } from './presenceNotification';
import { DEFAULT_TUNING, type NotificationTuning } from './tuning';
import type { RegionPresence } from './speciesRepository';

const presence = (occurrences: number): RegionPresence => ({
  speciesId: 'x', activeMonths: [6], occurrences,
});

describe('DEFAULT_TUNING', () => {
  it('drives the default weights', () => {
    expect(presenceWeight(presence(0))).toBe(DEFAULT_TUNING.presenceWeight.base);
  });
});

describe('tuning overrides', () => {
  it('re-shapes the presence-weight base and scale', () => {
    const tuned: NotificationTuning = { ...DEFAULT_TUNING, presenceWeight: { base: 2, scale: 3 } };
    expect(presenceWeight(presence(0), tuned)).toBe(2); // base floor
    expect(presenceWeight(presence(9), tuned)).toBeCloseTo(2 + 3 * 1, 6); // log10(10) = 1
  });
});

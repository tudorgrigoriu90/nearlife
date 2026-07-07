import { isPrimeCatch } from './primeBonus';
import type { Species } from './species/types';

const swift: Species = {
  id: 'common-swift',
  scientificName: 'Apus apus',
  commonName: 'Common swift',
  category: 'bird',
  rarity: 'common',
  activeMonths: [5, 6, 7, 8], // May–August
};

describe('isPrimeCatch', () => {
  it('is true when caught inside the active window', () => {
    expect(isPrimeCatch(swift, new Date('2026-06-15T12:00:00Z'))).toBe(true);
  });

  it('is false when caught out of season', () => {
    expect(isPrimeCatch(swift, new Date('2026-01-15T12:00:00Z'))).toBe(false);
  });

  it('respects the window boundaries', () => {
    expect(isPrimeCatch(swift, new Date('2026-05-01T00:00:00Z'))).toBe(true); // May
    expect(isPrimeCatch(swift, new Date('2026-09-01T00:00:00Z'))).toBe(false); // September
  });
});

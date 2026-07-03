import { KRONOBERG_SPECIES } from './kronoberg';
import type { SpeciesCategory } from './types';

const CATEGORIES: SpeciesCategory[] = ['bird', 'mammal', 'insect', 'plant', 'fish', 'fungus'];
const RARITIES = ['common', 'uncommon', 'rare'];

describe('Kronoberg species seed data', () => {
  it('has roughly 50 species (the prototype target)', () => {
    expect(KRONOBERG_SPECIES.length).toBeGreaterThanOrEqual(45);
  });

  it('has unique kebab-case ids', () => {
    const ids = KRONOBERG_SPECIES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it('has non-empty common and scientific names', () => {
    for (const s of KRONOBERG_SPECIES) {
      expect(s.commonName.trim().length).toBeGreaterThan(0);
      expect(s.scientificName.trim().length).toBeGreaterThan(0);
      // Scientific name is a binomial: at least two words.
      expect(s.scientificName.trim().split(/\s+/).length).toBeGreaterThanOrEqual(2);
    }
  });

  it('uses only known categories and rarities', () => {
    for (const s of KRONOBERG_SPECIES) {
      expect(CATEGORIES).toContain(s.category);
      expect(RARITIES).toContain(s.rarity);
    }
  });

  it('has valid, non-empty, duplicate-free active months in 1..12', () => {
    for (const s of KRONOBERG_SPECIES) {
      expect(s.activeMonths.length).toBeGreaterThan(0);
      expect(new Set(s.activeMonths).size).toBe(s.activeMonths.length);
      for (const m of s.activeMonths) {
        expect(m).toBeGreaterThanOrEqual(1);
        expect(m).toBeLessThanOrEqual(12);
      }
    }
  });

  it('covers each prototype category (bird/insect/plant/mammal) with at least 5 species', () => {
    for (const category of ['bird', 'insect', 'plant', 'mammal'] as const) {
      const count = KRONOBERG_SPECIES.filter((s) => s.category === category).length;
      expect(count).toBeGreaterThanOrEqual(5);
    }
  });

  it('surfaces variety beyond common species (some uncommon/rare)', () => {
    const notCommon = KRONOBERG_SPECIES.filter((s) => s.rarity !== 'common');
    expect(notCommon.length).toBeGreaterThan(0);
  });
});

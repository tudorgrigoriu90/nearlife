import { KRONOBERG_CONTENT } from './content';
import { SV_CONTENT } from './content.sv';
import { KRONOBERG_SPECIES } from './kronoberg';

// Swedish phrasing that would break the honesty rule (real-time presence claim).
const FORBIDDEN_SV = ['just nu', 'här nu', 'just här'];

describe('Swedish species content (T-127)', () => {
  it('covers every species (parity with the English base)', () => {
    for (const s of KRONOBERG_SPECIES) {
      expect(SV_CONTENT[s.id]).toBeDefined();
    }
    expect(Object.keys(SV_CONTENT).length).toBe(Object.keys(KRONOBERG_CONTENT).length);
  });

  it('has no orphan entries without a matching species', () => {
    const ids = new Set(KRONOBERG_SPECIES.map((s) => s.id));
    for (const id of Object.keys(SV_CONTENT)) {
      expect(ids.has(id)).toBe(true);
    }
  });

  it('has all four fields non-empty with speciesId matching the key', () => {
    for (const [id, c] of Object.entries(SV_CONTENT)) {
      expect(c.speciesId).toBe(id);
      for (const field of [c.fact, c.whenAndHow, c.give, c.protect]) {
        expect(field.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('obeys the honesty rule in Swedish (no real-time presence claims)', () => {
    for (const c of Object.values(SV_CONTENT)) {
      const blob = `${c.fact} ${c.whenAndHow} ${c.give} ${c.protect}`.toLowerCase();
      for (const phrase of FORBIDDEN_SV) {
        expect(blob).not.toContain(phrase);
      }
    }
  });
});

import { KRONOBERG_CONTENT } from './content';
import { AR_CONTENT } from './content.ar';
import { AR_NAMES } from './names.ar';
import { KRONOBERG_SPECIES } from './kronoberg';
import { findRealtimeClaims } from '../contentHonesty';
import { commonNameInLocale, contentInLocale } from './localized';

// Arabic content + names (T-154 · F13.3). Mirrors the Swedish suite (T-127): full parity, no
// orphans, every field populated, honesty enforced. Arabic is the first language of the wider
// mother-tongue roster, so this also pins the behaviour the rest of T-154 will follow.

describe('Arabic species content (T-154)', () => {
  it('covers every species (parity with the English base)', () => {
    for (const s of KRONOBERG_SPECIES) {
      expect(AR_CONTENT[s.id]).toBeDefined();
    }
    expect(Object.keys(AR_CONTENT).length).toBe(Object.keys(KRONOBERG_CONTENT).length);
  });

  it('has no orphan entries without a matching species', () => {
    const ids = new Set(KRONOBERG_SPECIES.map((s) => s.id));
    for (const id of Object.keys(AR_CONTENT)) {
      expect(ids.has(id)).toBe(true);
    }
  });

  it('has all four fields non-empty with speciesId matching the key', () => {
    for (const [id, c] of Object.entries(AR_CONTENT)) {
      expect(c.speciesId).toBe(id);
      for (const field of [c.fact, c.whenAndHow, c.give, c.protect]) {
        expect(field.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('is actually in Arabic script, not left as English', () => {
    // Guards the failure mode a parity check alone would miss: an entry copied from the English
    // base to fill the slot would pass every test above.
    const arabicScript = /[؀-ۿ]/;
    for (const c of Object.values(AR_CONTENT)) {
      for (const field of [c.fact, c.whenAndHow, c.give, c.protect]) {
        expect(field).toMatch(arabicScript);
      }
    }
  });

  it('obeys the honesty rule in Arabic (no real-time presence claims)', () => {
    for (const c of Object.values(AR_CONTENT)) {
      for (const field of [c.fact, c.whenAndHow, c.give, c.protect]) {
        expect(findRealtimeClaims(field, 'ar')).toEqual([]);
      }
    }
  });
});

describe('Arabic common names (T-154)', () => {
  it('names every species, in Arabic script', () => {
    const arabicScript = /[؀-ۿ]/;
    for (const s of KRONOBERG_SPECIES) {
      expect(AR_NAMES[s.id]).toBeDefined();
      expect(AR_NAMES[s.id]).toMatch(arabicScript);
    }
  });

  it('has no orphan names', () => {
    const ids = new Set(KRONOBERG_SPECIES.map((s) => s.id));
    for (const id of Object.keys(AR_NAMES)) {
      expect(ids.has(id)).toBe(true);
    }
  });
});

describe('exact-locale lookup (no English fallback)', () => {
  const swift = KRONOBERG_SPECIES.find((s) => s.id === 'common-swift')!;

  it('returns the Arabic content for a seeded language', () => {
    expect(contentInLocale('common-swift', 'ar')).toBe(AR_CONTENT['common-swift']);
    expect(commonNameInLocale(swift, 'ar')).toBe(AR_NAMES['common-swift']);
  });

  it('returns nothing for an unseeded language rather than English', () => {
    // The whole point (T-154): a Swedish-speaking user with Somali as their second language must
    // not be handed English as if it were Somali.
    expect(contentInLocale('common-swift', 'so')).toBeUndefined();
    expect(commonNameInLocale(swift, 'so')).toBeUndefined();
  });

  it('still resolves English to the base name', () => {
    expect(commonNameInLocale(swift, 'en')).toBe(swift.commonName);
  });
});

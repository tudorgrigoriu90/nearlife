import { KRONOBERG_CONTENT, type SpeciesContent } from './content';
import { KRONOBERG_SPECIES } from './kronoberg';
import { CONTENT_BY_LOCALE, NAMES_BY_LOCALE, seededContentLocales } from './localized';
import { findRealtimeClaims, hasHonestyPhrasesFor } from '../contentHonesty';
import {
  contentLocaleStatus,
  isOfferableForDualDisplay,
  type ContentLocale,
} from '../i18n/contentLocale';

// Shared conformance suite for every translated locale (T-158). Adding a language to T-154 used to
// mean copying a ~50-line test file per language; this runs the same contract over whatever is
// registered in CONTENT_BY_LOCALE, so a new language needs only its content, its names, and its
// registrations — and cannot skip the checks by forgetting to write a test.

const FIELDS: (keyof SpeciesContent)[] = ['fact', 'whenAndHow', 'give', 'protect'];

// Scripts that must appear, for locales not written in Latin. Latin-script languages are covered
// by the differs-from-English check below instead, which is the stronger test anyway.
const EXPECTED_SCRIPT: Partial<Record<ContentLocale, RegExp>> = {
  ar: /[؀-ۿ]/, // Arabic
  fa: /[؀-ۿ]/, // Persian / Dari
  ps: /[؀-ۿ]/, // Pashto
  ckb: /[؀-ۿ]/, // Central Kurdish (Sorani)
  ti: /[ሀ-፿]/, // Ge'ez (Tigrinya)
  am: /[ሀ-፿]/, // Ge'ez (Amharic)
  ru: /[Ѐ-ӿ]/, // Cyrillic
  uk: /[Ѐ-ӿ]/,
  sr: /[Ѐ-ӿ]/,
  th: /[฀-๿]/, // Thai
};

describe('every seeded content locale', () => {
  const locales = seededContentLocales();

  it('has at least the alpha languages registered', () => {
    expect(locales).toEqual(expect.arrayContaining(['sv', 'ar']));
  });

  describe.each(locales)('%s', (locale) => {
    const content = CONTENT_BY_LOCALE[locale]!;
    const names = NAMES_BY_LOCALE[locale];

    it('covers every species, with no orphan entries', () => {
      for (const s of KRONOBERG_SPECIES) expect(content[s.id]).toBeDefined();
      expect(Object.keys(content).length).toBe(Object.keys(KRONOBERG_CONTENT).length);
      const ids = new Set(KRONOBERG_SPECIES.map((s) => s.id));
      for (const id of Object.keys(content)) expect(ids.has(id)).toBe(true);
    });

    it('has all four fields non-empty with speciesId matching the key', () => {
      for (const [id, c] of Object.entries(content)) {
        expect(c.speciesId).toBe(id);
        for (const field of FIELDS) expect(c[field].trim().length).toBeGreaterThan(0);
      }
    });

    it('is actually translated, not the English base copied in', () => {
      // The failure mode a parity check alone cannot see: an entry copied from English to fill the
      // slot passes coverage, non-empty and speciesId checks. Works for every script, unlike a
      // character-range test, so Latin-script languages are covered too.
      for (const [id, c] of Object.entries(content)) {
        for (const field of FIELDS) {
          expect(c[field]).not.toBe(KRONOBERG_CONTENT[id]?.[field]);
        }
      }
    });

    const script = EXPECTED_SCRIPT[locale];
    if (script) {
      it('is written in the expected script', () => {
        for (const c of Object.values(content)) {
          for (const field of FIELDS) expect(c[field]).toMatch(script);
        }
      });
    }

    it('declares its own real-time-presence phrases', () => {
      // Without them the honesty check silently falls back to the English list and passes
      // vacuously against non-English text (T-153).
      expect(hasHonestyPhrasesFor(locale)).toBe(true);
    });

    it('obeys the honesty rule (no real-time-presence claims)', () => {
      for (const c of Object.values(content)) {
        for (const field of FIELDS) expect(findRealtimeClaims(c[field], locale)).toEqual([]);
      }
    });

    it('names every species, with no orphan names', () => {
      expect(names).toBeDefined();
      for (const s of KRONOBERG_SPECIES) expect(names![s.id]?.trim().length ?? 0).toBeGreaterThan(0);
      const ids = new Set(KRONOBERG_SPECIES.map((s) => s.id));
      for (const id of Object.keys(names!)) expect(ids.has(id)).toBe(true);
    });

    it('is registered as machine-translated and therefore offerable', () => {
      // Seeded ⇒ status must have moved off `missing`, or the picker would hide a language whose
      // content actually exists. `reviewed` requires native review (T-155) — none has had it.
      expect(contentLocaleStatus(locale)).toBe('machine');
      expect(isOfferableForDualDisplay(locale)).toBe(true);
    });
  });
});

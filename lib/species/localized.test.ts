import { commonNameFor, commonNameInLocale, contentFor, contentInLocale } from './localized';
import { anUnseededContentLocale } from '../i18n/contentLocale';
import { AR_CONTENT } from './content.ar';
import { AR_NAMES } from './names.ar';
import { KRONOBERG_CONTENT } from './content';
import { KRONOBERG_SPECIES } from './kronoberg';
import { SV_NAMES } from './names.sv';

const swift = KRONOBERG_SPECIES.find((s) => s.id === 'common-swift')!;

describe('commonNameFor', () => {
  it('returns the Swedish name for sv', () => {
    expect(commonNameFor(swift, 'sv')).toBe('Tornseglare');
  });

  it('returns the English name (from the species) for en', () => {
    expect(commonNameFor(swift, 'en')).toBe('Common Swift');
  });

  it('falls back to the English name for an untranslated locale', () => {
    expect(commonNameFor(swift, anUnseededContentLocale())).toBe('Common Swift');
  });

  it('uses a name the database supplied for a species outside the bundled set (T-208)', () => {
    const heath = { ...swift, id: 'gbif:5333412', commonName: 'Erica tetralix', names: { sv: 'Klockljung' } };
    expect(commonNameFor(heath, 'sv')).toBe('Klockljung');
    expect(commonNameFor(heath, 'en')).toBe('Erica tetralix');
    expect(commonNameInLocale(heath, 'sv')).toBe('Klockljung');
  });
});

describe('SV_NAMES coverage', () => {
  it('has a non-empty Swedish name for every species', () => {
    for (const s of KRONOBERG_SPECIES) {
      expect(SV_NAMES[s.id]?.trim().length ?? 0).toBeGreaterThan(0);
    }
  });

  it('has no orphan Swedish names', () => {
    const ids = new Set(KRONOBERG_SPECIES.map((s) => s.id));
    for (const id of Object.keys(SV_NAMES)) {
      expect(ids.has(id)).toBe(true);
    }
  });
});

describe('contentFor', () => {
  it('returns English content for en', () => {
    expect(contentFor('common-swift', 'en')).toBe(KRONOBERG_CONTENT['common-swift']);
  });

  it('returns Swedish content for sv (T-127)', () => {
    const sv = contentFor('common-swift', 'sv');
    expect(sv).toBeDefined();
    expect(sv).not.toBe(KRONOBERG_CONTENT['common-swift']);
    expect(sv?.fact).toContain('Tornseglare');
  });

  it('still falls back to English content for an untranslated locale', () => {
    expect(contentFor('common-swift', anUnseededContentLocale())).toBe(
      KRONOBERG_CONTENT['common-swift'],
    );
  });

  it('returns undefined for an unknown species', () => {
    expect(contentFor('made-up', 'en')).toBeUndefined();
  });
});

// ── Exact-locale lookup, no English fallback (T-154) ─────────────────────────
describe('contentInLocale / commonNameInLocale', () => {

  it('returns the content for a seeded language', () => {
    expect(contentInLocale('common-swift', 'ar')).toBe(AR_CONTENT['common-swift']);
    expect(commonNameInLocale(swift, 'ar')).toBe(AR_NAMES['common-swift']);
  });

  it('returns nothing for an unseeded language rather than English', () => {
    // The point of the exact lookup: a Swedish-speaking user with an unseeded second language must
    // not be handed English as if it were their own language.
    const unseeded = anUnseededContentLocale();
    expect(contentInLocale('common-swift', unseeded)).toBeUndefined();
    expect(commonNameInLocale(swift, unseeded)).toBeUndefined();
  });

  it('still resolves English to the base name', () => {
    expect(commonNameInLocale(swift, 'en')).toBe(swift.commonName);
  });

  it('contrasts with contentFor, which deliberately does fall back to English', () => {
    expect(contentFor('common-swift', anUnseededContentLocale())).toBe(
      KRONOBERG_CONTENT['common-swift'],
    );
  });
});

import { commonNameFor, contentFor } from './localized';
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
    expect(commonNameFor(swift, 'de')).toBe('Common Swift');
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

  it('falls back to English content for sv until Swedish content is registered (T-127)', () => {
    expect(contentFor('common-swift', 'sv')).toBe(KRONOBERG_CONTENT['common-swift']);
  });

  it('returns undefined for an unknown species', () => {
    expect(contentFor('made-up', 'en')).toBeUndefined();
  });
});

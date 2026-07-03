import {
  ALPHA_LOCALES,
  BASE_LOCALE,
  createTranslator,
  hasCatalog,
  SUPPORTED_LOCALES,
  t,
} from './index';

describe('i18n runtime', () => {
  it('covers the 24 EU languages with English as base', () => {
    expect(SUPPORTED_LOCALES).toHaveLength(24);
    expect(SUPPORTED_LOCALES).toContain('en');
    expect(SUPPORTED_LOCALES).toContain('sv');
    expect(BASE_LOCALE).toBe('en');
    expect(ALPHA_LOCALES).toEqual(['sv', 'en']);
  });

  it('returns English strings', () => {
    expect(t('en', 'thisWeek.title')).toBe('This week');
  });

  it('returns Swedish strings', () => {
    expect(t('sv', 'thisWeek.title')).toBe('Denna vecka');
    expect(t('sv', 'thisWeek.new')).toBe('NY');
  });

  it('interpolates parameters', () => {
    expect(t('en', 'thisWeek.subtitle', { region: 'Kronoberg', count: 14 })).toBe(
      'Kronoberg · 14 species active in your area this season',
    );
    expect(t('sv', 'thisWeek.subtitle', { region: 'Kronoberg', count: 14 })).toContain('14 arter');
  });

  it('falls back to English for a locale with no catalog yet', () => {
    // German is a supported target but not yet translated → English fallback.
    expect(hasCatalog('de')).toBe(false);
    expect(t('de', 'thisWeek.title')).toBe('This week');
  });

  it('leaves an unknown interpolation placeholder intact', () => {
    expect(t('en', 'thisWeek.subtitle', { region: 'Kronoberg' })).toContain('{count}');
  });

  it('createTranslator binds a locale', () => {
    const tr = createTranslator('sv');
    expect(tr('thisWeek.title')).toBe('Denna vecka');
  });
});

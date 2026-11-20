import {
  ALPHA_LOCALES,
  BASE_LOCALE,
  createTranslator,
  en,
  SUPPORTED_LOCALES,
  sv,
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

// T-309 · review B-42: plural forms for every string that takes {count}.
describe('plural forms', () => {
  it('"1 free catch", "2 free catches", in both languages', () => {
    expect(t('en', 'catch.remaining', { count: 1 })).toBe('1 free catch left this season');
    expect(t('en', 'catch.remaining', { count: 2 })).toBe('2 free catches left this season');
    expect(t('sv', 'catch.remaining', { count: 1 })).toBe('1 gratis fångst kvar denna säsong');
    expect(t('sv', 'catch.remaining', { count: 0 })).toBe('0 gratis fångster kvar denna säsong');
  });

  it('a count already formatted as text still picks its form', () => {
    expect(t('en', 'county.records', { count: '1', county: 'Kronoberg' })).toBe('1 record in Kronoberg.');
    expect(t('en', 'county.records', { count: '1 250', county: 'Kronoberg' })).toBe('1 250 records in Kronoberg.');
  });

  it('every key with {count} has a .one form in English and Swedish', () => {
    const counted = (Object.keys(en) as string[]).filter(
      (k) => !k.endsWith('.one') && (en as Record<string, string>)[k].includes('{count}'),
    );
    expect(counted.length).toBeGreaterThan(10);
    for (const k of counted) {
      expect((en as Record<string, string>)[`${k}.one`]).toBeDefined();
      expect((sv as Record<string, string>)[`${k}.one`]).toBeDefined();
    }
  });
});

// T-369: Hermes on Android has no Intl.PluralRules (found by the emulator flows, T-367). Without
// it the plural forms fall back to the rule English and Swedish share, instead of throwing.
describe('plural forms without Intl.PluralRules', () => {
  const original = Intl.PluralRules;
  beforeEach(() => {
    // @ts-expect-error -- simulating an engine without it
    delete Intl.PluralRules;
  });
  afterEach(() => {
    Intl.PluralRules = original;
  });

  it('still picks "one" for 1 and the other form otherwise', () => {
    const tr = createTranslator('en');
    expect(tr('badge.spotted', { count: 1 })).toBe('1 species spotted');
    const sv = createTranslator('sv');
    expect(sv('badge.spotted', { count: 1 })).toBe('1 art sedd');
    expect(sv('badge.spotted', { count: 3 })).toBe('3 arter sedda');
  });
});

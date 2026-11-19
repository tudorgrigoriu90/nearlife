import { ALPHA_LOCALES } from './index';
import { resolveLocale } from './resolveLocale';

describe('resolveLocale', () => {
  it('maps a region-qualified tag to its base language', () => {
    expect(resolveLocale('sv-SE')).toBe('sv');
    expect(resolveLocale('en-US')).toBe('en');
  });

  it('is case-insensitive', () => {
    expect(resolveLocale('SV')).toBe('sv');
    expect(resolveLocale('SV-se')).toBe('sv');
  });

  it('falls back to English for unsupported or missing tags', () => {
    expect(resolveLocale('zh-CN')).toBe('en');
    expect(resolveLocale(null)).toBe('en');
    expect(resolveLocale(undefined)).toBe('en');
    expect(resolveLocale('')).toBe('en');
  });

  // T-312 · review B-44: interface strings exist in English and Swedish only. A German phone got
  // English menus, German species text and no ticked row in the language picker.
  it('a phone in a language without interface strings gets English, not a mix', () => {
    expect(resolveLocale('de-DE')).toBe('en');
    expect(resolveLocale('pt-BR')).toBe('en');
    expect(resolveLocale('fi')).toBe('en');
    expect(resolveLocale('de-SE')).toBe('en'); // the language decides, not the region
  });

  it('always lands on a language the picker lists, so one row is ticked', () => {
    for (const tag of ['sv-SE', 'en-GB', 'de-DE', 'ar-SE', 'pl', 'so', '', null]) {
      expect(ALPHA_LOCALES).toContain(resolveLocale(tag));
    }
  });
});

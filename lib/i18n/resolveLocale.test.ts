import { resolveLocale } from './resolveLocale';

describe('resolveLocale', () => {
  it('maps a region-qualified tag to its base language', () => {
    expect(resolveLocale('sv-SE')).toBe('sv');
    expect(resolveLocale('en-US')).toBe('en');
    expect(resolveLocale('pt-BR')).toBe('pt'); // Portuguese is supported
  });

  it('accepts a bare supported language code', () => {
    expect(resolveLocale('de')).toBe('de');
    expect(resolveLocale('fi')).toBe('fi');
  });

  it('is case-insensitive', () => {
    expect(resolveLocale('SV')).toBe('sv');
    expect(resolveLocale('SV-se')).toBe('sv');
  });

  it('falls back to English for unsupported or missing tags', () => {
    expect(resolveLocale('zh-CN')).toBe('en'); // not an EU language
    expect(resolveLocale(null)).toBe('en');
    expect(resolveLocale(undefined)).toBe('en');
    expect(resolveLocale('')).toBe('en');
  });
});

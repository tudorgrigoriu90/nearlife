import { SUPPORTED_LOCALES } from './index';
import { LOCALE_STATUS } from './coverage';
import {
  anUnseededContentLocale,
  CONTENT_LOCALES,
  contentLocaleStatus,
  dualDisplayLocales,
  endonymOf,
  IMMIGRANT_LOCALES,
  IMMIGRANT_LOCALE_STATUS,
  isImmigrantLocale,
  isOfferableForDualDisplay,
  LOCALE_ENDONYMS,
  needsMachineTranslationNotice,
  type ContentLocale,
} from './contentLocale';

describe('the content-locale roster', () => {
  it('is the EU roster plus the immigrant roster, with no overlap', () => {
    expect(CONTENT_LOCALES).toHaveLength(SUPPORTED_LOCALES.length + IMMIGRANT_LOCALES.length);
    const eu = new Set<string>(SUPPORTED_LOCALES);
    expect(IMMIGRANT_LOCALES.filter((l) => eu.has(l))).toEqual([]);
  });

  it('has no duplicate codes', () => {
    expect(new Set(CONTENT_LOCALES).size).toBe(CONTENT_LOCALES.length);
  });

  it('covers the languages the Director asked for', () => {
    // Guards against a language being silently dropped from the roster.
    for (const code of ['ar', 'so', 'fa', 'ti', 'ckb', 'kmr', 'ps', 'tr', 'uk'] as const) {
      expect(IMMIGRANT_LOCALES).toContain(code);
    }
  });

  it('classifies immigrant vs EU locales', () => {
    expect(isImmigrantLocale('ar')).toBe(true);
    expect(isImmigrantLocale('so')).toBe(true);
    expect(isImmigrantLocale('sv')).toBe(false);
    expect(isImmigrantLocale('en')).toBe(false);
  });
});

describe('endonyms', () => {
  it('gives every content locale a non-empty name in its own script', () => {
    for (const locale of CONTENT_LOCALES) {
      expect(LOCALE_ENDONYMS[locale]?.length ?? 0).toBeGreaterThan(0);
    }
  });

  it('uses the native script, not the English exonym', () => {
    expect(endonymOf('ar')).toBe('العربية');
    expect(endonymOf('ti')).toBe('ትግርኛ');
    expect(endonymOf('sv')).toBe('Svenska');
  });

  it('falls back to the code rather than rendering blank', () => {
    expect(endonymOf('zz' as ContentLocale)).toBe('zz');
  });
});

describe('translation status', () => {
  it('reads EU status from the existing coverage matrix', () => {
    expect(contentLocaleStatus('en')).toBe(LOCALE_STATUS.en);
    expect(contentLocaleStatus('sv')).toBe(LOCALE_STATUS.sv);
  });

  it('reads immigrant-roster status from its own matrix', () => {
    expect(contentLocaleStatus('ar')).toBe(IMMIGRANT_LOCALE_STATUS.ar);
  });

  it('marks Arabic as machine-translated — the first seeded language (T-154)', () => {
    expect(IMMIGRANT_LOCALE_STATUS.ar).toBe('machine');
  });

  it('never claims `reviewed` for an immigrant-roster language', () => {
    // Each flips to `machine` as T-154 seeds it; `reviewed` needs native review (T-155), which
    // none has had.
    for (const locale of IMMIGRANT_LOCALES) {
      expect(IMMIGRANT_LOCALE_STATUS[locale]).not.toBe('reviewed');
    }
  });
});

describe('dual-display policy (T-152: machine translation is sufficient)', () => {
  it('offers a machine-translated locale — no native-review gate', () => {
    // sv is `machine` status: barred from being the primary UI language (T-125), but fine here.
    expect(contentLocaleStatus('sv')).toBe('machine');
    expect(isOfferableForDualDisplay('sv')).toBe(true);
  });

  it('offers a reviewed locale', () => {
    expect(isOfferableForDualDisplay('en')).toBe(true);
  });

  it('offers Arabic now that it is seeded', () => {
    expect(isOfferableForDualDisplay('ar')).toBe(true);
    expect(dualDisplayLocales()).toContain('ar');
  });

  it('does not offer a locale with no content at all', () => {
    const unseeded = anUnseededContentLocale();
    expect(isOfferableForDualDisplay(unseeded)).toBe(false);
    expect(dualDisplayLocales()).not.toContain(unseeded);
  });

  it('lists only offerable locales, in roster order', () => {
    const offerable = dualDisplayLocales();
    expect(offerable).toEqual(CONTENT_LOCALES.filter(isOfferableForDualDisplay));
    expect(offerable).toEqual(expect.arrayContaining(['en', 'sv']));
  });

  it('requires the machine-translated notice only for machine-status content', () => {
    expect(needsMachineTranslationNotice('sv')).toBe(true);
    expect(needsMachineTranslationNotice('ar')).toBe(true);
    expect(needsMachineTranslationNotice('en')).toBe(false);
    // A locale with no content never renders, so it needs no notice.
    expect(needsMachineTranslationNotice(anUnseededContentLocale())).toBe(false);
  });
});

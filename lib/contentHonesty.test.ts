import { findRealtimeClaims, hasHonestyPhrasesFor, isHonest } from './contentHonesty';
import {
  CONTENT_LOCALES,
  contentLocaleStatus,
  dualDisplayLocales,
  needsMachineTranslationNotice,
} from './i18n/contentLocale';
import { en, t, type TranslationKey } from './i18n';
import { KRONOBERG_CONTENT } from './species/content';
import { SV_CONTENT } from './species/content.sv';
import type { SpeciesContent } from './species/content';

const CONTENT_FIELDS: (keyof SpeciesContent)[] = ['fact', 'whenAndHow', 'give', 'protect'];

describe('findRealtimeClaims', () => {
  it('detects a real-time-presence claim, case-insensitively', () => {
    expect(findRealtimeClaims('You can see it HERE RIGHT NOW by the lake', 'en')).toContain(
      'here right now',
    );
    expect(isHonest('Active in your region this season', 'en')).toBe(true);
  });

  it('detects Swedish real-time claims', () => {
    expect(findRealtimeClaims('Den är här just nu', 'sv')).toContain('just nu');
    expect(isHonest('Aktiv i din region den här säsongen', 'sv')).toBe(true);
  });
});

describe('all English species content is honest', () => {
  for (const [speciesId, content] of Object.entries(KRONOBERG_CONTENT)) {
    for (const field of CONTENT_FIELDS) {
      it(`${speciesId}.${field}`, () => {
        expect(findRealtimeClaims(content[field], 'en')).toEqual([]);
      });
    }
  }
});

describe('all Swedish species content is honest', () => {
  for (const [speciesId, content] of Object.entries(SV_CONTENT)) {
    for (const field of CONTENT_FIELDS) {
      it(`${speciesId}.${field}`, () => {
        expect(findRealtimeClaims(content[field], 'sv')).toEqual([]);
      });
    }
  }
});

describe('all UI catalog strings are honest (en + sv)', () => {
  // `thisWeek.honesty` is the disclaimer that *quotes* the banned phrase to promise we never make
  // the claim ("Active this season, never 'here right now'") — meta-copy about the rule, exempt.
  const EXEMPT_KEYS = new Set<TranslationKey>(['thisWeek.honesty']);
  const keys = (Object.keys(en) as TranslationKey[]).filter((k) => !EXEMPT_KEYS.has(k));

  it('English catalog', () => {
    for (const key of keys) expect(findRealtimeClaims(t('en', key), 'en')).toEqual([]);
  });
  it('Swedish catalog', () => {
    for (const key of keys) expect(findRealtimeClaims(t('sv', key), 'sv')).toEqual([]);
  });
});

// ── Dual-display honesty (T-153 · F13.3) ─────────────────────────────────────
describe('dual-display honesty enforcement', () => {
  it('every offerable second language declares its own banned-phrase list', () => {
    // The load-bearing check. findRealtimeClaims falls back to the ENGLISH phrase list for an
    // unknown locale, and English substrings never appear in Arabic or Tigrinya text — so a new
    // language shipped without its own phrases would pass the honesty suite vacuously, reporting
    // "honest" without having examined a single word. This fails the build instead, which is why
    // T-154 must add phrases alongside each language's content.
    const missing = dualDisplayLocales().filter((locale) => !hasHonestyPhrasesFor(locale));
    expect(missing).toEqual([]);
  });

  it('does not silently pass unknown-locale text through the English list', () => {
    // Documents the trap the check above guards, using a language that has no phrase list yet:
    // Somali text claiming presence is NOT caught by the English phrases, so the fallback must
    // never be relied on for a real language.
    expect(hasHonestyPhrasesFor('so')).toBe(false);
    expect(findRealtimeClaims('waa halkan hadda', 'so')).toEqual([]);
    // Arabic, by contrast, now has its own list — and it genuinely catches an Arabic overclaim.
    expect(hasHonestyPhrasesFor('ar')).toBe(true);
    expect(findRealtimeClaims('إنه هنا الآن قرب البحيرة', 'ar')).toContain('هنا الآن');
  });

  it('machine-status content is always flagged for the machine-translated notice', () => {
    // T-152 allows unreviewed content in dual display; the honesty requirement it keeps is the
    // label. Anything offerable is either reviewed or labelled — never unlabelled-and-unreviewed.
    for (const locale of dualDisplayLocales()) {
      const status = contentLocaleStatus(locale);
      expect(status === 'reviewed' || needsMachineTranslationNotice(locale)).toBe(true);
    }
  });

  it('a locale with no content is never offered as a second language', () => {
    for (const locale of CONTENT_LOCALES) {
      if (contentLocaleStatus(locale) === 'missing') {
        expect(dualDisplayLocales()).not.toContain(locale);
      }
    }
  });
});

import {
  FSI,
  isolate,
  isRtlLocale,
  PDI,
  RTL_CONTENT_LOCALES,
  stripIsolates,
  textAlignFor,
  writingDirectionFor,
} from './bidi';
import { CONTENT_LOCALES } from './contentLocale';

// Real strings, not placeholders — a Latin stand-in would pass every one of these tests while the
// actual feature broke on a device.
const ARABIC = 'أبو الحناء الأوروبي';
const PERSIAN = 'سینه‌سرخ اروپایی';

describe('isRtlLocale', () => {
  it('flags the Arabic-script languages in the roster', () => {
    expect(isRtlLocale('ar')).toBe(true);
    expect(isRtlLocale('fa')).toBe(true);
    expect(isRtlLocale('ps')).toBe(true);
    expect(isRtlLocale('ckb')).toBe(true);
  });

  it('treats script, not language family, as what decides direction', () => {
    // Same language family, opposite scripts: Sorani is Arabic-script, Kurmanji is Latin-script.
    expect(isRtlLocale('ckb')).toBe(true);
    expect(isRtlLocale('kmr')).toBe(false);
  });

  it('does not flag non-Latin but left-to-right scripts', () => {
    // Ge'ez (Tigrinya, Amharic), Thai, Greek and Cyrillic are all LTR.
    for (const locale of ['ti', 'am', 'th', 'el', 'bg', 'ru'] as const) {
      expect(isRtlLocale(locale)).toBe(false);
    }
  });

  it('leaves every EU language left-to-right (the existing app assumption holds there)', () => {
    for (const locale of ['en', 'sv', 'de', 'fr', 'pl', 'mt', 'ga'] as const) {
      expect(isRtlLocale(locale)).toBe(false);
    }
  });

  it('only claims RTL for locales that are actually in the roster', () => {
    for (const locale of RTL_CONTENT_LOCALES) {
      expect(CONTENT_LOCALES).toContain(locale);
    }
  });
});

describe('writingDirectionFor / textAlignFor', () => {
  it('gives an RTL locale its own direction and edge', () => {
    expect(writingDirectionFor('ar')).toBe('rtl');
    expect(textAlignFor('ar')).toBe('right');
  });

  it('leaves LTR locales untouched', () => {
    expect(writingDirectionFor('sv')).toBe('ltr');
    expect(textAlignFor('sv')).toBe('left');
  });
});

describe('isolate', () => {
  it('wraps text in first-strong-isolate / pop-directional-isolate', () => {
    expect(isolate('abc')).toBe(`${FSI}abc${PDI}`);
  });

  it('isolates RTL text so its direction cannot leak into neighbouring text', () => {
    const wrapped = isolate(ARABIC);
    expect(wrapped.startsWith(FSI)).toBe(true);
    expect(wrapped.endsWith(PDI)).toBe(true);
    expect(stripIsolates(wrapped)).toBe(ARABIC);
  });

  it('adds nothing around an empty string', () => {
    expect(isolate('')).toBe('');
  });

  it('round-trips through stripIsolates', () => {
    for (const text of ['plain', ARABIC, PERSIAN, 'Rödhake']) {
      expect(stripIsolates(isolate(text))).toBe(text);
    }
  });

  it('keeps a delimiter anchored between an LTR and an RTL half', () => {
    // The reason isolates exist here: the neutral " / " must stay between the two halves rather
    // than being absorbed into the RTL run. Both halves isolated ⇒ the delimiter sits at top level.
    const joined = `${isolate('European Robin')} / ${isolate(ARABIC)}`;
    expect(joined).toBe(`${FSI}European Robin${PDI} / ${FSI}${ARABIC}${PDI}`);
    // The delimiter is outside both isolates — not swallowed by either.
    expect(joined.split(PDI)[1].startsWith(' / ')).toBe(true);
    expect(stripIsolates(joined)).toBe(`European Robin / ${ARABIC}`);
  });
});

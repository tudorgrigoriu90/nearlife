import {
  DUAL_TITLE_DELIMITER,
  dualSegments,
  dualTitle,
  hasSecondary,
  type DualTextInput,
} from './dualLanguageFormat';
import { FSI, PDI, stripIsolates } from './i18n/bidi';

const ARABIC = 'أبو الحناء الأوروبي';

const pair: DualTextInput = {
  primary: 'European Robin',
  primaryLocale: 'en',
  secondary: 'Rödhake',
  secondaryLocale: 'sv',
};

describe('dualTitle', () => {
  it('joins the two names with a slash', () => {
    expect(stripIsolates(dualTitle(pair))).toBe('European Robin / Rödhake');
    expect(DUAL_TITLE_DELIMITER).toBe(' / ');
  });

  it('isolates each half so an RTL name cannot drag the delimiter across', () => {
    const title = dualTitle({ ...pair, secondary: ARABIC, secondaryLocale: 'ar' });
    expect(title).toBe(`${FSI}European Robin${PDI} / ${FSI}${ARABIC}${PDI}`);
    expect(stripIsolates(title)).toBe(`European Robin / ${ARABIC}`);
  });

  it('returns the primary untouched when there is no secondary — no dangling delimiter', () => {
    for (const secondary of [null, undefined, '', '   ']) {
      const title = dualTitle({ ...pair, secondary });
      expect(title).toBe('European Robin');
      expect(title).not.toContain('/');
      expect(title).not.toContain(FSI);
    }
  });

  it('returns the primary alone when no secondary locale is set', () => {
    expect(dualTitle({ ...pair, secondaryLocale: null })).toBe('European Robin');
  });

  it('does not repeat an identical name twice', () => {
    // Many species names are the same across languages (e.g. scientific-derived names).
    expect(dualTitle({ ...pair, secondary: 'European Robin' })).toBe('European Robin');
  });

  it('ignores whitespace-only differences when deciding it is a duplicate', () => {
    expect(dualTitle({ ...pair, secondary: '  European Robin  ' })).toBe('European Robin');
  });
});

describe('dualSegments', () => {
  it('returns primary first, then the mother tongue', () => {
    expect(dualSegments(pair)).toEqual([
      { text: 'European Robin', locale: 'en', isSecondary: false },
      { text: 'Rödhake', locale: 'sv', isSecondary: true },
    ]);
  });

  it('keeps each half in its own segment so an RTL half can be styled separately', () => {
    const segments = dualSegments({ ...pair, secondary: ARABIC, secondaryLocale: 'ar' });
    expect(segments).toHaveLength(2);
    expect(segments[1]).toEqual({ text: ARABIC, locale: 'ar', isSecondary: true });
  });

  it('returns a single segment when there is no secondary', () => {
    expect(dualSegments({ ...pair, secondary: null })).toEqual([
      { text: 'European Robin', locale: 'en', isSecondary: false },
    ]);
  });

  it('never emits a blank or undefined second paragraph', () => {
    for (const secondary of [null, undefined, '', '  \n ']) {
      const segments = dualSegments({ ...pair, secondary });
      expect(segments).toHaveLength(1);
      expect(segments.every((s) => s.text.trim() !== '')).toBe(true);
    }
  });

  it('trims the secondary text it renders', () => {
    expect(dualSegments({ ...pair, secondary: '  Rödhake  ' })[1].text).toBe('Rödhake');
  });

  it('preserves paragraph order for long body text (sequential, not interleaved)', () => {
    const segments = dualSegments({
      primary: 'First sentence. Second sentence.',
      primaryLocale: 'en',
      secondary: 'Första meningen. Andra meningen.',
      secondaryLocale: 'sv',
    });
    expect(segments.map((s) => s.text)).toEqual([
      'First sentence. Second sentence.',
      'Första meningen. Andra meningen.',
    ]);
  });
});

describe('hasSecondary', () => {
  it('reports whether a second half actually rendered', () => {
    expect(hasSecondary(pair)).toBe(true);
    expect(hasSecondary({ ...pair, secondary: null })).toBe(false);
    expect(hasSecondary({ ...pair, secondary: 'European Robin' })).toBe(false);
  });
});

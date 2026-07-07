import { findRealtimeClaims, isHonest } from './contentHonesty';
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

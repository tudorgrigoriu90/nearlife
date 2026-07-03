import { SUPPORTED_LOCALES } from './index';
import {
  isLiveForUsers,
  liveLocales,
  LOCALE_STATUS,
  translationProgress,
} from './coverage';

describe('locale coverage', () => {
  it('declares a status for every supported locale', () => {
    for (const locale of SUPPORTED_LOCALES) {
      expect(LOCALE_STATUS[locale]).toBeDefined();
    }
  });

  it('marks English as reviewed and live', () => {
    expect(LOCALE_STATUS.en).toBe('reviewed');
    expect(isLiveForUsers('en')).toBe(true);
  });

  it('does not yet ship Swedish (content pending native review)', () => {
    expect(LOCALE_STATUS.sv).not.toBe('missing'); // in progress
    expect(isLiveForUsers('sv')).toBe(false); // not until reviewed (T-127 + T-125)
  });

  it('never offers a locale that is missing or machine-only', () => {
    expect(isLiveForUsers('de')).toBe(false);
    expect(liveLocales()).toContain('en');
    expect(liveLocales()).not.toContain('de');
    expect(liveLocales()).not.toContain('sv');
  });

  it('reports progress counts that sum to the supported total', () => {
    const p = translationProgress();
    expect(p.missing + p.machine + p.reviewed).toBe(SUPPORTED_LOCALES.length);
    expect(p.reviewed).toBeGreaterThanOrEqual(1); // at least English
  });
});

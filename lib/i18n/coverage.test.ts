import { SUPPORTED_LOCALES } from './index';
import { LOCALE_STATUS } from './coverage';

describe('locale coverage', () => {
  it('declares a status for every supported locale', () => {
    for (const locale of SUPPORTED_LOCALES) {
      expect(LOCALE_STATUS[locale]).toBeDefined();
    }
  });

  it('marks English, the source of every text, as reviewed', () => {
    expect(LOCALE_STATUS.en).toBe('reviewed');
  });

  it('has Swedish content in progress', () => {
    expect(LOCALE_STATUS.sv).not.toBe('missing');
  });
});

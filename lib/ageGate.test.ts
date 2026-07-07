import { agePath, ageFromBirthYear, DIGITAL_CONSENT_AGE_SE, meetsDigitalConsentAge } from './ageGate';

describe('age gate (Sweden GDPR-K, 13)', () => {
  it('computes approximate age from birth year', () => {
    expect(ageFromBirthYear(2010, 2026)).toBe(16);
  });

  it('meets the threshold at exactly the consent age', () => {
    expect(meetsDigitalConsentAge(2013, 2026)).toBe(true); // 13
    expect(meetsDigitalConsentAge(2014, 2026)).toBe(false); // 12
  });

  it('routes below-threshold users to the restricted path', () => {
    expect(agePath(2005, 2026)).toBe('full'); // 21
    expect(agePath(2018, 2026)).toBe('restricted'); // 8
  });

  it('uses Sweden 13 by default and accepts an override', () => {
    expect(DIGITAL_CONSENT_AGE_SE).toBe(13);
    expect(agePath(2010, 2026, 16)).toBe('full'); // 16, threshold 16
    expect(agePath(2011, 2026, 16)).toBe('restricted'); // 15, threshold 16
  });
});

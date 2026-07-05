import {
  CONSENT_KINDS,
  DEFAULT_CONSENT,
  grant,
  hasConsent,
  revoke,
  setConsent,
} from './consent';

describe('consent', () => {
  it('defaults every consent to off (no pre-ticked boxes)', () => {
    for (const kind of CONSENT_KINDS) expect(hasConsent(DEFAULT_CONSENT, kind)).toBe(false);
  });

  it('has no advertising consent (no ads ship)', () => {
    expect(CONSENT_KINDS).not.toContain('ads' as never);
    expect(CONSENT_KINDS).toEqual(['location', 'notifications', 'analytics']);
  });

  it('grants and revokes one kind without touching others', () => {
    const granted = grant(DEFAULT_CONSENT, 'location');
    expect(hasConsent(granted, 'location')).toBe(true);
    expect(hasConsent(granted, 'notifications')).toBe(false);

    const revoked = revoke(granted, 'location');
    expect(hasConsent(revoked, 'location')).toBe(false);
  });

  it('does not mutate the input state', () => {
    const before = { ...DEFAULT_CONSENT };
    grant(DEFAULT_CONSENT, 'analytics');
    expect(DEFAULT_CONSENT).toEqual(before);
  });

  it('mirrors an explicit value via setConsent', () => {
    expect(hasConsent(setConsent(DEFAULT_CONSENT, 'notifications', true), 'notifications')).toBe(true);
    expect(hasConsent(setConsent(DEFAULT_CONSENT, 'notifications', false), 'notifications')).toBe(false);
  });
});

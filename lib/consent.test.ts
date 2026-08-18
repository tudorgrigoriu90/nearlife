import {
  applyConsentChange,
  CONSENT_KINDS,
  DEFAULT_CONSENT,
  grant,
  hasConsent,
  revoke,
  type ConsentState,
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

// T-197: the minor rule used to live in an untested closure inside App.tsx — "minors can never
// enable analytics", the T-089 minimal-data path. A safety rule that only exists inside a component
// handler is one refactor away from disappearing without a single test going red.
describe('applyConsentChange', () => {
  const on: ConsentState = { location: true, notifications: true, analytics: true };
  const off: ConsentState = { location: false, notifications: false, analytics: false };

  it('applies an ordinary change', () => {
    expect(applyConsentChange(off, 'location', true, false).location).toBe(true);
  });

  it('refuses to enable analytics for a minor', () => {
    expect(applyConsentChange(off, 'analytics', true, true)).toEqual(off);
  });

  it('lets a minor disable analytics — the lock is one-way', () => {
    // Locking the toggle entirely would trap a minor whose analytics were somehow on, which is the
    // opposite of what a minimal-data path is for.
    expect(applyConsentChange(on, 'analytics', false, true).analytics).toBe(false);
  });

  it('does not restrict a minor on location or notifications', () => {
    // Those are functional consents the app asks for openly; only analytics is age-gated.
    expect(applyConsentChange(off, 'location', true, true).location).toBe(true);
    expect(applyConsentChange(off, 'notifications', true, true).notifications).toBe(true);
  });

  it('returns the same state object identity-wise unchanged when refused, so no save is triggered', () => {
    const result = applyConsentChange(off, 'analytics', true, true);
    expect(result).toBe(off);
  });

  it('never mutates the state it was given', () => {
    const before = { ...off };
    applyConsentChange(off, 'location', true, false);
    expect(off).toEqual(before);
  });
});

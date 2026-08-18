// Granular consent (T-088 core · PRIVACY §2, GDPR). Separate, independent opt-ins for location,
// notifications, and analytics — each defaults to OFF (no pre-ticked boxes), and features gate on
// the relevant consent. There is deliberately NO advertising consent: no ads ship (invariant #3).
// Pure + serializable so consent is first-class user data (persisted with the profile) and the
// same state drives the UI, feature gates, and the export/delete flows (T-092/T-093).

export type ConsentKind = 'location' | 'notifications' | 'analytics';

export const CONSENT_KINDS: ConsentKind[] = ['location', 'notifications', 'analytics'];

export type ConsentState = Record<ConsentKind, boolean>;

/** No pre-ticked boxes: every consent starts denied (GDPR — consent must be an opt-in). */
export const DEFAULT_CONSENT: ConsentState = {
  location: false,
  notifications: false,
  analytics: false,
};

export function hasConsent(state: ConsentState, kind: ConsentKind): boolean {
  return state[kind] === true;
}

export function grant(state: ConsentState, kind: ConsentKind): ConsentState {
  return { ...state, [kind]: true };
}

export function revoke(state: ConsentState, kind: ConsentKind): ConsentState {
  return { ...state, [kind]: false };
}

/** Set an explicit value (e.g. mirroring an OS permission result back into consent). */
export function setConsent(state: ConsentState, kind: ConsentKind, value: boolean): ConsentState {
  return { ...state, [kind]: value };
}

/**
 * A consent change, with the age gate applied (T-089/T-197).
 *
 * Returns the *same* state object when the change is refused, so a caller can skip persisting a
 * no-op. The lock is deliberately one-way: a minor can always turn analytics **off**, because
 * trapping them with it on is the opposite of what a minimal-data path is for. Only analytics is
 * age-gated — location and notifications are functional consents the app asks for openly.
 */
export function applyConsentChange(
  state: ConsentState,
  kind: ConsentKind,
  value: boolean,
  analyticsLocked: boolean,
): ConsentState {
  if (analyticsLocked && kind === 'analytics' && value) return state;
  return setConsent(state, kind, value);
}

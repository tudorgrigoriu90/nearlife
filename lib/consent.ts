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

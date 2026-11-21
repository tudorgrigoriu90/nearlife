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

/** Set an explicit value (e.g. mirroring an OS permission result back into consent). */
export function setConsent(state: ConsentState, kind: ConsentKind, value: boolean): ConsentState {
  return { ...state, [kind]: value };
}

/**
 * The consents an under-13 account never grants (T-089 analytics · T-281 notifications). Push
 * stores a device token on the server, which is consent-based processing of a child's data (GDPR
 * Art. 8) until a parental gate exists. Location stays: it is resolved on the phone and only the
 * county leaves it.
 */
export const RESTRICTED_KINDS: readonly ConsentKind[] = ['analytics', 'notifications'];

/**
 * A consent change, with the age gate applied (T-089/T-197/T-281).
 *
 * Returns the *same* state object when the change is refused, so a caller can skip persisting a
 * no-op. The lock is deliberately one-way: a minor can always turn a restricted kind **off**,
 * because trapping them with it on is the opposite of what a minimal-data path is for.
 */
export function applyConsentChange(
  state: ConsentState,
  kind: ConsentKind,
  value: boolean,
  restricted: boolean,
): ConsentState {
  if (restricted && value && RESTRICTED_KINDS.includes(kind)) return state;
  return setConsent(state, kind, value);
}

/** Every restricted kind off (T-281); the same object when they already are. */
export function restrictConsent(state: ConsentState): ConsentState {
  if (RESTRICTED_KINDS.every((kind) => !state[kind])) return state;
  const next = { ...state };
  for (const kind of RESTRICTED_KINDS) next[kind] = false;
  return next;
}

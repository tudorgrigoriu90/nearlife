import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONSENT_KINDS, DEFAULT_CONSENT, type ConsentState } from './consent';

// Consent persistence (T-088 · PRIVACY §2, GDPR). The user's granular opt-ins must survive app
// restarts — a consent record is itself a GDPR obligation. Mirrors the collectionStore seam: pure
// parse/serialize helpers (unit-testable, no storage), an in-memory store for tests/offline, and an
// AsyncStorage-backed store the app runs on. Stored **locally** on-device (no coordinates, no PII);
// syncing consent to the Supabase profile pairs with the account/export flows (T-092/T-093) later.
//
// Hard rule preserved through persistence: only an explicit `true` grants a consent. Missing keys,
// corrupt JSON, or any non-true value all decay to OFF — "no pre-ticked boxes" survives bad data.

export const CONSENT_STORAGE_KEY = 'nearby.consent.v1';

/** Parse a stored blob into a valid ConsentState. Never throws; unknown/invalid → all-off default. */
export function parseConsent(raw: string | null): ConsentState {
  const out: ConsentState = { ...DEFAULT_CONSENT };
  if (!raw) return out;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return out;
  }
  if (typeof parsed !== 'object' || parsed === null) return out;
  const rec = parsed as Record<string, unknown>;
  for (const kind of CONSENT_KINDS) {
    // Only a literal `true` grants — anything else (false, missing, "true", 1) stays denied.
    if (rec[kind] === true) out[kind] = true;
  }
  return out;
}

/** Serialize only the known consent kinds (drops any stray keys, coerces to strict booleans). */
export function serializeConsent(state: ConsentState): string {
  const clean: ConsentState = { ...DEFAULT_CONSENT };
  for (const kind of CONSENT_KINDS) clean[kind] = state[kind] === true;
  return JSON.stringify(clean);
}

export interface ConsentStore {
  load(): Promise<ConsentState>;
  save(state: ConsentState): Promise<void>;
}

/** In-memory store for tests and offline defaults; round-trips through the same pure helpers. */
export class InMemoryConsentStore implements ConsentStore {
  private raw: string | null;

  constructor(initial: ConsentState = DEFAULT_CONSENT) {
    this.raw = serializeConsent(initial);
  }

  async load(): Promise<ConsentState> {
    return parseConsent(this.raw);
  }

  async save(state: ConsentState): Promise<void> {
    this.raw = serializeConsent(state);
  }
}

/** Device-local persistence via AsyncStorage. Storage failures degrade to the safe all-off default
 * on load and are swallowed on save (consent still holds in memory for the session). */
export class AsyncStorageConsentStore implements ConsentStore {
  async load(): Promise<ConsentState> {
    try {
      return parseConsent(await AsyncStorage.getItem(CONSENT_STORAGE_KEY));
    } catch {
      return { ...DEFAULT_CONSENT };
    }
  }

  async save(state: ConsentState): Promise<void> {
    try {
      await AsyncStorage.setItem(CONSENT_STORAGE_KEY, serializeConsent(state));
    } catch {
      // Best-effort: a failed write leaves the in-memory consent authoritative for this session.
    }
  }
}

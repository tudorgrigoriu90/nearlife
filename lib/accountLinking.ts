import type { SupabaseClient } from '@supabase/supabase-js';

// Link an email to an anonymous user (T-133, PRIVACY §1). Anonymous sessions survive app restarts
// (AsyncStorage) but not reinstall or a second device. Linking an email turns the anonymous account
// into a durable one so a user's collection survives reinstall/cross-device — the other half of
// T-027. Kept optional and off the onboarding path (Settings entry point) so first-run stays
// frictionless. The pure core here validates + guards the link; the actual `updateUser({ email })`
// call lives behind `AuthGateway` so the state machine is unit-testable without a live Supabase.

/** The signed-in user as the link flow needs to see it. */
export interface AuthIdentity {
  userId: string;
  /** Present once an email is linked; `null` while the user is still anonymous. */
  email: string | null;
  isAnonymous: boolean;
}

export interface AuthGateway {
  currentIdentity(): Promise<AuthIdentity | null>;
  /** Start email linking (Supabase sends a confirmation); throws on failure. */
  updateEmail(email: string): Promise<void>;
}

export type LinkFailure = 'invalid-email' | 'not-signed-in' | 'already-linked' | 'link-failed';

export type LinkEmailResult = { ok: true; email: string } | { ok: false; reason: LinkFailure };

// Pragmatic single-line check: exactly one @, non-empty local part, a dotted domain, no spaces.
// Deliberately permissive — Supabase (and the confirmation email) is the real validator; this just
// catches obvious typos before a network round-trip.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Normalize an email for comparison/storage: trim + lowercase. */
export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isValidEmail(raw: string): boolean {
  return EMAIL_RE.test(normalizeEmail(raw));
}

/**
 * Link `rawEmail` to the current anonymous user. Guards in order: valid email → signed in → not
 * already linked → the gateway call. Any gateway throw becomes `link-failed` so the caller shows a
 * retryable message rather than an unhandled rejection.
 */
export async function linkEmail(gateway: AuthGateway, rawEmail: string): Promise<LinkEmailResult> {
  const email = normalizeEmail(rawEmail);
  if (!isValidEmail(email)) return { ok: false, reason: 'invalid-email' };

  const identity = await gateway.currentIdentity();
  if (identity === null) return { ok: false, reason: 'not-signed-in' };
  if (identity.email !== null) return { ok: false, reason: 'already-linked' };

  try {
    await gateway.updateEmail(email);
  } catch {
    return { ok: false, reason: 'link-failed' };
  }
  return { ok: true, email };
}

/** supabase-js adapter for `AuthGateway`. Thin — the tested logic is in `linkEmail`. */
export class SupabaseAuthGateway implements AuthGateway {
  constructor(private readonly client: SupabaseClient) {}

  async currentIdentity(): Promise<AuthIdentity | null> {
    const {
      data: { user },
    } = await this.client.auth.getUser();
    if (!user) return null;
    return {
      userId: user.id,
      email: user.email ?? null,
      isAnonymous: user.is_anonymous ?? false,
    };
  }

  async updateEmail(email: string): Promise<void> {
    const { error } = await this.client.auth.updateUser({ email });
    if (error) throw new Error(`email link failed: ${error.message}`);
  }
}

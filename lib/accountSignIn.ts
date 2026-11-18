import type { SupabaseClient } from '@supabase/supabase-js';
import { isValidEmail, normalizeEmail } from './accountLinking';

// Sign in with a linked email (T-271 · review B-07). Linking an email (T-133) promised that a
// collection survives reinstalling or switching phones, but nothing let a user sign back in. The
// flow is a one-time code: the email gets a 6-digit code (`signInWithOtp`, never creating an
// account), the user types it (`verifyOtp`), and the session becomes the linked account. A wrong
// or expired code leaves the current (anonymous) session as it was. Pure core + thin adapter, as
// in accountLinking.ts.

export interface SignInGateway {
  /** Email a one-time code to an existing account; throws when Supabase refuses. */
  sendCode(email: string): Promise<void>;
  /** Exchange the code for that account's session; returns its user id; throws when wrong. */
  verifyCode(email: string, code: string): Promise<string>;
}

export type RequestCodeResult =
  { ok: true; email: string } | { ok: false; reason: 'invalid-email' | 'send-failed' };

export type VerifyCodeResult =
  { ok: true; userId: string } | { ok: false; reason: 'invalid-code' | 'wrong-code' };

const CODE_RE = /^\d{6}$/;

export async function requestSignInCode(
  gateway: SignInGateway,
  rawEmail: string,
): Promise<RequestCodeResult> {
  const email = normalizeEmail(rawEmail);
  if (!isValidEmail(email)) return { ok: false, reason: 'invalid-email' };
  try {
    await gateway.sendCode(email);
  } catch {
    return { ok: false, reason: 'send-failed' };
  }
  return { ok: true, email };
}

export async function verifySignInCode(
  gateway: SignInGateway,
  email: string,
  rawCode: string,
): Promise<VerifyCodeResult> {
  const code = rawCode.replace(/\s+/g, '');
  if (!CODE_RE.test(code)) return { ok: false, reason: 'invalid-code' };
  try {
    return { ok: true, userId: await gateway.verifyCode(email, code) };
  } catch {
    return { ok: false, reason: 'wrong-code' };
  }
}

/** supabase-js adapter. `shouldCreateUser: false`: signing in never makes a new account. */
export class SupabaseSignInGateway implements SignInGateway {
  constructor(private readonly client: SupabaseClient) {}

  async sendCode(email: string): Promise<void> {
    const { error } = await this.client.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });
    if (error) throw new Error(`sign-in code failed: ${error.message}`);
  }

  async verifyCode(email: string, code: string): Promise<string> {
    const { data, error } = await this.client.auth.verifyOtp({ email, token: code, type: 'email' });
    if (error || !data.user) throw new Error(`sign-in failed: ${error?.message ?? 'no user'}`);
    return data.user.id;
  }
}

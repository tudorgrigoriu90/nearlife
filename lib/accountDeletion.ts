import type { SupabaseClient } from '@supabase/supabase-js';

// Account + data deletion (T-093 · PRIVACY §2, GDPR right to erasure · USER-FLOWS §9). Reachable
// from Settings at all times (invariant #6). The erase itself runs server-side: a Supabase Edge
// Function (`delete-account`) calls the auth admin API to delete the user, and the ON DELETE CASCADE
// on `collection`/`profiles` → `auth.users` wipes their rows (schema groundwork, T-055/T-056). The
// client can't hold the service key, so it only *invokes* that function and then clears the local
// session. The pure `deleteAccount` orchestrates + guards so it's unit-testable without a live
// Supabase; `SupabaseDeletionGateway` is the thin adapter (mirrors accountLinking's AuthGateway).

export type DeleteFailure = 'not-signed-in' | 'delete-failed';

export type DeleteResult = { ok: true } | { ok: false; reason: DeleteFailure };

export interface DeletionGateway {
  currentUserId(): Promise<string | null>;
  /** Server-side erase — invokes the `delete-account` Edge Function (admin delete + cascade). */
  eraseAccount(): Promise<void>;
  /** Clear the local session after the server erase (best-effort). */
  signOutLocal(): Promise<void>;
}

/**
 * Delete the signed-in user's account + data. Guards: must be signed in → erase → local sign-out.
 * A failed erase is reported as `delete-failed` (retryable) and the session is left intact. Once the
 * server erase succeeds, a failing local sign-out is non-fatal (the account is already gone) — the
 * result is still `ok`.
 */
export async function deleteAccount(gateway: DeletionGateway): Promise<DeleteResult> {
  const userId = await gateway.currentUserId();
  if (!userId) return { ok: false, reason: 'not-signed-in' };

  try {
    await gateway.eraseAccount();
  } catch {
    return { ok: false, reason: 'delete-failed' };
  }

  try {
    await gateway.signOutLocal();
  } catch {
    // The server erase already succeeded — a stale local session clears on next launch.
  }
  return { ok: true };
}

/** supabase-js adapter for `DeletionGateway`. Thin — the tested logic is in `deleteAccount`. */
export class SupabaseDeletionGateway implements DeletionGateway {
  constructor(private readonly client: SupabaseClient) {}

  async currentUserId(): Promise<string | null> {
    const {
      data: { user },
    } = await this.client.auth.getUser();
    return user?.id ?? null;
  }

  async eraseAccount(): Promise<void> {
    const { error } = await this.client.functions.invoke('delete-account');
    if (error) throw new Error(`account deletion failed: ${error.message}`);
  }

  async signOutLocal(): Promise<void> {
    await this.client.auth.signOut();
  }
}

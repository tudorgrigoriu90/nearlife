// Erasing the phone with the account (T-269 · review B-05, B-12; invariant #6).
//
// `delete.body` promises the deletion "permanently erases your account and everything Nearby holds
// about you". The server erase covers the account; this covers the device. It removes keys by
// prefix rather than store by store, so a store added later is erased without anyone remembering
// to list it (a test fails if a storage key is declared outside these prefixes).

export interface KeyValueStorage {
  getAllKeys(): Promise<readonly string[]>;
  multiRemove(keys: readonly string[]): Promise<void>;
}

/** `nearby.` — every app store; `sb-` — the Supabase session supabase-js keeps in AsyncStorage. */
export const ERASED_PREFIXES = ['nearby.', 'sb-'] as const;

/** Remove every app key from device storage. Best-effort: the account is already gone. */
export async function eraseDeviceStorage(storage: KeyValueStorage): Promise<void> {
  try {
    const keys = (await storage.getAllKeys()).filter((k) =>
      ERASED_PREFIXES.some((p) => k.startsWith(p)),
    );
    if (keys.length > 0) await storage.multiRemove(keys);
  } catch {
    // An unavailable disk must not turn a completed deletion into an error screen.
  }
}

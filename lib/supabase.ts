import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from './supabaseConfig';

// Supabase client (T-129, session persistence T-027). Created lazily so importing this module
// never crashes when config is absent (e.g. under test) — the client is only built on first use.
// Uses the publishable key; RLS governs what it can read/write. On React Native the session is
// persisted in AsyncStorage and auto-refreshed, so a signed-in (anonymous) user survives app
// restarts; `detectSessionInUrl` is off since there is no URL to parse on native.

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (client === null) {
    const { url, publishableKey } = getSupabaseConfig();
    client = createClient(url, publishableKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }
  return client;
}

/**
 * Ensure there is a session and return the user id (T-027). Reuses an existing persisted session
 * (survives restarts), else signs in anonymously — a frictionless, PII-free account so the
 * prototype can persist a user's collection without a login wall (see T-018). Anonymous users can
 * later link an email to survive reinstall/other devices (identity linking, future).
 */
export async function ensureAnonymousSession(): Promise<string> {
  const supabase = getSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session?.user) return session.user.id;

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error || !data.user) {
    throw new Error(`anonymous sign-in failed: ${error?.message ?? 'no user returned'}`);
  }
  return data.user.id;
}

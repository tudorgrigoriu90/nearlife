import 'react-native-url-polyfill/auto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from './supabaseConfig';

// Supabase client (T-129). Created lazily so importing this module never crashes when config is
// absent (e.g. under test) — the client is only built on first use. Uses the publishable key;
// RLS governs what it can read/write (data model + policies land with the schema migrations).

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (client === null) {
    const { url, publishableKey } = getSupabaseConfig();
    client = createClient(url, publishableKey);
  }
  return client;
}

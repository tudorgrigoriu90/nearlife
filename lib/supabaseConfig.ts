// Supabase configuration (T-129). Reads the app's public config from environment variables
// (set in .env.local for local dev; EXPO_PUBLIC_* vars are inlined into the build). Only the
// PUBLISHABLE key is used client-side — it is protected by Row Level Security. The secret key
// is never read here; it belongs to server-side jobs (Edge Functions / CI secrets) only.

export interface SupabaseConfig {
  url: string;
  publishableKey: string;
}

/** Read + validate the client Supabase config; throws a clear error if it is missing. */
export function getSupabaseConfig(): SupabaseConfig {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    throw new Error(
      'Missing Supabase config. Set EXPO_PUBLIC_SUPABASE_URL and ' +
        'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY (see .env.local).',
    );
  }
  return { url, publishableKey };
}

/** True when the client Supabase config is present — lets callers fall back gracefully. */
export function hasSupabaseConfig(): boolean {
  return Boolean(
    process.env.EXPO_PUBLIC_SUPABASE_URL && process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}

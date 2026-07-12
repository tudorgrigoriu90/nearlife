// PostHog configuration (T-035). Mirrors supabaseConfig.ts: read the app's public config from
// environment variables (set in .env.local for local dev; EXPO_PUBLIC_* vars are inlined into the
// build). The project API key (`phc_...`) is a *public* client key by design — protected by
// project settings server-side, not by secrecy — so it is safe to embed in the app bundle, same
// tier as the Supabase publishable key. `host` must point at the EU Cloud region
// (https://eu.i.posthog.com) to satisfy the EU-residency commitment in PRIVACY-COMPLIANCE.md.

export interface PostHogConfig {
  apiKey: string;
  host: string;
}

/** Read + validate the client PostHog config; throws a clear error if it is missing. */
export function getPostHogConfig(): PostHogConfig {
  const apiKey = process.env.EXPO_PUBLIC_POSTHOG_KEY;
  const host = process.env.EXPO_PUBLIC_POSTHOG_HOST;
  if (!apiKey || !host) {
    throw new Error(
      'Missing PostHog config. Set EXPO_PUBLIC_POSTHOG_KEY and ' +
        'EXPO_PUBLIC_POSTHOG_HOST (see .env.local).',
    );
  }
  return { apiKey, host };
}

/** True when the client PostHog config is present — lets callers fall back to a no-op tracker. */
export function hasPostHogConfig(): boolean {
  return Boolean(process.env.EXPO_PUBLIC_POSTHOG_KEY && process.env.EXPO_PUBLIC_POSTHOG_HOST);
}

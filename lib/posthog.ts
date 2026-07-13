import AsyncStorage from '@react-native-async-storage/async-storage';
import { PostHog } from 'posthog-react-native';
import { getPostHogConfig } from './posthogConfig';

// PostHog client (T-035). Created lazily, same pattern as `lib/supabase.ts`, so importing this
// module never crashes when config is absent (e.g. under test).
//
// `captureAppLifecycleEvents: false` matters for compliance, not just tidiness: that option would
// otherwise capture "Application Opened"/"Application Installed" directly, bypassing our
// `ConsentGatedTracker` seam. The only events PostHog ever receives are the ones this app
// explicitly sends through the typed `Tracker` interface (lib/analytics.ts), which is gated on the
// user's analytics consent (invariant #6, PRIVACY-COMPLIANCE §2) — nothing is sent before consent.
//
// `customStorage` reuses the AsyncStorage instance the Supabase client already depends on, so this
// adds no new native storage module.

let client: PostHog | null = null;

export function getPostHogClient(): PostHog {
  if (client === null) {
    const { apiKey, host } = getPostHogConfig();
    client = new PostHog(apiKey, {
      host,
      customStorage: AsyncStorage,
      captureAppLifecycleEvents: false,
    });
  }
  return client;
}

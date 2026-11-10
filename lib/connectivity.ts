import type { SupabaseConfig } from './supabaseConfig';

// Offline notice (T-252). Species, cards and counties all come from the server, so without a
// connection the app shows lists with empty cards. One small request answers "can we reach the
// server?" directly, which is the question that matters: a phone can have Wi-Fi without internet,
// and NetInfo would mean another native module for a less useful answer.

/** Resolves true when the server answered at all, false on no answer. Never rejects. */
export type ConnectivityProbe = () => Promise<boolean>;

export const PROBE_TIMEOUT_MS = 6000;

export function supabaseProbe(
  config: SupabaseConfig,
  fetchFn: (url: string, init?: RequestInit) => Promise<Response> = fetch,
  timeoutMs: number = PROBE_TIMEOUT_MS,
): ConnectivityProbe {
  return async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      // Any HTTP status means the network is there: a 5xx is the server's problem, not the user's.
      await fetchFn(`${config.url.replace(/\/$/, '')}/auth/v1/health`, {
        headers: { apikey: config.publishableKey },
        signal: controller.signal,
      });
      return true;
    } catch {
      return false;
    } finally {
      clearTimeout(timer);
    }
  };
}

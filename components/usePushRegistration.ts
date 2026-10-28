import { useEffect, useRef } from 'react';
import { getDevicePushToken, onPushTokenChange } from '../lib/permissions';
import {
  SupabasePushGateway,
  syncPushRegistration,
  type DeviceToken,
  type PushRegistrationGateway,
} from '../lib/pushRegistration';
import { ensureAnonymousSession, getSupabase } from '../lib/supabase';
import { hasSupabaseConfig } from '../lib/supabaseConfig';

// React glue for push registration (T-201): re-syncs the server's device rows whenever consent,
// language or region changes, and when FCM rotates the token. Runs are chained, never parallel —
// a withdraw racing a register could otherwise land in the wrong order and leave a device
// registered after the user said no.

export interface PushRegistrationDeps {
  enabled: () => boolean;
  ensureUser: () => Promise<string>;
  gateway: () => PushRegistrationGateway;
  getToken: () => Promise<DeviceToken | null>;
  onTokenChange: (listener: () => void) => () => void;
}

const DEFAULT_DEPS: PushRegistrationDeps = {
  enabled: hasSupabaseConfig,
  ensureUser: ensureAnonymousSession,
  gateway: () => new SupabasePushGateway(getSupabase()),
  getToken: getDevicePushToken,
  onTokenChange: onPushTokenChange,
};

export interface PushRegistrationInput {
  /** False until onboarding is done and stored consent has loaded — the default is all-off. */
  ready: boolean;
  wanted: boolean;
  locale: string;
  homeRegion: string | null;
}

export function usePushRegistration(
  { ready, wanted, locale, homeRegion }: PushRegistrationInput,
  deps: PushRegistrationDeps = DEFAULT_DEPS,
): void {
  const chain = useRef<Promise<unknown>>(Promise.resolve());

  useEffect(() => {
    if (!ready || !deps.enabled()) return;
    const run = () => {
      chain.current = chain.current
        .then(async () =>
          syncPushRegistration({
            wanted,
            userId: await deps.ensureUser(),
            locale,
            homeRegion,
            getToken: deps.getToken,
            gateway: deps.gateway(),
          }),
        )
        // Offline or a DB hiccup: the next launch or consent change re-syncs.
        .catch((e: unknown) => console.warn('push registration failed', e));
    };
    run();
    if (!wanted) return;
    return deps.onTokenChange(run);
  }, [ready, wanted, locale, homeRegion, deps]);
}

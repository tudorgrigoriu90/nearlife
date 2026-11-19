import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import type { PermissionOutcome } from '../lib/permissions';

// Notifications turned off in system settings (T-300 · review B-33). The app's consent switch
// stayed on and the device stayed registered, so the sender kept sending what the phone could not
// show, and every such send counted in the open-rate figures. At launch and each time the app
// returns to the foreground, the OS permission is read; revoked while consent is on, consent turns
// off, which also unregisters the device (usePushRegistration).

export function useNotificationPermissionSync({
  enabled,
  consentOn,
  check,
  onRevoked,
}: {
  /** False until onboarding is done and stored consent has loaded. */
  enabled: boolean;
  consentOn: boolean;
  check: () => Promise<PermissionOutcome | 'unknown'>;
  onRevoked: () => void;
}): void {
  const latest = useRef({ onRevoked, check });
  useEffect(() => {
    latest.current = { onRevoked, check };
  });

  useEffect(() => {
    if (!enabled || !consentOn) return;
    let cancelled = false;
    const run = () => {
      void latest.current.check().then((status) => {
        if (!cancelled && status === 'denied') latest.current.onRevoked();
      });
    };
    run();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') run();
    });
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [enabled, consentOn]);
}

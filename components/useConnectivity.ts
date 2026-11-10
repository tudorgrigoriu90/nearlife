import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import type { ConnectivityProbe } from '../lib/connectivity';

// T-252: can the app reach its server? Checked at start, whenever the app comes back to the
// foreground, and every RECHECK_MS while offline, so the notice goes away by itself once the
// connection returns. While online nothing is polled.
//
// "Continue offline" holds until the connection is next seen; going offline again later shows the
// notice again.

export const RECHECK_MS = 15_000;

export interface ConnectivityState {
  /** True only once a check has failed: the first frames never flash the notice. */
  offline: boolean;
  checking: boolean;
  /** The user chose to continue offline. */
  dismissed: boolean;
  recheck: () => void;
  dismiss: () => void;
}

export function useConnectivity(probe: ConnectivityProbe | null): ConnectivityState {
  const [offline, setOffline] = useState(false);
  const [checking, setChecking] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const inFlight = useRef(false);
  const mounted = useRef(true);

  const recheck = useCallback(() => {
    if (!probe || inFlight.current) return;
    inFlight.current = true;
    setChecking(true);
    void probe().then((online) => {
      inFlight.current = false;
      if (!mounted.current) return;
      setChecking(false);
      setOffline(!online);
      if (online) setDismissed(false);
    });
  }, [probe]);

  useEffect(() => {
    mounted.current = true;
    recheck();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') recheck();
    });
    return () => {
      mounted.current = false;
      sub.remove();
    };
  }, [recheck]);

  useEffect(() => {
    if (!offline) return;
    const timer = setInterval(recheck, RECHECK_MS);
    return () => clearInterval(timer);
  }, [offline, recheck]);

  const dismiss = useCallback(() => setDismissed(true), []);
  return { offline, checking, dismissed, recheck, dismiss };
}

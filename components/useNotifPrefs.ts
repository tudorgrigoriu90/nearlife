import { useCallback, useEffect, useState } from 'react';
import type { NotifPrefs } from '../lib/notifPrefs';

export interface NotifPrefsGateway {
  load(): Promise<NotifPrefs>;
  save(prefs: NotifPrefs): Promise<void>;
}

/**
 * The user's notification choices (T-342 · review F-03), read once notifications are on. Null
 * until read: Settings shows nothing rather than defaults that a change would write over stored
 * choices. A change shows at once and is saved in the background; a failed save is retried with
 * the next change.
 */
export function useNotifPrefs(
  gateway: NotifPrefsGateway | null,
  active: boolean,
): { prefs: NotifPrefs | null; change: (next: NotifPrefs) => void } {
  const [prefs, setPrefs] = useState<NotifPrefs | null>(null);
  useEffect(() => {
    if (!gateway || !active) return;
    let live = true;
    gateway
      .load()
      .then((p) => live && setPrefs(p))
      .catch((e: unknown) => console.warn('notification choices read failed', e));
    return () => {
      live = false;
    };
  }, [gateway, active]);
  const change = useCallback(
    (next: NotifPrefs) => {
      setPrefs(next);
      void gateway?.save(next).catch((e: unknown) => console.warn('notification choices write failed', e));
    },
    [gateway],
  );
  return { prefs, change };
}

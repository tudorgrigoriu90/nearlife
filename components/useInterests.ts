import { useCallback, useEffect, useState } from 'react';
import type { Interests } from '../lib/interests';
import type { InterestsStore } from '../lib/interestsStore';
import type { NotifPrefs } from '../lib/notifPrefs';

// "Show me" (T-390): the phone holds the choice, and the notification groups (T-341, read by the
// sender from profiles.notif_prefs) follow it. Once the stored notification choices are read they
// are brought in line; a user who picked groups for notifications before "Show me" existed has
// that choice adopted once, so nothing they set is lost.

const same = (a: Interests, b: Interests) => JSON.stringify(a) === JSON.stringify(b);

export function useInterests(
  store: InterestsStore,
  notif: { prefs: NotifPrefs | null; change: (next: NotifPrefs) => void },
): { interests: Interests; change: (next: Interests) => void; reset: () => void } {
  const [state, setState] = useState<{ interests: Interests; stored: boolean } | null>(null);
  useEffect(() => {
    let live = true;
    void store.load().then((loaded) => live && setState(loaded));
    return () => {
      live = false;
    };
  }, [store]);

  const { prefs, change: changePrefs } = notif;
  // Groups chosen for notifications before "Show me" existed are taken over until a choice is
  // made here (and saved, so they stay after notifications are turned off).
  const adopted = state !== null && !state.stored && prefs !== null ? prefs.groups : null;
  const interests = adopted ?? state?.interests ?? null;
  useEffect(() => {
    if (adopted !== null) void store.save(adopted);
  }, [adopted, store]);
  useEffect(() => {
    if (state === null || prefs === null || adopted !== null) return;
    if (!same(prefs.groups, interests)) changePrefs({ ...prefs, groups: interests });
  }, [state, prefs, adopted, interests, changePrefs]);

  const change = useCallback(
    (next: Interests) => {
      setState({ interests: next, stored: true });
      void store.save(next);
    },
    [store],
  );
  /** After the account is erased: everything again, nothing stored (the phone was wiped). */
  const reset = useCallback(() => setState({ interests: null, stored: false }), []);
  return { interests, change, reset };
}

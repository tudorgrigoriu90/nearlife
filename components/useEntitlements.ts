import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { NO_ENTITLEMENTS, type EntitlementSource, type Entitlements } from '../lib/entitlement';
import type { EntitlementStore } from '../lib/entitlementStore';

// What the user owns, as the app sees it (T-083). Shows the cached state at once, then asks the
// server, on launch, whenever the app returns to the foreground (a purchase or a Family join made
// on another device shows up), and on demand after a purchase or join on this one. A failed read
// keeps the last known state, so being offline never relocks a paying user.

export interface UseEntitlementsInput {
  /** null without a backend: the cache alone. */
  source: EntitlementSource | null;
  store: EntitlementStore;
}

export function useEntitlements({ source, store }: UseEntitlementsInput): {
  entitlements: Entitlements;
  refresh: () => void;
} {
  const [entitlements, setEntitlements] = useState<Entitlements>(NO_ENTITLEMENTS);
  const mounted = useRef(true);

  const refresh = useCallback(() => {
    if (source === null) return;
    source
      .fetch()
      .then((fresh) => {
        if (!mounted.current) return;
        setEntitlements(fresh);
        void store.save(fresh);
      })
      .catch(() => undefined);
  }, [source, store]);

  useEffect(() => {
    mounted.current = true;
    let cachedFirst = true;
    store
      .load()
      .then((cached) => {
        // The server may have answered first; never let the cache overwrite a fresher answer.
        if (mounted.current && cachedFirst) setEntitlements(cached);
      })
      .finally(refresh);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => {
      cachedFirst = false;
      mounted.current = false;
      sub.remove();
    };
  }, [store, refresh]);

  return { entitlements, refresh };
}

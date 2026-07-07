import { useCallback, useEffect, useRef, useState } from 'react';
import type { CollectionRecord, HelpKind } from '../lib/collection';
import { InMemoryCollectionStore, type CollectionStore } from '../lib/collectionStore';
import { ensureAnonymousSession, getSupabase } from '../lib/supabase';
import { hasSupabaseConfig } from '../lib/supabaseConfig';
import { SupabaseCollectionGateway, SupabaseCollectionStore } from '../lib/supabaseCollectionStore';

// React glue over the collection store (T-027). When Supabase config is present the hook persists
// to the live DB via SupabaseCollectionStore (signing in anonymously on first use, session cached
// in AsyncStorage so it survives restarts); otherwise it falls back to the in-memory store so the
// app still runs without a backend (tests, or a device with no .env.local). The store is built
// lazily off-render to avoid side effects during render; domain rules live in the store.

export interface Collection {
  records: CollectionRecord[];
  spot: (speciesId: string) => void;
  markCaught: (speciesId: string, primeBonus: boolean) => void;
  help: (speciesId: string, kind: HelpKind) => void;
}

function createStore(): CollectionStore {
  if (hasSupabaseConfig()) {
    return new SupabaseCollectionStore(
      new SupabaseCollectionGateway(getSupabase()),
      ensureAnonymousSession,
    );
  }
  return new InMemoryCollectionStore();
}

export function useCollection(): Collection {
  const storeRef = useRef<CollectionStore | null>(null);
  const getStore = useCallback((): CollectionStore => {
    storeRef.current ??= createStore();
    return storeRef.current;
  }, []);

  const [records, setRecords] = useState<CollectionRecord[]>([]);

  const refresh = useCallback(async () => {
    setRecords(await getStore().list());
  }, [getStore]);

  // Load any persisted collection on mount (also triggers the anonymous sign-in when backed by
  // Supabase). Failures are swallowed to a console warning so the app still renders offline.
  useEffect(() => {
    refresh().catch((e: unknown) => console.warn('collection load failed', e));
  }, [refresh]);

  const spot = useCallback(
    (speciesId: string) => {
      void getStore()
        .markSpotted(speciesId, new Date().toISOString())
        .then(refresh)
        .catch((e: unknown) => console.warn('spot failed', e));
    },
    [getStore, refresh],
  );

  const markCaught = useCallback(
    (speciesId: string, primeBonus: boolean) => {
      void getStore()
        .markCaught(speciesId, new Date().toISOString(), primeBonus)
        .then(refresh)
        .catch((e: unknown) => console.warn('markCaught failed', e));
    },
    [getStore, refresh],
  );

  const help = useCallback(
    (speciesId: string, kind: HelpKind) => {
      void getStore()
        .markHelped(speciesId, kind, new Date().toISOString())
        .then(refresh)
        .catch((e: unknown) => console.warn('help failed', e));
    },
    [getStore, refresh],
  );

  return { records, spot, markCaught, help };
}

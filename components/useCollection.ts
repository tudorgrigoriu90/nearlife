import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import type { CollectionRecord, HelpKind } from '../lib/collection';
import type { CollectionStore } from '../lib/collectionStore';
import {
  AsyncStorageOfflineCache,
  OfflineCollectionStore,
} from '../lib/offlineCollectionStore';
import { ensureAnonymousSession, getSupabase } from '../lib/supabase';
import { hasSupabaseConfig } from '../lib/supabaseConfig';
import { SupabaseCollectionGateway, SupabaseCollectionStore } from '../lib/supabaseCollectionStore';

// React glue over the collection store (T-027, offline-first since T-165).
//
// The device is always the source of truth: every spot/catch/help is written to
// OfflineCollectionStore, which persists locally and returns immediately, then drains an outbox to
// Supabase in the background. Previously these calls went straight to the network and swallowed
// the rejection in a console.warn, so a catch made without signal was silently lost — which is the
// worst possible failure on a delight moment, in exactly the places this app is used.
//
// Supabase config present → the outbox has somewhere to drain to. Absent (tests, or a device with
// no .env.local) → the same store runs with no remote and still persists across restarts.

export interface Collection {
  records: CollectionRecord[];
  spot: (speciesId: string) => void;
  markCaught: (speciesId: string, primeBonus: boolean) => void;
  help: (speciesId: string, kind: HelpKind) => void;
}

function createRemote(): CollectionStore | null {
  if (!hasSupabaseConfig()) return null;
  return new SupabaseCollectionStore(
    new SupabaseCollectionGateway(getSupabase()),
    ensureAnonymousSession,
  );
}

function createStore(): OfflineCollectionStore {
  return new OfflineCollectionStore(new AsyncStorageOfflineCache(AsyncStorage), createRemote());
}

export function useCollection(): Collection {
  const storeRef = useRef<OfflineCollectionStore | null>(null);
  const getStore = useCallback((): OfflineCollectionStore => {
    storeRef.current ??= createStore();
    return storeRef.current;
  }, []);

  const [records, setRecords] = useState<CollectionRecord[]>([]);

  const refresh = useCallback(async () => {
    setRecords(await getStore().list());
  }, [getStore]);

  // Load the on-device collection first so the UI is correct before any network work, then let the
  // outbox drain whatever last session could not deliver.
  useEffect(() => {
    const store = getStore();
    void store
      .hydrate()
      .then(refresh)
      .then(() => store.sync())
      .then(refresh)
      .catch((e: unknown) => console.warn('collection load failed', e));
  }, [getStore, refresh]);

  // Drain again whenever the app comes back to the foreground. Without this the outbox only moves
  // on a write or a cold start, so a catch made in a forest would sit queued even after the user
  // walked back into signal — they would have to catch something else to push it out.
  // AppState is built into React Native, so this needs no connectivity dependency.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      void getStore()
        .sync()
        .then(refresh)
        .catch((e: unknown) => console.warn('collection sync failed', e));
    });
    return () => subscription.remove();
  }, [getStore, refresh]);

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

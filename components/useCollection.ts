import { useCallback, useMemo, useState } from 'react';
import type { CollectionRecord } from '../lib/collection';
import { InMemoryCollectionStore } from '../lib/collectionStore';

// React glue over the tested in-memory collection store (T-116). The prototype keeps collection
// in memory for a single session; the Supabase-backed store (T-056) implements the same
// interface, so this hook swaps to it without screen changes (T-027). Store domain rules
// (catch/help imply spotted, spotted-time never overwritten) live in the store and are tested
// there — this hook only mirrors the store's records into React state.

export interface Collection {
  records: CollectionRecord[];
  spot: (speciesId: string) => void;
  markCaught: (speciesId: string, primeBonus: boolean) => void;
}

export function useCollection(): Collection {
  const store = useMemo(() => new InMemoryCollectionStore(), []);
  const [records, setRecords] = useState<CollectionRecord[]>([]);

  const sync = useCallback(async (op: Promise<unknown>) => {
    await op;
    setRecords(await store.list());
  }, [store]);

  const spot = useCallback(
    (speciesId: string) => void sync(store.markSpotted(speciesId, new Date().toISOString())),
    [store, sync],
  );

  const markCaught = useCallback(
    (speciesId: string, primeBonus: boolean) =>
      void sync(store.markCaught(speciesId, new Date().toISOString(), primeBonus)),
    [store, sync],
  );

  return { records, spot, markCaught };
}

import { useCallback, useEffect, useRef } from 'react';

// Re-reads after a payment (T-302 · review B-47). The server learns of a purchase from
// RevenueCat's webhook, usually within seconds, so the app re-reads on a schedule while the Store
// says "unlocking" (T-285). The timers were fired and forgotten; here they stop as soon as the
// unlock arrives (`unlockedKey` changes) or the app goes away, and a second purchase restarts the
// schedule rather than adding another.

export function usePurchaseRereads(
  refresh: () => void,
  /** Changes when what the user owns changes, e.g. the entitlements as a string. */
  unlockedKey: string,
  delaysMs: readonly number[],
): () => void {
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const startedAt = useRef<string | null>(null);
  const latestRefresh = useRef(refresh);
  useEffect(() => {
    latestRefresh.current = refresh;
  });

  const cancel = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    startedAt.current = null;
  }, []);

  useEffect(() => cancel, [cancel]);

  useEffect(() => {
    if (startedAt.current !== null && startedAt.current !== unlockedKey) cancel();
  }, [unlockedKey, cancel]);

  const keyRef = useRef(unlockedKey);
  useEffect(() => {
    keyRef.current = unlockedKey;
  });

  return useCallback(() => {
    cancel();
    startedAt.current = keyRef.current;
    timers.current = delaysMs.map((ms) => setTimeout(() => latestRefresh.current(), ms));
  }, [cancel, delaysMs]);
}

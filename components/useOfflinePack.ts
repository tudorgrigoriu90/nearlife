import { useCallback, useEffect, useRef, useState } from 'react';
import {
  downloadPack,
  loadPack,
  type OfflinePack,
  type PackFiles,
  type PackProgress,
  type PackSource,
  type PackTarget,
} from '../lib/offlinePack';

// The offline county pack in the app (T-256): what is saved, a download in progress, and a quiet
// weekly refresh. Only Full Game owners can save or refresh one; a pack saved before a purchase
// was refunded is simply no longer used (T-257 checks the entitlement too).

export const REFRESH_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

export interface OfflinePackState {
  pack: OfflinePack | null;
  sizeBytes: number;
  progress: PackProgress | null;
  failed: boolean;
  download: () => void;
  remove: () => void;
}

/** True when a saved pack should be refreshed: a week old, or for another county or language. */
export function packIsStale(pack: OfflinePack, target: PackTarget, now: Date): boolean {
  return (
    now.getTime() - new Date(pack.savedAt).getTime() >= REFRESH_AFTER_MS ||
    pack.regionId !== target.regionId ||
    pack.locale !== target.locale ||
    pack.secondaryLocale !== target.secondaryLocale
  );
}

export function useOfflinePack({
  enabled,
  target,
  source,
  files,
  online,
}: {
  /** The Full Game. */
  enabled: boolean;
  /** Home county and languages; null before a county is known. */
  target: PackTarget | null;
  source: PackSource | null;
  files: PackFiles | null;
  /** From the connectivity check: never start a refresh offline. */
  online: boolean;
}): OfflinePackState {
  const [pack, setPack] = useState<OfflinePack | null>(null);
  const [sizeBytes, setSizeBytes] = useState(0);
  const [progress, setProgress] = useState<PackProgress | null>(null);
  const [failed, setFailed] = useState(false);
  const busy = useRef(false);
  const mounted = useRef(true);
  // One automatic refresh per saved pack per session: a failed one waits for the next start
  // (or the "Update now" button) instead of retrying on every render.
  const autoTried = useRef<string | null>(null);

  useEffect(() => {
    mounted.current = true;
    if (!files) return;
    void loadPack(files).then((saved) => {
      if (!mounted.current) return;
      setPack(saved);
      setSizeBytes(saved ? files.sizeBytes() : 0);
    });
    return () => {
      mounted.current = false;
    };
  }, [files]);

  const download = useCallback(() => {
    if (!enabled || !target || !source || !files || busy.current) return;
    busy.current = true;
    setFailed(false);
    downloadPack(source, files, target, (p) => mounted.current && setProgress(p), new Date())
      .then((saved) => {
        if (!mounted.current) return;
        setPack(saved);
        setSizeBytes(files.sizeBytes());
      })
      .catch(() => {
        if (mounted.current) setFailed(true);
      })
      .finally(() => {
        busy.current = false;
        if (mounted.current) setProgress(null);
      });
  }, [enabled, target, source, files]);

  const remove = useCallback(() => {
    if (!files || busy.current) return;
    files.clear();
    setPack(null);
    setSizeBytes(0);
  }, [files]);

  // The quiet refresh: once a week, or after a move or a language change, when online.
  useEffect(() => {
    if (!enabled || !online || !pack || !target || autoTried.current === pack.savedAt) return;
    if (!packIsStale(pack, target, new Date())) return;
    autoTried.current = pack.savedAt;
    download();
  }, [enabled, online, pack, target, download]);

  return { pack, sizeBytes, progress, failed, download, remove };
}

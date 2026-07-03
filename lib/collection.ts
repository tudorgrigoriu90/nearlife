// Collection domain model (T-115). Pure representation of what a user has collected and the
// derived views the UI needs: the three-tier state overlay per species (● Spotted / ◐ Caught /
// ◑ Helped) and the progress summary counts (USER-FLOWS §2). Mirrors the `collection` table
// (TSD §3) but stays storage-free so it is unit-testable; the Supabase-backed store (T-056)
// and the almanac UI (T-057/T-058) consume it.

export type Tier = 'spotted' | 'caught' | 'helped';
export type HelpKind = 'give' | 'protect';

export interface CollectionRecord {
  speciesId: string;
  /** ISO timestamps; null = tier not reached. */
  spottedAt: string | null;
  caughtAt: string | null;
  helpedAt: string | null;
  helpedKind: HelpKind | null;
  /** Caught within the species' active window (GDD §6). */
  primeBonus: boolean;
}

export interface TierState {
  spotted: boolean;
  caught: boolean;
  helped: boolean;
}

export interface ProgressSummary {
  spotted: number;
  caught: number;
  helped: number;
}

export const EMPTY_TIER_STATE: TierState = { spotted: false, caught: false, helped: false };

/** Tier overlay for a single record, derived from which timestamps are set. */
export function tierStateOf(record: CollectionRecord): TierState {
  return {
    spotted: record.spottedAt !== null,
    caught: record.caughtAt !== null,
    helped: record.helpedAt !== null,
  };
}

/** Tier overlay for a species id within a collection; all-false if not collected yet. */
export function tierStateFor(records: CollectionRecord[], speciesId: string): TierState {
  const record = records.find((r) => r.speciesId === speciesId);
  return record ? tierStateOf(record) : { ...EMPTY_TIER_STATE };
}

/** Spotted/Caught/Helped counts across the whole collection (the 3-tier progress header). */
export function progressSummary(records: CollectionRecord[]): ProgressSummary {
  return records.reduce<ProgressSummary>(
    (acc, r) => ({
      spotted: acc.spotted + (r.spottedAt !== null ? 1 : 0),
      caught: acc.caught + (r.caughtAt !== null ? 1 : 0),
      helped: acc.helped + (r.helpedAt !== null ? 1 : 0),
    }),
    { spotted: 0, caught: 0, helped: 0 },
  );
}

/** Ids the user has spotted — the set the notification engine dedupes against (TSD §4). */
export function spottedIds(records: CollectionRecord[]): Set<string> {
  return new Set(records.filter((r) => r.spottedAt !== null).map((r) => r.speciesId));
}

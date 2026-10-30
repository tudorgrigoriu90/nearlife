import type { CollectionRecord } from './collection';
import type { ConsentState } from './consent';
import type { Household } from './family';

// Data export (T-092 core · PRIVACY §2, GDPR right to access/portability). Pure assembly of a
// user's data into a portable, machine-readable bundle they can download from Settings. Kept pure
// so the export is deterministic and testable; the endpoint/UI (T-092) just reads the profile +
// collection from Supabase and hands them to `buildDataExport`. Everything here is the user's own
// data — no derived analytics, no other users.
//
// v2 (T-219) adds what the server keeps since purchases and Family arrived: every purchase
// record (refunded ones too, since the row still exists) and the household link. An owner's
// export lists when members joined but not their account ids: those ids identify other people's
// accounts, and the owner's right of access does not reach them.

export const EXPORT_FORMAT = 'nearby.export.v2';

export interface ExportProfile {
  homeRegion: string | null;
}

/** One row of `entitlements`, as the RevenueCat webhook wrote it (T-217). */
export interface PurchaseRecord {
  entitlement: string;
  productId: string | null;
  active: boolean;
  changedAt: string;
}

export interface ExportHousehold {
  role: 'owner' | 'member';
  since: string | null;
  people: number;
  active: boolean;
  inviteCode: string | null;
  /** Owner only: when each member joined. Their account ids are left out on purpose. */
  memberJoinDates: string[];
}

export interface DataExport {
  format: typeof EXPORT_FORMAT;
  exportedAt: string;
  profile: ExportProfile;
  consent: ConsentState;
  collection: CollectionRecord[];
  purchases: PurchaseRecord[];
  household: ExportHousehold | null;
  /**
   * Sections the server could not be asked for (offline): named, so an empty list there is never
   * mistaken for "we hold nothing". Absent when the bundle is complete.
   */
  unavailable?: ('purchases' | 'household')[];
}

export function householdForExport(h: Household | null): ExportHousehold | null {
  if (h === null) return null;
  return {
    role: h.role,
    since: h.since,
    people: h.people,
    active: h.active,
    inviteCode: h.inviteCode,
    memberJoinDates: h.members.map((m) => m.joinedAt),
  };
}

export function buildDataExport(input: {
  exportedAt: string;
  profile: ExportProfile;
  consent: ConsentState;
  collection: CollectionRecord[];
  purchases?: PurchaseRecord[];
  household?: ExportHousehold | null;
  unavailable?: ('purchases' | 'household')[];
}): DataExport {
  return {
    ...(input.unavailable && input.unavailable.length > 0 ? { unavailable: [...input.unavailable] } : {}),
    format: EXPORT_FORMAT,
    exportedAt: input.exportedAt,
    profile: { homeRegion: input.profile.homeRegion },
    consent: { ...input.consent },
    // Copy + stable-sort by species so the export is deterministic.
    collection: [...input.collection]
      .map((r) => ({ ...r }))
      .sort((a, b) => a.speciesId.localeCompare(b.speciesId)),
    purchases: [...(input.purchases ?? [])]
      .map((p) => ({ ...p }))
      .sort((a, b) => a.entitlement.localeCompare(b.entitlement)),
    household: input.household ? { ...input.household, memberJoinDates: [...input.household.memberJoinDates] } : null,
  };
}

type Result = { data: unknown; error: { message: string } | null };

/** The slice of the supabase-js client this needs, so tests can fake it. */
export interface ExportClient {
  from(table: 'entitlements'): {
    select(columns: string): { eq(column: string, value: unknown): PromiseLike<Result> };
  };
}

export class SupabaseExportSource {
  constructor(
    private readonly client: ExportClient,
    private readonly ensureUser: () => Promise<string>,
  ) {}

  /** Every purchase record of the user; RLS limits the read to their own rows. */
  async purchases(): Promise<PurchaseRecord[]> {
    const userId = await this.ensureUser();
    const { data, error } = await this.client
      .from('entitlements')
      .select('entitlement,product_id,active,changed_at')
      .eq('user_id', userId);
    // An export that silently drops a section would misstate what we hold.
    if (error) throw new Error(`purchase records read failed: ${error.message}`);
    return (Array.isArray(data) ? data : [])
      .map((r) => r as Record<string, unknown>)
      .filter((r) => typeof r.entitlement === 'string' && typeof r.active === 'boolean' && typeof r.changed_at === 'string')
      .map((r) => ({
        entitlement: r.entitlement as string,
        productId: typeof r.product_id === 'string' ? r.product_id : null,
        active: r.active as boolean,
        changedAt: r.changed_at as string,
      }));
  }
}

/** Pretty-printed JSON for the downloadable file. */
export function exportToJson(data: DataExport): string {
  return JSON.stringify(data, null, 2);
}

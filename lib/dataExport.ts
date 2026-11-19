import type { AppClient } from './supabase';
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

// v3 (T-280 · review B-18) adds everything else kept about the user: from the server, the
// account counters, the notification history, the push devices (token by its last 6 characters)
// reviewer-code redemptions and, since T-293, "Report a mistake" reports (`public.my_data_export()`); from the phone, quiz attempts,
// recognised species, the travel log, language choices and the age path.
export const EXPORT_FORMAT = 'nearby.export.v3';

/** What `public.my_data_export()` returns. */
export interface ServerExport {
  account: {
    homeRegion: string | null;
    freeCatchesUsed: number;
    freeCatchSeason: string | null;
    fullGame: boolean;
    createdAt: string;
  } | null;
  notifications: { speciesId: string; sentAt: string }[];
  devices: {
    platform: string;
    locale: string | null;
    tokenEnd: string;
    registeredAt: string;
    updatedAt: string;
  }[];
  reviewerCodes: { redeemedAt: string }[];
  /** Species recognised in the "I saw…" quiz (T-299). */
  recognitions?: { speciesId: string; recognizedAt: string }[];
  /** "Report a mistake" reports the user sent (T-293). */
  contentReports: {
    speciesId: string;
    locale: string;
    kind: string;
    comment: string | null;
    sentAt: string;
  }[];
}

/** What the phone keeps besides the collection and consent. */
export interface DeviceExport {
  quizAttempts: unknown;
  recognized: string[];
  travel: unknown;
  languages: { app: string | null; secondLanguage: string | null; secondLanguageOn: boolean };
  agePath: string | null;
  /** Earned badges and when (T-297). */
  badges?: Record<string, string>;
  /** Field notes (T-347). */
  notes?: unknown;
  /** The name trainer's schedule (T-351): per species, when it is due again or that it is known. */
  nameTrainer?: Record<string, unknown>;
}

type Unavailable = 'purchases' | 'household' | 'server';

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
  account: ServerExport['account'];
  notifications: ServerExport['notifications'];
  devices: ServerExport['devices'];
  reviewerCodes: ServerExport['reviewerCodes'];
  recognitions: NonNullable<ServerExport['recognitions']>;
  contentReports: ServerExport['contentReports'];
  device: DeviceExport;
  /**
   * Sections the server could not be asked for (offline): named, so an empty list there is never
   * mistaken for "we hold nothing". Absent when the bundle is complete.
   */
  unavailable?: Unavailable[];
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
  server?: ServerExport | null;
  device?: DeviceExport;
  unavailable?: Unavailable[];
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
    account: input.server?.account ?? null,
    notifications: [...(input.server?.notifications ?? [])],
    devices: [...(input.server?.devices ?? [])],
    reviewerCodes: [...(input.server?.reviewerCodes ?? [])],
    recognitions: [...(input.server?.recognitions ?? [])],
    contentReports: [...(input.server?.contentReports ?? [])],
    device: input.device ?? {
      quizAttempts: null,
      recognized: [],
      travel: null,
      languages: { app: null, secondLanguage: null, secondLanguageOn: false },
      agePath: null,
    },
  };
}

export class SupabaseExportSource {
  constructor(
    private readonly client: AppClient,
    private readonly ensureUser: () => Promise<string>,
  ) {}

  /** Everything else the server keeps about the user, in one call (T-280). */
  async server(): Promise<ServerExport> {
    await this.ensureUser();
    const { data, error } = await this.client.rpc('my_data_export');
    if (error) throw new Error(`export read failed: ${error.message}`);
    const d = (data ?? {}) as Partial<ServerExport>;
    return {
      account: d.account ?? null,
      notifications: Array.isArray(d.notifications) ? d.notifications : [],
      devices: Array.isArray(d.devices) ? d.devices : [],
      reviewerCodes: Array.isArray(d.reviewerCodes) ? d.reviewerCodes : [],
      recognitions: Array.isArray(d.recognitions) ? d.recognitions : [],
      contentReports: Array.isArray(d.contentReports) ? d.contentReports : [],
    };
  }

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

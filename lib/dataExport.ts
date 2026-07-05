import type { CollectionRecord } from './collection';
import type { ConsentState } from './consent';

// Data export (T-092 core · PRIVACY §2, GDPR right to access/portability). Pure assembly of a
// user's data into a portable, machine-readable bundle they can download from Settings. Kept pure
// so the export is deterministic and testable; the endpoint/UI (T-092) just reads the profile +
// collection from Supabase and hands them to `buildDataExport`. Everything here is the user's own
// data — no derived analytics, no other users.

export const EXPORT_FORMAT = 'nearby.export.v1';

export interface ExportProfile {
  homeRegion: string | null;
}

export interface DataExport {
  format: typeof EXPORT_FORMAT;
  exportedAt: string;
  profile: ExportProfile;
  consent: ConsentState;
  collection: CollectionRecord[];
}

export function buildDataExport(input: {
  exportedAt: string;
  profile: ExportProfile;
  consent: ConsentState;
  collection: CollectionRecord[];
}): DataExport {
  return {
    format: EXPORT_FORMAT,
    exportedAt: input.exportedAt,
    profile: { homeRegion: input.profile.homeRegion },
    consent: { ...input.consent },
    // Copy + stable-sort by species so the export is deterministic.
    collection: [...input.collection]
      .map((r) => ({ ...r }))
      .sort((a, b) => a.speciesId.localeCompare(b.speciesId)),
  };
}

/** Pretty-printed JSON for the downloadable file. */
export function exportToJson(data: DataExport): string {
  return JSON.stringify(data, null, 2);
}

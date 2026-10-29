// Entitlement resolution (T-083 · ECONOMY). The single source of truth mapping what the user owns
// to what the app unlocks, decoupled from RevenueCat so the rest of the app (depth tiers, the
// free-catch counter) consumes plain flags.
//
// The authority is the SERVER (T-217): purchases reach `entitlements` only through the RevenueCat
// webhook, and `profiles.full_game` is derived there, including Family household membership
// (T-102), which no store account would report. The app reads both and caches the result, so a
// paying user is not shown the free-catch limit just because they are offline in a forest. The
// cache can only be wrong in the user's favour for the UI; the database trigger still enforces
// the limit (T-200).

export const FULL_GAME_ENTITLEMENT = 'full_game';
export const FAMILY_ENTITLEMENT = 'family';
export const ALL_REGIONS_ENTITLEMENT = 'all_regions';

export interface Entitlements {
  /** Unlimited catching: own Full Game or Family purchase, or a Family household member. */
  fullGame: boolean;
  /** Owns the Family purchase, so can create a household and invite people (T-103). */
  family: boolean;
  /** The all-of-Sweden pass (T-105). */
  allRegions: boolean;
  /** County ids (`SWE.9_1`) opened by single-county packs, sorted. */
  regions: string[];
}

export const NO_ENTITLEMENTS: Entitlements = { fullGame: false, family: false, allRegions: false, regions: [] };

const REGION_PACK = /^region_SWE_(\d+)_1$/;

/**
 * Map active entitlement ids to unlock flags. `profileFullGame` is the server-derived
 * `profiles.full_game`; it is how a Family member, who bought nothing, gets unlimited catching.
 */
export function resolveEntitlements(activeEntitlementIds: Iterable<string>, profileFullGame = false): Entitlements {
  const active = new Set(activeEntitlementIds);
  const family = active.has(FAMILY_ENTITLEMENT);
  const regions = [...active]
    .map((id) => REGION_PACK.exec(id))
    .filter((m): m is RegExpExecArray => m !== null)
    .map((m) => `SWE.${m[1]}_1`)
    .sort();
  return {
    fullGame: profileFullGame || family || active.has(FULL_GAME_ENTITLEMENT),
    family,
    allRegions: active.has(ALL_REGIONS_ENTITLEMENT),
    regions,
  };
}

export function serializeEntitlements(e: Entitlements): string {
  return JSON.stringify(e);
}

/** Read the cache. Anything unreadable decays to locked: a corrupt cache never unlocks. */
export function parseEntitlements(raw: string | null): Entitlements {
  if (raw === null) return NO_ENTITLEMENTS;
  try {
    const v = JSON.parse(raw) as Record<string, unknown>;
    return {
      fullGame: v.fullGame === true,
      family: v.family === true,
      allRegions: v.allRegions === true,
      regions: Array.isArray(v.regions) ? v.regions.filter((r): r is string => typeof r === 'string') : [],
    };
  } catch {
    return NO_ENTITLEMENTS;
  }
}

export interface EntitlementSource {
  fetch(): Promise<Entitlements>;
}

type Result = { data: unknown; error: { message: string } | null };

/** The slice of the supabase-js client this needs, so tests can fake it. */
export interface EntitlementClient {
  from(table: 'profiles' | 'entitlements'): {
    select(columns: string): {
      eq(column: string, value: unknown): {
        maybeSingle(): PromiseLike<Result>;
        eq(column: string, value: unknown): PromiseLike<Result>;
      };
    };
  };
}

export class SupabaseEntitlementSource implements EntitlementSource {
  constructor(
    private readonly client: EntitlementClient,
    private readonly ensureUser: () => Promise<string>,
  ) {}

  async fetch(): Promise<Entitlements> {
    const userId = await this.ensureUser();
    const profile = await this.client.from('profiles').select('full_game').eq('user_id', userId).maybeSingle();
    if (profile.error) throw new Error(`entitlement read failed: ${profile.error.message}`);
    // RLS already limits this to the user's own rows; the filter states the intent.
    const rows = await this.client.from('entitlements').select('entitlement').eq('user_id', userId).eq('active', true);
    if (rows.error) throw new Error(`entitlement read failed: ${rows.error.message}`);
    const ids = Array.isArray(rows.data)
      ? rows.data.map((r) => (r as { entitlement?: unknown }).entitlement).filter((x): x is string => typeof x === 'string')
      : [];
    const fullGame = (profile.data as { full_game?: unknown } | null)?.full_game === true;
    return resolveEntitlements(ids, fullGame);
  }
}

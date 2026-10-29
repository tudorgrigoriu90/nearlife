// Community impact totals (T-081 · GDD §7): "this season, N people pledged M actions". Pledges are
// Helped collection rows (T-077), so the totals are one aggregate over `collection`, computed by
// `public.community_impact()` (migration 20261029000005). Collection RLS is owner-only, so the
// function is SECURITY DEFINER and returns counts, never rows. Honest by construction (invariant
// #1): these are real pledges counted by the database, and a failed or tiny result shows the plain
// "coming" note instead of a number.

export interface CommunityImpact {
  /** Server season key, e.g. "2026-autumn" (Stockholm time, `public.season_key`). */
  season: string;
  /** Distinct people with at least one pledge this season. */
  helpers: number;
  pledges: number;
  give: number;
  protect: number;
}

export interface CommunityImpactSource {
  fetch(): Promise<CommunityImpact | null>;
}

/**
 * Below this many helpers the "community" total is mostly the reader and a couple of others. It
 * reads as empty and tells them nothing, so the screen keeps the "coming" note instead.
 */
export const COMMUNITY_MIN_HELPERS = 3;

function isCount(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0;
}

/** The aggregate row, or null if any field is not what the function returns. */
export function parseCommunityImpact(row: unknown): CommunityImpact | null {
  if (typeof row !== 'object' || row === null) return null;
  const r = row as Record<string, unknown>;
  if (typeof r.season !== 'string') return null;
  if (![r.helpers, r.pledges, r.give, r.protect].every(isCount)) return null;
  return {
    season: r.season,
    helpers: r.helpers as number,
    pledges: r.pledges as number,
    give: r.give as number,
    protect: r.protect as number,
  };
}

export function communityToShow(impact: CommunityImpact | null): CommunityImpact | null {
  return impact && impact.helpers >= COMMUNITY_MIN_HELPERS ? impact : null;
}

/** The slice of the supabase-js client this needs, so tests can fake it. */
export interface RpcClient {
  rpc(fn: 'community_impact'): PromiseLike<{ data: unknown; error: { message: string } | null }>;
}

export class SupabaseCommunityImpactSource implements CommunityImpactSource {
  constructor(private readonly client: RpcClient) {}

  async fetch(): Promise<CommunityImpact | null> {
    // No arguments: the server picks the current season on its own clock, the same one that
    // stamps the season for free catches.
    const { data, error } = await this.client.rpc('community_impact');
    if (error) throw new Error(`community_impact failed: ${error.message}`);
    return parseCommunityImpact(Array.isArray(data) ? data[0] : data);
  }
}

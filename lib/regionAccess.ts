import type { Entitlements } from './entitlement';
import { SWEDISH_COUNTY_SHAPES } from './geo/swedishCounties';

// Which counties a user may collect in (T-105 · ECONOMY "home is freemium, everywhere else is a
// pack"). The home county is open to everyone. Another county opens with its pack or the all-Sweden
// pass. Any county can be PREVIEWED: its This Week list, photos and the free help/protect content
// (mission never gated, invariant #2). Spotting and catching outside an open county are what a pack
// buys. Ownership comes from the server (lib/entitlement.ts).

export type RegionAccess = 'home' | 'owned' | 'locked';

export function regionAccess(regionId: string, homeId: string | null, e: Entitlements): RegionAccess {
  if (homeId !== null && regionId === homeId) return 'home';
  if (e.allRegions || e.regions.includes(regionId)) return 'owned';
  return 'locked';
}

export function canCollectIn(access: RegionAccess): boolean {
  return access !== 'locked';
}

export interface County {
  id: string;
  name: string;
}

/** All 21 counties: home first, the rest alphabetical in the reader's language. */
export function countyList(homeId: string | null, locale: string): County[] {
  const all = SWEDISH_COUNTY_SHAPES.map(({ id, name }) => ({ id, name }));
  const home = all.filter((c) => c.id === homeId);
  const rest = all.filter((c) => c.id !== homeId).sort((a, b) => a.name.localeCompare(b.name, locale));
  return [...home, ...rest];
}

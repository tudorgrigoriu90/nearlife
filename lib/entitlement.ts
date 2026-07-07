// Entitlement resolution (T-083 core · ECONOMY). The single source of truth mapping the store's
// active entitlements → what the app unlocks. Decoupled from RevenueCat so the rest of the app
// and logic (depth tiers T-135/T-060, free-catch T-113/T-075) consume a plain flag; the
// RevenueCat SDK integration (T-083) only has to hand this the set of active entitlement ids.
// There is exactly one product — Full Game — no subscription, no tiers (ECONOMY).

export const FULL_GAME_ENTITLEMENT = 'full_game';

export interface Entitlements {
  fullGame: boolean;
}

export const NO_ENTITLEMENTS: Entitlements = { fullGame: false };

/** Map the set of active entitlement ids (from RevenueCat) to the app's unlock flags. */
export function resolveEntitlements(activeEntitlementIds: Iterable<string>): Entitlements {
  const active = new Set(activeEntitlementIds);
  return { fullGame: active.has(FULL_GAME_ENTITLEMENT) };
}

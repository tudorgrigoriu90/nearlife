import type { Region } from './hometown';

// The travel moment (T-218). When the phone is in another Swedish county while the app is open,
// This Week offers to show what is active there: a quiet banner, never a modal. It is never shown
// over a delight moment (invariant #4) and never offers the same county twice within the cooldown,
// so it informs rather than nags. Opening the county's pack is one tap further, on the Counties
// screen; the banner itself sells nothing.
//
// Privacy: the fix is resolved to a county by the onboarding code (lib/hometown.ts) and dropped.
// Only "county X was offered at time T" is kept, on the device. Nothing is sent to the server, and
// it runs only with the user's location consent.

export const TRAVEL_OFFER_COOLDOWN_DAYS = 14;
const DAY_MS = 86_400_000;

/** County id → when it was last offered (ms). */
export type TravelLog = Record<string, number>;

export function travelOffer({
  current,
  homeId,
  log,
  nowMs,
  viewingId = null,
}: {
  current: Region | null;
  homeId: string;
  log: TravelLog;
  nowMs: number;
  /** The county already on screen, if the user is looking around one. */
  viewingId?: string | null;
}): Region | null {
  if (current === null || current.id === homeId || current.id === viewingId) return null;
  const last = log[current.id];
  if (last !== undefined && nowMs - last < TRAVEL_OFFER_COOLDOWN_DAYS * DAY_MS) return null;
  return current;
}

export function recordOffer(log: TravelLog, countyId: string, nowMs: number): TravelLog {
  return { ...log, [countyId]: nowMs };
}

export function serializeTravelLog(log: TravelLog): string {
  return JSON.stringify(log);
}

export function parseTravelLog(raw: string | null): TravelLog {
  if (raw === null) return {};
  try {
    const v = JSON.parse(raw) as Record<string, unknown>;
    if (typeof v !== 'object' || v === null) return {};
    return Object.fromEntries(
      Object.entries(v).filter((e): e is [string, number] => typeof e[1] === 'number' && Number.isFinite(e[1])),
    );
  } catch {
    return {};
  }
}

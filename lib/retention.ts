// Retention & auto-expiry (T-094 core · PRIVACY §2). Defined retention windows for the data that
// shouldn't be kept forever; anything past its window auto-expires (a scheduled job applies this).
// The user's collection is their own data and is kept while the account is active (no expiry
// here). Pure so the windows are one source of truth and the expiry job is testable.

const DAY_MS = 86_400_000;

export interface RetentionPolicy {
  /** Analytics events (PostHog / logs) — kept for product analysis, then dropped. */
  analyticsEventDays: number;
  /** Runtime location kept at H3-cell resolution (T-091) — short-lived. */
  runtimeLocationDays: number;
  /** Anonymous accounts with no activity — cleaned up so the auth table doesn't grow forever. */
  inactiveAnonymousUserDays: number;
}

export const DEFAULT_RETENTION: RetentionPolicy = {
  analyticsEventDays: 365,
  runtimeLocationDays: 30,
  inactiveAnonymousUserDays: 90,
};

/** Timestamp (ms) at which a record created at `createdAtMs` expires under `retentionDays`. */
export function expiryMs(createdAtMs: number, retentionDays: number): number {
  return createdAtMs + retentionDays * DAY_MS;
}

/** Whether a record created at `createdAtMs` is past its retention window as of `nowMs`. */
export function isExpired(createdAtMs: number, nowMs: number, retentionDays: number): boolean {
  return nowMs >= expiryMs(createdAtMs, retentionDays);
}

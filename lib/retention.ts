// Retention & auto-expiry (T-094 · PRIVACY §2). Defined retention windows for the data that
// shouldn't be kept forever; anything past its window auto-expires. The daily pg_cron job
// `public.apply_retention` (migration 20261029000004) applies the server-side windows, pinned to
// these values by pipeline/tests/test_retention_job.py.
// The user's collection is their own data and is kept while the account is active (no expiry
// here). Pure so the windows are one source of truth and the expiry job is testable.

export interface RetentionPolicy {
  /** Analytics events (PostHog / logs) — kept for product analysis, then dropped. */
  analyticsEventDays: number;
  /** Runtime location kept at H3-cell resolution (T-091) — short-lived. */
  runtimeLocationDays: number;
  /** Anonymous accounts with no activity — cleaned up so the auth table doesn't grow forever. */
  inactiveAnonymousUserDays: number;
  /** Server-side notification history (who was sent which species). The cadence caps read 48 h. */
  notificationLogDays: number;
}

// keep: T-094 — a values module: pipeline/tests/test_retention_job.py pins the cron job to it.
export const DEFAULT_RETENTION: RetentionPolicy = {
  analyticsEventDays: 365,
  runtimeLocationDays: 30,
  inactiveAnonymousUserDays: 90,
  notificationLogDays: 30,
};

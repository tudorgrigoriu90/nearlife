// Notification cadence & quiet-hours (T-131). The pure gate that decides whether a user may be
// sent a notification *right now*, independent of *which* species is chosen (that is the tested
// candidate selection in lib/notification.ts, T-112). Together they are what the scheduled Edge
// Function evaluates — the prototype cadence (T-032) and the production engine (T-063) both wrap
// this unchanged. Clock- and timezone-free: the caller passes `nowMs` and the user's local hour
// so this stays deterministic and unit-testable; all levers are config, never hardcoded (T-065).

export interface CadenceConfig {
  /** Minimum gap between two sends (frequency cap). */
  minIntervalHours: number;
  /** Maximum sends per local day. */
  maxPerDay: number;
  /** Local hour [0–23] quiet hours begin (inclusive). */
  quietStartHour: number;
  /** Local hour [0–23] quiet hours end (exclusive). May wrap past midnight. */
  quietEndHour: number;
}

/** One notification a day, no earlier than ~20h apart, silent 21:00–08:00 local (TSD §4). */
export const DEFAULT_CADENCE: CadenceConfig = {
  minIntervalHours: 20,
  maxPerDay: 1,
  quietStartHour: 21,
  quietEndHour: 8,
};

export interface SendHistory {
  /** ms since epoch of the last send, or null if none yet. */
  lastSentMs: number | null;
  /** Sends already made during the user's current local day. */
  sentTodayCount: number;
}

export type BlockReason = 'quiet-hours' | 'daily-cap' | 'frequency-cap';

export interface CadenceDecision {
  allowed: boolean;
  /** Set only when `allowed` is false. */
  reason?: BlockReason;
}

/**
 * Whether `localHour` (0–23) falls inside quiet hours. Handles a window that wraps past
 * midnight (e.g. 21→8 means 21,22,23,0,…,7). A start === end window is treated as never quiet.
 */
export function isQuietHour(localHour: number, config: CadenceConfig = DEFAULT_CADENCE): boolean {
  const { quietStartHour: start, quietEndHour: end } = config;
  if (start === end) return false;
  return start < end
    ? localHour >= start && localHour < end
    : localHour >= start || localHour < end;
}

/**
 * Decide whether a notification may be sent now. Checks in priority order: quiet hours →
 * daily cap → frequency cap. All boundaries are honoured exactly (a send exactly
 * `minIntervalHours` after the last is allowed).
 */
export function canSendNow(
  nowMs: number,
  localHour: number,
  history: SendHistory,
  config: CadenceConfig = DEFAULT_CADENCE,
): CadenceDecision {
  if (isQuietHour(localHour, config)) return { allowed: false, reason: 'quiet-hours' };
  if (history.sentTodayCount >= config.maxPerDay) return { allowed: false, reason: 'daily-cap' };
  if (
    history.lastSentMs !== null &&
    nowMs - history.lastSentMs < config.minIntervalHours * 3_600_000
  ) {
    return { allowed: false, reason: 'frequency-cap' };
  }
  return { allowed: true };
}

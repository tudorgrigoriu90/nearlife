import type { Tracker } from './analytics';
import {
  canSendNow,
  DEFAULT_CADENCE,
  type BlockReason,
  type CadenceConfig,
  type SendHistory,
} from './cadence';
import type { Rng } from './notification';
import { selectFromPresence } from './presenceNotification';
import { DEFAULT_TUNING, type NotificationTuning } from './tuning';
import type { Month } from './species/types';
import type { RegionPresence } from './speciesRepository';

// Production notification engine (T-063, TSD §4 steps 3–7). The orchestrator the scheduled Edge
// Function (T-064) runs for each due user: it composes the already-tested parts — the presence
// selection (T-062), the cadence/quiet-hours gate (T-131), the user's notification prefs — into a
// single decision, and produces the delivery-log record for analytics. Pure and clock-free: the
// caller passes `nowMs`, the user's local hour, and the current month, so the whole engine is
// deterministic and unit-testable. All levers are config (T-065 tuning, T-131 cadence).

export interface NotificationPrefs {
  /** Master opt-in. `false` = the user turned notifications off; the engine never sends. */
  enabled: boolean;
}

export const DEFAULT_PREFS: NotificationPrefs = { enabled: true };

/** Everything the engine needs about one due user at decision time. */
export interface DueUser {
  /** The user's region presence rows (live `species_presence`). */
  presence: RegionPresence[];
  /** Species already in the user's collection (dedupe). */
  collectedIds: ReadonlySet<string>;
  history: SendHistory;
  prefs: NotificationPrefs;
  /** User's current local hour [0–23] (for quiet hours). */
  localHour: number;
  /** Current month [1–12] (season gate). */
  month: Month;
  nowMs: number;
}

/** Why a cycle produced no send. `notifications-off`/`no-candidate` sit alongside cadence blocks. */
export type SkipReason = 'notifications-off' | BlockReason | 'no-candidate';

export type EngineDecision =
  | { send: false; reason: SkipReason }
  | { send: true; speciesId: string; occurrences: number; deliveredAtMs: number };

export interface EngineOptions {
  cadence?: CadenceConfig;
  tuning?: NotificationTuning;
  rng?: Rng;
}

/**
 * Decide whether — and what — to send this cycle. Order mirrors TSD §4: master opt-in → cadence
 * (quiet hours → daily cap → frequency cap, from `canSendNow`) → season-gated weighted selection.
 * The cadence gate runs before selection so a blocked user costs no candidate work.
 */
export function decideNotification(user: DueUser, opts: EngineOptions = {}): EngineDecision {
  if (!user.prefs.enabled) return { send: false, reason: 'notifications-off' };

  const cadence = canSendNow(user.nowMs, user.localHour, user.history, opts.cadence ?? DEFAULT_CADENCE);
  if (!cadence.allowed) return { send: false, reason: cadence.reason! };

  const picked = selectFromPresence(
    user.presence,
    user.month,
    user.collectedIds,
    opts.rng ?? Math.random,
    opts.tuning ?? DEFAULT_TUNING,
  );
  if (picked === null) return { send: false, reason: 'no-candidate' };

  return {
    send: true,
    speciesId: picked.speciesId,
    occurrences: picked.occurrences,
    deliveredAtMs: user.nowMs,
  };
}

/**
 * Log a send for the validation funnel (TSD §4 step 7). Emits `notification_delivered` only for a
 * send decision, so a skipped cycle is silent. Consent gating is the tracker's concern
 * (`ConsentGatedTracker`), not the engine's.
 */
export function recordDelivery(tracker: Tracker, decision: EngineDecision): void {
  if (decision.send) tracker.track('notification_delivered', { speciesId: decision.speciesId });
}

import { DEFAULT_CADENCE, type CadenceConfig } from './cadence';
import { allowedHours } from './sendSlot';
import { GROUP_BY_TAXON, type SpeciesGroup } from './species/group';

// Notification choices (T-341 · review F-03, USER-FLOWS §9). Stored on `profiles.notif_prefs` and
// read by the sender; `push_due_users` applies the window and frequency in SQL with the same
// numbers (pinned by __tests__/notifPrefsParity.test.js). Consent stays the master switch (#6): a
// user without a registered device gets nothing whatever these say. Quiet hours 21–08 never move.

export const FREQUENCIES = ['daily', 'everyOtherDay', 'weekly'] as const;
export const SEND_WINDOWS = ['morning', 'midday', 'evening'] as const;
export const PREF_GROUPS = ['bird', 'mammal', 'insect', 'plant', 'other'] as const;

export type Frequency = (typeof FREQUENCIES)[number];
export type SendWindow = (typeof SEND_WINDOWS)[number];
export type PrefGroup = (typeof PREF_GROUPS)[number];

export interface NotifPrefs {
  frequency: Frequency;
  /** null = any waking hour, as before. */
  window: SendWindow | null;
  /** null = every group, as before. */
  groups: PrefGroup[] | null;
}

export const DEFAULT_NOTIF_PREFS: NotifPrefs = { frequency: 'daily', window: null, groups: null };

/**
 * Minimum hours between two sends. A gap rather than a count: "every other day" and "weekly" then
 * mean exactly that, and the per-user slot keeps them at the same hour each time.
 */
export const MIN_INTERVAL_HOURS: Record<Frequency, number> = { daily: 20, everyOtherDay: 44, weekly: 164 };

export const WINDOW_HOURS: Record<SendWindow, number[]> = {
  morning: [8, 9, 10],
  midday: [11, 12, 13, 14],
  evening: [15, 16, 17, 18, 19, 20],
};

const isOneOf = <T extends string>(list: readonly T[], v: unknown): v is T =>
  typeof v === 'string' && (list as readonly string[]).includes(v);

/** The stored JSON, read leniently: anything unknown falls back to today's behaviour. */
export function parseNotifPrefs(value: unknown): NotifPrefs {
  const v = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  const groups = Array.isArray(v.groups) ? v.groups.filter((g): g is PrefGroup => isOneOf(PREF_GROUPS, g)) : [];
  return {
    frequency: isOneOf(FREQUENCIES, v.frequency) ? v.frequency : 'daily',
    window: isOneOf(SEND_WINDOWS, v.window) ? v.window : null,
    groups: groups.length > 0 ? [...new Set(groups)] : null,
  };
}

/** The hours this user may be sent at, in send order: the window inside the waking hours. */
export function hoursFor(prefs: NotifPrefs, cadence: CadenceConfig = DEFAULT_CADENCE): number[] {
  const waking = allowedHours(cadence);
  return prefs.window ? waking.filter((h) => WINDOW_HOURS[prefs.window!].includes(h)) : waking;
}

export function cadenceFor(prefs: NotifPrefs, base: CadenceConfig = DEFAULT_CADENCE): CadenceConfig {
  return { ...base, minIntervalHours: MIN_INTERVAL_HOURS[prefs.frequency] };
}

export function prefGroupOf(group: SpeciesGroup): PrefGroup {
  return isOneOf(PREF_GROUPS, group) ? group : 'other';
}

/**
 * A species' group from the columns the sender reads (`category`, `taxon_group`), as the app derives
 * it (`speciesRowToSpecies`): the category, else the taxon group, else plant.
 */
export function groupOfRow(category: string | null, taxonGroup: string | null): SpeciesGroup {
  return (category as SpeciesGroup | null) ?? GROUP_BY_TAXON[taxonGroup ?? ''] ?? 'plant';
}

import { monthOf } from './season';
import type { Month } from './species/types';

// Live events (T-080 core · GDD §7). Real-calendar seasonal moments — "first swift of spring", the
// salmon run, the mushroom bloom — surfaced only while they are genuinely happening (honest, like
// the rest of the app: never "here right now", always the true season window). Pure core; labels
// are i18n at the UI layer, and the real data layer (E3) can extend/replace these windows.

export interface LiveEvent {
  id: string;
  /** Months the event is genuinely under way in `counties`. */
  months: Month[];
  /**
   * The counties these months are true for (T-275 · review B-17). The first frost and the swifts'
   * arrival come weeks apart in Kronoberg and Norrbotten; an event is shown nowhere else.
   */
  counties: string[];
}

const KRONOBERG = 'SWE.9_1';

export const KRONOBERG_EVENTS: LiveEvent[] = [
  { id: 'first-swift-of-spring', months: [5], counties: [KRONOBERG] },
  { id: 'salmon-run', months: [9, 10], counties: [KRONOBERG] },
  { id: 'mushroom-bloom', months: [8, 9, 10], counties: [KRONOBERG] },
  { id: 'first-frost', months: [11], counties: [KRONOBERG] },
];

/** Whether an event is under way on `date`. */
export function isEventActive(event: LiveEvent, date: Date): boolean {
  return event.months.includes(monthOf(date));
}

/** The events under way in `countyId` on `date`, in definition order. */
export function activeEvents(
  countyId: string,
  date: Date,
  events: LiveEvent[] = KRONOBERG_EVENTS,
): LiveEvent[] {
  return events.filter((event) => event.counties.includes(countyId) && isEventActive(event, date));
}

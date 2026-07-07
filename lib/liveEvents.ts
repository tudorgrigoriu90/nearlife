import { monthOf } from './season';
import type { Month } from './species/types';

// Live events (T-080 core · GDD §7). Real-calendar seasonal moments — "first swift of spring", the
// salmon run, the mushroom bloom — surfaced only while they are genuinely happening (honest, like
// the rest of the app: never "here right now", always the true season window). Pure core; labels
// are i18n at the UI layer, and the real data layer (E3) can extend/replace these windows.

export interface LiveEvent {
  id: string;
  /** Months the event is genuinely under way in the region. */
  months: Month[];
}

export const KRONOBERG_EVENTS: LiveEvent[] = [
  { id: 'first-swift-of-spring', months: [5] },
  { id: 'salmon-run', months: [9, 10] },
  { id: 'mushroom-bloom', months: [8, 9, 10] },
  { id: 'first-frost', months: [11] },
];

/** Whether an event is under way on `date`. */
export function isEventActive(event: LiveEvent, date: Date): boolean {
  return event.months.includes(monthOf(date));
}

/** The events under way on `date`, in definition order. */
export function activeEvents(date: Date, events: LiveEvent[] = KRONOBERG_EVENTS): LiveEvent[] {
  return events.filter((event) => isEventActive(event, date));
}

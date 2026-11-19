import type { TranslationKey } from '../lib/i18n';

// Presentation metadata for seasonal events (T-080, T-357). The pure core (lib/seasonalEvents.ts)
// decides when an event is under way in a county; this maps each event id to its emoji + i18n
// keys. liveEventVisual.test.ts asserts every SEASONAL_EVENTS id has an entry here.
export interface LiveEventVisual {
  emoji: string;
  nameKey: TranslationKey;
  blurbKey: TranslationKey;
}

export const LIVE_EVENT_META: Record<string, LiveEventVisual> = {
  'crane-gathering': { emoji: '🦩', nameKey: 'event.crane-gathering.name', blurbKey: 'event.crane-gathering.blurb' },
  'swift-arrival': { emoji: '🐦', nameKey: 'event.swift-arrival.name', blurbKey: 'event.swift-arrival.blurb' },
  'cuckoo-arrival': { emoji: '🎶', nameKey: 'event.cuckoo-arrival.name', blurbKey: 'event.cuckoo-arrival.blurb' },
  'mushroom-season': { emoji: '🍄', nameKey: 'event.mushroom-season.name', blurbKey: 'event.mushroom-season.blurb' },
  'salmon-run': { emoji: '🐟', nameKey: 'event.salmon-run.name', blurbKey: 'event.salmon-run.blurb' },
};

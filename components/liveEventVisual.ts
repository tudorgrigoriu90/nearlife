import type { TranslationKey } from '../lib/i18n';

// Presentation metadata for live events (T-080). The pure core (lib/liveEvents.ts) owns the
// windows; this maps each event id to its emoji + i18n keys so any surface (This Week, Home) can
// render an active event consistently. Keyed by event id; an event with no entry is simply not
// rendered. liveEventVisual.test.ts asserts every KRONOBERG_EVENTS id has an entry here.
export interface LiveEventVisual {
  emoji: string;
  nameKey: TranslationKey;
  blurbKey: TranslationKey;
}

export const LIVE_EVENT_META: Record<string, LiveEventVisual> = {
  'first-swift-of-spring': {
    emoji: '🐦',
    nameKey: 'event.first-swift-of-spring.name',
    blurbKey: 'event.first-swift-of-spring.blurb',
  },
  'salmon-run': { emoji: '🐟', nameKey: 'event.salmon-run.name', blurbKey: 'event.salmon-run.blurb' },
  'mushroom-bloom': { emoji: '🍄', nameKey: 'event.mushroom-bloom.name', blurbKey: 'event.mushroom-bloom.blurb' },
  'first-frost': { emoji: '❄️', nameKey: 'event.first-frost.name', blurbKey: 'event.first-frost.blurb' },
};

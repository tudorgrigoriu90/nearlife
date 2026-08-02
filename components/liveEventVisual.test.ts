import { KRONOBERG_EVENTS } from '../lib/liveEvents';
import { en } from '../lib/i18n';
import { LIVE_EVENT_META } from './liveEventVisual';

describe('LIVE_EVENT_META', () => {
  it('has a visual entry for every Kronoberg live event (no event renders blank)', () => {
    for (const event of KRONOBERG_EVENTS) {
      expect(LIVE_EVENT_META[event.id]).toBeDefined();
    }
  });

  it('points every entry at i18n keys that exist in the English catalog', () => {
    for (const meta of Object.values(LIVE_EVENT_META)) {
      expect(en[meta.nameKey]).toBeDefined();
      expect(en[meta.blurbKey]).toBeDefined();
    }
  });
});

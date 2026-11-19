import { SEASONAL_EVENTS } from '../lib/seasonalEvents';
import { en } from '../lib/i18n';
import { LIVE_EVENT_META } from './liveEventVisual';

describe('LIVE_EVENT_META', () => {
  it('has a visual entry for every seasonal event (no event renders blank)', () => {
    for (const event of SEASONAL_EVENTS) {
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

import { activeEvents, isEventActive, KRONOBERG_EVENTS, type LiveEvent } from './liveEvents';

const swift: LiveEvent = { id: 'first-swift-of-spring', months: [5] };

describe('live events', () => {
  it('is active only inside the event window', () => {
    expect(isEventActive(swift, new Date('2026-05-10T00:00:00Z'))).toBe(true);
    expect(isEventActive(swift, new Date('2026-06-10T00:00:00Z'))).toBe(false);
  });

  it('surfaces the salmon run in September/October and nothing in July', () => {
    const sept = activeEvents(new Date('2026-09-15T00:00:00Z'));
    expect(sept.map((e) => e.id)).toContain('salmon-run');
    expect(sept.map((e) => e.id)).toContain('mushroom-bloom');
    expect(activeEvents(new Date('2026-07-15T00:00:00Z'))).toEqual([]);
  });

  it('every seed event has at least one month', () => {
    for (const event of KRONOBERG_EVENTS) expect(event.months.length).toBeGreaterThan(0);
  });
});

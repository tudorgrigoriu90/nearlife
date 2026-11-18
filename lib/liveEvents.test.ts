import { activeEvents, isEventActive, KRONOBERG_EVENTS, type LiveEvent } from './liveEvents';

const swift: LiveEvent = { id: 'first-swift-of-spring', months: [5], counties: ['SWE.9_1'] };

describe('live events', () => {
  it('is active only inside the event window', () => {
    expect(isEventActive(swift, new Date('2026-05-10T00:00:00Z'))).toBe(true);
    expect(isEventActive(swift, new Date('2026-06-10T00:00:00Z'))).toBe(false);
  });

  it('surfaces the salmon run in September/October and nothing in July', () => {
    const sept = activeEvents('SWE.9_1', new Date('2026-09-15T00:00:00Z'));
    expect(sept.map((e) => e.id)).toContain('salmon-run');
    expect(sept.map((e) => e.id)).toContain('mushroom-bloom');
    expect(activeEvents('SWE.9_1', new Date('2026-07-15T00:00:00Z'))).toEqual([]);
  });

  it('every seed event has at least one month', () => {
    for (const event of KRONOBERG_EVENTS) expect(event.months.length).toBeGreaterThan(0);
  });
});

const KRONOBERG = 'SWE.9_1';
const NORRBOTTEN = 'SWE.10_1';

// T-275 · review B-17: the windows are Kronoberg's; another county gets none until it has its own.
describe('events belong to their counties', () => {
  it('Norrbotten in November has no "first frost" from Kronoberg', () => {
    expect(activeEvents(NORRBOTTEN, new Date('2026-11-15T00:00:00Z'))).toEqual([]);
    expect(activeEvents(KRONOBERG, new Date('2026-11-15T00:00:00Z')).map((e) => e.id)).toEqual([
      'first-frost',
    ]);
  });

  it('every event names the counties its months are for', () => {
    for (const e of KRONOBERG_EVENTS) expect(e.counties).toEqual([KRONOBERG]);
  });
});

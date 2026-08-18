import { DEFAULT_CADENCE, type CadenceConfig } from './cadence';
import { allowedHours, isAtOrAfterSlot, preferredHour } from './sendSlot';

// T-186. The engine had no jitter at all: `canSendNow` only asked whether the hour was outside
// quiet hours, so a cron firing at 09:00 would have pinged every user in Sweden in the same
// instant. That is both a load spike and, worse for this product, a predictable one — the whole
// point is a small surprise, and a surprise that arrives at exactly 09:00 daily is a schedule.
//
// The jitter is *derived from the user id*, not drawn from an RNG. A random slot would move every
// time the engine ran and no test could pin it; a hashed one is stable per user, spreads the
// population, and stays deterministic.

const WIDE: CadenceConfig = { ...DEFAULT_CADENCE, quietStartHour: 21, quietEndHour: 8 };

describe('allowedHours', () => {
  it('lists the waking hours in order, starting when quiet hours end', () => {
    expect(allowedHours(WIDE)).toEqual([8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
  });

  it('handles a window that does not wrap past midnight', () => {
    expect(allowedHours({ ...WIDE, quietStartHour: 2, quietEndHour: 6 })).toEqual([
      6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0, 1,
    ]);
  });

  it('treats start === end as never quiet', () => {
    expect(allowedHours({ ...WIDE, quietStartHour: 0, quietEndHour: 0 })).toHaveLength(24);
  });
});

describe('preferredHour', () => {
  it('is stable for a given user', () => {
    expect(preferredHour('user-a', WIDE)).toBe(preferredHour('user-a', WIDE));
  });

  it('always falls inside the allowed window', () => {
    const allowed = new Set(allowedHours(WIDE));
    for (let i = 0; i < 500; i += 1) {
      expect(allowed.has(preferredHour(`user-${i}`, WIDE))).toBe(true);
    }
  });

  it('spreads a population across the whole window rather than clustering', () => {
    // The point of the change: without this the distribution is a single spike.
    const seen = new Set<number>();
    for (let i = 0; i < 500; i += 1) seen.add(preferredHour(`user-${i}`, WIDE));
    expect(seen.size).toBe(allowedHours(WIDE).length);
  });

  it('gives different users different slots', () => {
    const hours = ['alice', 'bob', 'carol', 'dave'].map((u) => preferredHour(u, WIDE));
    expect(new Set(hours).size).toBeGreaterThan(1);
  });

  it('does not collapse when ids share a long prefix', () => {
    // Supabase user ids are UUIDs, which differ late; a weak hash would bucket them together.
    const base = '3f8a1c2e-9b4d-4a7f-8c1e-00000000000';
    const seen = new Set(Array.from({ length: 10 }, (_, i) => preferredHour(`${base}${i}`, WIDE)));
    expect(seen.size).toBeGreaterThan(1);
  });
});

describe('isAtOrAfterSlot', () => {
  it('blocks before the user reaches their slot', () => {
    const h = preferredHour('user-a', WIDE);
    const earlier = allowedHours(WIDE).filter((x) => x < h);
    for (const hour of earlier) expect(isAtOrAfterSlot(hour, 'user-a', WIDE)).toBe(false);
  });

  it('allows at the slot and every allowed hour after it', () => {
    // At-or-after, not exactly-at: a missed or failed cycle must self-heal later the same day
    // rather than costing the user their notification entirely.
    const h = preferredHour('user-a', WIDE);
    const later = allowedHours(WIDE).filter((x) => x >= h);
    for (const hour of later) expect(isAtOrAfterSlot(hour, 'user-a', WIDE)).toBe(true);
  });

  it('orders by position in the window, not by clock number, when it wraps', () => {
    const cfg: CadenceConfig = { ...WIDE, quietStartHour: 2, quietEndHour: 22 };
    // Window is 22, 23, 0, 1. Hour 0 comes *after* 23 here despite being a smaller number.
    const order = allowedHours(cfg);
    expect(order).toEqual([22, 23, 0, 1]);
  });
});

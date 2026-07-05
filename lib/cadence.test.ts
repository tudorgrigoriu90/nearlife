import { canSendNow, DEFAULT_CADENCE, isQuietHour, type SendHistory } from './cadence';

const HOUR = 3_600_000;
const fresh: SendHistory = { lastSentMs: null, sentTodayCount: 0 };

describe('isQuietHour', () => {
  it('handles a window that wraps past midnight (21→8)', () => {
    expect(isQuietHour(22)).toBe(true);
    expect(isQuietHour(2)).toBe(true);
    expect(isQuietHour(21)).toBe(true); // inclusive start
    expect(isQuietHour(8)).toBe(false); // exclusive end
    expect(isQuietHour(12)).toBe(false);
  });

  it('handles a same-day window (start < end)', () => {
    const cfg = { ...DEFAULT_CADENCE, quietStartHour: 1, quietEndHour: 6 };
    expect(isQuietHour(3, cfg)).toBe(true);
    expect(isQuietHour(6, cfg)).toBe(false);
    expect(isQuietHour(0, cfg)).toBe(false);
  });

  it('treats start === end as never quiet', () => {
    const cfg = { ...DEFAULT_CADENCE, quietStartHour: 5, quietEndHour: 5 };
    expect(isQuietHour(5, cfg)).toBe(false);
  });
});

describe('canSendNow', () => {
  it('allows a send during waking hours with no history', () => {
    expect(canSendNow(100 * HOUR, 10, fresh)).toEqual({ allowed: true });
  });

  it('blocks during quiet hours regardless of history', () => {
    expect(canSendNow(100 * HOUR, 23, fresh)).toEqual({ allowed: false, reason: 'quiet-hours' });
  });

  it('blocks once the daily cap is reached', () => {
    const history: SendHistory = { lastSentMs: null, sentTodayCount: 1 };
    expect(canSendNow(100 * HOUR, 10, history)).toEqual({ allowed: false, reason: 'daily-cap' });
  });

  it('blocks inside the frequency cap and allows exactly at the boundary', () => {
    const config = { ...DEFAULT_CADENCE, maxPerDay: 5 }; // isolate the interval check
    const now = 100 * HOUR;
    const tooSoon: SendHistory = { lastSentMs: now - 19 * HOUR, sentTodayCount: 1 };
    expect(canSendNow(now, 10, tooSoon, config)).toEqual({ allowed: false, reason: 'frequency-cap' });

    const exactly: SendHistory = { lastSentMs: now - 20 * HOUR, sentTodayCount: 1 };
    expect(canSendNow(now, 10, exactly, config)).toEqual({ allowed: true });
  });

  it('prioritises quiet hours over the caps', () => {
    const capped: SendHistory = { lastSentMs: 100 * HOUR, sentTodayCount: 9 };
    expect(canSendNow(100 * HOUR, 22, capped)).toEqual({ allowed: false, reason: 'quiet-hours' });
  });
});

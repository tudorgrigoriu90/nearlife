import { DEFAULT_RETENTION, expiryMs, isExpired } from './retention';

const DAY = 86_400_000;
const created = Date.UTC(2026, 0, 1);

describe('retention', () => {
  it('computes the expiry timestamp from the window', () => {
    expect(expiryMs(created, 30)).toBe(created + 30 * DAY);
  });

  it('expires a record only once past its window (boundary inclusive)', () => {
    expect(isExpired(created, created + 29 * DAY, 30)).toBe(false);
    expect(isExpired(created, created + 30 * DAY, 30)).toBe(true);
    expect(isExpired(created, created + 31 * DAY, 30)).toBe(true);
  });

  it('has sane default windows (location shortest, analytics longest)', () => {
    expect(DEFAULT_RETENTION.runtimeLocationDays).toBeLessThan(DEFAULT_RETENTION.inactiveAnonymousUserDays);
    expect(DEFAULT_RETENTION.inactiveAnonymousUserDays).toBeLessThan(DEFAULT_RETENTION.analyticsEventDays);
  });

  it('keeps notification history only a little past the 48 h the cadence caps read', () => {
    // The sender reads the last two days to apply its caps (T-201); anything older is behavioural
    // history with no operational use.
    expect(DEFAULT_RETENTION.notificationLogDays).toBeGreaterThanOrEqual(2);
    expect(DEFAULT_RETENTION.notificationLogDays).toBeLessThan(DEFAULT_RETENTION.inactiveAnonymousUserDays);
  });
});

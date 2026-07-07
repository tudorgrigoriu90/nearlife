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
});

import { DEFAULT_RETENTION } from './retention';

describe('retention', () => {
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

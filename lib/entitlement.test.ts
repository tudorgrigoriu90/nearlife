import {
  FULL_GAME_ENTITLEMENT,
  NO_ENTITLEMENTS,
  resolveEntitlements,
} from './entitlement';

describe('resolveEntitlements', () => {
  it('is locked with no active entitlements', () => {
    expect(resolveEntitlements([])).toEqual(NO_ENTITLEMENTS);
    expect(resolveEntitlements([]).fullGame).toBe(false);
  });

  it('unlocks Full Game when its entitlement is active', () => {
    expect(resolveEntitlements([FULL_GAME_ENTITLEMENT]).fullGame).toBe(true);
  });

  it('ignores unrelated entitlement ids', () => {
    expect(resolveEntitlements(['something_else']).fullGame).toBe(false);
    expect(resolveEntitlements(['something_else', FULL_GAME_ENTITLEMENT]).fullGame).toBe(true);
  });
});

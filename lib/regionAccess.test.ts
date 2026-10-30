import { resolveEntitlements, NO_ENTITLEMENTS } from './entitlement';
import { canCollectIn, countyList, regionAccess } from './regionAccess';

const HOME = 'SWE.9_1';

describe('regionAccess (T-105)', () => {
  it('the home county is always open', () => {
    expect(regionAccess(HOME, HOME, NO_ENTITLEMENTS)).toBe('home');
  });

  it('another county is locked until its pack or the all-Sweden pass is owned', () => {
    expect(regionAccess('SWE.13_1', HOME, NO_ENTITLEMENTS)).toBe('locked');
    expect(regionAccess('SWE.13_1', HOME, resolveEntitlements(['region_SWE_13_1']))).toBe('owned');
    expect(regionAccess('SWE.13_1', HOME, resolveEntitlements(['all_regions']))).toBe('owned');
    expect(regionAccess('SWE.4_1', HOME, resolveEntitlements(['region_SWE_13_1']))).toBe('locked');
  });

  it('without a hometown (preview mode) nothing is home', () => {
    expect(regionAccess(HOME, null, NO_ENTITLEMENTS)).toBe('locked');
  });

  it('spotting and catching need home or an owned county; a preview is look-only', () => {
    expect(canCollectIn('home')).toBe(true);
    expect(canCollectIn('owned')).toBe(true);
    expect(canCollectIn('locked')).toBe(false);
  });
});

describe('countyList', () => {
  it('lists all 21 counties, home first, then alphabetical in the reader’s language', () => {
    const list = countyList(HOME, 'sv');
    expect(list).toHaveLength(21);
    expect(list[0]).toEqual({ id: HOME, name: 'Kronoberg' });
    const rest = list.slice(1).map((c) => c.name);
    expect(rest).toEqual([...rest].sort((a, b) => a.localeCompare(b, 'sv')));
    // Swedish order puts Å/Ä/Ö last, after Z.
    expect(rest[rest.length - 1]).toBe('Östergötland');
  });
});

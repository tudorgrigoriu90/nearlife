import { HUNTING_MONTHS, spotWarnings, sunsetAt } from './spotWarnings';
import type { CatchSpot } from './catchSpots';

// T-327 · review I-22 (b, c): dangers that come and go are lines on the screen, not exclusions.

const STOCKHOLM = { lat: 59.33, lon: 18.07 };
const minutesOff = (a: Date, iso: string) => Math.abs(a.getTime() - Date.parse(iso)) / 60_000;

describe('sunsetAt', () => {
  it('matches the published sunset in Stockholm at midsummer and midwinter (±10 min)', () => {
    // timeanddate.com: 21 Jun 2026 22:07 CEST, 21 Dec 2026 14:48 CET.
    expect(minutesOff(sunsetAt(new Date('2026-06-21T12:00:00Z'), STOCKHOLM)!, '2026-06-21T20:07:00Z')).toBeLessThan(10);
    expect(minutesOff(sunsetAt(new Date('2026-12-21T12:00:00Z'), STOCKHOLM)!, '2026-12-21T13:48:00Z')).toBeLessThan(10);
  });

  it('has no sunset under the midnight sun or in the polar night (Kiruna)', () => {
    const kiruna = { lat: 67.86, lon: 20.23 };
    expect(sunsetAt(new Date('2026-06-21T12:00:00Z'), kiruna)).toBeNull();
    expect(sunsetAt(new Date('2026-12-21T12:00:00Z'), kiruna)).toBeNull();
  });
});

function spot(habitat: CatchSpot['habitat'], at = STOCKHOLM): CatchSpot {
  return { id: 'n1', kind: 'viewpoint', habitat, name: null, lat: at.lat, lon: at.lon };
}
const keys = (w: ReturnType<typeof spotWarnings>) => w.map((x) => x.key);
const MIDDAY_JAN = new Date('2026-01-15T11:00:00Z');
const MIDDAY_APR = new Date('2026-04-15T10:00:00Z');

describe('spotWarnings: ice', () => {
  it('warns at freshwater and coast spots from December to March', () => {
    for (const iso of ['2026-12-10T11:00:00Z', '2026-01-15T11:00:00Z', '2026-03-31T10:00:00Z']) {
      expect(keys(spotWarnings(spot('freshwater'), 'SWE.1_1', new Date(iso)))).toContain('catchSpot.ice');
      expect(keys(spotWarnings(spot('coast'), 'SWE.1_1', new Date(iso)))).toContain('catchSpot.ice');
    }
  });

  it('is silent in April and at land spots', () => {
    expect(keys(spotWarnings(spot('freshwater'), 'SWE.1_1', MIDDAY_APR))).not.toContain('catchSpot.ice');
    expect(keys(spotWarnings(spot('land'), 'SWE.1_1', MIDDAY_JAN))).not.toContain('catchSpot.ice');
  });

  it('reads the month in Sweden: 23:30 UTC on 30 November is already December', () => {
    expect(keys(spotWarnings(spot('coast'), 'SWE.1_1', new Date('2026-11-30T23:30:00Z')))).toContain('catchSpot.ice');
  });
});

describe('spotWarnings: hunting season', () => {
  const table = { 'SWE.9_1': [9, 10, 11, 12, 1] };

  it('warns at land spots in the county’s hunting months', () => {
    const w = spotWarnings(spot('land'), 'SWE.9_1', new Date('2026-09-10T10:00:00Z'), table);
    expect(keys(w)).toContain('catchSpot.hunting');
  });

  it('is silent outside them, at water spots, and in a county with no row', () => {
    expect(keys(spotWarnings(spot('land'), 'SWE.9_1', new Date('2026-06-10T10:00:00Z'), table))).toEqual([]);
    expect(keys(spotWarnings(spot('freshwater'), 'SWE.9_1', new Date('2026-09-10T10:00:00Z'), table))).toEqual([]);
    expect(keys(spotWarnings(spot('land'), 'SWE.1_1', new Date('2026-09-10T10:00:00Z'), table))).toEqual([]);
  });

  it('ships with months only for real counties (T-328 fills them)', () => {
    for (const [region, months] of Object.entries(HUNTING_MONTHS)) {
      expect(region).toMatch(/^SWE\.\d+_1$/);
      for (const m of months) expect(m >= 1 && m <= 12).toBe(true);
    }
  });
});

describe('spotWarnings: darkness', () => {
  // Stockholm sunset on 15 April 2026 is about 18:01 UTC.
  it('says when it gets dark once sunset is within the hour, in Swedish time', () => {
    const w = spotWarnings(spot('land'), 'SWE.1_1', new Date('2026-04-15T17:20:00Z'));
    const dark = w.find((x) => x.key === 'catchSpot.dark');
    expect(dark?.params?.time).toMatch(/^20:0\d$/); // CEST
  });

  it('is silent earlier in the day and after sunset', () => {
    expect(keys(spotWarnings(spot('land'), 'SWE.1_1', MIDDAY_APR))).toEqual([]);
    expect(keys(spotWarnings(spot('land'), 'SWE.1_1', new Date('2026-04-15T19:30:00Z')))).toEqual([]);
  });
});

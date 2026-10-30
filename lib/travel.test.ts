import {
  TRAVEL_OFFER_COOLDOWN_DAYS,
  parseTravelLog,
  recordOffer,
  serializeTravelLog,
  travelOffer,
} from './travel';

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 6, 1);
const HOME = { id: 'SWE.9_1', name: 'Kronoberg' };
const SKANE = { id: 'SWE.13_1', name: 'Skåne' };

describe('travelOffer (T-218)', () => {
  it('offers the county the phone is in when it is not home', () => {
    expect(travelOffer({ current: SKANE, homeId: HOME.id, log: {}, nowMs: NOW })).toEqual(SKANE);
  });

  it('never offers home, and stays quiet without a fix', () => {
    expect(travelOffer({ current: HOME, homeId: HOME.id, log: {}, nowMs: NOW })).toBeNull();
    expect(travelOffer({ current: null, homeId: HOME.id, log: {}, nowMs: NOW })).toBeNull();
  });

  it('offers a county at most once per cooldown: it never nags', () => {
    const log = recordOffer({}, SKANE.id, NOW);
    expect(travelOffer({ current: SKANE, homeId: HOME.id, log, nowMs: NOW + DAY })).toBeNull();
    const later = NOW + TRAVEL_OFFER_COOLDOWN_DAYS * DAY;
    expect(travelOffer({ current: SKANE, homeId: HOME.id, log, nowMs: later })).toEqual(SKANE);
  });

  it('does not offer the county already being viewed', () => {
    expect(
      travelOffer({ current: SKANE, homeId: HOME.id, log: {}, nowMs: NOW, viewingId: SKANE.id }),
    ).toBeNull();
  });
});

describe('travel log storage', () => {
  it('round-trips', () => {
    const log = recordOffer({}, SKANE.id, NOW);
    expect(parseTravelLog(serializeTravelLog(log))).toEqual(log);
  });

  it('decays corrupt data to an empty log', () => {
    expect(parseTravelLog(null)).toEqual({});
    expect(parseTravelLog('{nope')).toEqual({});
    expect(parseTravelLog('{"SWE.13_1":"yesterday"}')).toEqual({});
  });

  it('never stores where the phone was, only which county was offered when', () => {
    const raw = serializeTravelLog(recordOffer({}, SKANE.id, NOW));
    expect(raw).not.toMatch(/lat|lon/i);
  });
});

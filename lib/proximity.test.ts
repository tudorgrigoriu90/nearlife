import { haversineMeters, nearestSpot, proximityState, type LatLng } from './proximity';

// Växjö, Kronoberg-ish reference points.
const user: LatLng = { latitude: 56.8777, longitude: 14.8091 };
const near: LatLng = { latitude: 56.8781, longitude: 14.8095 }; // ~50 m away
const far: LatLng = { latitude: 56.9, longitude: 14.9 }; // several km away

describe('haversineMeters', () => {
  it('is ~0 for the same point', () => {
    expect(haversineMeters(user, user)).toBeCloseTo(0, 5);
  });

  it('measures a short hop in the tens of metres', () => {
    const d = haversineMeters(user, near);
    expect(d).toBeGreaterThan(20);
    expect(d).toBeLessThan(100);
  });

  it('is symmetric', () => {
    expect(haversineMeters(user, far)).toBeCloseTo(haversineMeters(far, user), 6);
  });
});

describe('nearestSpot', () => {
  it('returns the closest spot', () => {
    const result = nearestSpot(user, [far, near]);
    expect(result?.spot).toBe(near);
  });

  it('returns null when there are no spots', () => {
    expect(nearestSpot(user, [])).toBeNull();
  });
});

describe('proximityState', () => {
  it('is gps-off when the user location is unknown', () => {
    expect(proximityState(null, [near])).toBe('gps-off');
  });

  it('is no-spots when there are none nearby', () => {
    expect(proximityState(user, [])).toBe('no-spots');
  });

  it('is in-range within the catch radius and too-far beyond it', () => {
    expect(proximityState(user, [near])).toBe('in-range');
    expect(proximityState(user, [far])).toBe('too-far');
  });

  it('honours a custom range', () => {
    expect(proximityState(user, [near], 10)).toBe('too-far'); // near is ~50 m
  });
});

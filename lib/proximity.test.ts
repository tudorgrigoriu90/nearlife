import { haversineMeters, type LatLng } from './proximity';

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

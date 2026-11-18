import { fixIfConsented, locationOutcome } from './locationAccess';

// T-272 · review B-08: the Location switch controls every location read.
describe('fixIfConsented', () => {
  it('never asks for a fix while location consent is off', async () => {
    const getFix = jest.fn(async () => ({ latitude: 56.9, longitude: 14.8 }));
    await expect(fixIfConsented(() => false, getFix)()).resolves.toBeNull();
    expect(getFix).not.toHaveBeenCalled();
  });

  it('asks for one when it is on', async () => {
    const getFix = jest.fn(async () => ({ latitude: 56.9, longitude: 14.8 }));
    await expect(fixIfConsented(() => true, getFix)()).resolves.toEqual({
      latitude: 56.9,
      longitude: 14.8,
    });
  });
});

describe('locationOutcome', () => {
  it('tells a refusal the user can still answer from one only Settings can lift', () => {
    expect(locationOutcome({ status: 'granted', canAskAgain: true })).toBe('granted');
    expect(locationOutcome({ status: 'denied', canAskAgain: true })).toBe('denied');
    expect(locationOutcome({ status: 'denied', canAskAgain: false })).toBe('blocked');
  });
});

import { KRONOBERG_REGION, resolveHometown } from './hometown';

describe('resolveHometown', () => {
  it('resolves any device location to Kronoberg in the prototype', () => {
    expect(resolveHometown({ latitude: 56.88, longitude: 14.81 })).toEqual(KRONOBERG_REGION);
    expect(resolveHometown({ latitude: 0, longitude: 0 })).toEqual(KRONOBERG_REGION);
  });

  it('returns only the region — coordinates are discarded, never surfaced (PRIVACY §1)', () => {
    const region = resolveHometown({ latitude: 59.33, longitude: 18.06 });
    expect(Object.keys(region).sort()).toEqual(['id', 'name']);
    expect(region).not.toHaveProperty('latitude');
    expect(region).not.toHaveProperty('longitude');
  });

  it('still resolves with no coordinates supplied', () => {
    expect(resolveHometown()).toEqual(KRONOBERG_REGION);
  });
});

import type { CountyShape } from './geo/countyShape';
import { KRONOBERG_REGION, NEAREST_COUNTY_MAX_KM, resolveHometown } from './hometown';

// Real places, real outlines (lib/geo/swedishCounties.ts). One per county, so a join that slipped
// by one — every user in their neighbour's county — cannot pass.
const PLACES: [string, number, number, string][] = [
  ['Karlskrona', 56.161, 15.586, 'SWE.1_1'],
  ['Falun', 60.607, 15.631, 'SWE.2_1'],
  ['Gävle', 60.675, 17.141, 'SWE.3_1'],
  ['Visby', 57.634, 18.295, 'SWE.4_1'],
  ['Halmstad', 56.674, 12.858, 'SWE.5_1'],
  ['Östersund', 63.179, 14.636, 'SWE.6_1'],
  ['Jönköping', 57.783, 14.161, 'SWE.7_1'],
  ['Kalmar', 56.663, 16.356, 'SWE.8_1'],
  ['Växjö', 56.879, 14.806, 'SWE.9_1'],
  ['Kiruna', 67.855, 20.225, 'SWE.10_1'],
  ['Örebro', 59.274, 15.207, 'SWE.11_1'],
  ['Linköping', 58.411, 15.622, 'SWE.12_1'],
  ['Malmö', 55.605, 13.003, 'SWE.13_1'],
  ['Eskilstuna', 59.371, 16.51, 'SWE.14_1'],
  ['Stockholm', 59.329, 18.069, 'SWE.15_1'],
  ['Uppsala', 59.858, 17.639, 'SWE.16_1'],
  ['Karlstad', 59.402, 13.511, 'SWE.17_1'],
  ['Umeå', 63.826, 20.263, 'SWE.18_1'],
  ['Sundsvall', 62.391, 17.307, 'SWE.19_1'],
  ['Västerås', 59.61, 16.545, 'SWE.20_1'],
  ['Göteborg', 57.709, 11.974, 'SWE.21_1'],
];

describe('resolveHometown', () => {
  it.each(PLACES)('puts %s in its own county', (_place, latitude, longitude, id) => {
    expect(resolveHometown({ latitude, longitude })?.id).toBe(id);
  });

  it('uses the Swedish county name', () => {
    expect(resolveHometown({ latitude: 59.274, longitude: 15.207 })?.name).toBe('Örebro');
    expect(resolveHometown({ latitude: 56.879, longitude: 14.806 })).toEqual(KRONOBERG_REGION);
  });

  it('returns null outside Sweden — v1 is Sweden only', () => {
    expect(resolveHometown({ latitude: 59.913, longitude: 10.752 })).toBeNull(); // Oslo
    expect(resolveHometown({ latitude: 55.676, longitude: 12.568 })).toBeNull(); // Copenhagen
    expect(resolveHometown({ latitude: 60.17, longitude: 24.94 })).toBeNull(); // Helsinki
    expect(resolveHometown({ latitude: 55.63, longitude: 12.65 })).toBeNull(); // Kastrup
    expect(resolveHometown({ latitude: 0, longitude: 0 })).toBeNull();
  });

  it('keeps outer islands the outlines leave out', () => {
    expect(resolveHometown({ latitude: 58.74, longitude: 17.87 })?.id).toBe('SWE.15_1'); // Landsort
    expect(resolveHometown({ latitude: 65.57, longitude: 23.75 })?.id).toBe('SWE.10_1'); // Sandskär
    expect(resolveHometown({ latitude: 56.879, longitude: 16.656 })?.id).toBe('SWE.8_1'); // Öland
    expect(resolveHometown({ latitude: 57.92, longitude: 19.13 })?.id).toBe('SWE.4_1'); // Fårö
  });

  it('falls back to the nearest county just off a simplified coast, within the limit only', () => {
    // A square county; a point 3 km east of its edge is "near", one 30 km east is not.
    const shapes: CountyShape[] = [
      { id: 'A', name: 'A', polygons: [[[14, 56], [15, 56], [15, 57], [14, 57], [14, 56]]] },
    ];
    const kmPerDegLng = 111.32 * Math.cos((56.5 * Math.PI) / 180);
    const near = { latitude: 56.5, longitude: 15 + 3 / kmPerDegLng };
    const far = { latitude: 56.5, longitude: 15 + 30 / kmPerDegLng };
    expect(resolveHometown(near, shapes)?.id).toBe('A');
    expect(resolveHometown(far, shapes)).toBeNull();
    expect(NEAREST_COUNTY_MAX_KM).toBeLessThan(30);
  });

  it('returns only the region — coordinates are discarded, never surfaced (PRIVACY §1)', () => {
    const region = resolveHometown({ latitude: 59.33, longitude: 18.06 });
    expect(Object.keys(region ?? {}).sort()).toEqual(['id', 'name']);
  });
});

import { MAP_STYLE_URL, nearbySpots, spotsGeoJson } from './spotMap';
import { catchSpotView, type CatchSpot } from './catchSpots';

const s = (id: string, lat: number, lon: number, habitat: CatchSpot['habitat'] = 'land'): CatchSpot => ({
  id, kind: 'viewpoint', habitat, name: null, lat, lon,
});
const ME = { latitude: 56.8777, longitude: 14.8091 };

describe('spot map data (T-067)', () => {
  it('turns spots into GeoJSON points, marking the chosen one', () => {
    const geo = spotsGeoJson([s('n1', 56.88, 14.81), s('n2', 56.9, 14.8)], 'n2');
    expect(geo.features).toHaveLength(2);
    expect(geo.features[1]).toEqual({
      type: 'Feature',
      id: 'n2',
      geometry: { type: 'Point', coordinates: [14.8, 56.9] }, // GeoJSON is [lon, lat]
      properties: { id: 'n2', target: true },
    });
    expect(geo.features[0].properties.target).toBe(false);
  });

  it('keeps the map light: the nearest spots only', () => {
    const many = Array.from({ length: 500 }, (_, i) => s(`n${i}`, 56.8777 + i * 0.001, 14.8091));
    const near = nearbySpots(ME, many, 50);
    expect(near).toHaveLength(50);
    expect(near[0].id).toBe('n0');
  });

  it('without a position, shows the first spots rather than nothing', () => {
    expect(nearbySpots(null, [s('n1', 56, 14), s('n2', 57, 15)], 1)).toHaveLength(1);
  });

  it('uses OpenFreeMap: free, no key, OpenStreetMap data', () => {
    expect(MAP_STYLE_URL).toMatch(/^https:\/\/tiles\.openfreemap\.org\/styles\//);
  });
});

describe('choosing a spot on the map', () => {
  it('measures to the chosen spot instead of the nearest', () => {
    const near = s('n1', 56.8787, 14.8091);
    const far = s('n2', 56.8877, 14.8091);
    expect(catchSpotView(ME, [near, far], ['land']).spot?.id).toBe('n1');
    expect(catchSpotView(ME, [near, far], ['land'], undefined, 'n2')).toMatchObject({ spot: { id: 'n2' }, state: 'too-far' });
  });

  it('ignores a choice that does not suit the species', () => {
    const lake = s('n3', 56.8787, 14.8091, 'freshwater');
    const hill = s('n4', 56.8877, 14.8091);
    expect(catchSpotView(ME, [lake, hill], ['land'], undefined, 'n3').spot?.id).toBe('n4');
  });
});

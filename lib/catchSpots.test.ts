import {
  SupabaseCatchSpotSource,
  catchSpotView,
  habitatsFor,
  nearestSpotFor,
  parseSpots,
  type CatchSpot,
  type CatchSpotClient,
} from './catchSpots';

const spot = (id: string, habitat: CatchSpot['habitat'], lat: number, lon: number): CatchSpot => ({
  id,
  kind: 'viewpoint',
  habitat,
  name: null,
  lat,
  lon,
});

// Växjö centre and two spots: a lake shore ~600 m away, a viewpoint ~1.1 km away.
const ME = { latitude: 56.8777, longitude: 14.8091 };
const LAKE = spot('n1', 'freshwater', 56.8827, 14.8121);
const HILL = spot('n2', 'land', 56.8877, 14.8091);

describe('habitatsFor', () => {
  it('uses the species’ own habitats when the database has them', () => {
    expect(habitatsFor({ category: 'fish', catchHabitats: ['freshwater'] })).toEqual(['freshwater']);
  });

  it('falls back to a cautious default by category', () => {
    expect(habitatsFor({ category: 'fish' })).toEqual(['freshwater', 'coast']);
    expect(habitatsFor({ category: 'bird' })).toEqual(['land', 'freshwater', 'coast']);
    expect(habitatsFor({ category: 'mammal' })).toEqual(['land']);
  });
});

describe('nearestSpotFor', () => {
  it('picks the nearest spot of a habitat the species lives in', () => {
    expect(nearestSpotFor(ME, [LAKE, HILL], ['land'])?.spot.id).toBe('n2');
    expect(nearestSpotFor(ME, [LAKE, HILL], ['freshwater'])?.spot.id).toBe('n1');
  });

  it('is null when no spot suits the species: a pike is never sent to a hill', () => {
    expect(nearestSpotFor(ME, [HILL], ['freshwater'])).toBeNull();
  });

  it('reports the distance in metres', () => {
    const d = nearestSpotFor(ME, [LAKE], ['freshwater'])!.distanceM;
    expect(d).toBeGreaterThan(500);
    expect(d).toBeLessThan(700);
  });
});

describe('parseSpots', () => {
  it('keeps well-formed rows and drops the rest', () => {
    expect(
      parseSpots([
        { id: 'n1', kind: 'viewpoint', habitat: 'land', name: 'Utsikten', lat: 56.9, lon: 14.8 },
        { id: 'n2', kind: 'viewpoint', habitat: 'swamp', lat: 56.9, lon: 14.8 },
        { id: 'n3', kind: 'viewpoint', habitat: 'land', lat: 'x', lon: 14.8 },
      ]),
    ).toEqual([{ id: 'n1', kind: 'viewpoint', habitat: 'land', name: 'Utsikten', lat: 56.9, lon: 14.8 }]);
  });
});

describe('SupabaseCatchSpotSource', () => {
  it('reads a county past the 1,000-row page cap, in a stable order', async () => {
    const pages = [
      Array.from({ length: 1000 }, (_, i) => ({ id: `n${i}`, kind: 'park', habitat: 'land', name: null, lat: 56, lon: 14 })),
      [{ id: 'n1000', kind: 'park', habitat: 'land', name: null, lat: 56, lon: 14 }],
    ];
    const range = jest.fn();
    const client = {
      from: () => ({
        select: () => ({
          eq: () => ({
            order: () => ({
              range: (from: number, to: number) => {
                range(from, to);
                return Promise.resolve({ data: pages[from / 1000] ?? [], error: null });
              },
            }),
          }),
        }),
      }),
    } as unknown as CatchSpotClient;
    const spots = await new SupabaseCatchSpotSource(client).forRegion('SWE.9_1');
    expect(spots).toHaveLength(1001);
    expect(range.mock.calls).toEqual([
      [0, 999],
      [1000, 1999],
    ]);
  });
});

describe('SupabaseCatchSpotSource.habitatsOf', () => {
  function client(data: unknown) {
    return {
      from: () => ({ select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data, error: null }) }) }) }),
    } as unknown as CatchSpotClient;
  }

  it('reads the species’ habitats', async () => {
    await expect(new SupabaseCatchSpotSource(client({ catch_habitats: ['freshwater'] })).habitatsOf('gbif:1')).resolves.toEqual([
      'freshwater',
    ]);
  });

  it('is null when the loader has not reached the species', async () => {
    await expect(new SupabaseCatchSpotSource(client({ catch_habitats: null })).habitatsOf('gbif:1')).resolves.toBeNull();
    await expect(new SupabaseCatchSpotSource(client(null)).habitatsOf('gbif:1')).resolves.toBeNull();
  });
});


describe('catchSpotView', () => {
  it('lets the user catch within range of a suitable spot', () => {
    const atLake = { latitude: LAKE.lat, longitude: LAKE.lon + 0.0005 }; // ~30 m
    expect(catchSpotView(atLake, [LAKE, HILL], ['freshwater'])).toMatchObject({ state: 'in-range', spot: { id: 'n1' } });
  });

  it('shows the way when the nearest suitable spot is further', () => {
    expect(catchSpotView(ME, [LAKE, HILL], ['freshwater'])).toMatchObject({ state: 'too-far', spot: { id: 'n1' } });
  });

  it('says so when nothing in the county suits the species', () => {
    expect(catchSpotView(ME, [HILL], ['freshwater'])).toEqual({ state: 'no-spots', spot: null, distanceM: null });
  });

  it('needs a position, but still shows where to go without one', () => {
    expect(catchSpotView(null, [LAKE], ['freshwater'])).toMatchObject({ state: 'gps-off' });
  });
});

describe('an unmapped county', () => {
  it('does not block catching when no spots are loaded for the county at all', () => {
    expect(catchSpotView(ME, [], ['freshwater'])).toEqual({ state: 'unmapped', spot: null, distanceM: null });
  });
});


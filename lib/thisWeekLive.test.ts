import type { RegionPresence, SpeciesSummary } from './speciesRepository';
import { liveThisWeek, THIS_WEEK_SHOWN } from './thisWeekLive';

const presence = (id: string, occurrences: number, months = [6]): RegionPresence => ({
  speciesId: id,
  activeMonths: months,
  occurrences,
});

const describeAll = jest.fn(async (ids: string[]): Promise<SpeciesSummary[]> =>
  ids.map((id) => ({ species: { id } as never, commonName: `name:${id}`, detail: null })),
);

beforeEach(() => describeAll.mockClear());

describe('liveThisWeek', () => {
  it('describes the county list in order, with NEW flags from the collection', async () => {
    const out = await liveThisWeek(
      [presence('a', 10), presence('b', 500), presence('off', 900, [1])],
      6,
      new Set(['b']),
      'sv',
      describeAll,
    );
    expect(out.state).toBe('active');
    expect(out.total).toBe(2);
    expect(out.items.map((i) => [i.species.id, i.isNew])).toEqual([
      ['a', true],
      ['b', false],
    ]);
    expect(describeAll).toHaveBeenCalledWith(['a', 'b'], 'sv');
  });

  it('only describes the rows it shows, but counts them all', async () => {
    const many = Array.from({ length: 2000 }, (_, i) => presence(`s${i}`, 2000 - i));
    const out = await liveThisWeek(many, 6, new Set(), 'en', describeAll);
    expect(out.total).toBe(2000);
    expect(describeAll.mock.calls[0][0]).toHaveLength(THIS_WEEK_SHOWN);
    expect(out.items[0].species.id).toBe('s0'); // most-observed first
  });

  it('reports a quiet month honestly', async () => {
    const out = await liveThisWeek([presence('off', 5, [1])], 6, new Set(), 'en', describeAll);
    expect(out).toEqual({ state: 'quiet', total: 0, items: [] });
  });
});

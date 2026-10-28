import { almanacBase, collectedExtras } from './almanacCatalogue';
import { KRONOBERG_SPECIES } from './species/kronoberg';
import type { Species } from './species/types';
import type { SpeciesRepository } from './speciesRepository';

const sp = (id: string) => ({ id, commonName: id }) as Species;

function repo(): SpeciesRepository {
  return {
    listSpecies: async () => [],
    getContent: async () => null,
    getContentInLocale: async () => null,
    regionPresence: async () => [],
    regionCatalogue: jest.fn(async () => [sp('a'), sp('b')]),
    describeSpecies: jest.fn(async (ids: string[]) =>
      ids.map((id) => ({ species: sp(id), commonName: id, detail: null })),
    ),
  };
}

describe('almanacBase', () => {
  it('lists the user\'s county', async () => {
    const r = repo();
    expect((await almanacBase(r, 'SWE.13_1', 'sv')).map((s) => s.id)).toEqual(['a', 'b']);
    expect(r.regionCatalogue).toHaveBeenCalledWith('SWE.13_1', 'sv');
  });

  it('shows the bundled set in preview mode, without a network read', async () => {
    const r = repo();
    expect(await almanacBase(r, null, 'en')).toEqual(KRONOBERG_SPECIES);
    expect(r.regionCatalogue).not.toHaveBeenCalled();
  });
});

describe('collectedExtras', () => {
  it('adds collected species the county list does not hold, once each', async () => {
    const r = repo();
    const extras = await collectedExtras(r, [sp('a')], ['a', 'moose', 'moose', 'fox'], 'sv');
    expect(extras.map((s) => s.id)).toEqual(['fox', 'moose']);
    expect(r.describeSpecies).toHaveBeenCalledWith(['fox', 'moose'], 'sv');
  });

  it('makes no request when everything collected is already listed', async () => {
    const r = repo();
    expect(await collectedExtras(r, [sp('a')], ['a'], 'en')).toEqual([]);
    expect(r.describeSpecies).not.toHaveBeenCalled();
  });
});

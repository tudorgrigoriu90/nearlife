import { composeRepository, PackSpeciesRepository } from './offlineRepository';
import type { OfflinePack } from './offlinePack';
import { HardcodedSpeciesRepository, type CatalogueRow, type SpeciesRepository } from './speciesRepository';

const row = (id: string, extra: Partial<CatalogueRow> = {}): CatalogueRow =>
  ({
    id,
    scientific_name: `Genus ${id}`,
    common_name: `En ${id}`,
    category: 'bird',
    rarity: 'common',
    active_months: [5, 6],
    taxon_group: 'bird',
    local_name: `Sv ${id}`,
    occurrences: 10,
    photo_url: `https://x/${id}.jpg`,
    photo_source_url: `https://commons/${id}`,
    photo_author: 'A. Photographer',
    photo_license: 'CC-BY',
    ...extra,
  }) as CatalogueRow;
const text = (id: string, locale: string, fact = `fact ${locale}`) => ({
  species_id: id,
  locale,
  common_name: `${locale} ${id}`,
  fact,
  when_how: `when ${locale}`,
  give: 'g',
  protect: 'p',
});
const pack: OfflinePack = {
  version: 1,
  regionId: 'SWE.9_1',
  locale: 'sv',
  secondaryLocale: 'ro',
  savedAt: '2026-11-10T12:00:00.000Z',
  catalogue: [row('a'), row('b'), row('c', { photo_url: null, photo_license: null })],
  presence: [{ species_id: 'a', active_months: [6, 5], occurrences: 3 }],
  content: [text('a', 'sv'), text('a', 'ro'), text('b', 'en')],
  thumbs: { a: 'https://commons/a' },
};
const uri = (id: string) => `file:///offline/thumbs/${id}.webp`;
const repo = new PackSpeciesRepository(pack, uri);

// T-257: play from the saved county.
describe('PackSpeciesRepository', () => {
  it('serves the saved county with names, and photos from the phone', async () => {
    const species = await repo.regionCatalogue('SWE.9_1', 'sv');
    expect(species.map((s) => s.id)).toEqual(['a', 'b', 'c']);
    expect(species[0].names?.sv).toBe('Sv a');
    expect(species[0].photo).toMatchObject({ url: uri('a'), license: 'CC-BY', author: 'A. Photographer' });
    expect(species[1].photo).toBeUndefined(); // no saved thumbnail: the glyph, not a broken remote image
    expect(species[2].photo).toBeUndefined();
  });

  it('serves presence for This Week', async () => {
    expect(await repo.regionPresence('SWE.9_1')).toEqual([{ speciesId: 'a', activeMonths: [5, 6], occurrences: 3 }]);
  });

  it('has nothing for another county, so the caller falls back', async () => {
    await expect(repo.regionCatalogue('SWE.1_1', 'sv')).rejects.toThrow();
    await expect(repo.regionPresence('SWE.1_1')).rejects.toThrow();
  });

  it('gives card text in the language, then English; the second language exactly', async () => {
    expect((await repo.getContent('a', 'sv'))?.fact).toBe('fact sv');
    expect((await repo.getContent('b', 'sv'))?.fact).toBe('fact en');
    expect(await repo.getContent('c', 'sv')).toBeNull();
    expect((await repo.getContentInLocale('a', 'ro'))?.fact).toBe('fact ro');
    expect(await repo.getContentInLocale('b', 'ro')).toBeNull();
  });

  it('describes species for lists, in the given order', async () => {
    const rows = await repo.describeSpecies(['b', 'a', 'zz'], 'sv');
    expect(rows.map((r) => r.species.id)).toEqual(['b', 'a']);
    expect(rows[1]).toMatchObject({ commonName: 'Sv a', detail: 'when sv' });
    expect(rows[0].detail).toBe('when en');
    expect((await repo.listSpecies('sv')).map((l) => l.species.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('composeRepository', () => {
  const failing: SpeciesRepository = {
    listSpecies: () => Promise.reject(new Error('offline')),
    getContent: () => Promise.reject(new Error('offline')),
    getContentInLocale: () => Promise.reject(new Error('offline')),
    regionPresence: () => Promise.reject(new Error('offline')),
    describeSpecies: () => Promise.reject(new Error('offline')),
    regionCatalogue: jest.fn(() => Promise.reject(new Error('offline'))),
  };
  const bundled = new HardcodedSpeciesRepository();
  beforeAll(() => jest.spyOn(console, 'warn').mockImplementation(() => undefined));

  it('offline with a pack: straight to the pack, the server is not even tried', async () => {
    const r = composeRepository({ online: failing, bundled, pack, thumbUri: uri, offline: true });
    expect((await r.regionCatalogue('SWE.9_1', 'sv')).length).toBe(3);
    expect(failing.regionCatalogue).not.toHaveBeenCalled();
  });

  it('online: the server first, then the pack if the server fails', async () => {
    const r = composeRepository({ online: failing, bundled, pack, thumbUri: uri, offline: false });
    expect((await r.regionCatalogue('SWE.9_1', 'sv')).length).toBe(3);
    expect(failing.regionCatalogue).toHaveBeenCalled();
  });

  it('another county offline falls back to the bundled species', async () => {
    const r = composeRepository({ online: failing, bundled, pack, thumbUri: uri, offline: true });
    expect((await r.regionCatalogue('SWE.1_1', 'sv')).length).toBeGreaterThan(0);
  });
});

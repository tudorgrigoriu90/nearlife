import { composeRepository, PackSpeciesRepository } from './offlineRepository';
import type { OfflinePack } from './offlinePack';
import { HardcodedSpeciesRepository, type CatalogueRow, type SpeciesRepository } from './speciesRepository';

// The factory shares the app's one Supabase client, whose session lives in AsyncStorage (T-308).
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

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
  version: 2,
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
  });
});

describe('composeRepository', () => {
  const failing: SpeciesRepository = {
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

  it('another county offline has no data rather than Kronoberg stand-ins (T-275 · B-14)', async () => {
    const r = composeRepository({ online: failing, bundled, pack, thumbUri: uri, offline: true });
    await expect(r.regionCatalogue('SWE.1_1', 'sv')).rejects.toThrow();
  });
});


// T-322 · review B-32: text is read per language, once, when first asked for.
describe('PackSpeciesRepository reading text on demand', () => {
  const { content: _inline, ...index } = pack;
  const files: Record<string, string> = {
    sv: JSON.stringify([text('a', 'sv')]),
    en: JSON.stringify([text('b', 'en')]),
  };

  it('builds nothing and reads nothing until asked; each language once', async () => {
    const reads: string[] = [];
    const lazy = new PackSpeciesRepository(index as OfflinePack, uri, async (locale) => {
      reads.push(locale);
      return files[locale] ?? null;
    });
    expect(reads).toEqual([]);
    expect((await lazy.getContent('a', 'sv'))?.fact).toBe('fact sv');
    expect((await lazy.getContent('a', 'sv'))?.fact).toBe('fact sv');
    expect(reads).toEqual(['sv']);
    expect((await lazy.getContent('b', 'sv'))?.fact).toBe('fact en'); // English where Swedish is missing
    expect(reads).toEqual(['sv', 'en']);
  });

  it('a language with no file, or a broken one, is no text rather than an error', async () => {
    const lazy = new PackSpeciesRepository(index as OfflinePack, uri, async (l) => (l === 'ro' ? '{bad' : null));
    expect(await lazy.getContentInLocale('a', 'ro')).toBeNull();
    expect(await lazy.getContent('a', 'fi')).toBeNull();
  });
});

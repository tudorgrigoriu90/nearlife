import {
  downloadPack,
  loadPack,
  PACK_VERSION,
  type PackFiles,
  type PackSource,
  type ThumbRow,
} from './offlinePack';
import type { CatalogueRow, PresenceRow, SpeciesContentRow } from './speciesRepository';

const row = (id: string): CatalogueRow =>
  ({
    id,
    scientific_name: `Genus ${id}`,
    common_name: id,
    category: 'bird',
    rarity: 'common',
    active_months: [5],
    taxon_group: 'bird',
    local_name: id,
    occurrences: 10,
  }) as CatalogueRow;
const content = (id: string, locale: string): SpeciesContentRow => ({
  species_id: id,
  locale,
  common_name: id,
  fact: `fact ${id} ${locale}`,
  when_how: 'w',
  give: 'g',
  protect: 'p',
});

function fakeSource(over: Partial<{ thumbs: ThumbRow[]; content: SpeciesContentRow[] }> = {}) {
  const catalogue = [row('a'), row('b'), row('c')];
  const presence: PresenceRow[] = [{ species_id: 'a', active_months: [5], occurrences: 3 }];
  const allContent = over.content ?? [
    content('a', 'sv'),
    content('b', 'sv'),
    content('a', 'en'),
    content('b', 'en'),
    content('c', 'en'),
    content('a', 'ro'),
  ];
  const thumbs = over.thumbs ?? [
    { species_id: 'a', thumb_url: 'https://x/thumbs/a.webp', thumb_source: 'src-a' },
    { species_id: 'b', thumb_url: 'https://x/thumbs/b.webp', thumb_source: 'src-b' },
    { species_id: 'c', thumb_url: null, thumb_source: null },
  ];
  const source: PackSource & { contentCalls: string[][] } = {
    contentCalls: [],
    fetchRegionCatalogue: jest.fn(async () => catalogue),
    fetchPresence: jest.fn(async () => presence),
    fetchFullContent: jest.fn(async (ids: string[], locales: string[]) => {
      source.contentCalls.push(locales);
      return allContent.filter((c) => ids.includes(c.species_id) && locales.includes(c.locale));
    }),
    fetchThumbs: jest.fn(async () => thumbs),
  };
  return source;
}

function fakeFiles(failing: string[] = []) {
  const saved = new Map<string, string>();
  let pack: string | null = null;
  const files: PackFiles & { saved: Map<string, string>; downloads: string[] } = {
    saved,
    downloads: [],
    readPack: async () => pack,
    writePack: async (json) => {
      pack = json;
    },
    hasThumb: (id) => saved.has(id),
    downloadThumb: async (url, id) => {
      if (failing.includes(id)) throw new Error('network');
      files.downloads.push(id);
      saved.set(id, url);
    },
    deleteThumb: (id) => {
      saved.delete(id);
    },
    listThumbs: () => [...saved.keys()],
    thumbUri: (id) => `file:///offline/thumbs/${id}.webp`,
    clear: () => {
      saved.clear();
      pack = null;
    },
    sizeBytes: () => 0,
  };
  return files;
}

const target = { regionId: 'SWE.9_1', locale: 'sv' as const, secondaryLocale: 'ro' as const };
const now = new Date('2026-11-10T12:00:00Z');

// T-256: the county pack, for offline play with the Full Game.
describe('downloadPack', () => {
  it('saves the county: species, presence, both languages, and photo thumbnails', async () => {
    const files = fakeFiles();
    const pack = await downloadPack(fakeSource(), files, target, undefined, now);
    expect(pack.version).toBe(PACK_VERSION);
    expect(pack.regionId).toBe('SWE.9_1');
    expect(pack.savedAt).toBe('2026-11-10T12:00:00.000Z');
    expect(pack.catalogue.map((r) => r.id)).toEqual(['a', 'b', 'c']);
    expect(pack.presence).toHaveLength(1);
    expect(files.downloads.sort()).toEqual(['a', 'b']);
    expect(pack.thumbs).toEqual({ a: 'src-a', b: 'src-b' });
    expect(JSON.parse((await files.readPack())!)).toEqual(pack);
  });

  it('keeps text small: English only where the app language is missing', async () => {
    const source = fakeSource();
    const pack = await downloadPack(source, fakeFiles(), target, undefined, now);
    const keys = pack.content.map((c) => `${c.species_id}:${c.locale}`).sort();
    expect(keys).toEqual(['a:ro', 'a:sv', 'b:sv', 'c:en']);
    expect(source.contentCalls).toEqual([['sv', 'ro'], ['en']]);
  });

  it('downloads only new or changed photos on a refresh, and drops ones no longer needed', async () => {
    const files = fakeFiles();
    await downloadPack(fakeSource(), files, target, undefined, now);
    files.downloads.length = 0;
    files.saved.set('gone', 'old');
    const refreshed = fakeSource({
      thumbs: [
        { species_id: 'a', thumb_url: 'https://x/thumbs/a.webp', thumb_source: 'src-a' },
        { species_id: 'b', thumb_url: 'https://x/thumbs/b.webp', thumb_source: 'src-b2' },
      ],
    });
    const pack = await downloadPack(refreshed, files, target, undefined, now);
    expect(files.downloads).toEqual(['b']);
    expect(files.saved.has('gone')).toBe(false);
    expect(pack.thumbs).toEqual({ a: 'src-a', b: 'src-b2' });
  });

  it('a failed photo is left out, not fatal', async () => {
    const pack = await downloadPack(fakeSource(), fakeFiles(['b']), target, undefined, now);
    expect(pack.thumbs).toEqual({ a: 'src-a' });
  });

  it('writes nothing when the text cannot be fetched, so a half pack never replaces a whole one', async () => {
    const files = fakeFiles();
    const source = fakeSource();
    source.fetchPresence = jest.fn(async () => {
      throw new Error('offline');
    });
    await expect(downloadPack(source, files, target, undefined, now)).rejects.toThrow('offline');
    expect(await files.readPack()).toBeNull();
  });

  it('reports progress through text, then photos', async () => {
    const steps: string[] = [];
    await downloadPack(
      fakeSource(),
      fakeFiles(),
      target,
      (p) => steps.push(`${p.step}:${p.done}/${p.total}`),
      now,
    );
    expect(steps[0]).toBe('text:0/1');
    expect(steps).toContain('photos:2/2');
  });
});

describe('loadPack', () => {
  it('reads a saved pack, and ignores a missing, broken or older one', async () => {
    const files = fakeFiles();
    expect(await loadPack(files)).toBeNull();
    const pack = await downloadPack(fakeSource(), files, target, undefined, now);
    expect(await loadPack(files)).toEqual(pack);
    await files.writePack('{not json');
    expect(await loadPack(files)).toBeNull();
    await files.writePack(JSON.stringify({ ...pack, version: 0 }));
    expect(await loadPack(files)).toBeNull();
  });
});

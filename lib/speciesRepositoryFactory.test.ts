import type { Locale } from './i18n';
import type { ContentLocale } from './i18n/contentLocale';
import {
  FallbackSpeciesRepository,
  type SpeciesRepository,
} from './speciesRepositoryFactory';

// The factory shares the app's one Supabase client, whose session lives in AsyncStorage (T-308).
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// T-057. Swapping the app onto Supabase is not a straight substitution: the bundled repository is
// always available, and the network one is not. Without a fallback, one failed request empties the
// almanac — a worse experience than the 54 bundled species, and a regression against the
// offline-first behaviour T-165 established for the collection.

class Stub implements SpeciesRepository {
  constructor(
    private readonly label: string,
    private readonly fail = false,
  ) {}
  calls = 0;
  private guard() {
    this.calls += 1;
    if (this.fail) throw new Error(`${this.label} unavailable`);
  }
  async getContent(_id: string, _l: ContentLocale) {
    this.guard();
    return { speciesId: this.label } as never;
  }
  async getContentInLocale(_id: string, _l: ContentLocale) {
    this.guard();
    return { speciesId: this.label } as never;
  }
  async regionPresence(_r: string) {
    this.guard();
    return [{ speciesId: this.label, activeMonths: [1], occurrences: 1 }];
  }
  async describeSpecies(_ids: string[], _l: Locale) {
    this.guard();
    return [{ species: { id: this.label } as never, commonName: this.label, detail: null }];
  }
  async regionCatalogue(_r: string, _l: Locale) {
    this.guard();
    return [{ id: this.label } as never];
  }
}

describe('FallbackSpeciesRepository', () => {
  it('uses the primary when it works', async () => {
    const primary = new Stub('remote');
    const backup = new Stub('bundled');
    const repo = new FallbackSpeciesRepository(primary, backup);
    expect((await repo.describeSpecies(['x'], 'en'))[0]?.commonName).toBe('remote');
    expect(backup.calls).toBe(0);
  });

  it('falls back to the bundled data when the primary throws', async () => {
    const repo = new FallbackSpeciesRepository(new Stub('remote', true), new Stub('bundled'));
    expect((await repo.describeSpecies(['x'], 'en'))[0]?.commonName).toBe('bundled');
  });

  it('falls back on every method', async () => {
    const repo = new FallbackSpeciesRepository(new Stub('remote', true), new Stub('bundled'));
    expect(await repo.getContent('x', 'en')).toEqual({ speciesId: 'bundled' });
    expect(await repo.getContentInLocale('x', 'sv')).toEqual({ speciesId: 'bundled' });
    expect((await repo.regionPresence('SWE.9_1'))[0]?.speciesId).toBe('bundled');
    expect((await repo.regionCatalogue('SWE.9_1', 'en'))[0]?.id).toBe('bundled');
  });

  it('does not fall back when the primary legitimately returns nothing', async () => {
    // An empty result is an answer. Falling back here would show bundled content for a species the
    // database deliberately has no row for — and for getContentInLocale that means showing a
    // language the user never chose, which is the exact thing that method exists to prevent.
    const empty: SpeciesRepository = {
      getContent: async () => null,
      getContentInLocale: async () => null,
      regionPresence: async () => [],
      describeSpecies: async () => [],
      regionCatalogue: async () => [],
    };
    const backup = new Stub('bundled');
    const repo = new FallbackSpeciesRepository(empty, backup);
    expect(await repo.describeSpecies(['x'], 'en')).toEqual([]);
    expect(await repo.getContentInLocale('x', 'so')).toBeNull();
    expect(backup.calls).toBe(0);
  });

  it('surfaces the backup failure when both fail, rather than a confusing primary error', async () => {
    const repo = new FallbackSpeciesRepository(new Stub('remote', true), new Stub('bundled', true));
    await expect(repo.describeSpecies(['x'], 'en')).rejects.toThrow(/bundled unavailable/);
  });
});

// T-275 · review B-14: the bundled set is Kronoberg's; it never stands in for another county.
describe('the bundled set answers only for Kronoberg', () => {
  const { HardcodedSpeciesRepository } = jest.requireActual('./speciesRepository');
  const bundled = new HardcodedSpeciesRepository();

  it('serves Kronoberg', async () => {
    expect((await bundled.regionPresence('SWE.9_1')).length).toBeGreaterThan(0);
    expect((await bundled.regionCatalogue('SWE.9_1', 'en')).length).toBeGreaterThan(0);
  });

  it('a failed read for Norrbotten never yields bundled species', async () => {
    const repo = new FallbackSpeciesRepository(new Stub('server', true), bundled);
    await expect(repo.regionPresence('SWE.10_1')).rejects.toThrow();
    await expect(repo.regionCatalogue('SWE.10_1', 'sv')).rejects.toThrow();
  });
});

// T-333 · review I-17: what the app builds with and without a backend configured.
describe('createRepositoryParts and createPackSource', () => {
  // Keys are set and deleted, never `process.env` replaced: Expo's Babel preset captures the env
  // object when a module loads, so a replaced one is invisible to the code under test.
  const KEYS = ['EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY'] as const;
  const saved = KEYS.map((k) => process.env[k]);
  afterEach(() => {
    KEYS.forEach((k, i) => {
      if (saved[i] === undefined) delete process.env[k];
      else process.env[k] = saved[i];
    });
  });

  it('has only the bundled set without config', () => {
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    delete process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    const { createPackSource, createRepositoryParts } = jest.requireActual('./speciesRepositoryFactory');
    expect(createPackSource()).toBeNull();
    const parts = createRepositoryParts();
    expect(parts.online).toBeNull();
    expect(parts.bundled).toBeDefined();
  });

  it('adds the server source, cached when given a cache, once configured', () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test';
    const { createPackSource, createRepositoryParts } = jest.requireActual('./speciesRepositoryFactory');
    const { CachingSpeciesRepository } = jest.requireActual('./countyCache');
    expect(createPackSource()).not.toBeNull();
    expect(createRepositoryParts().online).not.toBeNull();
    const files = { read: async () => null, write: async () => undefined, clear: async () => undefined };
    expect(createRepositoryParts(files).online).toBeInstanceOf(CachingSpeciesRepository);
  });
});

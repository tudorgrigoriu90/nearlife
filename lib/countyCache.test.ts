import { CachingSpeciesRepository, InMemoryCacheFiles } from './countyCache';
import type { SpeciesRepository } from './speciesRepository';

// T-275 · review B-20: a county's catalogue and presence are kept on the phone and downloaded
// again only when the server's data version changes; the version check is one tiny request.

function server(version = 'v1') {
  const calls = { presence: 0, catalogue: 0, version: 0 };
  let fail = false;
  const repo = {
    async regionPresence(regionId: string) {
      calls.presence += 1;
      if (fail) throw new Error('offline');
      return [{ speciesId: `${regionId}-a`, activeMonths: [5], occurrences: 9 }];
    },
    async regionCatalogue(regionId: string, locale: string) {
      calls.catalogue += 1;
      if (fail) throw new Error('offline');
      return [{ id: `${regionId}-${locale}` }];
    },
  } as unknown as SpeciesRepository;
  const state = { version };
  const versionOf = async () => {
    calls.version += 1;
    if (fail) throw new Error('offline');
    return state.version;
  };
  return { repo, calls, state, versionOf, goOffline: () => (fail = true) };
}

describe('CachingSpeciesRepository', () => {
  it('downloads a county once, then serves it from the phone while the version is unchanged', async () => {
    const files = new InMemoryCacheFiles();
    const s = server();
    const first = new CachingSpeciesRepository(s.repo, files, s.versionOf);
    await first.regionPresence('SWE.10_1');
    await first.regionCatalogue('SWE.10_1', 'sv');
    expect(s.calls).toEqual({ presence: 1, catalogue: 1, version: 1 });

    const relaunch = new CachingSpeciesRepository(s.repo, files, s.versionOf);
    expect(await relaunch.regionPresence('SWE.10_1')).toEqual([
      { speciesId: 'SWE.10_1-a', activeMonths: [5], occurrences: 9 },
    ]);
    await relaunch.regionCatalogue('SWE.10_1', 'sv');
    expect(s.calls).toEqual({ presence: 1, catalogue: 1, version: 2 }); // one version check only
  });

  it('downloads again when the server data changed', async () => {
    const files = new InMemoryCacheFiles();
    const s = server();
    await new CachingSpeciesRepository(s.repo, files, s.versionOf).regionPresence('SWE.10_1');
    s.state.version = 'v2';
    await new CachingSpeciesRepository(s.repo, files, s.versionOf).regionPresence('SWE.10_1');
    expect(s.calls.presence).toBe(2);
  });

  it('keys the catalogue by language', async () => {
    const files = new InMemoryCacheFiles();
    const s = server();
    const repo = new CachingSpeciesRepository(s.repo, files, s.versionOf);
    await repo.regionCatalogue('SWE.10_1', 'sv');
    expect(await repo.regionCatalogue('SWE.10_1', 'en')).toEqual([{ id: 'SWE.10_1-en' }]);
  });

  it('offline, serves the saved county; with nothing saved, fails instead of guessing', async () => {
    const files = new InMemoryCacheFiles();
    const s = server();
    await new CachingSpeciesRepository(s.repo, files, s.versionOf).regionPresence('SWE.10_1');
    s.goOffline();
    const offline = new CachingSpeciesRepository(s.repo, files, s.versionOf);
    expect((await offline.regionPresence('SWE.10_1')).length).toBe(1);
    await expect(offline.regionPresence('SWE.12_1')).rejects.toThrow();
  });

  it('a corrupt cache file is treated as missing', async () => {
    const files = new InMemoryCacheFiles();
    await files.write('presence.SWE.10_1', '{not json');
    const s = server();
    const repo = new CachingSpeciesRepository(s.repo, files, s.versionOf);
    expect((await repo.regionPresence('SWE.10_1')).length).toBe(1);
  });
});

describe('CachingSpeciesRepository, partial failures', () => {
  it('serves the saved county when the version changed but the download fails', async () => {
    const files = new InMemoryCacheFiles();
    const ok = server();
    await new CachingSpeciesRepository(ok.repo, files, ok.versionOf).regionPresence('SWE.10_1');
    const failingRepo = {
      regionPresence: async () => {
        throw new Error('timeout');
      },
    } as unknown as SpeciesRepository;
    const repo = new CachingSpeciesRepository(failingRepo, files, async () => 'v2');
    expect(await repo.regionPresence('SWE.10_1')).toEqual([
      { speciesId: 'SWE.10_1-a', activeMonths: [5], occurrences: 9 },
    ]);
  });

  it('a failed download with nothing saved is an error', async () => {
    const failingRepo = {
      regionPresence: async () => {
        throw new Error('timeout');
      },
    } as unknown as SpeciesRepository;
    const repo = new CachingSpeciesRepository(failingRepo, new InMemoryCacheFiles(), async () => 'v1');
    await expect(repo.regionPresence('SWE.10_1')).rejects.toThrow('timeout');
  });

  it('retries the version check after it failed', async () => {
    let calls = 0;
    const versionOf = async () => {
      calls += 1;
      if (calls === 1) throw new Error('offline');
      return 'v1';
    };
    const repo = new CachingSpeciesRepository(server().repo, new InMemoryCacheFiles(), versionOf);
    await expect(repo.regionPresence('SWE.10_1')).rejects.toThrow('offline');
    await expect(repo.regionPresence('SWE.10_1')).resolves.toHaveLength(1);
    expect(calls).toBe(2);
  });

  it('a corrupt saved file is downloaded again', async () => {
    const files = new InMemoryCacheFiles();
    await files.write('presence.SWE.10_1', '{broken');
    const s = server();
    await new CachingSpeciesRepository(s.repo, files, s.versionOf).regionPresence('SWE.10_1');
    expect(s.calls.presence).toBe(1);
  });

  it('passes the per-species reads straight through', async () => {
    const inner = {
      listSpecies: jest.fn(async () => ['list']),
      getContent: jest.fn(async () => 'content'),
      getContentInLocale: jest.fn(async () => 'in-locale'),
      describeSpecies: jest.fn(async () => ['summary']),
    } as unknown as SpeciesRepository;
    const repo = new CachingSpeciesRepository(inner, new InMemoryCacheFiles(), async () => 'v1');
    expect(await repo.listSpecies('sv')).toEqual(['list']);
    expect(await repo.getContent('a', 'sv')).toBe('content');
    expect(await repo.getContentInLocale('a', 'ar')).toBe('in-locale');
    expect(await repo.describeSpecies(['a'], 'en')).toEqual(['summary']);
  });
});

describe('InMemoryCacheFiles', () => {
  it('clear forgets every file', async () => {
    const files = new InMemoryCacheFiles();
    await files.write('a', '1');
    await files.clear();
    expect(await files.read('a')).toBeNull();
  });
});

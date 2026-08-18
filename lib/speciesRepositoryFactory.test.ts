import type { Locale } from './i18n';
import type { ContentLocale } from './i18n/contentLocale';
import {
  FallbackSpeciesRepository,
  type SpeciesRepository,
} from './speciesRepositoryFactory';

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
  async listSpecies(_l: Locale) {
    this.guard();
    return [{ species: { id: this.label } as never, commonName: this.label }];
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
}

describe('FallbackSpeciesRepository', () => {
  it('uses the primary when it works', async () => {
    const primary = new Stub('remote');
    const backup = new Stub('bundled');
    const repo = new FallbackSpeciesRepository(primary, backup);
    expect((await repo.listSpecies('en'))[0]?.commonName).toBe('remote');
    expect(backup.calls).toBe(0);
  });

  it('falls back to the bundled data when the primary throws', async () => {
    const repo = new FallbackSpeciesRepository(new Stub('remote', true), new Stub('bundled'));
    expect((await repo.listSpecies('en'))[0]?.commonName).toBe('bundled');
  });

  it('falls back on every method, not just the list', async () => {
    const repo = new FallbackSpeciesRepository(new Stub('remote', true), new Stub('bundled'));
    expect(await repo.getContent('x', 'en')).toEqual({ speciesId: 'bundled' });
    expect(await repo.getContentInLocale('x', 'sv')).toEqual({ speciesId: 'bundled' });
    expect((await repo.regionPresence('SWE.9_1'))[0]?.speciesId).toBe('bundled');
  });

  it('does not fall back when the primary legitimately returns nothing', async () => {
    // An empty result is an answer. Falling back here would show bundled content for a species the
    // database deliberately has no row for — and for getContentInLocale that means showing a
    // language the user never chose, which is the exact thing that method exists to prevent.
    const empty: SpeciesRepository = {
      listSpecies: async () => [],
      getContent: async () => null,
      getContentInLocale: async () => null,
      regionPresence: async () => [],
    };
    const backup = new Stub('bundled');
    const repo = new FallbackSpeciesRepository(empty, backup);
    expect(await repo.listSpecies('en')).toEqual([]);
    expect(await repo.getContentInLocale('x', 'so')).toBeNull();
    expect(backup.calls).toBe(0);
  });

  it('surfaces the backup failure when both fail, rather than a confusing primary error', async () => {
    const repo = new FallbackSpeciesRepository(new Stub('remote', true), new Stub('bundled', true));
    await expect(repo.listSpecies('en')).rejects.toThrow(/bundled unavailable/);
  });
});

import { InMemoryCollectionStore } from './collectionStore';

const T1 = '2026-06-01T10:00:00Z';
const T2 = '2026-06-02T10:00:00Z';

describe('InMemoryCollectionStore', () => {
  it('starts empty and returns null for unknown species', async () => {
    const store = new InMemoryCollectionStore();
    expect(await store.list()).toEqual([]);
    expect(await store.get('swift')).toBeNull();
  });

  it('marks a species spotted', async () => {
    const store = new InMemoryCollectionStore();
    const rec = await store.markSpotted('swift', T1);
    expect(rec.spottedAt).toBe(T1);
    expect(rec.caughtAt).toBeNull();
    expect((await store.list()).length).toBe(1);
  });

  it('does not overwrite an earlier spotted timestamp', async () => {
    const store = new InMemoryCollectionStore();
    await store.markSpotted('swift', T1);
    const rec = await store.markSpotted('swift', T2);
    expect(rec.spottedAt).toBe(T1);
  });

  it('marks caught and implicitly spots the species', async () => {
    const store = new InMemoryCollectionStore();
    const rec = await store.markCaught('osprey', T1, true);
    expect(rec.caughtAt).toBe(T1);
    expect(rec.spottedAt).toBe(T1); // catching implies spotted
    expect(rec.primeBonus).toBe(true);
  });

  it('marks helped with a kind and implicitly spots the species', async () => {
    const store = new InMemoryCollectionStore();
    const rec = await store.markHelped('hedgehog', 'give', T1);
    expect(rec.helpedAt).toBe(T1);
    expect(rec.helpedKind).toBe('give');
    expect(rec.spottedAt).toBe(T1);
  });

  it('preserves prior spotted time when catching later', async () => {
    const store = new InMemoryCollectionStore();
    await store.markSpotted('swift', T1);
    const rec = await store.markCaught('swift', T2, false);
    expect(rec.spottedAt).toBe(T1);
    expect(rec.caughtAt).toBe(T2);
  });

  it('seeds from existing records and returns copies (no external mutation)', async () => {
    const store = new InMemoryCollectionStore([
      { speciesId: 'robin', spottedAt: T1, caughtAt: null, helpedAt: null, helpedKind: null, primeBonus: false },
    ]);
    const rec = await store.get('robin');
    expect(rec?.spottedAt).toBe(T1);
    if (rec) rec.spottedAt = 'mutated';
    expect((await store.get('robin'))?.spottedAt).toBe(T1); // internal copy untouched
  });
});

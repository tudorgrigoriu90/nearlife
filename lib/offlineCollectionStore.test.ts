import type { CollectionRecord } from './collection';
import {
  CatchRefusedError,
  InMemoryCollectionStore,
  RejectedWriteError,
  type CollectionStore,
} from './collectionStore';
import {
  InMemoryOfflineCache,
  OfflineCollectionStore,
  type OfflineCache,
} from './offlineCollectionStore';

// T-165. The property under test is blunt: a write must never throw and never be lost, whatever
// the network is doing. Before this store existed, useCollection sent writes straight to Supabase
// and swallowed the rejection in a console.warn — a catch made in a forest simply vanished.

const T1 = '2026-05-01T10:00:00.000Z';
const T2 = '2026-06-01T10:00:00.000Z';

/** A remote that fails until told otherwise, so "offline" is a first-class test state. */
class FlakyRemote implements CollectionStore {
  online = false;
  readonly inner = new InMemoryCollectionStore();
  calls = 0;

  private guard() {
    this.calls += 1;
    if (!this.online) throw new Error('offline');
  }
  /** Reads fail while writes succeed, so a test sees the device state before the server merge. */
  listFails = false;
  async list() {
    this.guard();
    if (this.listFails) throw new Error('read failed');
    return this.inner.list();
  }
  async get(id: string) {
    this.guard();
    return this.inner.get(id);
  }
  /** Species whose writes the "server" rejects for good (a check or permission error). */
  rejectForGood = new Set<string>();
  writes = 0;
  async markSpotted(id: string, at: string) {
    this.guard();
    this.writes += 1;
    if (this.rejectForGood.has(id)) throw new RejectedWriteError(id, '23514');
    return this.inner.markSpotted(id, at);
  }
  /** Species the "server" refuses to record as caught (T-200's free-catch trigger). */
  refuse = new Set<string>();
  async markCaught(id: string, at: string, prime: boolean) {
    this.guard();
    if (this.refuse.has(id)) throw new CatchRefusedError(id);
    return this.inner.markCaught(id, at, prime);
  }
  /** Species whose help pledge the "server" refuses as a catch (the double count of review B-01). */
  refuseHelp = new Set<string>();
  async markHelped(id: string, kind: 'give' | 'protect', at: string) {
    this.guard();
    if (this.refuseHelp.has(id)) throw new CatchRefusedError(id);
    return this.inner.markHelped(id, kind, at);
  }
}

function setup(cache: OfflineCache = new InMemoryOfflineCache()) {
  const remote = new FlakyRemote();
  const store = new OfflineCollectionStore(cache, remote);
  return { store, remote, cache };
}

describe('OfflineCollectionStore', () => {
  it('records a catch while offline and returns it immediately', async () => {
    const { store } = setup();
    const record = await store.markCaught('red-fox', T1, true);
    expect(record.caughtAt).toBe(T1);
    expect(record.spottedAt).toBe(T1); // catching implies spotted
    expect((await store.list())[0]?.caughtAt).toBe(T1);
  });

  it('never rejects when the network is down', async () => {
    const { store } = setup();
    await expect(store.markSpotted('moose', T1)).resolves.toBeDefined();
    await expect(store.markCaught('moose', T2, false)).resolves.toBeDefined();
    await expect(store.markHelped('moose', 'give', T2)).resolves.toBeDefined();
    await expect(store.list()).resolves.toHaveLength(1);
  });

  it('queues offline writes and delivers them once back online', async () => {
    const { store, remote } = setup();
    await store.markCaught('red-fox', T1, true);
    await store.markHelped('moose', 'protect', T2);
    expect(store.pendingCount()).toBe(2);

    remote.online = true;
    await store.sync();

    expect(store.pendingCount()).toBe(0);
    const delivered = await remote.inner.list();
    expect(delivered.find((r) => r.speciesId === 'red-fox')?.caughtAt).toBe(T1);
    expect(delivered.find((r) => r.speciesId === 'moose')?.helpedKind).toBe('protect');
  });

  it('keeps the queue intact when a sync fails midway', async () => {
    const { store, remote } = setup();
    await store.markCaught('red-fox', T1, true);
    await store.sync(); // still offline
    expect(store.pendingCount()).toBe(1);

    remote.online = true;
    await store.sync();
    expect(store.pendingCount()).toBe(0);
  });

  it('is safe to drain twice — a duplicate delivery does not change the record', async () => {
    const { store, remote } = setup();
    await store.markCaught('red-fox', T1, true);
    remote.online = true;
    await store.sync();
    await store.sync();
    expect((await remote.inner.list())[0]?.caughtAt).toBe(T1);
    expect(store.pendingCount()).toBe(0);
  });

  it('survives a restart: queued writes reload from the cache', async () => {
    const cache = new InMemoryOfflineCache();
    const first = setup(cache);
    await first.store.markCaught('osprey', T1, true);

    // New store over the same storage, as after an app relaunch.
    const remote = new FlakyRemote();
    const revived = new OfflineCollectionStore(cache, remote);
    await revived.hydrate();
    expect((await revived.list())[0]?.caughtAt).toBe(T1);
    expect(revived.pendingCount()).toBe(1);

    remote.online = true;
    await revived.sync();
    expect((await remote.inner.list())[0]?.caughtAt).toBe(T1);
  });

  it('merges the server copy in without losing an unsynced local catch', async () => {
    const { store, remote } = setup();
    await remote.inner.markSpotted('red-fox', T2); // another device got there first
    await store.markCaught('red-fox', T1, true); // this device, offline

    remote.online = true;
    await store.sync();

    const local = (await store.list()).find((r) => r.speciesId === 'red-fox');
    expect(local?.caughtAt).toBe(T1);
    expect(local?.spottedAt).toBe(T1); // earliest wins
  });

  it('does not touch the network for reads', async () => {
    const { store, remote } = setup();
    await store.markSpotted('moose', T1);
    remote.calls = 0;
    await store.list();
    await store.get('moose');
    expect(remote.calls).toBe(0);
  });

  it('works with no remote at all, and still persists', async () => {
    const cache = new InMemoryOfflineCache();
    const store = new OfflineCollectionStore(cache, null);
    await store.markCaught('bilberry', T1, false);
    const revived = new OfflineCollectionStore(cache, null);
    await revived.hydrate();
    expect((await revived.list())[0]?.caughtAt).toBe(T1);
    expect(revived.pendingCount()).toBe(1); // held until a remote appears
  });

  it('reports unsynced work so the UI can show it, without blocking the write', async () => {
    const { store } = setup();
    expect(store.pendingCount()).toBe(0);
    await store.markSpotted('heather', T1);
    expect(store.pendingCount()).toBe(1);
  });

  it('tolerates corrupt cached data rather than losing the session', async () => {
    const cache: OfflineCache = {
      read: async () => 'not json at all',
      write: async () => undefined,
    };
    const store = new OfflineCollectionStore(cache, null);
    await store.hydrate();
    expect(await store.list()).toEqual([]);
    await expect(store.markSpotted('moose', T1)).resolves.toBeDefined();
  });
});

// T-200: the database refuses a catch beyond the season's free allowance. That rejection is
// permanent, so it must neither block the queue nor leave the device believing in a catch the
// server never recorded.
describe('OfflineCollectionStore when the server refuses a catch', () => {
  it('drops the refused catch, keeps the species spotted, and delivers what was queued behind it', async () => {
    const { store, remote } = setup();
    await store.markCaught('red-fox', T1, true);
    await store.markSpotted('moose', T2);
    remote.refuse.add('red-fox');
    remote.online = true;
    await store.sync();

    const fox = await store.get('red-fox');
    expect(fox?.caughtAt).toBeNull();
    expect(fox?.primeBonus).toBe(false);
    expect(fox?.spottedAt).toBe(T1); // seeing it still counts
    expect(store.pendingCount()).toBe(0);
    expect((await remote.inner.get('moose'))?.spottedAt).toBe(T2); // the queue kept moving
  });

  // T-266 · review B-01: only a refused *catch* takes the catch back.
  it('a refused help pledge is dropped without un-catching the species', async () => {
    const { store, remote } = setup();
    remote.online = true;
    await store.markCaught('red-fox', T1, false);
    await store.sync();
    remote.refuseHelp.add('red-fox');
    remote.listFails = true;
    await store.markHelped('red-fox', 'give', T2);
    await store.sync();
    expect((await store.get('red-fox'))?.caughtAt).toBe(T1);
    expect(store.pendingCount()).toBe(0);
  });

  it('still treats an ordinary failure as retryable', async () => {
    const { store } = setup();
    await store.markCaught('red-fox', T1, false);
    await store.sync(); // offline
    expect(store.pendingCount()).toBe(1);
    expect((await store.get('red-fox'))?.caughtAt).toBe(T1);
  });
});

describe('OfflineCollectionStore sends only writes that change something (T-266)', () => {
  it('tapping an already-spotted species queues and sends nothing', async () => {
    const { store, remote } = setup();
    remote.online = true;
    await store.markSpotted('moose', T1);
    await store.sync();
    const writes = remote.writes;
    const again = await store.markSpotted('moose', T2);
    await store.sync();
    expect(again.spottedAt).toBe(T1);
    expect(store.pendingCount()).toBe(0);
    expect(remote.writes).toBe(writes);
  });
});

describe('OfflineCollectionStore domain rules', () => {
  it('reuses the shared transitions — catching implies spotted', async () => {
    const { store } = setup();
    const r: CollectionRecord = await store.markCaught('roach', T2, false);
    expect(r.spottedAt).toBe(T2);
  });

  it('never moves an existing spotted date forward', async () => {
    const { store } = setup();
    await store.markSpotted('roach', T1);
    const r = await store.markCaught('roach', T2, false);
    expect(r.spottedAt).toBe(T1);
  });
});

describe('OfflineCollectionStore.clear (T-269)', () => {
  it('empties records and the outbox, in memory and in the cache', async () => {
    const cache = new InMemoryOfflineCache();
    const { store } = setup(cache);
    await store.markCaught('moose', T1, false);
    await store.clear();
    expect(await store.list()).toEqual([]);
    expect(store.pendingCount()).toBe(0);
    const reloaded = new OfflineCollectionStore(cache, null);
    await reloaded.hydrate();
    expect(await reloaded.list()).toEqual([]);
  });
});

// T-274 · review B-11, B-13, I-08.
describe('OfflineCollectionStore sync with the server copy', () => {
  it('pulls the server copy even when nothing is queued', async () => {
    const { store, remote } = setup();
    remote.online = true;
    await remote.inner.markCaught('moose', T1, false); // e.g. caught on another phone
    await store.sync();
    expect((await store.get('moose'))?.caughtAt).toBe(T1);
  });

  it('a failed read leaves local records as they are', async () => {
    const { store, remote } = setup();
    await store.markSpotted('fox', T1);
    remote.online = true;
    remote.listFails = true;
    await store.sync();
    expect((await store.get('fox'))?.spottedAt).toBe(T1);
  });
});

describe('OfflineCollectionStore reports what the server refused', () => {
  it('a refused catch is reported once, for the app to explain', async () => {
    const { store, remote } = setup();
    await store.markCaught('red-fox', T1, false);
    remote.refuse.add('red-fox');
    remote.online = true;
    await store.sync();
    expect(store.takeRefusedCatches()).toEqual(['red-fox']);
    expect(store.takeRefusedCatches()).toEqual([]);
  });

  it('a write the server rejects for good is dropped, and the queue moves on', async () => {
    const { store, remote } = setup();
    await store.markSpotted('bad-id', T1);
    await store.markSpotted('moose', T2);
    remote.rejectForGood.add('bad-id');
    remote.online = true;
    await store.sync();
    expect(store.pendingCount()).toBe(0);
    expect((await remote.inner.get('moose'))?.spottedAt).toBe(T2);
  });
});

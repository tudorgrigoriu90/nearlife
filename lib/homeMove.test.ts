import { SupabaseHomeMoveGateway, checkMove } from './homeMove';
import { InMemoryHometownStore } from './hometownStore';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// T-349 · review F-09: moving home county once a year.
const KRONOBERG = { id: 'SWE.9_1', name: 'Kronoberg' };
const VAXJO = { latitude: 56.879, longitude: 14.806 };
const STOCKHOLM = { latitude: 59.33, longitude: 18.07 };

describe('checkMove', () => {
  it('finds a different county from one fix', async () => {
    const out = await checkMove(KRONOBERG, async () => STOCKHOLM);
    expect(out).toMatchObject({ kind: 'move', region: { id: 'SWE.15_1' } }); // Stockholm county
  });

  it('says when the phone is still in the home county, has no fix, or is outside Sweden', async () => {
    expect((await checkMove(KRONOBERG, async () => VAXJO)).kind).toBe('same');
    expect((await checkMove(KRONOBERG, async () => null)).kind).toBe('no-fix');
    expect((await checkMove(KRONOBERG, async () => ({ latitude: 48.85, longitude: 2.35 }))).kind).toBe('outside-sweden');
  });
});

describe('SupabaseHomeMoveGateway', () => {
  function client(error: { message: string; details?: string } | null) {
    const calls: unknown[] = [];
    return {
      calls,
      client: {
        from: () => ({
          update: (v: unknown) => ({
            eq: async (col: string, val: string) => {
              calls.push([v, col, val]);
              return { error };
            },
          }),
        }),
      } as never,
    };
  }

  it('moves the user’s own home county', async () => {
    const c = client(null);
    expect(await new SupabaseHomeMoveGateway(c.client, async () => 'u1').move({ id: 'SWE.1_1', name: 'Stockholm' })).toEqual({ ok: true });
    expect(c.calls).toEqual([[{ home_region: 'SWE.1_1' }, 'user_id', 'u1']]);
  });

  it('reads the server’s refusal and when the next move is possible', async () => {
    const c = client({ message: 'home_move_limit', details: '2027-11-19' });
    expect(await new SupabaseHomeMoveGateway(c.client, async () => 'u1').move(KRONOBERG)).toEqual({ ok: false, nextDate: '2027-11-19' });
  });

  it('throws any other failure', async () => {
    const c = client({ message: 'network' });
    await expect(new SupabaseHomeMoveGateway(c.client, async () => 'u1').move(KRONOBERG)).rejects.toThrow(/network/);
  });
});

describe('HometownStore.replace', () => {
  it('replaces the lock, which lockIn never does', async () => {
    const store = new InMemoryHometownStore(KRONOBERG);
    expect(await store.lockIn({ id: 'SWE.1_1', name: 'Stockholm' })).toEqual(KRONOBERG);
    await store.replace({ id: 'SWE.1_1', name: 'Stockholm' });
    expect(await store.load()).toEqual({ id: 'SWE.1_1', name: 'Stockholm' });
  });
});

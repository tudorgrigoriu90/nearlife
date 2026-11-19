import { eraseDeviceStorage } from './deviceErase';

// T-269 · review B-05, B-12: deleting the account erases what the phone holds.

function memoryStorage(keys: string[]) {
  const data = new Map(keys.map((k) => [k, 'x']));
  return {
    data,
    getAllKeys: async () => [...data.keys()],
    multiRemove: async (remove: readonly string[]) => {
      for (const k of remove) data.delete(k);
    },
  };
}

describe('eraseDeviceStorage', () => {
  it('removes every nearby.* key and the stored Supabase session, and nothing else', async () => {
    const storage = memoryStorage([
      'nearby.collection.v1',
      'nearby.locale.v1',
      'nearby.dualLanguage.v1',
      'nearby.catchSpots.v1.SWE.9_1',
      'nearby.quizAttempts',
      'sb-abcdefgh-auth-token',
      'some-other-library',
    ]);
    await eraseDeviceStorage(storage);
    expect([...storage.data.keys()]).toEqual(['some-other-library']);
  });

  it('a storage failure does not throw: the erase is best-effort after the server erase', async () => {
    const broken = {
      getAllKeys: async () => {
        throw new Error('disk');
      },
      multiRemove: async () => undefined,
    };
    await expect(eraseDeviceStorage(broken)).resolves.toBeUndefined();
  });
});

import {
  SupabasePushGateway,
  syncPushRegistration,
  type DeviceToken,
  type PushRegistrationGateway,
  type SyncInput,
} from './pushRegistration';

class FakeGateway implements PushRegistrationGateway {
  calls: string[] = [];
  devices: { userId: string; token: string; platform: string; locale: string }[] = [];
  async upsertDevice(userId: string, d: { token: string; platform: 'android' | 'ios'; locale: string }) {
    this.calls.push('upsertDevice');
    this.devices.push({ userId, ...d });
  }
  async deleteDevices(userId: string) {
    this.calls.push('deleteDevices');
    this.devices = this.devices.filter((d) => d.userId !== userId);
  }
  async setHomeRegion() {
    this.calls.push('setHomeRegion');
  }
}

function input(gateway: PushRegistrationGateway, overrides: Partial<SyncInput> = {}): SyncInput {
  return {
    wanted: true,
    userId: 'u1',
    locale: 'sv',
    homeRegion: 'SWE.9_1',
    getToken: async (): Promise<DeviceToken | null> => ({ type: 'android', data: 'fcm-token' }),
    gateway,
    ...overrides,
  };
}

describe('syncPushRegistration', () => {
  it('registers the device with its locale, after saving the home region', async () => {
    const g = new FakeGateway();
    await expect(syncPushRegistration(input(g))).resolves.toBe('registered');
    expect(g.calls).toEqual(['setHomeRegion', 'upsertDevice']);
    expect(g.devices).toEqual([{ userId: 'u1', token: 'fcm-token', platform: 'android', locale: 'sv' }]);
  });

  it('removes every device of the user when consent is withdrawn — without asking for a token', async () => {
    const g = new FakeGateway();
    await syncPushRegistration(input(g));
    const getToken = jest.fn();
    await expect(syncPushRegistration(input(g, { wanted: false, getToken }))).resolves.toBe('unregistered');
    expect(g.devices).toEqual([]);
    expect(getToken).not.toHaveBeenCalled();
  });

  it('still registers in preview mode (no region) so a later region can start sends', async () => {
    const g = new FakeGateway();
    await syncPushRegistration(input(g, { homeRegion: null }));
    expect(g.calls).toEqual(['upsertDevice']);
  });

  it('writes nothing when there is no usable token (web, simulator, unknown type)', async () => {
    for (const token of [null, { type: 'web', data: 'x' }, { type: 'android', data: '' }]) {
      const g = new FakeGateway();
      await expect(syncPushRegistration(input(g, { getToken: async () => token }))).resolves.toBe('unavailable');
      expect(g.calls).toEqual([]);
    }
  });
});

describe('SupabasePushGateway', () => {
  function fakeClient(error: { message: string } | null = null) {
    const ops: unknown[][] = [];
    const builder = {
      upsert: (...args: unknown[]) => (ops.push(['upsert', ...args]), Promise.resolve({ error })),
      delete: () => ({
        eq: (...args: unknown[]) => (ops.push(['delete.eq', ...args]), Promise.resolve({ error })),
      }),
    };
    const client = { from: (table: string) => (ops.push(['from', table]), builder) };
    return { client: client as never, ops };
  }

  it('upserts devices on (user_id, token) and profiles on user_id', async () => {
    const { client, ops } = fakeClient();
    const gw = new SupabasePushGateway(client);
    await gw.upsertDevice('u1', { token: 't', platform: 'android', locale: 'en' });
    await gw.setHomeRegion('u1', 'SWE.9_1');
    expect(ops[0]).toEqual(['from', 'push_devices']);
    expect(ops[1]).toEqual([
      'upsert',
      expect.objectContaining({ user_id: 'u1', token: 't', platform: 'android', locale: 'en' }),
      { onConflict: 'user_id,token' },
    ]);
    expect(ops[3]).toEqual(['upsert', { user_id: 'u1', home_region: 'SWE.9_1' }, { onConflict: 'user_id' }]);
  });

  it('deletes by user id', async () => {
    const { client, ops } = fakeClient();
    await new SupabasePushGateway(client).deleteDevices('u1');
    expect(ops).toEqual([['from', 'push_devices'], ['delete.eq', 'user_id', 'u1']]);
  });

  it('surfaces database errors instead of swallowing them', async () => {
    const { client } = fakeClient({ message: 'RLS' });
    const gw = new SupabasePushGateway(client);
    await expect(gw.upsertDevice('u1', { token: 't', platform: 'android', locale: 'en' })).rejects.toThrow('RLS');
    await expect(gw.deleteDevices('u1')).rejects.toThrow('RLS');
    await expect(gw.setHomeRegion('u1', 'r')).rejects.toThrow('RLS');
  });
});

// T-300 · review B-37: no DELETE for an install that never registered a device.
describe('syncPushRegistration with the registered flag', () => {
  function flag(initial: boolean) {
    let value = initial;
    return { get: jest.fn(async () => value), set: jest.fn(async (v: boolean) => void (value = v)), now: () => value };
  }

  it('consent off on an install that never registered: no request at all', async () => {
    const g = new FakeGateway();
    const f = flag(false);
    await expect(syncPushRegistration(input(g, { wanted: false, registered: f }))).resolves.toBe('unregistered');
    expect(g.calls).toEqual([]);
  });

  it('consent off after a registration: delete, then forget the registration', async () => {
    const g = new FakeGateway();
    const f = flag(true);
    await syncPushRegistration(input(g, { wanted: false, registered: f }));
    expect(g.calls).toEqual(['deleteDevices']);
    expect(f.now()).toBe(false);
  });

  it('a registration is remembered', async () => {
    const g = new FakeGateway();
    const f = flag(false);
    await syncPushRegistration(input(g, { registered: f }));
    expect(f.now()).toBe(true);
  });

  it('a failed delete keeps the flag, so the next sync tries again', async () => {
    const g = new FakeGateway();
    g.deleteDevices = async () => {
      throw new Error('offline');
    };
    const f = flag(true);
    await expect(syncPushRegistration(input(g, { wanted: false, registered: f }))).rejects.toThrow('offline');
    expect(f.now()).toBe(true);
  });
});

describe('asyncStorageRegisteredFlag', () => {
  const { asyncStorageRegisteredFlag, PUSH_REGISTERED_KEY } = jest.requireActual('./pushRegistration');
  function storage(initial: Record<string, string> = {}, failRead = false) {
    const data = { ...initial };
    return {
      data,
      getItem: async (k: string) => {
        if (failRead) throw new Error('io');
        return data[k] ?? null;
      },
      setItem: async (k: string, v: string) => void (data[k] = v),
    };
  }

  it('never registered reads false; true after set', async () => {
    const st = storage();
    const f = asyncStorageRegisteredFlag(st);
    expect(await f.get()).toBe(false);
    await f.set(true);
    expect(st.data[PUSH_REGISTERED_KEY]).toBe('true');
    expect(await f.get()).toBe(true);
    await f.set(false);
    expect(await f.get()).toBe(false);
  });

  it('unreadable storage counts as registered, so the delete still happens', async () => {
    expect(await asyncStorageRegisteredFlag(storage({}, true)).get()).toBe(true);
  });
});

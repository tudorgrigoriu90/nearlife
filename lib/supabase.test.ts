// T-333 · review I-17: the app's one Supabase client (T-308) and its anonymous session (T-027).

const mockAuth = { getSession: jest.fn(), signInAnonymously: jest.fn() };
const mockCreateClient = jest.fn(() => ({ auth: mockAuth }));
jest.mock('@supabase/supabase-js', () => ({ createClient: mockCreateClient }));
jest.mock('react-native-url-polyfill/auto', () => ({}));
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Keys are restored one by one: Expo's Babel preset captures the env object at module load.
const SAVED_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SAVED_KEY = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
beforeEach(() => {
  jest.resetModules();
  mockCreateClient.mockClear();
  mockAuth.getSession.mockReset();
  mockAuth.signInAnonymously.mockReset();
  process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test';
});
afterAll(() => {
  if (SAVED_URL === undefined) delete process.env.EXPO_PUBLIC_SUPABASE_URL;
  else process.env.EXPO_PUBLIC_SUPABASE_URL = SAVED_URL;
  if (SAVED_KEY === undefined) delete process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  else process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = SAVED_KEY;
});

const load = () => require('./supabase') as typeof import('./supabase');

describe('getSupabase', () => {
  it('builds one client, persisting the session on the device', () => {
    const { getSupabase } = load();
    expect(getSupabase()).toBe(getSupabase());
    expect(mockCreateClient).toHaveBeenCalledTimes(1);
    expect(mockCreateClient).toHaveBeenCalledWith(
      'https://example.supabase.co',
      'sb_publishable_test',
      expect.objectContaining({ auth: expect.objectContaining({ persistSession: true, detectSessionInUrl: false }) }),
    );
  });

  it('fails loudly without config, and only when first used', () => {
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    const { getSupabase } = load();
    expect(() => getSupabase()).toThrow(/Missing Supabase config/);
  });
});

describe('ensureAnonymousSession', () => {
  it('reuses a stored session', async () => {
    mockAuth.getSession.mockResolvedValue({ data: { session: { user: { id: 'u-1' } } } });
    expect(await load().ensureAnonymousSession()).toBe('u-1');
    expect(mockAuth.signInAnonymously).not.toHaveBeenCalled();
  });

  it('signs in anonymously when there is none', async () => {
    mockAuth.getSession.mockResolvedValue({ data: { session: null } });
    mockAuth.signInAnonymously.mockResolvedValue({ data: { user: { id: 'u-2' } }, error: null });
    expect(await load().ensureAnonymousSession()).toBe('u-2');
  });

  it('says why a sign-in failed', async () => {
    mockAuth.getSession.mockResolvedValue({ data: { session: null } });
    mockAuth.signInAnonymously.mockResolvedValue({ data: { user: null }, error: { message: 'disabled' } });
    await expect(load().ensureAnonymousSession()).rejects.toThrow(/anonymous sign-in failed: disabled/);
    mockAuth.signInAnonymously.mockResolvedValue({ data: { user: null }, error: null });
    await expect(load().ensureAnonymousSession()).rejects.toThrow(/no user returned/);
  });
});

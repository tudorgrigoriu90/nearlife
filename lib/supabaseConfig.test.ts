import { getSupabaseConfig } from './supabaseConfig';

// Restore individual keys in afterEach rather than reassigning `process.env` wholesale — a
// whole-object reassignment (`process.env = {...original}`) trips an Expo env-polyfill quirk that
// silently drops subsequent writes to EXPO_PUBLIC_* keys in later tests within the same file/worker
// (see posthogConfig.test.ts). Deleting just the keys this suite touches avoids it.

describe('getSupabaseConfig', () => {
  afterEach(() => {
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    delete process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  });

  it('returns url and publishable key when both are set', () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test';
    expect(getSupabaseConfig()).toEqual({
      url: 'https://example.supabase.co',
      publishableKey: 'sb_publishable_test',
    });
  });

  it('throws a clear error when the url is missing', () => {
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test';
    expect(() => getSupabaseConfig()).toThrow(/Missing Supabase config/);
  });

  it('throws a clear error when the publishable key is missing', () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    delete process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    expect(() => getSupabaseConfig()).toThrow(/Missing Supabase config/);
  });
});

import { getPostHogConfig, hasPostHogConfig } from './posthogConfig';

// Restore individual keys in afterEach rather than reassigning `process.env` wholesale
// (`process.env = {...original}`). A whole-object reassignment trips an Expo env-polyfill quirk
// that silently drops subsequent writes to EXPO_PUBLIC_* keys in later tests within the same
// file/worker — confirmed via isolated repro. Deleting just the keys this suite touches avoids it.

describe('getPostHogConfig', () => {
  afterEach(() => {
    delete process.env.EXPO_PUBLIC_POSTHOG_KEY;
    delete process.env.EXPO_PUBLIC_POSTHOG_HOST;
  });

  it('returns the api key and host when both are set', () => {
    process.env.EXPO_PUBLIC_POSTHOG_KEY = 'phc_test';
    process.env.EXPO_PUBLIC_POSTHOG_HOST = 'https://eu.i.posthog.com';
    expect(getPostHogConfig()).toEqual({ apiKey: 'phc_test', host: 'https://eu.i.posthog.com' });
  });

  it('throws a clear error when the api key is missing', () => {
    delete process.env.EXPO_PUBLIC_POSTHOG_KEY;
    process.env.EXPO_PUBLIC_POSTHOG_HOST = 'https://eu.i.posthog.com';
    expect(() => getPostHogConfig()).toThrow(/Missing PostHog config/);
  });

  it('throws a clear error when the host is missing', () => {
    process.env.EXPO_PUBLIC_POSTHOG_KEY = 'phc_test';
    delete process.env.EXPO_PUBLIC_POSTHOG_HOST;
    expect(() => getPostHogConfig()).toThrow(/Missing PostHog config/);
  });
});

describe('hasPostHogConfig', () => {
  afterEach(() => {
    delete process.env.EXPO_PUBLIC_POSTHOG_KEY;
    delete process.env.EXPO_PUBLIC_POSTHOG_HOST;
  });

  it('is true only when both vars are set', () => {
    delete process.env.EXPO_PUBLIC_POSTHOG_KEY;
    delete process.env.EXPO_PUBLIC_POSTHOG_HOST;
    expect(hasPostHogConfig()).toBe(false);

    process.env.EXPO_PUBLIC_POSTHOG_KEY = 'phc_test';
    expect(hasPostHogConfig()).toBe(false);

    process.env.EXPO_PUBLIC_POSTHOG_HOST = 'https://eu.i.posthog.com';
    expect(hasPostHogConfig()).toBe(true);
  });
});

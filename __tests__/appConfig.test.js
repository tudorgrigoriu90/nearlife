/* global describe, it, expect, __dirname */
// Plain JS: it reads app.json directly, and the app's tsconfig deliberately has no Node types.
const { readFileSync } = require('fs');
const { join } = require('path');

// T-140: EAS refuses every command (env, build) when app.json's slug differs from the slug of the
// EAS project named by extra.eas.projectId. That project was created as "nearlife", so the slug
// is pinned here. The slug is Expo's internal id only: the store name, scheme and package differ.

const { expo } = JSON.parse(readFileSync(join(__dirname, '..', 'app.json'), 'utf8'));

describe('app.json', () => {
  it('uses the slug of the linked EAS project', () => {
    expect(expo.extra.eas.projectId).toBe('27adb571-a470-4052-bb0f-c2a35fbedb39');
    expect(expo.slug).toBe('nearlife');
  });

  it('keeps the user-facing identity unchanged', () => {
    expect(expo.name).toBe('Nearby');
    expect(expo.scheme).toBe('nearby');
    expect(expo.android.package).toBe('com.nearlife.nearby');
  });

  it('shrinks and obfuscates Android release code with R8 (T-238)', () => {
    // Google Play flagged "DEX code optimisation below threshold, obfuscation 3%": release builds
    // shipped without R8. Below 25% it may limit the app's visibility and publishing.
    const entry = expo.plugins.find((p) => Array.isArray(p) && p[0] === 'expo-build-properties');
    expect(entry).toBeDefined();
    expect(entry[1].android).toMatchObject({
      enableMinifyInReleaseBuilds: true,
      enableShrinkResourcesInReleaseBuilds: true,
    });
  });
});

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
});

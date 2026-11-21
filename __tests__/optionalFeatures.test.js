/* global describe, it, expect, __dirname */
// T-374: Google Play reported "android.hardware.screen.portrait" as a required feature, which hides
// the app from devices without a portrait screen (some tablets, Chromebooks, Android XR). Locking
// the orientation makes Play infer the requirement; the plugin declares it optional instead.
const { readFileSync } = require('fs');
const { join } = require('path');
const { addOptionalFeatures, OPTIONAL_FEATURES } = require('../plugins/withOptionalFeatures');

const { expo } = JSON.parse(readFileSync(join(__dirname, '..', 'app.json'), 'utf8'));

describe('optional hardware features', () => {
  it('declares the portrait screen and the camera optional', () => {
    expect(OPTIONAL_FEATURES).toEqual([
      'android.hardware.screen.portrait',
      'android.hardware.camera',
      'android.hardware.camera.autofocus',
    ]);
    const manifest = addOptionalFeatures({ manifest: { $: {} } });
    expect(manifest.manifest['uses-feature']).toEqual(
      OPTIONAL_FEATURES.map((name) => ({ $: { 'android:name': name, 'android:required': 'false' } })),
    );
  });

  it('overrides a feature already declared as required, and keeps the others', () => {
    const manifest = addOptionalFeatures({
      manifest: {
        $: {},
        'uses-feature': [
          { $: { 'android:name': 'android.hardware.camera', 'android:required': 'true' } },
          { $: { 'android:name': 'android.hardware.touchscreen', 'android:required': 'false' } },
        ],
      },
    });
    const features = manifest.manifest['uses-feature'];
    expect(features.filter((f) => f.$['android:name'] === 'android.hardware.camera')).toEqual([
      { $: { 'android:name': 'android.hardware.camera', 'android:required': 'false' } },
    ]);
    expect(features.some((f) => f.$['android:name'] === 'android.hardware.touchscreen')).toBe(true);
    expect(features).toHaveLength(4);
  });

  it('is wired into app.json, and the app stays portrait-locked', () => {
    expect(expo.plugins).toContain('./plugins/withOptionalFeatures');
    expect(expo.orientation).toBe('portrait');
  });
});

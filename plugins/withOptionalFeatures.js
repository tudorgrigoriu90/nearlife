// Expo config plugin (T-374): hardware the app can do without is declared optional, so Google
// Play does not hide the app from devices that lack it.
//   screen.portrait: `orientation: "portrait"` makes Play infer a required portrait screen,
//     excluding some tablets, Chromebooks and Android XR; the app still runs portrait-locked there.
//   camera, camera.autofocus: only for a photo on a field note (T-348), which can also come from
//     the photo library; the CAMERA permission would otherwise imply a required camera.
const { withAndroidManifest } = require('@expo/config-plugins');

const OPTIONAL_FEATURES = [
  'android.hardware.screen.portrait',
  'android.hardware.camera',
  'android.hardware.camera.autofocus',
];

function addOptionalFeatures(androidManifest) {
  const manifest = androidManifest.manifest;
  const others = (manifest['uses-feature'] ?? []).filter(
    (f) => !OPTIONAL_FEATURES.includes(f.$?.['android:name']),
  );
  manifest['uses-feature'] = [
    ...others,
    ...OPTIONAL_FEATURES.map((name) => ({ $: { 'android:name': name, 'android:required': 'false' } })),
  ];
  return androidManifest;
}

const withOptionalFeatures = (config) =>
  withAndroidManifest(config, (mod) => {
    mod.modResults = addOptionalFeatures(mod.modResults);
    return mod;
  });

module.exports = withOptionalFeatures;
module.exports.addOptionalFeatures = addOptionalFeatures;
module.exports.OPTIONAL_FEATURES = OPTIONAL_FEATURES;

const { withAndroidManifest } = require('@expo/config-plugins');

// The app is locked to portrait, so Play infers that it requires a portrait screen and
// hides it from devices that lack one. Declaring the feature optional keeps it installable.
const PORTRAIT = 'android.hardware.screen.portrait';

function setOptionalPortraitFeature(androidManifest) {
  const features = (androidManifest.manifest['uses-feature'] ?? []).filter(
    (feature) => feature.$?.['android:name'] !== PORTRAIT,
  );
  features.push({ $: { 'android:name': PORTRAIT, 'android:required': 'false' } });
  androidManifest.manifest['uses-feature'] = features;
  return androidManifest;
}

module.exports = function withOptionalPortraitFeature(config) {
  return withAndroidManifest(config, (config) => {
    config.modResults = setOptionalPortraitFeature(config.modResults);
    return config;
  });
};
module.exports.setOptionalPortraitFeature = setOptionalPortraitFeature;

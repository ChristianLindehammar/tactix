import { setOptionalPortraitFeature } from '../plugins/with-optional-portrait-feature';

const manifest = (usesFeature?: object[]) => ({
  manifest: { $: { 'xmlns:android': 'http://schemas.android.com/apk/res/android' }, ...(usesFeature && { 'uses-feature': usesFeature }), application: [] },
});
const portraitFeatures = (result: ReturnType<typeof manifest>) =>
  (result.manifest['uses-feature'] ?? []).filter(
    (feature: any) => feature.$['android:name'] === 'android.hardware.screen.portrait',
  );

describe('optional portrait screen feature', () => {
  // A portrait-locked activity makes Play require a portrait screen, which hides the app from devices without one
  it('tells Play a portrait screen is not required', () => {
    expect(portraitFeatures(setOptionalPortraitFeature(manifest()))).toEqual([
      { $: { 'android:name': 'android.hardware.screen.portrait', 'android:required': 'false' } },
    ]);
  });

  it('keeps the other declared features', () => {
    const camera = { $: { 'android:name': 'android.hardware.camera', 'android:required': 'false' } };
    expect(setOptionalPortraitFeature(manifest([camera])).manifest['uses-feature']).toContainEqual(camera);
  });

  it('declares it once however many times prebuild runs', () => {
    const twice = setOptionalPortraitFeature(setOptionalPortraitFeature(manifest()));
    expect(portraitFeatures(twice)).toHaveLength(1);
  });
});

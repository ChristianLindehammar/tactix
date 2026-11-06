const fs = require('fs');
const path = require('path');
const { withDangerousMod } = require('@expo/config-plugins');

// TEMPORARY: react-native-purchases 11.x needs PurchasesHybridCommon 20.4.0, which isn't on
// CocoaPods trunk yet after the November 2026 freeze. This points the two pods at their podspecs
// on GitHub, so `expo prebuild` (fastlane, EAS) keeps the fix. Remove this plugin, and its line in
// app.json, once `PurchasesHybridCommon` 20.4.0 is published on trunk.
const PODS = [
  "  pod 'RevenueCat', :podspec => 'https://raw.githubusercontent.com/RevenueCat/purchases-ios/5.101.0/RevenueCat.podspec'",
  "  pod 'PurchasesHybridCommon', :podspec => 'https://raw.githubusercontent.com/RevenueCat/purchases-hybrid-common/20.4.0/PurchasesHybridCommon.podspec'",
];
const ANCHOR = '  use_expo_modules!\n';

module.exports = function withRevenueCatGithubPods(config) {
  return withDangerousMod(config, [
    'ios',
    (config) => {
      const podfile = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      const contents = fs.readFileSync(podfile, 'utf8');
      if (contents.includes("pod 'PurchasesHybridCommon'")) return config;
      if (!contents.includes(ANCHOR)) {
        throw new Error('with-revenuecat-github-pods: `use_expo_modules!` not found in the Podfile');
      }
      fs.writeFileSync(podfile, contents.replace(ANCHOR, `${ANCHOR}${PODS.join('\n')}\n`));
      return config;
    },
  ]);
};

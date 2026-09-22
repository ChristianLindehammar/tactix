const { withPodfile } = require('@expo/config-plugins');

const DEPLOYMENT_TARGET_LOOP = [
  '    installer.pods_project.targets.each do |target|',
  '      target.build_configurations.each do |config|',
  "        next if (config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] || '15.0').to_f >= 15.0",
  "        config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '15.0'",
  '      end',
  '    end',
].join('\n');

// Marker: end of the react_native_post_install(...) call inside the existing
// `post_install do |installer| ... end` block. We inject the loop right before
// that block's closing `end`.
const MARKER = "      :ccache_enabled => ccache_enabled?(podfile_properties),\n    )\n";

module.exports = function withMinIOSDeploymentTarget(config) {
  return withPodfile(config, (config) => {
    const { contents } = config.modResults;
    if (contents && !contents.includes('IPHONEOS_DEPLOYMENT_TARGET') && contents.includes(MARKER)) {
      config.modResults.contents = contents.replace(MARKER, `${MARKER}${DEPLOYMENT_TARGET_LOOP}\n`);
    }
    return config;
  });
};
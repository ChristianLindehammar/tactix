source "https://rubygems.org"

ruby "3.4.4"

gem "fastlane", "~> 2.226.0"
gem "cocoapods"
gem "mutex_m"
gem "abbrev"
gem "fastlane-plugin-firebase_app_distribution"
plugins_path = File.join(File.dirname(__FILE__), 'fastlane', 'Pluginfile')
eval_gemfile(plugins_path) if File.exist?(plugins_path)

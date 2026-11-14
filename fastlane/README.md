fastlane documentation
----

# Installation

Make sure you have the latest version of the Xcode command line tools installed:

```sh
xcode-select --install
```

For _fastlane_ installation instructions, see [Installing _fastlane_](https://docs.fastlane.tools/#installing-fastlane)

# Available Actions

### deploy_all

```sh
[bundle exec] fastlane deploy_all
```

Prebuild, then build and deploy both iOS (TestFlight) and Android (Play Store internal)

----


## iOS

### ios refresh_profiles

```sh
[bundle exec] fastlane ios refresh_profiles
```

Renew the App Store profile, e.g. after adding a capability such as Sign in with Apple

### ios beta

```sh
[bundle exec] fastlane ios beta
```

Build and upload a new beta build to TestFlight

### ios whats_new

```sh
[bundle exec] fastlane ios whats_new
```

Write the release notes into What's New on the App Store version being prepared

----


## Android

### android release_internal

```sh
[bundle exec] fastlane android release_internal
```

Release an uploaded build to internal testers (e.g. a draft left by an earlier run)

### android beta

```sh
[bundle exec] fastlane android beta
```

Build AAB and upload to Play Store internal testing

----

This README.md is auto-generated and will be re-generated every time [_fastlane_](https://fastlane.tools) is run.

More information about _fastlane_ can be found on [fastlane.tools](https://fastlane.tools).

The documentation of _fastlane_ can be found on [docs.fastlane.tools](https://docs.fastlane.tools).

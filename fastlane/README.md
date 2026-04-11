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

### ios beta

```sh
[bundle exec] fastlane ios beta
```

Build and upload a new beta build to TestFlight

----


## Android

### android beta

```sh
[bundle exec] fastlane android beta
```

Build AAB and upload to Play Store internal testing

----

This README.md is auto-generated and will be re-generated every time [_fastlane_](https://fastlane.tools) is run.

More information about _fastlane_ can be found on [fastlane.tools](https://fastlane.tools).

The documentation of _fastlane_ can be found on [docs.fastlane.tools](https://docs.fastlane.tools).

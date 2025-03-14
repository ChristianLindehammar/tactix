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

Build and deploy both iOS and Android

----


## iOS

### ios beta

```sh
[bundle exec] fastlane ios beta
```

Push a new beta build to TestFlight

### ios ios_beta

```sh
[bundle exec] fastlane ios ios_beta
```



----


## Android

### android beta

```sh
[bundle exec] fastlane android beta
```

Push a new beta build to Play Store Internal Testing

### android android_beta

```sh
[bundle exec] fastlane android android_beta
```



----

This README.md is auto-generated and will be re-generated every time [_fastlane_](https://fastlane.tools) is run.

More information about _fastlane_ can be found on [fastlane.tools](https://fastlane.tools).

The documentation of _fastlane_ can be found on [docs.fastlane.tools](https://docs.fastlane.tools).

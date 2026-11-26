# TODO

## Rolling out the lifetime purchase (2.3.0)

Started 2026-11-23. Android 2.3.0 (60) is in production. iOS 2.3.0 (42) and `coachmate_premium_lifetime`
were submitted for review the same day.

- [ ] iOS: once Apple approves 2.3.0 and the in-app purchase, release the version in App Store Connect if it
      doesn't release itself.
- [ ] Check the lifetime purchase in the live iOS app (the price shows and buying unlocks the exercises).
- [ ] RevenueCat: remove the Monthly and Yearly packages from the `default` offering once 2.3.0 is live on both
      platforms and most coaches have updated (RevenueCat › Charts › app versions). Older app versions
      still sell from those packages until then.
- [ ] Keep the old subscription products (`coachmate_premium_monthly`, `coachmate_premium_annual`) attached to
      the `premium` entitlement, so coaches with a subscription keep access while it runs. Detach them only once
      no active subscribers are left.
- [ ] Optionally stop selling the Play subscriptions in Play Console when the packages are gone. The App Store
      ones were never submitted, so there's nothing to do there.
- [ ] Have someone who speaks Finnish read the fi-FI texts: the in-app purchase title and description
      (`scripts/create_lifetime_product.rb`) and the 2.3.0 release notes.
- [ ] Optionally refresh `fastlane/promotional-text.txt` to mention the one-time purchase, then run
      `bundle exec fastlane ios promotional_text`.

## RevenueCat on iOS: CocoaPods to Swift Package Manager

Noted 2026-11-26. CocoaPods' public repository goes read-only on 2026-12-02, so RevenueCat stops publishing
iOS SDK updates there. `react-native-purchases` 12 is the first version that needs SPM. RevenueCat
recommends that Expo apps stay on v11 with CocoaPods until Expo's SPM support leaves preview. Nothing breaks
in the meantime: builds on v11 keep working, and `^11.0.4` won't move to 12 on its own.

- [ ] Watch https://rev.cat/react-native-spm-migration until it has a tested migration path for Expo apps.
- [ ] Then upgrade to `react-native-purchases` 12 and move iOS to SPM. `ios/` is generated, so this probably
      goes through an Expo config plugin rather than edits to the Podfile.
- [ ] Do this sooner if we need a RevenueCat fix or feature that only comes in v12.

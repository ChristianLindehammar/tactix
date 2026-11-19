# CoachMate

## Releasing

Releases run through fastlane (`fastlane/Fastfile`); run lanes with `bundle exec fastlane <lane>`.

1. Bump `version` in `app.json` and `package.json`, and write the notes in
   `fastlane/release-notes-template.txt` (en-US, sv-SE, fi-FI; at most 500 characters each).
2. `fastlane deploy_all`, or `fastlane ios beta` / `fastlane android beta` for one platform.
   This uploads to TestFlight internal and Play internal testing and sets build numbers itself.
3. `fastlane ios prepare_release` creates the App Store version, attaches its newest processed
   build and sets What's New. It does not submit for review; the coach does that.
4. Production on Google Play is promoted by hand in Play Console.

### App Store Connect API keys

Two keys live in `fastlane/` (git-ignored, same issuer ID). Use the one each lane already uses:

- `AuthKey_9KF34Z7C3A.p8` (`asc_api_key`): uploads only. Building, match and TestFlight.
- `AuthKey_HGL5XFT2B3.p8` (`asc_release_key`): App Manager. Needed to create App Store
  versions and edit their metadata (`prepare_release`, `whats_new`). The upload key gets
  "The API key in use does not allow this request" for those.

Never print the signing secrets fastlane reads from the environment (`MATCH_PASSWORD`,
`ANDROID_STORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`).

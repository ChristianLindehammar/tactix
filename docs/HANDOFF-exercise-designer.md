# Handoff: premium exercise designer

Last updated 2026-11-04. Branch: `feature/exercise-designer`, pushed, no PR yet.

CoachMate (Expo 57, React Native 0.86, expo-router) is getting a paid feature that lets coaches design, tag, rate and find training exercises per sport. The feature works on Android and iOS, but it has no paywall yet.

## Where things stand

| Step | Status |
|---|---|
| Extract `TacticsBoard`, UUID marker IDs | Done (`737841b`) |
| Exercise format, validation, local storage | Done (`92fb074`) |
| Exercises tab: library, filters, detail, editor, translations | Done (`a022127`) |
| Rating, cloning, ownership, unsaved-changes warning, drill markers | Done (`639405f`) |
| iOS check | Done, on the `iPhone 17 Pro` simulator |
| Dark mode on iOS, exercise screens only | Done |
| Library sorting and minimum rating | Done |
| Device checks on Android | Done on `CoachMate_Dev`; iOS gaps listed under next steps |
| RevenueCat and paywall | **Next**; see open decisions |
| Accounts, backend, sync | Not started |

Last run: 263 tests in 20 suites passing. `tsc` reports errors in older files such as `hooks/useThemeColor.ts`, but none in this feature's files.

## Where the code is

| Area | Files |
|---|---|
| Format and validation | `types/exercise.ts` (`parseExercise`, ratings), `types/tacticsMarker.ts` |
| Storage | `services/exerciseRepository.ts`, `services/exerciseRatings.ts`, `services/currentUser.ts` |
| Screens | `app/(tabs)/exercises/` (`index`, `[id]`, `edit`, `_layout`) |
| Board | `components/TacticsBoard.tsx`, `components/CourtSurface.tsx` |
| Logic | `utils/exerciseDraft.ts`, `utils/filterExercises.ts`, `utils/cloneExercise.ts`, `utils/describeExercise.ts` |
| Test helpers | `jest.setup.js`, `test-utils/` |

## Decisions already made

- **Placement:** exercises have their own tab and share the board component with Tactics. Free drawing on the Tactics board stays free.
- **Format:** versioned JSON (`schemaVersion: 1`). Nothing has shipped, so the format can still change without a migration.
- **Stable keys:** focus tags, phases and difficulty are stored as keys and translated on display.
- **Frames:** `frames` is an array from the start, so multi-step drills won't need a migration. The UI only uses the first frame so far.
- **Storage:** one AsyncStorage key per exercise (`exercise:<id>`), found by prefix, with no index. Deletes are soft (`deletedAt`) so they can sync later.
- **Ownership:** `ownerId` comes from a local ID until accounts exist. Only the owner can edit or delete, and the repository enforces it as well as the UI. A null owner means nobody can edit.
- **Sorting and minimum rating:** the library sorts by latest updated (default), highest rated, title or difficulty, with the latest edit first within a tie. The minimum rating hides unrated exercises. Both use your own stars, as there are no averages until a backend exists. Clear filters resets the minimum rating but not the sort. Filter chips sit in a panel that's closed by default, opened with a Filter button that shows how many are active. Sort stays visible beside the button, and search and player count stay visible and aren't counted.
- **Ratings:** one record per user and exercise, stored apart from the exercise (`exercise-rating:<userId>:<exerciseId>`). A cleared rating stays as `stars: null` so it can sync.
- **Clone:** creates a new exercise you own, with `clonedFromId` pointing at the source. Ratings are not copied.
- **Arrow names:** solid is Run and dashed is Pass, confirmed by Christian. Coaches' conventions differ, but swapping would only change the displayed names in `translations/`.
- **Sharing exercises:** wait for the database, then share by link, which works in SMS and mail. Decided by Christian on 2026-11-04. Links need a web page or app store fallback for people without the app. Until import exists, the app treats every `.coachmate` file it opens as a team.
- **Placing near a marker:** while a tool is selected, a marker's touch area shrinks to the marker itself, so nearby taps place the new marker. Tapping or dragging the marker itself still puts the tool away.
- **Payments:** RevenueCat with in-app purchases only. Apple and Google are the merchant of record, so no Stripe or Paddle.
- **Backend (later):** Postgres, for example Supabase, because the filters combine several fields. The existing Firebase code is dead: placeholder keys, not in `package.json`, nothing imports it. Delete it rather than build on it.

## Traps that already cost time

- **Keep `usePreventRemove` armed when leaving the editor.** Turning it off in the same batch as `router.back()` crashes Android with `ScreenStackFragment added into a non-stack container`. The callback lets the exit through instead (`saved` ref in `edit.tsx`). Jest can't see this crash because navigation is faked, so check navigation changes on a device.
- **Android builds fail under the default `JAVA_HOME`,** which points at JDK 25 (`react-native-worklets:configureCMakeDebug` fails). Use `export JAVA_HOME=/opt/homebrew/opt/openjdk@17`.
- **Don't uninstall the app from `Pixel_6_API_33`.** It holds a differently signed 1.4.0 build, and removing it would wipe that app's data. Use `CoachMate_Dev`, created for this work. `Spike_API33` is an automotive image and not useful.
- **Don't range-check marker coordinates.** Dragging doesn't clamp, so markers can legitimately sit slightly off-court.
- **Scripted drags:** `adb input motionevent` is slow enough to pass the 500ms long-press and open the Delete dialog. Use `adb shell input draganddrop` instead.
- **Dev Tools button:** the floating gear covers the library's add button. Drag it out of the way; it doesn't exist in production.
- **Disk space:** only about 14 GB was free at one point, and native builds use a lot.
- **Dev Tools gear on iOS:** it blocks taps around it, well beyond its visible circle, and it can swallow a left-edge swipe. If a tap in the top-left does nothing, move the gear before suspecting the app.
- **No Simulator.app:** Xcode 27 replaced it with Device Hub, at `/Applications/Xcode.app/Contents/Applications/DeviceHub.app`. `open -a Simulator` fails.
- **Driving iOS with MobileBuildMCP:** it's added locally with UI automation enabled in the git-excluded `.mobilebuildmcp/config.yaml`.
    - Call `session_set_defaults` with the simulator ID after each reconnect.
    - Focus a text field before typing. Otherwise keys reach the React Native dev shortcuts, where `i` toggles the element inspector.
    - `Redigera skiss`, `Spara`, the board tools and the court aren't listed as tap targets. Get their refs with `wait_for_ui` by label or test ID, then use `touch`.
    - It can't see inside the label dialog, so use `key_sequence` to type there.
    - Its `swipe-from-left-edge` preset doesn't trigger the iOS back gesture, so test back-swipes by hand.
    - It can only tap element centres, and its drags don't hold first, so they can't move board markers. Use Android for board checks, with `adb shell input tap` and `input draganddrop`.
- **Gesture config in tests:** `getByGestureTestId` returns the gesture from the first render, so it can't show later changes. Test the marker and the board's `placing` prop separately, then check on a device.
- **Android tab bar position:** it can shift between launches, so take a screenshot before using fixed tap coordinates.

## Running it

```bash
npx jest --watchAll=false
export JAVA_HOME=/opt/homebrew/opt/openjdk@17
npx expo run:android --device CoachMate_Dev
npx expo run:ios --device "iPhone 17 Pro"
```

`expo-crypto` is a native dependency, so older dev builds need rebuilding. To test another coach's exercise, there's no import yet, so seed one into `catalystLocalStorage` in `databases/RKStorage` using `adb shell run-as com.lindehammarkonsult.coachmate sqlite3`. `CoachMate_Dev` already holds test data, including a seeded `exercise:seed-theirs`.

## How we work

The `tdd` skill is in use: agree the test seams with Christian before writing tests at a new seam, then go from a failing test to a passing one. Check progress on the emulator regularly, since it has caught bugs the tests couldn't. Commit and push only when asked.

## Next steps

1. **Remaining device checks:**
    - iOS: placing beside a marker, dragging, and the other board checks, which were only run on Android. These need testing by hand.
    - Floorball and basketball.
    - Dark mode: the puck in the toolbar, the bandy board and the editor form.
2. **RevenueCat and paywall.** Proposed free tier: the tactics board as it is, plus about three saved exercises. Christian needs to create the products in App Store Connect and Google Play Console. Include Restore Purchases.

Later:
- Sharing exercises by link, once they're in the database.
- Multi-step drills using `frames`.
- Accounts, moving local exercises to the signed-in user, and sync.

## Found during device checks, not fixed

- **Label limit:** the dialog says 3 characters but accepts 5, then cuts the label to 3 on save without warning.
- **Screen readers:** `Redigera skiss`, `Spara` and the board tools aren't exposed as buttons, so VoiceOver users may not find them.
- **Overlapping markers:** where touch areas overlap, the marker placed last takes the drag, even if you touch the centre of the one beneath it.

## Open decisions for Christian

- **Pricing:** one-time purchase or annual plan. I recommended one-time until sync exists, because a subscription is hard to justify while everything stays on the device.
- **Saving tactics:** should saved plain tactics be free? I suggested a few for free.
- **Exercise library:** whether to offer a shared or curated one. I suggested curated first, since publishing by coaches needs moderation.
- **Difficulty scale:** currently 1–5. Three levels might rate more consistently if a shared library comes soon.
- **Deleting others' exercises:** blocked for now, which Christian didn't explicitly ask for. It needs rethinking with link sharing, so people can remove a shared copy.
- **Translations:** Swedish and Finnish strings need review, Finnish especially.

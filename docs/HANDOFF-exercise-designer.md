# Handoff: premium exercise designer

Last updated 2026-11-03. Branch: `feature/exercise-designer`, pushed, no PR yet.

CoachMate (Expo 57, React Native 0.86, expo-router) is getting a paid feature that lets coaches design, tag, rate and find training exercises per sport. The feature works on Android, but it has no paywall yet and has never run on iOS.

## Where things stand

| Step | Status |
|---|---|
| Extract `TacticsBoard`, UUID marker IDs | Done (`737841b`) |
| Exercise format, validation, local storage | Done (`92fb074`) |
| Exercises tab: library, filters, detail, editor, translations | Done (`a022127`) |
| Rating, cloning, ownership, unsaved-changes warning, drill markers | Done (`639405f`) |
| iOS and dark mode check | **Next** |
| RevenueCat and paywall | Not started; see open decisions |
| Accounts, backend, sync | Not started |

Last run: 244 tests in 18 suites passing. `tsc` reports errors in older files such as `hooks/useThemeColor.ts`, but none in this feature's files.

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
- **Ratings:** one record per user and exercise, stored apart from the exercise (`exercise-rating:<userId>:<exerciseId>`). A cleared rating stays as `stars: null` so it can sync.
- **Clone:** creates a new exercise you own, with `clonedFromId` pointing at the source. Ratings are not copied.
- **Payments:** RevenueCat with in-app purchases only. Apple and Google are the merchant of record, so no Stripe or Paddle.
- **Backend (later):** Postgres, for example Supabase, because the filters combine several fields. The existing Firebase code is dead: placeholder keys, not in `package.json`, nothing imports it. Delete it rather than build on it.

## Traps that already cost time

- **Keep `usePreventRemove` armed when leaving the editor.** Turning it off in the same batch as `router.back()` crashes Android with `ScreenStackFragment added into a non-stack container`. The callback lets the exit through instead (`saved` ref in `edit.tsx`). Jest can't see this crash because navigation is faked, so check navigation changes on a device.
- **Android builds fail under the default `JAVA_HOME`,** which points at JDK 25 (`react-native-worklets:configureCMakeDebug` fails). Use `export JAVA_HOME=/opt/homebrew/opt/openjdk@17`.
- **Don't uninstall the app from `Pixel_6_API_33`.** It holds a differently signed 1.4.0 build, and removing it would wipe that app's data. Use `CoachMate_Dev`, created for this work. `Spike_API33` is an automotive image and not useful.
- **Don't range-check marker coordinates.** Dragging doesn't clamp, so markers can legitimately sit slightly off-court.
- **Scripted drags:** `adb input motionevent` is slow enough to pass the 500ms long-press and open the Delete dialog. Use `adb shell input draganddrop` instead.
- **Dev Tools button:** the floating gear covers the library's add button. Drag it out of the way; it doesn't exist in production.
- **Disk space:** only about 14 GB was free, and native builds use a lot.

## Running it

```bash
npx jest --watchAll=false
export JAVA_HOME=/opt/homebrew/opt/openjdk@17
npx expo run:android --device CoachMate_Dev
```

`expo-crypto` is a native dependency, so older dev builds need rebuilding. To test another coach's exercise, there's no import yet, so seed one into `catalystLocalStorage` in `databases/RKStorage` using `adb shell run-as com.lindehammarkonsult.coachmate sqlite3`. `CoachMate_Dev` already holds test data, including a seeded `exercise:seed-theirs`.

## How we work

The `tdd` skill is in use: agree the test seams with Christian before writing tests at a new seam, then go from a failing test to a passing one. Check progress on the emulator regularly, since it has caught bugs the tests couldn't. Commit and push only when asked.

## Next steps

1. **iOS check.** There's no `ios/` folder, so this needs a prebuild, and `ios/` isn't git-ignored: don't commit it by accident. Check the tab bar spacing (`bottomInset`), back-swipe with the unsaved-changes warning, and nested modals (the label dialog inside the diagram modal).
2. **Remaining device checks:**
    - Dark mode.
    - Tactics tab after the board changes.
    - Hockey and bandy, including goal marker contrast on white ice.
    - Filters.
    - Cloning someone else's exercise.
3. **RevenueCat and paywall.** Proposed free tier: the tactics board as it is, plus about three saved exercises. Christian needs to create the products in App Store Connect and Google Play Console. Include Restore Purchases.

Later:
- Export and import through `.coachmate` files, adding a `kind` field and treating files without one as teams.
- Multi-step drills using `frames`.
- A library filter or sort by rating.
- Accounts, moving local exercises to the signed-in user, and sync.

## Open decisions for Christian

- **Pricing:** one-time purchase or annual plan. I recommended one-time until sync exists, because a subscription is hard to justify while everything stays on the device.
- **Arrow names:** solid is Run and dashed is Pass in exercises. Conventions differ, and swapping only changes the displayed name.
- **Saving tactics:** should saved plain tactics be free? I suggested a few for free.
- **Exercise library:** whether to offer a shared or curated one. I suggested curated first, since publishing by coaches needs moderation.
- **Difficulty scale:** currently 1–5. Three levels might rate more consistently if a shared library comes soon.
- **Deleting others' exercises:** blocked for now, which Christian didn't explicitly ask for. It needs rethinking with import, so people can remove an imported copy.
- **Translations:** Swedish and Finnish strings need review, Finnish especially.

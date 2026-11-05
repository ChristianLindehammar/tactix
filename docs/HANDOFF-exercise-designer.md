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
| Backend: Flask API on MariaDB, in `backend/` | Deployed at `lindehammar-konsult.se/coachmate/api`: registering an install, saving, fetching and listing exercises, rate limits. A check against the live server passed on 2026-11-05 |
| App upload to the backend | Done in dev builds, checked on Android against the live server. Off in release builds until the privacy policy is updated |
| Ratings on the server, downloading, sign-in | Not started |

Last run: 300 tests in 23 suites passing. `tsc` reports errors in older files such as `hooks/useThemeColor.ts`, but none in this feature's files.

## Where the code is

| Area | Files |
|---|---|
| Format and validation | `types/exercise.ts` (`parseExercise`, ratings), `types/tacticsMarker.ts` |
| Storage | `services/exerciseRepository.ts`, `services/exerciseRatings.ts`, `services/currentUser.ts` |
| Upload | `services/exerciseSync.ts`, `constants/api.ts` |
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
- **Backend:** Flask on Phusion Passenger with MariaDB, following `DriveCal/meridian_payment_backend`, but split into modules, with tests, numbered migrations and real tokens. Chosen by Christian on 2026-11-04 instead of Postgres or Supabase. It runs at `lindehammar-konsult.se/coachmate/api`, leaving `/coachmate/` free for web pages such as the share link fallback, and that address can change. Redis isn't needed yet. The `coachmate-api` repo is an unused Express skeleton, so don't build on it. The existing Firebase code is dead: placeholder keys, not in `package.json`, nothing imports it. Delete it rather than build on it.
- **Identity on the server:** each install gets an anonymous token from `POST /devices`, and only its hash is stored. The server decides the owner and ignores `ownerId` from the app. Any valid token can read an exercise by ID, because the ID is what a share link carries. A coach who loses their phone loses access until sign-in exists. Christian didn't object when this was proposed, but hasn't explicitly confirmed it.

- **Upload only, for now:** the device stays the source of truth, and saving never waits for the network. Chosen by Christian on 2026-11-05. Each install is its own user, so downloading and conflict rules wait for sign-in. Exercises upload after each save or delete, at launch and when the app returns to the foreground. An `exercise-sync:<id>` key holds the `updatedAt` the server last answered for. Exercises deleted before they ever uploaded are never sent. Others' exercises aren't sent either. The token is in `expo-secure-store`.
- **Upload stays off in release builds:** `EXERCISE_SYNC_ENABLED` in `constants/api.ts` is `__DEV__`, because `privay-policy.html` promises that all data stays on the device. Chosen by Christian on 2026-11-05. Before turning it on, update the policy and the store privacy forms. They also need to say that deleted exercises stay on the server, because deletes are soft.

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
    - The court and board markers aren't listed as tap targets. Get their refs with `wait_for_ui` by label or test ID, then use `touch`.
    - A `touch` on a player didn't open the label dialog: down+up together did nothing, and separate down and up calls opened the Delete dialog as a long press. Use Android for label checks. Don't send keys until the dialog is open, or they reach the React Native dev shortcuts.
    - Its `swipe-from-left-edge` preset doesn't trigger the iOS back gesture, so test back-swipes by hand.
    - It can only tap element centres, and its drags don't hold first, so they can't move board markers. Use Android for board checks, with `adb shell input tap` and `input draganddrop`.
- **Gesture config in tests:** `getByGestureTestId` returns the gesture from the first render, so it can't show later changes. Test the marker and the board's `placing` prop separately, then check on a device.
- **MariaDB and `mysql-connector-python`:** the connector's default collation is MySQL-only and MariaDB refuses it, so always set `collation` (`coachmate_api/config.py`).
- **Database locking:** connections use `READ COMMITTED` (`coachmate_api/db.py`). At MariaDB's default level, parallel saves of new exercises deadlocked and up to 10% failed with a 503. Keep `tests/test_concurrency.py` passing when changing writes, as ordinary tests run one request at a time and can't see this.
- **Android tab bar position:** it can shift between launches, so take a screenshot before using fixed tap coordinates.

## Running it

```bash
npx jest --watchAll=false
export JAVA_HOME=/opt/homebrew/opt/openjdk@17
npx expo run:android --device CoachMate_Dev
npx expo run:ios --device "iPhone 17 Pro"

cd backend && ./scripts/test_db.sh   # second terminal: throwaway MariaDB on port 33306
cd backend && .venv/bin/pytest       # 106 tests; setup and deployment are in backend/README.md
```

`expo-crypto` is a native dependency, so older dev builds need rebuilding. To test another coach's exercise, there's no import yet, so seed one into `catalystLocalStorage` in `databases/RKStorage` using `adb shell run-as com.lindehammarkonsult.coachmate sqlite3`. `CoachMate_Dev` already holds test data, including a seeded `exercise:seed-theirs`.

## How we work

The `tdd` skill is in use: agree the test seams with Christian before writing tests at a new seam, then go from a failing test to a passing one. Check progress on the emulator regularly, since it has caught bugs the tests couldn't. Commit and push only when asked.

## Next steps

1. **Remaining device checks:**
    - iOS: placing beside a marker, dragging, and the other board checks, which were only run on Android. These need testing by hand.
    - Floorball and basketball.
    - Dark mode: the puck in the toolbar, the bandy board and the editor form.
2. **Backend:**
    - After deploying, check the rate limiter sees real addresses (steps in `backend/README.md`). If the host has a proxy in front of Passenger, every coach would share one limit.
    - Add ratings and average ratings, then filtering and sorting by rating in `GET /exercises`.
    - Listing only returns your own exercises and leaves out deleted ones. Sync across devices will need deleted ones and an "updated since" option. Browsing others' exercises waits for the exercise library decision.
    - Titles sort with `å`, `ä` and `ö` among `a` and `o` on the server, unlike Swedish sorting in the app.
    - Upload gaps: if the server stops accepting a token, the app registers again as a new user. Later edits to its older exercises are then refused with a 403 and stay only on the device. Clearing the server's tables has a similar effect, as the `exercise-sync:` keys stop the app sending unchanged exercises again. A 429 wait is only held in memory, and a refused upload only shows as a console warning.
    - With sign-in or downloading: decide what happens when two devices edit the same exercise, where the last save currently wins, even if it's older. Move local exercises from the local `ownerId` to the server's.
    - Check upload on iOS. It needs a rebuild for `expo-secure-store`.
    - `backend/coachmate_api/validation.py` repeats the rules in `types/exercise.ts`, so change both together.
3. **RevenueCat and paywall.** Proposed free tier: the tactics board as it is, plus about three saved exercises. Christian needs to create the products in App Store Connect and Google Play Console. Include Restore Purchases.

Later:
- Sharing exercises by link, once they're in the database.
- Multi-step drills using `frames`.
- Sign-in with Apple or Google, moving anonymous exercises to the signed-in user.

## Found during device checks, not fixed

- **Screen readers on the board:** tools, buttons and labellable players are now announced as buttons, with translated tool names. Placing and dragging markers still needs touches on the court, so a screen reader user can't build a diagram. Nothing has been tried with VoiceOver or TalkBack themselves, only the accessibility tree.
- **Overlapping markers:** where touch areas overlap, the marker placed last takes the drag, even if you touch the centre of the one beneath it.

## Open decisions for Christian

- **Pricing:** one-time purchase or annual plan. I recommended one-time until sync exists, because a subscription is hard to justify while everything stays on the device.
- **Saving tactics:** should saved plain tactics be free? I suggested a few for free.
- **Exercise library:** whether to offer a shared or curated one. I suggested curated first, since publishing by coaches needs moderation.
- **Difficulty scale:** currently 1–5. Three levels might rate more consistently if a shared library comes soon.
- **Deleting others' exercises:** blocked for now, which Christian didn't explicitly ask for. It needs rethinking with link sharing, so people can remove a shared copy.
- **Translations:** Swedish and Finnish strings need review, Finnish especially.

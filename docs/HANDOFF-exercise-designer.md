# Handoff: premium exercise designer

Last updated 2026-11-05. Branch: `feature/exercise-designer`, pushed, no PR yet.

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
| Plans on the backend: RevenueCat webhook, plan refresh, uploads need a plan | Built and tested with a fake RevenueCat, committed in `c6eaa12`, **not deployed**. Deploying blocks uploads until RevenueCat is set up |
| RevenueCat and paywall in the app | Plan service, paywall with yearly and monthly plans, locked screen, export and delete built with automated tests. Paywall, simulated purchase and locked screen checked on Android; export and delete not tried on a device. The RevenueCat adapter (`services/revenueCatPlanStore.ts`) has no tests and has never run against RevenueCat. Without keys, dev builds use a simulated store and release builds stay locked |
| Backend: Flask API on MariaDB, in `backend/` | Deployed at `lindehammar-konsult.se/coachmate/api`: registering an install, saving, fetching and listing exercises, rate limits. A check against the live server passed on 2026-11-05 |
| App upload to the backend | Done in dev builds, checked on Android against the live server. Off in release builds until the privacy policy is updated |
| Sign-in by email code: backend, app, Account screen | Built and checked on Android against a local API, committed in `56dfa1f`, **not deployed**. Off in release builds |
| Apple and Google sign-in | Built. Google checked on Android (`CoachMate_Google` emulator) against the live server, and the chooser appears after signing out. Google also works on Christian's iPhone against the live server. Apple on iOS and cancelling on both platforms still need confirming |
| Web app | Not started. The backend's cookie session is ready for it |
| Ratings on the server, downloading | Not started |
| Curved arrows | Built and checked on Android (`CoachMate_Google`), in the exercise editor and on the Tactics board. The backend's validation is updated but not deployed, so the live server drops curves on upload. Not tried on iOS or with a real finger |

Last run: 419 app tests in 29 suites and 211 backend tests passing. `tsc` reports errors in older files such as `hooks/useThemeColor.ts`, but none in this feature's files.

## Where the code is

| Area | Files |
|---|---|
| Format and validation | `types/exercise.ts` (`parseExercise`, ratings), `types/tacticsMarker.ts` |
| Storage | `services/exerciseRepository.ts`, `services/exerciseRatings.ts`, `services/currentUser.ts` |
| Upload | `services/exerciseSync.ts`, `constants/api.ts` |
| Accounts | `services/authSession.ts`, `services/account.ts`, `services/localAccountData.ts`, `components/AccountPanel.tsx`, `app/(tabs)/settings/account.tsx`, `backend/coachmate_api/accounts.py`, `provider_tokens.py`, `mail.py` |
| Screens | `app/(tabs)/exercises/` (`index`, `[id]`, `edit`, `_layout`) |
| Board | `components/TacticsBoard.tsx`, `components/CourtSurface.tsx` |
| Arrow curves | `utils/arrowCurve.ts` (geometry and snapping), `components/ArrowMarker.tsx` |
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
- **Curved arrows:** an arrow's middle dot sits on the first hump's peak. Dragging it sideways sets the bend, and dragging it toward the start adds waves, with faint dots showing the snap positions. Humps are uniform with evenly spaced peaks, so an arrow starting half a cone gap before a row of cones, with one wave per cone, makes a slalom. Stored as `bend` (share of court width, signed, steps of 0.02, up to 0.5) and `waves` (1–8) on the arrow, and a straight arrow has neither. A wave count is only offered if the arrow has room for it. It's on through `enableCurves`, used by the exercise editor and the free Tactics board (Christian's choice on 2026-11-05). Tactics has no hint row, so nothing there explains the dot.
- **Layers with curves on:** cones 0, arrows 1, other markers 2, dragged marker 3, curve dot 4. Cones sit below arrows because the touch margins of a row of cones otherwise cover the whole line, leaving an arrow's ends impossible to grab. Players stay on top so an arrow starting at a player doesn't block dragging the player.
- **Payments:** RevenueCat with in-app purchases only. Apple and Google are the merchant of record, so no Stripe or Paddle.
- **Checking plans:** a RevenueCat webhook only says that something changed, as its events have no promised order. The server then asks RevenueCat for the current state and stores the end date on `users.plan_expires_at`. Saving needs an active plan, but a coach can always read their own exercises and delete ones already uploaded. The app must call `POST /me/plan/refresh` after signing in or buying, because RevenueCat's docs don't mention a webhook when a purchase made while signed out joins an account.
- **Plan:** yearly and monthly subscriptions, both offered on the paywall (Christian added monthly on 2026-11-05; 199 kr and 29 kr were suggested as starting prices). When a coach's plan ends, they can't use the exercise feature.
- **Trial and lapsed plans:** a 14-day free trial through the stores, with no free exercises. When a plan ends, exercises stay stored and locked on the device and server, renewing brings them back, and a locked coach can still export or delete them. Agreed by Christian on 2026-11-05.
- **Backend:** Flask on Phusion Passenger with MariaDB, following `DriveCal/meridian_payment_backend`, but split into modules, with tests, numbered migrations and real tokens. Chosen by Christian on 2026-11-04 instead of Postgres or Supabase. It runs at `lindehammar-konsult.se/coachmate/api`, leaving `/coachmate/` free for web pages such as the share link fallback, and that address can change. Redis isn't needed yet. The `coachmate-api` repo is an unused Express skeleton, so don't build on it. The existing Firebase code is dead: placeholder keys, not in `package.json`, nothing imports it. Delete it rather than build on it.
- **Sign-in:** Apple, Google and an emailed 6-digit code, chosen by Christian on 2026-11-05. An account is optional, and the app works fully on the device without one. Nothing uploads while signed out, so `POST /devices` and anonymous server users are gone. A verified email joins the account that address already has, whichever way it signed in. Hide My Email addresses therefore make a separate account.
- **Sessions:** phones keep a token in `expo-secure-store`. The web app gets an HttpOnly cookie, which needs it served from the same origin as the API, such as `/coachmate/`. Only token hashes are stored, and tokens don't expire yet. The server decides the owner and ignores `ownerId` from the app. Any valid session can read an exercise by ID, for share links.
- **Local data and accounts:** signing in moves exercises and ratings from the local ID to the account and queues them for upload. Signing out keeps them on the device, read-only until that coach signs back in, so a second coach on the same phone can't take them over. Deleting an account removes it and its exercises from the server, and the device's copies become editable local work again.

- **Upload only, for now:** the device stays the source of truth, and saving never waits for the network. Chosen by Christian on 2026-11-05. Downloading and conflict rules are still to come, so a coach signing in on a second device sees nothing from the first yet. Exercises upload after each save or delete, at launch and when the app returns to the foreground. An `exercise-sync:<id>` key holds the `updatedAt` the server last answered for. Exercises deleted before they ever uploaded are never sent. Others' exercises aren't sent either.
- **Upload stays off in release builds:** `EXERCISE_SYNC_ENABLED` in `constants/api.ts` is `__DEV__`, chosen by Christian on 2026-11-05. `privacy-policy.html` was rewritten and published on 2026-11-05 and covers accounts, upload and RevenueCat. Before turning it on, update the App Store and Google Play privacy forms to match, including that deleted exercises stay on the server, because deletes are soft.

## Traps that already cost time

- **Keep `usePreventRemove` armed when leaving the editor.** Turning it off in the same batch as `router.back()` crashes Android with `ScreenStackFragment added into a non-stack container`. The callback lets the exit through instead (`saved` ref in `edit.tsx`). Jest can't see this crash because navigation is faked, so check navigation changes on a device.
- **Android builds fail under the default `JAVA_HOME`,** which points at JDK 25 (`react-native-worklets:configureCMakeDebug` fails). Use `export JAVA_HOME=/opt/homebrew/opt/openjdk@17`.
- **Google sign-in needs Google Play services.** `CoachMate_Dev` has none, so use `CoachMate_Google`. Start it with `-gpu host`, as its window stayed gray with the default software graphics.
- **`COCOAPODS_CDN_MAX_NUMBER_OF_RETRIES=40`** gets `pod install` past `Error in the HTTP2 framing layer` from the CDN.
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
- **Pan translation starts at activation on Android,** not at touch down, so a handle positioned from `translationX` lags the finger. The curve dot uses `absoluteX` from `onBegin` instead. The arrow's end handles still use translation, so a fast drag ends short of the finger.
- **Fast Refresh during a board check:** it can drop an unsaved exercise draft, and once stacked a read-only preview's cones in the court's top-left corner until the screen was reopened. Don't edit code in the middle of a scripted check, and reopen the screen before suspecting the app.
- **Scripted board drags:** `adb shell input swipe x1 y1 x2 y2 900` moves arrow handles. A swipe with the same start and end point is a long press. In zsh, `read X Y <<< "$(...)"` splits values; `set -- $B` doesn't.
- **Saving on a signed-in emulator uploads to the live server,** as `CoachMate_Google` is signed in and `API_BASE_URL` defaults to it. The dev build uses RevenueCat's Test Store (`test_` keys in `.env.local`), not the simulated store, and its test plans lapse quickly, so tap Renew and Test Valid Purchase if the Exercises tab is locked.
- **Gesture config in tests:** `getByGestureTestId` returns the gesture from the first render, so it can't show later changes. Test the marker and the board's `placing` prop separately, then check on a device.
- **MariaDB and `mysql-connector-python`:** the connector's default collation is MySQL-only and MariaDB refuses it, so always set `collation` (`coachmate_api/config.py`).
- **Database locking:** connections use `READ COMMITTED` (`coachmate_api/db.py`). At MariaDB's default level, parallel saves of new exercises deadlocked and up to 10% failed with a 503. Keep `tests/test_concurrency.py` passing when changing writes, as ordinary tests run one request at a time and can't see this.
- **Android tab bar position:** it can shift between launches, so take a screenshot before using fixed tap coordinates.
- **Testing sign-in without mail:** set `EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:5001` when starting Metro and run the API locally with a `send_sign_in_code` that writes the code to a file. Cold starts of the dev build are slow, so look at the screen before tapping. Blind taps once landed in Android's settings.

## Running it

```bash
npx jest --watchAll=false
export JAVA_HOME=/opt/homebrew/opt/openjdk@17
npx expo run:android --device CoachMate_Dev
npx expo run:ios --device "iPhone 17 Pro"

cd backend && ./scripts/test_db.sh   # second terminal: throwaway MariaDB on port 33306
cd backend && .venv/bin/pytest       # setup and deployment are in backend/README.md
```

`expo-crypto` is a native dependency, so older dev builds need rebuilding. To test another coach's exercise, there's no import yet, so seed one into `catalystLocalStorage` in `databases/RKStorage` using `adb shell run-as com.lindehammarkonsult.coachmate sqlite3`. `CoachMate_Dev` already holds test data, including a seeded `exercise:seed-theirs`.

## How we work

The `tdd` skill is in use: agree the test seams with Christian before writing tests at a new seam, then go from a failing test to a passing one. Check progress on the emulator regularly, since it has caught bugs the tests couldn't. Commit and push only when asked.

## Next steps

1. **Remaining device checks:**
    - iOS: placing beside a marker, dragging, and the other board checks, which were only run on Android. These need testing by hand.
    - Floorball and basketball.
    - Curved arrows: iOS, and the feel of a real finger on Android.
    - Dark mode: the puck in the toolbar, the bandy board and the editor form.
2. **Backend:**
    - Check the rate limiter sees real addresses (steps in `backend/README.md`). If the host has a proxy in front of Passenger, every coach would share one limit. The check blocks your IP from asking for codes for up to an hour and needs a phone on mobile data, so it hasn't been run.
    - Add `scripts/backup_db.sh` to cron on the server before real coaches save anything, if that isn't done yet.
    - Clear test data from the live database before launch. Nothing there is real yet: it holds users and exercises from the live server check and `CoachMate_Dev`. To remove the check's leftovers but keep the emulator's user, delete exercise `d09005cf-7bcd-4504-9725-2396f07547be`, then rows in `api_tokens` and `users` whose user owns no exercises. Removing exercises in `CoachMate_Dev`'s account as well means it won't send them again, because of the `exercise-sync:` keys.
    - Deploy the curve validation (`bend`, `waves`). Until then the live server drops them from uploads, and `exercise-sync:` keys stop unchanged exercises being re-sent, so curved exercises uploaded before the deploy stay straight there until edited. Test exercise "Slalom" (`2635589d-7070-4f78-a593-bfb0def5f4cd`) is on the live server from the curve check.
    - Add ratings and average ratings, then filtering and sorting by rating in `GET /exercises`.
    - Listing only returns your own exercises and leaves out deleted ones. Sync across devices will need deleted ones and an "updated since" option. Browsing others' exercises waits for the exercise library decision.
    - Titles sort with `å`, `ä` and `ö` among `a` and `o` on the server, unlike Swedish sorting in the app.
    - Upload gaps: clearing the server's tables stops unchanged exercises being sent again, because of the `exercise-sync:` keys. A 429 wait is only held in memory, and a refused upload only shows as a console warning.
    - With downloading: decide what happens when two devices edit the same exercise, where the last save currently wins, even if it's older.
    - Check upload on iOS. It needs a rebuild for `expo-secure-store`.
    - `backend/coachmate_api/validation.py` repeats the rules in `types/exercise.ts`, so change both together.
3. **Finish sign-in:**
    - Deploy the backend: install the new requirements, run `scripts/migrate.py`, and add the mail and client ID settings from `.env.example`. The app has to be updated with it, as `POST /devices` is gone.
    - Add Apple and Google buttons on web. The app has them: Apple on iOS only, Google on iOS and Android (`services/signInProviders.ts`, `constants/signIn.ts`). Google on phones can't use our nonce with the free library: Android tokens have none, and on iOS the library adds its own that the app never sees. The server therefore checks a Google nonce only when the app sends one, and these tokens rely on signature, audience and expiry.
    - Before release: add Google Android clients for the upload key and Play signing key, as the current one only matches the debug SHA-1. Build Apple token revocation on account deletion, which needs a Sign In with Apple `.p8` key on the server. Consider Apple's server-to-server notifications, as no endpoint exists yet.
    - **RevenueCat pods on iOS:** `react-native-purchases` 11.x needs `PurchasesHybridCommon` versions that aren't on CocoaPods trunk because of a freeze from November 1 to 7, 2026. The iPhone build used a local edit to the git-ignored `ios/Podfile`, pointing `RevenueCat` 5.101.0 and `PurchasesHybridCommon` 20.4.0 at their GitHub podspecs, and `prebuild --clean` will lose it. Store builds need the published pods or a move back to 10.x, which RevenueCat advises for Expo. Trunk goes read-only on December 2, 2026.
    - Check on iOS, and check real mail delivery and spam filtering.
    - Downloading, so a second device or the web app can see a coach's exercises.
    - Review the Swedish and Finnish account texts and the code emails.
4. **RevenueCat and paywall.** The tactics board stays free. Christian needs to create the products in App Store Connect and Google Play Console. Include Restore Purchases.

Later:
- Sharing exercises by link, once they're in the database.
- Multi-step drills using `frames`.

## Found during device checks, not fixed

- **Screen readers on the board:** tools, buttons and labellable players are now announced as buttons, with translated tool names. Placing and dragging markers still needs touches on the court, so a screen reader user can't build a diagram. Nothing has been tried with VoiceOver or TalkBack themselves, only the accessibility tree.
- **Arrow ends over cones:** an arrow end now takes the touch over a cone beneath it, so that cone is only draggable from around the end's touch area. The curve dot does the same.
- **Overlapping markers:** where touch areas overlap, the marker placed last takes the drag, even if you touch the centre of the one beneath it.

## Open decisions for Christian

- **Saving tactics:** should saved plain tactics be free? I suggested a few for free.
- **Exercise library:** whether to offer a shared or curated one. I suggested curated first, since publishing by coaches needs moderation.
- **Difficulty scale:** currently 1–5. Three levels might rate more consistently if a shared library comes soon.
- **Deleting others' exercises:** blocked for now, which Christian didn't explicitly ask for. It needs rethinking with link sharing, so people can remove a shared copy.
- **Translations:** Swedish and Finnish strings need review, Finnish especially.

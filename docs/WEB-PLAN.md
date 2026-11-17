# Web version plan

Status: planning. Infrastructure (domain, hosting) comes first.

## Approach

Build the web version from this codebase with Expo's web output (`react-native-web`, `app.json` already has
`"web": { "output": "static" }`). No separate web app and no shared library for now.

- The exercise designer is the main reason to use the web version and the hardest part to build. A separate
  app would mean building it twice and keeping both in step with every new sport, marker and arrow type.
- Logic is already kept apart from the screens: `utils/` holds plain functions, and `createAuthSession` and
  `createPlanService` take `fetch` and storage as parameters. If a second app is ever needed, moving
  `types/`, `utils/` and `services/` into a `packages/core` folder is a mechanical change.
- Only consider a separate app (e.g. Next.js) for a marketing/SEO site or a desktop editor that the mobile
  components would hold back.

## Purchases stay in the app

- Coaches buy in the iOS/Android app. The web never sells anything.
- On web, the paywall shows "Get CoachMate on the App Store / Google Play" instead of prices.
- The server already knows each coach's plan (RevenueCat per `user_id`, `backend/coachmate_api/plans.py`), so
  a coach who paid in the app and signs in on web gets access.
- Apple restricts links from the app to buying on the web. A website pointing people to the app is fine.

## Findings from running it on web (2026-11-17)

`npx expo export -p web` builds (4.4 MB bundle, 24 routes). In headless Chrome at 1440 px and 390 px every
tab loads with no runtime errors; the console shows only deprecation warnings (`shadow*` style props and the
`pointerEvents` prop).

Works:
- Dragging markers with the mouse (gesture-handler and reanimated behave on web).
- Email-code sign-in on the Exercises tab. Apple and Google are hidden because `signInProvidersFor('web')`
  returns `[]`.
- The board scales to phone width.

Broken or missing:
1. **You can't add markers with a mouse.** The pitch only listens for `onTouchStart`
   (`components/TacticsBoard.tsx:412`), and a mouse doesn't send touch events. Use `onPressIn` or a pointer
   event instead.
2. **Confirmation dialogs don't work.** `Alert.alert` does nothing on react-native-web, and it's used 24 times
   across 12 files (deleting a marker, clear all, team actions, exercise editor). Add one `confirm()` helper with
   a web version.
3. **Paywall on web.** With no RevenueCat key, `services/plans.ts` uses the store with nothing to sell, whose
   `getPlan()` throws. Web needs its own plan store that reads the plan from the server and shows "Get the app".
4. **Desktop layout.** The pitch sits in a narrow column with empty grey areas on both sides, the bottom tab
   bar stretches across the whole screen, and Settings rows run full width. Needs a sidebar and a larger board
   above a width breakpoint. Mock it up in Claude Design first.
5. **Not yet checked:** file import and export (`expo-sharing`, document picker, file system), haptics, and
   drawing or bending arrows with a mouse.

## Same account on phone and web

The backend already links logins by the provider's stable user ID:
- `user_identities` stores one row per `(provider, subject)` pointing at a `user_id`
  (`backend/migrations/003_accounts.sql`).
- A new login with a verified email joins the account that already has that address
  (`backend/coachmate_api/accounts.py`, `provider_sign_in`).
- The server accepts a list of client IDs per provider (`GOOGLE_CLIENT_IDS`, `APPLE_CLIENT_IDS`) and can
  return the session as a cookie (`body.session == 'cookie'`).

**Google:** use Google Identity Services ("Sign in with Google" for web) with a Web OAuth client in the same
Google Cloud project. Google's `sub` is the same for a person across every client, so phone and web logins find
the same `user_identities` row. Add the web client ID to `GOOGLE_CLIENT_IDS`.

**Apple:** create a Services ID (e.g. `com.lindehammar-konsult.coachmate.web`) under team 4H4Q7SQF95, verify
the web domain and add the return URL. Use Sign in with Apple JS with `usePopup: true`; it returns an
`id_token` plus nonce, the same payload the app sends to `/auth/provider`. Apple's `sub` is the same for every
app and Services ID under one team, so it matches even with Hide My Email. Add the Services ID to
`APPLE_CLIENT_IDS`. Check that `_apple_refresh_token` sends the token's own client ID (the Services ID) when it
exchanges the code, or revoking the account on deletion will fail for web logins.

**The gap: Hide My Email.** A coach who signed up on the phone with Apple and Hide My Email, and then uses
email-code login on web with their real address, gets a second, empty account. Handle it by:
1. Offering the same buttons on web as on the phone (Apple, Google, email).
2. A hint on the web sign-in screen: "Already using the app? Sign in the same way you do there."
3. Later, only if support requests show people getting stuck: sign in by scanning a QR code with the phone. The
   signed-in app approves it and the server issues a web session for that `user_id`.

Don't build manual account merging; exercises, teams and RevenueCat purchases make it complicated.

## Scope of v1

- Exercises: library and designer. Exercises already sync through the server.
- Teams are stored only on the device (AsyncStorage, which is localStorage on web), so phone teams won't
  appear on web. Leave teams out of v1, or make them sync first.
- Open question: can paying coaches use the full designer on web, or is it browse and print only at first?

## Order of work

Infrastructure:
1. Pick the domain. Prefer the same site as the API so the session cookie and CORS settings stay simple.
2. Host the static export (`npx expo export -p web`) on the Inleed server.
3. Create the Google Web OAuth client and the Apple Services ID, and verify the domain.
4. Add both to the server's environment variables in `~/.cl.selector` (not `.htaccess`).

App:
1. Fix the touch-only handler on the pitch and add the web `confirm()` helper.
2. Add the server-backed plan store and the "Get the app" paywall for web.
3. Add web sign-in providers so `signInProvidersFor('web')` returns `[apple, google]`.
4. Test: sign in on the phone with Apple using Hide My Email, then on web with Apple, and check that `/me`
   returns the same `userId`.
5. Desktop layout (sidebar, larger board), after a design pass.
6. Optional: public library drill pages with a "design your own in the app" button, following the pattern of
   `backend/coachmate_api/join_page.py`.

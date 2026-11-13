# CoachMate API

Flask service that stores exercises in MariaDB. It runs on Phusion Passenger at
`https://lindehammar-konsult.se/coachmate/api`. The address may change, so nothing here depends on it.

## Endpoints

| Endpoint | Token | Description |
|---|---|---|
| `GET /health` | No | 200 if the database answers, otherwise 503 |
| `POST /auth/email/start` | No | Emails a 6-digit code. Takes `email` and optional `locale` (`en`, `sv`, `fi`) |
| `POST /auth/email/verify` | No | Takes `email` and `code`. Returns `userId`, `email` and `token`, once |
| `POST /auth/provider` | No | Takes `provider` (`apple` or `google`), `idToken` and `nonce`, and for Apple the sign-in's `authorizationCode`, kept so deleting the account can revoke it. Answers like verify |
| `POST /auth/sign-out` | Yes | Ends this session only |
| `GET /me` | Yes | Returns `userId`, `email`, `displayName` and `plan` (`active`, `expiresAt`) |
| `PUT /me/display-name` | Yes | Takes `displayName`, up to 40 characters, or `null` to clear it. Shown as the author of public exercises |
| `POST /me/plan/refresh` | Yes | Asks RevenueCat for the coach's plan again and returns it. Limited to 30 an hour |
| `POST /webhooks/revenuecat` | Webhook secret | RevenueCat says a plan changed, and the server asks it for the current state. Answers 503 so it retries if RevenueCat can't be reached |
| `DELETE /me` | Yes | Permanently deletes the account and its exercises, and revokes its Apple sign-in at Apple |
| `GET /exercises` | Yes | Lists your own exercises, leaving out deleted ones |
| `PUT /exercises/<id>` | Yes | Creates or replaces an exercise. Only its owner can change it |
| `GET /exercises/<id>` | Yes | Fetches an exercise. Any valid token can read by ID, for share links, unless reports have hidden it. Its author always can |
| `GET /library` | Yes, no plan needed | Lists public exercises from every coach, with `authorName` on each. Leaves out hidden ones, those you reported and those by coaches you blocked |
| `GET /favorites` | Yes, no plan needed | The exercises you saved, in every language, filtered like the library. Leaves out deleted and hidden ones, those you reported and those by coaches you blocked |
| `GET /exercises/<id>/favorite` | Yes | `favoriteCount`, how many coaches saved it, and `favorited`, whether you did. Its author can ask too |
| `PUT /exercises/<id>/favorite`, `DELETE /exercises/<id>/favorite` | Yes, no plan needed | Saves or unsaves it for you, and answers like the above. You can't save your own. Saving twice changes nothing, and unsaving works even once it's gone |
| `POST /exercises/<id>/report` | Yes | Takes an optional `reason`, up to 1000 characters. Hides it from you at once, and from everyone after 3 coaches report it. The first report emails `MODERATOR_EMAIL` |
| `POST /users/<id>/block`, `DELETE /users/<id>/block` | Yes | Blocks or unblocks a coach, by the `ownerId` on their exercises |

Apps send the token as `Authorization: Bearer <token>`. The web app adds `"session": "cookie"` when
signing in and gets an HttpOnly cookie instead of a token, and every change it makes must carry the
header `X-CoachMate-Client: web`. It must be served from the same origin as the API, because the API
allows no cross-origin requests. Errors look like `{"error": "code"}`, using the
same codes as `parseExercise` in `types/exercise.ts`, plus `unauthorized`, `exerciseNotOwned`,
`notFound`, `tooLarge`, `invalidFilter`, `invalidDisplayName`, `invalidReason`, `ownExercise`, `ownAccount`, `invalidEmail`, `invalidCode`, `invalidProviderToken`,
`rateLimited` and `serviceUnavailable`.

### Shared teams

Coaches with an account can plan a team together. The owner shares it and sends invite links. Everyone
who joins can edit; only the owner invites, removes coaches or stops sharing. No plan is needed.

| Endpoint | Description |
|---|---|
| `POST /teams` | Takes the new team's `id`, a UUID the app makes. 201, or 200 if you already own it |
| `GET /teams` | Your shared teams: `id`, `role` (`owner` or `editor`), `name`, `sport`, `revision` |
| `POST /teams/<id>/sync` | Takes `since` (the last revision you have) and `changes`, and returns `revision`, `role` and every item changed after `since` |
| `DELETE /teams/<id>` | Owner only. Stops sharing for everyone; every coach keeps their copy in the app |
| `GET /teams/<id>/members` | `userId`, `role`, `displayName` and `isYou` for each coach, owner first |
| `DELETE /teams/<id>/members/<userId>` | The owner removes a coach, or a coach removes themselves to leave |
| `POST /teams/<id>/invites` | Owner only. Returns a 10-character `code` that lasts 7 days and can be used by any number of coaches |
| `DELETE /teams/<id>/invites` | Owner only. Stops every invite link for the team |
| `GET /invites/<code>` | Who and what the invite is for: `teamId`, `name`, `sport`, `ownerName`, `memberCount`, and your `role` if you're already in |
| `POST /invites/<code>/accept` | Joins as an editor. Returns `teamId` and `role` |
| `GET /join/<code>` | No token. The web page an invite link opens, in English, Swedish or Finnish: a button to the app, store links for coaches without it (`APP_STORE_URL`, `PLAY_STORE_URL`) and the code to type in |

A team is stored as items, so two coaches editing different players don't overwrite each other: `team/team`
(`name`, `sport`), `player/<id>` (`name`, `position`), `formation/<id>` (`name`) and
`place/<formationId>:<playerId>` (`x`, `y` from 0 to 1). A change with `data: null` deletes the item;
the team item can't be deleted. Each sync gets one new revision, and for the same item the latest
change wins. A `since` ahead of the server's revision gets the whole team. Coaches who aren't in the
team get `notFound`, the same as for a team that doesn't exist. Only a hash of each invite code is stored.
Extra error codes: `invalidId`, `teamExists`, `invalidChange`, `notOwner`, `ownerCannotLeave` and `inviteNotFound`.

### Listing

`GET /exercises` and `GET /library` return `{"exercises": [...], "total": 12}`, where `total` counts
every match, not just this page. `GET /library` and `GET /favorites` also give `authorName`,
`favoriteCount` and `favorited` on each exercise. All of these are optional:

| Parameter | Meaning |
|---|---|
| `sport`, `phase` | Exact match |
| `focus`, `difficulty` | Matches any chosen value; repeat the parameter for more |
| `players` | Fits the exercise's player range. An empty end of the range is open |
| `search` | Title, description and custom tags, ignoring case and accents |
| `sort` | `updated` (default), `title` or `difficulty`, with the latest edit first within a tie |
| `lang` | Library only. The language the exercise was written in, such as `sv`, which also finds `sv-FI` |
| `limit`, `offset` | Page size 1–100 (default 50), and where to start |

Rating filters and sorting wait until ratings are on the server. Titles sort by a language-neutral
alphabet, so Swedish `å`, `ä` and `ö` sort with `a` and `o`, unlike in the app.

### Rate limits

| What | Limit | Counted per |
|---|---|---|
| `POST /auth/email/start` | 5 an hour | Email address |
| `POST /auth/email/start` | 30 an hour | IP address, or IPv6 /64 network |
| `POST /auth/provider` | 60 an hour | IP address, or IPv6 /64 network |
| `PUT /exercises/<id>` | 300 an hour | Coach |
| `POST /exercises/<id>/report` | 20 an hour | Coach |
| `POST /teams/<id>/sync` | 1200 an hour | Coach |
| `GET /invites/<code>`, `POST /invites/<code>/accept` | 30 an hour | Coach |

Going over answers 429 with a `Retry-After` header. Counts are kept in MariaDB because Passenger runs
several processes. Reads aren't limited. Change the numbers in `coachmate_api/rate_limit.py`.

Exercises have `visibility`, `public` or `private`. Apps that don't send it save public ones, and
exercises uploaded before migration 005 became private. Review reports with `scripts/moderate.py`:
`list`, `show <id>`, `restore <id>` to show it again, or `remove <id>` to hide it from everyone but its
author for good.

The server ignores any `ownerId` it's sent. Only a hash of each token is stored, so a lost token
can't be recovered.

## Tests

```bash
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements-dev.txt
./scripts/test_db.sh          # in a second terminal; a throwaway MariaDB on port 33306
.venv/bin/pytest
```

The tests use a real MariaDB, because a fake wouldn't catch collation, JSON or transaction problems.

## Deploying

Needs Python 3.9 or newer and MariaDB 10.4 or newer.

1. Create a database and a user with rights to it only.
2. Copy `backend/` to the server, without `.venv`, and install `requirements.txt` in the app's environment.
3. Copy `.env.example` to `.env`, fill it in and run `chmod 600 .env`.
4. Run `python scripts/migrate.py`. Repeat this on every deploy.
5. Point Passenger at `passenger_wsgi.py`, mounted at `/coachmate/api`.
6. Check that `https://lindehammar-konsult.se/coachmate/api/health` answers `{"status":"ok"}`.
7. Add `scripts/backup_db.sh` to cron.
8. Set `MODERATOR_EMAIL` in `.env` to hear about reported exercises.
9. For Apple sign-in, create a Sign in with Apple key under Keys at developer.apple.com, upload the `.p8` outside the web folder with `chmod 600`, and set the `APPLE_*` settings in `.env`. Without them, deleting an account can't revoke its Apple sign-in, which the App Store requires.

## After deploying, check the limiter sees real addresses

Limits use the address the web server passes on, and ignore `X-Forwarded-For` because anyone can
forge it. If the host puts a proxy or CDN in front of Passenger, every coach would share one address,
and 30 codes an hour would block sign-in for everyone. To check, call `POST /auth/email/start` 31 times
from one network, with a different address you control each time, then once from another network, such
as a phone on mobile data. The second network should get a 202. If it gets a 429, the limiter needs a
trusted-proxy setting.

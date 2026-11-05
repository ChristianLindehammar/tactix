# CoachMate API

Flask service that stores exercises in MariaDB. It runs on Phusion Passenger at
`https://lindehammar-konsult.se/coachmate/api`. The address may change, so nothing here depends on it.

## Endpoints

| Endpoint | Token | Description |
|---|---|---|
| `GET /health` | No | 200 if the database answers, otherwise 503 |
| `POST /auth/email/start` | No | Emails a 6-digit code. Takes `email` and optional `locale` (`en`, `sv`, `fi`) |
| `POST /auth/email/verify` | No | Takes `email` and `code`. Returns `userId`, `email` and `token`, once |
| `POST /auth/provider` | No | Takes `provider` (`apple` or `google`), `idToken` and `nonce`. Answers like verify |
| `POST /auth/sign-out` | Yes | Ends this session only |
| `GET /me` | Yes | Returns `userId` and `email` |
| `DELETE /me` | Yes | Permanently deletes the account and its exercises |
| `GET /exercises` | Yes | Lists your own exercises, leaving out deleted ones |
| `PUT /exercises/<id>` | Yes | Creates or replaces an exercise. Only its owner can change it |
| `GET /exercises/<id>` | Yes | Fetches an exercise. Any valid token can read by ID, for share links |

Apps send the token as `Authorization: Bearer <token>`. The web app adds `"session": "cookie"` when
signing in and gets an HttpOnly cookie instead of a token, and every change it makes must carry the
header `X-CoachMate-Client: web`. It must be served from the same origin as the API, because the API
allows no cross-origin requests. Errors look like `{"error": "code"}`, using the
same codes as `parseExercise` in `types/exercise.ts`, plus `unauthorized`, `exerciseNotOwned`,
`notFound`, `tooLarge`, `invalidFilter`, `invalidEmail`, `invalidCode`, `invalidProviderToken`,
`rateLimited` and `serviceUnavailable`.

### Listing

`GET /exercises` returns `{"exercises": [...], "total": 12}`, where `total` counts every match, not
just this page. All of these are optional:

| Parameter | Meaning |
|---|---|
| `sport`, `phase` | Exact match |
| `focus`, `difficulty` | Matches any chosen value; repeat the parameter for more |
| `players` | Fits the exercise's player range. An empty end of the range is open |
| `search` | Title, description and custom tags, ignoring case and accents |
| `sort` | `updated` (default), `title` or `difficulty`, with the latest edit first within a tie |
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

Going over answers 429 with a `Retry-After` header. Counts are kept in MariaDB because Passenger runs
several processes. Reads aren't limited. Change the numbers in `coachmate_api/rate_limit.py`.

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

## After deploying, check the limiter sees real addresses

Limits use the address the web server passes on, and ignore `X-Forwarded-For` because anyone can
forge it. If the host puts a proxy or CDN in front of Passenger, every coach would share one address,
and 30 codes an hour would block sign-in for everyone. To check, call `POST /auth/email/start` 31 times
from one network, with a different address you control each time, then once from another network, such
as a phone on mobile data. The second network should get a 202. If it gets a 429, the limiter needs a
trusted-proxy setting.

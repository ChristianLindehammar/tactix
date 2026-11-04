# CoachMate API

Flask service that stores exercises in MariaDB. It runs on Phusion Passenger at
`https://lindehammar-konsult.se/coachmate/`. The address may change, so nothing here depends on it.

## Endpoints

| Endpoint | Token | Description |
|---|---|---|
| `GET /health` | No | 200 if the database answers, otherwise 503 |
| `POST /devices` | No | Registers an install. Returns `userId` and `token`, once |
| `PUT /exercises/<id>` | Yes | Creates or replaces an exercise. Only its owner can change it |
| `GET /exercises/<id>` | Yes | Fetches an exercise. Any valid token can read by ID, for share links |

Send the token as `Authorization: Bearer <token>`. Errors look like `{"error": "code"}`, using the
same codes as `parseExercise` in `types/exercise.ts`, plus `unauthorized`, `exerciseNotOwned`,
`notFound`, `tooLarge` and `serviceUnavailable`.

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
5. Point Passenger at `passenger_wsgi.py`, mounted at `/coachmate`.
6. Check that `https://lindehammar-konsult.se/coachmate/health` answers `{"status":"ok"}`.
7. Add `scripts/backup_db.sh` to cron.

## Before real users

`POST /devices` is open and has no rate limit, so anyone could fill the `users` table. Add a limit
before the app ships with this address.

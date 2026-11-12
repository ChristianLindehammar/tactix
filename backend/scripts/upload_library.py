"""Uploads the library's own exercises (content/library-exercises/*.json) as the CoachMate account.

    COACHMATE_API_TOKEN=... .venv/bin/python scripts/upload_library.py [--dry-run] [file ...]

The token is the CoachMate account's session token (POST /auth/email/start, then /auth/email/verify).
API_BASE_URL overrides the live server. Each file is checked with the server's own validation first.
An exercise the server already has with the same content is skipped. A changed one is sent with
updatedAt set to now, so apps see it as newer.
"""
import argparse
import json
import os
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND))
from coachmate_api.validation import ExerciseParseError, parse_exercise  # noqa: E402

CONTENT = BACKEND.parent / 'content' / 'library-exercises'
DEFAULT_API = 'https://lindehammar-konsult.se/coachmate/api'
# Timestamps change on every upload, so they aren't content
IGNORED = ('createdAt', 'updatedAt', 'deletedAt')


def content_of(data):
    parsed = parse_exercise(data)
    # The server keeps focus tags in their own table, so their order isn't kept
    parsed['focus'] = sorted(parsed['focus'])
    return {key: value for key, value in parsed.items() if key not in IGNORED}


def request(method, url, token, body=None):
    data = None if body is None else json.dumps(body, ensure_ascii=False).encode('utf-8')
    req = urllib.request.Request(url, data=data, method=method, headers={
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    })
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            return response.status, json.loads(response.read() or b'null')
    except urllib.error.HTTPError as error:
        try:
            return error.code, json.loads(error.read() or b'null')
        except ValueError:
            return error.code, None


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('files', nargs='*', type=Path, help='defaults to every file in content/library-exercises')
    parser.add_argument('--dry-run', action='store_true', help='validate, and compare with the server if a token is set')
    args = parser.parse_args()

    files = args.files or sorted(CONTENT.glob('*.json'))
    token = os.environ.get('COACHMATE_API_TOKEN')
    api = os.environ.get('API_BASE_URL', DEFAULT_API).rstrip('/')
    if not token and not args.dry_run:
        sys.exit('Set COACHMATE_API_TOKEN to the CoachMate account\'s session token')

    failures = 0
    for path in files:
        name = path.name
        data = json.loads(path.read_text(encoding='utf-8'))
        try:
            local = content_of(data)
        except ExerciseParseError as error:
            print(f'INVALID  {name}: {error}')
            failures += 1
            continue
        if data.get('visibility') != 'public':
            print(f'INVALID  {name}: not public')
            failures += 1
            continue
        if not token:
            print(f'valid    {name}')
            continue

        status, remote = request('GET', f'{api}/exercises/{local["id"]}', token)
        if status == 200 and remote and content_of(remote) == local:
            print(f'same     {name}')
            continue
        if status not in (200, 404):
            print(f'FAILED   {name}: GET answered {status} {remote}')
            failures += 1
            continue
        action = 'update' if status == 200 else 'create'
        if args.dry_run:
            print(f'would {action:6} {name}')
            continue

        body = {**data, 'updatedAt': datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.000Z')}
        status, answer = request('PUT', f'{api}/exercises/{local["id"]}', token, body)
        if status == 200:
            print(f'{action}d  {name}')
        else:
            print(f'FAILED   {name}: PUT answered {status} {answer}')
            failures += 1

    if failures:
        sys.exit(f'{failures} file(s) failed')


if __name__ == '__main__':
    main()

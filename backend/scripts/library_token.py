"""Gets the CoachMate account's session token for upload_library.py and keeps it in a private file.

    .venv/bin/python scripts/library_token.py start <email>   # mails a six-digit code to the account
    .venv/bin/python scripts/library_token.py verify <code>   # exchanges the code for a token and saves it

The token is saved to ~/.config/coachmate/library-token (only you can read it) and is never printed.
upload_library.py reads it from there when COACHMATE_API_TOKEN is not set. API_BASE_URL overrides the live server.
"""
import argparse
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

DEFAULT_API = 'https://lindehammar-konsult.se/coachmate/api'
CONFIG = Path.home() / '.config' / 'coachmate'
TOKEN_FILE = CONFIG / 'library-token'
EMAIL_FILE = CONFIG / 'library-email'


def post(path, body):
    api = os.environ.get('API_BASE_URL', DEFAULT_API).rstrip('/')
    req = urllib.request.Request(f'{api}{path}', data=json.dumps(body).encode('utf-8'), method='POST', headers={
        'Content-Type': 'application/json', 'Accept': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            return response.status, json.loads(response.read() or b'null')
    except urllib.error.HTTPError as error:
        try:
            return error.code, json.loads(error.read() or b'null')
        except ValueError:
            return error.code, None


def write_private(path, text):
    CONFIG.mkdir(parents=True, exist_ok=True)
    os.chmod(CONFIG, 0o700)
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, 'w') as handle:
        handle.write(text)


def start(email):
    status, body = post('/auth/email/start', {'email': email})
    if status != 202:
        sys.exit(f'Could not send a code ({status}): {body}')
    write_private(EMAIL_FILE, email)
    print('Code sent. Run: library_token.py verify <code>')


def verify(code):
    if not EMAIL_FILE.exists():
        sys.exit('Run library_token.py start <email> first')
    email = EMAIL_FILE.read_text().strip()
    status, body = post('/auth/email/verify', {'email': email, 'code': code})
    token = (body or {}).get('token') if status == 200 else None
    if not token:
        sys.exit(f'Could not sign in ({status}): {(body or {}).get("error", body)}')
    write_private(TOKEN_FILE, token)
    print(f'Token saved to {TOKEN_FILE}')


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    commands = parser.add_subparsers(dest='command', required=True)
    commands.add_parser('start', help='mail a sign-in code').add_argument('email')
    commands.add_parser('verify', help='exchange the code for a token').add_argument('code')
    args = parser.parse_args()
    start(args.email) if args.command == 'start' else verify(args.code)


if __name__ == '__main__':
    main()

"""Apple's token endpoints, so deleting an account also removes CoachMate from the coach's Apple ID,
as the App Store requires.

The app sends the one-time authorization code from each Apple sign-in. It's swapped for a refresh
token at once, as it only works for five minutes, and the refresh token is revoked when the account
is deleted. The stored token is encrypted, so a copy of the database alone can't use it."""
import json
import time
import urllib.error
import urllib.parse
import urllib.request

import jwt
from cryptography.fernet import Fernet, InvalidToken

APPLE = 'https://appleid.apple.com'
TOKEN_URL = f'{APPLE}/auth/token'
REVOKE_URL = f'{APPLE}/auth/revoke'
CLIENT_SECRET_SECONDS = 300


class AppleTokensUnavailable(Exception):
    """Apple couldn't be asked, or didn't give what was needed."""


def _post_form(url, form):
    data = urllib.parse.urlencode(form).encode('ascii')
    request_ = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/x-www-form-urlencoded'})
    try:
        with urllib.request.urlopen(request_, timeout=10) as response:
            body = response.read()
    except (urllib.error.URLError, TimeoutError) as error:
        raise AppleTokensUnavailable(str(error)) from error
    # The revoke endpoint answers 200 with an empty body
    try:
        return json.loads(body) if body else {}
    except ValueError as error:
        raise AppleTokensUnavailable('unreadableAnswer') from error


class AppleTokens:
    def __init__(self, team_id, key_id, private_key, seal_key, post=_post_form):
        self._team_id = team_id
        self._key_id = key_id
        self._private_key = private_key
        self._fernet = Fernet(seal_key)
        self._post = post

    def _client_secret(self, client_id):
        now = int(time.time())
        claims = {'iss': self._team_id, 'iat': now, 'exp': now + CLIENT_SECRET_SECONDS, 'aud': APPLE, 'sub': client_id}
        return jwt.encode(claims, self._private_key, algorithm='ES256', headers={'kid': self._key_id})

    def exchange(self, code, client_id):
        """Swaps a sign-in's authorization code for a refresh token, sealed for storing."""
        answer = self._post(TOKEN_URL, {
            'client_id': client_id,
            'client_secret': self._client_secret(client_id),
            'code': code,
            'grant_type': 'authorization_code',
        })
        refresh_token = answer.get('refresh_token') if isinstance(answer, dict) else None
        if not isinstance(refresh_token, str):
            raise AppleTokensUnavailable(answer.get('error') if isinstance(answer, dict) else 'unreadableAnswer')
        # Revoking needs the same client ID the code was issued to, so it's kept with the token
        sealed = json.dumps({'clientId': client_id, 'refreshToken': refresh_token})
        return self._fernet.encrypt(sealed.encode('utf-8')).decode('ascii')

    def revoke(self, sealed):
        try:
            stored = json.loads(self._fernet.decrypt(sealed.encode('ascii')))
        except (InvalidToken, ValueError) as error:
            raise AppleTokensUnavailable('unreadableToken') from error
        client_id = stored['clientId']
        self._post(REVOKE_URL, {
            'client_id': client_id,
            'client_secret': self._client_secret(client_id),
            'token': stored['refreshToken'],
            'token_type_hint': 'refresh_token',
        })

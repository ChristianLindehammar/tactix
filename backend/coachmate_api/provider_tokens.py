"""Checks the signed ID tokens Apple and Google give the app, so the server never has to
trust what the app says about who the coach is."""
import hashlib
import hmac
from collections import namedtuple

import jwt

Identity = namedtuple('Identity', 'subject email')

ISSUERS = {
    'google': ['https://accounts.google.com', 'accounts.google.com'],
    'apple': ['https://appleid.apple.com'],
}
KEY_ADDRESSES = {
    'google': 'https://www.googleapis.com/oauth2/v3/certs',
    'apple': 'https://appleid.apple.com/auth/keys',
}
# Apple's sign-in takes a nonce on every platform. The free Google library can't set one on phones,
# and on iOS it adds its own that the app never sees, so there's nothing to compare with.
NONCE_REQUIRED = {'apple'}


class InvalidProviderToken(Exception):
    pass


class ProviderUnavailable(Exception):
    """We couldn't fetch the provider's keys, which says nothing about the token."""


def _nonce_matches(claimed, raw_nonce):
    if not isinstance(claimed, str) or not isinstance(raw_nonce, str):
        return False
    return hmac.compare_digest(claimed, hashlib.sha256(raw_nonce.encode('utf-8')).hexdigest())


def _verified_email(claims):
    # Apple sends this as the string 'true'
    if claims.get('email_verified') not in (True, 'true'):
        return None
    email = claims.get('email')
    return email.strip().lower() if isinstance(email, str) and email.strip() else None


class ProviderTokenVerifier:
    def __init__(self, audiences, signing_key):
        self._audiences = audiences
        self._signing_key = signing_key

    def verify(self, provider, token, raw_nonce):
        audiences = self._audiences.get(provider)
        if not audiences:
            raise InvalidProviderToken('unknownProvider')
        try:
            claims = jwt.decode(
                token,
                self._signing_key(provider, token),
                algorithms=['RS256'],
                audience=audiences,
                issuer=ISSUERS[provider],
                options={'require': ['exp', 'iss', 'aud', 'sub']},
            )
        except jwt.PyJWKClientConnectionError as error:
            raise ProviderUnavailable(provider) from error
        except jwt.PyJWTError as error:
            raise InvalidProviderToken(type(error).__name__) from error

        if provider in NONCE_REQUIRED or raw_nonce is not None:
            if not _nonce_matches(claims.get('nonce'), raw_nonce):
                raise InvalidProviderToken('nonceMismatch')
        return Identity(claims['sub'], _verified_email(claims))


def real_signing_keys():
    """Fetches each provider's public keys when needed and caches them."""
    clients = {provider: jwt.PyJWKClient(url, timeout=10) for provider, url in KEY_ADDRESSES.items()}

    def signing_key(provider, token):
        return clients[provider].get_signing_key_from_jwt(token).key

    return signing_key

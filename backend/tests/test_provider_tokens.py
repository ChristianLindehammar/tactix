import hashlib
import time

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa

from coachmate_api.provider_tokens import InvalidProviderToken, ProviderTokenVerifier, ProviderUnavailable

PRIVATE_KEY = rsa.generate_private_key(public_exponent=65537, key_size=2048)
GOOGLE_ISSUER = 'https://accounts.google.com'
APPLE_ISSUER = 'https://appleid.apple.com'
RAW_NONCE = 'raw-nonce-from-the-app'
HASHED_NONCE = hashlib.sha256(RAW_NONCE.encode()).hexdigest()


def sign(key=PRIVATE_KEY, **claims):
    payload = {
        'iss': GOOGLE_ISSUER,
        'aud': 'google-client',
        'sub': 'subject-1',
        'email': 'Coach@Example.com',
        'email_verified': True,
        'exp': int(time.time()) + 600,
        **claims,
    }
    return jwt.encode({k: v for k, v in payload.items() if v is not None}, key, algorithm='RS256', headers={'kid': 'k1'})


@pytest.fixture()
def verifier():
    return ProviderTokenVerifier(
        audiences={'google': ['google-client'], 'apple': ['com.example.app']},
        signing_key=lambda _provider, _token: PRIVATE_KEY.public_key(),
    )


def test_a_valid_google_token_gives_the_coachs_identity(verifier):
    identity = verifier.verify('google', sign(), None)

    assert identity.subject == 'subject-1'
    assert identity.email == 'coach@example.com'


@pytest.mark.parametrize(
    'name, token',
    [
        ('expired', lambda: sign(exp=int(time.time()) - 600)),
        ('for another app', lambda: sign(aud='someone-elses-client')),
        ('from another issuer', lambda: sign(iss='https://evil.example.com')),
        ('signed with another key', lambda: sign(key=rsa.generate_private_key(public_exponent=65537, key_size=2048))),
        ('without a subject', lambda: sign(sub=None)),
        ('unsigned', lambda: jwt.encode({'iss': GOOGLE_ISSUER, 'aud': 'google-client', 'sub': 's', 'exp': int(time.time()) + 600}, None, algorithm='none')),
        ('signed with a shared secret', lambda: jwt.encode({'iss': GOOGLE_ISSUER, 'aud': 'google-client', 'sub': 's', 'exp': int(time.time()) + 600}, 'x' * 32, algorithm='HS256')),
        ('not a token', lambda: 'garbage'),
    ],
)
def test_a_token_that_should_not_be_trusted_is_refused(verifier, name, token):
    with pytest.raises(InvalidProviderToken):
        verifier.verify('google', token(), None)


def test_a_google_token_is_not_accepted_as_apple(verifier):
    with pytest.raises(InvalidProviderToken):
        verifier.verify('apple', sign(aud='com.example.app'), RAW_NONCE)


def test_an_unknown_provider_is_refused(verifier):
    with pytest.raises(InvalidProviderToken):
        verifier.verify('facebook', sign(), None)


def apple_token(**claims):
    return sign(iss=APPLE_ISSUER, aud='com.example.app', nonce=HASHED_NONCE, **claims)


def test_a_token_is_bound_to_the_nonce_the_app_made(verifier):
    assert verifier.verify('apple', apple_token(), RAW_NONCE).subject == 'subject-1'


@pytest.mark.parametrize('nonce', ['another-nonce', None])
def test_a_replayed_apple_token_without_the_right_nonce_is_refused(verifier, nonce):
    with pytest.raises(InvalidProviderToken):
        verifier.verify('apple', apple_token(), nonce)


def test_an_apple_token_with_no_nonce_is_refused(verifier):
    with pytest.raises(InvalidProviderToken):
        verifier.verify('apple', sign(iss=APPLE_ISSUER, aud='com.example.app'), RAW_NONCE)


def test_a_google_token_with_a_nonce_must_match_it(verifier):
    with pytest.raises(InvalidProviderToken):
        verifier.verify('google', sign(nonce=HASHED_NONCE), 'another-nonce')


def test_a_google_token_without_a_nonce_is_accepted(verifier):
    # The free Google sign-in library can't set one on phones
    assert verifier.verify('google', sign(), None).subject == 'subject-1'


def test_a_google_token_with_a_nonce_the_app_never_saw_is_accepted(verifier):
    # Google's iOS library makes its own nonce and doesn't tell the app what it is
    assert verifier.verify('google', sign(nonce='made-by-the-google-library'), None).subject == 'subject-1'


def test_apple_marks_a_verified_email_with_a_string(verifier):
    assert verifier.verify('apple', apple_token(email_verified='true'), RAW_NONCE).email == 'coach@example.com'


@pytest.mark.parametrize('value', [False, 'false', None])
def test_an_unverified_email_is_not_used(verifier, value):
    assert verifier.verify('google', sign(email_verified=value), None).email is None


def test_failing_to_reach_the_provider_is_not_a_bad_token():
    def unreachable(_provider, _token):
        raise jwt.PyJWKClientConnectionError('down')

    verifier = ProviderTokenVerifier(audiences={'google': ['google-client']}, signing_key=unreachable)

    with pytest.raises(ProviderUnavailable):
        verifier.verify('google', sign(), None)


def test_an_identity_names_the_app_its_token_was_issued_to(verifier):
    """Apple needs the same client ID again to swap the sign-in's code for a refresh token."""
    token = sign(iss=APPLE_ISSUER, aud='com.example.app', nonce=HASHED_NONCE)

    assert verifier.verify('apple', token, RAW_NONCE).audience == 'com.example.app'

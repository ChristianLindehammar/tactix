import time
import urllib.parse

import jwt
import pytest
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec

from coachmate_api.apple_tokens import AppleTokens, AppleTokensUnavailable

PRIVATE_KEY = ec.generate_private_key(ec.SECP256R1())
PRIVATE_KEY_PEM = PRIVATE_KEY.private_bytes(
    serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()
).decode()


class FakeApple:
    """Records the forms posted to Apple and answers like its token endpoint."""

    def __init__(self, answer=None):
        self.posts = []
        self.answer = answer if answer is not None else {'refresh_token': 'apple-refresh'}

    def __call__(self, url, form):
        self.posts.append((url, form))
        return self.answer


def make_tokens(post):
    return AppleTokens('TEAM123456', 'KEY1234567', PRIVATE_KEY_PEM, Fernet.generate_key().decode(), post=post)


def test_the_client_secret_is_signed_with_the_apple_key():
    apple = FakeApple()
    make_tokens(apple).exchange('code-1', 'com.example.app')

    secret = apple.posts[0][1]['client_secret']
    claims = jwt.decode(secret, PRIVATE_KEY.public_key(), algorithms=['ES256'], audience='https://appleid.apple.com')
    assert jwt.get_unverified_header(secret)['kid'] == 'KEY1234567'
    assert claims['iss'] == 'TEAM123456'
    assert claims['sub'] == 'com.example.app'
    assert claims['iat'] <= time.time() < claims['exp'] <= time.time() + 3600


def test_a_code_is_exchanged_and_the_token_revoked_for_the_same_app():
    apple = FakeApple()
    tokens = make_tokens(apple)

    sealed = tokens.exchange('code-1', 'com.example.app')
    tokens.revoke(sealed)

    (token_url, exchange), (revoke_url, revoke) = apple.posts
    assert token_url == 'https://appleid.apple.com/auth/token'
    assert {k: exchange[k] for k in ('client_id', 'code', 'grant_type')} == {
        'client_id': 'com.example.app', 'code': 'code-1', 'grant_type': 'authorization_code'}
    assert revoke_url == 'https://appleid.apple.com/auth/revoke'
    assert {k: revoke[k] for k in ('client_id', 'token', 'token_type_hint')} == {
        'client_id': 'com.example.app', 'token': 'apple-refresh', 'token_type_hint': 'refresh_token'}


def test_the_stored_token_cannot_be_read_without_the_key():
    sealed = make_tokens(FakeApple()).exchange('code-1', 'com.example.app')

    assert 'apple-refresh' not in sealed
    assert 'com.example.app' not in sealed


def test_an_answer_without_a_refresh_token_is_an_outage():
    with pytest.raises(AppleTokensUnavailable):
        make_tokens(FakeApple(answer={'error': 'invalid_grant'})).exchange('code-1', 'com.example.app')


def test_a_token_sealed_with_another_key_is_refused():
    sealed = make_tokens(FakeApple()).exchange('code-1', 'com.example.app')

    with pytest.raises(AppleTokensUnavailable):
        make_tokens(FakeApple()).revoke(sealed)

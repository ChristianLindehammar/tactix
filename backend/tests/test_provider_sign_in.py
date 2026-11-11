import pytest

from coachmate_api import create_app
from coachmate_api.provider_tokens import Identity, InvalidProviderToken, ProviderUnavailable
from tests.test_email_sign_in import Outbox, request_code, verify


class FakeVerifier:
    """Accepts tokens named in `identities`, so these tests are about accounts, not signatures."""

    def __init__(self):
        self.identities = {}
        self.calls = []

    def verify(self, provider, token, raw_nonce):
        self.calls.append((provider, token, raw_nonce))
        if token == 'provider-is-down':
            raise ProviderUnavailable(provider)
        if token not in self.identities:
            raise InvalidProviderToken('unknown')
        return self.identities[token]


@pytest.fixture()
def verifier():
    return FakeVerifier()


@pytest.fixture()
def outbox():
    return Outbox()


@pytest.fixture()
def api(db_config, verifier, outbox):
    return create_app(db_config, sign_in_code_key='test-key', send_sign_in_code=outbox, provider_verifier=verifier).test_client()


def sign_in(api, token='token', provider='google', **extra):
    return api.post('/auth/provider', json={'provider': provider, 'idToken': token, 'nonce': 'n', **extra})


def test_the_first_sign_in_creates_an_account(api, verifier):
    verifier.identities['token'] = Identity('sub-1', 'coach@example.com')

    response = sign_in(api)

    assert response.status_code == 200
    me = api.get('/me', headers={'Authorization': f"Bearer {response.get_json()['token']}"})
    assert me.get_json() == {
        'userId': response.get_json()['userId'],
        'email': 'coach@example.com',
        'displayName': None,
        'plan': {'active': False, 'expiresAt': None},
    }
    assert verifier.calls == [('google', 'token', 'n')]


def test_signing_in_again_reaches_the_same_account(api, verifier):
    verifier.identities['token'] = Identity('sub-1', 'coach@example.com')

    assert sign_in(api).get_json()['userId'] == sign_in(api).get_json()['userId']


def test_a_changed_email_at_the_provider_keeps_the_account(api, verifier):
    verifier.identities['before'] = Identity('sub-1', 'old@example.com')
    verifier.identities['after'] = Identity('sub-1', 'new@example.com')

    assert sign_in(api, 'before').get_json()['userId'] == sign_in(api, 'after').get_json()['userId']


def test_a_verified_email_joins_an_account_made_with_an_email_code(api, verifier, outbox):
    request_code(api)
    by_code = verify(api, outbox.last_code).get_json()
    verifier.identities['token'] = Identity('sub-1', 'coach@example.com')

    assert sign_in(api).get_json()['userId'] == by_code['userId']


def test_apple_and_google_with_one_email_share_an_account(api, verifier):
    verifier.identities['g'] = Identity('google-sub', 'coach@example.com')
    verifier.identities['a'] = Identity('apple-sub', 'coach@example.com')

    assert sign_in(api, 'g').get_json()['userId'] == sign_in(api, 'a', provider='apple').get_json()['userId']


def test_the_same_subject_at_two_providers_is_two_coaches(api, verifier):
    verifier.identities['g'] = Identity('same-sub', None)
    verifier.identities['a'] = Identity('same-sub', None)

    assert sign_in(api, 'g').get_json()['userId'] != sign_in(api, 'a', provider='apple').get_json()['userId']


def test_a_coach_without_a_shared_email_gets_an_account(api, verifier):
    verifier.identities['token'] = Identity('sub-1', None)

    assert sign_in(api).get_json()['email'] is None
    assert sign_in(api).status_code == 200


def test_a_refused_token_creates_nothing(api, rows):
    response = sign_in(api, 'forged')

    assert response.status_code == 401
    assert response.get_json() == {'error': 'invalidProviderToken'}
    assert rows('SELECT COUNT(*) FROM users') == [(0,)]


@pytest.mark.parametrize('body', [{}, {'provider': 'google'}, {'provider': 5, 'idToken': 'x'}, {'provider': 'google', 'idToken': 5}])
def test_a_malformed_request_is_refused(api, body):
    assert api.post('/auth/provider', json=body).status_code == 401


def test_a_provider_outage_is_shown_as_an_outage(api):
    assert sign_in(api, 'provider-is-down').status_code == 503


def test_a_server_without_a_verifier_reports_an_outage(db_config):
    assert sign_in(create_app(db_config).test_client()).status_code == 503


def test_the_web_app_gets_a_cookie(api, verifier):
    verifier.identities['token'] = Identity('sub-1', 'coach@example.com')

    response = sign_in(api, session='cookie')

    assert 'token' not in response.get_json()
    assert 'HttpOnly' in response.headers['Set-Cookie']
    assert api.get('/me').status_code == 200


def test_deleting_the_account_removes_the_provider_link(api, verifier, rows):
    verifier.identities['token'] = Identity('sub-1', 'coach@example.com')
    token = sign_in(api).get_json()['token']

    api.delete('/me', headers={'Authorization': f'Bearer {token}'})

    assert rows('SELECT COUNT(*) FROM user_identities') == [(0,)]


def test_repeated_sign_ins_from_one_address_are_limited(db_config, verifier):
    from coachmate_api.rate_limit import DEFAULT_LIMITS

    verifier.identities['token'] = Identity('sub-1', None)
    limits = {**DEFAULT_LIMITS, 'providerSignIns': (2, 3600)}
    api = create_app(db_config, limits=limits, provider_verifier=verifier).test_client()

    assert [sign_in(api).status_code for _ in range(3)] == [200, 200, 429]


class FakeAppleTokens:
    """Stands in for Apple's token endpoints. A code becomes a token named after it."""

    def __init__(self):
        self.exchanged = []
        self.revoked = []
        self.failing = False

    def exchange(self, code, client_id):
        self.exchanged.append((code, client_id))
        if self.failing:
            raise RuntimeError('Apple is down')
        return f'refresh-for-{code}'

    def revoke(self, refresh_token):
        self.revoked.append(refresh_token)
        if self.failing:
            raise RuntimeError('Apple is down')


@pytest.fixture()
def apple_tokens():
    return FakeAppleTokens()


@pytest.fixture()
def apple_api(db_config, verifier, apple_tokens):
    verifier.identities['apple-token'] = Identity('apple-sub', 'coach@example.com', 'com.example.app')
    return create_app(db_config, provider_verifier=verifier, apple_tokens=apple_tokens).test_client()


def sign_in_with_apple(api, **extra):
    return sign_in(api, 'apple-token', provider='apple', **extra)


def delete_account(api, response):
    return api.delete('/me', headers={'Authorization': f"Bearer {response.get_json()['token']}"})


def test_deleting_an_apple_account_revokes_the_sign_in_at_apple(apple_api, apple_tokens):
    response = sign_in_with_apple(apple_api, authorizationCode='code-1')

    assert delete_account(apple_api, response).status_code == 204
    assert apple_tokens.exchanged == [('code-1', 'com.example.app')]
    assert apple_tokens.revoked == ['refresh-for-code-1']


def test_the_latest_apple_sign_in_is_the_one_revoked(apple_api, apple_tokens):
    sign_in_with_apple(apple_api, authorizationCode='code-1')
    response = sign_in_with_apple(apple_api, authorizationCode='code-2')

    delete_account(apple_api, response)

    assert apple_tokens.revoked == ['refresh-for-code-2']


def test_signing_in_without_a_code_keeps_the_stored_apple_token(apple_api, apple_tokens):
    sign_in_with_apple(apple_api, authorizationCode='code-1')
    response = sign_in_with_apple(apple_api)

    delete_account(apple_api, response)

    assert apple_tokens.revoked == ['refresh-for-code-1']


def test_the_apple_token_is_not_stored_readably(apple_api, rows):
    sign_in_with_apple(apple_api, authorizationCode='code-1')

    # The fake returns what the real adapter would have sealed, so this only checks where it goes
    assert rows("SELECT refresh_token FROM user_identities WHERE provider = 'apple'") == [('refresh-for-code-1',)]


def test_apple_being_down_does_not_stop_signing_in_or_deleting(apple_api, apple_tokens, rows):
    apple_tokens.failing = True

    response = sign_in_with_apple(apple_api, authorizationCode='code-1')
    assert response.status_code == 200
    assert rows("SELECT refresh_token FROM user_identities WHERE provider = 'apple'") == [(None,)]

    apple_tokens.failing = False
    sign_in_with_apple(apple_api, authorizationCode='code-2')
    apple_tokens.failing = True
    assert delete_account(apple_api, response).status_code == 204
    assert rows('SELECT COUNT(*) FROM users') == [(0,)]


def test_only_apple_codes_are_exchanged(apple_api, apple_tokens, verifier):
    verifier.identities['token'] = Identity('google-sub', 'other@example.com', 'google-client')

    response = sign_in(apple_api, authorizationCode='code-1')
    delete_account(apple_api, response)

    assert apple_tokens.exchanged == []
    assert apple_tokens.revoked == []


@pytest.mark.parametrize('code', [5, '', 'x' * 2001])
def test_a_malformed_apple_code_is_ignored(apple_api, apple_tokens, code):
    assert sign_in_with_apple(apple_api, authorizationCode=code).status_code == 200
    assert apple_tokens.exchanged == []


def test_a_server_without_apple_keys_still_signs_in_and_deletes(db_config, verifier):
    verifier.identities['apple-token'] = Identity('apple-sub', 'coach@example.com', 'com.example.app')
    api = create_app(db_config, provider_verifier=verifier).test_client()

    response = sign_in_with_apple(api, authorizationCode='code-1')

    assert response.status_code == 200
    assert delete_account(api, response).status_code == 204

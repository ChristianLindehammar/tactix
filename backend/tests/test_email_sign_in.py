import pytest

from coachmate_api import create_app
from coachmate_api.rate_limit import DEFAULT_LIMITS
from tests.conftest import DB_CONFIG, give_plan
from tests.test_exercises import build_exercise, put


class Clock:
    def __init__(self):
        self.now = 1_800_000_000.0

    def __call__(self):
        return self.now


class Outbox:
    def __init__(self):
        self.sent = []

    def __call__(self, email, code, locale):
        self.sent.append({'email': email, 'code': code, 'locale': locale})

    @property
    def last_code(self):
        return self.sent[-1]['code']


@pytest.fixture()
def outbox():
    return Outbox()


@pytest.fixture()
def api(db_config, outbox):
    return create_app(db_config, send_sign_in_code=outbox).test_client()


def request_code(api, email='coach@example.com', locale='sv'):
    return api.post('/auth/email/start', json={'email': email, 'locale': locale})


def verify(api, code, email='coach@example.com'):
    return api.post('/auth/email/verify', json={'email': email, 'code': code})


def test_a_coach_signs_in_with_the_code_sent_to_their_email(api, outbox):
    assert request_code(api).status_code == 202
    assert outbox.sent[-1]['email'] == 'coach@example.com'
    assert outbox.sent[-1]['locale'] == 'sv'

    signed_in = verify(api, outbox.last_code)

    assert signed_in.status_code == 200
    token = signed_in.get_json()['token']
    me = api.get('/me', headers={'Authorization': f'Bearer {token}'})
    assert me.status_code == 200
    assert me.get_json() == {
        'userId': signed_in.get_json()['userId'],
        'email': 'coach@example.com',
        'plan': {'active': False, 'expiresAt': None},
    }


def test_signing_in_again_reaches_the_same_account(api, outbox):
    request_code(api)
    first = verify(api, outbox.last_code).get_json()

    request_code(api)
    second = verify(api, outbox.last_code).get_json()

    assert second['userId'] == first['userId']
    assert second['token'] != first['token']


def test_email_case_and_spaces_do_not_make_a_second_account(api, outbox):
    request_code(api, email='coach@example.com')
    first = verify(api, outbox.last_code, email='coach@example.com').get_json()

    request_code(api, email='  Coach@Example.COM ')
    assert outbox.sent[-1]['email'] == 'coach@example.com'
    second = verify(api, outbox.last_code, email='COACH@example.com ').get_json()

    assert second['userId'] == first['userId']


def test_a_wrong_code_does_not_sign_in(api, outbox):
    request_code(api)
    wrong = '000000' if outbox.last_code != '000000' else '000001'

    response = verify(api, wrong)

    assert response.status_code == 400
    assert response.get_json() == {'error': 'invalidCode'}


def test_a_code_works_only_once(api, outbox):
    request_code(api)
    code = outbox.last_code
    assert verify(api, code).status_code == 200

    assert verify(api, code).status_code == 400


def test_a_code_stops_working_after_ten_minutes(db_config, outbox):
    clock = Clock()
    api = create_app(db_config, clock=clock, send_sign_in_code=outbox).test_client()
    request_code(api)

    clock.now += 601

    assert verify(api, outbox.last_code).status_code == 400


def test_five_wrong_guesses_use_up_the_code(api, outbox):
    request_code(api)
    code = outbox.last_code
    wrong = '000000' if code != '000000' else '000001'
    for _ in range(5):
        verify(api, wrong)

    assert verify(api, code).status_code == 400


def test_a_new_code_replaces_the_previous_one(api, outbox):
    request_code(api)
    previous = outbox.last_code
    request_code(api)
    while outbox.last_code == previous:  # one in a million
        request_code(api)

    assert verify(api, previous).status_code == 400
    assert verify(api, outbox.last_code).status_code == 200


def test_the_code_itself_is_not_stored(api, outbox, rows):
    request_code(api)

    assert outbox.last_code not in str(rows('SELECT * FROM sign_in_codes'))
    assert 'coach@example.com' not in str(rows('SELECT * FROM sign_in_codes'))


@pytest.mark.parametrize('email', ['', 'no-at-sign', 'a@b', '@example.com', 'a b@example.com', 42, None, 'x' * 250 + '@example.com'])
def test_an_invalid_email_is_refused_and_nothing_is_sent(api, outbox, email):
    response = api.post('/auth/email/start', json={'email': email})

    assert response.status_code == 400
    assert response.get_json() == {'error': 'invalidEmail'}
    assert outbox.sent == []


@pytest.mark.parametrize('body', [{}, {'email': 'coach@example.com'}, {'email': 'coach@example.com', 'code': 123456}, {'email': 5, 'code': '123456'}])
def test_a_malformed_verify_is_refused(api, body):
    assert api.post('/auth/email/verify', json=body).status_code == 400


def test_a_failure_to_send_is_reported_without_leaking_the_code(db_config, caplog):
    def broken(_email, code, _locale):
        raise OSError(f'smtp refused {code}')

    api = create_app(db_config, send_sign_in_code=broken).test_client()

    response = request_code(api)

    assert response.status_code == 503
    assert response.get_json() == {'error': 'serviceUnavailable'}
    assert 'coach@example.com' not in caplog.text


def test_an_address_cannot_request_endless_codes(db_config, outbox):
    limits = {**DEFAULT_LIMITS, 'emailCodes': (2, 3600), 'emailCodesPerAddress': (100, 3600)}
    api = create_app(db_config, limits=limits, send_sign_in_code=outbox).test_client()

    assert request_code(api).status_code == 202
    assert request_code(api).status_code == 202
    assert request_code(api).status_code == 429
    assert len(outbox.sent) == 2


def test_one_network_cannot_mail_many_people_without_limit(db_config, outbox):
    limits = {**DEFAULT_LIMITS, 'emailCodes': (100, 3600), 'emailCodesPerAddress': (2, 3600)}
    api = create_app(db_config, limits=limits, send_sign_in_code=outbox).test_client()

    codes = [request_code(api, email=f'c{n}@example.com').status_code for n in range(3)]

    assert codes == [202, 202, 429]


class TestSession:
    def signed_in(self, api, outbox):
        request_code(api)
        return {'Authorization': f"Bearer {verify(api, outbox.last_code).get_json()['token']}"}

    def test_signing_out_ends_only_that_session(self, api, outbox):
        phone = self.signed_in(api, outbox)
        tablet = self.signed_in(api, outbox)

        assert api.post('/auth/sign-out', headers=phone).status_code == 204

        assert api.get('/me', headers=phone).status_code == 401
        assert api.get('/me', headers=tablet).status_code == 200

    def test_signing_out_needs_a_session(self, api):
        assert api.post('/auth/sign-out').status_code == 401


class TestDeletingAnAccount:
    def signed_in(self, api, outbox, email='coach@example.com'):
        request_code(api, email=email)
        token = verify(api, outbox.last_code, email=email).get_json()['token']
        give_plan(DB_CONFIG, email)
        return {'Authorization': f'Bearer {token}'}

    def test_removes_the_user_their_exercises_and_sessions(self, api, outbox, rows):
        coach = self.signed_in(api, outbox)
        exercise = build_exercise()
        assert put(api, exercise, coach).status_code == 200

        assert api.delete('/me', headers=coach).status_code == 204

        assert api.get('/me', headers=coach).status_code == 401
        assert rows('SELECT COUNT(*) FROM users') == [(0,)]
        assert rows('SELECT COUNT(*) FROM exercises') == [(0,)]
        assert rows('SELECT COUNT(*) FROM exercise_focus') == [(0,)]
        assert rows('SELECT COUNT(*) FROM api_tokens') == [(0,)]

    def test_leaves_other_coaches_alone(self, api, outbox):
        coach = self.signed_in(api, outbox)
        other = self.signed_in(api, outbox, email='other@example.com')
        exercise = build_exercise()
        put(api, exercise, other)

        api.delete('/me', headers=coach)

        assert api.get(f"/exercises/{exercise['id']}", headers=other).status_code == 200

    def test_the_same_email_starts_a_new_empty_account_afterwards(self, api, outbox):
        coach = self.signed_in(api, outbox)
        put(api, build_exercise(), coach)
        api.delete('/me', headers=coach)

        again = self.signed_in(api, outbox)

        assert api.get('/exercises', headers=again).get_json()['total'] == 0

    def test_needs_a_session(self, api):
        assert api.delete('/me').status_code == 401

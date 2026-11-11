from collections import Counter
from concurrent.futures import ThreadPoolExecutor

from coachmate_api import create_app
from coachmate_api.provider_tokens import Identity
from coachmate_api.rate_limit import DEFAULT_LIMITS
from tests.test_exercises import build_exercise


LIMITS = {**DEFAULT_LIMITS, 'emailCodes': (1000, 3600), 'emailCodesPerAddress': (1000, 3600), 'saves': (1000, 3600)}


class Outbox:
    def __init__(self):
        self.codes = {}

    def __call__(self, email, code, _locale):
        self.codes[email] = code


def test_parallel_code_requests_are_counted_exactly(db_config):
    """Passenger runs several processes, so counts must hold across separate connections."""
    limits = {**LIMITS, 'emailCodesPerAddress': (25, 3600)}
    app = create_app(db_config, limits=limits, sign_in_code_key='test-key', send_sign_in_code=Outbox())

    def start(number):
        return app.test_client().post('/auth/email/start', json={'email': f'c{number}@example.com'}).status_code

    with ThreadPoolExecutor(max_workers=10) as pool:
        codes = Counter(pool.map(start, range(60)))

    assert codes == {202: 25, 429: 35}


def test_a_code_used_in_parallel_works_once(db_config):
    outbox = Outbox()
    app = create_app(db_config, limits=LIMITS, sign_in_code_key='test-key', send_sign_in_code=outbox)
    app.test_client().post('/auth/email/start', json={'email': 'coach@example.com'})
    body = {'email': 'coach@example.com', 'code': outbox.codes['coach@example.com']}

    def verify(_):
        return app.test_client().post('/auth/email/verify', json=body).status_code

    with ThreadPoolExecutor(max_workers=4) as pool:
        codes = Counter(pool.map(verify, range(4)))

    assert codes == {200: 1, 400: 3}


def test_parallel_first_sign_ins_share_one_account(db_config, rows):
    class Verifier:
        def verify(self, _provider, token, _nonce):
            return Identity(token, 'coach@example.com')

    app = create_app(db_config, limits={**LIMITS, 'providerSignIns': (1000, 3600)}, provider_verifier=Verifier())

    def sign_in(number):
        body = {'provider': 'google', 'idToken': 'sub', 'nonce': None} if number % 2 else {'provider': 'apple', 'idToken': 'sub', 'nonce': 'n'}
        return app.test_client().post('/auth/provider', json=body).get_json()['userId']

    with ThreadPoolExecutor(max_workers=10) as pool:
        users = set(pool.map(sign_in, range(20)))

    assert len(users) == 1
    assert rows('SELECT COUNT(*) FROM users') == [(1,)]


def test_parallel_saves_of_new_exercises_all_succeed(db_config, register):
    coaches = [register() for _ in range(10)]
    app = create_app(db_config, limits=LIMITS)

    def save(number):
        exercise = build_exercise()
        url = f"/exercises/{exercise['id']}"
        return app.test_client().put(url, json=exercise, headers=coaches[number % 10]).status_code

    with ThreadPoolExecutor(max_workers=10) as pool:
        codes = Counter(pool.map(save, range(100)))

    assert codes == {200: 100}


def test_parallel_saves_of_one_new_exercise_leave_one_owner(db_config, register):
    coaches = [register() for _ in range(10)]
    app = create_app(db_config, limits=LIMITS)
    exercise = build_exercise()
    url = f"/exercises/{exercise['id']}"

    def save(headers):
        return app.test_client().put(url, json=exercise, headers=headers).status_code

    with ThreadPoolExecutor(max_workers=10) as pool:
        codes = Counter(pool.map(save, coaches))

    assert codes == {200: 1, 403: 9}

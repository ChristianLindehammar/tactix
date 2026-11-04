from collections import Counter
from concurrent.futures import ThreadPoolExecutor

from coachmate_api import create_app
from tests.test_exercises import build_exercise


def test_parallel_registrations_are_counted_exactly(db_config):
    """Passenger runs several processes, so counts must hold across separate connections."""
    app = create_app(db_config, limits={'devices': (25, 3600), 'saves': (1, 3600)})

    def register(_):
        return app.test_client().post('/devices').status_code

    with ThreadPoolExecutor(max_workers=10) as pool:
        codes = Counter(pool.map(register, range(60)))

    assert codes == {201: 25, 429: 35}


def _headers(app):
    token = app.test_client().post('/devices').get_json()['token']
    return {'Authorization': f'Bearer {token}'}


def test_parallel_saves_of_new_exercises_all_succeed(db_config):
    app = create_app(db_config, limits={'devices': (50, 3600), 'saves': (1000, 3600)})
    coaches = [_headers(app) for _ in range(10)]

    def save(number):
        exercise = build_exercise()
        url = f"/exercises/{exercise['id']}"
        return app.test_client().put(url, json=exercise, headers=coaches[number % 10]).status_code

    with ThreadPoolExecutor(max_workers=10) as pool:
        codes = Counter(pool.map(save, range(100)))

    assert codes == {200: 100}


def test_parallel_saves_of_one_new_exercise_leave_one_owner(db_config):
    app = create_app(db_config, limits={'devices': (50, 3600), 'saves': (1000, 3600)})
    coaches = [_headers(app) for _ in range(10)]
    exercise = build_exercise()
    url = f"/exercises/{exercise['id']}"

    def save(headers):
        return app.test_client().put(url, json=exercise, headers=headers).status_code

    with ThreadPoolExecutor(max_workers=10) as pool:
        codes = Counter(pool.map(save, coaches))

    assert codes == {200: 1, 403: 9}

import pytest

from coachmate_api import create_app
from coachmate_api.rate_limit import DEFAULT_LIMITS
from tests.test_exercises import build_exercise, get, put


@pytest.fixture()
def author(register):
    return register()


@pytest.fixture()
def exercise(client, author):
    exercise = build_exercise(title='Rondo')
    assert put(client, exercise, author).status_code == 200
    return exercise


def report(client, exercise, headers, reason=None):
    body = {} if reason is None else {'reason': reason}
    return client.post(f"/exercises/{exercise['id']}/report", json=body, headers=headers)


def library_titles(client, headers):
    return [e['title'] for e in client.get('/library', headers=headers).get_json()['exercises']]


class TestReporting:
    def test_needs_an_account(self, client, exercise):
        assert report(client, exercise, {}).status_code == 401

    def test_hides_the_exercise_from_whoever_reported_it(self, client, register, exercise):
        reporter, bystander = register(), register()

        assert report(client, exercise, reporter, reason='Names of children').status_code == 204

        assert library_titles(client, reporter) == []
        assert library_titles(client, bystander) == ['Rondo']

    def test_three_coaches_hide_it_from_everyone(self, client, register, exercise):
        for _ in range(3):
            report(client, exercise, register())
        bystander = register()

        assert library_titles(client, bystander) == []
        assert get(client, exercise, bystander).status_code == 404

    def test_the_author_keeps_a_hidden_exercise(self, client, register, author, exercise):
        for _ in range(3):
            report(client, exercise, register())

        assert get(client, exercise, author).status_code == 200
        assert [e['title'] for e in client.get('/exercises', headers=author).get_json()['exercises']] == ['Rondo']

    def test_the_same_coach_reporting_again_counts_once(self, client, register, exercise):
        reporter = register()
        for _ in range(3):
            report(client, exercise, reporter)

        assert library_titles(client, register()) == ['Rondo']

    def test_cannot_report_your_own(self, client, author, exercise):
        response = report(client, exercise, author)

        assert response.status_code == 400
        assert response.get_json() == {'error': 'ownExercise'}

    def test_reporting_a_missing_exercise_is_not_found(self, client, register):
        assert report(client, build_exercise(), register()).status_code == 404

    def test_rejects_a_reason_that_is_too_long(self, client, register, exercise):
        response = report(client, exercise, register(), reason='x' * 1001)

        assert response.status_code == 400
        assert response.get_json() == {'error': 'invalidReason'}


class TestTellingTheModerator:
    def test_the_first_report_is_passed_on(self, db_config, register, exercise):
        sent = []
        api = create_app(db_config, notify_report=lambda **details: sent.append(details)).test_client()

        report(api, exercise, register(), reason='Names of children')
        report(api, exercise, register())

        assert sent == [{'exerciseId': exercise['id'], 'title': 'Rondo', 'reason': 'Names of children'}]

    def test_a_failing_notice_does_not_fail_the_report(self, db_config, register, exercise):
        def broken(**_details):
            raise OSError('mail server down')

        api = create_app(db_config, notify_report=broken).test_client()

        assert report(api, exercise, register()).status_code == 204


def test_reports_are_rate_limited(db_config, register, client):
    api = create_app(db_config, limits={**DEFAULT_LIMITS, 'reports': (2, 3600)}).test_client()
    reporter = register()
    exercises = [build_exercise() for _ in range(3)]
    author = register()
    for exercise in exercises:
        put(client, exercise, author)

    statuses = [report(api, exercise, reporter).status_code for exercise in exercises]

    assert statuses == [204, 204, 429]

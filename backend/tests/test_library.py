import pytest

from tests.test_exercises import build_exercise, put


@pytest.fixture()
def me(register):
    return register()


@pytest.fixture()
def publish(client, register):
    """Saves an exercise as a new coach, so every call comes from someone else."""

    def _publish(headers=None, **overrides):
        exercise = build_exercise(**overrides)
        assert put(client, exercise, headers or register()).status_code == 200
        return exercise

    return _publish


@pytest.fixture()
def titles(client, me):
    """The titles in the library, in order."""

    def _titles(query='', headers=None):
        response = client.get(f'/library{query}', headers=headers or me)
        assert response.status_code == 200
        return [exercise['title'] for exercise in response.get_json()['exercises']]

    return _titles


class TestWhoCanBrowse:
    def test_needs_an_account(self, client):
        assert client.get('/library').status_code == 401

    def test_does_not_need_a_plan(self, client, register, publish):
        publish(title='Rondo')

        response = client.get('/library', headers=register(paid=False))

        assert response.status_code == 200
        assert [e['title'] for e in response.get_json()['exercises']] == ['Rondo']


class TestWhatIsListed:
    def test_lists_public_exercises_from_every_coach(self, publish, titles, me):
        publish(title='Theirs', updatedAt='2026-11-03T10:00:00.000Z')
        publish(headers=me, title='Mine', updatedAt='2026-11-03T11:00:00.000Z')

        assert titles() == ['Mine', 'Theirs']

    def test_leaves_out_private_exercises(self, publish, titles):
        publish(title='Shared')
        publish(title='Secret', visibility='private')

        assert titles() == ['Shared']

    def test_leaves_out_deleted_exercises(self, publish, titles):
        publish(title='Kept')
        publish(title='Gone', deletedAt='2026-11-04T08:00:00.000Z')

        assert titles() == ['Kept']

    def test_gives_whole_exercises_and_a_total(self, client, me, publish):
        exercise = publish()

        body = client.get('/library', headers=me).get_json()

        assert body['total'] == 1
        assert body['exercises'][0]['frames'] == exercise['frames']


class TestFilters:
    def test_filters_like_your_own_listing(self, publish, titles):
        publish(title='Floorball', sport='floorball')
        publish(title='Soccer', sport='soccer')

        assert titles('?sport=soccer') == ['Soccer']

    def test_filters_by_language(self, publish, titles):
        publish(title='Rondo', locale='en')
        publish(title='Fyrkant', locale='sv')

        assert titles('?lang=sv') == ['Fyrkant']

    def test_rejects_an_unknown_filter_value(self, client, me):
        assert client.get('/library?sport=chess', headers=me).status_code == 400

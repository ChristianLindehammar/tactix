import pytest

from tests.test_exercises import build_exercise, put


@pytest.fixture()
def me(register):
    return register()


@pytest.fixture()
def publish(client, register):
    """Saves an exercise as a new coach, so it's someone else's."""

    def _publish(headers=None, **overrides):
        exercise = build_exercise(**overrides)
        assert put(client, exercise, headers or register()).status_code == 200
        return exercise

    return _publish


def favorite(client, exercise, headers):
    return client.put(f"/exercises/{exercise['id']}/favorite", headers=headers)


def unfavorite(client, exercise, headers):
    return client.delete(f"/exercises/{exercise['id']}/favorite", headers=headers)


def state(client, exercise, headers):
    return client.get(f"/exercises/{exercise['id']}/favorite", headers=headers)


def favorite_titles(client, headers, query=''):
    response = client.get(f'/favorites{query}', headers=headers)
    assert response.status_code == 200
    return [e['title'] for e in response.get_json()['exercises']]


def library_entry(client, headers):
    return client.get('/library', headers=headers).get_json()['exercises'][0]


class TestSaving:
    def test_needs_an_account(self, client, publish):
        exercise = publish()

        assert favorite(client, exercise, {}).status_code == 401
        assert client.get('/favorites').status_code == 401

    def test_does_not_need_a_plan(self, client, register, publish):
        exercise = publish()

        response = favorite(client, exercise, register(paid=False))

        assert response.status_code == 200
        assert response.get_json() == {'favoriteCount': 1, 'favorited': True}

    def test_saving_twice_counts_once(self, client, me, publish):
        exercise = publish()
        favorite(client, exercise, me)

        assert favorite(client, exercise, me).get_json() == {'favoriteCount': 1, 'favorited': True}

    def test_counts_every_coach_who_saved_it(self, client, register, me, publish):
        exercise = publish()
        favorite(client, exercise, register())
        favorite(client, exercise, register())

        assert state(client, exercise, me).get_json() == {'favoriteCount': 2, 'favorited': False}

    def test_removing_takes_it_back(self, client, register, me, publish):
        exercise = publish()
        favorite(client, exercise, register())
        favorite(client, exercise, me)

        response = unfavorite(client, exercise, me)

        assert response.status_code == 200
        assert response.get_json() == {'favoriteCount': 1, 'favorited': False}
        assert favorite_titles(client, me) == []

    def test_removing_one_never_saved_is_harmless(self, client, me, publish):
        exercise = publish()

        assert unfavorite(client, exercise, me).get_json() == {'favoriteCount': 0, 'favorited': False}

    def test_cannot_save_your_own(self, client, me, publish):
        exercise = publish(headers=me)

        response = favorite(client, exercise, me)

        assert response.status_code == 400
        assert response.get_json() == {'error': 'ownExercise'}

    def test_the_author_can_see_how_many_saved_it(self, client, register, me, publish):
        exercise = publish(headers=me)
        favorite(client, exercise, register())

        assert state(client, exercise, me).get_json() == {'favoriteCount': 1, 'favorited': False}

    def test_an_unknown_exercise_is_not_found(self, client, me):
        missing = build_exercise()

        assert favorite(client, missing, me).status_code == 404
        assert state(client, missing, me).status_code == 404

    def test_a_deleted_exercise_cannot_be_saved(self, client, me, publish):
        exercise = publish(deletedAt='2026-11-04T08:00:00.000Z')

        assert favorite(client, exercise, me).status_code == 404

    def test_a_private_exercise_can_be_saved_from_its_link(self, client, me, publish):
        exercise = publish(title='Shared by link', visibility='private')

        assert favorite(client, exercise, me).status_code == 200
        assert favorite_titles(client, me) == ['Shared by link']

    def test_a_hidden_exercise_cannot_be_saved(self, client, register, me, publish):
        exercise = publish()
        for _ in range(3):
            client.post(f"/exercises/{exercise['id']}/report", json={}, headers=register())

        assert favorite(client, exercise, me).status_code == 404

    def test_an_ids_case_does_not_matter(self, client, me, publish):
        exercise = publish()

        client.put(f"/exercises/{exercise['id'].upper()}/favorite", headers=me)

        assert state(client, exercise, me).get_json()['favorited'] is True


class TestListing:
    def test_lists_only_what_you_saved(self, client, register, me, publish):
        mine = publish(title='Saved')
        publish(title='Not saved')
        favorite(client, mine, me)
        favorite(client, publish(title='Saved by someone else'), register())

        assert favorite_titles(client, me) == ['Saved']

    def test_marks_each_with_its_count_and_that_you_saved_it(self, client, register, me, publish):
        exercise = publish()
        favorite(client, exercise, me)
        favorite(client, exercise, register())

        listed = client.get('/favorites', headers=me).get_json()['exercises'][0]

        assert listed['favoriteCount'] == 2
        assert listed['favorited'] is True
        assert 'authorName' in listed

    def test_filters_like_the_library(self, client, me, publish):
        favorite(client, publish(title='Floorball', sport='floorball'), me)
        favorite(client, publish(title='Soccer', sport='soccer'), me)

        assert favorite_titles(client, me, '?sport=soccer') == ['Soccer']
        assert client.get('/favorites?sport=chess', headers=me).status_code == 400

    def test_keeps_every_language(self, client, me, publish):
        favorite(client, publish(title='Svensk', locale='sv'), me)
        favorite(client, publish(title='English', locale='en'), me)

        assert sorted(favorite_titles(client, me)) == ['English', 'Svensk']

    def test_leaves_out_one_deleted_since(self, client, register, me):
        author = register()
        exercise = build_exercise(title='Gone')
        put(client, exercise, author)
        favorite(client, exercise, me)

        put(client, {**exercise, 'deletedAt': '2026-11-04T08:00:00.000Z'}, author)

        assert favorite_titles(client, me) == []

    def test_leaves_out_ones_by_coaches_you_blocked(self, client, register, me):
        author = register()
        exercise = build_exercise(title='Blocked')
        put(client, exercise, author)
        favorite(client, exercise, me)
        owner_id = client.get('/exercises', headers=author).get_json()['exercises'][0]['ownerId']

        client.post(f'/users/{owner_id}/block', headers=me)

        assert favorite_titles(client, me) == []

    def test_leaves_out_ones_you_reported(self, client, me, publish):
        exercise = publish()
        favorite(client, exercise, me)

        client.post(f"/exercises/{exercise['id']}/report", json={}, headers=me)

        assert favorite_titles(client, me) == []


class TestInTheLibrary:
    def test_each_exercise_shows_how_many_saved_it(self, client, register, me, publish):
        exercise = publish()
        favorite(client, exercise, register())
        favorite(client, exercise, register())

        entry = library_entry(client, me)

        assert entry['favoriteCount'] == 2
        assert entry['favorited'] is False

    def test_shows_which_ones_you_saved(self, client, me, publish):
        favorite(client, publish(), me)

        assert library_entry(client, me)['favorited'] is True

    def test_an_exercise_nobody_saved_shows_none(self, client, me, publish):
        publish()

        assert library_entry(client, me)['favoriteCount'] == 0

    def test_your_own_listing_is_unchanged(self, client, me, publish):
        publish(headers=me)

        own = client.get('/exercises', headers=me).get_json()['exercises'][0]

        assert 'favoriteCount' not in own


class TestDeletingAccounts:
    def test_a_coach_who_saved_exercises_can_delete_their_account(self, client, register, publish):
        coach = register()
        favorite(client, publish(), coach)

        assert client.delete('/me', headers=coach).status_code == 204

    def test_deleting_the_author_removes_the_saves(self, client, register, me, rows):
        author = register()
        exercise = build_exercise()
        put(client, exercise, author)
        favorite(client, exercise, me)

        assert client.delete('/me', headers=author).status_code == 204

        assert rows('SELECT COUNT(*) FROM exercise_favorites') == [(0,)]

    def test_deleting_the_coach_who_saved_lowers_the_count(self, client, register, me, publish):
        exercise = publish()
        coach = register()
        favorite(client, exercise, coach)

        client.delete('/me', headers=coach)

        assert state(client, exercise, me).get_json()['favoriteCount'] == 0

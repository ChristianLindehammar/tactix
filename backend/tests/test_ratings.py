import pytest

from tests.test_favorites import publish  # noqa: F401  (fixture)


@pytest.fixture()
def me(register):
    return register()


def rate(client, exercise, headers, stars, updated_at='2026-11-13T10:00:00.000Z'):
    return client.put(
        f"/exercises/{exercise['id']}/rating", json={'stars': stars, 'updatedAt': updated_at}, headers=headers
    )


def my_ratings(client, headers):
    response = client.get('/ratings', headers=headers)
    assert response.status_code == 200
    return response.get_json()['ratings']


class TestRating:
    def test_a_rating_comes_back_from_the_list(self, client, me, publish):
        exercise = publish()

        assert rate(client, exercise, me, 4).status_code == 200

        assert my_ratings(client, me) == [
            {'exerciseId': exercise['id'], 'stars': 4, 'updatedAt': '2026-11-13T10:00:00.000Z'}
        ]

    def test_a_newer_rating_replaces_the_old_one(self, client, me, publish):
        exercise = publish()
        rate(client, exercise, me, 4, '2026-11-13T10:00:00.000Z')

        rate(client, exercise, me, 2, '2026-11-13T11:00:00.000Z')

        assert [r['stars'] for r in my_ratings(client, me)] == [2]

    def test_an_older_rating_arriving_late_is_ignored(self, client, me, publish):
        exercise = publish()
        rate(client, exercise, me, 4, '2026-11-13T10:00:00.000Z')

        response = rate(client, exercise, me, 2, '2026-11-13T09:00:00.000Z')

        assert response.status_code == 200
        assert response.get_json() == {
            'exerciseId': exercise['id'], 'stars': 4, 'updatedAt': '2026-11-13T10:00:00.000Z'
        }
        assert [r['stars'] for r in my_ratings(client, me)] == [4]

    @pytest.mark.parametrize('stars', [0, 6, 2.5, '4', True])
    def test_stars_must_be_one_to_five(self, client, me, publish, stars):
        exercise = publish()

        response = rate(client, exercise, me, stars)

        assert response.status_code == 400
        assert response.get_json() == {'error': 'invalidRating'}
        assert my_ratings(client, me) == []

    @pytest.mark.parametrize('updated_at', [None, 'yesterday', '2026-11-13T10:00:00'])
    def test_needs_a_time_with_a_zone(self, client, me, publish, updated_at):
        exercise = publish()

        response = rate(client, exercise, me, 3, updated_at)

        assert response.status_code == 400
        assert response.get_json() == {'error': 'invalidDate'}

    def test_an_unknown_exercise_is_not_found(self, client, me):
        response = rate(client, {'id': '0a5b2a6e-6f6e-4a8e-9a55-1b2f6d1c9e01'}, me, 3)

        assert response.status_code == 404
        assert response.get_json() == {'error': 'notFound'}

    def test_a_deleted_exercise_is_not_found(self, client, me, publish):
        exercise = publish(deletedAt='2026-11-04T08:00:00.000Z')

        assert rate(client, exercise, me, 3).status_code == 404

    def test_coaches_can_rate_their_own_exercises(self, client, me, publish):
        exercise = publish(me)

        assert rate(client, exercise, me, 5).status_code == 200
        assert [r['stars'] for r in my_ratings(client, me)] == [5]

    def test_a_cleared_rating_stays_listed_as_none(self, client, me, publish):
        """So a new phone learns it was cleared, and an older rating from another phone can't return."""
        exercise = publish()
        rate(client, exercise, me, 4, '2026-11-13T10:00:00.000Z')

        rate(client, exercise, me, None, '2026-11-13T11:00:00.000Z')
        rate(client, exercise, me, 4, '2026-11-13T10:30:00.000Z')

        assert [r['stars'] for r in my_ratings(client, me)] == [None]

    def test_needs_an_account(self, client, publish):
        exercise = publish()

        assert rate(client, exercise, {}, 3).status_code == 401
        assert client.get('/ratings').status_code == 401

    def test_coaches_only_see_their_own_ratings(self, client, register, me, publish):
        exercise = publish()
        rate(client, exercise, register(), 2)

        assert my_ratings(client, me) == []


class TestRatingSummary:
    def summary(self, client, exercise, headers):
        return client.get(f"/exercises/{exercise['id']}/rating-summary", headers=headers)

    def test_gives_every_other_coachs_ratings_together(self, client, me, register, publish):
        author = register()
        exercise = publish(headers=author)
        rate(client, exercise, author, 1)  # the author's own doesn't count
        rate(client, exercise, me, 5)
        rate(client, exercise, register(), 4)

        response = self.summary(client, exercise, me)

        assert response.status_code == 200
        assert response.get_json() == {'ratingAverage': 4.5, 'ratingCount': 2}

    def test_unrated_has_no_average(self, client, me, publish):
        assert self.summary(client, publish(), me).get_json() == {'ratingAverage': None, 'ratingCount': 0}

    def test_an_unknown_exercise_is_not_found(self, client, me):
        response = client.get('/exercises/00000000-0000-4000-8000-000000000000/rating-summary', headers=me)

        assert response.status_code == 404

    def test_needs_an_account(self, client, publish):
        assert self.summary(client, publish(), {}).status_code == 401

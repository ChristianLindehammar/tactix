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


class TestByMyRating:
    def test_keeps_what_i_rated_at_least_that_high(self, client, me, register, publish, titles):
        from tests.test_ratings import rate

        loved, liked, meh = publish(title='Loved'), publish(title='Liked'), publish(title='Meh')
        publish(title='Unrated')
        rate(client, loved, me, 5)
        rate(client, liked, me, 4)
        rate(client, meh, me, 2)
        rate(client, meh, register(), 5)  # someone else's rating doesn't count

        assert sorted(titles('?minRating=4')) == ['Liked', 'Loved']

    def test_sorts_my_best_first_and_unrated_last(self, client, me, register, publish, titles):
        from tests.test_ratings import rate

        unrated = publish(title='Unrated')
        meh, loved = publish(title='Meh'), publish(title='Loved')
        rate(client, meh, me, 2)
        rate(client, loved, me, 5)
        rate(client, unrated, register(), 5)  # someone else's rating doesn't count

        assert titles('?sort=rating') == ['Loved', 'Meh', 'Unrated']

    @pytest.mark.parametrize('value', ['0', '6', 'four', '4.5'])
    def test_rejects_a_rating_outside_one_to_five(self, client, me, value):
        response = client.get(f'/library?minRating={value}', headers=me)

        assert response.status_code == 400
        assert response.get_json() == {'error': 'invalidFilter'}

    def test_ignores_a_parameter_it_does_not_know(self, publish, titles):
        """Older and newer apps can send what this server doesn't know yet."""
        publish(title='Rondo')

        assert titles('?someNewFilter=1') == ['Rondo']

    def test_filters_my_favourites_too(self, client, me, publish):
        from tests.test_favorites import favorite, favorite_titles
        from tests.test_ratings import rate

        loved, meh = publish(title='Loved'), publish(title='Meh')
        for exercise, stars in ((loved, 5), (meh, 2)):
            favorite(client, exercise, me)
            rate(client, exercise, me, stars)

        assert favorite_titles(client, me, '?minRating=4') == ['Loved']


class TestCommunityRating:
    """Every coach's ratings together, so good exercises are easy to find."""

    @pytest.fixture()
    def library(self, client, me):
        def _library(query=''):
            response = client.get(f'/library{query}', headers=me)
            assert response.status_code == 200
            return {e['title']: e for e in response.get_json()['exercises']}

        return _library

    def test_gives_the_average_and_how_many_rated(self, client, register, publish, library):
        from tests.test_ratings import rate

        rondo = publish(title='Rondo')
        for stars in (5, 4, 4):
            rate(client, rondo, register(), stars)

        entry = library()['Rondo']

        assert entry['ratingAverage'] == 4.3
        assert entry['ratingCount'] == 3

    def test_unrated_has_no_average(self, publish, library):
        publish(title='Rondo')

        entry = library()['Rondo']

        assert entry['ratingAverage'] is None
        assert entry['ratingCount'] == 0

    def test_leaves_out_the_authors_own_and_cleared_ratings(self, client, register, publish, library):
        from tests.test_ratings import rate

        author = register()
        rondo = publish(headers=author, title='Rondo')
        rate(client, rondo, author, 5)
        cleared_by = register()
        rate(client, rondo, cleared_by, 5, '2026-11-13T10:00:00.000Z')
        rate(client, rondo, cleared_by, None, '2026-11-13T11:00:00.000Z')
        rate(client, rondo, register(), 2)

        entry = library()['Rondo']

        assert (entry['ratingAverage'], entry['ratingCount']) == (2.0, 1)

    def test_favourites_carry_it_too(self, client, me, register, publish):
        from tests.test_favorites import favorite
        from tests.test_ratings import rate

        rondo = publish(title='Rondo')
        favorite(client, rondo, me)
        rate(client, rondo, register(), 4)

        entry = client.get('/favorites', headers=me).get_json()['exercises'][0]

        assert (entry['ratingAverage'], entry['ratingCount']) == (4.0, 1)

    def test_filters_by_the_average_as_shown(self, client, me, register, publish, titles):
        from tests.test_ratings import rate

        author = register()
        loved, liked, meh = (publish(headers=author, title=t) for t in ('Loved', 'Liked', 'Meh'))
        publish(title='Unrated')
        rate(client, loved, register(), 5)
        for stars in (4, 4, 3):  # 3.7 shown, so below four
            rate(client, liked, register(), stars)
        rate(client, meh, register(), 2)
        rate(client, meh, author, 5)  # the author's own doesn't count
        rate(client, meh, me, 5, '2026-11-13T10:00:00.000Z')
        rate(client, meh, me, None, '2026-11-13T11:00:00.000Z')

        assert titles('?minAverage=4') == ['Loved']
        assert sorted(titles('?minAverage=3')) == ['Liked', 'Loved']

    def test_filters_favourites_by_the_average_too(self, client, me, register, publish):
        from tests.test_favorites import favorite, favorite_titles
        from tests.test_ratings import rate

        loved, meh = publish(title='Loved'), publish(title='Meh')
        for exercise, stars in ((loved, 5), (meh, 2)):
            favorite(client, exercise, me)
            rate(client, exercise, register(), stars)

        assert favorite_titles(client, me, '?minAverage=4') == ['Loved']

    @pytest.mark.parametrize('value', ['0', '6', 'four', '4.5'])
    def test_rejects_an_average_outside_one_to_five(self, client, me, value):
        response = client.get(f'/library?minAverage={value}', headers=me)

        assert response.status_code == 400

    def test_top_rated_needs_several_ratings_to_beat_well_proven_ones(self, client, register, publish, titles):
        from tests.test_ratings import rate

        once = publish(title='One five', updatedAt='2026-11-03T12:00:00.000Z')
        proven = publish(title='Proven', updatedAt='2026-11-03T10:00:00.000Z')
        poor = publish(title='Poor', updatedAt='2026-11-03T11:00:00.000Z')
        publish(title='Unrated', updatedAt='2026-11-03T09:00:00.000Z')
        rate(client, once, register(), 5)
        for stars in (5, 5, 5, 4):
            rate(client, proven, register(), stars)
        for stars in (1, 2):
            rate(client, poor, register(), stars)

        assert titles('?sort=topRated') == ['Proven', 'One five', 'Unrated', 'Poor']

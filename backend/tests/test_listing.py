import pytest

from tests.test_exercises import build_exercise, put


@pytest.fixture()
def me(register):
    return register()


@pytest.fixture()
def titles(client, me):
    """The titles of a listing, in order."""

    def _titles(query=''):
        response = client.get(f'/exercises{query}', headers=me)
        assert response.status_code == 200
        return [exercise['title'] for exercise in response.get_json()['exercises']]

    return _titles


@pytest.fixture()
def save(client, me):
    def _save(**overrides):
        exercise = build_exercise(**overrides)
        assert put(client, exercise, me).status_code == 200
        return exercise

    return _save


class TestWhatIsListed:
    def test_needs_a_valid_token(self, client):
        assert client.get('/exercises').status_code == 401

    def test_starts_out_empty(self, client, me):
        response = client.get('/exercises', headers=me)

        assert response.get_json() == {'exercises': [], 'total': 0}

    def test_gives_whole_exercises(self, client, me, save):
        exercise = save()

        listed = client.get('/exercises', headers=me).get_json()['exercises'][0]

        owner = listed['ownerId']
        assert listed == {**exercise, 'ownerId': owner}

    def test_lists_only_your_own(self, client, save, titles, register):
        save(title='Mine')
        theirs = build_exercise(title='Theirs')
        put(client, theirs, register())

        assert titles() == ['Mine']

    def test_leaves_out_deleted_exercises(self, save, titles):
        save(title='Kept')
        save(title='Gone', deletedAt='2026-11-04T08:00:00.000Z')

        assert titles() == ['Kept']


class TestFilters:
    def test_by_sport(self, save, titles):
        save(title='Floorball drill', sport='floorball')
        save(title='Hockey drill', sport='hockey')

        assert titles('?sport=hockey') == ['Hockey drill']

    def test_by_focus_matches_any_chosen_tag(self, save, titles):
        save(title='Passing', focus=['passing'], updatedAt='2026-11-03T03:00:00.000Z')
        save(title='Both', focus=['defence', 'attack'], updatedAt='2026-11-03T02:00:00.000Z')
        save(title='Shooting', focus=['shooting'], updatedAt='2026-11-03T01:00:00.000Z')

        assert titles('?focus=passing&focus=attack') == ['Passing', 'Both']

    def test_a_tag_shared_by_chosen_filters_does_not_list_it_twice(self, save, titles):
        save(title='Both', focus=['defence', 'attack'])

        assert titles('?focus=defence&focus=attack') == ['Both']

    def test_by_difficulty_matches_any_chosen_level(self, save, titles):
        save(title='Easy', difficulty=1, updatedAt='2026-11-03T03:00:00.000Z')
        save(title='Medium', difficulty=3, updatedAt='2026-11-03T02:00:00.000Z')
        save(title='Hard', difficulty=5, updatedAt='2026-11-03T01:00:00.000Z')

        assert titles('?difficulty=1&difficulty=5') == ['Easy', 'Hard']

    def test_by_phase(self, save, titles):
        save(title='Warmup', phase='warmup')
        save(title='Game', phase='game')

        assert titles('?phase=game') == ['Game']

    def test_by_player_count_fits_the_range_and_open_ended_ranges(self, save, titles):
        save(title='Small', minPlayers=2, maxPlayers=6, updatedAt='2026-11-03T04:00:00.000Z')
        save(title='Big', minPlayers=10, maxPlayers=20, updatedAt='2026-11-03T03:00:00.000Z')
        save(title='From eight', minPlayers=8, maxPlayers=None, updatedAt='2026-11-03T02:00:00.000Z')
        save(title='Any', minPlayers=None, maxPlayers=None, updatedAt='2026-11-03T01:00:00.000Z')

        assert titles('?players=6') == ['Small', 'Any']
        assert titles('?players=12') == ['Big', 'From eight', 'Any']

    def test_search_looks_in_title_description_and_tags_ignoring_case(self, save, titles):
        save(title='KRYSS i mitten', updatedAt='2026-11-03T04:00:00.000Z')
        save(title='Second', description='Ett kryss per lag', updatedAt='2026-11-03T03:00:00.000Z')
        save(title='Third', customTags=['Kryss'], updatedAt='2026-11-03T02:00:00.000Z')
        save(title='Other', updatedAt='2026-11-03T01:00:00.000Z')

        assert titles('?search=kryss') == ['KRYSS i mitten', 'Second', 'Third']

    def test_search_ignores_accents(self, save, titles):
        save(title='Håll bollen')

        assert titles('?search=hall') == ['Håll bollen']

    @pytest.mark.parametrize('term', ['%25', '_', '%5C'])
    def test_search_treats_wildcards_as_plain_text(self, save, titles, term):
        save(title='Plain')

        assert titles(f'?search={term}') == []

    def test_search_ignores_surrounding_spaces(self, save, titles):
        save(title='Kryss')

        assert titles('?search=%20kryss%20') == ['Kryss']

    def test_filters_combine(self, save, titles):
        save(title='Match', sport='hockey', phase='game')
        save(title='Wrong phase', sport='hockey', phase='warmup')
        save(title='Wrong sport', sport='soccer', phase='game')

        assert titles('?sport=hockey&phase=game') == ['Match']


class TestSorting:
    def test_latest_update_first_by_default(self, save, titles):
        save(title='Older', updatedAt='2026-01-01T00:00:00.000Z')
        save(title='Newer', updatedAt='2026-06-01T00:00:00.000Z')

        assert titles() == ['Newer', 'Older']

    def test_by_title_with_latest_first_within_a_tie(self, save, titles):
        save(title='Beta', updatedAt='2026-06-01T00:00:00.000Z')
        save(title='ALFA', updatedAt='2026-01-01T00:00:00.000Z')
        save(title='alfa', updatedAt='2026-03-01T00:00:00.000Z')

        assert titles('?sort=title') == ['alfa', 'ALFA', 'Beta']

    def test_by_difficulty_easiest_first_with_latest_first_within_a_tie(self, save, titles):
        save(title='Hard', difficulty=5, updatedAt='2026-06-01T00:00:00.000Z')
        save(title='Easy old', difficulty=1, updatedAt='2026-01-01T00:00:00.000Z')
        save(title='Easy new', difficulty=1, updatedAt='2026-03-01T00:00:00.000Z')

        assert titles('?sort=difficulty') == ['Easy new', 'Easy old', 'Hard']


    def test_by_title_sorts_swedish_letters_with_their_base_letters(self, save, titles):
        save(title='Zon')
        save(title='Ås')
        save(title='Bana')

        assert titles('?sort=title') == ['Ås', 'Bana', 'Zon']


class TestPages:
    @pytest.fixture(autouse=True)
    def three_exercises(self, save):
        for number in range(3):
            save(title=f'Drill {number}', updatedAt=f'2026-11-0{number + 1}T00:00:00.000Z')

    def test_limits_the_page_and_reports_the_full_total(self, client, me):
        body = client.get('/exercises?limit=2', headers=me).get_json()

        assert [exercise['title'] for exercise in body['exercises']] == ['Drill 2', 'Drill 1']
        assert body['total'] == 3

    def test_continues_from_an_offset(self, titles):
        assert titles('?limit=2&offset=2') == ['Drill 0']

    def test_total_counts_only_what_the_filters_match(self, client, me):
        body = client.get('/exercises?sport=hockey', headers=me).get_json()

        assert body == {'exercises': [], 'total': 0}


class TestBadRequests:
    @pytest.mark.parametrize(
        'query',
        [
            'sport=chess',
            'focus=teleporting',
            'difficulty=6',
            'difficulty=easy',
            'phase=nap',
            'players=0',
            'players=many',
            'players=999999999999',
            'sort=title;DROP TABLE exercises',
            'limit=0',
            'limit=101',
            'limit=ten',
            'offset=-1',
            f"search={'x' * 201}",
        ],
    )
    def test_rejects_filters_that_could_never_match(self, client, me, query):
        response = client.get(f'/exercises?{query}', headers=me)

        assert response.status_code == 400
        assert response.get_json() == {'error': 'invalidFilter'}

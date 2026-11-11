import pytest

from tests.test_exercises import build_exercise, put


def set_name(client, headers, name):
    return client.put('/me/display-name', json={'displayName': name}, headers=headers)


class TestChoosingAName:
    def test_a_new_coach_has_none(self, client, register):
        assert client.get('/me', headers=register()).get_json()['displayName'] is None

    def test_a_chosen_name_is_kept_without_surrounding_spaces(self, client, register):
        me = register()

        assert set_name(client, me, '  Coach Anna ').status_code == 200

        assert client.get('/me', headers=me).get_json()['displayName'] == 'Coach Anna'

    def test_clearing_it_leaves_none(self, client, register):
        me = register()
        set_name(client, me, 'Coach Anna')

        set_name(client, me, None)

        assert client.get('/me', headers=me).get_json()['displayName'] is None

    @pytest.mark.parametrize('name', ['   ', 'x' * 41, 42, 'Anna\nBerg'])
    def test_rejects_a_name_that_cannot_be_shown(self, client, register, name):
        me = register()

        response = set_name(client, me, name)

        assert response.status_code == 400
        assert response.get_json() == {'error': 'invalidDisplayName'}

    def test_needs_an_account(self, client):
        assert set_name(client, {}, 'Coach Anna').status_code == 401


class TestShownAsAuthor:
    def test_library_exercises_carry_their_authors_name(self, client, register):
        author = register()
        set_name(client, author, 'Coach Anna')
        put(client, build_exercise(), author)

        listed = client.get('/library', headers=register()).get_json()['exercises'][0]

        assert listed['authorName'] == 'Coach Anna'

    def test_an_author_without_a_name_is_shown_as_none(self, client, register):
        put(client, build_exercise(), register())

        listed = client.get('/library', headers=register()).get_json()['exercises'][0]

        assert listed['authorName'] is None

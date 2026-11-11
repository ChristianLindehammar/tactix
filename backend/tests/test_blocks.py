import pytest

from tests.test_exercises import build_exercise, put


@pytest.fixture()
def me(register):
    return register()


@pytest.fixture()
def pest(client, register):
    """A coach with one public exercise, and their user id as the library shows it."""
    headers = register()
    put(client, build_exercise(title='Spam'), headers)
    owner_id = client.get('/exercises', headers=headers).get_json()['exercises'][0]['ownerId']
    return owner_id


def block(client, user_id, headers):
    return client.post(f'/users/{user_id}/block', headers=headers)


def unblock(client, user_id, headers):
    return client.delete(f'/users/{user_id}/block', headers=headers)


def library_titles(client, headers):
    return [e['title'] for e in client.get('/library', headers=headers).get_json()['exercises']]


def test_needs_an_account(client, pest):
    assert block(client, pest, {}).status_code == 401


def test_hides_everything_the_coach_publishes_from_you_alone(client, register, me, pest):
    bystander = register()

    assert block(client, pest, me).status_code == 204

    assert library_titles(client, me) == []
    assert library_titles(client, bystander) == ['Spam']


def test_blocking_twice_is_harmless(client, me, pest):
    block(client, pest, me)

    assert block(client, pest, me).status_code == 204


def test_unblocking_brings_them_back(client, me, pest):
    block(client, pest, me)

    assert unblock(client, pest, me).status_code == 204

    assert library_titles(client, me) == ['Spam']


def test_cannot_block_yourself(client, me):
    my_id = client.get('/me', headers=me).get_json()['userId']

    response = block(client, my_id, me)

    assert response.status_code == 400
    assert response.get_json() == {'error': 'ownAccount'}


def test_blocking_someone_unknown_is_not_found(client, me):
    assert block(client, '00000000-0000-0000-0000-000000000000', me).status_code == 404


def test_a_coach_who_blocked_and_reported_can_still_delete_their_account(client, me, pest):
    exercise_id = client.get('/library', headers=me).get_json()['exercises'][0]['id']
    client.post(f'/exercises/{exercise_id}/report', json={}, headers=me)
    block(client, pest, me)

    assert client.delete('/me', headers=me).status_code == 204


def test_a_blocked_coach_can_still_delete_their_account(client, register, me):
    pest_headers = register()
    put(client, build_exercise(), pest_headers)
    pest_id = client.get('/me', headers=pest_headers).get_json()['userId']
    block(client, pest_id, me)

    assert client.delete('/me', headers=pest_headers).status_code == 204

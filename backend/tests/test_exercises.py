import json
import uuid

import pytest


def build_exercise(**overrides):
    return {
        'schemaVersion': 1,
        'id': str(uuid.uuid4()),
        'ownerId': None,
        'clonedFromId': None,
        'sport': 'floorball',
        'title': 'Triangelpassningar på små ytor',
        'description': 'Tre spelare, två bollar',
        'coachingPoints': ['Håll huvudet uppe'],
        'locale': 'sv',
        'difficulty': 2,
        'focus': ['passing', 'positioning'],
        'customTags': ['U12'],
        'phase': 'warmup',
        'durationMinutes': 10,
        'minPlayers': 6,
        'maxPlayers': 12,
        'frames': [
            {
                'id': 'frame-1',
                'note': 'Start',
                'markers': [
                    {'id': 'a', 'type': 'player', 'x': 0.25, 'y': 0.5, 'label': '10'},
                    {'id': 'b', 'type': 'arrow-solid', 'x': 1.02, 'y': -0.01, 'endX': 0.5, 'endY': 0.75},
                ],
            }
        ],
        'createdAt': '2026-11-03T10:00:00.000Z',
        'updatedAt': '2026-11-03T10:30:00.250Z',
        'deletedAt': None,
        **overrides,
    }


def put(client, exercise, headers):
    return client.put(f"/exercises/{exercise['id']}", json=exercise, headers=headers)


def get(client, exercise, headers):
    return client.get(f"/exercises/{exercise['id']}", headers=headers)


class TestSavingAndFetching:
    def test_gives_back_exactly_what_was_saved(self, client, register):
        me = register()
        exercise = build_exercise()

        saved = put(client, exercise, me)
        fetched = get(client, exercise, me)

        assert saved.status_code == 200
        assert fetched.status_code == 200
        owner = saved.get_json()['ownerId']
        assert fetched.get_json() == {**exercise, 'ownerId': owner}

    def test_keeps_a_cleared_optional_field_empty(self, client, register):
        me = register()
        exercise = build_exercise(durationMinutes=None, minPlayers=None, maxPlayers=None, focus=[])

        put(client, exercise, me)

        fetched = get(client, exercise, me).get_json()
        assert fetched['durationMinutes'] is None
        assert fetched['maxPlayers'] is None
        assert fetched['focus'] == []

    def test_saving_again_replaces_the_exercise(self, client, register):
        me = register()
        exercise = build_exercise()
        put(client, exercise, me)

        put(client, {**exercise, 'title': 'Ny titel', 'focus': ['defence']}, me)

        fetched = get(client, exercise, me).get_json()
        assert fetched['title'] == 'Ny titel'
        assert fetched['focus'] == ['defence']

    def test_an_exercise_that_does_not_exist_is_not_found(self, client, register):
        response = get(client, build_exercise(), register())

        assert response.status_code == 404
        assert response.get_json() == {'error': 'notFound'}

    def test_a_deleted_exercise_is_not_found(self, client, register):
        me = register()
        exercise = build_exercise()
        put(client, exercise, me)

        put(client, {**exercise, 'deletedAt': '2026-11-04T08:00:00.000Z'}, me)

        assert get(client, exercise, me).status_code == 404


class TestOwnership:
    def test_the_server_decides_the_owner_whatever_the_app_claims(self, client, register):
        me = register()
        exercise = build_exercise(ownerId='someone-else')

        saved = put(client, exercise, me).get_json()

        assert saved['ownerId'] != 'someone-else'
        assert saved['ownerId'] == get(client, exercise, me).get_json()['ownerId']

    def test_another_coach_can_read_it_by_id(self, client, register):
        exercise = build_exercise()
        put(client, exercise, register())

        assert get(client, exercise, register()).status_code == 200

    def test_another_coach_cannot_change_it(self, client, register):
        me = register()
        exercise = build_exercise()
        put(client, exercise, me)

        response = put(client, {**exercise, 'title': 'Stolen'}, register())

        assert response.status_code == 403
        assert response.get_json() == {'error': 'exerciseNotOwned'}
        assert get(client, exercise, me).get_json()['title'] == exercise['title']

    def test_another_coach_cannot_delete_it(self, client, register):
        me = register()
        exercise = build_exercise()
        put(client, exercise, me)

        put(client, {**exercise, 'deletedAt': '2026-11-04T08:00:00.000Z'}, register())

        assert get(client, exercise, me).status_code == 200


class TestWhoIsCalling:
    @pytest.mark.parametrize('headers', [{}, {'Authorization': 'Bearer wrong'}, {'Authorization': 'wrong'}])
    def test_saving_needs_a_valid_token(self, client, headers):
        assert put(client, build_exercise(), headers).status_code == 401

    def test_reading_needs_a_valid_token(self, client):
        response = get(client, build_exercise(), {})

        assert response.status_code == 401
        assert response.get_json() == {'error': 'unauthorized'}


class TestValidation:
    @pytest.mark.parametrize(
        'overrides, code',
        [
            ({'schemaVersion': 2}, 'unsupportedVersion'),
            ({'sport': 'chess'}, 'invalidSport'),
            ({'title': '   '}, 'invalidTitle'),
            ({'title': 'x' * 201}, 'invalidTitle'),
            ({'description': 5}, 'invalidText'),
            ({'coachingPoints': [1]}, 'invalidText'),
            ({'locale': ''}, 'invalidText'),
            ({'difficulty': 6}, 'invalidDifficulty'),
            ({'difficulty': True}, 'invalidDifficulty'),
            ({'focus': 'passing'}, 'invalidFocus'),
            ({'phase': 'nap'}, 'invalidPhase'),
            ({'durationMinutes': 0}, 'invalidCount'),
            ({'minPlayers': 12, 'maxPlayers': 6}, 'invalidCount'),
            ({'durationMinutes': 10**12}, 'invalidCount'),
            ({'locale': 'x' * 17}, 'invalidText'),
            ({'clonedFromId': 'x' * 65}, 'invalidId'),
            ({'frames': []}, 'invalidFrames'),
            ({'frames': [{'id': 'f'}]}, 'invalidFrames'),
            ({'frames': [{'id': 'f', 'markers': [{'id': 'a', 'type': 'dragon', 'x': 0, 'y': 0}]}]}, 'invalidMarker'),
            ({'frames': [{'id': 'f', 'markers': [{'id': 'a', 'type': 'arrow-solid', 'x': 0, 'y': 0}]}]}, 'invalidMarker'),
            ({'createdAt': 'yesterday'}, 'invalidDate'),
            ({'updatedAt': '2026-11-03T10:00:00'}, 'invalidDate'),
            ({'deletedAt': 'soon'}, 'invalidDate'),
        ],
    )
    def test_rejects_what_the_app_would_reject(self, client, register, overrides, code):
        response = put(client, build_exercise(**overrides), register())

        assert response.status_code == 400
        assert response.get_json() == {'error': code}

    def test_rejects_a_body_that_is_not_json(self, client, register):
        url = f'/exercises/{uuid.uuid4()}'

        response = client.put(url, data='not json', headers=register(), content_type='application/json')

        assert response.status_code == 400
        assert response.get_json() == {'error': 'invalidFormat'}

    def test_rejects_an_id_that_differs_from_the_address(self, client, register):
        response = client.put(f'/exercises/{uuid.uuid4()}', json=build_exercise(), headers=register())

        assert response.status_code == 400
        assert response.get_json() == {'error': 'invalidId'}

    def test_rejects_an_id_that_is_not_a_uuid(self, client, register):
        response = put(client, build_exercise(id='guessable'), register())

        assert response.status_code == 400
        assert response.get_json() == {'error': 'invalidId'}

    def test_drops_unknown_focus_tags_so_newer_apps_still_save(self, client, register):
        me = register()
        exercise = build_exercise(focus=['passing', 'teleporting'])

        put(client, exercise, me)

        assert get(client, exercise, me).get_json()['focus'] == ['passing']

    def test_accepts_a_long_description_below_the_size_limit(self, client, register):
        me = register()
        exercise = build_exercise(description='å' * 100_000)

        assert put(client, exercise, me).status_code == 200
        assert get(client, exercise, me).get_json()['description'] == exercise['description']

    def test_rejects_a_coordinate_that_is_not_a_number(self, client, register):
        body = json.dumps(build_exercise()).replace('0.25', 'NaN')
        exercise_id = json.loads(body)['id']

        response = client.put(
            f'/exercises/{exercise_id}', data=body, headers=register(), content_type='application/json'
        )

        assert response.status_code == 400
        assert response.get_json() == {'error': 'invalidMarker'}

    def test_rejects_a_body_over_the_size_limit(self, client, register):
        exercise = build_exercise(description='x' * (1024 * 1024))

        response = put(client, exercise, register())

        assert response.status_code == 413
        assert response.get_json() == {'error': 'tooLarge'}

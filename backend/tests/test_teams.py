import uuid

import pytest

from coachmate_api import create_app
from coachmate_api.rate_limit import DEFAULT_LIMITS


def team_item(name='U12 Blå', sport='floorball'):
    return {'kind': 'team', 'id': 'team', 'data': {'name': name, 'sport': sport}}


def player(player_id, name='Alva', position='forward'):
    return {'kind': 'player', 'id': player_id, 'data': {'name': name, 'position': position}}


def place(formation_id, player_id, x, y):
    return {'kind': 'place', 'id': f'{formation_id}:{player_id}', 'data': {'x': x, 'y': y}}


def removed(kind, item_id):
    return {'kind': kind, 'id': item_id, 'data': None}


def sync(client, team_id, headers, since=0, changes=()):
    return client.post(f'/teams/{team_id}/sync', json={'since': since, 'changes': list(changes)}, headers=headers)


def items_by_key(response):
    return {(item['kind'], item['id']): item['data'] for item in response.get_json()['items']}


@pytest.fixture()
def owner(register):
    return register(paid=False)


@pytest.fixture()
def team_id(client, owner):
    team_id = str(uuid.uuid4())
    assert client.post('/teams', json={'id': team_id}, headers=owner).status_code == 201
    assert sync(client, team_id, owner, changes=[team_item(), player('p1')]).status_code == 200
    return team_id


def invite(client, team_id, headers):
    return client.post(f'/teams/{team_id}/invites', headers=headers)


@pytest.fixture()
def join_team(client, team_id, owner, register):
    def _join():
        coach = register(paid=False)
        code = invite(client, team_id, owner).get_json()['code']
        assert client.post(f'/invites/{code}/accept', headers=coach).status_code == 200
        return coach

    return _join


class TestCreating:
    def test_needs_an_account(self, client):
        assert client.post('/teams', json={'id': str(uuid.uuid4())}).status_code == 401

    def test_needs_no_plan(self, client, owner):
        response = client.post('/teams', json={'id': str(uuid.uuid4())}, headers=owner)

        assert response.status_code == 201
        assert response.get_json()['role'] == 'owner'

    def test_creating_again_is_harmless(self, client, owner, team_id):
        response = client.post('/teams', json={'id': team_id}, headers=owner)

        assert response.status_code == 200
        assert sync(client, team_id, owner).status_code == 200

    def test_another_coach_cant_take_the_id(self, client, register, team_id):
        assert client.post('/teams', json={'id': team_id}, headers=register()).status_code == 409

    def test_the_id_must_be_a_uuid(self, client, owner):
        assert client.post('/teams', json={'id': '1712345678901'}, headers=owner).status_code == 400

    def test_lists_the_coachs_teams(self, client, owner, team_id):
        teams = client.get('/teams', headers=owner).get_json()['teams']

        assert teams == [{'id': team_id, 'role': 'owner', 'name': 'U12 Blå', 'sport': 'floorball', 'revision': 1}]


class TestSyncing:
    def test_returns_everything_to_a_new_phone(self, client, owner, team_id):
        response = sync(client, team_id, owner, since=0)

        assert response.status_code == 200
        assert response.get_json()['revision'] == 1
        assert items_by_key(response) == {
            ('team', 'team'): {'name': 'U12 Blå', 'sport': 'floorball'},
            ('player', 'p1'): {'name': 'Alva', 'position': 'forward'},
        }

    def test_returns_only_what_changed_since(self, client, owner, team_id):
        sync(client, team_id, owner, since=1, changes=[player('p2', name='Bo')])

        response = sync(client, team_id, owner, since=1)

        assert response.get_json()['revision'] == 2
        assert items_by_key(response) == {('player', 'p2'): {'name': 'Bo', 'position': 'forward'}}

    def test_nothing_changed_keeps_the_revision(self, client, owner, team_id):
        response = sync(client, team_id, owner, since=1)

        assert response.get_json() == {'revision': 1, 'role': 'owner', 'items': []}

    def test_coaches_moving_different_players_both_keep_their_move(self, client, owner, team_id, join_team):
        assistant = join_team()
        sync(client, team_id, owner, since=1, changes=[place('f1', 'p1', 0.2, 0.3)])
        sync(client, team_id, assistant, since=1, changes=[place('f1', 'p2', 0.7, 0.8)])

        items = items_by_key(sync(client, team_id, owner, since=0))

        assert items[('place', 'f1:p1')] == {'x': 0.2, 'y': 0.3}
        assert items[('place', 'f1:p2')] == {'x': 0.7, 'y': 0.8}

    def test_the_last_change_to_the_same_item_wins(self, client, owner, team_id, join_team):
        assistant = join_team()
        sync(client, team_id, owner, since=1, changes=[place('f1', 'p1', 0.2, 0.3)])
        sync(client, team_id, assistant, since=1, changes=[place('f1', 'p1', 0.9, 0.9)])

        assert items_by_key(sync(client, team_id, owner, since=2)) == {('place', 'f1:p1'): {'x': 0.9, 'y': 0.9}}

    def test_a_removed_item_reaches_other_phones(self, client, owner, team_id, join_team):
        assistant = join_team()

        sync(client, team_id, assistant, since=1, changes=[removed('player', 'p1')])

        assert items_by_key(sync(client, team_id, owner, since=1)) == {('player', 'p1'): None}

    def test_a_phone_ahead_of_the_server_gets_everything(self, client, owner, team_id):
        response = sync(client, team_id, owner, since=99)

        assert set(items_by_key(response)) == {('team', 'team'), ('player', 'p1')}

    def test_strangers_cant_read_or_change_it(self, client, register, team_id):
        assert sync(client, team_id, register()).status_code == 404
        assert sync(client, team_id, register(), changes=[player('p9')]).status_code == 404

    @pytest.mark.parametrize('change', [
        {'kind': 'team', 'id': 'team', 'data': {'name': 'X', 'sport': 'chess'}},
        {'kind': 'team', 'id': 'team', 'data': None},
        {'kind': 'player', 'id': 'p1', 'data': {'name': '', 'position': 'forward'}},
        {'kind': 'player', 'id': 'p 1', 'data': {'name': 'Alva', 'position': 'forward'}},
        {'kind': 'player', 'id': 'p1', 'data': {'name': 'A' * 101, 'position': 'forward'}},
        {'kind': 'place', 'id': 'f1:p1', 'data': {'x': 1.5, 'y': 0.5}},
        {'kind': 'place', 'id': 'f1:p1', 'data': {'x': True, 'y': 0.5}},
        {'kind': 'place', 'id': 'f1', 'data': {'x': 0.5, 'y': 0.5}},
        {'kind': 'drawing', 'id': 'd1', 'data': {}},
        {'kind': 'player', 'id': 'p1', 'data': 'Alva'},
    ])
    def test_rejects_invalid_changes(self, client, owner, team_id, change):
        response = sync(client, team_id, owner, since=1, changes=[change])

        assert response.status_code == 400
        assert response.get_json() == {'error': 'invalidChange'}
        # Nothing from a rejected request is kept
        assert sync(client, team_id, owner, since=1).get_json()['items'] == []

    def test_rejects_a_missing_revision(self, client, owner, team_id):
        response = client.post(f'/teams/{team_id}/sync', json={'changes': []}, headers=owner)

        assert response.status_code == 400

    def test_drops_unknown_fields(self, client, owner, team_id):
        change = {'kind': 'formation', 'id': 'f1', 'data': {'name': 'Powerplay', 'secret': 'x'}}

        response = sync(client, team_id, owner, since=1, changes=[change])

        assert items_by_key(response) == {('formation', 'f1'): {'name': 'Powerplay'}}

    def test_is_rate_limited(self, db_config, owner, team_id):
        # Setting up the team already synced once
        client = create_app(db_config, limits={**DEFAULT_LIMITS, 'teamSyncs': (3, 3600)}).test_client()

        statuses = [sync(client, team_id, owner).status_code for _ in range(3)]

        assert statuses == [200, 200, 429]


class TestInvites:
    def test_only_the_owner_can_invite(self, client, team_id, join_team):
        assistant = join_team()

        assert invite(client, team_id, assistant).status_code == 403

    def test_preview_shows_the_team_before_joining(self, client, register, owner, team_id):
        client.put('/me/display-name', json={'displayName': 'Coach Kim'}, headers=owner)
        code = invite(client, team_id, owner).get_json()['code']

        response = client.get(f'/invites/{code}', headers=register())

        assert response.status_code == 200
        assert response.get_json() == {
            'teamId': team_id, 'name': 'U12 Blå', 'sport': 'floorball',
            'ownerName': 'Coach Kim', 'memberCount': 1, 'role': None,
        }

    def test_joining_makes_an_editor(self, client, register, owner, team_id):
        coach = register()
        code = invite(client, team_id, owner).get_json()['code']

        response = client.post(f'/invites/{code}/accept', headers=coach)

        assert response.get_json() == {'teamId': team_id, 'role': 'editor'}
        assert sync(client, team_id, coach, changes=[player('p2')]).status_code == 200

    def test_the_code_works_typed_in_lower_case_with_dashes(self, client, register, owner, team_id):
        code = invite(client, team_id, owner).get_json()['code']
        typed = f'{code[:5]}-{code[5:]}'.lower()

        assert client.post(f'/invites/{typed}/accept', headers=register()).status_code == 200

    def test_joining_twice_keeps_one_membership(self, client, register, owner, team_id):
        coach = register()
        code = invite(client, team_id, owner).get_json()['code']
        client.post(f'/invites/{code}/accept', headers=coach)

        client.post(f'/invites/{code}/accept', headers=coach)

        assert len(client.get(f'/teams/{team_id}/members', headers=owner).get_json()['members']) == 2

    def test_the_owner_joining_stays_owner(self, client, owner, team_id):
        code = invite(client, team_id, owner).get_json()['code']

        assert client.post(f'/invites/{code}/accept', headers=owner).get_json()['role'] == 'owner'

    def test_an_unknown_code_is_not_found(self, client, register):
        assert client.post('/invites/AAAAAAAAAA/accept', headers=register()).status_code == 404

    def test_a_code_expires_after_a_week(self, db_config, register, owner, team_id):
        now = [1_800_000_000]
        client = create_app(db_config, clock=lambda: now[0]).test_client()
        code = invite(client, team_id, owner).get_json()['code']

        now[0] += 7 * 86400 + 1

        assert client.post(f'/invites/{code}/accept', headers=register()).status_code == 404

    def test_revoking_stops_links_but_keeps_members(self, client, register, owner, team_id, join_team):
        assistant = join_team()
        code = invite(client, team_id, owner).get_json()['code']

        assert client.delete(f'/teams/{team_id}/invites', headers=owner).status_code == 204

        assert client.post(f'/invites/{code}/accept', headers=register()).status_code == 404
        assert sync(client, team_id, assistant).status_code == 200

    def test_stores_only_a_hash_of_the_code(self, client, owner, team_id, rows):
        code = invite(client, team_id, owner).get_json()['code']

        assert all(code not in row[0] for row in rows('SELECT code_hash FROM team_invites'))

    def test_lookups_are_rate_limited(self, db_config, register):
        client = create_app(db_config, limits={**DEFAULT_LIMITS, 'inviteLookups': (2, 3600)}).test_client()
        coach = register()

        statuses = [client.get('/invites/AAAAAAAAAA', headers=coach).status_code for _ in range(3)]

        assert statuses == [404, 404, 429]

    def test_the_join_page_opens_the_app(self, client, owner, team_id):
        code = invite(client, team_id, owner).get_json()['code']

        page = client.get(f'/join/{code}').get_data(as_text=True)

        assert f'coachmate://join/{code}' in page

    def test_the_join_page_doesnt_echo_markup(self, client):
        page = client.get('/join/<script>alert(1)</script>').get_data(as_text=True)

        assert '<script>' not in page


class TestMembers:
    def test_lists_members_with_the_owner_first(self, client, owner, team_id, join_team):
        assistant = join_team()
        client.put('/me/display-name', json={'displayName': 'Sam'}, headers=assistant)

        members = client.get(f'/teams/{team_id}/members', headers=assistant).get_json()['members']

        assert [(m['role'], m['displayName'], m['isYou']) for m in members] == [
            ('owner', None, False), ('editor', 'Sam', True),
        ]

    def test_the_owner_removes_a_coach(self, client, owner, team_id, join_team):
        assistant = join_team()
        members = client.get(f'/teams/{team_id}/members', headers=assistant).get_json()['members']
        assistant_id = next(m['userId'] for m in members if m['isYou'])

        assert client.delete(f'/teams/{team_id}/members/{assistant_id}', headers=owner).status_code == 204

        assert sync(client, team_id, assistant).status_code == 404

    def test_a_coach_can_leave(self, client, owner, team_id, join_team):
        assistant = join_team()
        members = client.get(f'/teams/{team_id}/members', headers=assistant).get_json()['members']
        assistant_id = next(m['userId'] for m in members if m['isYou'])

        assert client.delete(f'/teams/{team_id}/members/{assistant_id}', headers=assistant).status_code == 204

        assert client.get('/teams', headers=assistant).get_json()['teams'] == []

    def test_an_editor_cant_remove_others(self, client, owner, team_id, join_team):
        first, second = join_team(), join_team()
        members = client.get(f'/teams/{team_id}/members', headers=first).get_json()['members']
        second_id = next(m['userId'] for m in members if m['role'] == 'editor' and not m['isYou'])

        assert client.delete(f'/teams/{team_id}/members/{second_id}', headers=first).status_code == 403
        assert sync(client, team_id, second).status_code == 200

    def test_the_owner_cant_leave(self, client, owner, team_id):
        members = client.get(f'/teams/{team_id}/members', headers=owner).get_json()['members']

        response = client.delete(f"/teams/{team_id}/members/{members[0]['userId']}", headers=owner)

        assert response.get_json() == {'error': 'ownerCannotLeave'}


class TestDeleting:
    def test_the_owner_stops_sharing_for_everyone(self, client, owner, team_id, join_team):
        assistant = join_team()

        assert client.delete(f'/teams/{team_id}', headers=owner).status_code == 204

        assert sync(client, team_id, assistant).status_code == 404
        assert client.get('/teams', headers=owner).get_json()['teams'] == []

    def test_an_editor_cant_delete_it(self, client, team_id, join_team):
        assert client.delete(f'/teams/{team_id}', headers=join_team()).status_code == 403

    def test_deleting_the_owners_account_removes_the_team(self, client, owner, team_id, join_team, rows):
        join_team()

        assert client.delete('/me', headers=owner).status_code == 204

        assert rows('SELECT COUNT(*) FROM teams') == [(0,)]
        assert rows('SELECT COUNT(*) FROM team_items') == [(0,)]

    def test_deleting_an_editors_account_keeps_the_team(self, client, owner, team_id, join_team):
        assistant = join_team()

        assert client.delete('/me', headers=assistant).status_code == 204

        members = client.get(f'/teams/{team_id}/members', headers=owner).get_json()['members']
        assert [m['role'] for m in members] == ['owner']

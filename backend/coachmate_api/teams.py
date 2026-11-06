"""Teams that coaches share and edit together.

A team is a set of items: its name, its players, its formations, and each player's place in each
formation. Phones send the items they changed and get back everything changed since the revision
they last saw, so coaches editing different things never overwrite each other. When two change the
same item, the one the server hears last wins.
"""
import hashlib
import json
import math
import re
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from html import escape

from flask import Blueprint, current_app, g, jsonify, request

from .auth import require_user
from .db import get_db, query_all, query_one
from .rate_limit import current_user, rate_limited
from .validation import SPORTS

bp = Blueprint('teams', __name__)

INVITE_DAYS = 7
# No 0/O or 1/I, so a code read aloud or typed from a screen comes out right
INVITE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
INVITE_LENGTH = 10
MAX_CHANGES = 2000
MAX_NAME = 100
ITEM_ID = re.compile(r'^[A-Za-z0-9._-]{1,64}$')
ROLES = ('owner', 'editor')


class InvalidChange(Exception):
    pass


def _now():
    return datetime.fromtimestamp(current_app.config['CLOCK'](), timezone.utc).replace(tzinfo=None)


def _format_date(value):
    return value.strftime('%Y-%m-%dT%H:%M:%S.') + f'{value.microsecond // 1000:03d}Z'


def _hash_code(code):
    return hashlib.sha256(code.encode('utf-8')).hexdigest()


def _normalized_code(value):
    """Codes are shown in groups and may be typed in lower case, so only the letters count."""
    return re.sub(r'[^A-Z0-9]', '', value.upper())


def _name(value):
    if not isinstance(value, str) or not value.strip() or len(value) > MAX_NAME:
        raise InvalidChange()
    return value


def _coordinate(value):
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
        raise InvalidChange()
    if not 0 <= value <= 1:
        raise InvalidChange()
    return value


def _check_id(kind, item_id):
    if kind == 'team':
        valid = item_id == 'team'
    elif kind in ('player', 'formation'):
        valid = bool(ITEM_ID.match(item_id))
    elif kind == 'place':
        formation_id, _, player_id = item_id.partition(':')
        valid = bool(ITEM_ID.match(formation_id) and ITEM_ID.match(player_id))
    else:
        valid = False
    if not valid:
        raise InvalidChange()


def _item_data(kind, item_id, data):
    """The stored form of one item, or InvalidChange. Unknown fields are dropped."""
    _check_id(kind, item_id)
    if kind == 'team':
        if data.get('sport') not in SPORTS:
            raise InvalidChange()
        return {'name': _name(data.get('name')), 'sport': data['sport']}
    if kind == 'player':
        position = data.get('position')
        if not isinstance(position, str) or len(position) > 40:
            raise InvalidChange()
        return {'name': _name(data.get('name')), 'position': position}
    if kind == 'formation':
        return {'name': _name(data.get('name'))}
    return {'x': _coordinate(data.get('x')), 'y': _coordinate(data.get('y'))}


def _parse_changes(body):
    changes = body.get('changes') if isinstance(body, dict) else None
    if not isinstance(changes, list) or len(changes) > MAX_CHANGES:
        raise InvalidChange()
    parsed = []
    for change in changes:
        if not isinstance(change, dict):
            raise InvalidChange()
        kind, item_id, data = change.get('kind'), change.get('id'), change.get('data')
        if not isinstance(kind, str) or not isinstance(item_id, str):
            raise InvalidChange()
        if data is None:
            # Removing: the team itself can't be, as deleting a team is its own request
            if kind == 'team':
                raise InvalidChange()
            _check_id(kind, item_id)
            parsed.append((kind, item_id, None))
        elif isinstance(data, dict):
            parsed.append((kind, item_id, _item_data(kind, item_id, data)))
        else:
            raise InvalidChange()
    return parsed


def _role(team_id, user_id):
    row = query_one('SELECT role FROM team_members WHERE team_id = %s AND user_id = %s', (team_id, user_id))
    return row['role'] if row else None


def _not_found():
    return jsonify({'error': 'notFound'}), 404


def _team_summary(team_id):
    row = query_one("SELECT data FROM team_items WHERE team_id = %s AND kind = 'team' AND item_id = 'team'", (team_id,))
    data = json.loads(row['data']) if row and row['data'] else {}
    return data.get('name'), data.get('sport')


@bp.post('/teams')
@require_user
def create_team():
    """Starts sharing a team. The phone picks the id, so trying again after a lost answer is safe."""
    body = request.get_json(silent=True)
    team_id = body.get('id') if isinstance(body, dict) else None
    try:
        team_id = str(uuid.UUID(team_id)) if isinstance(team_id, str) else None
    except ValueError:
        team_id = None
    if team_id is None:
        return jsonify({'error': 'invalidId'}), 400

    existing = query_one('SELECT owner_id FROM teams WHERE id = %s', (team_id,))
    if existing:
        if existing['owner_id'] != g.user_id:
            return jsonify({'error': 'teamExists'}), 409
        return jsonify({'id': team_id, 'role': 'owner'})

    now = _now()
    cursor = get_db().cursor()
    cursor.execute('INSERT INTO teams (id, owner_id, created_at) VALUES (%s, %s, %s)', (team_id, g.user_id, now))
    cursor.execute(
        "INSERT INTO team_members (team_id, user_id, role, joined_at) VALUES (%s, %s, 'owner', %s)",
        (team_id, g.user_id, now),
    )
    get_db().commit()
    cursor.close()
    return jsonify({'id': team_id, 'role': 'owner'}), 201


@bp.get('/teams')
@require_user
def list_teams():
    """The teams the coach shares with others, so a new phone can find them."""
    rows = query_all(
        'SELECT m.team_id, m.role, t.revision FROM team_members m JOIN teams t ON t.id = m.team_id '
        'WHERE m.user_id = %s ORDER BY m.joined_at',
        (g.user_id,),
    )
    teams = []
    for row in rows:
        name, sport = _team_summary(row['team_id'])
        teams.append({'id': row['team_id'], 'role': row['role'], 'name': name, 'sport': sport, 'revision': row['revision']})
    return jsonify({'teams': teams})


@bp.post('/teams/<team_id>/sync')
@require_user
@rate_limited('teamSyncs', current_user)
def sync_team(team_id):
    """Takes the caller's changes, then answers with every item changed after `since`."""
    body = request.get_json(silent=True)
    since = body.get('since') if isinstance(body, dict) else None
    if isinstance(since, bool) or not isinstance(since, int) or since < 0:
        return jsonify({'error': 'invalidChange'}), 400
    try:
        changes = _parse_changes(body)
    except InvalidChange:
        return jsonify({'error': 'invalidChange'}), 400

    connection = get_db()
    cursor = connection.cursor(dictionary=True)
    # Locks the team, so two coaches' changes get different revisions in the order they arrive
    cursor.execute('SELECT revision FROM teams WHERE id = %s FOR UPDATE', (team_id,))
    team = cursor.fetchone()
    role = _role(team_id, g.user_id) if team else None
    if role is None:
        connection.rollback()
        cursor.close()
        return _not_found()

    revision = team['revision']
    if changes:
        revision += 1
        now = _now()
        for kind, item_id, data in changes:
            cursor.execute(
                'INSERT INTO team_items (team_id, kind, item_id, data, revision, updated_by, updated_at) '
                'VALUES (%s, %s, %s, %s, %s, %s, %s) '
                'ON DUPLICATE KEY UPDATE data = VALUES(data), revision = VALUES(revision), '
                'updated_by = VALUES(updated_by), updated_at = VALUES(updated_at)',
                (team_id, kind, item_id, None if data is None else json.dumps(data, ensure_ascii=False),
                 revision, g.user_id, now),
            )
        cursor.execute('UPDATE teams SET revision = %s WHERE id = %s', (revision, team_id))
    connection.commit()

    # A phone ahead of the server, such as after a restore, starts over
    if since > revision:
        since = 0
    cursor.execute(
        'SELECT kind, item_id, data FROM team_items WHERE team_id = %s AND revision > %s',
        (team_id, since),
    )
    items = [
        {'kind': row['kind'], 'id': row['item_id'], 'data': None if row['data'] is None else json.loads(row['data'])}
        for row in cursor.fetchall()
    ]
    cursor.close()
    return jsonify({'revision': revision, 'role': role, 'items': items})


@bp.delete('/teams/<team_id>')
@require_user
def delete_team(team_id):
    """Stops sharing the team for everyone. Each coach keeps their own copy on their phone."""
    role = _role(team_id, g.user_id)
    if role is None:
        return _not_found()
    if role != 'owner':
        return jsonify({'error': 'notOwner'}), 403
    cursor = get_db().cursor()
    cursor.execute('DELETE FROM teams WHERE id = %s', (team_id,))
    get_db().commit()
    cursor.close()
    return '', 204


@bp.get('/teams/<team_id>/members')
@require_user
def list_members(team_id):
    if _role(team_id, g.user_id) is None:
        return _not_found()
    rows = query_all(
        'SELECT m.user_id, m.role, u.display_name FROM team_members m JOIN users u ON u.id = m.user_id '
        "WHERE m.team_id = %s ORDER BY m.role = 'owner' DESC, m.joined_at",
        (team_id,),
    )
    return jsonify({'members': [
        {'userId': row['user_id'], 'role': row['role'], 'displayName': row['display_name'], 'isYou': row['user_id'] == g.user_id}
        for row in rows
    ]})


@bp.delete('/teams/<team_id>/members/<user_id>')
@require_user
def remove_member(team_id, user_id):
    """The owner removes a coach, or a coach leaves. The owner can't leave, only delete the team."""
    role = _role(team_id, g.user_id)
    if role is None:
        return _not_found()
    if user_id != g.user_id and role != 'owner':
        return jsonify({'error': 'notOwner'}), 403
    target = _role(team_id, user_id)
    if target is None:
        return _not_found()
    if target == 'owner':
        return jsonify({'error': 'ownerCannotLeave'}), 400
    cursor = get_db().cursor()
    cursor.execute('DELETE FROM team_members WHERE team_id = %s AND user_id = %s', (team_id, user_id))
    get_db().commit()
    cursor.close()
    return '', 204


@bp.post('/teams/<team_id>/invites')
@require_user
def create_invite(team_id):
    role = _role(team_id, g.user_id)
    if role is None:
        return _not_found()
    if role != 'owner':
        return jsonify({'error': 'notOwner'}), 403
    code = ''.join(secrets.choice(INVITE_ALPHABET) for _ in range(INVITE_LENGTH))
    now = _now()
    expires_at = now + timedelta(days=INVITE_DAYS)
    cursor = get_db().cursor()
    cursor.execute(
        'INSERT INTO team_invites (code_hash, team_id, created_by, created_at, expires_at) VALUES (%s, %s, %s, %s, %s)',
        (_hash_code(code), team_id, g.user_id, now, expires_at),
    )
    get_db().commit()
    cursor.close()
    return jsonify({'code': code, 'expiresAt': _format_date(expires_at)}), 201


@bp.delete('/teams/<team_id>/invites')
@require_user
def revoke_invites(team_id):
    """Every link sent so far stops working. Coaches who already joined stay."""
    role = _role(team_id, g.user_id)
    if role is None:
        return _not_found()
    if role != 'owner':
        return jsonify({'error': 'notOwner'}), 403
    cursor = get_db().cursor()
    cursor.execute(
        'UPDATE team_invites SET revoked_at = %s WHERE team_id = %s AND revoked_at IS NULL',
        (_now(), team_id),
    )
    get_db().commit()
    cursor.close()
    return '', 204


def _open_invite(code):
    return query_one(
        'SELECT team_id FROM team_invites WHERE code_hash = %s AND revoked_at IS NULL AND expires_at > %s',
        (_hash_code(_normalized_code(code)), _now()),
    )


@bp.get('/invites/<code>')
@require_user
@rate_limited('inviteLookups', current_user)
def preview_invite(code):
    """What joining would mean, so the coach can check before saying yes."""
    invite = _open_invite(code)
    if invite is None:
        return jsonify({'error': 'inviteNotFound'}), 404
    team_id = invite['team_id']
    name, sport = _team_summary(team_id)
    owner = query_one(
        "SELECT u.display_name FROM team_members m JOIN users u ON u.id = m.user_id WHERE m.team_id = %s AND m.role = 'owner'",
        (team_id,),
    )
    members = query_one('SELECT COUNT(*) AS n FROM team_members WHERE team_id = %s', (team_id,))['n']
    return jsonify({
        'teamId': team_id,
        'name': name,
        'sport': sport,
        'ownerName': owner['display_name'] if owner else None,
        'memberCount': members,
        'role': _role(team_id, g.user_id),
    })


@bp.post('/invites/<code>/accept')
@require_user
@rate_limited('inviteLookups', current_user)
def accept_invite(code):
    invite = _open_invite(code)
    if invite is None:
        return jsonify({'error': 'inviteNotFound'}), 404
    team_id = invite['team_id']
    role = _role(team_id, g.user_id)
    if role is None:
        role = 'editor'
        cursor = get_db().cursor()
        # Two taps at once both find no membership, so the second insert is ignored
        cursor.execute(
            "INSERT IGNORE INTO team_members (team_id, user_id, role, joined_at) VALUES (%s, %s, 'editor', %s)",
            (team_id, g.user_id, _now()),
        )
        get_db().commit()
        cursor.close()
    return jsonify({'teamId': team_id, 'role': role})


JOIN_PAGE = '''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Join a team on CoachMate</title>
<style>
  body {{ font-family: -apple-system, system-ui, sans-serif; margin: 0; padding: 32px 16px; background: #f5f7f8; color: #11181c; text-align: center; }}
  main {{ max-width: 420px; margin: 0 auto; }}
  a.button {{ display: block; margin: 24px 0; padding: 14px; border-radius: 10px; background: #0a7ea4; color: #fff; text-decoration: none; font-weight: 600; }}
  code {{ font-size: 24px; letter-spacing: 2px; }}
  @media (prefers-color-scheme: dark) {{ body {{ background: #151718; color: #ecedee; }} }}
</style>
</head>
<body>
<main>
  <h1>Join a team on CoachMate</h1>
  <p>A coach invited you to plan their lineup together.</p>
  <a class="button" href="coachmate://join/{code}">Open in CoachMate</a>
  <p>Or open CoachMate, go to Team, choose Join with code and enter:</p>
  <p><code>{code}</code></p>
</main>
</body>
</html>
'''


@bp.get('/join/<code>')
def join_page(code):
    """Where invite links lead. Messaging apps only make web addresses tappable, so this page hands
    over to the app and shows the code for typing in."""
    code = _normalized_code(code)[:INVITE_LENGTH]
    return current_app.response_class(JOIN_PAGE.format(code=escape(code)), mimetype='text/html')

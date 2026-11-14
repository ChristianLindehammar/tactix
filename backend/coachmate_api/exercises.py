import json

import mysql.connector
from flask import Blueprint, g, jsonify, request

from .auth import require_user
from .db import get_db, query_all, query_one
from .listing import OTHERS_RATINGS, InvalidFilter, build_library, build_listing
from .plans import has_active_plan
from .rate_limit import current_user, rate_limited
from .validation import SCHEMA_VERSION, ExerciseParseError, parse_exercise, upgrade_coaching_points

bp = Blueprint('exercises', __name__)

DUPLICATE_KEY = 1062


def _format_date(value):
    return None if value is None else value.strftime('%Y-%m-%dT%H:%M:%S.') + f'{value.microsecond // 1000:03d}Z'


def _to_exercise(row, focus):
    return {
        # Rows from before version 2 are upgraded as they're read
        'schemaVersion': SCHEMA_VERSION,
        'id': row['id'],
        'ownerId': row['owner_id'],
        'clonedFromId': row['cloned_from_id'],
        'sport': row['sport'],
        'title': row['title'],
        'description': row['description'],
        'coachingPoints': upgrade_coaching_points(json.loads(row['coaching_points'])),
        'locale': row['locale'],
        'difficulty': row['difficulty'],
        'focus': focus,
        'customTags': json.loads(row['custom_tags']),
        'phase': row['phase'],
        'durationMinutes': row['duration_minutes'],
        'minPlayers': row['min_players'],
        'maxPlayers': row['max_players'],
        'frames': json.loads(row['frames']),
        'createdAt': _format_date(row['created_at']),
        'updatedAt': _format_date(row['updated_at']),
        'deletedAt': _format_date(row['deleted_at']),
        'visibility': row['visibility'],
    }


def _focus_by_exercise(exercise_ids):
    if not exercise_ids:
        return {}
    placeholders = ', '.join(['%s'] * len(exercise_ids))
    focus = {}
    for exercise_id, tag in query_all(
        f'SELECT exercise_id, tag FROM exercise_focus WHERE exercise_id IN ({placeholders}) ORDER BY position',
        exercise_ids,
        dictionary=False,
    ):
        focus.setdefault(exercise_id, []).append(tag)
    return focus


def _load_exercise(exercise_id):
    row = query_one('SELECT * FROM exercises WHERE id = %s', (exercise_id,))
    if row is None:
        return None
    return _to_exercise(row, _focus_by_exercise([exercise_id]).get(exercise_id, []))


def _write_exercise(exercise, owner_id, exists):
    columns = {
        'owner_id': owner_id,
        'cloned_from_id': exercise['clonedFromId'],
        'schema_version': SCHEMA_VERSION,
        'sport': exercise['sport'],
        'title': exercise['title'],
        'description': exercise['description'],
        'coaching_points': json.dumps(exercise['coachingPoints'], ensure_ascii=False),
        'custom_tags': json.dumps(exercise['customTags'], ensure_ascii=False),
        'locale': exercise['locale'],
        'difficulty': exercise['difficulty'],
        'phase': exercise['phase'],
        'duration_minutes': exercise['durationMinutes'],
        'min_players': exercise['minPlayers'],
        'max_players': exercise['maxPlayers'],
        'frames': json.dumps(exercise['frames'], ensure_ascii=False),
        'created_at': exercise['createdAt'],
        'updated_at': exercise['updatedAt'],
        'deleted_at': exercise['deletedAt'],
        'visibility': exercise['visibility'],
    }
    cursor = get_db().cursor()
    if exists:
        assignments = ', '.join(f'{name} = %s' for name in columns)
        cursor.execute(f'UPDATE exercises SET {assignments} WHERE id = %s', (*columns.values(), exercise['id']))
    else:
        names = ', '.join(['id', *columns])
        placeholders = ', '.join(['%s'] * (len(columns) + 1))
        cursor.execute(f'INSERT INTO exercises ({names}) VALUES ({placeholders})', (exercise['id'], *columns.values()))

    cursor.execute('DELETE FROM exercise_focus WHERE exercise_id = %s', (exercise['id'],))
    for position, tag in enumerate(exercise['focus']):
        cursor.execute(
            'INSERT INTO exercise_focus (exercise_id, tag, position) VALUES (%s, %s, %s)',
            (exercise['id'], tag, position),
        )
    cursor.close()


FAVORITE_STATS = (
    '(SELECT COUNT(*) FROM exercise_favorites fc WHERE fc.exercise_id = e.id) AS favorite_count, '
    'EXISTS (SELECT 1 FROM exercise_favorites fm WHERE fm.exercise_id = e.id AND fm.user_id = %s) AS favorited, '
    f'(SELECT ROUND(AVG(cr.stars), 1) {OTHERS_RATINGS}) AS rating_average, '
    f'(SELECT COUNT(*) {OTHERS_RATINGS}) AS rating_count'
)


def rating_average(value):
    """One decimal, or None when no other coach rated it. MariaDB gives a Decimal."""
    return None if value is None else float(value)


def listing_response(build, viewer_id=None):
    """With a viewer, each exercise also carries its author's name, how many coaches saved it and
    whether the viewer did, and the average and number of other coaches' ratings."""
    try:
        where, params, order, order_params, limit, offset = build()
    except InvalidFilter:
        return jsonify({'error': 'invalidFilter'}), 400

    total = query_one(f'SELECT COUNT(*) AS total FROM exercises e WHERE {where}', params)['total']
    if viewer_id is None:
        rows = query_all(
            f'SELECT e.* FROM exercises e WHERE {where} ORDER BY {order} LIMIT %s OFFSET %s',
            [*params, *order_params, limit, offset],
        )
    else:
        rows = query_all(
            f'SELECT e.*, u.display_name AS author_name, {FAVORITE_STATS} FROM exercises e '
            f'JOIN users u ON u.id = e.owner_id WHERE {where} ORDER BY {order} LIMIT %s OFFSET %s',
            [viewer_id, *params, *order_params, limit, offset],
        )
    focus = _focus_by_exercise([row['id'] for row in rows])
    exercises = []
    for row in rows:
        exercise = _to_exercise(row, focus.get(row['id'], []))
        if viewer_id is not None:
            exercise['authorName'] = row['author_name']
            exercise['favoriteCount'] = row['favorite_count']
            exercise['favorited'] = bool(row['favorited'])
            exercise['ratingAverage'] = rating_average(row['rating_average'])
            exercise['ratingCount'] = row['rating_count']
        exercises.append(exercise)
    return jsonify({'exercises': exercises, 'total': total})


@bp.get('/exercises')
@require_user
def list_exercises():
    """The caller's own exercises."""
    return listing_response(lambda: build_listing(request.args, g.user_id))


@bp.get('/library')
@require_user
def library():
    """Public exercises from every coach. Browsing needs an account but not a plan."""
    return listing_response(lambda: build_library(request.args, g.user_id), viewer_id=g.user_id)


@bp.put('/exercises/<exercise_id>')
@require_user
@rate_limited('saves', current_user)
def save_exercise(exercise_id):
    try:
        exercise = parse_exercise(request.get_json(silent=True))
    except ExerciseParseError as error:
        return jsonify({'error': error.code}), 400
    if exercise['id'] != exercise_id.lower():
        return jsonify({'error': 'invalidId'}), 400

    for last_attempt in (False, True):
        # Locks the row if it exists, so two saves can't both pass the ownership check
        existing = query_one('SELECT owner_id FROM exercises WHERE id = %s FOR UPDATE', (exercise['id'],))
        if existing and existing['owner_id'] != g.user_id:
            return jsonify({'error': 'exerciseNotOwned'}), 403
        # A coach whose plan has ended can still remove what they uploaded
        removing_own = existing is not None and exercise['deletedAt'] is not None
        if not removing_own and not has_active_plan(g.user_id):
            return jsonify({'error': 'planRequired'}), 403
        try:
            _write_exercise(exercise, g.user_id, exists=existing is not None)
            get_db().commit()
            break
        except mysql.connector.IntegrityError as error:
            # Someone else created this id just after the check, so check again who owns it
            get_db().rollback()
            if last_attempt or error.errno != DUPLICATE_KEY:
                raise

    return jsonify(_load_exercise(exercise['id']))


@bp.get('/exercises/<exercise_id>')
@require_user
def get_exercise(exercise_id):
    """Any signed-in install can read by id: the unguessable id is what a share link carries."""
    exercise_id = exercise_id.lower()
    exercise = _load_exercise(exercise_id)
    if exercise is None or exercise['deletedAt'] is not None:
        return jsonify({'error': 'notFound'}), 404
    if exercise['ownerId'] != g.user_id and _is_hidden(exercise_id):
        return jsonify({'error': 'notFound'}), 404
    return jsonify(exercise)


def _is_hidden(exercise_id):
    """Hidden by reports, waiting for the moderator. Its author still sees it."""
    return query_one('SELECT hidden_at FROM exercises WHERE id = %s', (exercise_id,))['hidden_at'] is not None

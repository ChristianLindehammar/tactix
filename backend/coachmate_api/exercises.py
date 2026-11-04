import json

from flask import Blueprint, g, jsonify, request

from .auth import require_user
from .db import get_db, query_one
from .validation import SCHEMA_VERSION, ExerciseParseError, parse_exercise

bp = Blueprint('exercises', __name__)


def _format_date(value):
    return None if value is None else value.strftime('%Y-%m-%dT%H:%M:%S.') + f'{value.microsecond // 1000:03d}Z'


def _load_exercise(exercise_id):
    row = query_one('SELECT * FROM exercises WHERE id = %s', (exercise_id,))
    if row is None:
        return None

    cursor = get_db().cursor()
    cursor.execute('SELECT tag FROM exercise_focus WHERE exercise_id = %s ORDER BY position', (exercise_id,))
    focus = [tag for (tag,) in cursor.fetchall()]
    cursor.close()

    return {
        'schemaVersion': row['schema_version'],
        'id': row['id'],
        'ownerId': row['owner_id'],
        'clonedFromId': row['cloned_from_id'],
        'sport': row['sport'],
        'title': row['title'],
        'description': row['description'],
        'coachingPoints': json.loads(row['coaching_points']),
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
    }


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


@bp.put('/exercises/<exercise_id>')
@require_user
def save_exercise(exercise_id):
    try:
        exercise = parse_exercise(request.get_json(silent=True))
    except ExerciseParseError as error:
        return jsonify({'error': error.code}), 400
    if exercise['id'] != exercise_id.lower():
        return jsonify({'error': 'invalidId'}), 400

    # Locks the row, so two saves can't both pass the ownership check
    existing = query_one('SELECT owner_id FROM exercises WHERE id = %s FOR UPDATE', (exercise['id'],))
    if existing and existing['owner_id'] != g.user_id:
        return jsonify({'error': 'exerciseNotOwned'}), 403

    _write_exercise(exercise, g.user_id, exists=existing is not None)
    get_db().commit()
    return jsonify(_load_exercise(exercise['id']))


@bp.get('/exercises/<exercise_id>')
@require_user
def get_exercise(exercise_id):
    """Any signed-in install can read by id: the unguessable id is what a share link carries."""
    exercise = _load_exercise(exercise_id.lower())
    if exercise is None or exercise['deletedAt'] is not None:
        return jsonify({'error': 'notFound'}), 404
    return jsonify(exercise)

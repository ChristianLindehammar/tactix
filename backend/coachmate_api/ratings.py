"""Each coach's own star ratings. The app keeps them on the device and uploads them here, so the
library can filter and sort by them and they follow the coach to a new phone."""
from flask import Blueprint, g, jsonify, request

from .auth import require_user
from .db import get_db, query_all, query_one
from .exercises import _format_date
from .favorites import _readable
from .rate_limit import current_user, rate_limited
from .validation import ExerciseParseError, parse_date

bp = Blueprint('ratings', __name__)


def _is_stars(value):
    # bool is an int in Python, but true isn't a number of stars
    return value is None or (isinstance(value, int) and not isinstance(value, bool) and 1 <= value <= 5)


def _to_rating(row):
    return {'exerciseId': row['exercise_id'], 'stars': row['stars'], 'updatedAt': _format_date(row['updated_at'])}


@bp.get('/ratings')
@require_user
def list_ratings():
    rows = query_all(
        'SELECT exercise_id, stars, updated_at FROM exercise_ratings WHERE user_id = %s ORDER BY updated_at',
        (g.user_id,),
    )
    return jsonify({'ratings': [_to_rating(row) for row in rows]})


@bp.put('/exercises/<exercise_id>/rating')
@require_user
@rate_limited('ratings', current_user)
def set_rating(exercise_id):
    exercise_id = exercise_id.lower()
    if _readable(exercise_id) is None:
        return jsonify({'error': 'notFound'}), 404
    body = request.get_json(silent=True) or {}
    stars = body.get('stars')
    if not _is_stars(stars):
        return jsonify({'error': 'invalidRating'}), 400
    try:
        updated_at = parse_date(body.get('updatedAt'))
    except ExerciseParseError as error:
        return jsonify({'error': error.code}), 400
    connection = get_db()
    cursor = connection.cursor()
    cursor.execute(
        'INSERT INTO exercise_ratings (exercise_id, user_id, stars, updated_at) VALUES (%s, %s, %s, %s) '
        # Newest wins, so a change made earlier on another phone can't undo this one. stars is set
        # first, while updated_at still holds the stored time
        'ON DUPLICATE KEY UPDATE stars = IF(VALUES(updated_at) > updated_at, VALUES(stars), stars), '
        'updated_at = GREATEST(updated_at, VALUES(updated_at))',
        (exercise_id, g.user_id, stars, updated_at),
    )
    connection.commit()
    cursor.close()
    stored = query_one(
        'SELECT exercise_id, stars, updated_at FROM exercise_ratings WHERE exercise_id = %s AND user_id = %s',
        (exercise_id, g.user_id),
    )
    return jsonify(_to_rating(stored))

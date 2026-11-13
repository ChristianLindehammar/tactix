"""Coaches saving exercises they like, to find them again, and seeing how many coaches saved one."""
from flask import Blueprint, g, jsonify, request

from .auth import require_user
from .db import get_db, query_one
from .exercises import listing_response
from .listing import build_favorites

bp = Blueprint('favorites', __name__)


def _favorite_state(exercise_id):
    row = query_one(
        'SELECT COUNT(*) AS favorite_count, COALESCE(SUM(user_id = %s), 0) AS favorited '
        'FROM exercise_favorites WHERE exercise_id = %s',
        (g.user_id, exercise_id),
    )
    return jsonify({'favoriteCount': row['favorite_count'], 'favorited': bool(row['favorited'])})


def _readable(exercise_id):
    """Exists for the caller: not deleted, and not hidden by reports unless it's theirs."""
    exercise = query_one(
        'SELECT owner_id, hidden_at FROM exercises WHERE id = %s AND deleted_at IS NULL', (exercise_id,)
    )
    if exercise is None or (exercise['hidden_at'] is not None and exercise['owner_id'] != g.user_id):
        return None
    return exercise


@bp.get('/favorites')
@require_user
def list_favorites():
    """The exercises the caller saved, filtered like the library."""
    return listing_response(lambda: build_favorites(request.args, g.user_id), viewer_id=g.user_id)


@bp.get('/exercises/<exercise_id>/favorite')
@require_user
def get_favorite(exercise_id):
    """How many coaches saved it, and whether the caller did. Its author can see this too."""
    exercise_id = exercise_id.lower()
    if _readable(exercise_id) is None:
        return jsonify({'error': 'notFound'}), 404
    return _favorite_state(exercise_id)


@bp.put('/exercises/<exercise_id>/favorite')
@require_user
def add_favorite(exercise_id):
    """Saving an exercise twice changes nothing. Coaches can't save their own, which would only
    add to its count."""
    exercise_id = exercise_id.lower()
    exercise = _readable(exercise_id)
    if exercise is None:
        return jsonify({'error': 'notFound'}), 404
    if exercise['owner_id'] == g.user_id:
        return jsonify({'error': 'ownExercise'}), 400
    connection = get_db()
    cursor = connection.cursor()
    cursor.execute(
        'INSERT IGNORE INTO exercise_favorites (exercise_id, user_id, created_at) VALUES (%s, %s, UTC_TIMESTAMP(3))',
        (exercise_id, g.user_id),
    )
    connection.commit()
    cursor.close()
    return _favorite_state(exercise_id)


@bp.delete('/exercises/<exercise_id>/favorite')
@require_user
def remove_favorite(exercise_id):
    """Works even after the exercise is gone, so a coach can always tidy up."""
    exercise_id = exercise_id.lower()
    connection = get_db()
    cursor = connection.cursor()
    cursor.execute('DELETE FROM exercise_favorites WHERE exercise_id = %s AND user_id = %s', (exercise_id, g.user_id))
    connection.commit()
    cursor.close()
    return _favorite_state(exercise_id)

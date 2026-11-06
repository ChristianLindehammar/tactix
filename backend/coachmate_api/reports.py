"""Coaches reporting public exercises and blocking other coaches, as the app stores require for
content made by users.
A report hides the exercise from whoever made it at once. Enough coaches hide it from everyone
until the moderator looks, so no single coach can take down someone else's work."""
import logging
from datetime import datetime, timezone

from flask import Blueprint, current_app, g, jsonify, request

from .auth import require_user
from .db import get_db, query_one
from .rate_limit import current_user, rate_limited

logger = logging.getLogger('coachmate')

bp = Blueprint('reports', __name__)

HIDE_AFTER_REPORTS = 3
MAX_REASON_LENGTH = 1000


@bp.post('/exercises/<exercise_id>/report')
@require_user
@rate_limited('reports', current_user)
def report_exercise(exercise_id):
    exercise = query_one(
        'SELECT id, owner_id, title FROM exercises WHERE id = %s AND deleted_at IS NULL', (exercise_id.lower(),)
    )
    if exercise is None:
        return jsonify({'error': 'notFound'}), 404
    if exercise['owner_id'] == g.user_id:
        return jsonify({'error': 'ownExercise'}), 400
    reason = (request.get_json(silent=True) or {}).get('reason')
    if reason is not None and not (isinstance(reason, str) and len(reason) <= MAX_REASON_LENGTH):
        return jsonify({'error': 'invalidReason'}), 400

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    connection = get_db()
    cursor = connection.cursor()
    cursor.execute(
        'INSERT IGNORE INTO exercise_reports (exercise_id, reporter_id, reason, created_at) VALUES (%s, %s, %s, %s)',
        (exercise['id'], g.user_id, reason, now),
    )
    is_new = cursor.rowcount == 1
    cursor.execute('SELECT COUNT(*) FROM exercise_reports WHERE exercise_id = %s', (exercise['id'],))
    reports = cursor.fetchone()[0]
    if reports >= HIDE_AFTER_REPORTS:
        cursor.execute('UPDATE exercises SET hidden_at = %s WHERE id = %s AND hidden_at IS NULL', (now, exercise['id']))
    connection.commit()
    cursor.close()

    notify = current_app.config['NOTIFY_REPORT']
    if is_new and reports == 1 and notify:
        # The report is saved either way, and the moderator can find it without the notice
        try:
            notify(exerciseId=exercise['id'], title=exercise['title'], reason=reason)
        except Exception as error:  # noqa: BLE001
            logger.error('Could not pass on a report of %s: %s', exercise['id'], error)
    return current_app.response_class(status=204)


def _change_block(user_id, sql):
    user_id = user_id.lower()
    if user_id == g.user_id:
        return jsonify({'error': 'ownAccount'}), 400
    if query_one('SELECT id FROM users WHERE id = %s', (user_id,)) is None:
        return jsonify({'error': 'notFound'}), 404
    connection = get_db()
    cursor = connection.cursor()
    cursor.execute(sql, (g.user_id, user_id))
    connection.commit()
    cursor.close()
    return current_app.response_class(status=204)


@bp.post('/users/<user_id>/block')
@require_user
def block_user(user_id):
    return _change_block(
        user_id,
        'INSERT IGNORE INTO user_blocks (blocker_id, blocked_id, created_at) VALUES (%s, %s, UTC_TIMESTAMP(3))',
    )


@bp.delete('/users/<user_id>/block')
@require_user
def unblock_user(user_id):
    return _change_block(user_id, 'DELETE FROM user_blocks WHERE blocker_id = %s AND blocked_id = %s')

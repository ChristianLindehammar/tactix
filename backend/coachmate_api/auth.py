"""Anonymous per-install identity. Only a hash of each token is stored."""
import hashlib
import secrets
import uuid
from datetime import datetime, timezone
from functools import wraps

from flask import Blueprint, g, jsonify, request

from .db import get_db, query_one
from .rate_limit import client_address, rate_limited

bp = Blueprint('auth', __name__)


def _hash(token):
    return hashlib.sha256(token.encode('utf-8')).hexdigest()


@bp.post('/devices')
@rate_limited('devices', client_address)
def register_device():
    user_id = str(uuid.uuid4())
    token = secrets.token_urlsafe(32)
    now = datetime.now(timezone.utc).replace(tzinfo=None)

    connection = get_db()
    cursor = connection.cursor()
    cursor.execute('INSERT INTO users (id, created_at) VALUES (%s, %s)', (user_id, now))
    cursor.execute(
        'INSERT INTO api_tokens (token_hash, user_id, created_at) VALUES (%s, %s, %s)',
        (_hash(token), user_id, now),
    )
    connection.commit()
    cursor.close()
    return jsonify({'userId': user_id, 'token': token}), 201


def require_user(view):
    """Puts the caller's user id in g.user_id, or answers 401."""

    @wraps(view)
    def wrapper(*args, **kwargs):
        scheme, _, token = request.headers.get('Authorization', '').partition(' ')
        row = None
        if scheme == 'Bearer' and token:
            row = query_one(
                'SELECT user_id FROM api_tokens WHERE token_hash = %s AND revoked_at IS NULL',
                (_hash(token),),
            )
        if row is None:
            return jsonify({'error': 'unauthorized'}), 401
        g.user_id = row['user_id']
        return view(*args, **kwargs)

    return wrapper

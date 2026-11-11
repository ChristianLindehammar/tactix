"""Sessions. Only a hash of each token is stored."""
import hashlib
from functools import wraps

from flask import g, jsonify, request

from .db import query_one

SESSION_COOKIE = 'coachmate_session'
SESSION_COOKIE_DAYS = 90
WEB_CLIENT_HEADER = 'X-CoachMate-Client'


def hash_token(token):
    return hashlib.sha256(token.encode('utf-8')).hexdigest()


def presented_token():
    """The session token this request carries, or None. Apps send a header. The web app has a
    cookie, which browsers attach by themselves, so changes must also carry a header that another
    site's page can't add."""
    scheme, _, token = request.headers.get('Authorization', '').partition(' ')
    if scheme == 'Bearer' and token:
        return token
    cookie = request.cookies.get(SESSION_COOKIE)
    if not cookie:
        return None
    if request.method not in ('GET', 'HEAD') and request.headers.get(WEB_CLIENT_HEADER) != 'web':
        return None
    return cookie


def set_session_cookie(response, token):
    response.set_cookie(
        SESSION_COOKIE, token, max_age=SESSION_COOKIE_DAYS * 86400,
        path=request.script_root or '/', secure=True, httponly=True, samesite='Strict',
    )


def clear_session_cookie(response):
    response.delete_cookie(SESSION_COOKIE, path=request.script_root or '/', secure=True, httponly=True, samesite='Strict')


def require_user(view):
    """Puts the caller's user id in g.user_id, or answers 401."""

    @wraps(view)
    def wrapper(*args, **kwargs):
        token = presented_token()
        row = None
        if token:
            row = query_one(
                'SELECT user_id FROM api_tokens WHERE token_hash = %s AND revoked_at IS NULL',
                (hash_token(token),),
            )
        if row is None:
            return jsonify({'error': 'unauthorized'}), 401
        g.user_id = row['user_id']
        return view(*args, **kwargs)

    return wrapper

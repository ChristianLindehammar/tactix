"""Accounts: signing in with an emailed code, Apple or Google, and what a signed-in coach can do."""
import hashlib
import logging
import re
import secrets
import uuid
from datetime import datetime, timezone

import mysql.connector
from flask import Blueprint, current_app, g, jsonify, request

from .auth import clear_session_cookie, hash_token, presented_token, require_user, set_session_cookie
from .db import get_db, query_one
from .provider_tokens import InvalidProviderToken, ProviderUnavailable
from .plans import plan_of
from .rate_limit import client_address, rate_limited

logger = logging.getLogger('coachmate')

bp = Blueprint('accounts', __name__)

CODE_LIFETIME_SECONDS = 600
MAX_CODE_ATTEMPTS = 5
MAX_EMAIL_LENGTH = 254
EMAIL_PATTERN = re.compile(r'[^\s@]+@[^\s@.]+(\.[^\s@.]+)+')


def _digest(*parts):
    return hashlib.sha256(':'.join(parts).encode('utf-8')).hexdigest()


def _utcnow():
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _now():
    return int(current_app.config['CLOCK']())


def _normalized_email(value):
    """The email in the one form we store it, or None if it can't be an address."""
    if not isinstance(value, str):
        return None
    email = value.strip().lower()
    if len(email) > MAX_EMAIL_LENGTH or not EMAIL_PATTERN.fullmatch(email):
        return None
    return email


def _requested_email():
    return _normalized_email((request.get_json(silent=True) or {}).get('email')) or 'invalid'


def _invalid_code():
    # The same answer for every failure, so nobody can tell which addresses have a code waiting
    return jsonify({'error': 'invalidCode'}), 400


def _delete_expired_codes():
    """In its own transaction. Failing is harmless: the next code tries again."""
    connection = get_db()
    try:
        cursor = connection.cursor()
        cursor.execute('DELETE FROM sign_in_codes WHERE expires_at <= %s', (_now(),))
        cursor.close()
        connection.commit()
    except mysql.connector.Error as error:
        logger.warning('Could not delete expired sign-in codes: %s', error)
        connection.rollback()


def _new_account(cursor):
    user_id = str(uuid.uuid4())
    cursor.execute('INSERT INTO users (id, created_at) VALUES (%s, %s)', (user_id, _utcnow()))
    return user_id


def _account_for_email(cursor, email):
    # Two first sign-ins at once must end up in one account
    cursor.execute(
        'INSERT IGNORE INTO users (id, email, created_at) VALUES (%s, %s, %s)',
        (str(uuid.uuid4()), email, _utcnow()),
    )
    cursor.execute('SELECT id FROM users WHERE email = %s', (email,))
    return cursor.fetchone()[0]


def _signed_in(connection, cursor, user_id, email, body):
    """Starts a session and commits. The web app gets it as a cookie that scripts can't read."""
    token = secrets.token_urlsafe(32)
    cursor.execute(
        'INSERT INTO api_tokens (token_hash, user_id, created_at) VALUES (%s, %s, %s)',
        (hash_token(token), user_id, _utcnow()),
    )
    connection.commit()
    cursor.close()
    if body.get('session') == 'cookie':
        response = jsonify({'userId': user_id, 'email': email})
        set_session_cookie(response, token)
        return response
    return jsonify({'userId': user_id, 'email': email, 'token': token})


@bp.post('/auth/email/start')
@rate_limited('emailCodesPerAddress', client_address)
@rate_limited('emailCodes', _requested_email)
def start_email_sign_in():
    body = request.get_json(silent=True) or {}
    email = _normalized_email(body.get('email'))
    if email is None:
        return jsonify({'error': 'invalidEmail'}), 400

    code = f'{secrets.randbelow(1_000_000):06d}'
    connection = get_db()
    cursor = connection.cursor()
    cursor.execute(
        'INSERT INTO sign_in_codes (email_hash, code_hash, expires_at, attempts) VALUES (%s, %s, %s, 0) '
        'ON DUPLICATE KEY UPDATE code_hash = VALUES(code_hash), expires_at = VALUES(expires_at), attempts = 0',
        (_digest(email), _digest(email, code), _now() + CODE_LIFETIME_SECONDS),
    )
    cursor.close()
    connection.commit()
    _delete_expired_codes()

    try:
        current_app.config['SEND_SIGN_IN_CODE'](email, code, body.get('locale'))
    except Exception as error:  # noqa: BLE001 - mail failures have many types
        # Only the type: the message can hold the address or the code
        logger.error('Could not send a sign-in code: %s', type(error).__name__)
        return jsonify({'error': 'serviceUnavailable'}), 503
    return jsonify({'status': 'sent'}), 202


@bp.post('/auth/email/verify')
def verify_email_sign_in():
    body = request.get_json(silent=True) or {}
    email, code = _normalized_email(body.get('email')), body.get('code')
    if email is None or not isinstance(code, str):
        return _invalid_code()

    email_hash = _digest(email)
    connection = get_db()
    cursor = connection.cursor()
    # Counted and committed before comparing, so parallel guesses can't share one attempt
    cursor.execute(
        'UPDATE sign_in_codes SET attempts = attempts + 1 '
        'WHERE email_hash = %s AND attempts < %s AND expires_at > %s',
        (email_hash, MAX_CODE_ATTEMPTS, _now()),
    )
    usable = cursor.rowcount == 1
    connection.commit()
    row = query_one('SELECT code_hash FROM sign_in_codes WHERE email_hash = %s', (email_hash,)) if usable else None
    if row is None or not secrets.compare_digest(row['code_hash'], _digest(email, code.strip())):
        cursor.close()
        return _invalid_code()

    # Whoever deletes the row owns the code, so it can only be used once
    cursor.execute('DELETE FROM sign_in_codes WHERE email_hash = %s', (email_hash,))
    if cursor.rowcount != 1:
        connection.commit()
        cursor.close()
        return _invalid_code()

    user_id = _account_for_email(cursor, email)
    return _signed_in(connection, cursor, user_id, email, body)


@bp.post('/auth/provider')
@rate_limited('providerSignIns', client_address)
def provider_sign_in():
    body = request.get_json(silent=True) or {}
    provider, id_token = body.get('provider'), body.get('idToken')
    if not isinstance(provider, str) or not isinstance(id_token, str):
        return jsonify({'error': 'invalidProviderToken'}), 401
    verifier = current_app.config['PROVIDER_VERIFIER']
    try:
        if verifier is None:
            raise ProviderUnavailable(provider)
        identity = verifier.verify(provider, id_token, body.get('nonce'))
    except InvalidProviderToken:
        return jsonify({'error': 'invalidProviderToken'}), 401
    except ProviderUnavailable:
        logger.error('Could not check a sign-in token from %s', provider)
        return jsonify({'error': 'serviceUnavailable'}), 503

    connection = get_db()
    cursor = connection.cursor()
    cursor.execute(
        'SELECT user_id FROM user_identities WHERE provider = %s AND subject = %s',
        (provider, identity.subject),
    )
    row = cursor.fetchone()
    if row:
        user_id = row[0]
    else:
        # A verified email joins the account that address already has, whichever way it signed in
        user_id = _account_for_email(cursor, identity.email) if identity.email else _new_account(cursor)
        cursor.execute(
            'INSERT IGNORE INTO user_identities (provider, subject, user_id, created_at) VALUES (%s, %s, %s, %s)',
            (provider, identity.subject, user_id, _utcnow()),
        )
        # If a parallel first sign-in got there first, its account is the one that counts
        cursor.execute(
            'SELECT user_id FROM user_identities WHERE provider = %s AND subject = %s',
            (provider, identity.subject),
        )
        user_id = cursor.fetchone()[0]
    cursor.execute('SELECT email FROM users WHERE id = %s', (user_id,))
    email = cursor.fetchone()[0]
    return _signed_in(connection, cursor, user_id, email, body)


@bp.post('/auth/sign-out')
@require_user
def sign_out():
    connection = get_db()
    cursor = connection.cursor()
    cursor.execute(
        'UPDATE api_tokens SET revoked_at = %s WHERE token_hash = %s',
        (_utcnow(), hash_token(presented_token())),
    )
    connection.commit()
    cursor.close()
    response = current_app.response_class(status=204)
    clear_session_cookie(response)
    return response


@bp.get('/me')
@require_user
def me():
    row = query_one('SELECT id, email, plan_expires_at FROM users WHERE id = %s', (g.user_id,))
    return jsonify({'userId': row['id'], 'email': row['email'], 'plan': plan_of(row['plan_expires_at'])})


@bp.delete('/me')
@require_user
def delete_account():
    """Removes the coach for good, as the App Store and Play Store require. Unlike a soft-deleted
    exercise, nothing is kept. exercise_focus and user_identities go by cascade."""
    connection = get_db()
    cursor = connection.cursor()
    cursor.execute('SELECT email FROM users WHERE id = %s', (g.user_id,))
    email = cursor.fetchone()[0]
    if email:
        cursor.execute('DELETE FROM sign_in_codes WHERE email_hash = %s', (_digest(email),))
    cursor.execute('DELETE FROM exercises WHERE owner_id = %s', (g.user_id,))
    cursor.execute('DELETE FROM api_tokens WHERE user_id = %s', (g.user_id,))
    cursor.execute('DELETE FROM users WHERE id = %s', (g.user_id,))
    connection.commit()
    cursor.close()
    response = current_app.response_class(status=204)
    clear_session_cookie(response)
    return response

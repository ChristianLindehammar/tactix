"""Fixed-window limits, counted in the database because Passenger runs several processes."""
import hashlib
import ipaddress
import logging
import math
from functools import wraps

import mysql.connector
from flask import current_app, g, jsonify, request

from .db import get_db

logger = logging.getLogger('coachmate')

# Requests per window, in seconds. A shared club or mobile network can put many coaches
# behind one address, so registering allows more than a single install would ever need.
DEFAULT_LIMITS = {
    'devices': (20, 3600),
    'saves': (300, 3600),
}


def client_address():
    """The caller's address, or its /64 network on IPv6, where one customer holds a whole
    network. Forwarded headers are ignored: anyone could forge them to get around the limit."""
    address = request.remote_addr or 'unknown'
    try:
        parsed = ipaddress.ip_address(address)
    except ValueError:
        return address
    if parsed.version == 4:
        return str(parsed)
    if parsed.ipv4_mapped:
        return str(parsed.ipv4_mapped)
    return str(ipaddress.ip_network(f'{parsed}/64', strict=False))


def current_user():
    return g.user_id


def _count_hit(bucket, identity):
    """Returns the hits in this window, and the seconds until the next one."""
    limit_window = current_app.config['RATE_LIMITS'][bucket][1]
    now = current_app.config['CLOCK']()
    window_start = int(now // limit_window) * limit_window
    expires_at = window_start + limit_window
    # Hashed, so the table holds no readable addresses. Rows are deleted once they expire.
    key = hashlib.sha256(f'{bucket}:{identity}'.encode('utf-8')).hexdigest()

    connection = get_db()
    cursor = connection.cursor()
    cursor.execute(
        'INSERT INTO rate_limits (key_hash, window_start, expires_at, hits) VALUES (%s, %s, %s, 1) '
        'ON DUPLICATE KEY UPDATE hits = hits + 1',
        (key, window_start, expires_at),
    )
    started_new_count = cursor.rowcount == 1
    cursor.execute('SELECT hits FROM rate_limits WHERE key_hash = %s AND window_start = %s', (key, window_start))
    hits = cursor.fetchone()[0]
    cursor.close()
    # Counted even if the request goes on to fail, and the row lock isn't held any longer
    connection.commit()
    if started_new_count:
        _delete_expired(now)
    return hits, math.ceil(expires_at - now)


def _delete_expired(now):
    """In its own transaction, so it can't deadlock with a count. Failing is harmless:
    the rows only take up space, and the next new count tries again."""
    connection = get_db()
    try:
        cursor = connection.cursor()
        cursor.execute('DELETE FROM rate_limits WHERE expires_at <= %s', (int(now),))
        cursor.close()
        connection.commit()
    except mysql.connector.Error as error:
        logger.warning('Could not delete expired rate limits: %s', error)
        connection.rollback()


def rate_limited(bucket, identify):
    def decorator(view):
        @wraps(view)
        def wrapper(*args, **kwargs):
            hits, retry_after = _count_hit(bucket, identify())
            if hits > current_app.config['RATE_LIMITS'][bucket][0]:
                response = jsonify({'error': 'rateLimited'})
                response.headers['Retry-After'] = str(retry_after)
                return response, 429
            return view(*args, **kwargs)

        return wrapper

    return decorator

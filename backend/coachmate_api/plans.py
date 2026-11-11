"""Who has a paid plan. RevenueCat doesn't promise to deliver events in order, so a webhook only
says that something changed, and the current state is always asked for."""
import hmac
import json
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone

from flask import Blueprint, current_app, g, jsonify, request

from .auth import require_user
from .db import get_db, query_all, query_one
from .rate_limit import current_user, rate_limited

bp = Blueprint('plans', __name__)


REVENUECAT_SUBSCRIBERS = 'https://api.revenuecat.com/v1/subscribers/'
# RevenueCat gives no end date for an entitlement that never ends, such as one granted by hand
NEVER_ENDS = 4_102_444_800


class PlanSourceUnavailable(Exception):
    """RevenueCat couldn't be asked, which says nothing about the coach's plan."""


def _fetch_from_revenuecat(url, api_key):
    request_ = urllib.request.Request(url, headers={'Authorization': f'Bearer {api_key}'})
    try:
        with urllib.request.urlopen(request_, timeout=10) as response:
            return json.load(response)
    except (urllib.error.URLError, TimeoutError, ValueError) as error:
        raise PlanSourceUnavailable() from error


def _seconds(date):
    return int(datetime.strptime(date, '%Y-%m-%dT%H:%M:%SZ').replace(tzinfo=timezone.utc).timestamp())


def revenuecat_plan_source(api_key, entitlement, fetch=_fetch_from_revenuecat):
    """Gives a function from a coach's ID to the end of their plan in seconds, or None. Asking
    creates the customer at RevenueCat if it's new, so it's only used for our own coaches."""

    def plan_end(user_id):
        answer = fetch(REVENUECAT_SUBSCRIBERS + urllib.parse.quote(user_id, safe=''), api_key)
        found = answer['subscriber']['entitlements'].get(entitlement)
        if found is None:
            return None
        if found.get('expires_date') is None:
            return NEVER_ENDS
        ends = [found['expires_date'], found.get('grace_period_expires_date')]
        return max(_seconds(date) for date in ends if date)

    return plan_end


def plan_of(expires_at):
    """How a coach's plan looks to the app, from the plan end in seconds."""
    if expires_at is None:
        return {'active': False, 'expiresAt': None}
    formatted = datetime.fromtimestamp(expires_at, timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.000Z')
    return {'active': expires_at > current_app.config['CLOCK'](), 'expiresAt': formatted}


def has_active_plan(user_id):
    expires_at = query_one('SELECT plan_expires_at FROM users WHERE id = %s', (user_id,))['plan_expires_at']
    return plan_of(expires_at)['active']


@bp.post('/webhooks/revenuecat')
def revenuecat_webhook():
    secret = current_app.config['PLAN_WEBHOOK_SECRET']
    presented = request.headers.get('Authorization', '')
    # With no secret set, nothing can get in
    if not secret or not hmac.compare_digest(presented.encode('utf-8'), secret.encode('utf-8')):
        return jsonify({'error': 'unauthorized'}), 401
    event = (request.get_json(silent=True) or {}).get('event') or {}
    try:
        _refresh_plans(_mentioned_ids(event))
    except PlanSourceUnavailable:
        return jsonify({'error': 'serviceUnavailable'}), 503
    # RevenueCat retries anything but a 200, so an event about nobody we know is still a success
    return jsonify({'status': 'ok'})


@bp.post('/me/plan/refresh')
@require_user
@rate_limited('planRefreshes', current_user)
def refresh_plan():
    """For the app to call after signing in or buying: RevenueCat doesn't announce that a purchase
    made while signed out now belongs to this account."""
    try:
        _refresh_plans([g.user_id])
    except PlanSourceUnavailable:
        return jsonify({'error': 'serviceUnavailable'}), 503
    expires_at = query_one('SELECT plan_expires_at FROM users WHERE id = %s', (g.user_id,))['plan_expires_at']
    return jsonify({'plan': plan_of(expires_at)})


def _mentioned_ids(event):
    """Every App User ID an event names. A coach's ID may be among the aliases, or in a transfer,
    when a purchase began on a device that wasn't signed in."""
    ids = {event.get('app_user_id'), event.get('original_app_user_id')}
    for field in ('aliases', 'transferred_from', 'transferred_to'):
        ids.update(event.get(field) or [])
    return [value for value in ids if isinstance(value, str)]


def _refresh_plans(ids):
    if not ids:
        return
    placeholders = ', '.join(['%s'] * len(ids))
    coaches = query_all(f'SELECT id FROM users WHERE id IN ({placeholders})', ids)
    # Asked for before writing, so no row is locked while waiting on the network
    source = current_app.config['PLAN_SOURCE']
    if source is None:
        raise PlanSourceUnavailable()
    plans = [(source(coach['id']), coach['id']) for coach in coaches]
    connection = get_db()
    cursor = connection.cursor()
    cursor.executemany('UPDATE users SET plan_expires_at = %s WHERE id = %s', plans)
    connection.commit()
    cursor.close()

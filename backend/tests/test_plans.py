import pytest

from coachmate_api import create_app
from coachmate_api.plans import PlanSourceUnavailable, revenuecat_plan_source
from tests.test_exercises import build_exercise

NOW = 1_800_000_000
DAY = 86_400
WEBHOOK_SECRET = 'webhook-secret'
WEBHOOK_HEADERS = {'Authorization': WEBHOOK_SECRET}


@pytest.fixture()
def store():
    """What RevenueCat would answer: the coach's plan end, in seconds, by App User ID."""
    return {}


@pytest.fixture()
def api(db_config, store):
    return create_app(
        db_config,
        clock=lambda: NOW,
        send_sign_in_code=lambda *_: None,
        plan_source=store.get,
        plan_webhook_secret=WEBHOOK_SECRET,
    ).test_client()


def user_id_of(api, coach):
    return api.get('/me', headers=coach).get_json()['userId']


def notify(api, app_user_id, aliases=(), headers=WEBHOOK_HEADERS):
    return api.post(
        '/webhooks/revenuecat',
        json={'api_version': '1.0', 'event': {
            'id': 'event-1', 'type': 'INITIAL_PURCHASE', 'app_user_id': app_user_id,
            'original_app_user_id': app_user_id, 'aliases': [app_user_id, *aliases],
        }},
        headers=headers,
    )


def test_a_purchase_gives_the_coach_an_active_plan(api, store, register):
    coach = register(paid=False)
    user_id = user_id_of(api, coach)
    store[user_id] = NOW + 14 * DAY

    response = notify(api, user_id)

    assert response.status_code == 200
    assert api.get('/me', headers=coach).get_json()['plan'] == {
        'active': True,
        'expiresAt': '2027-01-29T08:00:00.000Z',
    }


@pytest.mark.parametrize('headers', [{}, {'Authorization': 'guessed'}])
def test_a_forged_webhook_cannot_give_a_plan(api, store, register, headers):
    coach = register(paid=False)
    user_id = user_id_of(api, coach)
    store[user_id] = NOW + 14 * DAY

    response = notify(api, user_id, headers=headers)

    assert response.status_code == 401
    assert api.get('/me', headers=coach).get_json()['plan']['active'] is False


def test_a_coach_without_a_plan_cannot_upload(api, register):
    exercise = build_exercise()

    response = api.put(f"/exercises/{exercise['id']}", json=exercise, headers=register(paid=False))

    assert response.status_code == 403
    assert response.get_json()['error'] == 'planRequired'


class TestWhenAPlanEnds:
    def lapsed_coach_with_exercise(self, api, store, register):
        """Uploaded an exercise while paying, and the plan has since ended."""
        coach = register()
        exercise = build_exercise()
        assert api.put(f"/exercises/{exercise['id']}", json=exercise, headers=coach).status_code == 200
        user_id = user_id_of(api, coach)
        store[user_id] = NOW - DAY
        assert notify(api, user_id).status_code == 200
        return coach, exercise

    def test_the_coach_can_still_delete_their_exercise(self, api, store, register):
        coach, exercise = self.lapsed_coach_with_exercise(api, store, register)

        response = api.put(
            f"/exercises/{exercise['id']}",
            json={**exercise, 'deletedAt': '2027-01-15T08:00:00.000Z'},
            headers=coach,
        )

        assert response.status_code == 200

    def test_the_plan_ends_on_its_date_even_if_no_event_arrives(self, db_config, store, register):
        clock = {'now': NOW}
        api = create_app(
            db_config, clock=lambda: clock['now'], plan_source=store.get, plan_webhook_secret=WEBHOOK_SECRET,
        ).test_client()
        coach = register(paid=False)
        user_id = user_id_of(api, coach)
        store[user_id] = NOW + DAY
        notify(api, user_id)
        exercise = build_exercise()
        assert api.put(f"/exercises/{exercise['id']}", json=exercise, headers=coach).status_code == 200

        clock['now'] = NOW + 2 * DAY

        assert api.get('/me', headers=coach).get_json()['plan']['active'] is False
        assert api.put(f"/exercises/{exercise['id']}", json=exercise, headers=coach).status_code == 403
        assert api.get('/exercises', headers=coach).get_json()['total'] == 1


def test_a_purchase_made_before_signing_in_reaches_the_account_through_an_alias(api, store, register):
    coach = register(paid=False)
    user_id = user_id_of(api, coach)
    store[user_id] = NOW + DAY

    response = notify(api, '$RCAnonymousID:abc', aliases=[user_id])

    assert response.status_code == 200
    assert api.get('/me', headers=coach).get_json()['plan']['active'] is True


def test_an_event_about_someone_we_do_not_know_is_accepted(api):
    response = notify(api, '$RCAnonymousID:nobody')

    assert response.status_code == 200


def test_revenuecat_is_told_to_retry_if_the_plan_cannot_be_checked(db_config, register):
    def unavailable(_user_id):
        raise PlanSourceUnavailable()

    api = create_app(db_config, clock=lambda: NOW, plan_source=unavailable, plan_webhook_secret=WEBHOOK_SECRET).test_client()
    coach = register(paid=False)

    response = notify(api, user_id_of(api, coach))

    assert response.status_code == 503


class TestRefreshingAfterSigningIn:
    def test_a_coach_who_bought_before_signing_in_gets_their_plan(self, api, store, register):
        coach = register(paid=False)
        store[user_id_of(api, coach)] = NOW + DAY

        response = api.post('/me/plan/refresh', headers=coach)

        assert response.status_code == 200
        assert response.get_json()['plan']['active'] is True
        assert api.get('/me', headers=coach).get_json()['plan']['active'] is True


class TestAskingRevenueCat:
    def source(self, answer):
        calls = []

        def fetch(url, api_key):
            calls.append((url, api_key))
            return answer

        return revenuecat_plan_source('secret-key', 'premium', fetch), calls

    def test_gives_the_end_of_the_entitlement(self):
        source, calls = self.source({'subscriber': {'entitlements': {'premium': {
            'expires_date': '2027-01-29T08:00:00Z', 'grace_period_expires_date': None,
        }}}})

        assert source('user-1') == NOW + 14 * DAY
        assert calls == [('https://api.revenuecat.com/v1/subscribers/user-1', 'secret-key')]

    def test_counts_the_grace_period_while_a_payment_is_retried(self):
        source, _ = self.source({'subscriber': {'entitlements': {'premium': {
            'expires_date': '2027-01-15T08:00:00Z', 'grace_period_expires_date': '2027-01-29T08:00:00Z',
        }}}})

        assert source('user-1') == NOW + 14 * DAY

    def test_gives_nothing_without_the_entitlement(self):
        source, _ = self.source({'subscriber': {'entitlements': {'other': {'expires_date': '2027-01-29T08:00:00Z'}}}})

        assert source('user-1') is None

    def test_an_entitlement_with_no_end_date_does_not_end(self):
        source, _ = self.source({'subscriber': {'entitlements': {'premium': {'expires_date': None}}}})

        assert source('user-1') > NOW + 365 * DAY


def test_a_coach_is_told_if_the_plan_cannot_be_checked(db_config, register):
    api = create_app(db_config).test_client()

    response = api.post('/me/plan/refresh', headers=register(paid=False))

    assert response.status_code == 503

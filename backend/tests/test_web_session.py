import pytest

from coachmate_api import create_app
from tests.test_email_sign_in import Outbox
from tests.test_exercises import build_exercise

WEB = {'X-CoachMate-Client': 'web'}


@pytest.fixture()
def browser(db_config):
    """Keeps cookies between requests, like a browser."""
    outbox = Outbox()
    api = create_app(db_config, send_sign_in_code=outbox).test_client()
    api.post('/auth/email/start', json={'email': 'coach@example.com'})
    response = api.post(
        '/auth/email/verify',
        json={'email': 'coach@example.com', 'code': outbox.last_code, 'session': 'cookie'},
    )
    api.sign_in_response = response
    return api


def test_a_web_sign_in_gets_a_cookie_that_scripts_cannot_read(browser):
    response = browser.sign_in_response

    assert response.status_code == 200
    assert 'token' not in response.get_json()
    cookie = response.headers['Set-Cookie']
    assert 'HttpOnly' in cookie
    assert 'Secure' in cookie
    assert 'SameSite=Strict' in cookie
    assert browser.get('/me').get_json()['email'] == 'coach@example.com'


def test_the_cookie_covers_only_this_app_where_it_is_mounted(db_config):
    outbox = Outbox()
    api = create_app(db_config, send_sign_in_code=outbox).test_client()
    mounted = {'SCRIPT_NAME': '/coachmate/api'}
    api.post('/auth/email/start', json={'email': 'coach@example.com'}, environ_overrides=mounted)

    response = api.post(
        '/auth/email/verify',
        json={'email': 'coach@example.com', 'code': outbox.last_code, 'session': 'cookie'},
        environ_overrides=mounted,
    )

    assert 'Path=/coachmate/api' in response.headers['Set-Cookie']


def test_a_browser_saves_exercises_with_its_header(browser):
    exercise = build_exercise()

    response = browser.put(f"/exercises/{exercise['id']}", json=exercise, headers=WEB)

    assert response.status_code == 200


def test_another_sites_page_cannot_change_anything_with_the_cookie(browser):
    exercise = build_exercise()

    assert browser.put(f"/exercises/{exercise['id']}", json=exercise).status_code == 401
    assert browser.delete('/me').status_code == 401
    assert browser.post('/auth/sign-out').status_code == 401
    assert browser.get('/me').status_code == 200


def test_signing_out_ends_the_session_and_clears_the_cookie(browser):
    assert browser.post('/auth/sign-out', headers=WEB).status_code == 204

    assert browser.get('/me').status_code == 401
    assert browser.get_cookie('coachmate_session') is None


def test_deleting_the_account_clears_the_cookie(browser):
    assert browser.delete('/me', headers=WEB).status_code == 204

    assert browser.get_cookie('coachmate_session') is None

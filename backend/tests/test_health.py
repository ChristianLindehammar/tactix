from coachmate_api import create_app


def test_reports_healthy_when_the_database_answers(client):
    response = client.get('/health')

    assert response.status_code == 200
    assert response.get_json() == {'status': 'ok'}


def test_reports_unavailable_rather_than_failing_when_the_database_is_down(db_config):
    down = create_app({**db_config, 'port': 1, 'connection_timeout': 1}).test_client()

    response = down.get('/health')

    assert response.status_code == 503
    assert response.get_json() == {'error': 'serviceUnavailable'}


def test_an_outage_does_not_look_like_a_missing_exercise(db_config):
    down = create_app({**db_config, 'port': 1, 'connection_timeout': 1}).test_client()

    response = down.get(
        '/exercises/5f0c7f6e-3b5a-4a58-9c3e-0d7c3f1e2a10',
        headers={'Authorization': 'Bearer some-token'},
    )

    assert response.status_code == 503

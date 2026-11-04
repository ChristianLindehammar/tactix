def test_a_new_install_gets_its_own_identity_and_token(client):
    first = client.post('/devices')
    second = client.post('/devices')

    assert first.status_code == 201
    assert first.get_json()['userId'] != second.get_json()['userId']
    assert first.get_json()['token'] != second.get_json()['token']


def test_the_token_itself_is_not_stored(client, rows):
    token = client.post('/devices').get_json()['token']

    stored = rows('SELECT token_hash FROM api_tokens')[0][0]

    assert stored != token
    assert token not in stored

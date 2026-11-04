def test_a_new_install_gets_its_own_identity_and_token(client):
    first = client.post('/devices')
    second = client.post('/devices')

    assert first.status_code == 201
    assert first.get_json()['userId'] != second.get_json()['userId']
    assert first.get_json()['token'] != second.get_json()['token']


def test_the_token_itself_is_not_stored(client, db_config):
    import mysql.connector

    token = client.post('/devices').get_json()['token']

    connection = mysql.connector.connect(**db_config)
    cursor = connection.cursor()
    cursor.execute('SELECT token_hash FROM api_tokens')
    stored = cursor.fetchone()[0]
    connection.close()
    assert stored != token
    assert token not in stored

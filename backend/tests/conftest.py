import os

import mysql.connector
import pytest

from coachmate_api import create_app
from coachmate_api.migrations import migrate

SERVER = {
    'host': os.getenv('TEST_DB_HOST', '127.0.0.1'),
    'port': int(os.getenv('TEST_DB_PORT', '33306')),
    'user': os.getenv('TEST_DB_USER', 'root'),
    'password': os.getenv('TEST_DB_PASS', ''),
    'collation': 'utf8mb4_unicode_ci',
}
DB_NAME = 'coachmate_test'
DB_CONFIG = {**SERVER, 'database': DB_NAME}


@pytest.fixture()
def db_config():
    """A freshly migrated database for each test. Start it with scripts/test_db.sh."""
    server = mysql.connector.connect(**SERVER)
    cursor = server.cursor()
    # Fail fast rather than hang if a connection from an earlier test is still open
    cursor.execute('SET lock_wait_timeout = 5')
    cursor.execute(f'DROP DATABASE IF EXISTS {DB_NAME}')
    cursor.execute(f'CREATE DATABASE {DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci')
    server.close()
    migrate(DB_CONFIG)
    return DB_CONFIG


@pytest.fixture()
def rows(db_config):
    """Runs a query directly, for facts the API deliberately doesn't expose."""

    def _rows(sql):
        connection = mysql.connector.connect(**db_config)
        try:
            cursor = connection.cursor()
            cursor.execute(sql)
            return cursor.fetchall()
        finally:
            connection.close()

    return _rows


@pytest.fixture()
def client(db_config):
    return create_app(db_config).test_client()


@pytest.fixture()
def register(client):
    """Registers a new install and returns the headers that identify it."""

    def _register():
        response = client.post('/devices')
        assert response.status_code == 201
        return {'Authorization': f"Bearer {response.get_json()['token']}"}

    return _register

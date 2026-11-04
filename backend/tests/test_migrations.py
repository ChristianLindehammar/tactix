import mysql.connector

from coachmate_api.migrations import migrate


def test_running_again_changes_nothing(db_config):
    assert migrate(db_config) == []


def test_records_what_has_been_applied(db_config):
    connection = mysql.connector.connect(**db_config)
    cursor = connection.cursor()
    cursor.execute('SELECT filename FROM schema_migrations')
    applied = [row[0] for row in cursor.fetchall()]
    connection.close()
    assert '001_initial.sql' in applied

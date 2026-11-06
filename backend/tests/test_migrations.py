import mysql.connector

from coachmate_api.migrations import MIGRATIONS_DIR, migrate


def test_running_again_changes_nothing(db_config):
    assert migrate(db_config) == []


def test_records_what_has_been_applied(db_config):
    connection = mysql.connector.connect(**db_config)
    cursor = connection.cursor()
    cursor.execute('SELECT filename FROM schema_migrations')
    applied = [row[0] for row in cursor.fetchall()]
    connection.close()
    assert '001_initial.sql' in applied


def test_exercises_uploaded_before_the_public_library_stay_private(db_config, tmp_path):
    from tests.conftest import DB_NAME, SERVER

    server = mysql.connector.connect(**SERVER)
    cursor = server.cursor()
    cursor.execute(f'DROP DATABASE {DB_NAME}')
    cursor.execute(f'CREATE DATABASE {DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci')
    server.close()
    for path in sorted(MIGRATIONS_DIR.glob('*.sql')):
        if path.name < '005':
            (tmp_path / path.name).write_text(path.read_text(encoding='utf-8'), encoding='utf-8')
    migrate(db_config, tmp_path)

    connection = mysql.connector.connect(**db_config)
    cursor = connection.cursor()
    cursor.execute("INSERT INTO users (id, created_at) VALUES ('u1', UTC_TIMESTAMP())")
    cursor.execute(
        "INSERT INTO exercises (id, owner_id, schema_version, sport, title, description, coaching_points, "
        "custom_tags, locale, difficulty, phase, frames, created_at, updated_at) VALUES ('e1', 'u1', 1, "
        "'soccer', 'Rondo', '', '[]', '[]', 'sv', 2, 'main', '[]', UTC_TIMESTAMP(), UTC_TIMESTAMP())"
    )
    connection.commit()

    migrate(db_config)

    cursor.execute("SELECT visibility FROM exercises WHERE id = 'e1'")
    assert cursor.fetchone()[0] == 'private'
    connection.close()

"""Applies the numbered SQL files in migrations/, each one once and in order."""
from pathlib import Path

import mysql.connector

MIGRATIONS_DIR = Path(__file__).resolve().parent.parent / 'migrations'


def migrate(config, directory=MIGRATIONS_DIR):
    """Returns the files it applied. MariaDB can't roll back table changes, so a
    file that fails partway must be fixed by hand; it won't be recorded as applied."""
    connection = mysql.connector.connect(**config)
    try:
        cursor = connection.cursor()
        cursor.execute(
            'CREATE TABLE IF NOT EXISTS schema_migrations ('
            'filename VARCHAR(255) NOT NULL PRIMARY KEY, applied_at DATETIME NOT NULL)'
        )
        cursor.execute('SELECT filename FROM schema_migrations')
        done = {row[0] for row in cursor.fetchall()}

        applied = []
        for path in sorted(Path(directory).glob('*.sql')):
            if path.name in done:
                continue
            # Our own files, so splitting on semicolons is safe: keep them out of string values
            for statement in path.read_text(encoding='utf-8').split(';'):
                if statement.strip():
                    cursor.execute(statement)
            cursor.execute(
                'INSERT INTO schema_migrations (filename, applied_at) VALUES (%s, UTC_TIMESTAMP())',
                (path.name,),
            )
            connection.commit()
            applied.append(path.name)
        return applied
    finally:
        connection.close()

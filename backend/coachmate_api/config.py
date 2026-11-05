import os


def db_config_from_env():
    return {
        'host': os.getenv('DB_HOST', 'localhost'),
        'port': int(os.getenv('DB_PORT', '3306')),
        'database': os.environ['DB_NAME'],
        'user': os.environ['DB_USER'],
        'password': os.environ['DB_PASS'],
        'connection_timeout': 10,
        # The connector's default collation is MySQL-only, and MariaDB refuses it
        'collation': 'utf8mb4_unicode_ci',
    }


def _list_from_env(name):
    return [value.strip() for value in os.getenv(name, '').split(',') if value.strip()]


def provider_audiences_from_env():
    """Which apps' tokens we accept. A provider with none set can't be used to sign in."""
    return {'google': _list_from_env('GOOGLE_CLIENT_IDS'), 'apple': _list_from_env('APPLE_CLIENT_IDS')}

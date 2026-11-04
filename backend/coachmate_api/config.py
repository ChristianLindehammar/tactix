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

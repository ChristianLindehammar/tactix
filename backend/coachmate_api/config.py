import os
from pathlib import Path

from .apple_tokens import AppleTokens

from .plans import revenuecat_plan_source


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


def apple_tokens_from_env():
    """Revokes Apple sign-ins when accounts are deleted. None until every Apple setting is there."""
    names = ('APPLE_TEAM_ID', 'APPLE_KEY_ID', 'APPLE_PRIVATE_KEY_PATH', 'APPLE_TOKEN_KEY')
    team_id, key_id, key_path, seal_key = (os.getenv(name) for name in names)
    if not all((team_id, key_id, key_path, seal_key)):
        return None
    return AppleTokens(team_id, key_id, Path(key_path).read_text(encoding='utf-8'), seal_key)


def plan_source_from_env():
    """Asks RevenueCat about coaches' plans. Without a key, plans can't be checked."""
    api_key = os.getenv('REVENUECAT_SECRET_KEY')
    return revenuecat_plan_source(api_key, os.getenv('REVENUECAT_ENTITLEMENT', 'premium')) if api_key else None


def store_links_from_env():
    """Where the invite page sends coaches who don't have the app yet. A store without a link is left out."""
    links = {'ios': os.getenv('APP_STORE_URL'), 'android': os.getenv('PLAY_STORE_URL')}
    return {platform: url for platform, url in links.items() if url}

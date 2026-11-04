#!/usr/bin/env python3
"""Applies new database migrations using the settings in backend/.env. Run on each deploy."""
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from dotenv import load_dotenv  # noqa: E402

from coachmate_api.config import db_config_from_env  # noqa: E402
from coachmate_api.migrations import migrate  # noqa: E402

load_dotenv(BACKEND_DIR / '.env')
applied = migrate(db_config_from_env())
print('Applied: ' + ', '.join(applied) if applied else 'Already up to date')

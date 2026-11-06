#!/usr/bin/env python3
"""Reviews reported exercises, using the settings in backend/.env.

    moderate.py list           Reported exercises, most reported first
    moderate.py show <id>      An exercise's text and every report on it
    moderate.py restore <id>   It's fine: show it to everyone again and clear its reports
    moderate.py remove <id>    It breaks the rules: hide it from everyone but its author for good
"""
import json
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

import mysql.connector  # noqa: E402
from dotenv import load_dotenv  # noqa: E402

from coachmate_api.config import db_config_from_env  # noqa: E402


def list_reported(cursor):
    cursor.execute(
        'SELECT e.id, e.title, e.hidden_at, COUNT(*) AS reports FROM exercise_reports r '
        'JOIN exercises e ON e.id = r.exercise_id GROUP BY e.id ORDER BY reports DESC, e.id'
    )
    rows = cursor.fetchall()
    if not rows:
        print('Nothing reported')
    for row in rows:
        state = 'hidden' if row['hidden_at'] else 'visible'
        print(f"{row['id']}  {row['reports']} report(s)  {state}  {row['title']}")


def show(cursor, exercise_id):
    cursor.execute('SELECT title, description, coaching_points, frames FROM exercises WHERE id = %s', (exercise_id,))
    exercise = cursor.fetchone()
    if exercise is None:
        sys.exit('No such exercise')
    print(f"Title: {exercise['title']}\nDescription: {exercise['description']}")
    print('Coaching points: ' + '; '.join(json.loads(exercise['coaching_points'])))
    for frame in json.loads(exercise['frames']):
        if frame.get('note'):
            print(f"Step note: {frame['note']}")
        labels = [m['label'] for m in frame['markers'] if m.get('label')]
        if labels:
            print('Labels: ' + ', '.join(labels))
    cursor.execute('SELECT reason, created_at FROM exercise_reports WHERE exercise_id = %s ORDER BY created_at', (exercise_id,))
    for report in cursor.fetchall():
        print(f"Report {report['created_at']:%Y-%m-%d}: {report['reason'] or '(no reason)'}")


def settle(cursor, exercise_id, hide):
    """Either way its reports are done with, so it leaves the list. A removed exercise stays hidden
    even when its author edits it, as saving never touches hidden_at."""
    cursor.execute('SELECT 1 FROM exercises WHERE id = %s', (exercise_id,))
    if cursor.fetchone() is None:
        sys.exit('No such exercise')
    hidden_at = 'COALESCE(hidden_at, UTC_TIMESTAMP(3))' if hide else 'NULL'
    cursor.execute(f'UPDATE exercises SET hidden_at = {hidden_at} WHERE id = %s', (exercise_id,))
    cursor.execute('DELETE FROM exercise_reports WHERE exercise_id = %s', (exercise_id,))
    print('Removed' if hide else 'Restored')


def main(args):
    load_dotenv(BACKEND_DIR / '.env')
    if not args or args[0] not in ('list', 'show', 'restore', 'remove') or (args[0] != 'list' and len(args) != 2):
        sys.exit(__doc__)
    connection = mysql.connector.connect(**db_config_from_env())
    try:
        cursor = connection.cursor(dictionary=True)
        command = args[0]
        if command == 'list':
            list_reported(cursor)
        elif command == 'show':
            show(cursor, args[1].lower())
        else:
            settle(cursor, args[1].lower(), hide=command == 'remove')
            connection.commit()
    finally:
        connection.close()


if __name__ == '__main__':
    main(sys.argv[1:])

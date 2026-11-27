"""Fetches a coach's exercise from production, read-only, and starts a library drill from it.

    python3 -I scripts/library/fetch_exercise.py --title "halvplan jokrar" <out dir>
    python3 -I scripts/library/fetch_exercise.py --id 493aa0e3 <out dir>
    python3 -I scripts/library/fetch_exercise.py --title jokrar --owner-email coach@example.com <out dir>

With several matches it lists them and writes nothing; narrow it down with --id. With one match it writes
<out dir>/<slug>.source.json (the exercise as stored) and <out dir>/gen_<slug>.py, a generator for
scripts/library/drills.py with the sketch already converted and the text to improve and translate.
Keep the out dir outside the repo (a scratch folder). See docs/LIBRARY-IMPORT.md.

It reads the database over SSH on the server, inside the API's own Python environment, in a read-only
transaction, and never prints the database settings. COACHMATE_SSH_HOST (default `inleed`, from
~/.ssh/config) and COACHMATE_APP_ROOT (default `coachmate`) say where the API runs.
"""
import argparse
import json
import os
import pprint
import re
import subprocess
import sys
import unicodedata
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
SSH_HOST = os.environ.get('COACHMATE_SSH_HOST', 'inleed')
APP_ROOT = os.environ.get('COACHMATE_APP_ROOT', 'coachmate')
PYTHON_VERSION = '3.11'
MAX_MATCHES = 25

# Runs on the server. Reads the API's database settings the way backend/scripts/backup_db.sh does.
REMOTE = r'''
import json, os, sys
import mysql.connector

args = json.loads(sys.argv[1])
root = os.path.realpath(os.path.expanduser('~/' + args['app_root']))
with open(os.path.expanduser('~/.cl.selector/python-selector.json')) as f:
    apps = json.load(f)
env = next(a.get('env_vars') or {} for r, a in apps.items()
           if os.path.realpath(os.path.join(os.path.expanduser('~'), r)) == root)
db = mysql.connector.connect(host=env.get('DB_HOST', 'localhost'), port=int(env.get('DB_PORT', '3306')),
                             database=env['DB_NAME'], user=env['DB_USER'], password=env['DB_PASS'])
c = db.cursor(dictionary=True)
c.execute('SET SESSION TRANSACTION READ ONLY')
c.execute('START TRANSACTION READ ONLY')
where, params = ['e.deleted_at IS NULL'], []
if args.get('id'):
    where.append('e.id LIKE %s'); params.append(args['id'].lower() + '%')
if args.get('title'):
    where.append('e.title LIKE %s'); params.append('%' + args['title'] + '%')
if args.get('owner_email'):
    where.append('u.email = %s'); params.append(args['owner_email'].strip().lower())
c.execute('SELECT e.*, u.display_name AS owner_name FROM exercises e JOIN users u ON u.id = e.owner_id WHERE '
          + ' AND '.join(where) + ' ORDER BY e.updated_at DESC LIMIT %s', params + [args['limit']])
rows = c.fetchall()
for row in rows:
    c.execute('SELECT tag FROM exercise_focus WHERE exercise_id = %s ORDER BY position', (row['id'],))
    row['focus'] = [r['tag'] for r in c.fetchall()]
db.rollback()
print(json.dumps(rows, default=str, ensure_ascii=False))
'''


def fetch(filters):
    remote_args = json.dumps({**filters, 'app_root': APP_ROOT, 'limit': MAX_MATCHES})
    command = (f'source ~/virtualenv/{APP_ROOT}/{PYTHON_VERSION}/bin/activate && '
               f'python3 -I - {quote(remote_args)}')
    result = subprocess.run(['ssh', '-o', 'BatchMode=yes', SSH_HOST, command], input=REMOTE,
                            capture_output=True, text=True)
    if result.returncode != 0:
        sys.exit(f'fetch failed: {result.stderr.strip().splitlines()[-1] if result.stderr.strip() else result.returncode}')
    return json.loads(result.stdout)


def quote(text):
    return "'" + text.replace("'", "'\\''") + "'"


def to_exercise(row):
    """The row in the app's exercise format (types/exercise.ts, schema v2)."""
    return {
        'schemaVersion': row['schema_version'],
        'id': row['id'],
        'ownerId': row['owner_id'],
        'ownerName': row['owner_name'],
        'clonedFromId': row['cloned_from_id'],
        'sport': row['sport'],
        'title': row['title'],
        'description': row['description'],
        'coachingPoints': json.loads(row['coaching_points']),
        'locale': row['locale'],
        'phase': row['phase'],
        'difficulty': row['difficulty'],
        'focus': row['focus'],
        'durationMinutes': row['duration_minutes'],
        'minPlayers': row['min_players'],
        'maxPlayers': row['max_players'],
        'customTags': json.loads(row['custom_tags']),
        'frames': json.loads(row['frames']),
        'visibility': row['visibility'],
        'createdAt': row['created_at'],
        'updatedAt': row['updated_at'],
    }


def slugify(title):
    text = title.lower().replace('å', 'a').replace('ä', 'a').replace('ö', 'o')
    text = unicodedata.normalize('NFKD', text).encode('ascii', 'ignore').decode()
    return re.sub(r'[^a-z0-9]+', '-', text).strip('-') or 'ovning'


PREFIX = {'player': 'p', 'opponent': 'o', 'ball': 'b', 'cone': 'c', 'coach': 'l', 'goal': 'g',
          'arrow-solid': 'r', 'arrow-dashed': 's'}


def short_ids(frames):
    """Readable ids, the same for a marker in every frame, so steps still animate from one to the next."""
    ids, counts = {}, {}
    for frame in frames:
        for marker in frame['markers']:
            if marker['id'] not in ids:
                prefix = PREFIX.get(marker['type'], 'm')
                counts[prefix] = counts.get(prefix, 0) + 1
                ids[marker['id']] = f'{prefix}{counts[prefix]}'
    return ids


def num(value):
    return f'{round(value, 3):g}'


def helper_call(marker, short):
    """The drills.py call that draws the marker as it is."""
    kind, x, y = marker['type'], num(marker['x']), num(marker['y'])
    label = f", {marker['label']!r}" if marker.get('label') else ''
    if kind in ('player', 'opponent'):
        return f"{'P' if kind == 'player' else 'O'}({short!r}, {x}, {y}{label})"
    if kind == 'coach':
        note = f"  # had the label {marker['label']!r}, which hides the whistle" if marker.get('label') else ''
        return f'L({short!r}, {x}, {y}){note}'
    if kind == 'ball':
        return f'B({short!r}, {x}, {y})'
    if kind == 'cone':
        return f'C({short!r}, {x}, {y})'
    if kind == 'goal':
        rotation = f", rotation={marker['rotation']:g}" if marker.get('rotation') else ''
        return f'G({short!r}, {x}, {y}{rotation})'
    end = f"{num(marker['endX'])}, {num(marker['endY'])}"
    bend, waves = marker.get('bend'), marker.get('waves')
    if kind == 'arrow-dashed':
        return f"PASS({short!r}, {x}, {y}, {end}{f', bend={num(bend)}' if bend else ''})"
    if bend and waves and waves > 1:
        return f'DRIBBLE({short!r}, {x}, {y}, {end}, bend={num(bend)}, waves={waves})'
    return f"RUN({short!r}, {x}, {y}, {end}{f', bend={num(bend)}' if bend else ''})"


def generator(exercise, slug):
    frames = exercise['frames']
    ids = short_ids(frames)
    source_locale = 'sv' if exercise['locale'].startswith('sv') else 'en'
    other = 'en' if source_locale == 'sv' else 'sv'
    # Left empty by the coach: the library wants them, so they become TODOs
    meta = {key: exercise[key] if exercise[key] not in (None, []) else ('TODO' if key != 'focus' else ['TODO'])
            for key in ('phase', 'difficulty', 'focus', 'durationMinutes', 'minPlayers', 'maxPlayers')}

    lines = [
        f'"""Library drill from {exercise["id"]} "{exercise["title"]}" '
        f'({exercise["sport"]}, {exercise["locale"]}, {exercise["visibility"]}, by {exercise["ownerName"] or "a coach without a display name"}).',
        '',
        'Fetched with scripts/library/fetch_exercise.py. Improve the sketch and text, fill in every TODO, then run',
        f'from the repo root:  python3 -I {"<this file>"} content/library-exercises',
        '"""',
        'import sys',
        f"sys.path.insert(0, {str(REPO / 'scripts' / 'library')!r})",
        'from drills import *  # noqa: F401,F403  P, O, L, B, C, G, RUN, DRIBBLE, PASS, write',
        '',
    ]
    for index, frame in enumerate(frames, start=1):
        lines.append(f'# Step {index}. Note as written: {frame.get("note") or "(none)"!r}')
        lines.append(f'f{index} = [')
        lines += [f'    {helper_call(marker, ids[marker["id"]])},' for marker in frame['markers']]
        lines.append(']')
        lines.append('')

    points = [point['text'] for point in exercise['coachingPoints']] or ['TODO']
    notes = [frame.get('note') or 'TODO' for frame in frames]
    text = {
        source_locale: {'title': exercise['title'], 'description': exercise['description'] or 'TODO',
                        'points': points, 'notes': notes},
        other: {'title': 'TODO', 'description': 'TODO', 'points': ['TODO'], 'notes': ['TODO'] * len(frames)},
    }
    lines += [
        f'META = {pprint.pformat(meta, sort_dicts=False)}',
        '',
        '# The text as the coach wrote it. Rewrite it by the rules in docs/LIBRARY-IMPORT.md and translate it.',
        f'TEXT = {pprint.pformat(text, sort_dicts=False, width=110)}',
        '',
        "assert 'TODO' not in repr((META, TEXT)), 'fill in every TODO first'",
        f"write({slug!r}, sport={exercise['sport']!r}, meta=META, frames=[{', '.join(f'f{i}' for i in range(1, len(frames) + 1))}], text=TEXT)",
        '',
    ]
    return '\n'.join(lines)


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument('out', type=Path, help='folder for the source JSON and the generator (outside the repo)')
    parser.add_argument('--id', help='the exercise id, or its first characters')
    parser.add_argument('--title', help='part of the title')
    parser.add_argument('--owner-email', help="the owner's sign-in email, to narrow it down")
    args = parser.parse_args()
    if not (args.id or args.title):
        parser.error('give --id or --title')

    rows = fetch({'id': args.id, 'title': args.title, 'owner_email': args.owner_email})
    if not rows:
        sys.exit('No exercise matches')
    if len(rows) > 1:
        print(f'{len(rows)} exercises match{" (showing the first " + str(MAX_MATCHES) + ")" if len(rows) == MAX_MATCHES else ""}. '
              'Pick one with --id:')
        for row in rows:
            print(f"  {row['id'][:8]}  {row['sport']:10} {row['locale']:3} {row['visibility']:8} "
                  f"{(row['owner_name'] or '-')[:16]:16} {row['updated_at'][:10]}  {row['title']}")
        return

    exercise = to_exercise(rows[0])
    slug = slugify(exercise['title'])
    args.out.mkdir(parents=True, exist_ok=True)
    source = args.out / f'{slug}.source.json'
    script = args.out / f'gen_{slug}.py'
    source.write_text(json.dumps(exercise, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    script.write_text(generator(exercise, slug), encoding='utf-8')
    print(f"{exercise['id']}  {exercise['title']}  ({exercise['sport']}, {exercise['locale']}, "
          f"{exercise['visibility']}, by {exercise['ownerName'] or 'no display name'}, {len(exercise['frames'])} steps)")
    print(f'wrote {source}')
    print(f'wrote {script}')


if __name__ == '__main__':
    main()

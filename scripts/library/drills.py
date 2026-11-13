"""Shared helpers for writing library drills. See docs/LIBRARY-IMPORT.md. A batch script does:

    from drills import *
    write('slug', meta, frames, text, sport='bandy')

and is run from the repo root as:  python3 -I <batch>.py content/library-exercises
(keep batch scripts outside the repo, e.g. in a scratch folder, with this folder on sys.path).

Coordinates are shares of the court: x 0 (left) .. 1 (right), y 0 (top goal end) .. 1 (bottom).
The floorball court: goals at y ~0.09 and ~0.91 (mouth x 0.44-0.56), goal creases y 0.05-0.155
and 0.845-0.947 (x 0.38-0.62), centre line y 0.5, face-off dots at (0.09|0.91, 0.07|0.5|0.93).
"""
import json
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else None
NOW = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.000Z')
_NAMESPACE = uuid.UUID('6f1c1f0e-2a59-4d0c-9a51-3d2b8c1e7a10')


def P(id, x, y, label=None):
    """Player of the training team / attackers (blue)."""
    m = {'id': id, 'type': 'player', 'x': x, 'y': y}
    if label:
        m['label'] = label
    return m


def O(id, x, y, label=None):
    """Opponent / defenders (red)."""
    m = P(id, x, y, label)
    m['type'] = 'opponent'
    return m


def L(id, x, y):
    """The leader/coach. Drawn as a blue player labelled L until coaches have the app with coach markers."""
    return P(id, x, y, 'L')


def B(id, x, y):
    return {'id': id, 'type': 'ball', 'x': x, 'y': y}


def C(id, x, y):
    return {'id': id, 'type': 'cone', 'x': x, 'y': y}


def G(id, x, y, rotation=None):
    """A small portable goal. It opens downwards; rotation turns it clockwise in degrees (180 opens upwards)."""
    m = {'id': id, 'type': 'goal', 'x': x, 'y': y}
    if rotation:
        m['rotation'] = rotation
    return m


def RUN(id, x, y, ex, ey, bend=None, waves=None):
    """Run without the ball: straight, or one curve with bend (waves 1)."""
    m = {'id': id, 'type': 'arrow-solid', 'x': x, 'y': y, 'endX': ex, 'endY': ey}
    if bend:
        m['bend'], m['waves'] = bend, waves or 1
    return m


def DRIBBLE(id, x, y, ex, ey, bend=0.03, waves=3):
    """Moving with the ball: a wavy solid arrow."""
    return {'id': id, 'type': 'arrow-solid', 'x': x, 'y': y, 'endX': ex, 'endY': ey, 'bend': bend, 'waves': waves}


def PASS(id, x, y, ex, ey, bend=None):
    """Pass or shot: dashed."""
    m = {'id': id, 'type': 'arrow-dashed', 'x': x, 'y': y, 'endX': ex, 'endY': ey}
    if bend:
        m['bend'], m['waves'] = bend, 1
    return m


def stable_id(slug, locale):
    return str(uuid.uuid5(_NAMESPACE, f'coachmate-library/{slug}/{locale}'))

_SOCCER_PX = (484, 719)  # the app's soccer pitch at preview scale; people r=31, ball r=36
_BALL_GAP = 60


def _space_balls(frames):
    """Push each ball out from its nearest player until they don't touch in the app; arrows starting at the ball follow."""
    import math
    W, H = _SOCCER_PX
    for markers in frames:
        people = [m for m in markers if m['type'] in ('player', 'opponent', 'coach')]
        for ball in [m for m in markers if m['type'] == 'ball']:
            if not people:
                continue
            near = min(people, key=lambda p: math.hypot((p['x'] - ball['x']) * W, (p['y'] - ball['y']) * H))
            dx, dy = (ball['x'] - near['x']) * W, (ball['y'] - near['y']) * H
            d = math.hypot(dx, dy)
            if d >= _BALL_GAP or d == 0:
                continue
            k = _BALL_GAP / d
            nx, ny = near['x'] + dx * k / W, near['y'] + dy * k / H
            sx, sy = nx - ball['x'], ny - ball['y']
            for a in markers:
                if a['type'].startswith('arrow') and math.hypot((a['x'] - ball['x']) * W, (a['y'] - ball['y']) * H) < 45:
                    a['x'] = round(a['x'] + sx, 3)
                    a['y'] = round(a['y'] + sy, 3)
            ball['x'], ball['y'] = round(nx, 3), round(ny, 3)


def write(slug, meta, frames, text, ids=None, sport='floorball'):
    """text = {'sv': {...}, 'en': {...}} with title, description, points, notes (one per frame)."""
    assert OUT is not None, 'pass the content folder as the first argument'
    if sport == 'soccer':
        _space_balls(frames)
    for locale, t in text.items():
        assert len(t['notes']) == len(frames), f'{slug}.{locale}: one note per frame'
        data = {
            'schemaVersion': 2,
            'id': (ids or {}).get(locale) or stable_id(slug, locale),
            'ownerId': None,
            'clonedFromId': None,
            'sport': sport,
            'title': t['title'],
            'description': t['description'],
            'coachingPoints': [{'id': f'cp{i + 1}', 'text': p} for i, p in enumerate(t['points'])],
            'locale': locale,
            **meta,
            'customTags': [],
            'frames': [
                {'id': f'f{i + 1}', 'note': t['notes'][i], 'markers': markers}
                for i, markers in enumerate(frames)
            ],
            'createdAt': NOW,
            'updatedAt': NOW,
            'deletedAt': None,
            'visibility': 'public',
        }
        path = OUT / f'{slug}.{locale}.json'
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        print('wrote', path.name)

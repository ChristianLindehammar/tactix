"""Checks library drills against the spacing that reads well in the app (see docs/LIBRARY-IMPORT.md).

    python3 -I scripts/library/check_spacing.py content/library-exercises/<slug>.en.json ...

Prints one line per problem. Distances are in "width units": the share of the court's width, with
y scaled by the court's height/width ratio, so a gap down the court counts as much as the same gap
across it on screen. Only bandy and basketball have measured numbers; other sports rely on the
WARN lines from preview.py.
"""
import json
import math
import sys
from pathlib import Path

# ratio = court height / width as the app draws it; people/ball = minimum centre distances;
# ball_other = ball to anyone but its own player; arrow = minimum length and start offset
RULES = {
    'bandy': {'ratio': 1.53, 'people': 0.17, 'ball': 0.15, 'ball_other': 0.16, 'arrow': 0.15, 'start': 0.09},
    'basketball': {'ratio': 1.87, 'people': 0.15, 'ball': 0.10, 'ball_other': 0.13, 'arrow': 0.08, 'start': 0.03},
}
PEOPLE = ('player', 'opponent', 'coach')


def check(path):
    data = json.loads(Path(path).read_text(encoding='utf-8'))
    rule = RULES.get(data['sport'])
    if not rule:
        return [f'{Path(path).name}: no measured rules for {data["sport"]}, use preview.py']
    k = rule['ratio']

    def dist(a, b):
        return math.hypot(a[0] - b[0], k * (a[1] - b[1]))

    def off_segment(p, a, b):
        """Distance from p to segment a-b, and how far along it the closest point is (0..1)."""
        ax, ay, bx, by, px, py = a[0], k * a[1], b[0], k * b[1], p[0], k * p[1]
        vx, vy = bx - ax, by - ay
        n = vx * vx + vy * vy
        t = max(0.0, min(1.0, ((px - ax) * vx + (py - ay) * vy) / n)) if n else 0.0
        return math.hypot(px - ax - t * vx, py - ay - t * vy), t

    found = []
    name = Path(path).name
    for i, frame in enumerate(data['frames'], 1):
        markers = frame['markers']
        solid = [m for m in markers if not m['type'].startswith('arrow')]
        people = [m for m in solid if m['type'] in PEOPLE]
        pos = {m['id']: (m['x'], m['y']) for m in solid}
        for j, a in enumerate(people):
            for b in people[j + 1:]:
                d = dist(pos[a['id']], pos[b['id']])
                if d < rule['people']:
                    found.append(f'{name} step {i}: {a["id"]} and {b["id"]} too close ({d:.3f})')
        for ball in [m for m in solid if m['type'] == 'ball']:
            near = sorted((dist(pos[p['id']], pos[ball['id']]), p['id']) for p in people)
            if near and near[0][0] < rule['ball']:
                found.append(f'{name} step {i}: ball {ball["id"]} touches {near[0][1]} ({near[0][0]:.3f})')
            for d, pid in near[1:]:
                if d < rule['ball_other']:
                    found.append(f'{name} step {i}: ball {ball["id"]} crowds {pid} ({d:.3f})')
        for a in [m for m in markers if m['type'].startswith('arrow')]:
            s, e = (a['x'], a['y']), (a['endX'], a['endY'])
            if dist(s, e) < rule['arrow']:
                found.append(f'{name} step {i}: arrow {a["id"]} is short ({dist(s, e):.3f})')
            for m in solid:
                if dist(s, pos[m['id']]) < rule['start']:
                    found.append(f'{name} step {i}: arrow {a["id"]} starts on {m["id"]}')
                if a['type'] == 'arrow-dashed' and (e[1] < 0.06 or e[1] > 0.94) and dist(e, pos[m['id']]) < 0.12:
                    continue  # a shot into the goal passes the goalkeeper standing in front of it
                d, t = off_segment(pos[m['id']], s, e)
                # Straight-line check: a curved arrow (bend) may go round the marker even when flagged
                if 0.05 < t < 0.95 and d < (0.08 if m['type'] == 'cone' else 0.10):
                    found.append(f'{name} step {i}: arrow {a["id"]} runs over {m["id"]}'
                                 + (' (curved, check the preview)' if a.get('bend') else ''))
    return found


if __name__ == '__main__':
    problems = [line for p in sys.argv[1:] for line in check(p)]
    print('\n'.join(problems) or 'ok')

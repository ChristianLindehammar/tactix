"""Draws a drill's steps roughly as the app shows them and warns about crowded markers.

    python3 -I gen/preview.py content/library-exercises/<slug>.en.json out.png

Marker sizes match what the app draws on the exercise screen (measured on the emulator):
people ~13% of the court width, balls ~11%, cones and goals ~10%. Prints one line per problem.
"""
import json
import math
import subprocess
import sys
import tempfile
from pathlib import Path

SIZES = {'floorball': (484, 908), 'hockey': (427, 846)}
W, H = SIZES['floorball']
CORNER = 37.5
RADIUS = {'player': 31, 'opponent': 31, 'coach': 31, 'ball': 36, 'cone': 22, 'goal': 25}
COLORS = {'player': '#1976D2', 'opponent': '#D32F2F', 'coach': '#2E7D32'}

def _line(x1, y1, x2, y2):
    return f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="#fff" stroke-width="5"/>'


def _box(x1, y1, x2, y2):
    return f'<rect x="{x1}" y="{y1}" width="{x2 - x1}" height="{y2 - y1}" fill="none" stroke="#fff" stroke-width="5"/>'


COURT = (
    '<rect x="2.5" y="2.5" width="479" height="903" rx="37.5" fill="#0097B2"/>'
    + ''.join(_line(cx - 11.5, cy, cx + 11.5, cy) + _line(cx, cy - 11.5, cx, cy + 11.5)
              for cx in (42.5, 441.5) for cy in (66.5, 841.5))
    + _line(5, 453, 479, 453) + _line(42.5, 442, 42.5, 465) + _line(441.5, 442, 441.5, 465)
    + _box(183.5, 48.5, 301.5, 140.5) + _box(214.5, 67.9, 270.5, 88.3) + _line(223.5, 58, 223.5, 67.4) + _line(262.5, 58, 262.5, 67.4)
    + _box(183.5, 767.5, 301.5, 859.5) + _box(214.5, 819.7, 270.5, 840.1) + _line(223.5, 840.6, 223.5, 850) + _line(262.5, 840.6, 262.5, 850)
    + '<circle cx="242" cy="453" r="9" fill="#fff"/>'
)


BANDY = (
    '<path d="M7.5 820.5v-801h534v801z" fill="#fff" stroke="#de2f31" stroke-width="5"/>'
    '<path d="m10.005 418.5 529 1" fill="none" stroke="#de2f31" stroke-width="5"/>'
    '<path d="M8 64.5h124M8 778.5h124M415 778.5h124M415 64.5h124" fill="none" stroke="#de2f31" stroke-width="5" stroke-dasharray="10 10"/>'
    '<path d="M287.5 2.5v17h-27v-17zM421.479 19.5A147.499 147.499 0 0 1 274 164.5a147.498 147.498 0 0 1-147.479-145h294.958Z" fill="none" stroke="#de2f31" stroke-width="5"/>'
    '<path d="M206 190.5c23.472 0 42.5-19.028 42.5-42.5s-19.028-42.5-42.5-42.5-42.5 19.028-42.5 42.5 19.028 42.5 42.5 42.5ZM343 190.5c23.472 0 42.5-19.028 42.5-42.5s-19.028-42.5-42.5-42.5-42.5 19.028-42.5 42.5 19.028 42.5 42.5 42.5Z" fill="none" stroke="#de2f31" stroke-width="5"/>'
    '<path d="M206 153a5 5 0 1 0-.001-10.001A5 5 0 0 0 206 153ZM343 153a5 5 0 1 0-.001-10.001A5 5 0 0 0 343 153ZM274 128a5 5 0 1 0-.001-10.001A5 5 0 0 0 274 128Z" fill="#de2f31"/>'
    '<path d="M287.5 837.5v-17h-27v17zM378.298 718.702A147.499 147.499 0 0 1 421.479 820.5H126.521a147.499 147.499 0 0 1 251.777-101.798Z" fill="none" stroke="#de2f31" stroke-width="5"/>'
    '<path d="M206 649.5c23.472 0 42.5 19.028 42.5 42.5s-19.028 42.5-42.5 42.5-42.5-19.028-42.5-42.5 19.028-42.5 42.5-42.5ZM343 649.5c23.472 0 42.5 19.028 42.5 42.5s-19.028 42.5-42.5 42.5-42.5-19.028-42.5-42.5 19.028-42.5 42.5-42.5Z" fill="none" stroke="#de2f31" stroke-width="5"/>'
    '<path d="M206 687a5 5 0 1 1-.001 10.001A5 5 0 0 1 206 687ZM343 687a5 5 0 1 1-.001 10.001A5 5 0 0 1 343 687ZM274 712a5 5 0 1 1-.001 10.001A5 5 0 0 1 274 712Z" fill="#de2f31"/>'
    '<path d="M274 377.5c23.472 0 42.5 19.028 42.5 42.5s-19.028 42.5-42.5 42.5-42.5-19.028-42.5-42.5 19.028-42.5 42.5-42.5Z" fill="none" stroke="#de2f31" stroke-width="5"/>'
    '<path d="M274 414a5 5 0 1 1-.001 10.001A5 5 0 0 1 274 414Z" fill="#de2f31"/>'
)


HOCKEY = (
    '<rect x="2.5" y="2.5" width="422" height="841" rx="81.5" fill="#fff" stroke="#1D458D" stroke-width="5"/>'
    '<line x1="9" y1="58" x2="418" y2="58" stroke="#D4484E" stroke-width="2"/>'
    '<line x1="7" y1="782" x2="420" y2="782" stroke="#D4484E" stroke-width="2"/>'
    '<line x1="5" y1="421" x2="422" y2="421" stroke="#D4484E" stroke-width="4"/>'
    '<line x1="5" y1="305" x2="422" y2="305" stroke="#4588E0" stroke-width="4"/>'
    '<line x1="5" y1="537" x2="422" y2="537" stroke="#4588E0" stroke-width="4"/>'
    '<path d="M185 58 A28.5 28.5 0 0 0 242 58 Z" fill="#4588E0"/>'
    '<path d="M185 782 A28.5 28.5 0 0 1 242 782 Z" fill="#4588E0"/>'
    + ''.join(f'<circle cx="{cx}" cy="{cy}" r="63.5" fill="none" stroke="#D4484E" stroke-width="2"/><circle cx="{cx}" cy="{cy}" r="6" fill="#D4484E"/>'
              for cx in (120.5, 306.5) for cy in (143.5, 698.5))
    + '<circle cx="214.5" cy="422.5" r="63.5" fill="none" stroke="#D4484E" stroke-width="2"/>'
    + ''.join(f'<circle cx="{cx}" cy="{cy}" r="5" fill="#D4484E"/>' for cx in (122, 305) for cy in (329, 514))
)
ARROW = '#fff'

SOCCER = (
    '<rect x="7.5" y="7.5" width="534" height="801" fill="#4DAF50" stroke="#fff" stroke-width="5"/>'
    '<line x1="10" y1="406.5" x2="539" y2="407.5" stroke="#fff" stroke-width="5"/>'
    '<rect x="124.5" y="7.5" width="298" height="122" fill="none" stroke="#fff" stroke-width="5"/>'
    '<rect x="206.5" y="7.5" width="134" height="41" fill="none" stroke="#fff" stroke-width="5"/>'
    '<rect x="124.5" y="686.5" width="298" height="122" fill="none" stroke="#fff" stroke-width="5"/>'
    '<rect x="206.5" y="767.5" width="134" height="41" fill="none" stroke="#fff" stroke-width="5"/>'
    '<circle cx="274.5" cy="406.5" r="68" fill="none" stroke="#fff" stroke-width="5"/>'
    '<circle cx="274" cy="407" r="5" fill="#fff"/>'
)
BASKETBALL = (
    '<rect width="429" height="802" fill="#0097B2"/>'
    '<path d="M0 398.5h429M292 802V633H140v169" fill="none" stroke="#000" stroke-width="5"/>'
    '<path d="M271 634.516c0-14.852-5.742-29.096-15.963-39.598-10.221-10.502-24.083-16.402-38.537-16.402s-28.317 5.9-38.537 16.402C167.742 605.42 162 619.663 162 634.516M255 757.516c0-10.609-4.056-20.783-11.277-28.285-7.22-7.501-17.012-11.715-27.223-11.715-10.211 0-20.004 4.214-27.224 11.715-7.22 7.502-11.276 17.676-11.276 28.285M255 757.516v11M178 757.516v11" fill="none" stroke="#000" stroke-width="5"/>'
    '<path d="M213.5 767.016h6v-4h-6z" fill="none" stroke="#000" stroke-width="5"/>'
    '<path d="M190 768.516h52" fill="none" stroke="#000" stroke-width="5"/>'
    '<path d="M25 802.014v-81.807c9.152-44.612 32.861-84.49 67.221-113.065 34.36-28.575 77.323-44.144 121.812-44.142 44.49.002 87.853 15.574 122.948 44.152 35.095 28.578 59.829 68.458 70.129 113.071v81.793M289.89.016v169h-152v-169" fill="none" stroke="#000" stroke-width="5"/>'
    '<path d="M268.89 167.5c0 14.852-5.742 29.096-15.963 39.598C242.706 217.6 228.844 223.5 214.39 223.5s-28.317-5.9-38.537-16.402c-10.221-10.502-15.963-24.746-15.963-39.598M252.89 44.5c0 10.609-4.056 20.783-11.276 28.284-7.221 7.502-17.013 11.716-27.224 11.716-10.211 0-20.004-4.214-27.224-11.716-7.22-7.501-11.276-17.675-11.276-28.284M252.89 44.5v-11M175.89 44.5v-11" fill="none" stroke="#000" stroke-width="5"/>'
    '<path d="M211.39 35h6v4h-6z" fill="none" stroke="#000" stroke-width="5"/>'
    '<path d="M187.89 33.5h52" fill="none" stroke="#000" stroke-width="5"/>'
    '<path d="M22.89.001v81.807c9.152 44.613 32.861 84.49 67.221 113.065 34.36 28.576 77.323 44.144 121.812 44.143 44.49-.002 87.853-15.574 122.948-44.152C369.966 166.286 394.7 126.406 405 81.793V0M214.5 348.5c26.973 0 49 22.743 49 51s-22.027 51-49 51-49-22.743-49-51 22.027-51 49-51Z" fill="none" stroke="#000" stroke-width="5"/>'
    '<circle cx="214.39" cy="45" r="6" fill="none" stroke="#000"/><circle cx="216.5" cy="757" r="6" fill="none" stroke="#000"/>'
)


def inside(x, y, margin):
    """Is (x, y) at least margin inside the rounded rink?"""
    if not (margin <= x <= W - margin and margin <= y <= H - margin):
        return False
    cx = min(max(x, CORNER), W - CORNER)
    cy = min(max(y, CORNER), H - CORNER)
    d = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5
    return d == 0 or d <= CORNER - margin


def arrow_points(m, steps=60):
    x1, y1, x2, y2 = m['x'] * W, m['y'] * H, m['endX'] * W, m['endY'] * H
    dx, dy = x2 - x1, y2 - y1
    length = math.hypot(dx, dy) or 1
    nx, ny = -dy / length, dx / length
    bend, waves = m.get('bend', 0) * W, m.get('waves', 1)
    return [
        (x1 + dx * t + nx * bend * math.sin(math.pi * waves * t), y1 + dy * t + ny * bend * math.sin(math.pi * waves * t))
        for t in (i / steps for i in range(steps + 1))
    ]


def draw_arrow(m):
    pts = arrow_points(m)
    line = ' '.join(f'{x:.1f},{y:.1f}' for x, y in pts)
    dash = ' stroke-dasharray="11,8"' if m['type'] == 'arrow-dashed' else ''
    (ax, ay), (bx, by) = pts[-4], pts[-1]
    ang = math.atan2(by - ay, bx - ax)
    head = [(bx, by)] + [(bx - 20 * math.cos(ang + s), by - 20 * math.sin(ang + s)) for s in (0.45, -0.45)]
    poly = ' '.join(f'{x:.1f},{y:.1f}' for x, y in head)
    return f'<polyline points="{line}" stroke="{ARROW}" stroke-width="4.5" fill="none"{dash}/><polygon points="{poly}" fill="{ARROW}"/>'


def draw_marker(m):
    x, y, t = m['x'] * W, m['y'] * H, m['type']
    if t in COLORS:
        label = m.get('label', '')
        text = f'<text x="{x}" y="{y + 7}" font-size="20" font-family="Arial" font-weight="bold" fill="#fff" text-anchor="middle">{label}</text>' if label else f'<circle cx="{x}" cy="{y - 6}" r="8" fill="#fff"/><ellipse cx="{x}" cy="{y + 13}" rx="13" ry="8" fill="#fff"/>'
        return f'<circle cx="{x}" cy="{y}" r="28" fill="{COLORS[t]}" stroke="#fff" stroke-width="3"/>{text}'
    if t == 'ball':
        if ARROW != '#fff':
            return f'<circle cx="{x}" cy="{y}" r="22" fill="#fff" stroke="#FFA000" stroke-width="4"/><ellipse cx="{x}" cy="{y}" rx="12" ry="7" fill="#111"/>'
        return f'<circle cx="{x}" cy="{y}" r="22" fill="#fff" stroke="#FFA000" stroke-width="4"/><circle cx="{x}" cy="{y}" r="9" fill="#333"/>'
    if t == 'cone':
        return f'<polygon points="{x},{y - 18} {x - 14},{y + 14} {x + 14},{y + 14}" fill="#FF6D00"/>'
    if t == 'goal':
        return f'<g transform="rotate({m.get("rotation", 0)} {x} {y})">' + f'<rect x="{x - 22}" y="{y - 12}" width="44" height="24" fill="none" stroke="{ARROW}" stroke-width="4"/>' + ''.join(f'<line x1="{x + dx}" y1="{y - 12}" x2="{x + dx}" y2="{y + 12}" stroke="{ARROW}" stroke-width="2"/>' for dx in (-11, 0, 11)) + '</g>'
    return ''


def problems(frame_no, markers):
    found = []
    solid = [m for m in markers if not m['type'].startswith('arrow')]
    for i, a in enumerate(solid):
        r = RADIUS[a['type']]
        x, y = a['x'] * W, a['y'] * H
        if not inside(x, y, r * 0.6):
            found.append(f'step {frame_no}: {a["id"]} ({a["type"]}) sticks out of the court')
        for b in solid[i + 1:]:
            gap = math.hypot(x - b['x'] * W, y - b['y'] * H)
            if gap < (r + RADIUS[b['type']]) * 0.85:
                found.append(f'step {frame_no}: {a["id"]} and {b["id"]} overlap ({gap:.0f} < {(r + RADIUS[b["type"]]) * 0.85:.0f})')
    for m in markers:
        if m['type'].startswith('arrow'):
            for v in (m['x'], m['y'], m['endX'], m['endY']):
                if not 0.02 <= v <= 0.98:
                    found.append(f'step {frame_no}: arrow {m["id"]} reaches the edge')
                    break
    return found


def main():
    global W, H, CORNER, COURT, ARROW
    data = json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
    if data['sport'] == 'soccer':
        k = 484 / 549
        W, H = 484, round(816 * k)
        CORNER, COURT = 30, f'<g transform="scale({k})">{SOCCER}</g>'
    if data['sport'] == 'hockey':
        k = 484 / 427  # the app draws every rink at screen width, so markers keep their size against the width
        W, H = 484, round(846 * k)
        CORNER, COURT, ARROW = 81.5 * k, f'<g transform="scale({k})">{HOCKEY}</g>', '#555555'
    if data['sport'] == 'bandy':
        k = 484 / 549
        W, H = 484, round(840 * k)
        CORNER, COURT, ARROW = 0, f'<g transform="scale({k})">{BANDY}</g>', '#555555'
    if data['sport'] == 'basketball':
        k = 484 / 429
        W, H = 484, round(803 * k)
        CORNER, COURT = 30, f'<g transform="scale({k})">{BASKETBALL}</g>'
    out = Path(sys.argv[2])
    frames = data['frames']
    gap = 30
    total_w = len(frames) * (W + gap)
    parts, issues = [], []
    for i, frame in enumerate(frames):
        markers = frame['markers']
        issues += problems(i + 1, markers)
        body = COURT + ''.join(draw_arrow(m) for m in markers if m['type'].startswith('arrow'))
        body += ''.join(draw_marker(m) for m in markers if not m['type'].startswith('arrow'))
        parts.append(f'<g transform="translate({i * (W + gap)},40)">{body}'
                     f'<text x="10" y="-12" font-size="26" font-family="Arial">{i + 1}</text></g>')
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="{total_w}" height="{H + 50}"><rect width="100%" height="100%" fill="#fff"/>{"".join(parts)}</svg>'
    with tempfile.NamedTemporaryFile('w', suffix='.svg', delete=False) as f:
        f.write(svg)
    chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
    with tempfile.TemporaryDirectory() as profile:
        subprocess.run([chrome, '--headless', '--disable-gpu', f'--user-data-dir={profile}', '--hide-scrollbars',
                        '--force-device-scale-factor=0.5', f'--window-size={total_w},{H + 50}',
                        f'--screenshot={out.resolve()}', f'file://{f.name}'],
                       check=True, capture_output=True, timeout=60)
    print(f'{out}: {len(frames)} steps')
    for line in issues:
        print('WARN', line)


main()

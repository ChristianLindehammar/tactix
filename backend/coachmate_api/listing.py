"""Turns the query string of GET /exercises and GET /library into SQL. Same meaning as filterExercises in
utils/filterExercises.ts, except sorting by rating, which needs ratings on the server first.
Only values from the caller become query parameters; the SQL text comes from this file."""
import re

from .validation import FOCUS_TAGS, MAX_COUNT, PHASES, SPORTS

DEFAULT_PAGE_SIZE = 50
MAX_PAGE_SIZE = 100
MAX_OFFSET = 1_000_000
MAX_SEARCH_LENGTH = 200
LANGUAGE = re.compile(r'[a-z]{2,3}')

SORTS = {
    'updated': 'e.updated_at DESC, e.id',
    'title': 'e.title, e.updated_at DESC, e.id',
    'difficulty': 'e.difficulty, e.updated_at DESC, e.id',
}


class InvalidFilter(Exception):
    pass


def _choice(value, options):
    if value not in options:
        raise InvalidFilter()
    return value


def _whole_number(value, low, high):
    if not value.isascii() or not value.isdecimal() or not low <= int(value) <= high:
        raise InvalidFilter()
    return int(value)


def _like(text):
    escaped = text.replace('!', '!!').replace('%', '!%').replace('_', '!_')
    return f'%{escaped}%'


def _placeholders(values):
    return ', '.join(['%s'] * len(values))


def _build(args, where, params):
    """Returns (where, params, order, limit, offset), narrowing the given conditions by the filters."""
    where = [*where, 'e.deleted_at IS NULL']
    params = list(params)

    if 'sport' in args:
        where.append('e.sport = %s')
        params.append(_choice(args['sport'], SPORTS))

    if 'phase' in args:
        where.append('e.phase = %s')
        params.append(_choice(args['phase'], PHASES))

    focus = [_choice(tag, FOCUS_TAGS) for tag in args.getlist('focus')]
    if focus:
        where.append(
            'EXISTS (SELECT 1 FROM exercise_focus f WHERE f.exercise_id = e.id '
            f'AND f.tag IN ({_placeholders(focus)}))'
        )
        params.extend(focus)

    difficulties = [_whole_number(level, 1, 5) for level in args.getlist('difficulty')]
    if difficulties:
        where.append(f'e.difficulty IN ({_placeholders(difficulties)})')
        params.extend(difficulties)

    if 'players' in args:
        players = _whole_number(args['players'], 1, MAX_COUNT)
        where.append('(e.min_players IS NULL OR %s >= e.min_players)')
        where.append('(e.max_players IS NULL OR %s <= e.max_players)')
        params.extend([players, players])

    search = args.get('search', '').strip()
    if len(search) > MAX_SEARCH_LENGTH:
        raise InvalidFilter()
    if search:
        pattern = _like(search)
        where.append(
            "(e.title LIKE %s ESCAPE '!' OR e.description LIKE %s ESCAPE '!' OR e.custom_tags LIKE %s ESCAPE '!')"
        )
        params.extend([pattern, pattern, pattern])

    order = SORTS[_choice(args.get('sort', 'updated'), SORTS)]
    limit = _whole_number(args['limit'], 1, MAX_PAGE_SIZE) if 'limit' in args else DEFAULT_PAGE_SIZE
    offset = _whole_number(args['offset'], 0, MAX_OFFSET) if 'offset' in args else 0
    return ' AND '.join(where), params, order, limit, offset


def build_listing(args, owner_id):
    """The caller's own exercises."""
    return _build(args, ['e.owner_id = %s'], [owner_id])


# Leaves out hidden exercises, those the viewer reported and those by coaches the viewer blocked
NOT_UNWANTED = [
    'e.hidden_at IS NULL',
    'NOT EXISTS (SELECT 1 FROM exercise_reports r WHERE r.exercise_id = e.id AND r.reporter_id = %s)',
    'NOT EXISTS (SELECT 1 FROM user_blocks b WHERE b.blocker_id = %s AND b.blocked_id = e.owner_id)',
]


def build_library(args, viewer_id):
    """Every coach's public exercises, minus unwanted ones. A language matches its regional variants
    too, so sv finds sv-FI."""
    where = ["e.visibility = 'public'", *NOT_UNWANTED]
    params = [viewer_id, viewer_id]
    if 'lang' in args:
        language = args['lang'].lower()
        if not LANGUAGE.fullmatch(language):
            raise InvalidFilter()
        where.append("(e.locale = %s OR e.locale LIKE %s)")
        params.extend([language, f'{language}-%'])
    return _build(args, where, params)


def build_favorites(args, viewer_id):
    """The exercises the viewer saved, in every language, minus unwanted ones. One its author has
    since made private stays, as the viewer could already open it by link."""
    where = [
        'EXISTS (SELECT 1 FROM exercise_favorites fv WHERE fv.exercise_id = e.id AND fv.user_id = %s)',
        *NOT_UNWANTED,
    ]
    return _build(args, where, [viewer_id, viewer_id, viewer_id])

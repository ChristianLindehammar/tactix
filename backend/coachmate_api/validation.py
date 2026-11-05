"""Checks untrusted data is an exercise. Same rules as parseExercise in types/exercise.ts;
change both together. It also enforces limits the database needs, so bad input gets a 400."""
import math
import uuid
from datetime import datetime, timezone

SCHEMA_VERSION = 1
SPORTS = {'floorball', 'soccer', 'hockey', 'bandy', 'basketball'}
PHASES = {'warmup', 'main', 'game', 'cooldown'}
FOCUS_TAGS = {
    'passing', 'shooting', 'ballControl', 'defence', 'attack', 'transition',
    'positioning', 'setPieces', 'goalkeeping', 'conditioning',
}
MARKER_TYPES = {'player', 'opponent', 'ball', 'cone', 'arrow-solid', 'arrow-dashed', 'goal'}
ARROW_TYPES = {'arrow-solid', 'arrow-dashed'}
MAX_ARROW_BEND = 0.5
MAX_ARROW_WAVES = 8

MAX_TITLE_LENGTH = 200
MAX_LOCALE_LENGTH = 16
MAX_CLONED_FROM_LENGTH = 64
MAX_COUNT = 100_000


class ExerciseParseError(Exception):
    def __init__(self, code):
        super().__init__(code)
        self.code = code


def _is_text(value):
    return isinstance(value, str) and value.strip() != ''


def _is_text_list(value):
    return isinstance(value, list) and all(isinstance(item, str) for item in value)


def _is_int(value):
    return isinstance(value, int) and not isinstance(value, bool)


def _is_coordinate(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def _is_optional_count(value):
    return value is None or (_is_int(value) and 0 < value <= MAX_COUNT)


def _is_uuid(value):
    try:
        return isinstance(value, str) and str(uuid.UUID(value)) == value.lower()
    except ValueError:
        return False


def parse_date(value):
    """Returns the moment in UTC without a time zone, as stored. A zone is required."""
    if not isinstance(value, str):
        raise ExerciseParseError('invalidDate')
    try:
        parsed = datetime.fromisoformat(value.replace('Z', '+00:00'))
    except ValueError:
        raise ExerciseParseError('invalidDate') from None
    if parsed.tzinfo is None:
        raise ExerciseParseError('invalidDate')
    return parsed.astimezone(timezone.utc).replace(tzinfo=None)


def _is_arrow_curve(bend, waves):
    return (
        _is_coordinate(bend)
        and bend != 0
        and abs(bend) <= MAX_ARROW_BEND
        and isinstance(waves, int)
        and not isinstance(waves, bool)
        and 1 <= waves <= MAX_ARROW_WAVES
    )


def _parse_marker(data):
    if (
        not isinstance(data, dict)
        or not _is_text(data.get('id'))
        or data.get('type') not in MARKER_TYPES
        or not _is_coordinate(data.get('x'))
        or not _is_coordinate(data.get('y'))
    ):
        raise ExerciseParseError('invalidMarker')
    if 'label' in data and not isinstance(data['label'], str):
        raise ExerciseParseError('invalidMarker')

    marker = {key: data[key] for key in ('id', 'type', 'x', 'y', 'label') if key in data}
    if data['type'] not in ARROW_TYPES:
        return marker
    if not _is_coordinate(data.get('endX')) or not _is_coordinate(data.get('endY')):
        raise ExerciseParseError('invalidMarker')
    arrow = {**marker, 'endX': data['endX'], 'endY': data['endY']}
    if 'bend' not in data and 'waves' not in data:
        return arrow
    if not _is_arrow_curve(data.get('bend'), data.get('waves')):
        raise ExerciseParseError('invalidMarker')
    return {**arrow, 'bend': data['bend'], 'waves': data['waves']}


def _parse_frame(data):
    if not isinstance(data, dict) or not _is_text(data.get('id')) or not isinstance(data.get('markers'), list):
        raise ExerciseParseError('invalidFrames')
    if 'note' in data and not isinstance(data['note'], str):
        raise ExerciseParseError('invalidFrames')

    frame = {'id': data['id'], 'markers': [_parse_marker(marker) for marker in data['markers']]}
    return {**frame, 'note': data['note']} if 'note' in data else frame


def parse_exercise(data):
    """Returns the fields of a valid exercise. The owner is left out: the server decides it."""
    if not isinstance(data, dict):
        raise ExerciseParseError('invalidFormat')
    if data.get('schemaVersion') != SCHEMA_VERSION:
        raise ExerciseParseError('unsupportedVersion')

    cloned_from = data.get('clonedFromId')
    if not _is_uuid(data.get('id')) or (
        cloned_from is not None and not (_is_text(cloned_from) and len(cloned_from) <= MAX_CLONED_FROM_LENGTH)
    ):
        raise ExerciseParseError('invalidId')
    if data.get('sport') not in SPORTS:
        raise ExerciseParseError('invalidSport')
    if not _is_text(data.get('title')) or len(data['title']) > MAX_TITLE_LENGTH:
        raise ExerciseParseError('invalidTitle')
    if (
        not isinstance(data.get('description'), str)
        or not _is_text_list(data.get('coachingPoints'))
        or not _is_text_list(data.get('customTags'))
        or not _is_text(data.get('locale'))
        or len(data['locale']) > MAX_LOCALE_LENGTH
    ):
        raise ExerciseParseError('invalidText')
    if not _is_int(data.get('difficulty')) or not 1 <= data['difficulty'] <= 5:
        raise ExerciseParseError('invalidDifficulty')
    if not _is_text_list(data.get('focus')):
        raise ExerciseParseError('invalidFocus')
    if data.get('phase') not in PHASES:
        raise ExerciseParseError('invalidPhase')

    duration, min_players, max_players = (data.get(k) for k in ('durationMinutes', 'minPlayers', 'maxPlayers'))
    if (
        not all(_is_optional_count(count) for count in (duration, min_players, max_players))
        or (min_players is not None and max_players is not None and min_players > max_players)
    ):
        raise ExerciseParseError('invalidCount')
    if not isinstance(data.get('frames'), list) or not data['frames']:
        raise ExerciseParseError('invalidFrames')
    frames = [_parse_frame(frame) for frame in data['frames']]

    deleted_at = data.get('deletedAt')
    return {
        'id': data['id'].lower(),
        'clonedFromId': cloned_from,
        'sport': data['sport'],
        'title': data['title'],
        'description': data['description'],
        'coachingPoints': data['coachingPoints'],
        'locale': data['locale'],
        'difficulty': data['difficulty'],
        # Unknown tags are dropped, not rejected, so newer versions of the app can still save
        'focus': [tag for tag in dict.fromkeys(data['focus']) if tag in FOCUS_TAGS],
        'customTags': data['customTags'],
        'phase': data['phase'],
        'durationMinutes': duration,
        'minPlayers': min_players,
        'maxPlayers': max_players,
        'frames': frames,
        'createdAt': parse_date(data.get('createdAt')),
        'updatedAt': parse_date(data.get('updatedAt')),
        'deletedAt': None if deleted_at is None else parse_date(deleted_at),
    }

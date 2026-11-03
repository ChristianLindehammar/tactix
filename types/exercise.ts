import { Sport, sportsConfig } from '@/constants/sports';
import { TACTICS_MARKER_TYPES, TacticsMarker } from '@/types/tacticsMarker';

export const EXERCISE_SCHEMA_VERSION = 1;

export const EXERCISE_DIFFICULTIES = [1, 2, 3, 4, 5] as const;
export type ExerciseDifficulty = (typeof EXERCISE_DIFFICULTIES)[number];

export const EXERCISE_PHASES = ['warmup', 'main', 'game', 'cooldown'] as const;
export type ExercisePhase = (typeof EXERCISE_PHASES)[number];

// Stored as stable keys and translated on display, so filters work in every language
export const FOCUS_TAGS = [
  'passing',
  'shooting',
  'ballControl',
  'defence',
  'attack',
  'transition',
  'positioning',
  'setPieces',
  'goalkeeping',
  'conditioning',
] as const;
export type FocusTag = (typeof FOCUS_TAGS)[number];

export interface ExerciseFrame {
  id: string;
  note?: string;
  markers: TacticsMarker[];
}

export interface Exercise {
  schemaVersion: typeof EXERCISE_SCHEMA_VERSION;
  id: string;
  /** The only user who may change this exercise. Null means no user does. */
  ownerId: string | null;
  /** The exercise this one was cloned from. */
  clonedFromId: string | null;
  sport: Sport;
  title: string;
  description: string;
  coachingPoints: string[];
  locale: string;
  difficulty: ExerciseDifficulty;
  focus: FocusTag[];
  customTags: string[];
  phase: ExercisePhase;
  durationMinutes: number | null;
  minPlayers: number | null;
  maxPlayers: number | null;
  frames: ExerciseFrame[];
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export const RATING_STARS = [1, 2, 3, 4, 5] as const;
export type RatingStars = (typeof RATING_STARS)[number];

/** One user's rating of one exercise, stored apart from the exercise. */
export interface ExerciseRating {
  exerciseId: string;
  userId: string;
  /** Null once the user has cleared their rating. */
  stars: RatingStars | null;
  updatedAt: string;
}

export const isRatingStars = (value: unknown): value is RatingStars =>
  typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 5;

export const isExerciseRating = (data: unknown): data is ExerciseRating =>
  typeof data === 'object' &&
  data !== null &&
  typeof (data as ExerciseRating).exerciseId === 'string' &&
  typeof (data as ExerciseRating).userId === 'string' &&
  ((data as ExerciseRating).stars === null || isRatingStars((data as ExerciseRating).stars)) &&
  typeof (data as ExerciseRating).updatedAt === 'string';

export type ExerciseParseErrorCode =
  | 'invalidFormat'
  | 'unsupportedVersion'
  | 'invalidId'
  | 'invalidSport'
  | 'invalidTitle'
  | 'invalidText'
  | 'invalidDifficulty'
  | 'invalidFocus'
  | 'invalidPhase'
  | 'invalidCount'
  | 'invalidFrames'
  | 'invalidMarker'
  | 'invalidDate';

export class ExerciseParseError extends Error {
  constructor(public readonly code: ExerciseParseErrorCode) {
    super(code);
    this.name = 'ExerciseParseError';
  }
}

const isRecord = (data: unknown): data is Record<string, unknown> =>
  typeof data === 'object' && data !== null && !Array.isArray(data);

const isNonEmptyText = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const isTextList = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every(item => typeof item === 'string');

const isCoordinate = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const isOptionalCount = (value: unknown): value is number | null =>
  value === null || (typeof value === 'number' && Number.isInteger(value) && value > 0);

const isDate = (value: unknown): value is string =>
  typeof value === 'string' && !Number.isNaN(Date.parse(value));

const includes = <T extends string>(options: readonly T[], value: unknown): value is T =>
  options.includes(value as T);

const isDifficulty = (value: unknown): value is ExerciseDifficulty =>
  typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 5;

const fail = (code: ExerciseParseErrorCode): never => {
  throw new ExerciseParseError(code);
};

// Positions are not range-checked: a marker can be dragged slightly off the court
function parseMarker(data: unknown): TacticsMarker {
  if (
    !isRecord(data) ||
    !isNonEmptyText(data.id) ||
    !includes(TACTICS_MARKER_TYPES, data.type) ||
    !isCoordinate(data.x) ||
    !isCoordinate(data.y)
  ) {
    return fail('invalidMarker');
  }

  if (data.label !== undefined && typeof data.label !== 'string') return fail('invalidMarker');

  const marker: TacticsMarker = { id: data.id, type: data.type, x: data.x, y: data.y };
  if (data.label !== undefined) marker.label = data.label;
  if (data.type !== 'arrow-solid' && data.type !== 'arrow-dashed') return marker;

  if (!isCoordinate(data.endX) || !isCoordinate(data.endY)) return fail('invalidMarker');
  return { ...marker, endX: data.endX, endY: data.endY };
}

function parseFrame(data: unknown): ExerciseFrame {
  if (!isRecord(data) || !isNonEmptyText(data.id) || !Array.isArray(data.markers)) {
    return fail('invalidFrames');
  }
  if (data.note !== undefined && typeof data.note !== 'string') return fail('invalidFrames');

  const frame: ExerciseFrame = { id: data.id, markers: data.markers.map(parseMarker) };
  return data.note === undefined ? frame : { ...frame, note: data.note };
}

/** Checks untrusted data (a shared file, stored JSON, an API response) is an exercise. */
export function parseExercise(data: unknown): Exercise {
  if (!isRecord(data)) return fail('invalidFormat');
  if (data.schemaVersion !== EXERCISE_SCHEMA_VERSION) return fail('unsupportedVersion');

  const {
    id,
    ownerId,
    clonedFromId,
    sport,
    title,
    description,
    coachingPoints,
    locale,
    difficulty,
    focus,
    customTags,
    phase,
    durationMinutes,
    minPlayers,
    maxPlayers,
    frames,
    createdAt,
    updatedAt,
    deletedAt,
  } = data;

  if (!isNonEmptyText(id)) return fail('invalidId');
  if (ownerId !== null && !isNonEmptyText(ownerId)) return fail('invalidId');
  if (clonedFromId !== null && !isNonEmptyText(clonedFromId)) return fail('invalidId');
  if (!includes(Object.keys(sportsConfig) as Sport[], sport)) return fail('invalidSport');
  if (!isNonEmptyText(title)) return fail('invalidTitle');
  if (
    typeof description !== 'string' ||
    !isTextList(coachingPoints) ||
    !isTextList(customTags) ||
    !isNonEmptyText(locale)
  ) {
    return fail('invalidText');
  }
  if (!isDifficulty(difficulty)) return fail('invalidDifficulty');
  if (!isTextList(focus)) return fail('invalidFocus');
  if (!includes(EXERCISE_PHASES, phase)) return fail('invalidPhase');
  if (
    !isOptionalCount(durationMinutes) ||
    !isOptionalCount(minPlayers) ||
    !isOptionalCount(maxPlayers) ||
    (minPlayers !== null && maxPlayers !== null && minPlayers > maxPlayers)
  ) {
    return fail('invalidCount');
  }
  if (!Array.isArray(frames) || frames.length === 0) return fail('invalidFrames');
  if (!isDate(createdAt) || !isDate(updatedAt)) return fail('invalidDate');
  if (deletedAt !== null && !isDate(deletedAt)) return fail('invalidDate');

  return {
    schemaVersion: EXERCISE_SCHEMA_VERSION,
    id,
    ownerId: ownerId as string | null,
    clonedFromId: clonedFromId as string | null,
    sport,
    title,
    description,
    coachingPoints,
    locale,
    difficulty,
    // Unknown tags are dropped, not rejected, so files from newer versions still open
    focus: focus.filter((tag): tag is FocusTag => includes(FOCUS_TAGS, tag)),
    customTags,
    phase,
    durationMinutes,
    minPlayers,
    maxPlayers,
    frames: frames.map(parseFrame),
    createdAt,
    updatedAt,
    deletedAt: deletedAt as string | null,
  };
}

import { ExerciseParseError, parseExercise } from '../exercise';

const validExercise = () => ({
  schemaVersion: 2,
  id: '3f2b8c1e-7a44-4d21-9c55-0e1f2a3b4c5d',
  ownerId: null,
  clonedFromId: null,
  sport: 'floorball',
  title: 'Triangle passing',
  description: 'Pass and follow your pass.',
  coachingPoints: [{ id: 'point-a', text: 'Keep your head up' }],
  locale: 'sv',
  difficulty: 2,
  focus: ['passing'],
  customTags: ['u12'],
  phase: 'warmup',
  durationMinutes: 10,
  minPlayers: 6,
  maxPlayers: 12,
  frames: [
    {
      id: 'frame-1',
      note: 'Start here',
      markers: [
        { id: 'a', type: 'player', x: 0.25, y: 0.5 },
        { id: 'b', type: 'arrow-dashed', x: 0.25, y: 0.5, endX: 0.75, endY: 0.5 },
      ],
    },
  ],
  createdAt: '2026-11-03T10:00:00.000Z',
  updatedAt: '2026-11-03T10:00:00.000Z',
  deletedAt: null,
  visibility: 'public',
});

const errorCodeFor = (data: unknown): string | undefined => {
  try {
    parseExercise(data);
    return undefined;
  } catch (error) {
    if (error instanceof ExerciseParseError) return error.code;
    throw error;
  }
};

describe('parseExercise', () => {
  it('returns a valid exercise with all its content intact', () => {
    expect(parseExercise(validExercise())).toEqual(validExercise());
  });

  it.each([[null], ['text'], [42], [[]]])('rejects %j as not an exercise', data => {
    expect(errorCodeFor(data)).toBe('invalidFormat');
  });

  it('rejects an exercise from a newer app version', () => {
    expect(errorCodeFor({ ...validExercise(), schemaVersion: 3 })).toBe('unsupportedVersion');
  });

  it('upgrades a version 1 exercise, giving its coaching points ids that stay the same', () => {
    const old = { ...validExercise(), schemaVersion: 1, coachingPoints: ['Head up', 'Quick feet'] };

    const upgraded = parseExercise(old);

    expect(upgraded.schemaVersion).toBe(2);
    expect(upgraded.coachingPoints).toEqual([
      { id: 'point-1', text: 'Head up' },
      { id: 'point-2', text: 'Quick feet' },
    ]);
    expect(parseExercise(old)).toEqual(upgraded);
  });

  it('rejects version 1 coaching points in a version 2 exercise', () => {
    expect(errorCodeFor({ ...validExercise(), coachingPoints: ['Head up'] })).toBe('invalidText');
  });

  it.each([
    ['a missing id', { id: undefined }, 'invalidId'],
    ['a clone source that is not an id', { clonedFromId: 5 }, 'invalidId'],
    ['an unknown sport', { sport: 'cricket' }, 'invalidSport'],
    ['an empty title', { title: '   ' }, 'invalidTitle'],
    ['a coaching point without an id', { coachingPoints: [{ text: 'Head up' }] }, 'invalidText'],
    ['a coaching point that is not text', { coachingPoints: [{ id: 'a', text: 1 }] }, 'invalidText'],
    [
      'two coaching points with the same id',
      { coachingPoints: [{ id: 'a', text: 'Head up' }, { id: 'a', text: 'Quick feet' }] },
      'invalidText',
    ],
    ['a difficulty below the scale', { difficulty: 0 }, 'invalidDifficulty'],
    ['a difficulty above the scale', { difficulty: 6 }, 'invalidDifficulty'],
    ['a fractional difficulty', { difficulty: 2.5 }, 'invalidDifficulty'],
    ['focus that is not a list', { focus: 'passing' }, 'invalidFocus'],
    ['an unknown phase', { phase: 'nap' }, 'invalidPhase'],
    ['an unknown visibility', { visibility: 'friends' }, 'invalidVisibility'],
    ['a negative duration', { durationMinutes: -5 }, 'invalidCount'],
    ['more minimum than maximum players', { minPlayers: 12, maxPlayers: 6 }, 'invalidCount'],
    ['no frames', { frames: [] }, 'invalidFrames'],
    ['an unparseable date', { updatedAt: 'yesterday' }, 'invalidDate'],
  ])('rejects %s', (_name, change, code) => {
    expect(errorCodeFor({ ...validExercise(), ...change })).toBe(code);
  });

  const withMarker = (marker: object) => ({
    ...validExercise(),
    frames: [{ id: 'frame-1', markers: [marker] }],
  });

  it.each([
    ['an unknown marker type', { id: 'a', type: 'dragon', x: 0.5, y: 0.5 }],
    ['a marker without a position', { id: 'a', type: 'cone', x: 0.5 }],
    ['a marker at a non-number position', { id: 'a', type: 'cone', x: 'left', y: 0.5 }],
    ['an arrow without an end', { id: 'a', type: 'arrow-solid', x: 0.5, y: 0.5 }],
  ])('rejects %s', (_name, marker) => {
    expect(errorCodeFor(withMarker(marker))).toBe('invalidMarker');
  });

  it('rejects a label that is not text', () => {
    const marker = { id: 'a', type: 'player', x: 0.5, y: 0.5, label: 7 };

    expect(errorCodeFor(withMarker(marker))).toBe('invalidMarker');
  });

  it.each([
    ['a bend without waves', { bend: 0.1 }],
    ['waves without a bend', { waves: 2 }],
    ['a bend that is not a number', { bend: 'wide', waves: 2 }],
    ['a zero bend', { bend: 0, waves: 2 }],
    ['a bend beyond the limit', { bend: 0.6, waves: 2 }],
    ['a fractional wave count', { bend: 0.1, waves: 1.5 }],
    ['no waves', { bend: 0.1, waves: 0 }],
    ['too many waves', { bend: 0.1, waves: 9 }],
  ])('rejects an arrow with %s', (_name, curve) => {
    const marker = { id: 'a', type: 'arrow-solid', x: 0, y: 0, endX: 1, endY: 1, ...curve };

    expect(errorCodeFor(withMarker(marker))).toBe('invalidMarker');
  });

  it('keeps an arrow curve in either direction', () => {
    const arrow = { id: 'a', type: 'arrow-dashed', x: 0, y: 0, endX: 1, endY: 1, bend: -0.1, waves: 3 };

    expect(parseExercise(withMarker(arrow)).frames[0].markers[0]).toEqual(arrow);
  });

  it('ignores a curve on anything but an arrow', () => {
    const cone = { id: 'a', type: 'cone', x: 0, y: 0, bend: 0.1, waves: 3 };

    expect(parseExercise(withMarker(cone)).frames[0].markers[0]).toEqual({
      id: 'a',
      type: 'cone',
      x: 0,
      y: 0,
    });
  });

  it('keeps a marker label', () => {
    const marker = { id: 'a', type: 'player', x: 0.5, y: 0.5, label: '10' };

    expect(parseExercise(withMarker(marker)).frames[0].markers[0]).toEqual(marker);
  });

  it('accepts a goal marker', () => {
    const marker = { id: 'a', type: 'goal', x: 0.5, y: 0.5 };

    expect(parseExercise(withMarker(marker)).frames[0].markers[0]).toEqual(marker);
  });

  it('accepts a marker dragged slightly off the court', () => {
    const marker = { id: 'a', type: 'cone', x: -0.02, y: 1.03 };

    expect(parseExercise(withMarker(marker)).frames[0].markers[0]).toEqual(marker);
  });

  it('keeps a private exercise private', () => {
    expect(parseExercise({ ...validExercise(), visibility: 'private' }).visibility).toBe('private');
  });

  it('treats an exercise saved before the public library as private, as the server does', () => {
    const { visibility: _visibility, ...older } = validExercise();

    expect(parseExercise(older).visibility).toBe('private');
  });

  it('accepts unset duration and player counts', () => {
    const open = { durationMinutes: null, minPlayers: null, maxPlayers: null };

    expect(parseExercise({ ...validExercise(), ...open })).toMatchObject(open);
  });

  it('ignores focus tags it does not know, so newer files still open', () => {
    const parsed = parseExercise({ ...validExercise(), focus: ['passing', 'telepathy'] });

    expect(parsed.focus).toEqual(['passing']);
  });

  it('drops fields that are not part of the format', () => {
    expect(parseExercise({ ...validExercise(), isAdmin: true })).toEqual(validExercise());
  });
});

import {
  addStep,
  createDraft,
  draftFromExercise,
  draftToExercise,
  DraftStep,
  ExerciseDraft,
  removeStep,
} from '../exerciseDraft';
import { buildExercise } from '@/test-utils/exerciseFixture';
import { parseExercise } from '@/types/exercise';

const NOW = '2026-11-03T12:00:00.000Z';
const context = { sport: 'hockey', locale: 'sv', now: NOW, ownerId: 'me' } as const;

const validDraft = (overrides: Partial<ExerciseDraft> = {}): ExerciseDraft => ({
  ...createDraft(),
  title: 'Breakout',
  ...overrides,
});

const save = (draft: ExerciseDraft, existing?: Parameters<typeof draftToExercise>[2]) => {
  const result = draftToExercise(draft, context, existing);
  if (!result.ok) throw new Error(`Expected valid draft: ${JSON.stringify(result.errors)}`);
  return result.exercise;
};

const errorsFor = (draft: ExerciseDraft) => {
  const result = draftToExercise(draft, context);
  if (result.ok) throw new Error('Expected invalid draft');
  return result.errors;
};

describe('a new exercise from a draft', () => {
  it('is valid in the storage format', () => {
    const exercise = save(validDraft());

    expect(parseExercise(exercise)).toEqual(exercise);
  });

  it('takes its sport, language and dates from the context', () => {
    expect(save(validDraft())).toMatchObject({
      sport: 'hockey',
      locale: 'sv',
      createdAt: NOW,
      updatedAt: NOW,
      deletedAt: null,
      ownerId: 'me',
      clonedFromId: null,
    });
  });

  it('gets its own id each time', () => {
    expect(save(validDraft()).id).not.toBe(save(validDraft()).id);
  });

  it('starts with one empty step', () => {
    const { frames } = save(validDraft());

    expect(frames).toHaveLength(1);
    expect(frames[0].markers).toEqual([]);
  });

  it('saves each step as a frame, in order, with its note', () => {
    const steps: ExerciseDraft['steps'] = [
      { id: 's1', note: 'Pass wide', markers: [{ id: 'm', type: 'cone', x: 0.1, y: 0.2 }] },
      { id: 's2', note: 'Cross', markers: [{ id: 'm', type: 'cone', x: 0.3, y: 0.4 }] },
    ];

    const { frames } = save(validDraft({ steps }));

    expect(frames).toEqual([
      { id: 's1', note: 'Pass wide', markers: [{ id: 'm', type: 'cone', x: 0.1, y: 0.2 }] },
      { id: 's2', note: 'Cross', markers: [{ id: 'm', type: 'cone', x: 0.3, y: 0.4 }] },
    ]);
  });

  it('leaves out a blank step note', () => {
    const steps: ExerciseDraft['steps'] = [{ id: 's1', note: '  ', markers: [] }];

    expect(save(validDraft({ steps })).frames[0]).toEqual({ id: 's1', markers: [] });
  });

  it('trims the title', () => {
    expect(save(validDraft({ title: '  Breakout  ' })).title).toBe('Breakout');
  });

  it('reads one coaching point per line, ignoring blank lines', () => {
    const { coachingPoints } = save(validDraft({ coachingPoints: ' Head up \n\nQuick feet\n' }));

    expect(coachingPoints).toEqual(['Head up', 'Quick feet']);
  });

  it('reads comma-separated custom tags without blanks or repeats', () => {
    const { customTags } = save(validDraft({ customTags: 'u12, small games,, u12 ' }));

    expect(customTags).toEqual(['u12', 'small games']);
  });

  it('reads numbers from text and leaves blanks unset', () => {
    const exercise = save(validDraft({ durationMinutes: '15', minPlayers: ' 6 ', maxPlayers: '' }));

    expect(exercise).toMatchObject({ durationMinutes: 15, minPlayers: 6, maxPlayers: null });
  });
});

describe('an invalid draft', () => {
  it('needs a title', () => {
    expect(errorsFor(validDraft({ title: '   ' })).title).toBe('required');
  });

  it.each([['abc'], ['0'], ['-3'], ['1.5']])('rejects %s as a duration', durationMinutes => {
    expect(errorsFor(validDraft({ durationMinutes })).durationMinutes).toBe('invalidNumber');
  });

  it('rejects an invalid player count', () => {
    const errors = errorsFor(validDraft({ minPlayers: 'many', maxPlayers: '0' }));

    expect(errors).toMatchObject({ minPlayers: 'invalidNumber', maxPlayers: 'invalidNumber' });
  });

  it('rejects more minimum than maximum players', () => {
    expect(errorsFor(validDraft({ minPlayers: '12', maxPlayers: '6' })).maxPlayers).toBe(
      'belowMinimum',
    );
  });
});

describe('editing an existing exercise', () => {
  const existing = buildExercise({
    id: 'keep-me',
    ownerId: 'owner-1',
    clonedFromId: 'source-1',
    sport: 'bandy',
    locale: 'fi',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    title: 'Original',
    description: 'Details',
    coachingPoints: ['One', 'Two'],
    customTags: ['u12', 'fun'],
    difficulty: 4,
    focus: ['defence'],
    phase: 'game',
    durationMinutes: 20,
    minPlayers: 4,
    maxPlayers: null,
    frames: [
      { id: 'first', note: 'Start', markers: [{ id: 'a', type: 'cone', x: 0.5, y: 0.5 }] },
      { id: 'second', markers: [] },
    ],
  });

  it('loads every field into the draft and saves it back unchanged, apart from the edit date', () => {
    const saved = save(draftFromExercise(existing), existing);

    expect(saved).toEqual({ ...existing, updatedAt: NOW });
  });

  it('drops a step that was removed', () => {
    const draft = draftFromExercise(existing);

    const { frames } = save({ ...draft, steps: draft.steps.slice(0, 1) }, existing);

    expect(frames).toEqual([existing.frames[0]]);
  });
});

describe('steps', () => {
  const player = { id: 'p', type: 'player', x: 0.2, y: 0.8, label: '9' } as const;
  const cone = { id: 'c', type: 'cone', x: 0.5, y: 0.5 } as const;
  const run = { id: 'r', type: 'arrow-solid', x: 0.2, y: 0.8, endX: 0.2, endY: 0.3 } as const;
  const pass = { id: 'q', type: 'arrow-dashed', x: 0.2, y: 0.8, endX: 0.6, endY: 0.3 } as const;
  const steps: DraftStep[] = [
    { id: 'one', note: 'Run', markers: [player, cone, run, pass] },
    { id: 'two', note: 'Shoot', markers: [cone] },
  ];

  it('copies everything but the arrows into a new step after the one it came from', () => {
    const next = addStep(steps, 0);

    expect(next).toHaveLength(3);
    expect(next[0]).toBe(steps[0]);
    expect(next[1]).toEqual({ id: expect.any(String), note: '', markers: [player, cone] });
    expect(next[2]).toBe(steps[1]);
  });

  it('gives a new step its own id but keeps the marker ids, so markers can be followed', () => {
    const [, added] = addStep(steps, 0);

    expect(added.id).not.toBe('one');
    expect(added.markers.map(marker => marker.id)).toEqual(['p', 'c']);
  });

  it('removes a step and keeps the others in order', () => {
    expect(removeStep(steps, 0)).toEqual([steps[1]]);
  });

  it('keeps the only step', () => {
    expect(removeStep([steps[0]], 0)).toEqual([steps[0]]);
  });
});

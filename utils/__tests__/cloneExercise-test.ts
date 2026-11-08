import { cloneExercise } from '../cloneExercise';
import { buildExercise } from '@/test-utils/exerciseFixture';
import { parseExercise } from '@/types/exercise';

const NOW = '2026-11-03T12:00:00.000Z';

const source = buildExercise({
  id: 'original',
  ownerId: 'someone-else',
  clonedFromId: 'older-original',
  title: 'Triangle passing',
  description: 'Pass and follow',
  coachingPoints: [{ id: 'point-1', text: 'Head up' }],
  customTags: ['u12'],
  difficulty: 4,
  focus: ['passing'],
  phase: 'game',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-02-01T00:00:00.000Z',
});

const clone = () =>
  cloneExercise(source, { ownerId: 'me', now: NOW, title: 'Triangle passing (copy)' });

describe('cloning an exercise', () => {
  it('is valid in the storage format', () => {
    const copy = clone();

    expect(parseExercise(copy)).toEqual(copy);
  });

  it('starts private, so copies for your own team do not fill the library', () => {
    expect(clone().visibility).toBe('private');
  });

  it('becomes a new exercise that you own', () => {
    const copy = clone();

    expect(copy.id).not.toBe('original');
    expect(copy.ownerId).toBe('me');
  });

  it('remembers the exercise it came from, not that one\'s own source', () => {
    expect(clone().clonedFromId).toBe('original');
  });

  it('starts with fresh dates and is not deleted', () => {
    expect(clone()).toMatchObject({ createdAt: NOW, updatedAt: NOW, deletedAt: null });
  });

  it('uses the given title and copies the content', () => {
    expect(clone()).toMatchObject({
      title: 'Triangle passing (copy)',
      sport: source.sport,
      locale: source.locale,
      description: 'Pass and follow',
      coachingPoints: [{ id: 'point-1', text: 'Head up' }],
      customTags: ['u12'],
      difficulty: 4,
      focus: ['passing'],
      phase: 'game',
      frames: source.frames,
    });
  });

  it('shares nothing with the original, so changing one leaves the other alone', () => {
    const copy = clone();

    copy.frames[0].markers[0].x = 0.99;
    copy.focus.push('defence');
    copy.coachingPoints[0].text = 'Changed';

    expect(source.frames[0].markers[0].x).toBe(0.5);
    expect(source.focus).toEqual(['passing']);
    expect(source.coachingPoints).toEqual([{ id: 'point-1', text: 'Head up' }]);
  });
});

import AsyncStorage from '@react-native-async-storage/async-storage';

import { createLocalExerciseRepository, ExerciseStorageError } from '../exerciseRepository';
import { Exercise, ExerciseParseError } from '@/types/exercise';

const exercise = (overrides: Partial<Exercise> = {}): Exercise => ({
  schemaVersion: 1,
  id: 'exercise-1',
  ownerId: null,
  sport: 'floorball',
  title: 'Triangle passing',
  description: '',
  coachingPoints: [],
  locale: 'en',
  difficulty: 2,
  focus: ['passing'],
  customTags: [],
  phase: 'warmup',
  durationMinutes: 10,
  minPlayers: 6,
  maxPlayers: 12,
  frames: [{ id: 'frame-1', markers: [{ id: 'a', type: 'cone', x: 0.5, y: 0.5 }] }],
  createdAt: '2026-11-03T10:00:00.000Z',
  updatedAt: '2026-11-03T10:00:00.000Z',
  deletedAt: null,
  ...overrides,
});

describe('local exercise repository', () => {
  const repository = createLocalExerciseRepository();

  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.restoreAllMocks();
  });

  it('returns a saved exercise', async () => {
    await repository.save(exercise());

    expect(await repository.get('exercise-1')).toEqual(exercise());
  });

  it('returns null for an exercise that was never saved', async () => {
    expect(await repository.get('missing')).toBeNull();
  });

  it('lists every saved exercise', async () => {
    await repository.save(exercise({ id: 'one' }));
    await repository.save(exercise({ id: 'two' }));

    const ids = (await repository.list()).map(e => e.id);
    expect(ids.sort()).toEqual(['one', 'two']);
  });

  it('replaces an exercise saved again under the same id', async () => {
    await repository.save(exercise());
    await repository.save(exercise({ title: 'Renamed' }));

    const all = await repository.list();
    expect(all.map(e => e.title)).toEqual(['Renamed']);
  });

  it('keeps every exercise when saves overlap', async () => {
    await Promise.all(
      ['one', 'two', 'three'].map(id => repository.save(exercise({ id }))),
    );

    expect(await repository.list()).toHaveLength(3);
  });

  it('hides a deleted exercise from get and list', async () => {
    await repository.save(exercise());

    await repository.remove('exercise-1');

    expect(await repository.get('exercise-1')).toBeNull();
    expect(await repository.list()).toEqual([]);
  });

  it('keeps the deletion available so it can sync later', async () => {
    await repository.save(exercise());

    await repository.remove('exercise-1');

    const [deleted] = await repository.listIncludingDeleted();
    expect(deleted.id).toBe('exercise-1');
    expect(Date.parse(deleted.deletedAt!)).not.toBeNaN();
  });

  it('reports a failed save instead of hiding it', async () => {
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('disk full'));

    await expect(repository.save(exercise())).rejects.toBeInstanceOf(ExerciseStorageError);
  });

  it('reports a failed read instead of showing an empty library', async () => {
    jest.spyOn(AsyncStorage, 'getAllKeys').mockRejectedValueOnce(new Error('disk error'));

    await expect(repository.list()).rejects.toBeInstanceOf(ExerciseStorageError);
  });

  it('refuses to save an exercise it could not read back', async () => {
    await expect(repository.save(exercise({ title: '  ' }))).rejects.toBeInstanceOf(
      ExerciseParseError,
    );
    expect(await repository.list()).toEqual([]);
  });

  it('skips a corrupt stored exercise and still lists the rest', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    await repository.save(exercise({ id: 'good' }));
    await repository.save(exercise({ id: 'bad' }));
    await AsyncStorage.setItem('exercise:bad', '{not json');

    expect((await repository.list()).map(e => e.id)).toEqual(['good']);
  });
});

import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  createLocalExerciseRepository,
  ExerciseOwnershipError,
  ExerciseStorageError,
} from '../exerciseRepository';
import { buildExercise } from '@/test-utils/exerciseFixture';
import { Exercise, ExerciseParseError } from '@/types/exercise';

const exercise = (overrides: Partial<Exercise> = {}) =>
  buildExercise({ ownerId: 'me', ...overrides });

describe('local exercise repository', () => {
  const repository = createLocalExerciseRepository({ getCurrentUserId: async () => 'me' });

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

  describe('ownership', () => {
    const others = exercise({ id: 'theirs', ownerId: 'someone-else', title: 'Their drill' });

    beforeEach(() => repository.save(others));

    it('accepts an exercise from someone else the first time, as an import would', async () => {
      expect(await repository.get('theirs')).toEqual(others);
    });

    it('refuses to overwrite an exercise owned by someone else', async () => {
      await expect(repository.save({ ...others, title: 'Hijacked' })).rejects.toBeInstanceOf(
        ExerciseOwnershipError,
      );

      expect((await repository.get('theirs'))?.title).toBe('Their drill');
    });

    it('refuses to take over an exercise by changing its owner', async () => {
      await expect(repository.save({ ...others, ownerId: 'me' })).rejects.toBeInstanceOf(
        ExerciseOwnershipError,
      );
    });

    it('refuses to delete an exercise owned by someone else', async () => {
      await expect(repository.remove('theirs')).rejects.toBeInstanceOf(ExerciseOwnershipError);

      expect(await repository.get('theirs')).not.toBeNull();
    });

    it('treats an exercise without an owner as not yours', async () => {
      await repository.save(exercise({ id: 'shared', ownerId: null }));

      await expect(repository.remove('shared')).rejects.toBeInstanceOf(ExerciseOwnershipError);
    });

    it('still lets you edit and delete your own', async () => {
      await repository.save(exercise({ id: 'mine' }));
      await repository.save(exercise({ id: 'mine', title: 'Renamed' }));
      expect((await repository.get('mine'))?.title).toBe('Renamed');

      await repository.remove('mine');
      expect(await repository.get('mine')).toBeNull();
    });
  });

  it('skips a corrupt stored exercise and still lists the rest', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    await repository.save(exercise({ id: 'good' }));
    await repository.save(exercise({ id: 'bad' }));
    await AsyncStorage.setItem('exercise:bad', '{not json');

    expect((await repository.list()).map(e => e.id)).toEqual(['good']);
  });
});

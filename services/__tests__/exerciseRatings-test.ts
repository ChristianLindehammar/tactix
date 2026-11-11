import AsyncStorage from '@react-native-async-storage/async-storage';

import { createLocalRatingRepository, ExerciseRatingError } from '../exerciseRatings';
import { ExerciseStorageError } from '../exerciseRepository';

const repositoryFor = (userId: string) =>
  createLocalRatingRepository({ getCurrentUserId: async () => userId });

describe('exercise ratings', () => {
  const ratings = repositoryFor('me');

  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.restoreAllMocks();
  });

  it('has no rating until you give one', async () => {
    expect(await ratings.getMine('a')).toBeNull();
  });

  it('remembers your rating', async () => {
    await ratings.setMine('a', 4);

    expect(await ratings.getMine('a')).toBe(4);
  });

  it('replaces a rating you change', async () => {
    await ratings.setMine('a', 4);
    await ratings.setMine('a', 2);

    expect(await ratings.getMine('a')).toBe(2);
  });

  it('clears a rating', async () => {
    await ratings.setMine('a', 4);
    await ratings.setMine('a', null);

    expect(await ratings.getMine('a')).toBeNull();
  });

  it('keeps ratings separate per exercise', async () => {
    await ratings.setMine('a', 5);
    await ratings.setMine('b', 1);

    expect(await ratings.listMine()).toEqual({ a: 5, b: 1 });
  });

  it('leaves cleared ratings out of the list', async () => {
    await ratings.setMine('a', 5);
    await ratings.setMine('a', null);

    expect(await ratings.listMine()).toEqual({});
  });

  it('keeps ratings separate per user', async () => {
    await ratings.setMine('a', 5);

    const theirs = repositoryFor('someone-else');
    expect(await theirs.getMine('a')).toBeNull();
    expect(await theirs.listMine()).toEqual({});

    await theirs.setMine('a', 1);
    expect(await ratings.getMine('a')).toBe(5);
  });

  it.each([[0], [6], [2.5]])('refuses %d stars', async stars => {
    await expect(ratings.setMine('a', stars as 1)).rejects.toBeInstanceOf(ExerciseRatingError);
  });

  it('does not mix ratings into the exercise library keys', async () => {
    await ratings.setMine('a', 5);

    const keys = await AsyncStorage.getAllKeys();
    expect(keys.filter(key => key.startsWith('exercise:'))).toEqual([]);
  });

  it('reports a failed save', async () => {
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('disk full'));

    await expect(ratings.setMine('a', 5)).rejects.toBeInstanceOf(ExerciseStorageError);
  });

  it('ignores a corrupt rating and keeps the rest', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    await ratings.setMine('good', 5);
    await ratings.setMine('bad', 3);
    await AsyncStorage.setItem('exercise-rating:me:bad', '{not json');

    expect(await ratings.listMine()).toEqual({ good: 5 });
    expect(await ratings.getMine('bad')).toBeNull();
  });
});

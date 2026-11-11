import AsyncStorage from '@react-native-async-storage/async-storage';

import { createLocalExerciseRepository, createSyncedExerciseRepository } from '../exerciseRepository';
import { createExerciseSync } from '../exerciseSync';
import { buildExercise } from '@/test-utils/exerciseFixture';
import { Exercise, ExerciseParseError } from '@/types/exercise';

const BASE = 'https://api.test';
const exercise = (overrides: Partial<Exercise> = {}) =>
  buildExercise({ ownerId: 'me', ...overrides });
const settle = () => new Promise<void>(resolve => setImmediate(() => resolve()));

describe('synced exercise repository', () => {
  const getCurrentUserId = async () => 'me';
  const local = createLocalExerciseRepository({ getCurrentUserId });
  let fetch: jest.Mock;

  const build = () =>
    createSyncedExerciseRepository(
      local,
      createExerciseSync({
        baseUrl: BASE,
        fetch,
        local,
        getCurrentUserId,
        getAuthHeaders: async () => ({ Authorization: 'Bearer token' }),
        onSessionRejected: () => undefined,
      }),
    );

  const uploads = () =>
    fetch.mock.calls
      .filter(([url]) => url.includes('/exercises/'))
      .map(([, init]) => JSON.parse(init.body) as Exercise);

  beforeEach(async () => {
    await AsyncStorage.clear();
    fetch = jest.fn(async () => new Response('{}', { status: 200 }));
  });

  it('uploads a saved exercise in the background', async () => {
    await build().save(exercise());
    await settle();

    expect(uploads().map(e => e.id)).toEqual(['exercise-1']);
  });

  it('keeps an exercise saved while offline, and uploads it on a later save', async () => {
    fetch.mockRejectedValue(new TypeError('Network request failed'));
    const repository = build();

    await expect(repository.save(exercise())).resolves.toBeUndefined();
    await settle();
    expect(await repository.get('exercise-1')).toEqual(exercise());

    fetch.mockClear();
    fetch.mockImplementation(async () => new Response('{}', { status: 200 }));
    await repository.save(exercise({ id: 'other' }));
    await settle();

    expect(uploads().map(e => e.id).sort()).toEqual(['exercise-1', 'other']);
  });

  it('does not make saving wait for the network', async () => {
    fetch.mockImplementation(() => new Promise(() => {}));

    await expect(build().save(exercise())).resolves.toBeUndefined();
  });

  it('uploads a deletion', async () => {
    const repository = build();
    await repository.save(exercise());
    await settle();

    await repository.remove('exercise-1');
    await settle();

    expect(uploads().at(-1)?.deletedAt).not.toBeNull();
    expect(await repository.get('exercise-1')).toBeNull();
  });

  it('uploads nothing when the save itself fails', async () => {
    await expect(build().save(exercise({ title: ' ' }))).rejects.toBeInstanceOf(ExerciseParseError);
    await settle();

    expect(fetch).not.toHaveBeenCalled();
  });
});

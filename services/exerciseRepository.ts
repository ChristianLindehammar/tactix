import AsyncStorage from '@react-native-async-storage/async-storage';

import { getCurrentUserId } from '@/services/currentUser';
import { Exercise, parseExercise } from '@/types/exercise';

const KEY_PREFIX = 'exercise:';
const keyFor = (id: string) => `${KEY_PREFIX}${id}`;

export interface ExerciseRepository {
  get(id: string): Promise<Exercise | null>;
  list(): Promise<Exercise[]>;
  /** Also returns deleted exercises, so their deletion can be synced. */
  listIncludingDeleted(): Promise<Exercise[]>;
  save(exercise: Exercise): Promise<void>;
  remove(id: string): Promise<void>;
}

/** The device could not read or write exercises. Show it: the user's work is at stake. */
export class ExerciseStorageError extends Error {
  constructor(cause: unknown) {
    super('exerciseStorageFailed', { cause });
    this.name = 'ExerciseStorageError';
  }
}

/** Only an exercise's owner may change or delete it. Others can clone it instead. */
export class ExerciseOwnershipError extends Error {
  constructor() {
    super('exerciseNotOwned');
    this.name = 'ExerciseOwnershipError';
  }
}

export const withStorageErrors = async <T>(operation: () => Promise<T>): Promise<T> => {
  try {
    return await operation();
  } catch (error) {
    throw new ExerciseStorageError(error);
  }
};

// A corrupt entry must not take the rest of the library down with it
const readStored = (key: string, json: string | null): Exercise | null => {
  if (json === null) return null;
  try {
    return parseExercise(JSON.parse(json));
  } catch (error) {
    console.warn(`Skipping unreadable exercise ${key}:`, error);
    return null;
  }
};

interface LocalRepositoryOptions {
  getCurrentUserId: () => Promise<string>;
}

export function createLocalExerciseRepository(
  options: LocalRepositoryOptions = { getCurrentUserId },
): ExerciseRepository {
  const assertOwned = async (exercise: Exercise) => {
    const me = await withStorageErrors(options.getCurrentUserId);
    if (exercise.ownerId !== me) throw new ExerciseOwnershipError();
  };

  const readAny = async (id: string) => {
    const key = keyFor(id);
    return readStored(key, await withStorageErrors(() => AsyncStorage.getItem(key)));
  };

  const listIncludingDeleted = async () => {
    const entries = await withStorageErrors(async () => {
      const keys = await AsyncStorage.getAllKeys();
      return AsyncStorage.multiGet(keys.filter(key => key.startsWith(KEY_PREFIX)));
    });
    return entries
      .map(([key, json]) => readStored(key, json))
      .filter((exercise): exercise is Exercise => exercise !== null);
  };

  const save = async (exercise: Exercise) => {
    // Never store what could not be read back
    const valid = parseExercise(exercise);
    const stored = await readAny(valid.id);
    if (stored) await assertOwned(stored);
    await withStorageErrors(() => AsyncStorage.setItem(keyFor(valid.id), JSON.stringify(valid)));
  };

  return {
    listIncludingDeleted,
    save,
    get: async id => {
      const exercise = await readAny(id);
      return exercise && !exercise.deletedAt ? exercise : null;
    },
    list: async () => (await listIncludingDeleted()).filter(exercise => !exercise.deletedAt),
    remove: async id => {
      const exercise = await readAny(id);
      if (!exercise) return;
      await assertOwned(exercise);
      const now = new Date().toISOString();
      await save({ ...exercise, deletedAt: now, updatedAt: now });
    },
  };
}

export const exerciseRepository = createLocalExerciseRepository();

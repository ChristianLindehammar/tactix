import AsyncStorage from '@react-native-async-storage/async-storage';

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

const storage = async <T>(operation: () => Promise<T>): Promise<T> => {
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

export function createLocalExerciseRepository(): ExerciseRepository {
  const readAny = async (id: string) => {
    const key = keyFor(id);
    return readStored(key, await storage(() => AsyncStorage.getItem(key)));
  };

  const listIncludingDeleted = async () => {
    const entries = await storage(async () => {
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
    await storage(() => AsyncStorage.setItem(keyFor(valid.id), JSON.stringify(valid)));
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
      const now = new Date().toISOString();
      await save({ ...exercise, deletedAt: now, updatedAt: now });
    },
  };
}

export const exerciseRepository = createLocalExerciseRepository();

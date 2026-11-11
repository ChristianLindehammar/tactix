import AsyncStorage from '@react-native-async-storage/async-storage';

import { getCurrentUserId } from '@/services/currentUser';
import { withStorageErrors } from '@/services/exerciseRepository';
import { ExerciseRating, isExerciseRating, isRatingStars, RatingStars } from '@/types/exercise';

const KEY_PREFIX = 'exercise-rating:';

export interface RatingRepository {
  getMine(exerciseId: string): Promise<RatingStars | null>;
  /** Your ratings by exercise id. */
  listMine(): Promise<Record<string, RatingStars>>;
  /** Passing null clears your rating. */
  setMine(exerciseId: string, stars: RatingStars | null): Promise<void>;
}

export class ExerciseRatingError extends Error {
  constructor() {
    super('invalidRating');
    this.name = 'ExerciseRatingError';
  }
}

const readStored = (key: string, json: string | null): ExerciseRating | null => {
  if (json === null) return null;
  try {
    const parsed: unknown = JSON.parse(json);
    if (isExerciseRating(parsed)) return parsed;
  } catch {
    // Reported below, like a parsed value that is not a rating
  }
  console.warn(`Skipping unreadable rating ${key}`);
  return null;
};

interface LocalRatingOptions {
  getCurrentUserId: () => Promise<string>;
}

/**
 * Ratings live apart from exercises: rating someone else's exercise must not write to it,
 * and each user has one rating per exercise. A cleared rating stays as stars: null so that
 * the change can sync later.
 */
export function createLocalRatingRepository(
  options: LocalRatingOptions = { getCurrentUserId },
): RatingRepository {
  const userPrefix = async () =>
    `${KEY_PREFIX}${await withStorageErrors(options.getCurrentUserId)}:`;

  return {
    getMine: async exerciseId => {
      const key = `${await userPrefix()}${exerciseId}`;
      const json = await withStorageErrors(() => AsyncStorage.getItem(key));
      return readStored(key, json)?.stars ?? null;
    },

    listMine: async () => {
      const prefix = await userPrefix();
      const entries = await withStorageErrors(async () => {
        const keys = await AsyncStorage.getAllKeys();
        return AsyncStorage.multiGet(keys.filter(key => key.startsWith(prefix)));
      });

      const mine: Record<string, RatingStars> = {};
      for (const [key, json] of entries) {
        const rating = readStored(key, json);
        if (rating?.stars) mine[rating.exerciseId] = rating.stars;
      }
      return mine;
    },

    setMine: async (exerciseId, stars) => {
      if (stars !== null && !isRatingStars(stars)) throw new ExerciseRatingError();

      const userId = await withStorageErrors(options.getCurrentUserId);
      const rating: ExerciseRating = {
        exerciseId,
        userId,
        stars,
        updatedAt: new Date().toISOString(),
      };
      await withStorageErrors(() =>
        AsyncStorage.setItem(`${KEY_PREFIX}${userId}:${exerciseId}`, JSON.stringify(rating)),
      );
    },
  };
}

export const ratingRepository = createLocalRatingRepository();

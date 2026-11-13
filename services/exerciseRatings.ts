import AsyncStorage from '@react-native-async-storage/async-storage';

import { API_BASE_URL } from '@/constants/api';
import { authSession } from '@/services/account';
import { getCurrentUserId } from '@/services/currentUser';
import { withStorageErrors } from '@/services/exerciseRepository';
import { createRatingSync, RatingSync } from '@/services/ratingSync';
import { ExerciseRating, isExerciseRating, isRatingStars, RatingStars } from '@/types/exercise';

const KEY_PREFIX = 'exercise-rating:';

export interface RatingRepository {
  getMine(exerciseId: string): Promise<RatingStars | null>;
  /** Your ratings by exercise id. */
  listMine(): Promise<Record<string, RatingStars>>;
  /** Every rating you gave, cleared ones too, with when. For syncing. */
  listAllMine(): Promise<ExerciseRating[]>;
  /**
   * Keeps each of your ratings from the server that is newer than the one here, and returns the
   * ones it kept.
   */
  mergeMine(ratings: Omit<ExerciseRating, 'userId'>[]): Promise<ExerciseRating[]>;
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
  now?: () => number;
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

  const listAllMine = async () => {
    const prefix = await userPrefix();
    const entries = await withStorageErrors(async () => {
      const keys = await AsyncStorage.getAllKeys();
      return AsyncStorage.multiGet(keys.filter(key => key.startsWith(prefix)));
    });
    return entries
      .map(([key, json]) => readStored(key, json))
      .filter((rating): rating is ExerciseRating => rating !== null);
  };

  return {
    getMine: async exerciseId => {
      const key = `${await userPrefix()}${exerciseId}`;
      const json = await withStorageErrors(() => AsyncStorage.getItem(key));
      return readStored(key, json)?.stars ?? null;
    },

    listMine: async () => {
      const mine: Record<string, RatingStars> = {};
      for (const rating of await listAllMine()) {
        if (rating.stars) mine[rating.exerciseId] = rating.stars;
      }
      return mine;
    },

    listAllMine,

    mergeMine: async incoming => {
      const userId = await withStorageErrors(options.getCurrentUserId);
      const here = new Map((await listAllMine()).map(rating => [rating.exerciseId, rating]));
      const newer = incoming
        .map(rating => ({ ...rating, userId }))
        .filter(isExerciseRating)
        .filter(rating => {
          const old = here.get(rating.exerciseId);
          return !old || Date.parse(rating.updatedAt) > Date.parse(old.updatedAt);
        });
      // AsyncStorage on a phone refuses an empty multiSet, though the test mock allows it
      if (newer.length === 0) return newer;
      await withStorageErrors(() =>
        AsyncStorage.multiSet(
          newer.map(rating => [`${KEY_PREFIX}${userId}:${rating.exerciseId}`, JSON.stringify(rating)]),
        ),
      );
      return newer;
    },

    setMine: async (exerciseId, stars) => {
      if (stars !== null && !isRatingStars(stars)) throw new ExerciseRatingError();

      const userId = await withStorageErrors(options.getCurrentUserId);
      const rating: ExerciseRating = {
        exerciseId,
        userId,
        stars,
        updatedAt: new Date((options.now ?? Date.now)()).toISOString(),
      };
      await withStorageErrors(() =>
        AsyncStorage.setItem(`${KEY_PREFIX}${userId}:${exerciseId}`, JSON.stringify(rating)),
      );
    },
  };
}

/** Rates on the phone first, then syncs in the background, so rating never waits or fails on the network. */
export function createSyncedRatingRepository(local: RatingRepository, sync: RatingSync): RatingRepository {
  return {
    ...local,
    setMine: async (exerciseId, stars) => {
      await local.setMine(exerciseId, stars);
      void sync.syncNow();
    },
  };
}

const localRatingRepository = createLocalRatingRepository();
const ratingSync = createRatingSync({
  baseUrl: API_BASE_URL,
  fetch: (...args) => fetch(...args),
  local: localRatingRepository,
  getAuthHeaders: () => authSession.getAuthHeaders(),
  onSessionRejected: () => authSession.handleSessionRejected(),
});

// Signing in uploads ratings given while signed out, and brings down those from other phones
authSession.subscribe(() => {
  if (authSession.getState().status === 'signedIn') void ratingSync.syncNow();
});

export const ratingRepository = createSyncedRatingRepository(localRatingRepository, ratingSync);

/** Uploads ratings given while offline, and brings down those given on other phones. */
export const syncRatings = () => ratingSync.syncNow();

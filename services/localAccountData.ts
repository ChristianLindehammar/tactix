import AsyncStorage from '@react-native-async-storage/async-storage';

import { isExerciseRating } from '@/types/exercise';

const EXERCISE_PREFIX = 'exercise:';
const RATING_PREFIX = 'exercise-rating:';
const SYNC_PREFIX = 'exercise-sync:';

const parse = (json: string | null): any => {
  try {
    return json === null ? null : JSON.parse(json);
  } catch {
    return null;
  }
};

/**
 * Gives one owner's exercises and ratings on this device to another. Safe to run again if the
 * app stops partway. Moved exercises are queued for upload, because the server has not seen
 * them under the new owner.
 */
export async function moveLocalData(fromId: string, toId: string): Promise<void> {
  if (fromId === toId) return;
  const keys = await AsyncStorage.getAllKeys();

  const exercises = await AsyncStorage.multiGet(keys.filter(key => key.startsWith(EXERCISE_PREFIX)));
  for (const [key, json] of exercises) {
    const exercise = parse(json);
    if (exercise?.ownerId !== fromId) continue;
    await AsyncStorage.setItem(key, JSON.stringify({ ...exercise, ownerId: toId }));
    await AsyncStorage.removeItem(`${SYNC_PREFIX}${exercise.id}`);
  }

  const prefix = `${RATING_PREFIX}${fromId}:`;
  const ratings = await AsyncStorage.multiGet(keys.filter(key => key.startsWith(prefix)));
  for (const [key, json] of ratings) {
    const rating = parse(json);
    if (isExerciseRating(rating)) {
      const target = `${RATING_PREFIX}${toId}:${rating.exerciseId}`;
      const existing = parse(await AsyncStorage.getItem(target));
      // Both can exist after signing out and back in. The later rating is the coach's latest opinion.
      if (!isExerciseRating(existing) || existing.updatedAt <= rating.updatedAt) {
        await AsyncStorage.setItem(target, JSON.stringify({ ...rating, userId: toId }));
      }
    }
    await AsyncStorage.removeItem(key);
  }
}

import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomUUID } from 'expo-crypto';

const USER_ID_KEY = 'localUserId';

/**
 * Identifies this install until accounts exist. Local exercises are owned by this id,
 * so signing in later can move them to the real user.
 */
export function createUserIdentity() {
  let pending: Promise<string> | null = null;

  const loadOrCreate = async () => {
    const stored = await AsyncStorage.getItem(USER_ID_KEY);
    if (stored) return stored;

    const created = randomUUID();
    await AsyncStorage.setItem(USER_ID_KEY, created);
    return created;
  };

  return {
    getCurrentUserId: () => {
      pending ??= loadOrCreate().catch(error => {
        pending = null;
        throw error;
      });
      return pending;
    },
  };
}

export const { getCurrentUserId } = createUserIdentity();

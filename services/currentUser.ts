import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomUUID } from 'expo-crypto';

const USER_ID_KEY = 'localUserId';

/**
 * Who owns what is created on this device: the account while signed in, otherwise a local id.
 * Signing in moves the local id's work to the account.
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

  const setCurrentUserId = async (id: string) => {
    await AsyncStorage.setItem(USER_ID_KEY, id);
    pending = Promise.resolve(id);
  };

  return {
    getCurrentUserId: () => {
      pending ??= loadOrCreate().catch(error => {
        pending = null;
        throw error;
      });
      return pending;
    },
    setCurrentUserId,
    /** After signing out, new work belongs to nobody's account until the next sign-in. */
    startNewLocalUser: async () => {
      const id = randomUUID();
      await setCurrentUserId(id);
      return id;
    },
  };
}

export type UserIdentity = ReturnType<typeof createUserIdentity>;

export const currentUser = createUserIdentity();
export const { getCurrentUserId } = currentUser;

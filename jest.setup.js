require('react-native-gesture-handler/jestSetup');

// expo-crypto is native and jest-expo stubs it to return undefined.
// Node's generator gives tests real UUIDs from the same boundary.
jest.mock('expo-crypto', () => ({
  randomUUID: () => require('crypto').randomUUID(),
}));

jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'));
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('expo-secure-store', () => {
  const stored = new Map();
  return {
    getItemAsync: async key => stored.get(key) ?? null,
    setItemAsync: async (key, value) => void stored.set(key, value),
    deleteItemAsync: async key => void stored.delete(key),
  };
});

// Tests must never reach the live server. Sync tests build their own, with a fake fetch.
jest.mock('./constants/api', () => ({
  API_BASE_URL: 'https://api.test',
  EXERCISE_SYNC_ENABLED: false,
}));

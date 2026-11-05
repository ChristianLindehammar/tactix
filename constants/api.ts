export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://lindehammar-konsult.se/coachmate/api';

// Accounts and upload. Off in release builds until the App Store and Google Play privacy forms cover them.
export const EXERCISE_SYNC_ENABLED = __DEV__;

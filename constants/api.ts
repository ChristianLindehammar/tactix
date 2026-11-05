export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://lindehammar-konsult.se/coachmate/api';

// Accounts and upload. Off in release builds until the privacy policy and store forms cover them:
// privay-policy.html still promises that all data stays on the device.
export const EXERCISE_SYNC_ENABLED = __DEV__;

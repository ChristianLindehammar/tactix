export const API_BASE_URL = 'https://lindehammar-konsult.se/coachmate/api';

// Off in release builds until the privacy policy and store forms say exercises are uploaded:
// privay-policy.html still promises that all data stays on the device.
export const EXERCISE_SYNC_ENABLED = __DEV__;

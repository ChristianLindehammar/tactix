import { Platform } from 'react-native';

import { API_BASE_URL } from '@/constants/api';
import { authSession } from '@/services/account';
import { syncExercises } from '@/services/exerciseRepository';
import { createPlanService, PlanStore, StorePlan } from '@/services/planService';
import { createRevenueCatPlanStore } from '@/services/revenueCatPlanStore';

const API_KEY = Platform.select({
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
});

/** Lets dev builds show the paywall before the store products exist. Set EXPO_PUBLIC_DEV_PLAN=lapsed to see a plan that ended. */
function createDevPlanStore(): PlanStore {
  const YEAR_MS = 365 * 86_400_000;
  const MONTH_MS = 30 * 86_400_000;
  let plan: StorePlan = {
    expiresAt: process.env.EXPO_PUBLIC_DEV_PLAN === 'lapsed' ? new Date(Date.now() - YEAR_MS).toISOString() : null,
  };
  return {
    getPlan: async () => plan,
    getPrices: async () => ({ annual: '199 kr', monthly: '29 kr' }),
    purchase: async period =>
      (plan = { expiresAt: new Date(Date.now() + (period === 'annual' ? YEAR_MS : MONTH_MS)).toISOString() }),
    restore: async () => plan,
    logIn: async () => undefined,
    logOut: async () => undefined,
  };
}

/** A build without a key can't sell anything, so its exercises stay locked. */
const unavailableStore: PlanStore = {
  getPlan: () => Promise.reject(new Error('No RevenueCat key in this build')),
  getPrices: async () => ({ annual: null, monthly: null }),
  purchase: () => Promise.reject(new Error('No RevenueCat key in this build')),
  restore: () => Promise.reject(new Error('No RevenueCat key in this build')),
  logIn: async () => undefined,
  logOut: async () => undefined,
};

const chooseStore = () => {
  // RevenueCat's test keys must never reach the app stores
  if (API_KEY && (__DEV__ || !API_KEY.startsWith('test_'))) return createRevenueCatPlanStore(API_KEY);
  return __DEV__ ? createDevPlanStore() : unavailableStore;
};

export const plans = createPlanService({
  store: chooseStore(),
  auth: authSession,
  baseUrl: API_BASE_URL,
  fetch: (...args) => fetch(...args),
});

// Exercises saved before paying were held back by the server
plans.subscribe(() => {
  if (plans.getState().status === 'active') void syncExercises();
});

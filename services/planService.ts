import AsyncStorage from '@react-native-async-storage/async-storage';

import type { AuthSession } from '@/services/authSession';

const LAST_PLAN_KEY = 'lastKnownPlan';
// RevenueCat moves a restored purchase to whoever restores it, which would take it from the account
const NEEDS_SIGN_IN_KEY = 'planNeedsSignIn';

/** What the store says about this device's coach. RevenueCat sits behind this in the app. */
export interface StorePlan {
  /** When the plan ended or will end. Null if this coach never had one. */
  expiresAt: string | null;
}

export type PlanPeriod = 'annual' | 'monthly';

/** Prices in the coach's own currency. Null if that plan isn't on offer or the store can't say right now. */
export interface PlanPrices {
  annual: string | null;
  monthly: string | null;
}

export interface PlanStore {
  /** Set by a build that has no store to sell through. */
  readonly unavailable?: true;
  getPlan(): Promise<StorePlan>;
  getPrices(): Promise<PlanPrices>;
  /** 'cancelled' when the coach backed out of the store's own sheet. */
  purchase(period: PlanPeriod): Promise<StorePlan | 'cancelled'>;
  restore(): Promise<StorePlan>;
  /** Opens the store's own page where the coach cancels or switches plans. */
  manage(): Promise<void>;
  logIn(userId: string): Promise<void>;
  logOut(): Promise<void>;
}

export type PlanState =
  | { status: 'unknown' }
  | { status: 'none' }
  | { status: 'active'; expiresAt: string }
  | { status: 'lapsed'; expiresAt: string };

interface PlanServiceOptions {
  store: PlanStore;
  auth: Pick<AuthSession, 'getState' | 'subscribe' | 'getAuthHeaders'>;
  baseUrl: string;
  fetch: typeof globalThis.fetch;
  now?: () => number;
}

export class PlanError extends Error {
  constructor(readonly code: 'signInFirst') {
    super(code);
    this.name = 'PlanError';
  }
}

const warnNotLinked = (error: unknown) => console.warn('Could not link the plan to the account:', error);

export function createPlanService({ store, auth, baseUrl, fetch, now = Date.now }: PlanServiceOptions) {
  let state: PlanState = { status: 'unknown' };
  const listeners = new Set<() => void>();

  const toState = ({ expiresAt }: StorePlan): PlanState => {
    if (expiresAt === null) return { status: 'none' };
    return Date.parse(expiresAt) > now() ? { status: 'active', expiresAt } : { status: 'lapsed', expiresAt };
  };

  const adopt = async (plan: StorePlan) => {
    await AsyncStorage.setItem(LAST_PLAN_KEY, JSON.stringify(plan));
    state = toState(plan);
    listeners.forEach(listener => listener());
  };

  const refresh = async () => {
    try {
      await adopt(await store.getPlan());
    } catch {
      // Coaches are often on a pitch with no signal, so the last answer stands until its end date
      const saved = await AsyncStorage.getItem(LAST_PLAN_KEY);
      state = saved ? toState(JSON.parse(saved)) : { status: 'unknown' };
      listeners.forEach(listener => listener());
    }
  };

  /** The server can't tell by itself that a purchase made while signed out now has an account. */
  const tellServer = async () => {
    const headers = await auth.getAuthHeaders();
    if (!headers) return;
    await fetch(`${baseUrl}/me/plan/refresh`, { method: 'POST', headers });
  };

  const signedIn = async (userId: string) => {
    await AsyncStorage.removeItem(NEEDS_SIGN_IN_KEY);
    // Either can fail with no signal, and the next launch tries again. Until then uploads wait,
    // but access doesn't.
    await store.logIn(userId).catch(warnNotLinked);
    await tellServer().catch(warnNotLinked);
    await refresh();
  };

  const signedOut = async () => {
    await AsyncStorage.setItem(NEEDS_SIGN_IN_KEY, 'true');
    await store.logOut().catch(warnNotLinked);
    // The plan belongs to the account now, so the next coach here mustn't inherit it
    await AsyncStorage.removeItem(LAST_PLAN_KEY);
    try {
      await adopt(await store.getPlan());
    } catch {
      await adopt({ expiresAt: null });
    }
  };

  let lastUserId: string | null = null;
  auth.subscribe(() => {
    const current = auth.getState();
    const userId = current.status === 'signedIn' ? current.userId : null;
    if (userId === lastUserId) return;
    lastUserId = userId;
    void (userId ? signedIn(userId) : signedOut());
  });

  return {
    canSell: !store.unavailable,
    getState: () => state,
    getPrices: () => store.getPrices(),
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    restore: async () => {
      if (await AsyncStorage.getItem(NEEDS_SIGN_IN_KEY)) throw new PlanError('signInFirst');
      await adopt(await store.restore());
      await tellServer().catch(warnNotLinked);
    },
    purchase: async (period: PlanPeriod) => {
      const plan = await store.purchase(period);
      if (plan === 'cancelled') return;
      await adopt(plan);
      await tellServer().catch(warnNotLinked);
    },
    manage: async () => {
      await store.manage();
      // The coach may have switched plans there
      await refresh();
    },
    refresh,
  };
}

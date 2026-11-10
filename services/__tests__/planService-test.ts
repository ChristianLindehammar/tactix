import AsyncStorage from '@react-native-async-storage/async-storage';

import { waitFor } from '@testing-library/react-native';

import type { AuthState } from '@/services/authSession';
import { createPlanService, PlanPeriod, PlanStore, StorePlan } from '@/services/planService';

const NOW = Date.parse('2027-01-15T08:00:00Z');
const NEXT_YEAR = '2028-01-15T08:00:00.000Z';
const LAST_YEAR = '2026-01-15T08:00:00.000Z';

function fakeAuth() {
  let state: AuthState = { status: 'signedOut' };
  const listeners = new Set<() => void>();
  return {
    getState: () => state,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    getAuthHeaders: async () => (state.status === 'signedIn' ? { Authorization: 'Bearer secret-token' } : null),
    change: (next: AuthState) => {
      state = next;
      listeners.forEach(listener => listener());
    },
  };
}

const SIGNED_IN: AuthState = { status: 'signedIn', userId: 'account-1', email: 'coach@example.com' };

function setup(initial: StorePlan = { expiresAt: null }) {
  const store: jest.Mocked<PlanStore> = {
    getPlan: jest.fn(async () => initial),
    purchase: jest.fn(async (_period: PlanPeriod) => initial),
    restore: jest.fn(async () => initial),
    manage: jest.fn(async (): Promise<void> => undefined),
    getPrices: jest.fn(async () => ({ annual: '199 kr', monthly: '29 kr' })),
    logIn: jest.fn(async (_userId: string): Promise<void> => undefined),
    logOut: jest.fn(async (): Promise<void> => undefined),
  };
  const auth = fakeAuth();
  const fetch = jest.fn(async (_url: string, _init?: RequestInit) => new Response('{}', { status: 200 }));
  const plans = createPlanService({
    store,
    auth,
    baseUrl: 'https://api.test',
    fetch: fetch as unknown as typeof globalThis.fetch,
    now: () => NOW,
  });
  return { plans, store, auth, fetch };
}

beforeEach(() => AsyncStorage.clear());

test('a coach with a running plan has access', async () => {
  const { plans } = setup({ expiresAt: NEXT_YEAR });

  await plans.refresh();

  expect(plans.getState()).toEqual({ status: 'active', expiresAt: NEXT_YEAR });
});

test('a coach whose plan ended is told apart from one who never had a plan', async () => {
  const lapsed = setup({ expiresAt: LAST_YEAR });
  const never = setup({ expiresAt: null });

  await lapsed.plans.refresh();
  await never.plans.refresh();

  expect(lapsed.plans.getState()).toEqual({ status: 'lapsed', expiresAt: LAST_YEAR });
  expect(never.plans.getState()).toEqual({ status: 'none' });
});

test('a paying coach keeps access when the store cannot be reached', async () => {
  const online = setup({ expiresAt: NEXT_YEAR });
  await online.plans.refresh();

  const offline = setup();
  offline.store.getPlan.mockRejectedValue(new Error('offline'));
  await offline.plans.refresh();

  expect(offline.plans.getState()).toEqual({ status: 'active', expiresAt: NEXT_YEAR });
});

test('buying gives the coach access and tells whoever is watching', async () => {
  const { plans, store } = setup();
  store.purchase.mockResolvedValue({ expiresAt: NEXT_YEAR });
  const onChange = jest.fn();
  plans.subscribe(onChange);

  await plans.purchase('annual');

  expect(plans.getState()).toEqual({ status: 'active', expiresAt: NEXT_YEAR });
  expect(onChange).toHaveBeenCalledTimes(1);
});

test('changing their mind in the store leaves the coach as they were, with no error', async () => {
  const { plans, store } = setup();
  await plans.refresh();
  store.purchase.mockResolvedValue('cancelled');

  await plans.purchase('annual');

  expect(plans.getState()).toEqual({ status: 'none' });
});

test('restoring gives back a plan bought earlier', async () => {
  const { plans, store } = setup();
  store.restore.mockResolvedValue({ expiresAt: NEXT_YEAR });

  await plans.restore();

  expect(plans.getState()).toEqual({ status: 'active', expiresAt: NEXT_YEAR });
});

test('signing in brings in a plan bought on this device and tells the server to check it', async () => {
  const { plans, store, auth, fetch } = setup();
  store.getPlan.mockResolvedValue({ expiresAt: NEXT_YEAR });

  auth.change(SIGNED_IN);

  await waitFor(() => expect(plans.getState()).toEqual({ status: 'active', expiresAt: NEXT_YEAR }));
  expect(store.logIn).toHaveBeenCalledWith('account-1');
  expect(fetch).toHaveBeenCalledWith(
    'https://api.test/me/plan/refresh',
    expect.objectContaining({ method: 'POST', headers: { Authorization: 'Bearer secret-token' } }),
  );
  expect(store.logIn.mock.invocationCallOrder[0]).toBeLessThan(fetch.mock.invocationCallOrder[0]);
});

test('signing in with no signal still leaves the coach with the plan they had', async () => {
  const { plans, store, auth, fetch } = setup({ expiresAt: NEXT_YEAR });
  await plans.refresh();
  store.logIn.mockRejectedValue(new Error('offline'));
  store.getPlan.mockRejectedValue(new Error('offline'));
  fetch.mockRejectedValue(new Error('offline'));
  const onChange = jest.fn();
  plans.subscribe(onChange);

  auth.change(SIGNED_IN);

  await waitFor(() => expect(onChange).toHaveBeenCalled());
  expect(plans.getState()).toEqual({ status: 'active', expiresAt: NEXT_YEAR });
});

test('buying while signed in lets uploads start straight away', async () => {
  const { plans, store, auth, fetch } = setup();
  auth.change(SIGNED_IN);
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
  store.purchase.mockResolvedValue({ expiresAt: NEXT_YEAR });

  await plans.purchase('annual');

  expect(fetch).toHaveBeenCalledTimes(2);
});

test('signing out ends access on this device, even with no signal', async () => {
  const { plans, store, auth } = setup({ expiresAt: NEXT_YEAR });
  auth.change(SIGNED_IN);
  await waitFor(() => expect(plans.getState().status).toBe('active'));
  store.logOut.mockRejectedValue(new Error('offline'));
  store.getPlan.mockRejectedValue(new Error('offline'));

  auth.change({ status: 'signedOut' });

  await waitFor(() => expect(plans.getState()).toEqual({ status: 'none' }));
});

test('restoring after signing out asks for sign-in, so the plan is not taken from the account', async () => {
  const { plans, store, auth } = setup({ expiresAt: NEXT_YEAR });
  auth.change(SIGNED_IN);
  await waitFor(() => expect(plans.getState().status).toBe('active'));
  auth.change({ status: 'signedOut' });
  store.getPlan.mockResolvedValue({ expiresAt: null });
  await waitFor(() => expect(store.logOut).toHaveBeenCalled());

  await expect(plans.restore()).rejects.toMatchObject({ code: 'signInFirst' });

  expect(store.restore).not.toHaveBeenCalled();
});

test('signing back in allows restoring again', async () => {
  const { plans, store, auth } = setup({ expiresAt: NEXT_YEAR });
  auth.change(SIGNED_IN);
  await waitFor(() => expect(plans.getState().status).toBe('active'));
  auth.change({ status: 'signedOut' });
  await waitFor(() => expect(store.logOut).toHaveBeenCalled());
  auth.change(SIGNED_IN);
  await waitFor(() => expect(store.logIn).toHaveBeenCalledTimes(2));

  await waitFor(async () => {
    await plans.restore();
    expect(store.restore).toHaveBeenCalled();
  });
});

test('a coach can buy the monthly plan', async () => {
  const { plans, store } = setup();
  store.purchase.mockResolvedValue({ expiresAt: NEXT_YEAR });

  await plans.purchase('monthly');

  expect(store.purchase).toHaveBeenCalledWith('monthly');
  expect(plans.getState()).toEqual({ status: 'active', expiresAt: NEXT_YEAR });
});

test('after managing their subscription the coach sees the plan the store now reports', async () => {
  const { plans, store } = setup({ expiresAt: NEXT_YEAR });
  await plans.refresh();
  store.getPlan.mockResolvedValue({ expiresAt: LAST_YEAR });

  await plans.manage();

  expect(store.manage).toHaveBeenCalled();
  expect(plans.getState()).toEqual({ status: 'lapsed', expiresAt: LAST_YEAR });
});

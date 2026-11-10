import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as React from 'react';

import { ManageSubscription } from '@/components/ManageSubscription';
import { createPlanService, PlanPeriod, PlanStore, StorePlan } from '@/services/planService';
import i18n from '@/translations/i18n';

const NEXT_YEAR = '2099-01-15T08:00:00.000Z';
const LAST_YEAR = '2020-01-15T08:00:00.000Z';

const t = (key: string) => i18n.t(key);

function setup(plan: StorePlan) {
  const store: jest.Mocked<PlanStore> = {
    getPlan: jest.fn(async () => plan),
    getPrices: jest.fn(async () => ({ annual: '199 kr', monthly: '29 kr' })),
    purchase: jest.fn(async (_period: PlanPeriod) => plan),
    restore: jest.fn(async () => plan),
    manage: jest.fn(async (): Promise<void> => undefined),
    logIn: jest.fn(async (_userId: string): Promise<void> => undefined),
    logOut: jest.fn(async (): Promise<void> => undefined),
  };
  const plans = createPlanService({
    store,
    auth: {
      getState: () => ({ status: 'signedOut' }),
      subscribe: () => () => undefined,
      getAuthHeaders: async () => null,
    },
    baseUrl: 'https://api.test',
    fetch: jest.fn() as unknown as typeof globalThis.fetch,
  });
  render(<ManageSubscription plans={plans} />);
  return { store };
}

beforeEach(() => AsyncStorage.clear());

test('a paying coach can open the store to manage their subscription', async () => {
  const { store } = setup({ expiresAt: NEXT_YEAR });

  fireEvent.press(await screen.findByRole('button', { name: t('planManage') }));

  await waitFor(() => expect(store.manage).toHaveBeenCalled());
});

test.each([
  ['never had a plan', null],
  ['whose plan ended', LAST_YEAR],
])('a coach who %s is not offered it', async (_case, expiresAt) => {
  const { store } = setup({ expiresAt });

  await waitFor(() => expect(store.getPlan).toHaveBeenCalled());

  expect(screen.queryByRole('button', { name: t('planManage') })).toBeNull();
});

test('the coach is told when the store page could not be opened', async () => {
  const { store } = setup({ expiresAt: NEXT_YEAR });
  store.manage.mockRejectedValue(new Error('offline'));

  fireEvent.press(await screen.findByRole('button', { name: t('planManage') }));

  expect(await screen.findByText(t('planErrorManage'))).toBeTruthy();
});

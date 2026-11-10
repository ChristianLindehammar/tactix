import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as React from 'react';
import { Linking, Text } from 'react-native';

import { PlanGate } from '@/components/PlanGate';
import { createPlanService, PlanPeriod, PlanStore, StorePlan } from '@/services/planService';
import i18n from '@/translations/i18n';

const NEXT_YEAR = '2099-01-15T08:00:00.000Z';
const LAST_YEAR = '2020-01-15T08:00:00.000Z';

const t = (key: string, options?: Record<string, unknown>) => i18n.t(key, options);

function setup(plan: StorePlan, { offline = false, unavailable = false } = {}) {
  const store: jest.Mocked<PlanStore> = {
    ...(unavailable ? { unavailable: true as const } : {}),
    getPlan: jest.fn(async () => plan),
    getPrices: jest.fn(async () => ({ annual: '199 kr', monthly: '29 kr' })),
    purchase: jest.fn(async (_period: PlanPeriod) => plan),
    restore: jest.fn(async () => plan),
    manage: jest.fn(async (): Promise<void> => undefined),
    logIn: jest.fn(async (_userId: string): Promise<void> => undefined),
    logOut: jest.fn(async (): Promise<void> => undefined),
  };
  if (offline) store.getPlan.mockRejectedValue(new Error('offline'));
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
  const onExport = jest.fn(async () => undefined);
  const onDeleteAll = jest.fn(async () => undefined);
  render(
    <PlanGate plans={plans} onExport={onExport} onDeleteAll={onDeleteAll}>
      <Text>the library</Text>
    </PlanGate>,
  );
  return { store, onExport, onDeleteAll };
}

beforeEach(() => AsyncStorage.clear());

test('a paying coach sees their exercises', async () => {
  setup({ expiresAt: NEXT_YEAR });

  expect(await screen.findByText('the library')).toBeTruthy();
});

test('a coach who never had a plan sees the trial and its price instead of exercises', async () => {
  setup({ expiresAt: null });

  expect(await screen.findByText(t('planTrialYear', { price: '199 kr' }))).toBeTruthy();
  expect(screen.getByRole('button', { name: t('planStartTrial') })).toBeTruthy();
  expect(screen.queryByText('the library')).toBeNull();
});

test('starting the trial opens up the exercises', async () => {
  const { store } = setup({ expiresAt: null });
  store.purchase.mockResolvedValue({ expiresAt: NEXT_YEAR });

  fireEvent.press(await screen.findByRole('button', { name: t('planStartTrial') }));

  expect(await screen.findByText('the library')).toBeTruthy();
});

test('a purchase that fails says so and leaves the exercises locked', async () => {
  const { store } = setup({ expiresAt: null });
  store.purchase.mockRejectedValue(new Error('store failed'));

  fireEvent.press(await screen.findByRole('button', { name: t('planStartTrial') }));

  expect(await screen.findByRole('alert')).toHaveTextContent(t('planErrorPurchase'));
  expect(screen.queryByText('the library')).toBeNull();
});

test('restoring brings back a plan bought earlier', async () => {
  const { store } = setup({ expiresAt: null });
  store.restore.mockResolvedValue({ expiresAt: NEXT_YEAR });

  fireEvent.press(await screen.findByRole('button', { name: t('planRestore') }));

  expect(await screen.findByText('the library')).toBeTruthy();
});

test('a coach whose plan ended is told their exercises are safe, and can renew', async () => {
  const { store } = setup({ expiresAt: LAST_YEAR });
  store.purchase.mockResolvedValue({ expiresAt: NEXT_YEAR });

  expect(await screen.findByText(t('planEndedTitle'))).toBeTruthy();
  expect(screen.queryByText('the library')).toBeNull();
  expect(screen.queryByRole('button', { name: t('planStartTrial') })).toBeNull();

  fireEvent.press(screen.getByRole('button', { name: t('planRenew') }));

  expect(await screen.findByText('the library')).toBeTruthy();
});

test('a coach whose plan ended can still take their exercises with them', async () => {
  const { onExport } = setup({ expiresAt: LAST_YEAR });

  fireEvent.press(await screen.findByRole('button', { name: t('planExport') }));

  await waitFor(() => expect(onExport).toHaveBeenCalledTimes(1));
});

test('a coach whose plan ended can delete their exercises, after confirming', async () => {
  const { onDeleteAll } = setup({ expiresAt: LAST_YEAR });

  fireEvent.press(await screen.findByRole('button', { name: t('planDeleteAll') }));
  expect(onDeleteAll).not.toHaveBeenCalled();
  fireEvent.press(await screen.findByRole('button', { name: t('planDeleteAllYes') }));

  await waitFor(() => expect(onDeleteAll).toHaveBeenCalledTimes(1));
});

test('a coach is told if their plan could not be checked, and can try again', async () => {
  const { store } = setup({ expiresAt: NEXT_YEAR }, { offline: true });

  expect(await screen.findByRole('alert')).toHaveTextContent(t('planErrorCheck'));
  store.getPlan.mockResolvedValue({ expiresAt: NEXT_YEAR });
  fireEvent.press(screen.getByRole('button', { name: t('planTryAgain') }));

  expect(await screen.findByText('the library')).toBeTruthy();
});

test('restoring when nothing was bought says so', async () => {
  setup({ expiresAt: null });

  fireEvent.press(await screen.findByRole('button', { name: t('planRestore') }));

  expect(await screen.findByRole('alert')).toHaveTextContent(t('planNothingToRestore'));
});

test('a coach can see both plans and their prices', async () => {
  setup({ expiresAt: null });

  expect(await screen.findByRole('radio', { name: t('planPerYear', { price: '199 kr' }) })).toBeTruthy();
  expect(screen.getByRole('radio', { name: t('planPerMonth', { price: '29 kr' }) })).toBeTruthy();
});

test('a coach who chooses monthly is told the monthly terms and buys monthly', async () => {
  const { store } = setup({ expiresAt: null });
  store.purchase.mockResolvedValue({ expiresAt: NEXT_YEAR });

  fireEvent.press(await screen.findByRole('radio', { name: t('planPerMonth', { price: '29 kr' }) }));

  expect(screen.getByRole('radio', { name: t('planPerMonth', { price: '29 kr' }), selected: true })).toBeTruthy();
  expect(screen.getByText(t('planTrialMonth', { price: '29 kr' }))).toBeTruthy();
  fireEvent.press(screen.getByRole('button', { name: t('planStartTrial') }));

  expect(await screen.findByText('the library')).toBeTruthy();
  expect(store.purchase).toHaveBeenCalledWith('monthly');
});

test('when only the monthly plan is on offer, that is the one a coach buys', async () => {
  const { store } = setup({ expiresAt: null });
  store.getPrices.mockResolvedValue({ annual: null, monthly: '29 kr' });
  store.purchase.mockResolvedValue({ expiresAt: NEXT_YEAR });

  expect(await screen.findByText(t('planTrialMonth', { price: '29 kr' }))).toBeTruthy();
  fireEvent.press(screen.getByRole('button', { name: t('planStartTrial') }));

  await screen.findByText('the library');
  expect(store.purchase).toHaveBeenCalledWith('monthly');
});

test('a coach whose plan ended can renew on either plan', async () => {
  const { store } = setup({ expiresAt: LAST_YEAR });
  store.purchase.mockResolvedValue({ expiresAt: NEXT_YEAR });

  fireEvent.press(await screen.findByRole('radio', { name: t('planPerMonth', { price: '29 kr' }) }));
  fireEvent.press(screen.getByRole('button', { name: t('planRenew') }));

  await screen.findByText('the library');
  expect(store.purchase).toHaveBeenCalledWith('monthly');
});

test('a build that cannot sell says so instead of offering a trial that fails', async () => {
  setup({ expiresAt: null }, { unavailable: true });

  expect(await screen.findByText(t('planUnavailable'))).toBeTruthy();
  expect(screen.queryByRole('button', { name: t('planStartTrial') })).toBeNull();
  expect(screen.queryByRole('button', { name: t('planRestore') })).toBeNull();
});

test.each([
  ['planTermsOfUse', 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/'],
  ['planPrivacyPolicy', 'https://lindehammar-konsult.se/privacy-policy.html'],
])('the terms a coach subscribes under are one tap away: %s', async (labelKey, url) => {
  const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  setup({ expiresAt: null });

  fireEvent.press(await screen.findByRole('link', { name: t(labelKey) }));

  expect(openURL).toHaveBeenCalledWith(url);
});

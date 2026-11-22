import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as React from 'react';
import { Linking, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { legalLinksFor, PlanGate } from '@/components/PlanGate';
import { sampleExercise } from '@/constants/libraryHighlights';
import { SportProvider } from '@/context/SportContext';
import type { Sport } from '@/constants/sports';
import { createAuthSession } from '@/services/authSession';
import { createUserIdentity } from '@/services/currentUser';
import { createPlanService, PlanStore, StorePlan } from '@/services/planService';
import i18n from '@/translations/i18n';

const NEXT_YEAR = '2099-01-15T08:00:00.000Z';
const LAST_YEAR = '2020-01-15T08:00:00.000Z';
const LIFETIME: StorePlan = {
  expiresAt: '2100-01-01T00:00:00.000Z',
  lifetime: true,
};

const t = (key: string, options?: Record<string, unknown>) => i18n.t(key, options);

// The app has these at its root, and the sample's diagram needs them
const SAFE_AREA = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

const json = (status: number, body: unknown = {}) =>
  new Response(status === 204 ? null : JSON.stringify(body), { status });

interface Options {
  signedIn?: boolean;
  offline?: boolean;
  unavailable?: boolean;
  price?: string | null;
  sport?: Sport | null;
}

async function setup(
  plan: StorePlan,
  { signedIn = true, offline = false, unavailable = false, price = '349 kr', sport = 'floorball' }: Options = {},
) {
  let token: string | null = null;
  if (signedIn) {
    token = 'secret';
    await AsyncStorage.setItem('account', JSON.stringify({ userId: 'account-1', email: 'coach@example.com' }));
  }
  const fetch = jest.fn(async (url: string, _init?: RequestInit) =>
    url.endsWith('/auth/email/start') ? json(202) : json(204),
  ) as unknown as typeof globalThis.fetch;
  const session = createAuthSession({
    baseUrl: 'https://api.test',
    fetch,
    identity: createUserIdentity(),
    usesCookies: false,
    tokenStore: {
      get: async () => token,
      set: async value => void (token = value),
      clear: async () => void (token = null),
    },
  });
  const store: jest.Mocked<PlanStore> = {
    ...(unavailable ? { unavailable: true as const } : {}),
    getPlan: jest.fn(async () => plan),
    getPrice: jest.fn(async () => price),
    purchase: jest.fn(async () => plan),
    restore: jest.fn(async () => plan),
    manage: jest.fn(async (): Promise<void> => undefined),
    logIn: jest.fn(async (_userId: string, _email: string | null): Promise<void> => undefined),
    logOut: jest.fn(async (): Promise<void> => undefined),
  };
  if (offline) store.getPlan.mockRejectedValue(new Error('offline'));
  const plans = createPlanService({
    store,
    auth: session,
    baseUrl: 'https://api.test',
    fetch,
  });
  const onExport = jest.fn(async () => undefined);
  const onDeleteAll = jest.fn(async () => undefined);
  render(
    <SafeAreaProvider initialMetrics={SAFE_AREA}>
      <SportProvider>
        <PlanGate
          plans={plans}
          session={session}
          providers={[]}
          restoreSession={() => session.restore()}
          sport={sport}
          onExport={onExport}
          onDeleteAll={onDeleteAll}
        >
          <Text>the library</Text>
        </PlanGate>
      </SportProvider>
    </SafeAreaProvider>,
  );
  return { store, onExport, onDeleteAll };
}

const buyButton = (price = '349 kr') => screen.findByRole('button', { name: t('planBuy', { price }) });

beforeEach(() => AsyncStorage.clear());

test('a paying coach sees their exercises', async () => {
  await setup({ expiresAt: NEXT_YEAR });

  expect(await screen.findByText('the library')).toBeTruthy();
});

test('a coach who bought once sees their exercises', async () => {
  await setup(LIFETIME);

  expect(await screen.findByText('the library')).toBeTruthy();
});

test('a coach who has not bought is shown what their sport gets and the one-time price', async () => {
  await setup({ expiresAt: null }, { sport: 'floorball' });

  expect(await buyButton()).toBeTruthy();
  // Once in the headline and once in the list of sports
  expect(screen.getAllByText('130+')).toHaveLength(2);
  expect(screen.getByText(t('planCountForSport', { sport: t('floorball').toLowerCase() }))).toBeTruthy();
  expect(screen.getByText(t('planOneTime'))).toBeTruthy();
  expect(screen.queryByText('the library')).toBeNull();
});

test('a coach sees a whole exercise from their sport before buying', async () => {
  await setup({ expiresAt: null }, { sport: 'bandy' });

  expect(await screen.findByText(sampleExercise('bandy', i18n.locale).title)).toBeTruthy();
});

test('a coach with no sport chosen is told about every sport', async () => {
  await setup({ expiresAt: null }, { sport: null });

  expect(await screen.findByText('550+')).toBeTruthy();
  expect(screen.getByText(t('planCountAllSports'))).toBeTruthy();
});

test('buying opens up the exercises', async () => {
  const { store } = await setup({ expiresAt: null });
  store.purchase.mockResolvedValue(LIFETIME);

  fireEvent.press(await buyButton());

  expect(await screen.findByText('the library')).toBeTruthy();
});

test('a signed-out coach is asked to sign in before buying, and can go back', async () => {
  const { store } = await setup({ expiresAt: null }, { signedIn: false });

  fireEvent.press(await buyButton());

  expect(await screen.findByText(t('planSignInTitle'))).toBeTruthy();
  expect(store.purchase).not.toHaveBeenCalled();
  fireEvent.press(screen.getByRole('button', { name: t('planBack') }));
  expect(await buyButton()).toBeTruthy();
});

test('a signed-out coach who bought on another phone can sign in from the sales page', async () => {
  await setup({ expiresAt: null }, { signedIn: false });

  fireEvent.press(await screen.findByRole('button', { name: t('planAlreadyBought') }));

  expect(await screen.findByText(t('planSignInTitle'))).toBeTruthy();
});

test('a signed-in coach is not asked to sign in', async () => {
  await setup({ expiresAt: null });

  await buyButton();
  expect(screen.queryByRole('button', { name: t('planAlreadyBought') })).toBeNull();
});

test('a purchase that fails says so and leaves the exercises locked', async () => {
  const { store } = await setup({ expiresAt: null });
  store.purchase.mockRejectedValue(new Error('store failed'));

  fireEvent.press(await buyButton());

  expect(await screen.findByRole('alert')).toHaveTextContent(t('planErrorPurchase'));
  expect(screen.queryByText('the library')).toBeNull();
});

test('restoring brings back a purchase made earlier', async () => {
  const { store } = await setup({ expiresAt: null });
  store.restore.mockResolvedValue(LIFETIME);

  fireEvent.press(await screen.findByRole('button', { name: t('planRestore') }));

  expect(await screen.findByText('the library')).toBeTruthy();
});

test('restoring when nothing was bought says so', async () => {
  await setup({ expiresAt: null });

  fireEvent.press(await screen.findByRole('button', { name: t('planRestore') }));

  expect(await screen.findByRole('alert')).toHaveTextContent(t('planNothingToRestore'));
});

test('restoring a purchase that belongs to an account asks the coach to sign in to it', async () => {
  await setup({ expiresAt: null }, { signedIn: false });
  await AsyncStorage.setItem('planNeedsSignIn', 'true');

  fireEvent.press(await screen.findByRole('button', { name: t('planRestore') }));

  expect(await screen.findByText(t('planSignInTitle'))).toBeTruthy();
});

test('a coach whose plan ended is told their exercises are safe, and can unlock them for good', async () => {
  const { store } = await setup({ expiresAt: LAST_YEAR });
  store.purchase.mockResolvedValue(LIFETIME);

  expect(await screen.findByText(t('planEndedTitle'))).toBeTruthy();
  expect(screen.queryByText('the library')).toBeNull();

  fireEvent.press(await buyButton());

  expect(await screen.findByText('the library')).toBeTruthy();
});

test('a coach whose plan ended can still take their exercises with them', async () => {
  const { onExport } = await setup({ expiresAt: LAST_YEAR });

  fireEvent.press(await screen.findByRole('button', { name: t('planExport') }));

  await waitFor(() => expect(onExport).toHaveBeenCalledTimes(1));
});

test('a coach whose plan ended can delete their exercises, after confirming', async () => {
  const { onDeleteAll } = await setup({ expiresAt: LAST_YEAR });

  fireEvent.press(await screen.findByRole('button', { name: t('planDeleteAll') }));
  expect(onDeleteAll).not.toHaveBeenCalled();
  fireEvent.press(await screen.findByRole('button', { name: t('planDeleteAllYes') }));

  await waitFor(() => expect(onDeleteAll).toHaveBeenCalledTimes(1));
});

test('a coach is told if their plan could not be checked, and can try again', async () => {
  const { store } = await setup({ expiresAt: NEXT_YEAR }, { offline: true });

  expect(await screen.findByRole('alert')).toHaveTextContent(t('planErrorCheck'));
  store.getPlan.mockResolvedValue({ expiresAt: NEXT_YEAR });
  fireEvent.press(screen.getByRole('button', { name: t('planTryAgain') }));

  expect(await screen.findByText('the library')).toBeTruthy();
});

test('when the store gives no price the coach cannot buy yet', async () => {
  await setup({ expiresAt: null }, { price: null });

  expect(await screen.findByRole('button', { name: t('planBuyNoPrice') })).toBeDisabled();
});

test('a build that cannot sell still shows what is included, and says it cannot sell', async () => {
  await setup({ expiresAt: null }, { unavailable: true });

  expect(await screen.findByText(t('planUnavailable'))).toBeTruthy();
  expect(screen.getByText(t('planTitle'))).toBeTruthy();
  expect(screen.queryByRole('button', { name: t('planBuy', { price: '349 kr' }) })).toBeNull();
  expect(screen.queryByRole('button', { name: t('planRestore') })).toBeNull();
});

test.each([
  ['planTermsOfUse', 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/'],
  ['planPrivacyPolicy', 'https://lindehammar-konsult.se/privacy-policy.html'],
])('the terms a coach buys under are one tap away: %s', async (labelKey, url) => {
  const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  await setup({ expiresAt: null });

  fireEvent.press(await screen.findByRole('link', { name: t(labelKey) }));

  expect(openURL).toHaveBeenCalledWith(url);
});

test.each([
  ['ios', 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/'],
  ['android', 'https://lindehammar-konsult.se/terms-of-use.html'],
])('a coach on %s reads the terms of the store they buy from', (os, url) => {
  const terms = legalLinksFor(os).find(link => link.labelKey === 'planTermsOfUse');

  expect(terms?.url).toBe(url);
});

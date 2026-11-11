import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import * as React from 'react';
import { Text } from 'react-native';

import { AccountGate } from '@/components/AccountGate';
import { createAuthSession } from '@/services/authSession';
import { createUserIdentity } from '@/services/currentUser';
import i18n from '@/translations/i18n';

const json = (status: number, body: unknown = {}) =>
  new Response(status === 204 ? null : JSON.stringify(body), { status });

const t = (key: string) => i18n.t(key);

const setup = async ({ signedInLastLaunch = false } = {}) => {
  const fetch = jest.fn(async (url: string, _init?: RequestInit) =>
    url.endsWith('/auth/email/start')
      ? json(202)
      : url.endsWith('/auth/email/verify')
        ? json(200, { userId: 'account-1', email: 'coach@example.com', token: 'secret' })
        : json(204),
  );
  let token: string | null = null;
  if (signedInLastLaunch) {
    token = 'secret';
    await AsyncStorage.setItem('account', JSON.stringify({ userId: 'account-1', email: 'coach@example.com' }));
  }
  const session = createAuthSession({
    baseUrl: 'https://api.test',
    fetch: fetch as unknown as typeof globalThis.fetch,
    identity: createUserIdentity(),
    usesCookies: false,
    tokenStore: {
      get: async () => token,
      set: async value => void (token = value),
      clear: async () => void (token = null),
    },
  });
  let finishRestore!: () => void;
  const restoring = new Promise<void>(resolve => (finishRestore = resolve));
  const restore = jest.fn(() => restoring.then(() => session.restore()));
  render(
    <AccountGate session={session} providers={[]} restore={restore}>
      <Text>the library</Text>
    </AccountGate>,
  );
  return { session, finishRestore };
};

beforeEach(() => AsyncStorage.clear());

test('a signed-out coach is asked for an account before seeing exercises', async () => {
  const { finishRestore } = await setup();
  await act(async () => finishRestore());

  expect(await screen.findByText(t('accountGateTitle'))).toBeTruthy();
  expect(screen.getByLabelText(t('accountEmail'))).toBeTruthy();
  expect(screen.queryByText('the library')).toBeNull();
});

test('signing in opens up the exercises', async () => {
  const { finishRestore } = await setup();
  await act(async () => finishRestore());

  fireEvent.changeText(await screen.findByLabelText(t('accountEmail')), 'coach@example.com');
  fireEvent.press(screen.getByRole('button', { name: t('accountSendCode') }));
  fireEvent.changeText(await screen.findByLabelText(t('accountCode')), '123456');
  fireEvent.press(screen.getByRole('button', { name: t('accountVerifyCode') }));

  expect(await screen.findByText('the library')).toBeTruthy();
});

test('a coach signed in last launch never sees the sign-in prompt', async () => {
  const { finishRestore } = await setup({ signedInLastLaunch: true });

  expect(screen.queryByText(t('accountGateTitle'))).toBeNull();
  await act(async () => finishRestore());

  expect(await screen.findByText('the library')).toBeTruthy();
});

test('signing out locks the exercises again', async () => {
  const { session, finishRestore } = await setup({ signedInLastLaunch: true });
  await act(async () => finishRestore());
  await screen.findByText('the library');

  await act(async () => session.signOut());

  expect(await screen.findByText(t('accountGateTitle'))).toBeTruthy();
  expect(screen.queryByText('the library')).toBeNull();
});

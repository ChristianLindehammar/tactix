import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as React from 'react';

import { AccountPanel } from '@/components/AccountPanel';
import { createAuthSession } from '@/services/authSession';
import { createUserIdentity } from '@/services/currentUser';
import i18n from '@/translations/i18n';

const json = (status: number, body: unknown = {}) =>
  new Response(status === 204 ? null : JSON.stringify(body), { status });

const setup = () => {
  const fetch = jest.fn(async (url: string, _init?: RequestInit) =>
    url.endsWith('/auth/email/start')
      ? json(202)
      : url.endsWith('/auth/email/verify')
        ? json(200, { userId: 'account-1', email: 'coach@example.com', token: 'secret' })
        : json(204),
  );
  let token: string | null = null;
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
  render(<AccountPanel session={session} />);
  return { session, fetch };
};

const t = (key: string) => i18n.t(key);

const signIn = async () => {
  fireEvent.changeText(screen.getByLabelText(t('accountEmail')), 'coach@example.com');
  fireEvent.press(screen.getByRole('button', { name: t('accountSendCode') }));
  fireEvent.changeText(await screen.findByLabelText(t('accountCode')), '123456');
  fireEvent.press(screen.getByRole('button', { name: t('accountVerifyCode') }));
  await screen.findByRole('button', { name: t('accountSignOut') });
};

beforeEach(() => AsyncStorage.clear());

test('a coach signs in with the code sent to their email', async () => {
  setup();

  await signIn();

  expect(screen.getByText('coach@example.com')).toBeTruthy();
});

test('the code goes to the server with the address and language', async () => {
  const { fetch } = setup();

  await signIn();

  const start = fetch.mock.calls.find(([url]) => url.endsWith('/auth/email/start'))!;
  expect(JSON.parse(start[1]!.body as string)).toEqual({ email: 'coach@example.com', locale: i18n.locale });
});

test('asking for a code needs an address', () => {
  setup();

  expect(screen.getByRole('button', { name: t('accountSendCode') })).toBeDisabled();
});

test.each([
  ['/auth/email/start', () => json(400, { error: 'invalidEmail' }), 'accountErrorInvalidEmail'],
  ['/auth/email/start', () => json(429), 'accountErrorRateLimited'],
  ['/auth/email/start', () => json(503), 'accountErrorUnavailable'],
])('explains a refused request for a code', async (_path, answer, message) => {
  const { fetch } = setup();
  fetch.mockImplementationOnce(async () => answer());
  fireEvent.changeText(screen.getByLabelText(t('accountEmail')), 'coach@example.com');

  fireEvent.press(screen.getByRole('button', { name: t('accountSendCode') }));

  expect(await screen.findByText(t(message))).toBeTruthy();
  expect(screen.getByLabelText(t('accountEmail'))).toBeTruthy();
});

test('explains being offline', async () => {
  const { fetch } = setup();
  fetch.mockRejectedValueOnce(new TypeError('Network request failed'));
  fireEvent.changeText(screen.getByLabelText(t('accountEmail')), 'coach@example.com');

  fireEvent.press(screen.getByRole('button', { name: t('accountSendCode') }));

  expect(await screen.findByText(t('accountErrorOffline'))).toBeTruthy();
});

test('a wrong code keeps the coach on the code step, and they can try again', async () => {
  const { fetch } = setup();
  fireEvent.changeText(screen.getByLabelText(t('accountEmail')), 'coach@example.com');
  fireEvent.press(screen.getByRole('button', { name: t('accountSendCode') }));
  fireEvent.changeText(await screen.findByLabelText(t('accountCode')), '000000');
  fetch.mockImplementationOnce(async () => json(400, { error: 'invalidCode' }));

  fireEvent.press(screen.getByRole('button', { name: t('accountVerifyCode') }));
  expect(await screen.findByText(t('accountErrorInvalidCode'))).toBeTruthy();

  fireEvent.changeText(screen.getByLabelText(t('accountCode')), '123456');
  fireEvent.press(screen.getByRole('button', { name: t('accountVerifyCode') }));

  expect(await screen.findByRole('button', { name: t('accountSignOut') })).toBeTruthy();
  expect(screen.queryByText(t('accountErrorInvalidCode'))).toBeNull();
});

test('a coach can go back and correct their address', async () => {
  setup();
  fireEvent.changeText(screen.getByLabelText(t('accountEmail')), 'typo@example.com');
  fireEvent.press(screen.getByRole('button', { name: t('accountSendCode') }));

  fireEvent.press(await screen.findByRole('button', { name: t('accountUseAnotherEmail') }));

  expect(screen.getByLabelText(t('accountEmail')).props.value).toBe('typo@example.com');
});

test('signing out returns to the start with the address cleared', async () => {
  setup();
  await signIn();

  fireEvent.press(screen.getByRole('button', { name: t('accountSignOut') }));

  const field = await screen.findByLabelText(t('accountEmail'));
  expect(field.props.value).toBe('');
});

describe('deleting the account', () => {
  const lastDelete = (fetch: ReturnType<typeof setup>['fetch']) =>
    fetch.mock.calls.filter(([, init]) => init?.method === 'DELETE');

  test('nothing happens until it is confirmed', async () => {
    const { fetch } = setup();
    await signIn();

    fireEvent.press(screen.getByRole('button', { name: t('accountDelete') }));

    expect(screen.getByText(t('accountDeleteExplanation'))).toBeTruthy();
    expect(lastDelete(fetch)).toHaveLength(0);
  });

  test('can be cancelled', async () => {
    const { fetch } = setup();
    await signIn();
    fireEvent.press(screen.getByRole('button', { name: t('accountDelete') }));

    fireEvent.press(screen.getByRole('button', { name: t('cancel') }));

    expect(screen.queryByText(t('accountDeleteExplanation'))).toBeNull();
    expect(lastDelete(fetch)).toHaveLength(0);
  });

  test('confirming deletes it and signs out', async () => {
    const { fetch } = setup();
    await signIn();
    fireEvent.press(screen.getByRole('button', { name: t('accountDelete') }));

    fireEvent.press(screen.getByRole('button', { name: t('accountDeleteConfirm') }));

    expect(await screen.findByLabelText(t('accountEmail'))).toBeTruthy();
    await waitFor(() => expect(lastDelete(fetch)).toHaveLength(1));
  });

  test('a failure says so and stays signed in', async () => {
    const { fetch } = setup();
    await signIn();
    fireEvent.press(screen.getByRole('button', { name: t('accountDelete') }));
    fetch.mockImplementationOnce(async () => json(503));

    fireEvent.press(screen.getByRole('button', { name: t('accountDeleteConfirm') }));

    expect(await screen.findByText(t('accountErrorUnavailable'))).toBeTruthy();
    expect(screen.getByRole('button', { name: t('accountSignOut') })).toBeTruthy();
  });
});

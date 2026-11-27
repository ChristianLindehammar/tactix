import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as React from 'react';

import { AccountPanel } from '@/components/AccountPanel';
import { createAuthSession } from '@/services/authSession';
import { createUserIdentity } from '@/services/currentUser';
import { LibraryError } from '@/services/library';
import type { SignInProvider } from '@/services/signInProviders';
import i18n from '@/translations/i18n';

const json = (status: number, body: unknown = {}) =>
  new Response(status === 204 ? null : JSON.stringify(body), { status });

/** Only coach@example.com has an account, like a server where the coach signed up once. */
const answer = async (url: string, init?: RequestInit) => {
  if (url.endsWith('/auth/email/start')) return json(202);
  if (url.endsWith('/auth/email/verify')) {
    const body = JSON.parse(String(init?.body));
    if (body.email !== 'coach@example.com' && body.createAccount === false) return json(404, { error: 'noAccount' });
    const userId = body.email === 'coach@example.com' ? 'account-1' : 'account-2';
    return json(200, { userId, email: body.email, token: 'secret' });
  }
  if (url.endsWith('/auth/provider')) return json(200, { userId: 'account-1', email: 'coach@example.com', token: 'secret' });
  return json(204);
};

const setup = (
  providers: SignInProvider[] = [],
  profile?: React.ComponentProps<typeof AccountPanel>['profile'],
  savedToken: string | null = null,
) => {
  const fetch = jest.fn(answer);
  let token: string | null = savedToken;
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
  render(<AccountPanel session={session} providers={providers} profile={profile} />);
  return { session, fetch };
};

const t = (key: string) => i18n.t(key);

const signIn = async (address = 'coach@example.com') => {
  await enterCode(address);
  await screen.findByRole('button', { name: t('accountSignOut') });
};

const enterCode = async (address: string) => {
  fireEvent.changeText(await screen.findByLabelText(t('accountEmail')), address);
  fireEvent.press(screen.getByRole('button', { name: t('accountSendCode') }));
  fireEvent.changeText(await screen.findByLabelText(t('accountCode')), '123456');
  fireEvent.press(screen.getByRole('button', { name: t('accountVerifyCode') }));
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

test('a coach signs in with Google, and the server gets the token', async () => {
  const { fetch } = setup([{ id: 'google', signIn: async () => ({ idToken: 'google-token', nonce: null }) }]);

  fireEvent.press(screen.getByRole('button', { name: t('accountContinueWithGoogle') }));

  await screen.findByRole('button', { name: t('accountSignOut') });
  const call = fetch.mock.calls.find(([url]) => url.endsWith('/auth/provider'))!;
  expect(JSON.parse(call[1]!.body as string)).toEqual({ provider: 'google', idToken: 'google-token', nonce: null });
});

test('backing out of a provider sign-in is not an error', async () => {
  const { fetch } = setup([{ id: 'apple', signIn: async () => null }]);

  fireEvent.press(screen.getByRole('button', { name: t('accountContinueWithApple') }));

  await waitFor(() => expect(screen.getByRole('button', { name: t('accountContinueWithApple') })).toBeEnabled());
  expect(screen.queryByRole('alert')).toBeNull();
  expect(fetch).not.toHaveBeenCalled();
});

test('a provider that fails shows an error and leaves the coach signed out', async () => {
  const { session } = setup([{ id: 'google', signIn: () => Promise.reject(new Error('Play services missing')) }]);

  fireEvent.press(screen.getByRole('button', { name: t('accountContinueWithGoogle') }));

  expect(await screen.findByRole('alert')).toBeTruthy();
  expect(session.getState().status).toBe('signedOut');
});

describe('the display name', () => {
  const profileWith = (name: string | null) => ({
    getDisplayName: jest.fn(async () => name),
    setDisplayName: jest.fn(async (_name: string | null) => undefined),
  });

  it('shows the name chosen before, once signed in', async () => {
    setup([], profileWith('Coach Anna'));
    await signIn();

    expect(await screen.findByDisplayValue('Coach Anna')).toBeTruthy();
    expect(screen.getByText(t('displayNameHint'))).toBeTruthy();
  });

  it('saves a new name', async () => {
    const profile = profileWith(null);
    setup([], profile);
    await signIn();

    fireEvent.changeText(await screen.findByLabelText(t('displayName')), 'Coach Anna');
    fireEvent.press(screen.getByRole('button', { name: t('displayNameSave') }));

    await waitFor(() => expect(profile.setDisplayName).toHaveBeenCalledWith('Coach Anna'));
    expect(await screen.findByText(t('displayNameSaved'))).toBeTruthy();
  });

  it('clears the name when the field is emptied', async () => {
    const profile = profileWith('Coach Anna');
    setup([], profile);
    await signIn();

    fireEvent.changeText(await screen.findByDisplayValue('Coach Anna'), '  ');
    fireEvent.press(screen.getByRole('button', { name: t('displayNameSave') }));

    await waitFor(() => expect(profile.setDisplayName).toHaveBeenCalledWith(null));
  });

  it('explains a name the server refuses', async () => {
    const profile = profileWith(null);
    profile.setDisplayName.mockRejectedValue(new LibraryError('invalidDisplayName'));
    setup([], profile);
    await signIn();

    fireEvent.changeText(await screen.findByLabelText(t('displayName')), 'Anna');
    fireEvent.press(screen.getByRole('button', { name: t('displayNameSave') }));

    expect(await screen.findByText(t('displayNameInvalid'))).toBeTruthy();
  });
});

test('an address with no account asks before making one, naming the account the phone had', async () => {
  setup();
  await signIn();
  fireEvent.press(screen.getByRole('button', { name: t('accountSignOut') }));

  await enterCode('other@example.com');

  expect(await screen.findByText(i18n.t('accountNoAccountMessage', { email: 'other@example.com', previous: 'coach@example.com' }))).toBeTruthy();
  expect(screen.queryByRole('button', { name: t('accountSignOut') })).toBeNull();
});

test('the coach can still make the new account with the same code', async () => {
  setup();
  await signIn();
  fireEvent.press(screen.getByRole('button', { name: t('accountSignOut') }));
  await enterCode('other@example.com');

  fireEvent.press(await screen.findByRole('button', { name: t('accountCreateNewAccount') }));

  await screen.findByRole('button', { name: t('accountSignOut') });
  expect(screen.getByText('other@example.com')).toBeTruthy();
});

test('going back leaves the coach signed out, ready to sign in another way', async () => {
  setup();
  await signIn();
  fireEvent.press(screen.getByRole('button', { name: t('accountSignOut') }));
  await enterCode('other@example.com');

  fireEvent.press(await screen.findByRole('button', { name: t('accountNoAccountBack') }));

  expect(await screen.findByRole('button', { name: t('accountSendCode') })).toBeTruthy();
  expect(screen.queryByRole('button', { name: t('accountSignOut') })).toBeNull();
});

test('a phone signed in before this version also asks', async () => {
  // How the app left a signed-in phone before it remembered the last account
  await AsyncStorage.setItem('account', JSON.stringify({ userId: 'account-1', email: 'coach@example.com' }));
  const { session } = setup([], undefined, 'secret');
  await act(() => session.restore());
  fireEvent.press(await screen.findByRole('button', { name: t('accountSignOut') }));

  await enterCode('other@example.com');

  expect(await screen.findByRole('button', { name: t('accountCreateNewAccount') })).toBeTruthy();
});

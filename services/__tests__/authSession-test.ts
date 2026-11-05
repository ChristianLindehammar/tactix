import AsyncStorage from '@react-native-async-storage/async-storage';

import { AuthError, createAuthSession } from '@/services/authSession';
import { createUserIdentity } from '@/services/currentUser';
import { createLocalExerciseRepository } from '@/services/exerciseRepository';
import { createLocalRatingRepository } from '@/services/exerciseRatings';
import { buildExercise } from '@/test-utils/exerciseFixture';

const ACCOUNT = { userId: 'account-1', email: 'coach@example.com', token: 'secret-token' };

const json = (status: number, body: unknown = {}, headers: Record<string, string> = {}) =>
  new Response(status === 204 ? null : JSON.stringify(body), { status, headers });

function setup({ cookies = false } = {}) {
  const tokens = new Map<string, string>();
  const tokenStore = {
    get: async () => tokens.get('token') ?? null,
    set: async (token: string) => void tokens.set('token', token),
    clear: async () => void tokens.delete('token'),
  };
  const identity = createUserIdentity();
  const fetch = jest.fn(async (_url: string, _init?: RequestInit) => json(200, ACCOUNT));
  const onChange = jest.fn();
  const session = createAuthSession({
    baseUrl: 'https://api.test',
    fetch: fetch as unknown as typeof globalThis.fetch,
    tokenStore,
    identity,
    usesCookies: cookies,
  });
  session.subscribe(onChange);
  const exercises = createLocalExerciseRepository({ getCurrentUserId: identity.getCurrentUserId });
  const ratings = createLocalRatingRepository({ getCurrentUserId: identity.getCurrentUserId });
  return { session, fetch, tokens, identity, exercises, ratings, onChange };
}

beforeEach(() => AsyncStorage.clear());

test('verifying an email code signs the coach in and keeps their exercises and ratings editable', async () => {
  const { session, identity, exercises, ratings, tokens, onChange } = setup();
  const localId = await identity.getCurrentUserId();
  await exercises.save(buildExercise({ id: 'mine', ownerId: localId }));
  await ratings.setMine('mine', 4);

  await session.verifyEmailCode('coach@example.com', '123456');

  expect(session.getState()).toEqual({ status: 'signedIn', userId: 'account-1', email: 'coach@example.com' });
  expect(tokens.get('token')).toBe('secret-token');
  expect(await identity.getCurrentUserId()).toBe('account-1');
  expect((await exercises.get('mine'))?.ownerId).toBe('account-1');
  expect(await ratings.getMine('mine')).toBe(4);
  expect(onChange).toHaveBeenCalledTimes(1);
});

const signIn = (session: ReturnType<typeof setup>['session']) =>
  session.verifyEmailCode('coach@example.com', '123456');

const respondOnce = (fetch: ReturnType<typeof setup>['fetch'], response: Response) =>
  fetch.mockImplementationOnce(async () => response);

describe('asking for a code', () => {
  test('sends the address and language', async () => {
    const { session, fetch } = setup();
    respondOnce(fetch, json(202));

    await session.requestEmailCode('coach@example.com', 'sv');

    expect(fetch.mock.calls[0][0]).toBe('https://api.test/auth/email/start');
    expect(JSON.parse(fetch.mock.calls[0][1]!.body as string)).toEqual({ email: 'coach@example.com', locale: 'sv' });
  });

  test.each([
    [json(400, { error: 'invalidEmail' }), 'invalidEmail'],
    [json(429, { error: 'rateLimited' }), 'rateLimited'],
    [json(503), 'unavailable'],
  ])('reports a refusal the screen can explain', async (response, code) => {
    const { session, fetch } = setup();
    respondOnce(fetch, response);

    await expect(session.requestEmailCode('x', 'en')).rejects.toMatchObject({ code });
  });

  test('reports being offline', async () => {
    const { session, fetch } = setup();
    fetch.mockRejectedValueOnce(new TypeError('Network request failed'));

    await expect(session.requestEmailCode('coach@example.com', 'en')).rejects.toMatchObject({ code: 'offline' });
  });
});

describe('a failed sign-in', () => {
  test('changes nothing on the device', async () => {
    const { session, fetch, identity, exercises } = setup();
    const localId = await identity.getCurrentUserId();
    await exercises.save(buildExercise({ id: 'mine', ownerId: localId }));
    respondOnce(fetch, json(400, { error: 'invalidCode' }));

    await expect(signIn(session)).rejects.toBeInstanceOf(AuthError);

    expect(session.getState()).toEqual({ status: 'signedOut' });
    expect(await identity.getCurrentUserId()).toBe(localId);
    expect((await exercises.get('mine'))?.ownerId).toBe(localId);
  });
});

test("signing in leaves other coaches' exercises and ratings as they are", async () => {
  const { session, identity, exercises } = setup();
  await identity.getCurrentUserId();
  await AsyncStorage.setItem('exercise:theirs', JSON.stringify(buildExercise({ id: 'theirs', ownerId: 'someone-else' })));

  await signIn(session);

  expect((await exercises.get('theirs'))?.ownerId).toBe('someone-else');
});

test('moved exercises are queued for upload again', async () => {
  const { session, identity, exercises } = setup();
  await exercises.save(buildExercise({ id: 'mine', ownerId: await identity.getCurrentUserId() }));
  await AsyncStorage.setItem('exercise-sync:mine', '2026-01-01T00:00:00.000Z');

  await signIn(session);

  expect(await AsyncStorage.getItem('exercise-sync:mine')).toBeNull();
});

describe('signing out', () => {
  test('ends the session here and on the server, keeping exercises on the device', async () => {
    const { session, fetch, tokens, exercises, identity } = setup();
    await exercises.save(buildExercise({ id: 'mine', ownerId: await identity.getCurrentUserId() }));
    await signIn(session);
    respondOnce(fetch, json(204));

    await session.signOut();

    const [url, init] = fetch.mock.calls[fetch.mock.calls.length - 1];
    expect(url).toBe('https://api.test/auth/sign-out');
    expect(init!.headers).toEqual({ Authorization: 'Bearer secret-token' });
    expect(session.getState()).toEqual({ status: 'signedOut' });
    expect(tokens.has('token')).toBe(false);
    expect(await session.getAuthHeaders()).toBeNull();
    expect(await exercises.get('mine')).not.toBeNull();
  });

  test('still works offline', async () => {
    const { session, fetch, tokens } = setup();
    await signIn(session);
    fetch.mockRejectedValueOnce(new TypeError('Network request failed'));

    await session.signOut();

    expect(session.getState()).toEqual({ status: 'signedOut' });
    expect(tokens.has('token')).toBe(false);
  });

  test("the account's exercises can't be edited until the coach signs back in", async () => {
    const { session, fetch, identity, exercises } = setup();
    await exercises.save(buildExercise({ id: 'mine', ownerId: await identity.getCurrentUserId() }));
    await signIn(session);
    respondOnce(fetch, json(204));
    await session.signOut();
    const stored = (await exercises.get('mine'))!;

    await expect(exercises.save({ ...stored, title: 'Changed' })).rejects.toThrow('exerciseNotOwned');

    await signIn(session);
    await expect(exercises.save({ ...stored, title: 'Changed' })).resolves.toBeUndefined();
  });

  test('work done while signed out joins the account at the next sign-in', async () => {
    const { session, fetch, identity, exercises, ratings } = setup();
    await signIn(session);
    await ratings.setMine('rated', 2);
    respondOnce(fetch, json(204));
    await session.signOut();
    await exercises.save(buildExercise({ id: 'new', ownerId: await identity.getCurrentUserId() }));
    await ratings.setMine('rated', 5);

    await signIn(session);

    expect((await exercises.get('new'))?.ownerId).toBe('account-1');
    expect(await ratings.getMine('rated')).toBe(5);
  });

  test("another coach signing in on this phone doesn't take over the first coach's exercises", async () => {
    const { session, fetch, identity, exercises } = setup();
    await exercises.save(buildExercise({ id: 'first', ownerId: await identity.getCurrentUserId() }));
    await signIn(session);
    respondOnce(fetch, json(204));
    await session.signOut();
    respondOnce(fetch, json(200, { userId: 'account-2', email: 'other@example.com', token: 't2' }));

    await signIn(session);

    expect((await exercises.get('first'))?.ownerId).toBe('account-1');
  });
});

describe('deleting the account', () => {
  test('signs out and keeps exercises as editable local work', async () => {
    const { session, fetch, identity, exercises, tokens } = setup();
    await exercises.save(buildExercise({ id: 'mine', ownerId: await identity.getCurrentUserId() }));
    await signIn(session);
    respondOnce(fetch, json(204));

    await session.deleteAccount();

    const [url, init] = fetch.mock.calls[fetch.mock.calls.length - 1];
    expect(url).toBe('https://api.test/me');
    expect(init!.method).toBe('DELETE');
    expect(session.getState()).toEqual({ status: 'signedOut' });
    expect(tokens.has('token')).toBe(false);
    const kept = (await exercises.get('mine'))!;
    expect(kept.ownerId).toBe(await identity.getCurrentUserId());
    await expect(exercises.save({ ...kept, title: 'Still mine' })).resolves.toBeUndefined();
  });

  test.each([
    ['the server fails', () => json(503)],
    ['the coach is offline', () => { throw new TypeError('Network request failed'); }],
  ])('stays signed in if %s, so nobody thinks it is gone', async (_name, respond) => {
    const { session, fetch, tokens } = setup();
    await signIn(session);
    fetch.mockImplementationOnce(async () => respond());

    await expect(session.deleteAccount()).rejects.toBeInstanceOf(AuthError);

    expect(session.getState().status).toBe('signedIn');
    expect(tokens.get('token')).toBe('secret-token');
  });
});

describe('after a restart', () => {
  const restarted = (first: ReturnType<typeof setup>) => {
    const identity = createUserIdentity();
    return {
      identity,
      session: createAuthSession({
        baseUrl: 'https://api.test',
        fetch: first.fetch as unknown as typeof globalThis.fetch,
        tokenStore: {
          get: async () => first.tokens.get('token') ?? null,
          set: async (t: string) => void first.tokens.set('token', t),
          clear: async () => void first.tokens.delete('token'),
        },
        identity,
        usesCookies: false,
      }),
    };
  };

  test('the coach is still signed in, without any network', async () => {
    const first = setup();
    await signIn(first.session);
    first.fetch.mockClear();

    const { session, identity } = restarted(first);
    await session.restore();

    expect(session.getState()).toEqual({ status: 'signedIn', userId: 'account-1', email: 'coach@example.com' });
    expect(await identity.getCurrentUserId()).toBe('account-1');
    expect(first.fetch).not.toHaveBeenCalled();
  });

  test('a move that was interrupted is finished', async () => {
    const first = setup();
    const localId = await first.identity.getCurrentUserId();
    await first.exercises.save(buildExercise({ id: 'mine', ownerId: localId }));
    await first.tokens.set('token', 'secret-token');
    await AsyncStorage.setItem('account', JSON.stringify({ userId: 'account-1', email: null }));

    const { session } = restarted(first);
    await session.restore();

    expect((await first.exercises.get('mine'))?.ownerId).toBe('account-1');
  });

  test('without a token the coach is signed out', async () => {
    const first = setup();
    await AsyncStorage.setItem('account', JSON.stringify({ userId: 'account-1', email: null }));

    const { session } = restarted(first);
    await session.restore();

    expect(session.getState()).toEqual({ status: 'signedOut' });
  });
});

test('a session the server rejects signs the coach out and keeps their work', async () => {
  const { session, tokens, exercises, identity } = setup();
  await exercises.save(buildExercise({ id: 'mine', ownerId: await identity.getCurrentUserId() }));
  await signIn(session);

  await session.handleSessionRejected();

  expect(session.getState()).toEqual({ status: 'signedOut' });
  expect(tokens.has('token')).toBe(false);
  expect(await exercises.get('mine')).not.toBeNull();
});

describe('on the web', () => {
  test('asks for a cookie and never handles a token', async () => {
    const { session, fetch, tokens } = setup({ cookies: true });
    respondOnce(fetch, json(200, { userId: 'account-1', email: 'coach@example.com' }));

    await signIn(session);

    expect(JSON.parse(fetch.mock.calls[0][1]!.body as string).session).toBe('cookie');
    expect(tokens.has('token')).toBe(false);
    expect(session.getState().status).toBe('signedIn');
    expect(await session.getAuthHeaders()).toEqual({ 'X-CoachMate-Client': 'web' });
  });

  test('stays signed in after a reload', async () => {
    const first = setup({ cookies: true });
    respondOnce(first.fetch, json(200, { userId: 'account-1', email: 'coach@example.com' }));
    await signIn(first.session);

    const reloaded = setup({ cookies: true });
    await reloaded.session.restore();

    expect(reloaded.session.getState().status).toBe('signedIn');
  });
});

test('Apple and Google tokens are sent with their nonce', async () => {
  const { session, fetch } = setup();

  await session.signInWithProvider('apple', 'id-token', 'raw-nonce');

  expect(fetch.mock.calls[0][0]).toBe('https://api.test/auth/provider');
  expect(JSON.parse(fetch.mock.calls[0][1]!.body as string)).toEqual({
    provider: 'apple',
    idToken: 'id-token',
    nonce: 'raw-nonce',
  });
  expect(session.getState().status).toBe('signedIn');
});

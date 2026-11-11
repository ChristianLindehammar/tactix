import { createLibrary, LibraryError } from '@/services/library';
import { buildExercise } from '@/test-utils/exerciseFixture';

const json = (status: number, body: unknown = {}) =>
  new Response(status === 204 ? null : JSON.stringify(body), { status });

const setup = (respond: (url: string, init?: RequestInit) => Response | Promise<Response>, signedIn = true) => {
  const fetch = jest.fn(async (url: string, init?: RequestInit) => respond(url, init));
  const onSessionRejected = jest.fn();
  const library = createLibrary({
    baseUrl: 'https://api.test',
    fetch: fetch as unknown as typeof globalThis.fetch,
    getAuthHeaders: async () => (signedIn ? { Authorization: 'Bearer token' } : null),
    onSessionRejected,
  });
  return { library, fetch, onSessionRejected };
};

const errorCode = async (promise: Promise<unknown>) => {
  try {
    await promise;
  } catch (error) {
    if (error instanceof LibraryError) return error.code;
    throw error;
  }
  throw new Error('Expected a LibraryError');
};

describe('browsing the library', () => {
  it('gives each exercise with its author and the total', async () => {
    const exercise = buildExercise({ id: 'e1', ownerId: 'anna' });
    const { library } = setup(() =>
      json(200, { exercises: [{ ...exercise, authorName: 'Coach Anna' }], total: 7 }),
    );

    expect(await library.list({})).toEqual({
      entries: [{ exercise, authorName: 'Coach Anna' }],
      total: 7,
    });
  });

  it('sends the filters the server understands, signed in', async () => {
    const { library, fetch } = setup(() => json(200, { exercises: [], total: 0 }));

    await library.list({
      sport: 'soccer',
      focus: ['passing', 'defence'],
      difficulties: [2],
      phase: 'warmup',
      playerCount: 8,
      search: ' rondo ',
      sort: 'title',
      offset: 50,
    });

    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe(
      'https://api.test/library?sport=soccer&focus=passing&focus=defence&difficulty=2&phase=warmup' +
        '&players=8&search=rondo&sort=title&offset=50',
    );
    expect(init?.headers).toEqual({ Authorization: 'Bearer token' });
  });

  it('skips an exercise it cannot read rather than failing the page', async () => {
    const good = buildExercise({ id: 'good' });
    const { library } = setup(() =>
      json(200, { exercises: [{ id: 'broken' }, { ...good, authorName: null }], total: 2 }),
    );

    expect((await library.list({})).entries.map(entry => entry.exercise.id)).toEqual(['good']);
  });

  it('says so when signed out', async () => {
    const { library, fetch } = setup(() => json(200), false);

    expect(await errorCode(library.list({}))).toBe('signedOut');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('ends a session the server no longer accepts, as uploading does', async () => {
    const { library, onSessionRejected } = setup(() => json(401));

    expect(await errorCode(library.list({}))).toBe('signedOut');
    expect(onSessionRejected).toHaveBeenCalledTimes(1);
  });

  it('tells being offline apart from a failing server', async () => {
    expect(await errorCode(setup(() => Promise.reject(new TypeError('Network'))).library.list({}))).toBe(
      'offline',
    );
    expect(await errorCode(setup(() => json(503)).library.list({}))).toBe('unavailable');
  });
});

describe('opening one exercise', () => {
  it('fetches it by id', async () => {
    const exercise = buildExercise({ id: 'shared' });
    const { library, fetch } = setup(() => json(200, exercise));

    expect(await library.get('shared')).toEqual(exercise);
    expect(fetch.mock.calls[0][0]).toBe('https://api.test/exercises/shared');
  });

  it('gives null for one that is gone or hidden', async () => {
    expect(await setup(() => json(404)).library.get('gone')).toBeNull();
  });
});

describe('reporting and blocking', () => {
  it('reports an exercise with the reason', async () => {
    const { library, fetch } = setup(() => json(204));

    await library.report('e1', 'Names of children');

    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe('https://api.test/exercises/e1/report');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(init?.body as string)).toEqual({ reason: 'Names of children' });
  });

  it('says when too many reports were sent', async () => {
    expect(await errorCode(setup(() => json(429)).library.report('e1'))).toBe('rateLimited');
  });

  it('blocks a coach', async () => {
    const { library, fetch } = setup(() => json(204));

    await library.block('anna');

    expect(fetch.mock.calls[0][0]).toBe('https://api.test/users/anna/block');
    expect(fetch.mock.calls[0][1]?.method).toBe('POST');
  });
});

describe('the display name', () => {
  it('reads the current one', async () => {
    const { library } = setup(() => json(200, { userId: 'me', displayName: 'Coach Anna' }));

    expect(await library.getDisplayName()).toBe('Coach Anna');
  });

  it('saves a new one, or null to clear it', async () => {
    const { library, fetch } = setup(() => json(200, { displayName: null }));

    await library.setDisplayName(null);

    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe('https://api.test/me/display-name');
    expect(init?.method).toBe('PUT');
    expect(JSON.parse(init?.body as string)).toEqual({ displayName: null });
  });

  it('says when the server refuses the name', async () => {
    const { library } = setup(() => json(400, { error: 'invalidDisplayName' }));

    expect(await errorCode(library.setDisplayName('x'.repeat(41)))).toBe('invalidDisplayName');
  });
});

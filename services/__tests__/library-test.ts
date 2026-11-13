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
      json(200, {
        exercises: [{ ...exercise, authorName: 'Coach Anna', favoriteCount: 3, favorited: true }],
        total: 7,
      }),
    );

    expect(await library.list({})).toEqual({
      entries: [{ exercise, authorName: 'Coach Anna', favoriteCount: 3, favorited: true }],
      total: 7,
    });
  });

  it('counts no favourites when an older server leaves them out', async () => {
    const exercise = buildExercise({ id: 'e1' });
    const { library } = setup(() => json(200, { exercises: [exercise], total: 1 }));

    const { entries } = await library.list({});

    expect(entries[0]).toMatchObject({ favoriteCount: 0, favorited: false });
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

  describe('in the coach language', () => {
    const page = (total: number) => json(200, { exercises: [], total });

    it('asks only for exercises in that language when it has some', async () => {
      const { library, fetch } = setup(() => page(3));

      await library.list({ sport: 'floorball', language: 'sv', search: 'rondo' });

      const urls = fetch.mock.calls.map(([url]) => url);
      // First a check that the language has any exercises for the sport, then the page itself
      expect(urls).toEqual([
        'https://api.test/library?sport=floorball&lang=sv',
        'https://api.test/library?sport=floorball&search=rondo&lang=sv',
      ]);
    });

    it('falls back to English when the language has none for the sport', async () => {
      const { library, fetch } = setup(url => page(url.includes('lang=fi') ? 0 : 5));

      await library.list({ sport: 'floorball', language: 'fi' });

      expect(fetch.mock.calls.at(-1)?.[0]).toBe('https://api.test/library?sport=floorball&lang=en');
    });

    it('checks each language and sport only once', async () => {
      const { library, fetch } = setup(() => page(3));

      await library.list({ sport: 'floorball', language: 'sv' });
      await library.list({ sport: 'floorball', language: 'sv', offset: 20 });
      await library.list({ sport: 'soccer', language: 'sv' });

      expect(fetch.mock.calls.map(([url]) => url)).toEqual([
        'https://api.test/library?sport=floorball&lang=sv',
        'https://api.test/library?sport=floorball&lang=sv',
        'https://api.test/library?sport=floorball&offset=20&lang=sv',
        'https://api.test/library?sport=soccer&lang=sv',
        'https://api.test/library?sport=soccer&lang=sv',
      ]);
    });

    it('asks for English straight away, as there is nothing to fall back to', async () => {
      const { library, fetch } = setup(() => page(3));

      await library.list({ sport: 'floorball', language: 'en' });

      expect(fetch.mock.calls.map(([url]) => url)).toEqual(['https://api.test/library?sport=floorball&lang=en']);
    });

    it('uses only the language of a regional locale', async () => {
      const { library, fetch } = setup(() => page(3));

      await library.list({ sport: 'floorball', language: 'sv-FI' });

      expect(fetch.mock.calls.at(-1)?.[0]).toBe('https://api.test/library?sport=floorball&lang=sv');
    });

    it('checks again next time if the check failed', async () => {
      let failing = true;
      const { library, fetch } = setup(() => (failing ? json(503) : page(3)));

      expect(await errorCode(library.list({ sport: 'floorball', language: 'sv' }))).toBe('unavailable');
      failing = false;
      await library.list({ sport: 'floorball', language: 'sv' });

      expect(fetch.mock.calls.at(-1)?.[0]).toBe('https://api.test/library?sport=floorball&lang=sv');
      expect(fetch).toHaveBeenCalledTimes(3);
    });
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

describe('favourites', () => {
  it('lists the exercises you saved, filtered, in every language', async () => {
    const exercise = buildExercise({ id: 'e1' });
    const { library, fetch } = setup(() =>
      json(200, { exercises: [{ ...exercise, authorName: null, favoriteCount: 1, favorited: true }], total: 1 }),
    );

    const page = await library.listFavorites({ sport: 'soccer', language: 'sv' });

    expect(fetch.mock.calls).toHaveLength(1);
    expect(fetch.mock.calls[0][0]).toBe('https://api.test/favorites?sport=soccer');
    expect(page).toEqual({
      entries: [{ exercise, authorName: null, favoriteCount: 1, favorited: true }],
      total: 1,
    });
  });

  it('reads how many coaches saved an exercise and whether you did', async () => {
    const { library, fetch } = setup(() => json(200, { favoriteCount: 4, favorited: false }));

    expect(await library.getFavorite('e1')).toEqual({ favoriteCount: 4, favorited: false });
    expect(fetch.mock.calls[0][0]).toBe('https://api.test/exercises/e1/favorite');
  });

  it('gives null when the server does not have the exercise', async () => {
    expect(await setup(() => json(404)).library.getFavorite('local-only')).toBeNull();
  });

  it('saves and unsaves, giving the new count', async () => {
    const { library, fetch } = setup((_url, init) =>
      json(200, init?.method === 'PUT' ? { favoriteCount: 5, favorited: true } : { favoriteCount: 4, favorited: false }),
    );

    expect(await library.setFavorite('e1', true)).toEqual({ favoriteCount: 5, favorited: true });
    expect(await library.setFavorite('e1', false)).toEqual({ favoriteCount: 4, favorited: false });
    expect(fetch.mock.calls.map(([url, init]) => [url, init?.method])).toEqual([
      ['https://api.test/exercises/e1/favorite', 'PUT'],
      ['https://api.test/exercises/e1/favorite', 'DELETE'],
    ]);
  });

  it('says so when saving fails', async () => {
    expect(await errorCode(setup(() => json(503)).library.setFavorite('e1', true))).toBe('unavailable');
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

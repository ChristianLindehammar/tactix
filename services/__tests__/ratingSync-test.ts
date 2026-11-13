import AsyncStorage from '@react-native-async-storage/async-storage';

import { createLocalRatingRepository } from '../exerciseRatings';
import { createRatingSync } from '../ratingSync';

const BASE = 'https://api.test';
const respond = (status: number, body: unknown = {}, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers });

interface ServerRating {
  exerciseId: string;
  stars: number | null;
  updatedAt: string;
}

/** A fake server: keeps ratings like the real one, newest wins, unless the test answers otherwise. */
const fakeServer = () => {
  const stored = new Map<string, ServerRating>();
  const puts: { id: string; body: { stars: number | null; updatedAt: string }; token: string | null }[] =
    [];
  let answerPut: (id: string) => Response | null | Promise<Response | null> = () => null;
  let answerList: () => Response | null | Promise<Response | null> = () => null;

  const fetch = jest.fn(async (url: string, init: RequestInit = {}) => {
    if (url === `${BASE}/ratings`) {
      const answer = await answerList();
      return answer ?? respond(200, { ratings: [...stored.values()] });
    }
    const id = url.replace(`${BASE}/exercises/`, '').replace('/rating', '');
    const answer = await answerPut(id);
    if (answer) return answer;
    const body = JSON.parse(init.body as string);
    puts.push({ id, body, token: new Headers(init.headers).get('Authorization') });
    const old = stored.get(id);
    if (!old || body.updatedAt > old.updatedAt) stored.set(id, { exerciseId: id, ...body });
    return respond(200, stored.get(id));
  });

  return {
    fetch: fetch as unknown as typeof globalThis.fetch,
    puts,
    stored,
    onPut: (answer: typeof answerPut) => (answerPut = answer),
    onList: (answer: typeof answerList) => (answerList = answer),
  };
};

describe('rating sync', () => {
  const local = createLocalRatingRepository({ getCurrentUserId: async () => 'me', now: () => now });
  let server: ReturnType<typeof fakeServer>;
  let now: number;
  let authHeaders: Record<string, string> | null;
  let onSessionRejected: jest.Mock;

  const build = () =>
    createRatingSync({
      baseUrl: BASE,
      fetch: server.fetch,
      local,
      getAuthHeaders: async () => authHeaders,
      onSessionRejected,
      now: () => now,
    });

  beforeEach(async () => {
    await AsyncStorage.clear();
    server = fakeServer();
    authHeaders = { Authorization: 'Bearer token-1' };
    onSessionRejected = jest.fn();
    now = 1_000_000;
  });

  it('uploads a rating given on the phone, using the session of the coach', async () => {
    await local.setMine('exercise-1', 4);

    await build().syncNow();

    expect(server.puts).toHaveLength(1);
    expect(server.puts[0].id).toBe('exercise-1');
    expect(server.puts[0].body.stars).toBe(4);
    expect(server.puts[0].token).toBe('Bearer token-1');
  });

  it('uploads each rating once, and again after it changes', async () => {
    await local.setMine('exercise-1', 4);
    const sync = build();
    await sync.syncNow();
    await build().syncNow();
    expect(server.puts).toHaveLength(1);

    now += 1000;
    await local.setMine('exercise-1', null);
    await sync.syncNow();

    expect(server.puts.map(put => put.body.stars)).toEqual([4, null]);
  });

  it('uploads nothing while signed out, and catches up after signing in', async () => {
    await local.setMine('exercise-1', 4);
    authHeaders = null;

    await build().syncNow();
    expect(server.fetch).not.toHaveBeenCalled();

    authHeaders = { Authorization: 'Bearer token-1' };
    await build().syncNow();
    expect(server.puts).toHaveLength(1);
  });

  it('brings down ratings given on another phone, without uploading them back', async () => {
    server.stored.set('exercise-1', { exerciseId: 'exercise-1', stars: 5, updatedAt: '2026-11-13T10:00:00.000Z' });
    server.stored.set('exercise-2', { exerciseId: 'exercise-2', stars: null, updatedAt: '2026-11-13T10:00:00.000Z' });
    const sync = build();

    await sync.syncNow();
    await sync.syncNow();

    expect(await local.listMine()).toEqual({ 'exercise-1': 5 });
    expect(server.puts).toHaveLength(0);
  });

  it('keeps a rating changed on this phone since, and uploads it', async () => {
    server.stored.set('exercise-1', { exerciseId: 'exercise-1', stars: 5, updatedAt: '2026-11-13T10:00:00.000Z' });
    now = Date.parse('2026-11-13T11:00:00.000Z');
    await local.setMine('exercise-1', 2);

    await build().syncNow();

    expect(await local.getMine('exercise-1')).toBe(2);
    expect(server.stored.get('exercise-1')?.stars).toBe(2);
  });

  it('lets a newer rating from another phone replace an older one here', async () => {
    now = Date.parse('2026-11-13T09:00:00.000Z');
    await local.setMine('exercise-1', 2);
    const sync = build();
    await sync.syncNow();
    server.stored.set('exercise-1', { exerciseId: 'exercise-1', stars: null, updatedAt: '2026-11-13T10:00:00.000Z' });

    await sync.syncNow();

    expect(await local.getMine('exercise-1')).toBeNull();
    expect(server.puts).toHaveLength(1);
  });

  describe('when something goes wrong', () => {
    const offline = () => Promise.reject(new TypeError('Network request failed'));

    it('keeps a rating queued while offline, and uploads it later', async () => {
      await local.setMine('exercise-1', 4);
      server.onPut(offline);
      server.onList(offline);
      const sync = build();

      const warn = jest.spyOn(console, 'warn').mockImplementation();
      await expect(sync.syncNow()).resolves.toBeUndefined();
      expect(warn).not.toHaveBeenCalled();
      warn.mockRestore();

      server.onPut(() => null);
      server.onList(() => null);
      await sync.syncNow();

      expect(server.puts).toHaveLength(1);
    });
 
    it.each([
      ['the server is failing', 503, 'serviceUnavailable'],
      ['the server does not have the exercise yet', 404, 'notFound'],
    ])('keeps a rating queued when %s', async (_, status, error) => {
      await local.setMine('exercise-1', 4);
      server.onPut(() => respond(status, { error }));
      const sync = build();
      await sync.syncNow();

      server.onPut(() => null);
      await sync.syncNow();

      expect(server.puts).toHaveLength(1);
    });
 
    it('reports a rejected session once and keeps the rating queued', async () => {
      await local.setMine('exercise-1', 4);
      server.onPut(() => respond(401, { error: 'unauthorized' }));
      server.onList(() => respond(401, { error: 'unauthorized' }));

      await build().syncNow();
      expect(onSessionRejected).toHaveBeenCalledTimes(1);

      server.onPut(() => null);
      server.onList(() => null);
      await build().syncNow();
      expect(server.puts).toHaveLength(1);
    });
 
    it('waits as long as the server asks when rate limited, uploading nothing more meanwhile', async () => {
      await local.setMine('exercise-1', 4);
      await local.setMine('exercise-2', 3);
      server.onPut(() => respond(429, { error: 'rateLimited' }, { 'Retry-After': '60' }));
      const sync = build();
      await sync.syncNow();
      expect((server.fetch as jest.Mock).mock.calls).toHaveLength(1);
      server.onPut(() => null);

      now += 59_000;
      await sync.syncNow();
      expect((server.fetch as jest.Mock).mock.calls).toHaveLength(1);

      now += 1_000;
      await sync.syncNow();
      expect(server.puts).toHaveLength(2);
    });
 
    it('stops retrying a rating the server refuses, and carries on with the rest', async () => {
      await local.setMine('refused', 4);
      await local.setMine('fine', 3);
      const warn = jest.spyOn(console, 'warn').mockImplementation();
      let refusedAttempts = 0;
      server.onPut(id => {
        if (id !== 'refused') return null;
        refusedAttempts += 1;
        return respond(400, { error: 'invalidDate' });
      });
      const sync = build();

      await sync.syncNow();
      await sync.syncNow();

      expect(refusedAttempts).toBe(1);
      expect(server.puts.map(put => put.id)).toEqual(['fine']);
      warn.mockRestore();
    });
  });

  it('gives up on a request that never answers, and tries again later', async () => {
    jest.useFakeTimers();
    try {
      await local.setMine('exercise-1', 4);
      server.onPut(() => new Promise(() => {}));
      const sync = build();

      const stuck = sync.syncNow();
      await jest.advanceTimersByTimeAsync(30_000);
      await stuck;

      server.onPut(() => null);
      await sync.syncNow();

      expect(server.puts).toHaveLength(1);
    } finally {
      jest.useRealTimers();
    }
  });

  describe('overlapping syncs', () => {
    it('does not upload the same rating twice when syncs overlap', async () => {
      await local.setMine('exercise-1', 4);
      const sync = build();

      await Promise.all([sync.syncNow(), sync.syncNow()]);

      expect(server.puts).toHaveLength(1);
    });

    it('picks up a rating changed while a sync is running', async () => {
      await local.setMine('exercise-1', 4);
      const sync = build();
      let release = () => {};
      server.onPut(async () => {
        await new Promise<void>(resolve => (release = resolve));
        return null;
      });

      const first = sync.syncNow();
      await new Promise<void>(resolve => setImmediate(() => resolve()));
      now += 1000;
      await local.setMine('exercise-1', 2);
      const second = sync.syncNow();
      server.onPut(() => null);
      release();
      await Promise.all([first, second]);

      expect(server.stored.get('exercise-1')?.stars).toBe(2);
      expect(await local.getMine('exercise-1')).toBe(2);
    });
  });
});

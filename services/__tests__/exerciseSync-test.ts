import AsyncStorage from '@react-native-async-storage/async-storage';

import { createExerciseSync } from '../exerciseSync';
import { createLocalExerciseRepository } from '../exerciseRepository';
import { buildExercise } from '@/test-utils/exerciseFixture';
import { Exercise } from '@/types/exercise';

const BASE = 'https://api.test';
const respond = (status: number, body: unknown = {}, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers });

/** A fake server: answers saves with whatever the test chooses. */
const fakeServer = () => {
  const saves: { id: string; body: Exercise; token: string | null }[] = [];
  let answerSave: (id: string) => Response | Promise<Response> = () => respond(200);

  const fetch = jest.fn(async (url: string, init: RequestInit = {}) => {
    const id = url.replace(`${BASE}/exercises/`, '');
    const answer = await answerSave(id);
    if (answer.ok) {
      saves.push({
        id,
        body: JSON.parse(init.body as string),
        token: new Headers(init.headers).get('Authorization'),
      });
    }
    return answer;
  });

  return {
    fetch: fetch as unknown as typeof globalThis.fetch,
    saves,
    onSave: (answer: typeof answerSave) => (answerSave = answer),
  };
};

const exercise = (overrides: Partial<Exercise> = {}) =>
  buildExercise({ ownerId: 'me', ...overrides });

describe('exercise sync', () => {
  const local = createLocalExerciseRepository({ getCurrentUserId: async () => 'me' });
  let server: ReturnType<typeof fakeServer>;
  let now: number;
  let authHeaders: Record<string, string> | null;
  let onSessionRejected: jest.Mock;

  const build = () =>
    createExerciseSync({
      baseUrl: BASE,
      fetch: server.fetch,
      local,
      getCurrentUserId: async () => 'me',
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

  it('uploads an exercise that has not been uploaded, using the session of the coach', async () => {
    await local.save(exercise());

    await build().syncNow();

    expect(server.saves).toHaveLength(1);
    expect(server.saves[0].id).toBe('exercise-1');
    expect(server.saves[0].body).toEqual(exercise());
    expect(server.saves[0].token).toBe('Bearer token-1');
  });

  it('uploads nothing while signed out, and catches up after signing in', async () => {
    await local.save(exercise());
    authHeaders = null;

    await build().syncNow();
    expect(server.saves).toHaveLength(0);

    authHeaders = { Authorization: 'Bearer token-1' };
    await build().syncNow();
    expect(server.saves).toHaveLength(1);
  });

  it('uploads each version once, and again after an edit', async () => {
    await local.save(exercise());
    const sync = build();
    await sync.syncNow();
    await sync.syncNow();
    expect(server.saves).toHaveLength(1);

    await local.save(exercise({ title: 'Edited', updatedAt: '2026-11-04T10:00:00.000Z' }));
    await sync.syncNow();

    expect(server.saves).toHaveLength(2);
    expect(server.saves[1].body.title).toBe('Edited');
  });

  it('remembers what was uploaded after the app restarts', async () => {
    await local.save(exercise());
    await build().syncNow();

    await build().syncNow();

    expect(server.saves).toHaveLength(1);
  });

  it('uploads a deletion of an exercise the server already has', async () => {
    await local.save(exercise());
    const sync = build();
    await sync.syncNow();

    await local.remove('exercise-1');
    await sync.syncNow();

    expect(server.saves).toHaveLength(2);
    expect(server.saves[1].body.deletedAt).not.toBeNull();
  });

  it('never uploads an exercise deleted before it reached the server', async () => {
    await local.save(exercise());
    await local.remove('exercise-1');

    await build().syncNow();

    expect(server.saves).toHaveLength(0);
  });

  it("does not upload other coaches' exercises", async () => {
    await local.save(exercise({ ownerId: 'someone-else' }));

    await build().syncNow();

    expect(server.saves).toHaveLength(0);
  });

  describe('when something goes wrong', () => {
    const offline = () => Promise.reject(new TypeError('Network request failed'));

    it('keeps an exercise queued while offline, and uploads it later', async () => {
      await local.save(exercise());
      server.onSave(offline);
      const sync = build();

      const warn = jest.spyOn(console, 'warn').mockImplementation();
      await expect(sync.syncNow()).resolves.toBeUndefined();
      expect(server.saves).toHaveLength(0);
      expect(warn).not.toHaveBeenCalled();
      warn.mockRestore();

      server.onSave(() => respond(200));
      await sync.syncNow();

      expect(server.saves).toHaveLength(1);
    });

    it('keeps an exercise queued when the server is failing', async () => {
      await local.save(exercise());
      server.onSave(() => respond(503, { error: 'serviceUnavailable' }));
      const sync = build();
      await sync.syncNow();

      server.onSave(() => respond(200));
      await sync.syncNow();

      expect(server.saves).toHaveLength(1);
    });

    it('waits as long as the server asks when rate limited', async () => {
      await local.save(exercise());
      server.onSave(() => respond(429, { error: 'rateLimited' }, { 'Retry-After': '60' }));
      const sync = build();
      await sync.syncNow();
      const callsWhenLimited = (server.fetch as jest.Mock).mock.calls.length;
      server.onSave(() => respond(200));

      now += 59_000;
      await sync.syncNow();
      expect((server.fetch as jest.Mock).mock.calls.length).toBe(callsWhenLimited);

      now += 1_000;
      await sync.syncNow();
      expect(server.saves).toHaveLength(1);
    });

    it('stops the rest of the uploads as soon as it is rate limited', async () => {
      await local.save(exercise({ id: 'one' }));
      await local.save(exercise({ id: 'two' }));
      server.onSave(() => respond(429, { error: 'rateLimited' }, { 'Retry-After': '60' }));

      await build().syncNow();

      const puts = (server.fetch as jest.Mock).mock.calls.filter(([url]) =>
        url.includes('/exercises/'),
      );
      expect(puts).toHaveLength(1);
    });

    it('reports a rejected session once and keeps the exercise queued', async () => {
      await local.save(exercise());
      server.onSave(() => respond(401, { error: 'unauthorized' }));

      await build().syncNow();
      expect(onSessionRejected).toHaveBeenCalledTimes(1);

      server.onSave(() => respond(200));
      await build().syncNow();
      expect(server.saves).toHaveLength(1);
    });

    it.each([
      [400, 'invalidTitle'],
      [403, 'exerciseNotOwned'],
    ])('stops retrying a version refused with %i, and carries on with the rest', async (status, error) => {
      await local.save(exercise({ id: 'refused' }));
      await local.save(exercise({ id: 'fine' }));
      const warn = jest.spyOn(console, 'warn').mockImplementation();
      let refusedAttempts = 0;
      server.onSave(id => {
        if (id !== 'refused') return respond(200);
        refusedAttempts += 1;
        return respond(status, { error });
      });
      const sync = build();

      await sync.syncNow();
      await sync.syncNow();

      expect(refusedAttempts).toBe(1);
      expect(server.saves.map(save => save.id)).toEqual(['fine']);
      warn.mockRestore();
    });

    it('uploads exercises once the coach has a plan, after being refused for not having one', async () => {
      await local.save(exercise({ id: 'waiting' }));
      server.onSave(() => respond(403, { error: 'planRequired' }));
      const sync = build();
      await sync.syncNow();
      server.onSave(() => respond(200));

      await sync.syncNow();

      expect(server.saves.map(save => save.id)).toEqual(['waiting']);
    });

    it('tries a refused exercise again once it has been edited', async () => {
      await local.save(exercise());
      const warn = jest.spyOn(console, 'warn').mockImplementation();
      server.onSave(() => respond(400, { error: 'invalidTitle' }));
      const sync = build();
      await sync.syncNow();

      server.onSave(() => respond(200));
      await local.save(exercise({ title: 'Short', updatedAt: '2026-11-04T10:00:00.000Z' }));
      await sync.syncNow();

      expect(server.saves.map(save => save.body.title)).toEqual(['Short']);
      warn.mockRestore();
    });

    it('gives up on a request that never answers, and tries again later', async () => {
      jest.useFakeTimers();
      try {
        await local.save(exercise());
        server.onSave(() => new Promise(() => {}));
        const sync = build();

        const stuck = sync.syncNow();
        await jest.advanceTimersByTimeAsync(30_000);
        await stuck;

        server.onSave(() => respond(200));
        await sync.syncNow();

        expect(server.saves).toHaveLength(1);
      } finally {
        jest.useRealTimers();
      }
    });
  });

  describe('overlapping syncs', () => {
    it('does not upload the same version twice when syncs overlap', async () => {
      await local.save(exercise());
      const sync = build();

      await Promise.all([sync.syncNow(), sync.syncNow()]);

      expect(server.saves).toHaveLength(1);
    });

    it('picks up an edit made while a sync is running', async () => {
      await local.save(exercise());
      const sync = build();
      let release = () => {};
      server.onSave(async () => {
        await new Promise<void>(resolve => (release = resolve));
        return respond(200);
      });

      const first = sync.syncNow();
      await new Promise<void>(resolve => setImmediate(() => resolve()));
      await local.save(exercise({ title: 'Edited', updatedAt: '2026-11-04T10:00:00.000Z' }));
      const second = sync.syncNow();
      server.onSave(() => respond(200));
      release();
      await Promise.all([first, second]);

      expect(server.saves.at(-1)?.body.title).toBe('Edited');
    });
  });
});

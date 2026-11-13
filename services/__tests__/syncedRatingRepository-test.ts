import AsyncStorage from '@react-native-async-storage/async-storage';

import { createLocalRatingRepository, createSyncedRatingRepository } from '../exerciseRatings';
import { createRatingSync } from '../ratingSync';

const BASE = 'https://api.test';
const settle = () => new Promise<void>(resolve => setImmediate(() => resolve()));

describe('synced rating repository', () => {
  const local = createLocalRatingRepository({ getCurrentUserId: async () => 'me' });
  let fetch: jest.Mock;

  const build = () =>
    createSyncedRatingRepository(
      local,
      createRatingSync({
        baseUrl: BASE,
        fetch,
        local,
        getAuthHeaders: async () => ({ Authorization: 'Bearer token' }),
        onSessionRejected: () => undefined,
      }),
    );

  const uploads = () =>
    fetch.mock.calls
      .filter(([, init]) => init?.method === 'PUT')
      .map(([url, init]) => ({ url, stars: JSON.parse(init.body).stars }));

  beforeEach(async () => {
    await AsyncStorage.clear();
    fetch = jest.fn(async () => new Response('{"ratings": []}', { status: 200 }));
  });

  it('uploads a rating in the background', async () => {
    await build().setMine('exercise-1', 5);
    await settle();

    expect(uploads()).toEqual([{ url: `${BASE}/exercises/exercise-1/rating`, stars: 5 }]);
  });

  it('keeps the rating on the phone without waiting for the network', async () => {
    fetch.mockImplementation(() => new Promise(() => {}));
    const ratings = build();

    await expect(ratings.setMine('exercise-1', 5)).resolves.toBeUndefined();
    expect(await ratings.getMine('exercise-1')).toBe(5);
  });
});

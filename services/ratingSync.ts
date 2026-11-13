import AsyncStorage from '@react-native-async-storage/async-storage';

import type { RatingRepository } from '@/services/exerciseRatings';

// Holds the updatedAt of the last version the server answered for, so a restart loses nothing
const SETTLED_PREFIX = 'rating-sync:';
const REQUEST_TIMEOUT_MS = 20_000;
const DEFAULT_RETRY_AFTER_SECONDS = 60;
const settledKey = (userId: string, exerciseId: string) => `${SETTLED_PREFIX}${userId}:${exerciseId}`;

interface RatingSyncOptions {
  baseUrl: string;
  fetch: typeof globalThis.fetch;
  local: Pick<RatingRepository, 'listAllMine' | 'mergeMine'>;
  /** How to prove who the coach is, or null while signed out, when nothing is synced. */
  getAuthHeaders: () => Promise<Record<string, string> | null>;
  onSessionRejected: () => Promise<void> | void;
  now?: () => number;
}

/** Ends the current sync. What is left stays queued for the next one. */
class SyncStopped extends Error {}

export interface RatingSync {
  /** Uploads ratings the server doesn't have yet, then brings down those given on other phones. Never rejects. */
  syncNow(): Promise<void>;
}

/**
 * Keeps the coach's star ratings the same on every phone. Ratings are given on the phone first, so
 * every failure just leaves them queued, and for each exercise the newest rating wins.
 */
export function createRatingSync({
  baseUrl,
  fetch,
  local,
  getAuthHeaders,
  onSessionRejected,
  now = Date.now,
}: RatingSyncOptions): RatingSync {
  let retryAt = 0;
  let running: Promise<void> | null = null;
  let requestedAgain = false;

  const request = async (path: string, init: RequestInit) => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timedOut = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(new SyncStopped('timeout'));
      }, REQUEST_TIMEOUT_MS);
    });
    const response = await Promise.race([
      // Being offline is routine, not a problem to report
      fetch(`${baseUrl}${path}`, { ...init, signal: controller.signal }).catch(() => {
        throw new SyncStopped('offline');
      }),
      timedOut,
    ]).finally(() => clearTimeout(timer));
    if (response.status === 429) {
      const seconds = Number(response.headers.get('Retry-After'));
      retryAt = now() + (seconds > 0 ? seconds : DEFAULT_RETRY_AFTER_SECONDS) * 1000;
      throw new SyncStopped('rateLimited');
    }
    if (response.status >= 500) throw new SyncStopped('serverFailing');
    if (response.status === 401) {
      await onSessionRejected();
      throw new SyncStopped('unauthorized');
    }
    return response;
  };

  const pass = async () => {
    const authHeaders = await getAuthHeaders();
    if (!authHeaders) return;

    const ratings = await local.listAllMine();
    const settled = new Map(await AsyncStorage.multiGet(ratings.map(r => settledKey(r.userId, r.exerciseId))));
    const pending = ratings.filter(r => settled.get(settledKey(r.userId, r.exerciseId)) !== r.updatedAt);
    for (const rating of pending) {
      const response = await request(`/exercises/${rating.exerciseId}/rating`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ stars: rating.stars, updatedAt: rating.updatedAt }),
      });
      // Your own exercise may not have been uploaded yet. The rating goes up once it has
      if (response.status === 404) continue;
      await AsyncStorage.setItem(settledKey(rating.userId, rating.exerciseId), rating.updatedAt);
    }

    // Ratings given on another phone. What comes down is what the server has, so it is settled
    const response = await request('/ratings', { headers: authHeaders });
    const { ratings: theirs } = await response.json();
    const kept = await local.mergeMine(theirs);
    await AsyncStorage.multiSet(kept.map(r => [settledKey(r.userId, r.exerciseId), r.updatedAt]));
  };

  const runPass = async () => {
    try {
      await pass();
    } catch (error) {
      if (!(error instanceof SyncStopped)) console.warn('Rating sync failed:', error);
    }
  };

  const run = async () => {
    do {
      requestedAgain = false;
      await runPass();
    } while (requestedAgain && now() >= retryAt);
    running = null;
  };

  return {
    syncNow: () => {
      if (now() < retryAt) return Promise.resolve();
      if (running) {
        requestedAgain = true;
        return running;
      }
      running = run();
      return running;
    },
  };
}

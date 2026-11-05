import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

import type { ExerciseRepository } from '@/services/exerciseRepository';
import type { Exercise } from '@/types/exercise';

const DEVICE_KEY = 'apiDevice';
// Holds the updatedAt of the last version the server answered for, so a restart loses nothing
const SETTLED_PREFIX = 'exercise-sync:';
const REQUEST_TIMEOUT_MS = 20_000;
const DEFAULT_RETRY_AFTER_SECONDS = 60;

interface ExerciseSyncOptions {
  baseUrl: string;
  fetch: typeof globalThis.fetch;
  local: Pick<ExerciseRepository, 'listIncludingDeleted'>;
  getCurrentUserId: () => Promise<string>;
  now?: () => number;
}

/** Ends the current sync. What is left stays queued for the next one. */
class SyncStopped extends Error {}

export interface ExerciseSync {
  /** Uploads what the server doesn't have yet. Never rejects: local work is already safe. */
  syncNow(): Promise<void>;
}

/**
 * Uploads this install's exercises. The device stays the source of truth, so nothing here can
 * change or lose local work, and every failure just leaves exercises queued.
 */
export function createExerciseSync({
  baseUrl,
  fetch,
  local,
  getCurrentUserId,
  now = Date.now,
}: ExerciseSyncOptions): ExerciseSync {
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
    try {
      const response = await Promise.race([
        // Being offline is routine, not a problem to report
        fetch(`${baseUrl}${path}`, { ...init, signal: controller.signal }).catch(() => {
          throw new SyncStopped('offline');
        }),
        timedOut,
      ]);
      if (response.status === 429) {
        const seconds = Number(response.headers.get('Retry-After'));
        retryAt = now() + (seconds > 0 ? seconds : DEFAULT_RETRY_AFTER_SECONDS) * 1000;
        throw new SyncStopped('rateLimited');
      }
      if (response.status >= 500) throw new SyncStopped('serverFailing');
      return response;
    } finally {
      clearTimeout(timer);
    }
  };

  const register = async () => {
    const response = await request('/devices', { method: 'POST' });
    const { token } = response.ok ? await response.json() : ({} as { token?: unknown });
    if (typeof token !== 'string' || !token) throw new SyncStopped('invalidRegistration');
    await SecureStore.setItemAsync(DEVICE_KEY, token);
    return token;
  };

  const upload = (exercise: Exercise, token: string) =>
    request(`/exercises/${exercise.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(exercise),
    });

  const pass = async () => {
    const me = await getCurrentUserId();
    const exercises = (await local.listIncludingDeleted()).filter(e => e.ownerId === me);
    const settled = new Map(
      await AsyncStorage.multiGet(exercises.map(e => `${SETTLED_PREFIX}${e.id}`)),
    );
    // A version the server has answered for is done. An exercise deleted before it ever
    // reached the server never needs to.
    const pending = exercises.filter(e => {
      const last = settled.get(`${SETTLED_PREFIX}${e.id}`);
      return last ? last !== e.updatedAt : !e.deletedAt;
    });
    if (pending.length === 0) return;

    let token = (await SecureStore.getItemAsync(DEVICE_KEY)) ?? (await register());
    let registeredAgain = false;

    for (const exercise of pending) {
      let response = await upload(exercise, token);
      if (response.status === 401 && !registeredAgain) {
        registeredAgain = true;
        token = await register();
        response = await upload(exercise, token);
      }
      if (response.status === 401) throw new SyncStopped('unauthorized');
      if (!response.ok) {
        // Retrying can't help until the coach edits it, which gives it a new updatedAt
        console.warn(`Server refused exercise ${exercise.id}: ${response.status}`);
      }
      await AsyncStorage.setItem(`${SETTLED_PREFIX}${exercise.id}`, exercise.updatedAt);
    }
  };

  const runPass = async () => {
    try {
      await pass();
    } catch (error) {
      if (!(error instanceof SyncStopped)) console.warn('Exercise sync failed:', error);
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

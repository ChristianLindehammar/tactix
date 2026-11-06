import { API_BASE_URL } from '@/constants/api';
import { authSession } from '@/services/account';
import { Sport } from '@/constants/sports';
import {
  Exercise,
  ExerciseDifficulty,
  ExercisePhase,
  FocusTag,
  parseExercise,
} from '@/types/exercise';

const REQUEST_TIMEOUT_MS = 20_000;

export type LibraryErrorCode =
  | 'signedOut'
  | 'offline'
  | 'unavailable'
  | 'rateLimited'
  | 'invalidDisplayName';

export class LibraryError extends Error {
  constructor(readonly code: LibraryErrorCode) {
    super(code);
    this.name = 'LibraryError';
  }
}

/** The sorts the server offers. Ratings aren't on the server yet. */
export type LibrarySort = 'updated' | 'title' | 'difficulty';

export interface LibraryFilter {
  sport?: Sport;
  focus?: FocusTag[];
  difficulties?: ExerciseDifficulty[];
  phase?: ExercisePhase;
  playerCount?: number;
  search?: string;
  sort?: LibrarySort;
  offset?: number;
}

export interface LibraryEntry {
  exercise: Exercise;
  /** The name the author chose, or null if they haven't. */
  authorName: string | null;
}

export interface LibraryPage {
  entries: LibraryEntry[];
  /** Every match, not just this page. */
  total: number;
}

interface LibraryOptions {
  baseUrl: string;
  fetch: typeof globalThis.fetch;
  getAuthHeaders: () => Promise<Record<string, string> | null>;
}

const toQuery = (filter: LibraryFilter) => {
  const params: [string, string][] = [];
  if (filter.sport) params.push(['sport', filter.sport]);
  filter.focus?.forEach(tag => params.push(['focus', tag]));
  filter.difficulties?.forEach(level => params.push(['difficulty', String(level)]));
  if (filter.phase) params.push(['phase', filter.phase]);
  if (filter.playerCount !== undefined) params.push(['players', String(filter.playerCount)]);
  const search = filter.search?.trim();
  if (search) params.push(['search', search]);
  if (filter.sort) params.push(['sort', filter.sort]);
  if (filter.offset) params.push(['offset', String(filter.offset)]);
  const query = params.map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join('&');
  return query ? `?${query}` : '';
};

/** Other coaches' public exercises, and what a coach can do about them, on the server. */
export function createLibrary({ baseUrl, fetch, getAuthHeaders }: LibraryOptions) {
  const request = async (path: string, init: RequestInit = {}, body?: unknown) => {
    const authHeaders = await getAuthHeaders();
    if (!authHeaders) throw new LibraryError('signedOut');
    const headers = body === undefined ? authHeaders : { 'Content-Type': 'application/json', ...authHeaders };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(`${baseUrl}${path}`, {
        ...init,
        headers,
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: controller.signal,
      });
    } catch {
      throw new LibraryError('offline');
    } finally {
      clearTimeout(timer);
    }
    if (response.status === 401) throw new LibraryError('signedOut');
    if (response.status === 429) throw new LibraryError('rateLimited');
    return response;
  };

  const expectOk = (response: Response) => {
    if (!response.ok) throw new LibraryError('unavailable');
    return response;
  };

  const readEntry = (data: unknown): LibraryEntry | null => {
    try {
      const authorName = (data as { authorName?: unknown }).authorName;
      return {
        exercise: parseExercise(data),
        authorName: typeof authorName === 'string' ? authorName : null,
      };
    } catch (error) {
      // One exercise from a newer app version mustn't hide the rest of the page
      console.warn('Skipping an unreadable library exercise:', error);
      return null;
    }
  };

  return {
    list: async (filter: LibraryFilter): Promise<LibraryPage> => {
      const response = expectOk(await request(`/library${toQuery(filter)}`));
      const { exercises, total } = await response.json();
      return {
        entries: (exercises as unknown[]).map(readEntry).filter((entry): entry is LibraryEntry => entry !== null),
        total,
      };
    },

    /** Null if it was deleted, or hidden after reports. */
    get: async (id: string): Promise<Exercise | null> => {
      const response = await request(`/exercises/${encodeURIComponent(id)}`);
      if (response.status === 404) return null;
      return parseExercise(await expectOk(response).json());
    },

    report: async (id: string, reason?: string) => {
      expectOk(await request(`/exercises/${encodeURIComponent(id)}/report`, { method: 'POST' }, reason ? { reason } : {}));
    },

    block: async (userId: string) => {
      expectOk(await request(`/users/${encodeURIComponent(userId)}/block`, { method: 'POST' }));
    },

    getDisplayName: async (): Promise<string | null> => {
      const { displayName } = await expectOk(await request('/me')).json();
      return typeof displayName === 'string' ? displayName : null;
    },

    setDisplayName: async (name: string | null) => {
      const response = await request('/me/display-name', { method: 'PUT' }, { displayName: name });
      if (response.status === 400) throw new LibraryError('invalidDisplayName');
      expectOk(response);
    },
  };
}

export type Library = ReturnType<typeof createLibrary>;

export const library = createLibrary({
  baseUrl: API_BASE_URL,
  fetch: (...args) => fetch(...args),
  getAuthHeaders: () => authSession.getAuthHeaders(),
});

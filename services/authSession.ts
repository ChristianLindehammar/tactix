import AsyncStorage from '@react-native-async-storage/async-storage';

import type { UserIdentity } from '@/services/currentUser';
import { moveLocalData } from '@/services/localAccountData';
import type { ProviderToken } from '@/services/signInProviders';

const ACCOUNT_KEY = 'account';
const REQUEST_TIMEOUT_MS = 20_000;
const WEB_CLIENT_HEADERS = { 'X-CoachMate-Client': 'web' };

export type AuthState =
  | { status: 'signedOut' }
  | { status: 'signedIn'; userId: string; email: string | null };

export type AuthErrorCode =
  | 'invalidEmail'
  | 'invalidCode'
  | 'invalidProviderToken'
  | 'rateLimited'
  | 'offline'
  | 'unavailable';

export class AuthError extends Error {
  constructor(readonly code: AuthErrorCode) {
    super(code);
    this.name = 'AuthError';
  }
}

export interface TokenStore {
  get(): Promise<string | null>;
  set(token: string): Promise<void>;
  clear(): Promise<void>;
}

interface AuthSessionOptions {
  baseUrl: string;
  fetch: typeof globalThis.fetch;
  tokenStore: TokenStore;
  identity: UserIdentity;
  /** The web app's session is a cookie scripts can't read. Phones keep a token in secure storage. */
  usesCookies: boolean;
}

export type AuthSession = ReturnType<typeof createAuthSession>;

export function createAuthSession({
  baseUrl,
  fetch,
  tokenStore,
  identity,
  usesCookies,
}: AuthSessionOptions) {
  let state: AuthState = { status: 'signedOut' };
  const listeners = new Set<() => void>();

  const setState = (next: AuthState) => {
    state = next;
    listeners.forEach(listener => listener());
  };

  const request = async (path: string, init: RequestInit) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(`${baseUrl}${path}`, { ...init, signal: controller.signal });
      if (response.status === 429) throw new AuthError('rateLimited');
      if (response.status >= 500) throw new AuthError('unavailable');
      return response;
    } catch (error) {
      if (error instanceof AuthError) throw error;
      throw new AuthError('offline');
    } finally {
      clearTimeout(timer);
    }
  };

  const postJson = (path: string, body: unknown) =>
    request(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(usesCookies ? WEB_CLIENT_HEADERS : {}) },
      body: JSON.stringify(body),
    });

  const getAuthHeaders = async (): Promise<Record<string, string> | null> => {
    if (state.status !== 'signedIn') return null;
    if (usesCookies) return WEB_CLIENT_HEADERS;
    const token = await tokenStore.get();
    return token ? { Authorization: `Bearer ${token}` } : null;
  };

  const adoptLocalData = async (userId: string) => {
    await moveLocalData(await identity.getCurrentUserId(), userId);
    await identity.setCurrentUserId(userId);
  };

  const finishSignIn = async (response: Response, failure: AuthErrorCode) => {
    if (!response.ok) throw new AuthError(failure);
    const { userId, email, token } = await response.json();
    if (typeof userId !== 'string' || (!usesCookies && typeof token !== 'string')) {
      throw new AuthError('unavailable');
    }
    if (!usesCookies) await tokenStore.set(token);
    // Saved before moving anything, so restore() can finish the move if the app stops partway
    await AsyncStorage.setItem(ACCOUNT_KEY, JSON.stringify({ userId, email: email ?? null }));
    await adoptLocalData(userId);
    setState({ status: 'signedIn', userId, email: email ?? null });
  };

  const endLocally = async () => {
    await tokenStore.clear();
    await AsyncStorage.removeItem(ACCOUNT_KEY);
    await identity.startNewLocalUser();
    setState({ status: 'signedOut' });
  };

  const sessionFor = (extra: object) => ({ ...extra, ...(usesCookies ? { session: 'cookie' } : {}) });

  return {
    getState: () => state,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    getAuthHeaders,

    /** Picks up the session from the last launch. Never needs the network. */
    restore: async () => {
      const stored = await AsyncStorage.getItem(ACCOUNT_KEY);
      if (!stored) return;
      const { userId, email } = JSON.parse(stored);
      if (!usesCookies && !(await tokenStore.get())) {
        await AsyncStorage.removeItem(ACCOUNT_KEY);
        return;
      }
      await adoptLocalData(userId);
      setState({ status: 'signedIn', userId, email });
    },

    requestEmailCode: async (email: string, locale: string) => {
      const response = await postJson('/auth/email/start', { email, locale });
      if (!response.ok) throw new AuthError('invalidEmail');
    },

    verifyEmailCode: async (email: string, code: string) => {
      const response = await postJson('/auth/email/verify', sessionFor({ email, code }));
      await finishSignIn(response, 'invalidCode');
    },

    signInWithProvider: async (provider: 'apple' | 'google', token: ProviderToken) => {
      const { idToken, nonce, authorizationCode } = token;
      const body = authorizationCode ? { provider, idToken, nonce, authorizationCode } : { provider, idToken, nonce };
      const response = await postJson('/auth/provider', sessionFor(body));
      await finishSignIn(response, 'invalidProviderToken');
    },

    /** Works offline: the coach asked to leave, so a server we can't reach must not stop it. */
    signOut: async () => {
      const headers = await getAuthHeaders();
      if (headers) {
        await request('/auth/sign-out', { method: 'POST', headers }).catch(() => undefined);
      }
      await endLocally();
    },

    /** Only finishes once the server has confirmed. Exercises stay on this device, unconnected. */
    deleteAccount: async () => {
      const headers = await getAuthHeaders();
      const response = await request('/me', { method: 'DELETE', headers: headers ?? {} });
      if (!response.ok && response.status !== 401) throw new AuthError('unavailable');
      const accountId = await identity.getCurrentUserId();
      await endLocally();
      await moveLocalData(accountId, await identity.getCurrentUserId());
    },

    /** The server no longer accepts this session. Local work is kept for the next sign-in. */
    handleSessionRejected: endLocally,
  };
}

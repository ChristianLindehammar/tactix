import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { API_BASE_URL } from '@/constants/api';
import { createAuthSession, TokenStore } from '@/services/authSession';
import { currentUser } from '@/services/currentUser';

const TOKEN_KEY = 'accountToken';

const secureTokenStore: TokenStore = {
  get: () => SecureStore.getItemAsync(TOKEN_KEY),
  set: token => SecureStore.setItemAsync(TOKEN_KEY, token),
  clear: () => SecureStore.deleteItemAsync(TOKEN_KEY),
};

// Secure storage doesn't exist in browsers, where the session is a cookie scripts can't read
const noTokenStore: TokenStore = {
  get: async () => null,
  set: async () => undefined,
  clear: async () => undefined,
};

const isWeb = Platform.OS === 'web';

export const authSession = createAuthSession({
  baseUrl: API_BASE_URL,
  fetch: (...args) => fetch(...args),
  tokenStore: isWeb ? noTokenStore : secureTokenStore,
  identity: currentUser,
  usesCookies: isWeb,
});

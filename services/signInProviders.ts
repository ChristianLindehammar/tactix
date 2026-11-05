import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';

import { GOOGLE_IOS_CLIENT_ID, GOOGLE_WEB_CLIENT_ID } from '@/constants/signIn';

export interface ProviderToken {
  idToken: string;
  /** What the server hashes to compare with the token's own nonce. Null if the token has none. */
  nonce: string | null;
}

export interface SignInProvider {
  id: 'apple' | 'google';
  /** Null means the coach backed out, which isn't a failure. */
  signIn(): Promise<ProviderToken | null>;
}

const apple: SignInProvider = {
  id: 'apple',
  signIn: async () => {
    const nonce = Crypto.randomUUID();
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [AppleAuthentication.AppleAuthenticationScope.EMAIL],
        nonce: await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, nonce),
      });
      return { idToken: credential.identityToken!, nonce };
    } catch (error) {
      if ((error as { code?: string }).code === 'ERR_REQUEST_CANCELED') return null;
      throw error;
    }
  },
};

const google: SignInProvider = {
  id: 'google',
  signIn: async () => {
    GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID, iosClientId: GOOGLE_IOS_CLIENT_ID });
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();
    if (response.type === 'cancelled') return null;
    // The token is all we need, and a remembered account would skip the chooser for the next coach
    await GoogleSignin.signOut().catch(() => undefined);
    return { idToken: response.data.idToken!, nonce: null };
  },
};

/** Apple only where it's built into the system. The web app has its own sign-in to build. */
export function signInProvidersFor(os: string): SignInProvider[] {
  if (os === 'ios') return [apple, google];
  if (os === 'android') return [google];
  return [];
}

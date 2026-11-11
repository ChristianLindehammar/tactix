import * as AppleAuthentication from 'expo-apple-authentication';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

import { signInProvidersFor } from '@/services/signInProviders';

jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  randomUUID: () => 'raw-nonce',
  digestStringAsync: async (_algorithm: string, value: string) =>
    jest.requireActual('crypto').createHash('sha256').update(value).digest('hex'),
}));
jest.mock('expo-apple-authentication', () => ({
  AppleAuthenticationScope: { EMAIL: 1 },
  signInAsync: jest.fn(),
}));
jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(async () => true),
    signIn: jest.fn(),
    signOut: jest.fn(async () => null),
  },
}));

const providerFor = (os: string, id: string) => signInProvidersFor(os).find(p => p.id === id)!;

test('each platform offers the providers it can use', () => {
  expect(signInProvidersFor('ios').map(p => p.id)).toEqual(['apple', 'google']);
  expect(signInProvidersFor('android').map(p => p.id)).toEqual(['google']);
  expect(signInProvidersFor('web')).toEqual([]);
});

test('Apple gets the hashed nonce and the server gets the raw one, with the authorization code', async () => {
  (AppleAuthentication.signInAsync as jest.Mock).mockResolvedValueOnce({
    identityToken: 'apple-token',
    authorizationCode: 'apple-code',
  });

  const token = await providerFor('ios', 'apple').signIn();

  expect((AppleAuthentication.signInAsync as jest.Mock).mock.calls[0][0].nonce).toBe(
    '2c5d107938053a2275f022c153c9a71f65ee07754b8bca543ee97a0c3cc66990',
  );
  expect(token).toEqual({ idToken: 'apple-token', nonce: 'raw-nonce', authorizationCode: 'apple-code' });
});

test('backing out of Apple counts as cancelled', async () => {
  (AppleAuthentication.signInAsync as jest.Mock).mockRejectedValueOnce(
    Object.assign(new Error('canceled'), { code: 'ERR_REQUEST_CANCELED' }),
  );

  await expect(providerFor('ios', 'apple').signIn()).resolves.toBeNull();
});

test('other Apple failures are reported', async () => {
  (AppleAuthentication.signInAsync as jest.Mock).mockRejectedValueOnce(
    Object.assign(new Error('failed'), { code: 'ERR_REQUEST_FAILED' }),
  );

  await expect(providerFor('ios', 'apple').signIn()).rejects.toThrow('failed');
});

test('Google gives a token with no nonce', async () => {
  (GoogleSignin.signIn as jest.Mock).mockResolvedValueOnce({ type: 'success', data: { idToken: 'google-token' } });

  await expect(providerFor('android', 'google').signIn()).resolves.toEqual({ idToken: 'google-token', nonce: null });
});

test('backing out of Google counts as cancelled', async () => {
  (GoogleSignin.signIn as jest.Mock).mockResolvedValueOnce({ type: 'cancelled', data: null });

  await expect(providerFor('android', 'google').signIn()).resolves.toBeNull();
});

test('Google forgets the account, so the next coach on this phone can choose their own', async () => {
  (GoogleSignin.signIn as jest.Mock).mockResolvedValueOnce({ type: 'success', data: { idToken: 'google-token' } });

  await providerFor('android', 'google').signIn();

  expect(GoogleSignin.signOut).toHaveBeenCalled();
});

test('a phone without Google Play services reports the failure', async () => {
  (GoogleSignin.hasPlayServices as jest.Mock).mockRejectedValueOnce(new Error('no play services'));

  await expect(providerFor('android', 'google').signIn()).rejects.toThrow('no play services');
});

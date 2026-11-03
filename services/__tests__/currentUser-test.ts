import AsyncStorage from '@react-native-async-storage/async-storage';

import { createUserIdentity } from '../currentUser';

describe('user identity', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.restoreAllMocks();
  });

  it('stays the same after a restart', async () => {
    const first = await createUserIdentity().getCurrentUserId();
    const afterRestart = await createUserIdentity().getCurrentUserId();

    expect(afterRestart).toBe(first);
  });

  it('gives overlapping callers the same id', async () => {
    const identity = createUserIdentity();

    const [a, b] = await Promise.all([identity.getCurrentUserId(), identity.getCurrentUserId()]);

    expect(a).toBe(b);
  });

  it('differs between installs', async () => {
    const first = await createUserIdentity().getCurrentUserId();
    await AsyncStorage.clear();

    expect(await createUserIdentity().getCurrentUserId()).not.toBe(first);
  });

  it('tries again after a storage failure', async () => {
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('disk error'));
    const identity = createUserIdentity();

    await expect(identity.getCurrentUserId()).rejects.toThrow('disk error');
    await expect(identity.getCurrentUserId()).resolves.toEqual(expect.any(String));
  });
});

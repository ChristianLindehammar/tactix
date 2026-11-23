import type { CustomerInfo } from 'react-native-purchases';

import { LIFETIME_ENDS, toPlan } from '@/services/revenueCatPlanStore';

jest.mock('react-native-purchases', () => ({ __esModule: true, default: {}, PURCHASES_ERROR_CODE: {} }));

const NEXT_YEAR = '2099-01-15T08:00:00.000Z';
const LAST_YEAR = '2020-01-15T08:00:00.000Z';

const withPremium = (premium?: { isActive: boolean; expirationDate: string | null }) =>
  ({ entitlements: { all: premium ? { premium } : {} } }) as unknown as CustomerInfo;

test('a coach who never bought has no plan', () => {
  expect(toPlan(withPremium())).toEqual({ expiresAt: null });
});

test('a one-time purchase never ends', () => {
  expect(toPlan(withPremium({ isActive: true, expirationDate: null }))).toEqual({
    expiresAt: LIFETIME_ENDS,
    lifetime: true,
  });
});

test('a subscription runs until its end date', () => {
  expect(toPlan(withPremium({ isActive: true, expirationDate: NEXT_YEAR }))).toEqual({ expiresAt: NEXT_YEAR });
});

test('a subscription the store still calls active keeps access past its date, in a grace period', () => {
  const { expiresAt } = toPlan(withPremium({ isActive: true, expirationDate: LAST_YEAR }));

  expect(Date.parse(expiresAt!)).toBeGreaterThan(Date.now());
});

test('an ended subscription keeps its end date', () => {
  expect(toPlan(withPremium({ isActive: false, expirationDate: LAST_YEAR }))).toEqual({ expiresAt: LAST_YEAR });
});

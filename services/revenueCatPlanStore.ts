import { Linking, Platform } from 'react-native';
import Purchases, { CustomerInfo, PURCHASES_ERROR_CODE } from 'react-native-purchases';

import type { PlanStore, StorePlan } from '@/services/planService';

const ENTITLEMENT = 'premium';
const DAY_MS = 86_400_000;
const PLAY_SUBSCRIPTIONS_URL = 'https://play.google.com/store/account/subscriptions';
/** Stands in for the end of a plan that never ends, the same date the server uses. */
export const LIFETIME_ENDS = '2100-01-01T00:00:00.000Z';

export const toPlan = (info: CustomerInfo): StorePlan => {
  const entitlement = info.entitlements.all[ENTITLEMENT];
  if (!entitlement) return { expiresAt: null };
  // A one-time purchase, or access granted by hand, has no end date
  if (entitlement.isActive && !entitlement.expirationDate) return { expiresAt: LIFETIME_ENDS, lifetime: true };
  // An active subscription can show a past date, during a store's grace period for example.
  // The store's word wins, and the next check moves the date on.
  const dateIsPast = !entitlement.expirationDate || Date.parse(entitlement.expirationDate) <= Date.now();
  if (entitlement.isActive && dateIsPast) return { expiresAt: new Date(Date.now() + DAY_MS).toISOString() };
  return { expiresAt: entitlement.expirationDate };
};

export function createRevenueCatPlanStore(apiKey: string): PlanStore {
  Purchases.configure({ apiKey });

  return {
    getPlan: async () => toPlan(await Purchases.getCustomerInfo()),
    getPrice: async () => (await Purchases.getOfferings()).current?.lifetime?.product.priceString ?? null,
    purchase: async () => {
      const offered = (await Purchases.getOfferings()).current?.lifetime;
      if (!offered) throw new Error('No lifetime purchase is on offer');
      try {
        return toPlan((await Purchases.purchasePackage(offered)).customerInfo);
      } catch (error) {
        if ((error as { code?: string }).code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) return 'cancelled';
        throw error;
      }
    },
    restore: async () => toPlan(await Purchases.restorePurchases()),
    // Only for coaches still on a subscription they bought before the one-time purchase
    manage: async () => {
      // Apple's sheet opens inside the app and also covers TestFlight purchases
      if (Platform.OS === 'ios') return Purchases.showManageSubscriptions();
      const { managementURL } = await Purchases.getCustomerInfo();
      await Linking.openURL(managementURL ?? PLAY_SUBSCRIPTIONS_URL);
    },
    onChange: listener => Purchases.addCustomerInfoUpdateListener(info => listener(toPlan(info))),
    logIn: async (userId, email) => {
      await Purchases.logIn(userId);
      // Shown and searchable on the customer's page in RevenueCat
      if (email) await Purchases.setEmail(email);
    },
    logOut: async () => {
      await Purchases.logOut();
    },
  };
}

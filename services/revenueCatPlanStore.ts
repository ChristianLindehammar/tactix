import { Linking, Platform } from 'react-native';
import Purchases, { CustomerInfo, PURCHASES_ERROR_CODE } from 'react-native-purchases';

import type { PlanStore, StorePlan } from '@/services/planService';

const ENTITLEMENT = 'premium';
const DAY_MS = 86_400_000;
const PLAY_SUBSCRIPTIONS_URL = 'https://play.google.com/store/account/subscriptions';

const toPlan = (info: CustomerInfo): StorePlan => {
  const entitlement = info.entitlements.all[ENTITLEMENT];
  if (!entitlement) return { expiresAt: null };
  // An active plan can show a past or missing date, during a store's grace period for example.
  // The store's word wins, and the next check moves the date on.
  const dateIsPast = !entitlement.expirationDate || Date.parse(entitlement.expirationDate) <= Date.now();
  if (entitlement.isActive && dateIsPast) return { expiresAt: new Date(Date.now() + DAY_MS).toISOString() };
  return { expiresAt: entitlement.expirationDate };
};

export function createRevenueCatPlanStore(apiKey: string): PlanStore {
  Purchases.configure({ apiKey });

  return {
    getPlan: async () => toPlan(await Purchases.getCustomerInfo()),
    getPrices: async () => {
      const offering = (await Purchases.getOfferings()).current;
      return {
        annual: offering?.annual?.product.priceString ?? null,
        monthly: offering?.monthly?.product.priceString ?? null,
      };
    },
    purchase: async period => {
      const offered = (await Purchases.getOfferings()).current?.[period];
      if (!offered) throw new Error(`No ${period} plan is on offer`);
      try {
        return toPlan((await Purchases.purchasePackage(offered)).customerInfo);
      } catch (error) {
        if ((error as { code?: string }).code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) return 'cancelled';
        throw error;
      }
    },
    restore: async () => toPlan(await Purchases.restorePurchases()),
    manage: async () => {
      // Apple's sheet opens inside the app and also covers TestFlight purchases
      if (Platform.OS === 'ios') return Purchases.showManageSubscriptions();
      const { managementURL } = await Purchases.getCustomerInfo();
      await Linking.openURL(managementURL ?? PLAY_SUBSCRIPTIONS_URL);
    },
    logIn: async userId => {
      await Purchases.logIn(userId);
    },
    logOut: async () => {
      await Purchases.logOut();
    },
  };
}

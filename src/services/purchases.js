import { Platform } from 'react-native';

/**
 * RevenueCat integration — currently SCAFFOLDED / STUBBED.
 *
 * Why stubbed: `react-native-purchases` ships native code and does NOT run in
 * Expo Go. Enabling it requires a custom EAS dev build. Until then this module
 * exposes the full purchase API as no-ops so the rest of the app can call it
 * safely and the UI is already wired.
 *
 * ── To go live ──────────────────────────────────────────────────────────────
 *  1. Install the SDK:           npx expo install react-native-purchases
 *  2. Create a dev/production build with EAS (Expo Go will not work).
 *  3. Fill in RC_API_KEYS below from the RevenueCat dashboard (Project → API keys).
 *  4. In RevenueCat, create an entitlement (default id 'premium') and an Offering
 *     with packages whose identifiers match PLAN_PACKAGES below.
 *  5. Set REVENUECAT_ENABLED = true and uncomment the `Purchases` lines.
 */

export const REVENUECAT_ENABLED = false;

// Public SDK keys from RevenueCat → Project Settings → API keys.
export const RC_API_KEYS = {
  ios: 'appl_XXXXXXXXXXXXXXXXXXXXXXXX',
  android: 'goog_XXXXXXXXXXXXXXXXXXXXXXXX',
};

// The entitlement that unlocks premium, as configured in RevenueCat.
export const ENTITLEMENT_ID = 'premium';

// Maps our in-app plan ids (see PaywallScreen) to RevenueCat package identifiers.
export const PLAN_PACKAGES = {
  annual: '$rc_annual',
  monthly: '$rc_monthly',
};

// let Purchases; // require('react-native-purchases').default once enabled

/** Configure the SDK once at app start. Safe no-op while stubbed. */
export async function initPurchases() {
  if (!REVENUECAT_ENABLED) return;
  // Purchases = require('react-native-purchases').default;
  // const apiKey = Platform.OS === 'ios' ? RC_API_KEYS.ios : RC_API_KEYS.android;
  // Purchases.configure({ apiKey });
}

/** Returns whether the current user has the premium entitlement. */
export async function fetchIsPremium() {
  if (!REVENUECAT_ENABLED) return false;
  // const info = await Purchases.getCustomerInfo();
  // return !!info.entitlements.active[ENTITLEMENT_ID];
}

/**
 * Purchase a plan. Returns { ok, reason? }.
 * reason 'not_configured' means billing isn't wired yet (stub).
 */
export async function purchasePlan(planId) {
  if (!REVENUECAT_ENABLED) return { ok: false, reason: 'not_configured' };
  // const offerings = await Purchases.getOfferings();
  // const pkg = offerings.current?.availablePackages
  //   .find(p => p.identifier === PLAN_PACKAGES[planId]);
  // if (!pkg) return { ok: false, reason: 'package_not_found' };
  // try {
  //   const { customerInfo } = await Purchases.purchasePackage(pkg);
  //   return { ok: !!customerInfo.entitlements.active[ENTITLEMENT_ID] };
  // } catch (e) {
  //   if (e.userCancelled) return { ok: false, reason: 'cancelled' };
  //   return { ok: false, reason: 'error', message: e.message };
  // }
}

/** Restore previous purchases. Returns { ok, reason? }. */
export async function restorePurchases() {
  if (!REVENUECAT_ENABLED) return { ok: false, reason: 'not_configured' };
  // const info = await Purchases.restorePurchases();
  // return { ok: !!info.entitlements.active[ENTITLEMENT_ID] };
}

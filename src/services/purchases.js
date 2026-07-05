import { Platform } from 'react-native';

/**
 * RevenueCat integration.
 *
 * `react-native-purchases` ships native code and does NOT run in Expo Go — it
 * requires a native build (`expo run:ios` locally, or an EAS build). Every
 * function no-ops while REVENUECAT_ENABLED is false, so the rest of the app can
 * call them safely before billing is switched on.
 *
 * ── To go live ──────────────────────────────────────────────────────────────
 *  1. In App Store Connect, create the two auto-renewable subscriptions and note
 *     their product ids (e.g. com.trovault.app.premium.monthly / .annual).
 *  2. In RevenueCat: add the App Store app + shared secret, attach the products,
 *     map them to packages $rc_monthly / $rc_annual in the default Offering, and
 *     put both under an entitlement with id ENTITLEMENT_ID ('premium').
 *  3. Paste the RevenueCat public iOS SDK key into RC_API_KEYS.ios below.
 *  4. Set REVENUECAT_ENABLED = true and rebuild (native module already bundled).
 */

export const REVENUECAT_ENABLED = true;

// Public SDK keys from RevenueCat → Project Settings → API keys (these are the
// *public* app-specific keys — safe to ship in the client; not the secret key).
export const RC_API_KEYS = {
  ios: 'appl_TJXkEAPWeqZBIVILbHmJSyNvVva',
  android: 'goog_XXXXXXXXXXXXXXXXXXXXXXXX',
};

// The entitlement that unlocks premium, as configured in RevenueCat.
export const ENTITLEMENT_ID = 'premium';

// react-native-purchases is native-only; on web every call must stay a no-op
// so the module is never required and the web bundle can't crash.
const RC_ENABLED = REVENUECAT_ENABLED && Platform.OS !== 'web';

// Maps our in-app plan ids (see PaywallScreen) to RevenueCat package identifiers.
export const PLAN_PACKAGES = {
  annual: '$rc_annual',
  monthly: '$rc_monthly',
};

// Lazily required so the native module is never touched while disabled.
let Purchases;
function rc() {
  if (!Purchases) Purchases = require('react-native-purchases').default;
  return Purchases;
}

/** Configure the SDK once at app start. Safe no-op while disabled. */
export async function initPurchases() {
  if (!RC_ENABLED) return;
  const apiKey = Platform.OS === 'ios' ? RC_API_KEYS.ios : RC_API_KEYS.android;
  rc().configure({ apiKey });
}

/** Returns whether the current user has the premium entitlement. */
export async function fetchIsPremium() {
  if (!RC_ENABLED) return false;
  try {
    const info = await rc().getCustomerInfo();
    return !!info.entitlements.active[ENTITLEMENT_ID];
  } catch {
    return false;
  }
}

/**
 * Subscribe to entitlement changes (purchase, renewal, expiry, or the SDK's
 * own fetch finishing after a slow cold start). Returns an unsubscribe fn.
 */
export function onPremiumChange(cb) {
  if (!RC_ENABLED) return () => {};
  const listener = info => cb(!!info.entitlements.active[ENTITLEMENT_ID]);
  rc().addCustomerInfoUpdateListener(listener);
  return () => rc().removeCustomerInfoUpdateListener(listener);
}

/**
 * Purchase a plan. Returns { ok, reason? }.
 * reason 'not_configured' means billing isn't switched on yet.
 */
export async function purchasePlan(planId) {
  if (!RC_ENABLED) return { ok: false, reason: 'not_configured' };
  try {
    const offerings = await rc().getOfferings();
    const pkg = offerings.current?.availablePackages
      .find(p => p.identifier === PLAN_PACKAGES[planId]);
    if (!pkg) return { ok: false, reason: 'package_not_found' };
    const { customerInfo } = await rc().purchasePackage(pkg);
    return { ok: !!customerInfo.entitlements.active[ENTITLEMENT_ID] };
  } catch (e) {
    if (e.userCancelled) return { ok: false, reason: 'cancelled' };
    return { ok: false, reason: 'error', message: e.message };
  }
}

/** Restore previous purchases. Returns { ok, reason? }. */
export async function restorePurchases() {
  if (!RC_ENABLED) return { ok: false, reason: 'not_configured' };
  try {
    const info = await rc().restorePurchases();
    return { ok: !!info.entitlements.active[ENTITLEMENT_ID] };
  } catch (e) {
    return { ok: false, reason: 'error', message: e.message };
  }
}

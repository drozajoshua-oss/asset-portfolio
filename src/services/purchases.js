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
  // ⚠️ PLACEHOLDER — NOT A REAL KEY. Android is not shipped (decided
  // 2026-08-09: no Android hardware to test on, and Play requires 12
  // testers for 14 days first). Before ANY Android release: create the
  // Play Billing products, add the Play app in RevenueCat, and paste the
  // real goog_ key here — otherwise purchases fail at startup.
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
  lifetime: '$rc_lifetime',
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
 * Which plans the current offering actually contains, with localized prices.
 * The paywall renders a plan only if its package exists in RevenueCat, so
 * store config can trail the binary without shipping dead buttons — and
 * localized priceStrings replace the hardcoded USD fallbacks when available.
 * Returns e.g. { annual: '$39.99', monthly: '$4.99', lifetime: '$99.99' }.
 */
export async function fetchAvailablePlans() {
  if (!RC_ENABLED) return {};
  try {
    const offerings = await rc().getOfferings();
    const pkgs = offerings.current?.availablePackages ?? [];
    const out = {};
    for (const [planId, pkgId] of Object.entries(PLAN_PACKAGES)) {
      const pkg = pkgs.find(p => p.identifier === pkgId);
      if (pkg) out[planId] = pkg.product?.priceString ?? null;
    }
    return out;
  } catch {
    return {};
  }
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

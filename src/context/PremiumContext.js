import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  initPurchases, fetchIsPremium, purchasePlan, restorePurchases, onPremiumChange,
} from '../services/purchases';

// Free quota, in two stages:
//   • First 30 days after install — WELCOME_SCAN_LIMIT total. New users need
//     enough scans to actually build a starter collection, because the payoff
//     of Trovault is seeing a COLLECTION total, not a single lookup. Five
//     scans gates the aha moment rather than the premium features.
//   • After that — FREE_SCAN_LIMIT per calendar month, reset on the 1st.
// Premium is unlimited.
export const FREE_SCAN_LIMIT    = 5;
export const WELCOME_SCAN_LIMIT = 15;
const WELCOME_DAYS = 30;

const SCAN_COUNT_KEY = 'scan_count_v3'; // JSON: { period, count }
const FIRST_SEEN_KEY = 'first_seen_at'; // ISO date of first launch

// Scan counts are scoped to a period key so the quota resets cleanly.
// During the welcome window that key is a constant, so the 15 is a single
// pool spanning the whole window rather than refilling at month boundaries.
function periodFor(firstSeenAt) {
  if (isWelcome(firstSeenAt)) return 'welcome';
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function isWelcome(firstSeenAt) {
  if (!firstSeenAt) return true;               // first run — treat as welcome
  const ms = Date.now() - new Date(firstSeenAt).getTime();
  return ms < WELCOME_DAYS * 24 * 60 * 60 * 1000;
}

const PremiumContext = createContext(null);

export function PremiumProvider({ children }) {
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [scanCount, setScanCount] = useState(0);
  const [firstSeenAt, setFirstSeenAt] = useState(null);

  useEffect(() => {
    let active = true;
    let unsubscribe = () => {};
    const withTimeout = (p, ms, fallback) =>
      Promise.race([p, new Promise(res => setTimeout(() => res(fallback), ms))]);
    (async () => {
      try {
        await initPurchases();
        // Track entitlement changes for the whole session — renewals, expiry,
        // and the SDK's first fetch landing after the timeout below.
        unsubscribe = onPremiumChange(premium => {
          if (active) setIsPremium(premium);
        });
        // StoreKit can stall for seconds when products aren't available yet —
        // never let it hold up first paint. Only an affirmative result is
        // applied here; the timeout's false fallback must not clobber a
        // listener update that already arrived.
        const premium = await withTimeout(fetchIsPremium(), 4000, false);
        if (active && premium) setIsPremium(true);
      } catch (_) {
        // ignore — default to not premium
      }
      let seen = null;
      try {
        // Stamp the install date once, so the welcome window has an anchor.
        seen = await AsyncStorage.getItem(FIRST_SEEN_KEY);
        if (!seen) {
          seen = new Date().toISOString();
          await AsyncStorage.setItem(FIRST_SEEN_KEY, seen);
        }
        if (active) setFirstSeenAt(seen);
      } catch (_) {
        // ignore — isWelcome(null) is true, which errs generous
      }
      try {
        const raw = await AsyncStorage.getItem(SCAN_COUNT_KEY);
        if (raw && active) {
          const { period, count } = JSON.parse(raw);
          // A count from a previous period is stale — the quota has reset.
          if (period === periodFor(seen)) setScanCount(parseInt(count, 10) || 0);
        }
      } catch (_) {
        // ignore — default to zero usage
      }
      if (active) setLoading(false);
    })();
    return () => { active = false; unsubscribe(); };
  }, []);

  // Count one identification against the current free quota.
  function recordScan() {
    setScanCount(prev => {
      const next = prev + 1;
      AsyncStorage.setItem(
        SCAN_COUNT_KEY,
        JSON.stringify({ period: periodFor(firstSeenAt), count: next }),
      ).catch(() => {});
      return next;
    });
  }

  const inWelcome      = isWelcome(firstSeenAt);
  const activeLimit    = inWelcome ? WELCOME_SCAN_LIMIT : FREE_SCAN_LIMIT;
  const canScan        = isPremium || scanCount < activeLimit;
  const scansRemaining = isPremium ? Infinity : Math.max(0, activeLimit - scanCount);

  async function purchase(planId) {
    const res = await purchasePlan(planId);
    if (res?.ok) setIsPremium(true);
    return res;
  }

  async function restore() {
    const res = await restorePurchases();
    if (res?.ok) setIsPremium(true);
    return res;
  }

  return (
    <PremiumContext.Provider value={{
      isPremium, loading, purchase, restore,
      canScan, scansRemaining, recordScan,
      freeScanLimit: activeLimit, inWelcome,
    }}>
      {children}
    </PremiumContext.Provider>
  );
}

export function usePremium() { return useContext(PremiumContext); }

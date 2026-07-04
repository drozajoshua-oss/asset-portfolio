import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  initPurchases, fetchIsPremium, purchasePlan, restorePurchases,
} from '../services/purchases';

// Free users get this many identifications PER CALENDAR MONTH; the counter
// resets on the 1st. Premium is unlimited.
export const FREE_SCAN_LIMIT = 5;
const SCAN_COUNT_KEY = 'scan_count_v3'; // JSON: { period: 'YYYY-MM', count }

// e.g. '2026-07' — scan counts are scoped to this key so a new month starts fresh.
function currentPeriod() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const PremiumContext = createContext(null);

export function PremiumProvider({ children }) {
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [scanCount, setScanCount] = useState(0);

  useEffect(() => {
    let active = true;
    const withTimeout = (p, ms, fallback) =>
      Promise.race([p, new Promise(res => setTimeout(() => res(fallback), ms))]);
    (async () => {
      try {
        await initPurchases();
        // StoreKit can stall for seconds when products aren't available yet —
        // never let it hold up first paint.
        const premium = await withTimeout(fetchIsPremium(), 4000, false);
        if (active) setIsPremium(premium);
      } catch (_) {
        // ignore — default to not premium
      }
      try {
        const raw = await AsyncStorage.getItem(SCAN_COUNT_KEY);
        if (raw && active) {
          const { period, count } = JSON.parse(raw);
          // A stored count from a previous month is stale — the quota reset.
          if (period === currentPeriod()) setScanCount(parseInt(count, 10) || 0);
        }
      } catch (_) {
        // ignore — default to zero usage
      }
      if (active) setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  // Count one identification against this month's free quota.
  function recordScan() {
    setScanCount(prev => {
      const next = prev + 1;
      AsyncStorage.setItem(
        SCAN_COUNT_KEY,
        JSON.stringify({ period: currentPeriod(), count: next }),
      ).catch(() => {});
      return next;
    });
  }

  const canScan        = isPremium || scanCount < FREE_SCAN_LIMIT;
  const scansRemaining = isPremium ? Infinity : Math.max(0, FREE_SCAN_LIMIT - scanCount);

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
      canScan, scansRemaining, recordScan, freeScanLimit: FREE_SCAN_LIMIT,
    }}>
      {children}
    </PremiumContext.Provider>
  );
}

export function usePremium() { return useContext(PremiumContext); }

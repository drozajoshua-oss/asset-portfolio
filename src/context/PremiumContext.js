import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  initPurchases, fetchIsPremium, purchasePlan, restorePurchases,
} from '../services/purchases';

// Free users get this many identifications total (lifetime — does NOT reset);
// after that they must upgrade. Premium is unlimited.
export const FREE_SCAN_LIMIT = 5;
const SCAN_COUNT_KEY = 'scan_count_v2';

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
        if (raw && active) setScanCount(parseInt(raw, 10) || 0);
      } catch (_) {
        // ignore — default to zero usage
      }
      if (active) setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  // Count one identification against the lifetime free quota.
  function recordScan() {
    setScanCount(prev => {
      const next = prev + 1;
      AsyncStorage.setItem(SCAN_COUNT_KEY, String(next)).catch(() => {});
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

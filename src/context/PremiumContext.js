import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  initPurchases, fetchIsPremium, purchasePlan, restorePurchases,
} from '../services/purchases';

// Free users get this many identifications per day; premium is unlimited.
export const FREE_DAILY_SCANS = 3;
const SCAN_USAGE_KEY = 'scan_usage_v1';

function todayKey() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD, resets daily
}

const PremiumContext = createContext(null);

export function PremiumProvider({ children }) {
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [usage, setUsage] = useState({ date: todayKey(), count: 0 });

  useEffect(() => {
    let active = true;
    (async () => {
      await initPurchases();
      try {
        const premium = await fetchIsPremium();
        if (active) setIsPremium(premium);
      } catch (_) {
        // ignore — default to not premium
      }
      try {
        const raw = await AsyncStorage.getItem(SCAN_USAGE_KEY);
        if (raw && active) {
          const parsed = JSON.parse(raw);
          setUsage(parsed.date === todayKey() ? parsed : { date: todayKey(), count: 0 });
        }
      } catch (_) {
        // ignore — default to zero usage
      }
      if (active) setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  // Count one identification against today's free quota.
  function recordScan() {
    setUsage(prev => {
      const today = todayKey();
      const next = prev.date === today
        ? { date: today, count: prev.count + 1 }
        : { date: today, count: 1 };
      AsyncStorage.setItem(SCAN_USAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }

  const scansToday      = usage.date === todayKey() ? usage.count : 0;
  const canScan         = isPremium || scansToday < FREE_DAILY_SCANS;
  const scansRemaining  = isPremium ? Infinity : Math.max(0, FREE_DAILY_SCANS - scansToday);

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
      canScan, scansRemaining, recordScan, freeDailyScans: FREE_DAILY_SCANS,
    }}>
      {children}
    </PremiumContext.Provider>
  );
}

export function usePremium() { return useContext(PremiumContext); }

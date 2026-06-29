import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  initPurchases, fetchIsPremium, purchasePlan, restorePurchases,
} from '../services/purchases';

const PremiumContext = createContext(null);

export function PremiumProvider({ children }) {
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);

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
      if (active) setLoading(false);
    })();
    return () => { active = false; };
  }, []);

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
    <PremiumContext.Provider value={{ isPremium, loading, purchase, restore }}>
      {children}
    </PremiumContext.Provider>
  );
}

export function usePremium() { return useContext(PremiumContext); }

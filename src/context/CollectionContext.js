import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from './AuthContext';

const CollectionContext = createContext(null);

function mapRowToCoin(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category ?? 'Coins',
    country: row.country ?? '',
    year: row.year ?? 0,
    value: row.manual_value != null
      ? row.manual_value
      : Math.round(((row.estimated_value_low ?? 0) + (row.estimated_value_high ?? 0)) / 2),
    rarity: row.rarity ?? 'common',
    metal: row.metal ?? 'Silver',
    coinColor: row.coin_color ?? '#C0C0C0',
    symbolChar: row.symbol_char ?? '?',
  };
}

export function CollectionProvider({ children }) {
  const { session } = useAuth();
  const [coins, setCoins] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session?.user) {
      loadAssets();
    } else {
      setCoins([]);
    }
  }, [session?.user?.id]);

  async function loadAssets() {
    setLoading(true);
    const { data, error } = await supabase
      .from('assets')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) setCoins(data.map(mapRowToCoin));
    setLoading(false);
  }

  async function addCoin(scanResult) {
    if (!session?.user) return { error: new Error('Not logged in') };

    const row = {
      user_id:              session.user.id,
      name:                 scanResult.name,
      category:             scanResult.category ?? 'Coins',
      country:              scanResult.country,
      year:                 scanResult.year,
      estimated_value_low:  scanResult.minValue,
      estimated_value_high: scanResult.maxValue,
      rarity:               scanResult.rarity,
      grade:                scanResult.grade ?? null,
      coin_color:           scanResult.coinColor,
      symbol_char:          scanResult.symbolChar,
      metal:                scanResult.metal ?? 'Silver',
    };

    const { data, error } = await supabase
      .from('assets')
      .insert(row)
      .select()
      .single();

    if (!error && data) setCoins(prev => [mapRowToCoin(data), ...prev]);
    return { error };
  }

  async function updateCoinValue(id, newValue) {
    const { error } = await supabase
      .from('assets')
      .update({ manual_value: newValue })
      .eq('id', id);

    if (!error) setCoins(prev => prev.map(c => c.id === id ? { ...c, value: newValue } : c));
  }

  return (
    <CollectionContext.Provider value={{ coins, loading, addCoin, updateCoinValue }}>
      {children}
    </CollectionContext.Provider>
  );
}

export function useCollection() { return useContext(CollectionContext); }

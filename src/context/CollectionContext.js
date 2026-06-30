import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from './AuthContext';

const CollectionContext = createContext(null);

function mapRowToCoin(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category ?? 'Other',
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
      category:             scanResult.category ?? 'Other',
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
    return updateCoin(id, { value: newValue });
  }

  // Update editable fields (UI shape): { name?, category?, country?, year?, value? }.
  async function updateCoin(id, fields) {
    const dbPatch = {};
    if (fields.name != null)     dbPatch.name = fields.name;
    if (fields.category != null) dbPatch.category = fields.category;
    if (fields.country != null)  dbPatch.country = fields.country;
    if (fields.year != null)     dbPatch.year = fields.year;
    if (fields.value != null)    dbPatch.manual_value = fields.value;

    const { error } = await supabase.from('assets').update(dbPatch).eq('id', id);
    if (!error) setCoins(prev => prev.map(c => c.id === id ? { ...c, ...fields } : c));
    return { error };
  }

  // Manually add an item (no scan). Fields: { name, category, country, year, value }.
  async function addManualCoin(fields) {
    return addCoin({
      name:       fields.name,
      category:   fields.category || 'Other',
      country:    fields.country || '',
      year:       fields.year || 0,
      minValue:   fields.value || 0,
      maxValue:   fields.value || 0,
      rarity:     'common',
      grade:      null,
      coinColor:  '#5C6EF0',
      symbolChar: '◆',
      metal:      'Silver',
    });
  }

  async function deleteCoin(id) {
    const { error } = await supabase.from('assets').delete().eq('id', id);
    if (!error) setCoins(prev => prev.filter(c => c.id !== id));
    return { error };
  }

  return (
    <CollectionContext.Provider value={{
      coins, loading, addCoin, addManualCoin, updateCoinValue, updateCoin, deleteCoin,
      refresh: loadAssets,
    }}>
      {children}
    </CollectionContext.Provider>
  );
}

export function useCollection() { return useContext(CollectionContext); }

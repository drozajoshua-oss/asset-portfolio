import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // NOTE: a missing .catch here was crashing the production (release) build —
    // an unhandled promise rejection is just a warning in Expo Go/dev but becomes
    // a fatal abort() in a release build. Always resolve loading, even on error.
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (!mounted) return;
        setSession(session);
        setLoading(false);
      })
      .catch((e) => {
        console.warn('getSession failed:', e?.message);
        if (mounted) setLoading(false);
      });

    let subscription;
    try {
      const res = supabase.auth.onAuthStateChange((_event, session) => {
        if (mounted) setSession(session);
      });
      subscription = res?.data?.subscription;
    } catch (e) {
      console.warn('onAuthStateChange failed:', e?.message);
    }

    return () => {
      mounted = false;
      try { subscription?.unsubscribe?.(); } catch (_) {}
    };
  }, []);

  const signOut = () => supabase.auth.signOut().catch((e) => console.warn('signOut failed:', e?.message));

  return (
    <AuthContext.Provider value={{ session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }

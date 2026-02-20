import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { supabase } from '../lib/supabase';
import { recordActivity, isSessionExpired } from '../lib/security';
import type { AuthContextValue } from '../types';

const AuthContext = createContext<AuthContextValue>({} as AuthContextValue);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthContextValue['user']>(null);
  const [session, setSession] = useState<unknown>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Auth Listener
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: any } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    }).catch(() => {
      // Network unavailable — keep existing session from SecureStore.
      // Supabase's persistSession:true handles offline gracefully.
      setLoading(false);
    });

    // Listen for auth changes (login, logout, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: string, session: any) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Refresh session when app returns from background + enforce session timeout
  const appState = useRef<AppStateStatus>(AppState.currentState);
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // Check session timeout when returning from background
        if (isSessionExpired()) {
          supabase.auth.signOut().then(() => {
            setSession(null);
            setUser(null);
          });
        } else {
          recordActivity();
          supabase.auth.getSession().then(({ data: { session } }: { data: { session: any } }) => {
            setSession(session);
            setUser(session?.user ?? null);
          }).catch(() => {
            // Network unavailable on resume — keep existing session.
          });
        }
      }
      appState.current = nextAppState;
    };
    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => sub.remove();
  }, []);

  // Periodic session timeout check (every 5 minutes while app is active)
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      if (isSessionExpired()) {
        supabase.auth.signOut().then(() => {
          setSession(null);
          setUser(null);
        });
      }
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user]);

  const signIn = useCallback(async (email: string, password: string) => {
    const trimmedEmail = (email || '').trim().toLowerCase();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    });
    if (!error) recordActivity();
    return { data, error };
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const trimmedEmail = (email || '').trim().toLowerCase();
    const { data, error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
    });
    return { data, error };
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    recordActivity,
  }), [user, session, loading, signIn, signUp, signOut]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

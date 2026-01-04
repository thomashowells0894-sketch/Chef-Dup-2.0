/**
 * React Hook for Cloud Authentication and Data Sync
 * Provides easy access to cloud services with automatic state management
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  signUpWithEmail,
  signInWithEmail,
  signInWithApple,
  signInWithGoogle,
  signOut,
  getCurrentUser,
  onAuthStateChange,
  sendPasswordReset,
  AuthUser,
  AuthResult,
} from '../services/cloudAuth';
import {
  getSyncStatus,
  onSyncStatusChange,
  processPendingChanges,
  performFullSync,
  syncProfile,
  syncMealLog,
  syncWeightLog,
  syncWorkoutSession,
  syncPantryItem,
} from '../services/cloudSync';
import { UserProfile, MealPlanEntry, WorkoutSession, Ingredient } from '../types';

// ==========================================
// AUTH HOOK
// ==========================================

interface UseAuthResult {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  signUp: (email: string, password: string, name: string) => Promise<AuthResult>;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signInApple: () => Promise<AuthResult>;
  signInGoogle: () => Promise<AuthResult>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<AuthResult>;
  clearError: () => void;
}

export function useAuth(): UseAuthResult {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
      } catch (e) {
        console.error('Session check error:', e);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();

    // Subscribe to auth changes
    const { data: { subscription } } = onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      } else if (event === 'TOKEN_REFRESHED') {
        // Session refreshed, user stays logged in
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signUp = useCallback(async (email: string, password: string, name: string) => {
    setIsLoading(true);
    setError(null);
    const result = await signUpWithEmail(email, password, name);
    if (result.success && result.user) {
      setUser(result.user);
    } else if (result.error) {
      setError(result.error);
    }
    setIsLoading(false);
    return result;
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    const result = await signInWithEmail(email, password);
    if (result.success && result.user) {
      setUser(result.user);
    } else if (result.error) {
      setError(result.error);
    }
    setIsLoading(false);
    return result;
  }, []);

  const signInApple = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const result = await signInWithApple();
    if (result.error) {
      setError(result.error);
    }
    setIsLoading(false);
    return result;
  }, []);

  const signInGoogle = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const result = await signInWithGoogle();
    if (result.error) {
      setError(result.error);
    }
    setIsLoading(false);
    return result;
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    await signOut();
    setUser(null);
    setIsLoading(false);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    setIsLoading(true);
    setError(null);
    const result = await sendPasswordReset(email);
    if (result.error) {
      setError(result.error);
    }
    setIsLoading(false);
    return result;
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated: user !== null,
    error,
    signUp,
    signIn,
    signInApple,
    signInGoogle,
    logout,
    resetPassword,
    clearError,
  };
}

// ==========================================
// SYNC HOOK
// ==========================================

interface SyncState {
  lastSyncedAt: string | null;
  pendingChanges: number;
  isOnline: boolean;
  isSyncing: boolean;
}

interface UseSyncResult {
  syncStatus: SyncState;
  syncProfile: (userId: string, profile: Partial<UserProfile>) => Promise<void>;
  syncMeal: (userId: string, entry: MealPlanEntry) => Promise<void>;
  syncWeight: (userId: string, weight: number, date: string) => Promise<void>;
  syncWorkout: (userId: string, session: WorkoutSession) => Promise<void>;
  syncPantry: (userId: string, item: Ingredient, action: 'add' | 'remove') => Promise<void>;
  performFullSync: (userId: string) => Promise<any>;
  forceSyncNow: () => Promise<void>;
}

export function useSync(): UseSyncResult {
  const [syncStatus, setSyncStatus] = useState<SyncState>(getSyncStatus());

  useEffect(() => {
    const unsubscribe = onSyncStatusChange((status) => {
      setSyncStatus(status);
    });
    return unsubscribe;
  }, []);

  const syncProfileWrapper = useCallback(
    async (userId: string, profile: Partial<UserProfile>) => {
      await syncProfile(userId, profile);
    },
    []
  );

  const syncMealWrapper = useCallback(
    async (userId: string, entry: MealPlanEntry) => {
      await syncMealLog(userId, entry);
    },
    []
  );

  const syncWeightWrapper = useCallback(
    async (userId: string, weight: number, date: string) => {
      await syncWeightLog(userId, weight, date);
    },
    []
  );

  const syncWorkoutWrapper = useCallback(
    async (userId: string, session: WorkoutSession) => {
      await syncWorkoutSession(userId, session);
    },
    []
  );

  const syncPantryWrapper = useCallback(
    async (userId: string, item: Ingredient, action: 'add' | 'remove') => {
      await syncPantryItem(userId, item, action);
    },
    []
  );

  const performFullSyncWrapper = useCallback(async (userId: string) => {
    return await performFullSync(userId);
  }, []);

  const forceSyncNow = useCallback(async () => {
    await processPendingChanges();
  }, []);

  return {
    syncStatus,
    syncProfile: syncProfileWrapper,
    syncMeal: syncMealWrapper,
    syncWeight: syncWeightWrapper,
    syncWorkout: syncWorkoutWrapper,
    syncPantry: syncPantryWrapper,
    performFullSync: performFullSyncWrapper,
    forceSyncNow,
  };
}

// ==========================================
// COMBINED CLOUD DATA HOOK
// ==========================================

interface CloudData {
  profile: UserProfile | null;
  mealLogs: MealPlanEntry[];
  workoutSessions: WorkoutSession[];
  pantryItems: Ingredient[];
  weightHistory: { date: string; weight: number }[];
}

interface UseCloudDataResult {
  data: CloudData;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useCloudData(userId: string | null): UseCloudDataResult {
  const [data, setData] = useState<CloudData>({
    profile: null,
    mealLogs: [],
    workoutSessions: [],
    pantryItems: [],
    weightHistory: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastFetchRef = useRef<number>(0);

  const fetchData = useCallback(async () => {
    if (!userId) return;

    // Debounce: don't fetch if last fetch was < 5 seconds ago
    const now = Date.now();
    if (now - lastFetchRef.current < 5000) return;
    lastFetchRef.current = now;

    setIsLoading(true);
    setError(null);

    try {
      const result = await performFullSync(userId);
      setData({
        profile: result.profile,
        mealLogs: result.mealLogs,
        workoutSessions: result.workoutSessions,
        pantryItems: result.pantryItems,
        weightHistory: result.weightHistory,
      });
    } catch (e) {
      console.error('Cloud data fetch error:', e);
      setError('Failed to sync data from cloud.');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchData();
    }
  }, [userId, fetchData]);

  return {
    data,
    isLoading,
    error,
    refresh: fetchData,
  };
}

// ==========================================
// OFFLINE INDICATOR HOOK
// ==========================================

export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

export default {
  useAuth,
  useSync,
  useCloudData,
  useOnlineStatus,
};

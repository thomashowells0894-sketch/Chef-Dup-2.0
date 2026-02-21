/**
 * useAdaptiveTDEE - React hook for the adaptive TDEE engine.
 *
 * Responsibilities:
 * 1. Fetch weight_history and food_logs from Supabase (last 90 days)
 * 2. Run the adaptive TDEE algorithm
 * 3. Return current estimate, trend chart data, and recommendations
 * 4. Auto-recalculate when new data arrives (via Supabase realtime or refetch)
 * 5. Cache results in AsyncStorage for instant startup
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../context/ProfileContext';
import {
  computeAdaptiveTDEE,
  lbsToKg,
  inchesToCm,
  type AdaptiveTDEEResult,
  type TDEEEstimate,
  type TDEETrendPoint,
  type TDEEInsight,
  type DailyWeightEntry,
  type DailyIntakeEntry,
  type UserBiometrics,
} from '../lib/adaptiveTDEE';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CACHE_KEY = '@fueliq_adaptive_tdee';
const CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours
const LOOKBACK_DAYS = 90;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UseAdaptiveTDEEReturn {
  /** The current TDEE estimate */
  estimate: TDEEEstimate | null;
  /** Trend data for charting (date, tdee, smoothedWeight, confidence) */
  trendData: TDEETrendPoint[];
  /** AI-generated insights */
  insights: TDEEInsight[];
  /** Number of days logged this week */
  daysLoggedThisWeek: number;
  /** Total days with paired weight + intake data */
  totalDaysWithData: number;
  /** Whether the engine is currently loading data */
  isLoading: boolean;
  /** Whether there was an error fetching data */
  error: string | null;
  /** Force a recalculation (e.g. after logging new data) */
  refresh: () => Promise<void>;
  /** Last time the estimate was computed */
  lastUpdated: string | null;
}

// ---------------------------------------------------------------------------
// Cache helpers
// ---------------------------------------------------------------------------

interface CachedTDEEResult {
  result: AdaptiveTDEEResult;
  timestamp: string;
}

async function loadFromCache(): Promise<CachedTDEEResult | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cached: CachedTDEEResult = JSON.parse(raw);
    // Check TTL
    const age = Date.now() - new Date(cached.timestamp).getTime();
    if (age > CACHE_TTL_MS) return null;
    return cached;
  } catch {
    return null;
  }
}

async function saveToCache(result: AdaptiveTDEEResult): Promise<void> {
  try {
    const cached: CachedTDEEResult = {
      result,
      timestamp: new Date().toISOString(),
    };
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cached));
  } catch {
    // Silent fail - cache is best-effort
  }
}

// ---------------------------------------------------------------------------
// Data fetching helpers
// ---------------------------------------------------------------------------

function getDateNDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

/**
 * Fetch weight history from Supabase.
 * Weights come from the profiles table (weight_history JSONB column)
 * and also from any dedicated weight_log entries.
 */
async function fetchWeightData(userId: string): Promise<DailyWeightEntry[]> {
  const startDate = getDateNDaysAgo(LOOKBACK_DAYS);
  const entries: DailyWeightEntry[] = [];
  const seenDates = new Set<string>();

  // Source 1: profile weight_history (stored as array of {date, weight} in lbs)
  try {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('weight_history, weight_unit')
      .eq('user_id', userId)
      .single();

    if (profileData?.weight_history && Array.isArray(profileData.weight_history)) {
      const isKg = profileData.weight_unit === 'kg';
      for (const entry of profileData.weight_history) {
        if (entry.date && entry.weight && entry.date >= startDate) {
          const weightKg = isKg ? entry.weight : lbsToKg(entry.weight);
          if (!seenDates.has(entry.date)) {
            entries.push({ date: entry.date, weight: weightKg });
            seenDates.add(entry.date);
          }
        }
      }
    }
  } catch {
    // Profile fetch failed, continue with other sources
  }

  // Source 2: weight_logs table (if it exists)
  try {
    const { data: weightLogs } = await supabase
      .from('weight_logs')
      .select('date, weight, unit')
      .eq('user_id', userId)
      .gte('date', startDate)
      .order('date', { ascending: true });

    if (weightLogs) {
      for (const log of weightLogs) {
        if (log.date && log.weight && !seenDates.has(log.date)) {
          const weightKg = log.unit === 'kg' ? log.weight : lbsToKg(log.weight);
          entries.push({ date: log.date, weight: weightKg });
          seenDates.add(log.date);
        }
      }
    }
  } catch {
    // Table may not exist, that's fine
  }

  return entries.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Fetch daily caloric intake from food_logs table.
 * Aggregates all food log entries by date.
 */
async function fetchIntakeData(userId: string): Promise<DailyIntakeEntry[]> {
  const startDate = getDateNDaysAgo(LOOKBACK_DAYS);

  try {
    const { data: foodLogs } = await supabase
      .from('food_logs')
      .select('date, calories, name')
      .eq('user_id', userId)
      .gte('date', startDate)
      .order('date', { ascending: true });

    if (!foodLogs || foodLogs.length === 0) return [];

    // Aggregate by date, excluding water entries
    const dailyMap = new Map<string, number>();
    for (const log of foodLogs) {
      if (!log.date || log.name === 'Water') continue;
      const current = dailyMap.get(log.date) || 0;
      dailyMap.set(log.date, current + (log.calories || 0));
    }

    const entries: DailyIntakeEntry[] = [];
    for (const [date, calories] of dailyMap) {
      // Only include days where the user actually logged meaningful calories
      if (calories > 200) {
        entries.push({ date, calories });
      }
    }

    return entries.sort((a, b) => a.date.localeCompare(b.date));
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAdaptiveTDEE(): UseAdaptiveTDEEReturn {
  const { user } = useAuth();
  const { profile, weightHistory, currentGoalType } = useProfile();

  const [result, setResult] = useState<AdaptiveTDEEResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Prevent concurrent fetches
  const isFetching = useRef(false);
  const hasInitialized = useRef(false);

  // Build biometrics from profile
  const biometrics = useMemo<UserBiometrics | null>(() => {
    if (!profile.weight || !profile.height || !profile.age) return null;

    return {
      weightKg: lbsToKg(profile.weight),
      heightCm: inchesToCm(profile.height),
      age: profile.age,
      gender: profile.gender === 'female' ? 'female' : 'male',
      activityLevel: profile.activityLevel || 'moderate',
      goalType: (currentGoalType as 'cut' | 'maintain' | 'bulk') || 'maintain',
      weeklyGoal: profile.weeklyGoal || 'maintain',
    };
  }, [profile.weight, profile.height, profile.age, profile.gender, profile.activityLevel, profile.weeklyGoal, currentGoalType]);

  // Core compute function
  const compute = useCallback(async () => {
    if (!user || !biometrics) {
      setIsLoading(false);
      return;
    }

    if (isFetching.current) return;
    isFetching.current = true;
    setIsLoading(true);
    setError(null);

    try {
      // Fetch data from Supabase in parallel
      const [weightEntries, intakeEntries] = await Promise.all([
        fetchWeightData(user.id),
        fetchIntakeData(user.id),
      ]);

      // Also incorporate local weight history from ProfileContext
      // (covers cases where Supabase fetch missed recent entries)
      const seenDates = new Set(weightEntries.map(w => w.date));
      const isKg = profile.weightUnit === 'kg';
      for (const entry of weightHistory) {
        if (entry.date && entry.weight && !seenDates.has(entry.date)) {
          const weightKg = isKg ? entry.weight : lbsToKg(entry.weight);
          weightEntries.push({ date: entry.date, weight: weightKg });
          seenDates.add(entry.date);
        }
      }
      weightEntries.sort((a, b) => a.date.localeCompare(b.date));

      // Run the adaptive algorithm
      const adaptiveResult = computeAdaptiveTDEE(weightEntries, intakeEntries, biometrics);

      setResult(adaptiveResult);
      setLastUpdated(new Date().toISOString());

      // Cache the result
      await saveToCache(adaptiveResult);
    } catch (err: any) {
      const msg = err?.message || 'Failed to compute adaptive TDEE';
      if (__DEV__) console.error('[AdaptiveTDEE] Error:', msg);
      setError(msg);
    } finally {
      setIsLoading(false);
      isFetching.current = false;
    }
  }, [user, biometrics, weightHistory, profile.weightUnit]);

  // Initialize: load cache first, then compute fresh data
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    (async () => {
      // Try cache first for instant display
      const cached = await loadFromCache();
      if (cached) {
        setResult(cached.result);
        setLastUpdated(cached.timestamp);
        setIsLoading(false);
      }

      // Then compute fresh data (will overwrite cache if newer)
      if (user && biometrics) {
        await compute();
      } else {
        setIsLoading(false);
      }
    })();
  }, [user, biometrics, compute]);

  // Re-compute when profile changes significantly
  const prevBiometricsRef = useRef<string | null>(null);
  useEffect(() => {
    if (!biometrics || !hasInitialized.current) return;

    const biometricsKey = JSON.stringify(biometrics);
    if (prevBiometricsRef.current && prevBiometricsRef.current !== biometricsKey) {
      compute();
    }
    prevBiometricsRef.current = biometricsKey;
  }, [biometrics, compute]);

  // Public refresh function
  const refresh = useCallback(async () => {
    hasInitialized.current = true; // Mark as initialized to prevent double init
    await compute();
  }, [compute]);

  return {
    estimate: result?.estimate ?? null,
    trendData: result?.trendData ?? [],
    insights: result?.insights ?? [],
    daysLoggedThisWeek: result?.daysLoggedThisWeek ?? 0,
    totalDaysWithData: result?.totalDaysWithData ?? 0,
    isLoading,
    error,
    refresh,
    lastUpdated,
  };
}

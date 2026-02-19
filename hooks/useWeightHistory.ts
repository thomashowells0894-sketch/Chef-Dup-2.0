import { useState, useEffect, useCallback, useMemo } from 'react';
import { useProfile } from '../context/ProfileContext';
import { isValidArray } from '../lib/validation';
import { getEncryptedItem, setEncryptedItem, removeEncryptedItem } from '../lib/encryptedStorage';
import type { WeightEntry } from '../types';

const STORAGE_KEY = '@vibefit_weight_history';
const GOAL_STORAGE_KEY = '@vibefit_weight_goal';
const MAX_ENTRIES = 365;

interface MonthlyTrendEntry {
  week: number;
  average: number | null;
  count: number;
}

interface TotalChange {
  change: number;
  direction: string;
  startWeight: number | null;
  currentWeight: number | null;
}

interface UseWeightHistoryReturn {
  entries: WeightEntry[];
  goal: number | null;
  addEntry: (weight: number | string, note?: string) => void;
  deleteEntry: (date: string) => void;
  setGoal: (targetWeight: number | null | undefined) => void;
  getWeeklyAverage: () => number | null;
  getMonthlyTrend: () => MonthlyTrendEntry[];
  getTotalChange: () => TotalChange;
  currentWeight: number | null;
  isLoading: boolean;
}

export function useWeightHistory(): UseWeightHistoryReturn {
  const [entries, setEntries] = useState<WeightEntry[]>([]);
  const [goal, setGoalState] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  let profileContext: { updateProfile?: (data: { weight: number }) => void } | null = null;
  try {
    profileContext = useProfile();
  } catch {
    // Profile context not available
  }

  // Load data from encrypted storage on mount
  useEffect(() => {
    async function load(): Promise<void> {
      try {
        const [parsed, parsedGoal] = await Promise.all([
          getEncryptedItem(STORAGE_KEY, []),
          getEncryptedItem(GOAL_STORAGE_KEY, null),
        ]);

        if (isValidArray(parsed)) {
          // Filter out malformed entries
          const valid = (parsed as WeightEntry[]).filter((e: unknown) =>
            e && typeof e === 'object' && typeof (e as WeightEntry).date === 'string' && typeof (e as WeightEntry).weight === 'number' && isFinite((e as WeightEntry).weight)
          ) as WeightEntry[];
          // Sort newest-first
          const sorted = valid.sort((a: WeightEntry, b: WeightEntry) => b.date.localeCompare(a.date));
          setEntries(sorted);
        }

        if (typeof parsedGoal === 'number' && isFinite(parsedGoal)) {
          setGoalState(parsedGoal);
        }
      } catch (error: any) {
        if (__DEV__) console.error('Failed to load weight history:', error.message);
      } finally {
        setIsLoading(false);
      }
    }

    load();
  }, []);

  // Auto-save entries when they change (encrypted)
  useEffect(() => {
    if (isLoading) return;
    setEncryptedItem(STORAGE_KEY, entries).catch((error: any) => {
      if (__DEV__) console.error('Failed to save weight history:', error.message);
    });
  }, [entries, isLoading]);

  // Auto-save goal when it changes (encrypted)
  useEffect(() => {
    if (isLoading) return;
    if (goal !== null) {
      setEncryptedItem(GOAL_STORAGE_KEY, goal).catch((error: any) => {
        if (__DEV__) console.error('Failed to save weight goal:', error.message);
      });
    } else {
      removeEncryptedItem(GOAL_STORAGE_KEY);
    }
  }, [goal, isLoading]);

  // Add a new weight entry
  const addEntry = useCallback((weight: number | string, note: string = ''): void => {
    const now = new Date();
    const date = now.toISOString();

    const newEntry: WeightEntry = {
      weight: parseFloat(weight as string),
      date,
      note: note || '',
    };

    setEntries((prev: WeightEntry[]) => {
      // Check if there's already an entry for today - replace it
      const todayStr = now.toISOString().split('T')[0];
      const filtered = prev.filter((e: WeightEntry) => {
        const entryDay = new Date(e.date).toISOString().split('T')[0];
        return entryDay !== todayStr;
      });

      const updated = [newEntry, ...filtered];
      // Sort newest-first and limit to MAX_ENTRIES
      return updated
        .sort((a: WeightEntry, b: WeightEntry) => b.date.localeCompare(a.date))
        .slice(0, MAX_ENTRIES);
    });

    // Sync to profile context if available
    if (profileContext && profileContext.updateProfile) {
      try {
        profileContext.updateProfile({ weight: parseFloat(weight as string) });
      } catch {
        // Silently fail if profile sync fails
      }
    }
  }, [profileContext]);

  // Delete an entry by date
  const deleteEntry = useCallback((date: string): void => {
    setEntries((prev: WeightEntry[]) => prev.filter((e: WeightEntry) => e.date !== date));
  }, []);

  // Set a target weight goal
  const setGoal = useCallback((targetWeight: number | null | undefined): void => {
    if (targetWeight === null || targetWeight === undefined) {
      setGoalState(null);
    } else {
      setGoalState(parseFloat(targetWeight as unknown as string));
    }
  }, []);

  // Get the average weight over the last 7 days
  const getWeeklyAverage = useCallback((): number | null => {
    if (entries.length === 0) return null;

    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const weekEntries = entries.filter((e: WeightEntry) => new Date(e.date) >= sevenDaysAgo);
    if (weekEntries.length === 0) return null;

    const sum = weekEntries.reduce((acc: number, e: WeightEntry) => acc + e.weight, 0);
    return Math.round((sum / weekEntries.length) * 10) / 10;
  }, [entries]);

  // Get monthly trend: weekly averages for the last 4 weeks
  const getMonthlyTrend = useCallback((): MonthlyTrendEntry[] => {
    if (entries.length === 0) return [];

    const now = new Date();
    const weeks: MonthlyTrendEntry[] = [];

    for (let w = 0; w < 4; w++) {
      const weekEnd = new Date(now);
      weekEnd.setDate(weekEnd.getDate() - (w * 7));
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 7);

      const weekEntries = entries.filter((e: WeightEntry) => {
        const entryDate = new Date(e.date);
        return entryDate >= weekStart && entryDate < weekEnd;
      });

      if (weekEntries.length > 0) {
        const avg = weekEntries.reduce((acc: number, e: WeightEntry) => acc + e.weight, 0) / weekEntries.length;
        weeks.unshift({
          week: 4 - w,
          average: Math.round(avg * 10) / 10,
          count: weekEntries.length,
        });
      } else {
        weeks.unshift({
          week: 4 - w,
          average: null,
          count: 0,
        });
      }
    }

    return weeks;
  }, [entries]);

  // Get total change from first entry to latest
  const getTotalChange = useCallback((): TotalChange => {
    if (entries.length < 2) {
      return {
        change: 0,
        direction: 'none',
        startWeight: entries.length > 0 ? entries[entries.length - 1].weight : null,
        currentWeight: entries.length > 0 ? entries[0].weight : null,
      };
    }

    // entries are sorted newest-first
    const currentWeight = entries[0].weight;
    const startWeight = entries[entries.length - 1].weight;
    const change = Math.round((currentWeight - startWeight) * 10) / 10;

    return {
      change: Math.abs(change),
      direction: change > 0 ? 'up' : change < 0 ? 'down' : 'none',
      startWeight,
      currentWeight,
    };
  }, [entries]);

  // Current weight (latest entry)
  const currentWeight = useMemo((): number | null => {
    if (entries.length === 0) return null;
    return entries[0].weight;
  }, [entries]);

  return {
    entries,
    goal,
    addEntry,
    deleteEntry,
    setGoal,
    getWeeklyAverage,
    getMonthlyTrend,
    getTotalChange,
    currentWeight,
    isLoading,
  };
}

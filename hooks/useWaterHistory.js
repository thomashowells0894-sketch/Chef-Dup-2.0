import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format, subDays } from 'date-fns';
import { safeJSONParse, isValidArray } from '../lib/validation';

const STORAGE_KEY = '@fueliq_water_history';

/**
 * useWaterHistory - AsyncStorage-based hook for tracking daily water history.
 *
 * Stores an array of { date, glasses, target } entries keyed by ISO date string.
 * Provides streak calculation and weekly chart data.
 */
export function useWaterHistory() {
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const historyRef = useRef(history);
  historyRef.current = history;

  // Load history from AsyncStorage on mount
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = safeJSONParse(stored, []);
          if (isValidArray(parsed)) {
            // Filter malformed entries and keep only the last 90 days
            const cutoff = format(subDays(new Date(), 90), 'yyyy-MM-dd');
            const valid = parsed.filter((entry) =>
              entry && typeof entry === 'object' && typeof entry.date === 'string' && entry.date >= cutoff
            );
            setHistory(valid);
            historyRef.current = valid;
          }
        }
      } catch (error) {
        if (__DEV__) console.error('[WaterHistory] Load failed:', error.message);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // Persist to AsyncStorage whenever history changes
  const persist = useCallback(async (newHistory) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
    } catch (error) {
      if (__DEV__) console.error('[WaterHistory] Save failed:', error.message);
    }
  }, []);

  /**
   * Get today's entry from history, or null if none exists.
   */
  const getTodayEntry = useCallback(() => {
    const todayKey = format(new Date(), 'yyyy-MM-dd');
    return historyRef.current.find((entry) => entry.date === todayKey) || null;
  }, []);

  /**
   * Record or update today's water intake in history.
   * @param {number} glasses - Number of glasses consumed today
   * @param {number} target - Daily target in glasses
   */
  const addToHistory = useCallback(
    async (glasses, target) => {
      const todayKey = format(new Date(), 'yyyy-MM-dd');
      let updated;

      const existingIndex = historyRef.current.findIndex(
        (entry) => entry.date === todayKey
      );

      if (existingIndex >= 0) {
        // Update existing entry
        updated = [...historyRef.current];
        updated[existingIndex] = { date: todayKey, glasses, target };
      } else {
        // Add new entry
        updated = [...historyRef.current, { date: todayKey, glasses, target }];
      }

      // Sort by date descending for easier access
      updated.sort((a, b) => b.date.localeCompare(a.date));

      setHistory(updated);
      historyRef.current = updated;
      await persist(updated);
    },
    [persist]
  );

  /**
   * Get weekly data for chart display.
   * Returns an array of 7 entries for the last 7 days (oldest first).
   * Each entry: { date, dayLabel, glasses, target, met }
   */
  const getWeeklyData = useCallback(() => {
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dateKey = format(date, 'yyyy-MM-dd');
      const dayLabel = format(date, 'EEE');
      const entry = historyRef.current.find((e) => e.date === dateKey);

      result.push({
        date: dateKey,
        dayLabel,
        glasses: entry ? entry.glasses : 0,
        target: entry ? entry.target : 0,
        met: entry ? entry.glasses >= entry.target : false,
      });
    }
    return result;
  }, []);

  /**
   * Calculate the current hydration streak.
   * Counts consecutive days (ending yesterday or today) where glasses >= target.
   * If today's goal is met, it counts. Otherwise, streak is counted up to yesterday.
   */
  const getStreak = useCallback(() => {
    if (historyRef.current.length === 0) return 0;

    let streak = 0;
    const today = new Date();

    // Check from today backwards
    for (let i = 0; i <= 90; i++) {
      const checkDate = subDays(today, i);
      const dateKey = format(checkDate, 'yyyy-MM-dd');
      const entry = historyRef.current.find((e) => e.date === dateKey);

      if (entry && entry.glasses >= entry.target && entry.target > 0) {
        streak++;
      } else if (i === 0) {
        // Today not yet met - that's OK, check from yesterday
        continue;
      } else {
        // Streak broken
        break;
      }
    }

    return streak;
  }, []);

  /**
   * Get history for the last N days.
   * @param {number} days - Number of days to retrieve (default 7)
   * @returns {Array} entries sorted oldest-first
   */
  const getRecentHistory = useCallback((days = 7) => {
    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dateKey = format(date, 'yyyy-MM-dd');
      const dayLabel = format(date, 'EEE');
      const fullLabel = format(date, 'MMM d');
      const entry = historyRef.current.find((e) => e.date === dateKey);

      result.push({
        date: dateKey,
        dayLabel,
        fullLabel,
        glasses: entry ? entry.glasses : 0,
        target: entry ? entry.target : 0,
        met: entry ? entry.glasses >= entry.target : false,
        isToday: i === 0,
      });
    }
    return result;
  }, []);

  return {
    history,
    isLoading,
    getTodayEntry,
    addToHistory,
    getWeeklyData,
    getStreak,
    getRecentHistory,
  };
}

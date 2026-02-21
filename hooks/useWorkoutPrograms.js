import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getProgramById, getTotalDays } from '../data/workoutPrograms';

const STORAGE_KEY = '@fueliq_active_program';

/**
 * Hook for managing active workout program progress.
 *
 * Progress shape stored in AsyncStorage:
 * {
 *   programId: string,
 *   startDate: string (ISO),
 *   currentWeek: number (1-based),
 *   currentDay: number (1-based),
 *   completedDays: {
 *     "1-1": { completedAt: string (ISO), exercises: [...] },
 *     "1-2": { ... },
 *     ...
 *   }
 * }
 */
export default function useWorkoutPrograms() {
  const [activeProgram, setActiveProgram] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load from storage on mount
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          // Validate the program still exists in our data
          const program = getProgramById(parsed.programId);
          if (program) {
            setActiveProgram(parsed);
          } else {
            // Program was removed from data, clean up
            await AsyncStorage.removeItem(STORAGE_KEY);
          }
        }
      } catch {
        // Silently fail - start fresh
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // Persist helper
  const persist = async (data) => {
    try {
      if (data) {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } else {
        await AsyncStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // Storage write failed - data still in memory
    }
  };

  /**
   * Start a new workout program. Resets any existing progress.
   * @param {string} programId
   */
  const startProgram = useCallback(async (programId) => {
    const program = getProgramById(programId);
    if (!program) return null;

    const progress = {
      programId,
      startDate: new Date().toISOString(),
      currentWeek: 1,
      currentDay: 1,
      completedDays: {},
    };

    setActiveProgram(progress);
    await persist(progress);
    return progress;
  }, []);

  /**
   * Mark a specific workout day as completed.
   * Automatically advances currentWeek/currentDay to the next uncompleted session.
   * @param {number} week - 1-based week number
   * @param {number} day - 1-based day number within the week
   * @param {Array} exercises - Optional: exercise completion data
   */
  const completeDay = useCallback(async (week, day, exercises = []) => {
    if (!activeProgram) return;

    const key = `${week}-${day}`;
    const program = getProgramById(activeProgram.programId);
    if (!program) return;

    const updatedCompleted = {
      ...activeProgram.completedDays,
      [key]: {
        completedAt: new Date().toISOString(),
        exercises,
      },
    };

    // Find next uncompleted day
    let nextWeek = week;
    let nextDay = day;
    let found = false;

    for (let w = week; w <= program.weeks.length; w++) {
      const weekData = program.weeks[w - 1];
      if (!weekData) continue;
      const startDay = w === week ? day + 1 : 1;
      for (let d = startDay; d <= weekData.days.length; d++) {
        const checkKey = `${w}-${d}`;
        if (!updatedCompleted[checkKey]) {
          nextWeek = w;
          nextDay = d;
          found = true;
          break;
        }
      }
      if (found) break;
    }

    // If nothing found ahead, program may be complete - keep current position
    if (!found) {
      nextWeek = week;
      nextDay = day;
    }

    const updated = {
      ...activeProgram,
      currentWeek: nextWeek,
      currentDay: nextDay,
      completedDays: updatedCompleted,
    };

    setActiveProgram(updated);
    await persist(updated);
    return updated;
  }, [activeProgram]);

  /**
   * Get progress summary.
   * @returns {{ completedCount: number, totalDays: number, percentage: number }}
   */
  const getProgress = useCallback(() => {
    if (!activeProgram) {
      return { completedCount: 0, totalDays: 0, percentage: 0 };
    }

    const program = getProgramById(activeProgram.programId);
    if (!program) {
      return { completedCount: 0, totalDays: 0, percentage: 0 };
    }

    const total = getTotalDays(program);
    const completed = Object.keys(activeProgram.completedDays).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      completedCount: completed,
      totalDays: total,
      percentage,
    };
  }, [activeProgram]);

  /**
   * Get the next workout to do (current week/day data from the program).
   * @returns {{ week: number, day: number, weekData: object, dayData: object } | null}
   */
  const getCurrentWorkout = useCallback(() => {
    if (!activeProgram) return null;

    const program = getProgramById(activeProgram.programId);
    if (!program) return null;

    const weekIndex = activeProgram.currentWeek - 1;
    const weekData = program.weeks[weekIndex];
    if (!weekData) return null;

    const dayIndex = activeProgram.currentDay - 1;
    const dayData = weekData.days[dayIndex];
    if (!dayData) return null;

    return {
      week: activeProgram.currentWeek,
      day: activeProgram.currentDay,
      weekData,
      dayData,
    };
  }, [activeProgram]);

  /**
   * Abandon the active program. Clears all progress.
   */
  const abandonProgram = useCallback(async () => {
    setActiveProgram(null);
    await persist(null);
  }, []);

  /**
   * Check whether a day has been completed.
   * @param {number} week
   * @param {number} day
   * @returns {boolean}
   */
  const isDayCompleted = useCallback((week, day) => {
    if (!activeProgram) return false;
    const key = `${week}-${day}`;
    return !!activeProgram.completedDays[key];
  }, [activeProgram]);

  /**
   * Check if the entire program is completed.
   * @returns {boolean}
   */
  const isProgramComplete = useCallback(() => {
    if (!activeProgram) return false;
    const program = getProgramById(activeProgram.programId);
    if (!program) return false;
    const total = getTotalDays(program);
    return Object.keys(activeProgram.completedDays).length >= total;
  }, [activeProgram]);

  /**
   * Check if a program is currently active.
   * @returns {boolean}
   */
  const isActive = useCallback(() => {
    return activeProgram !== null;
  }, [activeProgram]);

  return {
    activeProgram,
    isLoading,
    startProgram,
    completeDay,
    getProgress,
    getCurrentWorkout,
    abandonProgram,
    isDayCompleted,
    isProgramComplete,
    isActive,
  };
}

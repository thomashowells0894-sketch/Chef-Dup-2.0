import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { safeJSONParse, isValidArray } from '../lib/validation';

const STORAGE_KEY = '@vibefit_workout_history';
const MAX_ENTRIES = 200;

interface WorkoutSet {
  weight: number;
  reps: number;
}

interface WorkoutExerciseEntry {
  name: string;
  sets: WorkoutSet[];
}

interface WorkoutEntry {
  id: string;
  date: string;
  name: string;
  emoji: string;
  type: string;
  duration: number;
  calories: number;
  exercises: WorkoutExerciseEntry[];
  notes: string;
}

interface WorkoutInput {
  name?: string;
  emoji?: string;
  type?: string;
  duration?: number;
  calories?: number;
  exercises?: Array<{
    name: string;
    sets?: Array<{
      weight?: number;
      reps?: number;
    }>;
  }>;
  notes?: string;
}

interface WorkoutStats {
  totalWorkouts: number;
  totalDuration: number;
  totalCalories: number;
  favoriteType: string | null;
  thisWeekCount: number;
  thisMonthCount: number;
}

interface ExerciseHistoryEntry {
  date: string;
  workoutName: string;
  sets: WorkoutSet[];
}

interface UseWorkoutHistoryReturn {
  workouts: WorkoutEntry[];
  addWorkout: (workout: WorkoutInput) => Promise<WorkoutEntry>;
  deleteWorkout: (id: string) => Promise<void>;
  getWorkoutsByType: (type: string) => WorkoutEntry[];
  getStats: () => WorkoutStats;
  getExerciseHistory: (exerciseName: string) => ExerciseHistoryEntry[];
  isLoading: boolean;
}

export default function useWorkoutHistory(): UseWorkoutHistoryReturn {
  const [workouts, setWorkouts] = useState<WorkoutEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load workouts from storage on mount
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = safeJSONParse(stored, []);
          if (isValidArray(parsed)) setWorkouts(parsed as WorkoutEntry[]);
        }
      } catch {
        // Silently fail - start fresh
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // Persist helper
  const persist = async (updated: WorkoutEntry[]): Promise<void> => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Storage write failed - workouts are still in memory
    }
  };

  /**
   * Add a completed workout to history.
   * Generates an id and timestamp automatically.
   * Caps storage at MAX_ENTRIES (oldest removed first).
   */
  const addWorkout = useCallback(
    async (workout: WorkoutInput): Promise<WorkoutEntry> => {
      const entry: WorkoutEntry = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
        date: new Date().toISOString(),
        name: workout.name || 'Workout',
        emoji: workout.emoji || '\uD83D\uDCAA',
        type: workout.type || 'strength',
        duration: workout.duration || 0,
        calories: workout.calories || 0,
        exercises: (workout.exercises || []).map((ex) => ({
          name: ex.name,
          sets: (ex.sets || []).map((s) => ({
            weight: s.weight || 0,
            reps: s.reps || 0,
          })),
        })),
        notes: workout.notes || '',
      };

      const updated = [entry, ...workouts].slice(0, MAX_ENTRIES);
      setWorkouts(updated);
      await persist(updated);
      return entry;
    },
    [workouts]
  );

  /**
   * Delete a workout by id.
   */
  const deleteWorkout = useCallback(
    async (id: string): Promise<void> => {
      const updated = workouts.filter((w: WorkoutEntry) => w.id !== id);
      setWorkouts(updated);
      await persist(updated);
    },
    [workouts]
  );

  /**
   * Filter workouts by type.
   */
  const getWorkoutsByType = useCallback(
    (type: string): WorkoutEntry[] => {
      if (!type || type === 'all') return workouts;
      return workouts.filter(
        (w: WorkoutEntry) => w.type?.toLowerCase() === type.toLowerCase()
      );
    },
    [workouts]
  );

  /**
   * Compute aggregate stats from workout history.
   */
  const getStats = useCallback((): WorkoutStats => {
    const now = new Date();

    // Start of current week (Monday)
    const startOfWeek = new Date(now);
    const dayOfWeek = now.getDay();
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday = 0
    startOfWeek.setDate(now.getDate() - diff);
    startOfWeek.setHours(0, 0, 0, 0);

    // Start of current month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let totalDuration = 0;
    let totalCalories = 0;
    let thisWeekCount = 0;
    let thisMonthCount = 0;
    const typeCounts: Record<string, number> = {};

    workouts.forEach((w: WorkoutEntry) => {
      totalDuration += w.duration || 0;
      totalCalories += w.calories || 0;

      const wDate = new Date(w.date);
      if (wDate >= startOfWeek) thisWeekCount++;
      if (wDate >= startOfMonth) thisMonthCount++;

      const t = (w.type || 'other').toLowerCase();
      typeCounts[t] = (typeCounts[t] || 0) + 1;
    });

    // Find most common type
    let favoriteType: string | null = null;
    let maxCount = 0;
    Object.entries(typeCounts).forEach(([type, count]: [string, number]) => {
      if (count > maxCount) {
        maxCount = count;
        favoriteType = type;
      }
    });

    return {
      totalWorkouts: workouts.length,
      totalDuration,
      totalCalories,
      favoriteType,
      thisWeekCount,
      thisMonthCount,
    };
  }, [workouts]);

  /**
   * Get all sessions containing a specific exercise, with its sets data.
   */
  const getExerciseHistory = useCallback(
    (exerciseName: string): ExerciseHistoryEntry[] => {
      if (!exerciseName) return [];

      const lowerName = exerciseName.toLowerCase();
      const results: ExerciseHistoryEntry[] = [];

      workouts.forEach((w: WorkoutEntry) => {
        (w.exercises || []).forEach((ex: WorkoutExerciseEntry) => {
          if (ex.name?.toLowerCase() === lowerName) {
            results.push({
              date: w.date,
              workoutName: w.name,
              sets: ex.sets || [],
            });
          }
        });
      });

      return results;
    },
    [workouts]
  );

  return {
    workouts,
    addWorkout,
    deleteWorkout,
    getWorkoutsByType,
    getStats,
    getExerciseHistory,
    isLoading,
  };
}

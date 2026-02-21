/**
 * useWorkoutSession - Full state management for an active workout session.
 *
 * Tracks exercises, sets, rest state, elapsed time, PR detection,
 * auto-saves progress to AsyncStorage for crash recovery, and
 * persists completed workouts to Supabase + local history.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { calculate1RM, scoreWorkout } from '../lib/workoutEngine';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SetData {
  setNumber: number;
  weight: string;
  reps: string;
  rpe: number;
  completed: boolean;
  timestamp?: number;
}

export interface ExerciseSession {
  id: string;
  name: string;
  muscle_group?: string;
  sets: SetData[];
  targetSets: number;
  targetReps: string | number;
  rest: string | number;
  tips?: string;
  notes: string;
  isSuperset?: boolean;
  supersetGroup?: number;
  previousBest?: { weight: number; reps: number }[];
}

export interface WorkoutSessionState {
  id: string;
  name: string;
  emoji: string;
  type: string;
  exercises: ExerciseSession[];
  startedAt: number;
  elapsedSeconds: number;
  currentExerciseIndex: number;
  restTimerActive: boolean;
  restTimerSeconds: number;
  restTimerRemaining: number;
  defaultRestSeconds: number;
  isPaused: boolean;
  isCompleted: boolean;
}

export interface PRAlert {
  exerciseName: string;
  prType: 'weight' | 'reps' | 'volume';
  oldValue: number;
  newValue: number;
}

export interface WorkoutSummary {
  name: string;
  emoji: string;
  type: string;
  duration: number; // minutes
  totalVolume: number;
  totalSets: number;
  totalReps: number;
  exercisesCompleted: number;
  estimatedCalories: number;
  prs: PRAlert[];
  score: number;
  grade: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const AUTOSAVE_KEY = '@fueliq_active_workout';
const AUTOSAVE_INTERVAL = 10_000; // 10 seconds

// MET values for calorie estimation by workout type
const MET_VALUES: Record<string, number> = {
  strength: 6.0,
  hypertrophy: 5.5,
  hiit: 8.0,
  cardio: 7.0,
  yoga: 3.0,
  endurance: 5.0,
  flexibility: 2.5,
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

interface UseWorkoutSessionParams {
  workout: {
    title?: string;
    name?: string;
    emoji?: string;
    type?: string;
    main_set?: any[];
    exercises?: any[];
    duration?: number;
    estimated_calories?: number;
  } | null;
  previousHistory?: Record<string, { weight: number; reps: number }[]>;
  userWeightKg?: number;
}

export default function useWorkoutSession({
  workout,
  previousHistory = {},
  userWeightKg = 75,
}: UseWorkoutSessionParams) {
  // -----------------------------------------------------------------------
  // State
  // -----------------------------------------------------------------------
  const [session, setSession] = useState<WorkoutSessionState | null>(null);
  const [prs, setPrs] = useState<PRAlert[]>([]);
  const [summary, setSummary] = useState<WorkoutSummary | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autosaveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const restTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // -----------------------------------------------------------------------
  // Initialize session from workout data
  // -----------------------------------------------------------------------
  const initSession = useCallback(() => {
    if (!workout) return;

    const exercises: ExerciseSession[] = (
      workout.main_set || workout.exercises || []
    ).map((ex: any, idx: number) => {
      const targetSets = parseInt(String(ex.sets), 10) || 3;
      const prev = previousHistory[ex.name] || [];
      const initialSets: SetData[] = Array.from({ length: targetSets }, (_, i) => ({
        setNumber: i + 1,
        weight: prev[i]?.weight ? String(prev[i].weight) : '',
        reps: '',
        rpe: 7,
        completed: false,
      }));

      return {
        id: ex.id || `ex-${idx}`,
        name: ex.name || `Exercise ${idx + 1}`,
        muscle_group: ex.muscle_group || ex.muscleGroup || '',
        sets: initialSets,
        targetSets,
        targetReps: ex.reps || 10,
        rest: ex.rest || '90s',
        tips: ex.tips || '',
        notes: '',
        isSuperset: ex.isSuperset || false,
        supersetGroup: ex.supersetGroup,
        previousBest: prev,
      };
    });

    const newSession: WorkoutSessionState = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      name: workout.title || workout.name || 'Workout',
      emoji: workout.emoji || '',
      type: workout.type || 'strength',
      exercises,
      startedAt: Date.now(),
      elapsedSeconds: 0,
      currentExerciseIndex: 0,
      restTimerActive: false,
      restTimerSeconds: 90,
      restTimerRemaining: 0,
      defaultRestSeconds: 90,
      isPaused: false,
      isCompleted: false,
    };

    setSession(newSession);
    setPrs([]);
    setSummary(null);
  }, [workout, previousHistory]);

  // Auto-init when workout changes
  useEffect(() => {
    if (workout) initSession();
  }, [workout]);

  // -----------------------------------------------------------------------
  // Elapsed timer
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!session || session.isPaused || session.isCompleted) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setSession((prev) => {
        if (!prev || prev.isPaused || prev.isCompleted) return prev;
        return { ...prev, elapsedSeconds: prev.elapsedSeconds + 1 };
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [session?.isPaused, session?.isCompleted, session?.id]);

  // -----------------------------------------------------------------------
  // Auto-save to AsyncStorage
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!session || session.isCompleted) return;

    autosaveRef.current = setInterval(async () => {
      try {
        await AsyncStorage.setItem(AUTOSAVE_KEY, JSON.stringify(session));
      } catch {
        // silent
      }
    }, AUTOSAVE_INTERVAL);

    return () => {
      if (autosaveRef.current) clearInterval(autosaveRef.current);
    };
  }, [session]);

  // -----------------------------------------------------------------------
  // Recover from crash
  // -----------------------------------------------------------------------
  const recoverSession = useCallback(async (): Promise<boolean> => {
    try {
      const stored = await AsyncStorage.getItem(AUTOSAVE_KEY);
      if (!stored) return false;
      const recovered = JSON.parse(stored) as WorkoutSessionState;
      if (recovered && !recovered.isCompleted && recovered.startedAt) {
        // Recalculate elapsed time
        const elapsed = Math.floor((Date.now() - recovered.startedAt) / 1000);
        setSession({ ...recovered, elapsedSeconds: elapsed, isPaused: true });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  const clearRecovery = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(AUTOSAVE_KEY);
    } catch {
      // silent
    }
  }, []);

  // -----------------------------------------------------------------------
  // Set actions
  // -----------------------------------------------------------------------
  const updateSet = useCallback(
    (exerciseIndex: number, setIndex: number, field: keyof SetData, value: any) => {
      setSession((prev) => {
        if (!prev) return prev;
        const exercises = [...prev.exercises];
        const exercise = { ...exercises[exerciseIndex] };
        const sets = [...exercise.sets];
        sets[setIndex] = { ...sets[setIndex], [field]: value };
        exercise.sets = sets;
        exercises[exerciseIndex] = exercise;
        return { ...prev, exercises };
      });
    },
    []
  );

  const completeSet = useCallback(
    (exerciseIndex: number, setIndex: number) => {
      setSession((prev) => {
        if (!prev) return prev;
        const exercises = [...prev.exercises];
        const exercise = { ...exercises[exerciseIndex] };
        const sets = [...exercise.sets];
        sets[setIndex] = {
          ...sets[setIndex],
          completed: true,
          timestamp: Date.now(),
        };
        exercise.sets = sets;
        exercises[exerciseIndex] = exercise;
        return { ...prev, exercises };
      });
    },
    []
  );

  const addSet = useCallback((exerciseIndex: number) => {
    setSession((prev) => {
      if (!prev) return prev;
      const exercises = [...prev.exercises];
      const exercise = { ...exercises[exerciseIndex] };
      const newSetNumber = exercise.sets.length + 1;
      const lastSet = exercise.sets[exercise.sets.length - 1];
      exercise.sets = [
        ...exercise.sets,
        {
          setNumber: newSetNumber,
          weight: lastSet?.weight || '',
          reps: '',
          rpe: lastSet?.rpe || 7,
          completed: false,
        },
      ];
      exercises[exerciseIndex] = exercise;
      return { ...prev, exercises };
    });
  }, []);

  const removeSet = useCallback((exerciseIndex: number, setIndex: number) => {
    setSession((prev) => {
      if (!prev) return prev;
      const exercises = [...prev.exercises];
      const exercise = { ...exercises[exerciseIndex] };
      if (exercise.sets.length <= 1) return prev;
      exercise.sets = exercise.sets
        .filter((_, i) => i !== setIndex)
        .map((s, i) => ({ ...s, setNumber: i + 1 }));
      exercises[exerciseIndex] = exercise;
      return { ...prev, exercises };
    });
  }, []);

  const updateExerciseNotes = useCallback(
    (exerciseIndex: number, notes: string) => {
      setSession((prev) => {
        if (!prev) return prev;
        const exercises = [...prev.exercises];
        exercises[exerciseIndex] = { ...exercises[exerciseIndex], notes };
        return { ...prev, exercises };
      });
    },
    []
  );

  // -----------------------------------------------------------------------
  // Exercise swap
  // -----------------------------------------------------------------------
  const swapExercise = useCallback(
    (exerciseIndex: number, newExercise: { id: string; name: string; muscle_group?: string; tips?: string }) => {
      setSession((prev) => {
        if (!prev) return prev;
        const exercises = [...prev.exercises];
        const old = exercises[exerciseIndex];
        exercises[exerciseIndex] = {
          ...old,
          id: newExercise.id,
          name: newExercise.name,
          muscle_group: newExercise.muscle_group || old.muscle_group,
          tips: newExercise.tips || '',
          previousBest: [],
          notes: '',
          sets: old.sets.map((s) => ({
            ...s,
            weight: '',
            reps: '',
            completed: false,
          })),
        };
        return { ...prev, exercises };
      });
    },
    []
  );

  // -----------------------------------------------------------------------
  // Navigation
  // -----------------------------------------------------------------------
  const setCurrentExercise = useCallback((index: number) => {
    setSession((prev) => (prev ? { ...prev, currentExerciseIndex: index } : prev));
  }, []);

  const togglePause = useCallback(() => {
    setSession((prev) => (prev ? { ...prev, isPaused: !prev.isPaused } : prev));
  }, []);

  // -----------------------------------------------------------------------
  // Rest timer
  // -----------------------------------------------------------------------
  const startRestTimer = useCallback((seconds?: number) => {
    setSession((prev) => {
      if (!prev) return prev;
      const dur = seconds || prev.defaultRestSeconds;
      return {
        ...prev,
        restTimerActive: true,
        restTimerSeconds: dur,
        restTimerRemaining: dur,
      };
    });
  }, []);

  const skipRestTimer = useCallback(() => {
    setSession((prev) =>
      prev
        ? { ...prev, restTimerActive: false, restTimerRemaining: 0 }
        : prev
    );
  }, []);

  const extendRestTimer = useCallback((extraSeconds: number = 30) => {
    setSession((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        restTimerSeconds: prev.restTimerSeconds + extraSeconds,
        restTimerRemaining: prev.restTimerRemaining + extraSeconds,
      };
    });
  }, []);

  const setDefaultRest = useCallback((seconds: number) => {
    setSession((prev) => (prev ? { ...prev, defaultRestSeconds: seconds } : prev));
  }, []);

  // Tick the rest timer
  useEffect(() => {
    if (!session?.restTimerActive) {
      if (restTimerRef.current) clearInterval(restTimerRef.current);
      return;
    }

    restTimerRef.current = setInterval(() => {
      setSession((prev) => {
        if (!prev || !prev.restTimerActive) return prev;
        const next = prev.restTimerRemaining - 1;
        if (next <= 0) {
          return { ...prev, restTimerActive: false, restTimerRemaining: 0 };
        }
        return { ...prev, restTimerRemaining: next };
      });
    }, 1000);

    return () => {
      if (restTimerRef.current) clearInterval(restTimerRef.current);
    };
  }, [session?.restTimerActive]);

  // -----------------------------------------------------------------------
  // Calculations
  // -----------------------------------------------------------------------
  const totalVolume = useMemo(() => {
    if (!session) return 0;
    return session.exercises.reduce((sum, ex) => {
      return (
        sum +
        ex.sets
          .filter((s) => s.completed)
          .reduce(
            (setSum, s) =>
              setSum + (parseFloat(s.weight) || 0) * (parseInt(s.reps, 10) || 0),
            0
          )
      );
    }, 0);
  }, [session?.exercises]);

  const totalCompletedSets = useMemo(() => {
    if (!session) return 0;
    return session.exercises.reduce(
      (sum, ex) => sum + ex.sets.filter((s) => s.completed).length,
      0
    );
  }, [session?.exercises]);

  const totalCompletedReps = useMemo(() => {
    if (!session) return 0;
    return session.exercises.reduce(
      (sum, ex) =>
        sum +
        ex.sets
          .filter((s) => s.completed)
          .reduce((rSum, s) => rSum + (parseInt(s.reps, 10) || 0), 0),
      0
    );
  }, [session?.exercises]);

  const exercisesWithCompletedSets = useMemo(() => {
    if (!session) return 0;
    return session.exercises.filter((ex) => ex.sets.some((s) => s.completed)).length;
  }, [session?.exercises]);

  const estimatedCalories = useMemo(() => {
    if (!session) return 0;
    const met = MET_VALUES[session.type] || 5.5;
    const durationHours = session.elapsedSeconds / 3600;
    return Math.round(met * userWeightKg * durationHours);
  }, [session?.elapsedSeconds, session?.type, userWeightKg]);

  // -----------------------------------------------------------------------
  // PR detection
  // -----------------------------------------------------------------------
  const detectPRs = useCallback(
    (exerciseName: string, completedSets: { weight: number; reps: number }[]) => {
      const prev = previousHistory[exerciseName];
      if (!prev || prev.length === 0) return null;

      const maxPrevWeight = Math.max(...prev.map((s) => s.weight || 0));
      const maxPrevReps = Math.max(...prev.map((s) => s.reps || 0));
      const prevVolume = prev.reduce(
        (s, set) => s + (set.weight || 0) * (set.reps || 0),
        0
      );

      const maxWeight = Math.max(...completedSets.map((s) => s.weight || 0));
      const maxReps = Math.max(...completedSets.map((s) => s.reps || 0));
      const volume = completedSets.reduce(
        (s, set) => s + (set.weight || 0) * (set.reps || 0),
        0
      );

      if (maxWeight > maxPrevWeight && maxWeight > 0) {
        return {
          exerciseName,
          prType: 'weight' as const,
          oldValue: maxPrevWeight,
          newValue: maxWeight,
        };
      }
      if (maxReps > maxPrevReps && maxReps > 0) {
        return {
          exerciseName,
          prType: 'reps' as const,
          oldValue: maxPrevReps,
          newValue: maxReps,
        };
      }
      if (volume > prevVolume && volume > 0) {
        return {
          exerciseName,
          prType: 'volume' as const,
          oldValue: prevVolume,
          newValue: volume,
        };
      }

      return null;
    },
    [previousHistory]
  );

  // -----------------------------------------------------------------------
  // Complete workout
  // -----------------------------------------------------------------------
  const completeWorkout = useCallback(async (): Promise<WorkoutSummary | null> => {
    if (!session) return null;

    // Detect PRs for all exercises
    const allPrs: PRAlert[] = [];
    session.exercises.forEach((ex) => {
      const completed = ex.sets
        .filter((s) => s.completed && s.weight && s.reps)
        .map((s) => ({
          weight: parseFloat(s.weight) || 0,
          reps: parseInt(s.reps, 10) || 0,
        }));
      if (completed.length > 0) {
        const pr = detectPRs(ex.name, completed);
        if (pr) allPrs.push(pr);
      }
    });
    setPrs(allPrs);

    const durationMinutes = Math.round(session.elapsedSeconds / 60);
    const met = MET_VALUES[session.type] || 5.5;
    const cals = Math.round(met * userWeightKg * (session.elapsedSeconds / 3600));

    // Score the workout
    const workoutData = {
      duration: durationMinutes,
      exercises: session.exercises.map((ex) => ({
        sets: ex.sets.filter((s) => s.completed).length,
        rpe: Math.round(
          ex.sets
            .filter((s) => s.completed)
            .reduce((sum, s) => sum + s.rpe, 0) /
            Math.max(1, ex.sets.filter((s) => s.completed).length)
        ),
        muscle_group: ex.muscle_group,
      })),
      plannedExercises: session.exercises.length,
    };
    const { score, grade } = scoreWorkout(workoutData);

    const workoutSummary: WorkoutSummary = {
      name: session.name,
      emoji: session.emoji,
      type: session.type,
      duration: durationMinutes,
      totalVolume,
      totalSets: totalCompletedSets,
      totalReps: totalCompletedReps,
      exercisesCompleted: exercisesWithCompletedSets,
      estimatedCalories: cals,
      prs: allPrs,
      score,
      grade: grade || 'C',
    };

    setSummary(workoutSummary);

    // Mark session completed
    setSession((prev) => (prev ? { ...prev, isCompleted: true } : prev));

    // Clear autosave
    await clearRecovery();

    // Persist to Supabase
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        await supabase.from('workouts').insert({
          user_id: userData.user.id,
          name: session.name,
          type: session.type,
          duration: durationMinutes,
          calories: cals,
          total_volume: totalVolume,
          total_sets: totalCompletedSets,
          total_reps: totalCompletedReps,
          score,
          grade: grade || 'C',
          exercises: session.exercises.map((ex) => ({
            name: ex.name,
            muscle_group: ex.muscle_group,
            notes: ex.notes,
            sets: ex.sets
              .filter((s) => s.completed)
              .map((s) => ({
                weight: parseFloat(s.weight) || 0,
                reps: parseInt(s.reps, 10) || 0,
                rpe: s.rpe,
              })),
          })),
          prs: allPrs,
          completed_at: new Date().toISOString(),
        });
      }
    } catch {
      // Supabase save failed - data is still in local summary
    }

    return workoutSummary;
  }, [
    session,
    totalVolume,
    totalCompletedSets,
    totalCompletedReps,
    exercisesWithCompletedSets,
    detectPRs,
    userWeightKg,
    clearRecovery,
  ]);

  // -----------------------------------------------------------------------
  // Discard workout
  // -----------------------------------------------------------------------
  const discardWorkout = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (autosaveRef.current) clearInterval(autosaveRef.current);
    if (restTimerRef.current) clearInterval(restTimerRef.current);
    setSession(null);
    setSummary(null);
    setPrs([]);
    await clearRecovery();
  }, [clearRecovery]);

  // -----------------------------------------------------------------------
  // Increment/decrement weight
  // -----------------------------------------------------------------------
  const incrementWeight = useCallback(
    (exerciseIndex: number, setIndex: number, step: number = 2.5) => {
      setSession((prev) => {
        if (!prev) return prev;
        const exercises = [...prev.exercises];
        const exercise = { ...exercises[exerciseIndex] };
        const sets = [...exercise.sets];
        const current = parseFloat(sets[setIndex].weight) || 0;
        const newVal = Math.max(0, current + step);
        sets[setIndex] = { ...sets[setIndex], weight: String(newVal) };
        exercise.sets = sets;
        exercises[exerciseIndex] = exercise;
        return { ...prev, exercises };
      });
    },
    []
  );

  // -----------------------------------------------------------------------
  // Return
  // -----------------------------------------------------------------------
  return {
    session,
    prs,
    summary,
    // Computed
    totalVolume,
    totalCompletedSets,
    totalCompletedReps,
    exercisesWithCompletedSets,
    estimatedCalories,
    // Actions
    initSession,
    recoverSession,
    updateSet,
    completeSet,
    addSet,
    removeSet,
    updateExerciseNotes,
    swapExercise,
    setCurrentExercise,
    togglePause,
    startRestTimer,
    skipRestTimer,
    extendRestTimer,
    setDefaultRest,
    incrementWeight,
    completeWorkout,
    discardWorkout,
  };
}

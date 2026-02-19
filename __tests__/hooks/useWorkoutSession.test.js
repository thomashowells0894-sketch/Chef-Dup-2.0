/**
 * Tests for useWorkoutSession hook.
 *
 * Dependencies mocked:
 * - AsyncStorage (global mock in jest.setup.ts)
 * - lib/supabase (global mock in jest.setup.ts)
 * - lib/workoutEngine (calculate1RM, scoreWorkout)
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Mock workoutEngine ─────────────────────────────────────────────────────

jest.mock('../../lib/workoutEngine', () => ({
  calculate1RM: jest.fn((weight, reps) => {
    if (!weight || !reps) return null;
    return { estimated1RM: Math.round(weight * (1 + reps / 30)) };
  }),
  scoreWorkout: jest.fn(() => ({
    score: 72,
    grade: 'B',
    breakdown: { duration: 15, volume: 20, intensity: 17, variety: 9, completion: 15 },
  })),
}));

// ─── Import after mocks ────────────────────────────────────────────────────

import useWorkoutSession from '../../hooks/useWorkoutSession';

// ─── Test data ──────────────────────────────────────────────────────────────

const mockWorkout = {
  title: 'Push Day',
  emoji: '🏋️',
  type: 'strength',
  main_set: [
    { name: 'Bench Press', sets: '4', reps: '8', rest: '90s', muscle_group: 'chest' },
    { name: 'Overhead Press', sets: '3', reps: '10', rest: '60s', muscle_group: 'shoulders' },
    { name: 'Tricep Dips', sets: '3', reps: '12', rest: '60s', muscle_group: 'triceps' },
  ],
};

const mockPreviousHistory = {
  'Bench Press': [
    { weight: 80, reps: 8 },
    { weight: 80, reps: 7 },
    { weight: 75, reps: 8 },
    { weight: 75, reps: 8 },
  ],
};

// ─── Setup ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  (AsyncStorage.getItem).mockResolvedValue(null);
  (AsyncStorage.setItem).mockResolvedValue(undefined);
  (AsyncStorage.removeItem).mockResolvedValue(undefined);
});

afterEach(() => {
  jest.useRealTimers();
});

// =============================================================================
// Session initialization
// =============================================================================

describe('useWorkoutSession - initialization', () => {
  it('should initialize session from workout data', () => {
    const { result } = renderHook(() =>
      useWorkoutSession({ workout: mockWorkout })
    );

    expect(result.current.session).not.toBeNull();
    expect(result.current.session.name).toBe('Push Day');
    expect(result.current.session.emoji).toBe('🏋️');
    expect(result.current.session.type).toBe('strength');
    expect(result.current.session.exercises).toHaveLength(3);
  });

  it('should create correct number of sets per exercise', () => {
    const { result } = renderHook(() =>
      useWorkoutSession({ workout: mockWorkout })
    );

    expect(result.current.session.exercises[0].sets).toHaveLength(4); // 4 sets
    expect(result.current.session.exercises[1].sets).toHaveLength(3); // 3 sets
    expect(result.current.session.exercises[2].sets).toHaveLength(3); // 3 sets
  });

  it('should pre-fill weights from previous history', () => {
    const { result } = renderHook(() =>
      useWorkoutSession({
        workout: mockWorkout,
        previousHistory: mockPreviousHistory,
      })
    );

    const benchSets = result.current.session.exercises[0].sets;
    expect(benchSets[0].weight).toBe('80'); // From previous history
    expect(benchSets[1].weight).toBe('80');
    expect(benchSets[2].weight).toBe('75');
    expect(benchSets[3].weight).toBe('75');
  });

  it('should leave weights empty when no previous history', () => {
    const { result } = renderHook(() =>
      useWorkoutSession({ workout: mockWorkout })
    );

    const ohpSets = result.current.session.exercises[1].sets;
    ohpSets.forEach((set) => {
      expect(set.weight).toBe('');
    });
  });

  it('should start with all sets uncompleted', () => {
    const { result } = renderHook(() =>
      useWorkoutSession({ workout: mockWorkout })
    );

    result.current.session.exercises.forEach((ex) => {
      ex.sets.forEach((set) => {
        expect(set.completed).toBe(false);
      });
    });
  });

  it('should initialize session state correctly', () => {
    const { result } = renderHook(() =>
      useWorkoutSession({ workout: mockWorkout })
    );

    expect(result.current.session.currentExerciseIndex).toBe(0);
    expect(result.current.session.isPaused).toBe(false);
    expect(result.current.session.isCompleted).toBe(false);
    expect(result.current.session.restTimerActive).toBe(false);
    expect(result.current.session.elapsedSeconds).toBe(0);
  });

  it('should return null session when workout is null', () => {
    const { result } = renderHook(() =>
      useWorkoutSession({ workout: null })
    );

    expect(result.current.session).toBeNull();
  });

  it('should handle workout with exercises array instead of main_set', () => {
    const workout = {
      name: 'Custom',
      type: 'hypertrophy',
      exercises: [{ name: 'Squats', sets: '3', reps: '10' }],
    };

    const { result } = renderHook(() =>
      useWorkoutSession({ workout })
    );

    expect(result.current.session.exercises).toHaveLength(1);
    expect(result.current.session.exercises[0].name).toBe('Squats');
  });

  it('should default to 3 sets when sets is not parseable', () => {
    const workout = {
      name: 'Test',
      exercises: [{ name: 'Curls', sets: 'many', reps: '10' }],
    };

    const { result } = renderHook(() =>
      useWorkoutSession({ workout })
    );

    expect(result.current.session.exercises[0].sets).toHaveLength(3);
  });

  it('should generate unique session IDs', () => {
    const { result: result1 } = renderHook(() =>
      useWorkoutSession({ workout: mockWorkout })
    );
    const { result: result2 } = renderHook(() =>
      useWorkoutSession({ workout: mockWorkout })
    );

    expect(result1.current.session.id).not.toBe(result2.current.session.id);
  });
});

// =============================================================================
// Computed values
// =============================================================================

describe('useWorkoutSession - computed values', () => {
  it('should start with zero for all computed values', () => {
    const { result } = renderHook(() =>
      useWorkoutSession({ workout: mockWorkout })
    );

    expect(result.current.totalVolume).toBe(0);
    expect(result.current.totalCompletedSets).toBe(0);
    expect(result.current.totalCompletedReps).toBe(0);
    expect(result.current.exercisesWithCompletedSets).toBe(0);
  });

  it('should calculate totalVolume after completing sets', () => {
    const { result } = renderHook(() =>
      useWorkoutSession({ workout: mockWorkout })
    );

    // Set weight and reps for first set
    act(() => {
      result.current.updateSet(0, 0, 'weight', '100');
      result.current.updateSet(0, 0, 'reps', '8');
    });
    act(() => {
      result.current.completeSet(0, 0);
    });

    // Volume = 100 * 8 = 800
    expect(result.current.totalVolume).toBe(800);
    expect(result.current.totalCompletedSets).toBe(1);
    expect(result.current.totalCompletedReps).toBe(8);
    expect(result.current.exercisesWithCompletedSets).toBe(1);
  });

  it('should accumulate volume across exercises', () => {
    const { result } = renderHook(() =>
      useWorkoutSession({ workout: mockWorkout })
    );

    // Complete a set in exercise 0
    act(() => {
      result.current.updateSet(0, 0, 'weight', '80');
      result.current.updateSet(0, 0, 'reps', '8');
    });
    act(() => {
      result.current.completeSet(0, 0);
    });

    // Complete a set in exercise 1
    act(() => {
      result.current.updateSet(1, 0, 'weight', '40');
      result.current.updateSet(1, 0, 'reps', '10');
    });
    act(() => {
      result.current.completeSet(1, 0);
    });

    // Volume = (80*8) + (40*10) = 640 + 400 = 1040
    expect(result.current.totalVolume).toBe(1040);
    expect(result.current.totalCompletedSets).toBe(2);
    expect(result.current.exercisesWithCompletedSets).toBe(2);
  });

  it('should estimate calories from MET values', () => {
    const { result } = renderHook(() =>
      useWorkoutSession({ workout: mockWorkout, userWeightKg: 80 })
    );

    // estimatedCalories = MET * weight * hours
    // strength MET = 6.0, 0 seconds = 0 calories initially
    expect(result.current.estimatedCalories).toBe(0);

    // Advance timer by 1 hour (3600 seconds)
    act(() => {
      jest.advanceTimersByTime(3600 * 1000);
    });

    // After 1 hour: 6.0 * 80 * 1 = 480
    expect(result.current.estimatedCalories).toBe(480);
  });
});

// =============================================================================
// Set actions
// =============================================================================

describe('useWorkoutSession - set actions', () => {
  it('should update set field', () => {
    const { result } = renderHook(() =>
      useWorkoutSession({ workout: mockWorkout })
    );

    act(() => {
      result.current.updateSet(0, 0, 'weight', '100');
    });

    expect(result.current.session.exercises[0].sets[0].weight).toBe('100');
  });

  it('should complete a set with timestamp', () => {
    const { result } = renderHook(() =>
      useWorkoutSession({ workout: mockWorkout })
    );

    act(() => {
      result.current.completeSet(0, 0);
    });

    expect(result.current.session.exercises[0].sets[0].completed).toBe(true);
    expect(result.current.session.exercises[0].sets[0].timestamp).toBeDefined();
  });

  it('should add a set to an exercise', () => {
    const { result } = renderHook(() =>
      useWorkoutSession({ workout: mockWorkout })
    );

    const initialSets = result.current.session.exercises[0].sets.length;

    act(() => {
      result.current.addSet(0);
    });

    expect(result.current.session.exercises[0].sets.length).toBe(
      initialSets + 1
    );
    const newSet =
      result.current.session.exercises[0].sets[
        result.current.session.exercises[0].sets.length - 1
      ];
    expect(newSet.completed).toBe(false);
    expect(newSet.setNumber).toBe(initialSets + 1);
  });

  it('should copy weight from last set when adding a new set', () => {
    const { result } = renderHook(() =>
      useWorkoutSession({ workout: mockWorkout })
    );

    // Set weight on last set
    const lastIdx = result.current.session.exercises[0].sets.length - 1;
    act(() => {
      result.current.updateSet(0, lastIdx, 'weight', '85');
    });

    act(() => {
      result.current.addSet(0);
    });

    const newSet =
      result.current.session.exercises[0].sets[
        result.current.session.exercises[0].sets.length - 1
      ];
    expect(newSet.weight).toBe('85');
  });

  it('should remove a set and renumber remaining sets', () => {
    const { result } = renderHook(() =>
      useWorkoutSession({ workout: mockWorkout })
    );

    const initialCount = result.current.session.exercises[0].sets.length;

    act(() => {
      result.current.removeSet(0, 1); // Remove second set
    });

    expect(result.current.session.exercises[0].sets.length).toBe(
      initialCount - 1
    );

    // Check renumbering
    result.current.session.exercises[0].sets.forEach((set, i) => {
      expect(set.setNumber).toBe(i + 1);
    });
  });

  it('should not remove the last remaining set', () => {
    const workout = {
      name: 'Test',
      exercises: [{ name: 'Curls', sets: '1', reps: '10' }],
    };

    const { result } = renderHook(() =>
      useWorkoutSession({ workout })
    );

    expect(result.current.session.exercises[0].sets).toHaveLength(1);

    act(() => {
      result.current.removeSet(0, 0);
    });

    // Still has 1 set — cannot go below 1
    expect(result.current.session.exercises[0].sets).toHaveLength(1);
  });

  it('should update exercise notes', () => {
    const { result } = renderHook(() =>
      useWorkoutSession({ workout: mockWorkout })
    );

    act(() => {
      result.current.updateExerciseNotes(0, 'Felt strong today');
    });

    expect(result.current.session.exercises[0].notes).toBe(
      'Felt strong today'
    );
  });

  it('should increment weight by step', () => {
    const { result } = renderHook(() =>
      useWorkoutSession({ workout: mockWorkout })
    );

    act(() => {
      result.current.updateSet(0, 0, 'weight', '80');
    });

    act(() => {
      result.current.incrementWeight(0, 0, 2.5);
    });

    expect(result.current.session.exercises[0].sets[0].weight).toBe('82.5');
  });

  it('should not let weight go below 0', () => {
    const { result } = renderHook(() =>
      useWorkoutSession({ workout: mockWorkout })
    );

    act(() => {
      result.current.updateSet(0, 0, 'weight', '2');
    });

    act(() => {
      result.current.incrementWeight(0, 0, -5);
    });

    expect(parseFloat(result.current.session.exercises[0].sets[0].weight)).toBe(0);
  });
});

// =============================================================================
// Navigation and pause
// =============================================================================

describe('useWorkoutSession - navigation', () => {
  it('should change current exercise index', () => {
    const { result } = renderHook(() =>
      useWorkoutSession({ workout: mockWorkout })
    );

    act(() => {
      result.current.setCurrentExercise(2);
    });

    expect(result.current.session.currentExerciseIndex).toBe(2);
  });

  it('should toggle pause state', () => {
    const { result } = renderHook(() =>
      useWorkoutSession({ workout: mockWorkout })
    );

    expect(result.current.session.isPaused).toBe(false);

    act(() => {
      result.current.togglePause();
    });

    expect(result.current.session.isPaused).toBe(true);

    act(() => {
      result.current.togglePause();
    });

    expect(result.current.session.isPaused).toBe(false);
  });
});

// =============================================================================
// Exercise swap
// =============================================================================

describe('useWorkoutSession - exercise swap', () => {
  it('should swap an exercise and reset its sets', () => {
    const { result } = renderHook(() =>
      useWorkoutSession({
        workout: mockWorkout,
        previousHistory: mockPreviousHistory,
      })
    );

    // First exercise (Bench Press) has pre-filled weights
    expect(result.current.session.exercises[0].name).toBe('Bench Press');

    act(() => {
      result.current.swapExercise(0, {
        id: 'new-1',
        name: 'Incline Bench Press',
        muscle_group: 'chest',
        tips: 'Keep elbows at 45 degrees',
      });
    });

    const swapped = result.current.session.exercises[0];
    expect(swapped.name).toBe('Incline Bench Press');
    expect(swapped.id).toBe('new-1');
    expect(swapped.tips).toBe('Keep elbows at 45 degrees');
    expect(swapped.previousBest).toEqual([]);
    expect(swapped.notes).toBe('');

    // Sets should be cleared (weight/reps/completed)
    swapped.sets.forEach((set) => {
      expect(set.weight).toBe('');
      expect(set.reps).toBe('');
      expect(set.completed).toBe(false);
    });
  });
});

// =============================================================================
// Rest timer
// =============================================================================

describe('useWorkoutSession - rest timer', () => {
  it('should start rest timer with default seconds', () => {
    const { result } = renderHook(() =>
      useWorkoutSession({ workout: mockWorkout })
    );

    act(() => {
      result.current.startRestTimer();
    });

    expect(result.current.session.restTimerActive).toBe(true);
    expect(result.current.session.restTimerRemaining).toBe(90); // default
  });

  it('should start rest timer with custom seconds', () => {
    const { result } = renderHook(() =>
      useWorkoutSession({ workout: mockWorkout })
    );

    act(() => {
      result.current.startRestTimer(60);
    });

    expect(result.current.session.restTimerRemaining).toBe(60);
  });

  it('should skip rest timer', () => {
    const { result } = renderHook(() =>
      useWorkoutSession({ workout: mockWorkout })
    );

    act(() => {
      result.current.startRestTimer();
    });

    act(() => {
      result.current.skipRestTimer();
    });

    expect(result.current.session.restTimerActive).toBe(false);
    expect(result.current.session.restTimerRemaining).toBe(0);
  });

  it('should extend rest timer by specified seconds', () => {
    const { result } = renderHook(() =>
      useWorkoutSession({ workout: mockWorkout })
    );

    act(() => {
      result.current.startRestTimer(60);
    });

    act(() => {
      result.current.extendRestTimer(30);
    });

    expect(result.current.session.restTimerRemaining).toBe(90);
    expect(result.current.session.restTimerSeconds).toBe(90);
  });

  it('should set default rest time', () => {
    const { result } = renderHook(() =>
      useWorkoutSession({ workout: mockWorkout })
    );

    act(() => {
      result.current.setDefaultRest(120);
    });

    expect(result.current.session.defaultRestSeconds).toBe(120);
  });

  it('should countdown rest timer', () => {
    const { result } = renderHook(() =>
      useWorkoutSession({ workout: mockWorkout })
    );

    act(() => {
      result.current.startRestTimer(5);
    });

    act(() => {
      jest.advanceTimersByTime(3000); // 3 seconds
    });

    expect(result.current.session.restTimerRemaining).toBe(2);
  });

  it('should auto-stop rest timer when it reaches zero', () => {
    const { result } = renderHook(() =>
      useWorkoutSession({ workout: mockWorkout })
    );

    act(() => {
      result.current.startRestTimer(3);
    });

    act(() => {
      jest.advanceTimersByTime(4000); // More than 3 seconds
    });

    expect(result.current.session.restTimerActive).toBe(false);
    expect(result.current.session.restTimerRemaining).toBe(0);
  });
});

// =============================================================================
// PR detection
// =============================================================================

describe('useWorkoutSession - PR detection', () => {
  it('should detect weight PR', async () => {
    const { result } = renderHook(() =>
      useWorkoutSession({
        workout: mockWorkout,
        previousHistory: mockPreviousHistory,
      })
    );

    // Set a new weight PR for bench press: 85 kg (prev max was 80)
    act(() => {
      result.current.updateSet(0, 0, 'weight', '85');
      result.current.updateSet(0, 0, 'reps', '8');
    });
    act(() => {
      result.current.completeSet(0, 0);
    });

    const summary = await act(async () => {
      return await result.current.completeWorkout();
    });

    expect(result.current.prs.length).toBeGreaterThan(0);
    expect(result.current.prs[0].prType).toBe('weight');
    expect(result.current.prs[0].newValue).toBe(85);
    expect(result.current.prs[0].oldValue).toBe(80);
  });

  it('should detect reps PR when weight is the same', async () => {
    const { result } = renderHook(() =>
      useWorkoutSession({
        workout: mockWorkout,
        previousHistory: mockPreviousHistory,
      })
    );

    // Same max weight (80) but more reps (9 vs 8)
    act(() => {
      result.current.updateSet(0, 0, 'weight', '80');
      result.current.updateSet(0, 0, 'reps', '9');
    });
    act(() => {
      result.current.completeSet(0, 0);
    });

    await act(async () => {
      await result.current.completeWorkout();
    });

    expect(result.current.prs.length).toBeGreaterThan(0);
    expect(result.current.prs[0].prType).toBe('reps');
    expect(result.current.prs[0].newValue).toBe(9);
  });

  it('should not detect PR for exercise without history', async () => {
    const { result } = renderHook(() =>
      useWorkoutSession({
        workout: mockWorkout,
        previousHistory: {}, // No history
      })
    );

    act(() => {
      result.current.updateSet(0, 0, 'weight', '100');
      result.current.updateSet(0, 0, 'reps', '8');
    });
    act(() => {
      result.current.completeSet(0, 0);
    });

    await act(async () => {
      await result.current.completeWorkout();
    });

    expect(result.current.prs).toHaveLength(0);
  });
});

// =============================================================================
// Workout completion
// =============================================================================

describe('useWorkoutSession - completeWorkout', () => {
  it('should return a summary with all expected fields', async () => {
    const { result } = renderHook(() =>
      useWorkoutSession({ workout: mockWorkout, userWeightKg: 75 })
    );

    // Complete at least one set
    act(() => {
      result.current.updateSet(0, 0, 'weight', '80');
      result.current.updateSet(0, 0, 'reps', '8');
    });
    act(() => {
      result.current.completeSet(0, 0);
    });

    let summary;
    await act(async () => {
      summary = await result.current.completeWorkout();
    });

    expect(summary).not.toBeNull();
    expect(summary.name).toBe('Push Day');
    expect(summary.type).toBe('strength');
    expect(summary.totalVolume).toBeGreaterThan(0);
    expect(summary.totalSets).toBe(1);
    expect(summary.exercisesCompleted).toBe(1);
    expect(summary.score).toBe(72);
    expect(summary.grade).toBe('B');
    expect(summary.prs).toBeDefined();
  });

  it('should mark session as completed', async () => {
    const { result } = renderHook(() =>
      useWorkoutSession({ workout: mockWorkout })
    );

    await act(async () => {
      await result.current.completeWorkout();
    });

    expect(result.current.session.isCompleted).toBe(true);
  });

  it('should clear autosave on completion', async () => {
    const { result } = renderHook(() =>
      useWorkoutSession({ workout: mockWorkout })
    );

    await act(async () => {
      await result.current.completeWorkout();
    });

    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(
      '@vibefit_active_workout'
    );
  });

  it('should return null when session is null', async () => {
    const { result } = renderHook(() =>
      useWorkoutSession({ workout: null })
    );

    let summary;
    await act(async () => {
      summary = await result.current.completeWorkout();
    });

    expect(summary).toBeNull();
  });

  it('should use default grade C when scoreWorkout returns no grade', async () => {
    const { scoreWorkout } = require('../../lib/workoutEngine');
    scoreWorkout.mockReturnValueOnce({ score: 50, grade: null });

    const { result } = renderHook(() =>
      useWorkoutSession({ workout: mockWorkout })
    );

    let summary;
    await act(async () => {
      summary = await result.current.completeWorkout();
    });

    expect(summary.grade).toBe('C');
  });
});

// =============================================================================
// Session recovery
// =============================================================================

describe('useWorkoutSession - crash recovery', () => {
  it('should recover a saved session from AsyncStorage', async () => {
    const savedSession = {
      id: 'test-session',
      name: 'Recovered Workout',
      type: 'strength',
      exercises: [],
      startedAt: Date.now() - 600000, // 10 minutes ago
      elapsedSeconds: 300,
      currentExerciseIndex: 0,
      restTimerActive: false,
      restTimerSeconds: 90,
      restTimerRemaining: 0,
      defaultRestSeconds: 90,
      isPaused: false,
      isCompleted: false,
    };
    (AsyncStorage.getItem).mockResolvedValue(JSON.stringify(savedSession));

    const { result } = renderHook(() =>
      useWorkoutSession({ workout: null })
    );

    let recovered;
    await act(async () => {
      recovered = await result.current.recoverSession();
    });

    expect(recovered).toBe(true);
    expect(result.current.session).not.toBeNull();
    expect(result.current.session.name).toBe('Recovered Workout');
    expect(result.current.session.isPaused).toBe(true); // Recovered sessions start paused
  });

  it('should return false when no saved session exists', async () => {
    const { result } = renderHook(() =>
      useWorkoutSession({ workout: null })
    );

    let recovered;
    await act(async () => {
      recovered = await result.current.recoverSession();
    });

    expect(recovered).toBe(false);
  });

  it('should not recover completed sessions', async () => {
    const savedSession = {
      id: 'test-session',
      name: 'Done Workout',
      startedAt: Date.now() - 600000,
      isCompleted: true,
    };
    (AsyncStorage.getItem).mockResolvedValue(JSON.stringify(savedSession));

    const { result } = renderHook(() =>
      useWorkoutSession({ workout: null })
    );

    let recovered;
    await act(async () => {
      recovered = await result.current.recoverSession();
    });

    expect(recovered).toBe(false);
  });
});

// =============================================================================
// Discard workout
// =============================================================================

describe('useWorkoutSession - discardWorkout', () => {
  it('should clear session, summary, and PRs', async () => {
    const { result } = renderHook(() =>
      useWorkoutSession({ workout: mockWorkout })
    );

    expect(result.current.session).not.toBeNull();

    await act(async () => {
      await result.current.discardWorkout();
    });

    expect(result.current.session).toBeNull();
    expect(result.current.summary).toBeNull();
    expect(result.current.prs).toEqual([]);
  });

  it('should clear autosave data', async () => {
    const { result } = renderHook(() =>
      useWorkoutSession({ workout: mockWorkout })
    );

    await act(async () => {
      await result.current.discardWorkout();
    });

    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(
      '@vibefit_active_workout'
    );
  });
});

// =============================================================================
// Elapsed timer
// =============================================================================

describe('useWorkoutSession - elapsed timer', () => {
  it('should increment elapsed seconds over time', () => {
    const { result } = renderHook(() =>
      useWorkoutSession({ workout: mockWorkout })
    );

    expect(result.current.session.elapsedSeconds).toBe(0);

    act(() => {
      jest.advanceTimersByTime(5000); // 5 seconds
    });

    expect(result.current.session.elapsedSeconds).toBe(5);
  });

  it('should stop timer when paused', () => {
    const { result } = renderHook(() =>
      useWorkoutSession({ workout: mockWorkout })
    );

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(result.current.session.elapsedSeconds).toBe(3);

    act(() => {
      result.current.togglePause();
    });

    act(() => {
      jest.advanceTimersByTime(5000); // Should not count
    });

    expect(result.current.session.elapsedSeconds).toBe(3); // Still 3
  });
});

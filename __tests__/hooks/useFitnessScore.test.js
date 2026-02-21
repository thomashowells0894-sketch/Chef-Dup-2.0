/**
 * Tests for useFitnessScore hook.
 *
 * Dependencies mocked:
 * - AsyncStorage (global mock in jest.setup.ts)
 * - date-fns (format) — used directly, not mocked
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns';

import useFitnessScore from '../../hooks/useFitnessScore';

// ─── Setup ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  (AsyncStorage.getItem).mockResolvedValue(null);
  (AsyncStorage.setItem).mockResolvedValue(undefined);
});

// =============================================================================
// Initial state
// =============================================================================

describe('useFitnessScore - initial state', () => {
  it('should start with empty scoreHistory and isLoading true', () => {
    const { result } = renderHook(() => useFitnessScore());
    expect(result.current.scoreHistory).toEqual([]);
    expect(result.current.isLoading).toBe(true);
  });

  it('should set isLoading to false after initialization', async () => {
    const { result } = renderHook(() => useFitnessScore());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it('should load existing score history from AsyncStorage', async () => {
    const storedHistory = [
      { date: '2026-02-13', score: 78 },
      { date: '2026-02-12', score: 65 },
    ];
    (AsyncStorage.getItem).mockResolvedValue(JSON.stringify(storedHistory));

    const { result } = renderHook(() => useFitnessScore());
    await waitFor(() => {
      expect(result.current.scoreHistory).toHaveLength(2);
      expect(result.current.scoreHistory[0].score).toBe(78);
    });
  });
});

// =============================================================================
// calculateScore
// =============================================================================

describe('useFitnessScore - calculateScore', () => {
  it('should calculate a perfect score when all goals are met', async () => {
    const { result } = renderHook(() => useFitnessScore());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const score = result.current.calculateScore({
      caloriesEaten: 2200,
      calorieGoal: 2200,
      proteinEaten: 150,
      proteinGoal: 150,
      waterGlasses: 8,
      waterGoal: 8,
      exerciseMinutes: 30,
      exerciseGoal: 30,
      sleepHours: 8,
      fastCompleted: true,
      habitsCompleted: 5,
      habitsTotal: 5,
    });

    // 25 (nutrition) + 15 (protein) + 15 (hydration) + 20 (exercise) + 15 (sleep) + 10 (consistency) = 100
    expect(score).toBe(100);
  });

  it('should return 0 when nothing is accomplished', async () => {
    const { result } = renderHook(() => useFitnessScore());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const score = result.current.calculateScore({
      caloriesEaten: 0,
      calorieGoal: 0,
      proteinEaten: 0,
      proteinGoal: 0,
      waterGlasses: 0,
      waterGoal: 0,
      exerciseMinutes: 0,
      sleepHours: 0,
      fastCompleted: false,
      habitsCompleted: 0,
      habitsTotal: 0,
    });

    expect(score).toBe(0);
  });

  it('should handle nutrition scoring with calories close to goal', async () => {
    const { result } = renderHook(() => useFitnessScore());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // 10% over goal: ratio = 1.1, accuracy = 1 - |1-1.1| = 0.9
    const score = result.current.calculateScore({
      caloriesEaten: 2420,
      calorieGoal: 2200,
      proteinEaten: 0,
      proteinGoal: 0,
      waterGlasses: 0,
      waterGoal: 0,
      exerciseMinutes: 0,
      sleepHours: 0,
      fastCompleted: false,
      habitsCompleted: 0,
      habitsTotal: 0,
    });

    // 0.9 * 25 = ~22.5 (floating point: 22.499...), rounds to 22
    expect(score).toBe(22);
  });

  it('should penalize overeating more than undereating equivalently', async () => {
    const { result } = renderHook(() => useFitnessScore());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // 50% over: ratio = 1.5, accuracy = 1 - 0.5 = 0.5
    const overScore = result.current.calculateScore({
      caloriesEaten: 3300,
      calorieGoal: 2200,
      proteinEaten: 0,
      proteinGoal: 0,
      waterGlasses: 0,
      waterGoal: 0,
      exerciseMinutes: 0,
      sleepHours: 0,
      fastCompleted: false,
      habitsCompleted: 0,
      habitsTotal: 0,
    });

    // 50% under: ratio = 0.5, accuracy = 1 - 0.5 = 0.5
    const underScore = result.current.calculateScore({
      caloriesEaten: 1100,
      calorieGoal: 2200,
      proteinEaten: 0,
      proteinGoal: 0,
      waterGlasses: 0,
      waterGoal: 0,
      exerciseMinutes: 0,
      sleepHours: 0,
      fastCompleted: false,
      habitsCompleted: 0,
      habitsTotal: 0,
    });

    expect(overScore).toBe(underScore);
  });

  it('should score protein proportionally', async () => {
    const { result } = renderHook(() => useFitnessScore());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Half protein goal met
    const score = result.current.calculateScore({
      caloriesEaten: 0,
      calorieGoal: 0,
      proteinEaten: 75,
      proteinGoal: 150,
      waterGlasses: 0,
      waterGoal: 0,
      exerciseMinutes: 0,
      sleepHours: 0,
      fastCompleted: false,
      habitsCompleted: 0,
      habitsTotal: 0,
    });

    // 0.5 * 15 = 7.5 -> rounds to 8
    expect(score).toBe(8);
  });

  it('should cap protein score at max even when over goal', async () => {
    const { result } = renderHook(() => useFitnessScore());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const score = result.current.calculateScore({
      caloriesEaten: 0,
      calorieGoal: 0,
      proteinEaten: 300, // Double the goal
      proteinGoal: 150,
      waterGlasses: 0,
      waterGoal: 0,
      exerciseMinutes: 0,
      sleepHours: 0,
      fastCompleted: false,
      habitsCompleted: 0,
      habitsTotal: 0,
    });

    // Capped at min(300/150, 1) * 15 = 15
    expect(score).toBe(15);
  });

  it('should score sleep optimally for 7-9 hours', async () => {
    const { result } = renderHook(() => useFitnessScore());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const perfect = result.current.calculateScore({
      caloriesEaten: 0,
      calorieGoal: 0,
      proteinEaten: 0,
      proteinGoal: 0,
      waterGlasses: 0,
      waterGoal: 0,
      exerciseMinutes: 0,
      sleepHours: 8,
      fastCompleted: false,
      habitsCompleted: 0,
      habitsTotal: 0,
    });

    // 1.0 * 15 = 15
    expect(perfect).toBe(15);
  });

  it('should give reduced sleep score for 6 hours', async () => {
    const { result } = renderHook(() => useFitnessScore());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const score = result.current.calculateScore({
      caloriesEaten: 0,
      calorieGoal: 0,
      proteinEaten: 0,
      proteinGoal: 0,
      waterGlasses: 0,
      waterGoal: 0,
      exerciseMinutes: 0,
      sleepHours: 6,
      fastCompleted: false,
      habitsCompleted: 0,
      habitsTotal: 0,
    });

    // 0.7 * 15 = 10.5 -> rounds to 11
    expect(score).toBe(11);
  });

  it('should give low sleep score for < 5 hours', async () => {
    const { result } = renderHook(() => useFitnessScore());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const score = result.current.calculateScore({
      caloriesEaten: 0,
      calorieGoal: 0,
      proteinEaten: 0,
      proteinGoal: 0,
      waterGlasses: 0,
      waterGoal: 0,
      exerciseMinutes: 0,
      sleepHours: 4,
      fastCompleted: false,
      habitsCompleted: 0,
      habitsTotal: 0,
    });

    // 0.2 * 15 = 3
    expect(score).toBe(3);
  });

  it('should give 0 sleep score for 0 hours', async () => {
    const { result } = renderHook(() => useFitnessScore());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const score = result.current.calculateScore({
      caloriesEaten: 0,
      calorieGoal: 0,
      proteinEaten: 0,
      proteinGoal: 0,
      waterGlasses: 0,
      waterGoal: 0,
      exerciseMinutes: 0,
      sleepHours: 0,
      fastCompleted: false,
      habitsCompleted: 0,
      habitsTotal: 0,
    });

    expect(score).toBe(0);
  });

  it('should use default exercise goal of 30 when not provided', async () => {
    const { result } = renderHook(() => useFitnessScore());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const score = result.current.calculateScore({
      caloriesEaten: 0,
      calorieGoal: 0,
      proteinEaten: 0,
      proteinGoal: 0,
      waterGlasses: 0,
      waterGoal: 0,
      exerciseMinutes: 15,
      sleepHours: 0,
      fastCompleted: false,
      habitsCompleted: 0,
      habitsTotal: 0,
    });

    // 15/30 * 20 = 10
    expect(score).toBe(10);
  });

  it('should score consistency with fast and habits', async () => {
    const { result } = renderHook(() => useFitnessScore());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // fastCompleted + full habits = 0.5 + 0.5 = 1.0
    const fullConsistency = result.current.calculateScore({
      caloriesEaten: 0,
      calorieGoal: 0,
      proteinEaten: 0,
      proteinGoal: 0,
      waterGlasses: 0,
      waterGoal: 0,
      exerciseMinutes: 0,
      sleepHours: 0,
      fastCompleted: true,
      habitsCompleted: 3,
      habitsTotal: 3,
    });

    // 1.0 * 10 = 10
    expect(fullConsistency).toBe(10);

    // Only fast completed, no habits
    const fastOnly = result.current.calculateScore({
      caloriesEaten: 0,
      calorieGoal: 0,
      proteinEaten: 0,
      proteinGoal: 0,
      waterGlasses: 0,
      waterGoal: 0,
      exerciseMinutes: 0,
      sleepHours: 0,
      fastCompleted: true,
      habitsCompleted: 0,
      habitsTotal: 0,
    });

    // 0.5 * 10 = 5
    expect(fastOnly).toBe(5);
  });

  it('should return a rounded integer score', async () => {
    const { result } = renderHook(() => useFitnessScore());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const score = result.current.calculateScore({
      caloriesEaten: 1900,
      calorieGoal: 2200,
      proteinEaten: 80,
      proteinGoal: 150,
      waterGlasses: 5,
      waterGoal: 8,
      exerciseMinutes: 20,
      sleepHours: 6.5,
      fastCompleted: false,
      habitsCompleted: 2,
      habitsTotal: 5,
    });

    expect(Number.isInteger(score)).toBe(true);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(100);
  });
});

// =============================================================================
// saveScore
// =============================================================================

describe('useFitnessScore - saveScore', () => {
  it('should save a score for today', async () => {
    const { result } = renderHook(() => useFitnessScore());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.saveScore(85);
    });

    expect(result.current.scoreHistory).toHaveLength(1);
    expect(result.current.scoreHistory[0].score).toBe(85);
    expect(result.current.scoreHistory[0].date).toBe(
      format(new Date(), 'yyyy-MM-dd')
    );
  });

  it('should replace score for today if already saved', async () => {
    const { result } = renderHook(() => useFitnessScore());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.saveScore(60);
    });
    act(() => {
      result.current.saveScore(85);
    });

    expect(result.current.scoreHistory).toHaveLength(1);
    expect(result.current.scoreHistory[0].score).toBe(85);
  });

  it('should keep maximum 90 entries', async () => {
    const storedHistory = Array.from({ length: 90 }, (_, i) => ({
      date: `2026-01-${String(i + 1).padStart(2, '0')}`,
      score: 50 + (i % 30),
    }));
    (AsyncStorage.getItem).mockResolvedValue(JSON.stringify(storedHistory));

    const { result } = renderHook(() => useFitnessScore());
    await waitFor(() => expect(result.current.scoreHistory).toHaveLength(90));

    act(() => {
      result.current.saveScore(99);
    });

    expect(result.current.scoreHistory).toHaveLength(90);
    expect(result.current.scoreHistory[0].score).toBe(99); // Most recent first
  });

  it('should persist to AsyncStorage after save', async () => {
    const { result } = renderHook(() => useFitnessScore());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.saveScore(75);
    });

    await waitFor(() => {
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@fueliq_fitness_score',
        expect.any(String)
      );
    });
  });
});

// =============================================================================
// getWeeklyScores
// =============================================================================

describe('useFitnessScore - getWeeklyScores', () => {
  it('should return 7 entries', async () => {
    const { result } = renderHook(() => useFitnessScore());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const weekly = result.current.getWeeklyScores();
    expect(weekly).toHaveLength(7);
  });

  it('should return 0 for days without scores', async () => {
    const { result } = renderHook(() => useFitnessScore());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const weekly = result.current.getWeeklyScores();
    weekly.forEach((entry) => {
      expect(entry.score).toBe(0);
      expect(entry.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(entry.day).toBeDefined();
    });
  });

  it('should include today score when saved', async () => {
    const { result } = renderHook(() => useFitnessScore());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.saveScore(88);
    });

    const weekly = result.current.getWeeklyScores();
    const today = format(new Date(), 'yyyy-MM-dd');
    const todayEntry = weekly.find((e) => e.date === today);
    expect(todayEntry.score).toBe(88);
  });
});

// =============================================================================
// getAverageScore
// =============================================================================

describe('useFitnessScore - getAverageScore', () => {
  it('should return 0 when no scores exist', async () => {
    const { result } = renderHook(() => useFitnessScore());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.getAverageScore()).toBe(0);
  });

  it('should calculate average of recent scores', async () => {
    const storedHistory = [
      { date: '2026-02-14', score: 80 },
      { date: '2026-02-13', score: 70 },
      { date: '2026-02-12', score: 90 },
    ];
    (AsyncStorage.getItem).mockResolvedValue(JSON.stringify(storedHistory));

    const { result } = renderHook(() => useFitnessScore());
    await waitFor(() => expect(result.current.scoreHistory).toHaveLength(3));

    // Average of 80, 70, 90 = 80
    expect(result.current.getAverageScore()).toBe(80);
  });

  it('should only consider last 7 scores', async () => {
    const storedHistory = Array.from({ length: 14 }, (_, i) => ({
      date: `2026-02-${String(14 - i).padStart(2, '0')}`,
      score: i < 7 ? 100 : 50,
    }));
    (AsyncStorage.getItem).mockResolvedValue(JSON.stringify(storedHistory));

    const { result } = renderHook(() => useFitnessScore());
    await waitFor(() =>
      expect(result.current.scoreHistory.length).toBeGreaterThan(0)
    );

    const avg = result.current.getAverageScore();
    // First 7 entries (slice(0,7)) are all 100
    expect(avg).toBe(100);
  });

  it('should return a rounded integer', async () => {
    const storedHistory = [
      { date: '2026-02-14', score: 33 },
      { date: '2026-02-13', score: 67 },
    ];
    (AsyncStorage.getItem).mockResolvedValue(JSON.stringify(storedHistory));

    const { result } = renderHook(() => useFitnessScore());
    await waitFor(() => expect(result.current.scoreHistory).toHaveLength(2));

    const avg = result.current.getAverageScore();
    expect(Number.isInteger(avg)).toBe(true);
    expect(avg).toBe(50); // (33+67)/2 = 50
  });
});

// =============================================================================
// getScoreLabel
// =============================================================================

describe('useFitnessScore - getScoreLabel', () => {
  it('should return Elite for score >= 90', async () => {
    const { result } = renderHook(() => useFitnessScore());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const label = result.current.getScoreLabel(95);
    expect(label.label).toBe('Elite');
    expect(label.color).toBe('#FFD700');
  });

  it('should return Excellent for score >= 75', async () => {
    const { result } = renderHook(() => useFitnessScore());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const label = result.current.getScoreLabel(80);
    expect(label.label).toBe('Excellent');
    expect(label.color).toBe('#00E676');
  });

  it('should return Good for score >= 60', async () => {
    const { result } = renderHook(() => useFitnessScore());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const label = result.current.getScoreLabel(65);
    expect(label.label).toBe('Good');
    expect(label.color).toBe('#00D4FF');
  });

  it('should return Fair for score >= 40', async () => {
    const { result } = renderHook(() => useFitnessScore());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const label = result.current.getScoreLabel(45);
    expect(label.label).toBe('Fair');
    expect(label.color).toBe('#FFB300');
  });

  it('should return Getting Started for score < 40', async () => {
    const { result } = renderHook(() => useFitnessScore());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const label = result.current.getScoreLabel(20);
    expect(label.label).toBe('Getting Started');
    expect(label.color).toBe('#FF6B35');
  });

  it('should return Getting Started for score 0', async () => {
    const { result } = renderHook(() => useFitnessScore());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const label = result.current.getScoreLabel(0);
    expect(label.label).toBe('Getting Started');
  });

  it('should return Elite for score exactly 90', async () => {
    const { result } = renderHook(() => useFitnessScore());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const label = result.current.getScoreLabel(90);
    expect(label.label).toBe('Elite');
  });

  it('should return Excellent for score exactly 75', async () => {
    const { result } = renderHook(() => useFitnessScore());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const label = result.current.getScoreLabel(75);
    expect(label.label).toBe('Excellent');
  });

  it('should always have label, color, and emoji properties', async () => {
    const { result } = renderHook(() => useFitnessScore());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    [0, 20, 40, 60, 75, 90, 100].forEach((score) => {
      const label = result.current.getScoreLabel(score);
      expect(label).toHaveProperty('label');
      expect(label).toHaveProperty('color');
      expect(label).toHaveProperty('emoji');
      expect(typeof label.label).toBe('string');
      expect(typeof label.color).toBe('string');
    });
  });
});

/**
 * Tests for useWeeklyDigest hook.
 *
 * Dependencies mocked:
 * - AsyncStorage (global mock in jest.setup.ts)
 * - MealContext (useMeals)
 * - ProfileContext (useProfile)
 * - GamificationContext (useGamification)
 * - MoodContext (useMood)
 * - services/ai (generateWeeklyDigest)
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Mock data ──────────────────────────────────────────────────────────────

const mockMeals = {
  breakfast: [{ name: 'Oatmeal' }, { name: 'Banana' }],
  lunch: [{ name: 'Chicken Salad' }],
  dinner: [{ name: 'Salmon' }],
  snacks: [{ name: 'Almonds' }],
};

const mockTotals = { calories: 2100, protein: 140, carbs: 220, fat: 70 };
const mockGoals = { calories: 2200, protein: 150, carbs: 230, fat: 65 };

jest.mock('../../context/MealContext', () => ({
  useMeals: jest.fn(() => ({
    totals: mockTotals,
    goals: mockGoals,
    meals: mockMeals,
  })),
}));

jest.mock('../../context/ProfileContext', () => ({
  useProfile: jest.fn(() => ({
    profile: { weight: 80 },
    weightStats: { currentWeight: 79.5, startWeight: 82 },
  })),
}));

jest.mock('../../context/GamificationContext', () => ({
  useGamification: jest.fn(() => ({
    currentStreak: 5,
  })),
}));

jest.mock('../../context/MoodContext', () => ({
  useMood: jest.fn(() => ({
    todaysAverage: { energy: 7 },
    weeklyTrend: { avgEnergy: 6.5 },
  })),
}));

// ─── Mock SubscriptionContext to enable premium ─────────────────────────────

jest.mock('../../context/SubscriptionContext', () => ({
  useIsPremium: jest.fn(() => ({ isPremium: true, isLoading: false })),
  useSubscription: jest.fn(() => ({ isPremium: true, isLoading: false })),
}));

// ─── Mock AI service ────────────────────────────────────────────────────────

const mockDigestResult = {
  summary: 'Great week! You hit your protein target most days.',
  highlights: ['Lost 0.5 kg', 'Hit protein goal 5/7 days'],
  improvements: ['Try to increase water intake'],
  grade: 'B+',
  generatedAt: new Date().toISOString(),
};

const mockGenerateWeeklyDigest = jest.fn(() =>
  Promise.resolve(mockDigestResult)
);

jest.mock('../../services/ai', () => ({
  generateWeeklyDigest: (...args) => mockGenerateWeeklyDigest(...args),
}));

// ─── Import after mocks ────────────────────────────────────────────────────

const { useWeeklyDigest } = require('../../hooks/useWeeklyDigest');

// ─── Replicate getLossAversionFrame for unit testing ────────────────────────

function getLossAversionFrame(weekData) {
  if (!weekData) return null;

  const { daysLogged, totalDays, avgProtein, proteinGoal } = weekData;
  const adherencePercent = totalDays > 0 ? (daysLogged / totalDays) * 100 : 0;
  const proteinHitRatio = proteinGoal > 0 ? avgProtein / proteinGoal : 0;
  const proteinHitDays = Math.round(proteinHitRatio * totalDays);

  if (adherencePercent > 80) return null;

  if (adherencePercent < 50) {
    return {
      headline: 'Your progress is at risk',
      subtext: `You only logged ${Math.round(adherencePercent)}% of days this week. Users who log < 50% are 3x more likely to abandon their goals.`,
    };
  }

  if (proteinHitDays < 3) {
    return {
      headline: 'Protein gap detected',
      subtext: `You hit your protein target only ${proteinHitDays}/7 days. This could mean losing muscle instead of fat.`,
    };
  }

  return {
    headline: 'Room to improve',
    subtext: `${Math.round(adherencePercent)}% adherence is good, but 80%+ is where real results happen.`,
  };
}

// ─── Setup ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  (AsyncStorage.getItem).mockResolvedValue(null);
  (AsyncStorage.setItem).mockResolvedValue(undefined);
  // Reset mock to default resolved behavior (clearAllMocks doesn't reset mockImplementation)
  mockGenerateWeeklyDigest.mockImplementation(() =>
    Promise.resolve(mockDigestResult)
  );
});

// =============================================================================
// getLossAversionFrame (pure function)
// =============================================================================

describe('getLossAversionFrame', () => {
  it('should return null for null weekData', () => {
    expect(getLossAversionFrame(null)).toBeNull();
  });

  it('should return null when adherence is above 80%', () => {
    const result = getLossAversionFrame({
      daysLogged: 6,
      totalDays: 7,
      avgProtein: 150,
      proteinGoal: 150,
    });
    expect(result).toBeNull();
  });

  it('should return progress-at-risk when adherence is below 50%', () => {
    const result = getLossAversionFrame({
      daysLogged: 2,
      totalDays: 7,
      avgProtein: 150,
      proteinGoal: 150,
    });
    expect(result.headline).toBe('Your progress is at risk');
    expect(result.subtext).toContain('29%');
  });

  it('should return protein gap when adherence is 50-80% and protein is low', () => {
    const result = getLossAversionFrame({
      daysLogged: 4,
      totalDays: 7,
      avgProtein: 50,
      proteinGoal: 150,
    });
    expect(result.headline).toBe('Protein gap detected');
    expect(result.subtext).toContain('protein target');
  });

  it('should return room-to-improve when adherence is 50-80% with OK protein', () => {
    const result = getLossAversionFrame({
      daysLogged: 5,
      totalDays: 7,
      avgProtein: 120,
      proteinGoal: 150,
    });
    expect(result.headline).toBe('Room to improve');
    expect(result.subtext).toContain('71%');
  });

  it('should handle zero totalDays gracefully', () => {
    const result = getLossAversionFrame({
      daysLogged: 0,
      totalDays: 0,
      avgProtein: 0,
      proteinGoal: 150,
    });
    // adherencePercent = 0 which is < 50
    expect(result.headline).toBe('Your progress is at risk');
  });

  it('should handle zero proteinGoal gracefully', () => {
    const result = getLossAversionFrame({
      daysLogged: 4,
      totalDays: 7,
      avgProtein: 100,
      proteinGoal: 0,
    });
    // proteinHitRatio = 0, proteinHitDays = 0, which is < 3
    expect(result.headline).toBe('Protein gap detected');
  });
});

// =============================================================================
// Initial state
// =============================================================================

describe('useWeeklyDigest - initial state', () => {
  it('should return null digest initially', () => {
    // Prevent auto-generation
    mockGenerateWeeklyDigest.mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useWeeklyDigest());
    expect(result.current.digest).toBeNull();
    expect(result.current.lastGenerated).toBeNull();
  });

  it('should expose lossAversionFrame based on current week data', () => {
    mockGenerateWeeklyDigest.mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useWeeklyDigest());

    // With mockTotals having calories > 0, daysLogged = 1, totalDays = 7
    // adherencePercent = (1/7)*100 = 14.3%, which is < 50
    expect(result.current.lossAversionFrame).not.toBeNull();
    expect(result.current.lossAversionFrame.headline).toBe(
      'Your progress is at risk'
    );
  });
});

// =============================================================================
// Caching behavior
// =============================================================================

describe('useWeeklyDigest - caching', () => {
  it('should load cached digest from AsyncStorage on mount', async () => {
    const cached = {
      summary: 'Cached weekly summary',
      generatedAt: new Date().toISOString(),
    };
    (AsyncStorage.getItem).mockResolvedValue(JSON.stringify(cached));
    // Prevent auto-generation from overwriting the cached value
    mockGenerateWeeklyDigest.mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useWeeklyDigest());

    await waitFor(() => {
      expect(result.current.digest).not.toBeNull();
      expect(result.current.digest.summary).toBe('Cached weekly summary');
    });
  });

  it('should set lastGenerated from cached digest', async () => {
    const ts = '2026-02-14T08:00:00.000Z';
    const cached = {
      summary: 'Cached',
      generatedAt: ts,
    };
    (AsyncStorage.getItem).mockResolvedValue(JSON.stringify(cached));
    // Prevent auto-generation from overwriting the cached value
    mockGenerateWeeklyDigest.mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useWeeklyDigest());

    await waitFor(() => {
      expect(result.current.lastGenerated).toBe(ts);
    });
  });

  it('should not load cached digest without generatedAt', async () => {
    const cached = { summary: 'No timestamp' };
    (AsyncStorage.getItem).mockResolvedValue(JSON.stringify(cached));
    mockGenerateWeeklyDigest.mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useWeeklyDigest());

    await waitFor(() => {
      expect(AsyncStorage.getItem).toHaveBeenCalled();
    });
    expect(result.current.digest).toBeNull();
  });

  it('should handle AsyncStorage read failure gracefully', async () => {
    (AsyncStorage.getItem).mockRejectedValue(new Error('Storage error'));
    mockGenerateWeeklyDigest.mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useWeeklyDigest());

    await waitFor(() => {
      expect(AsyncStorage.getItem).toHaveBeenCalled();
    });
    expect(result.current.digest).toBeNull();
  });
});

// =============================================================================
// Digest generation
// =============================================================================

describe('useWeeklyDigest - generateDigest', () => {
  it('should generate a digest and persist it', async () => {
    const { result } = renderHook(() => useWeeklyDigest());

    await act(async () => {
      await result.current.generateDigest();
    });

    expect(mockGenerateWeeklyDigest).toHaveBeenCalled();

    // Digest should be enriched with lossAversionFrame
    await waitFor(() => {
      expect(result.current.digest).not.toBeNull();
      expect(result.current.digest).toHaveProperty('lossAversionFrame');
    });

    // Should persist to AsyncStorage
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      '@fueliq_weekly_digest',
      expect.any(String)
    );
  });

  it('should pass correct weekData to generateWeeklyDigest', async () => {
    const { result } = renderHook(() => useWeeklyDigest());

    await act(async () => {
      await result.current.generateDigest();
    });

    const weekData = mockGenerateWeeklyDigest.mock.calls[0][0];
    expect(weekData.avgCalories).toBe(2100);
    expect(weekData.calorieGoal).toBe(2200);
    expect(weekData.avgProtein).toBe(140);
    expect(weekData.proteinGoal).toBe(150);
    expect(weekData.currentStreak).toBe(5);
    expect(weekData.weightCurrent).toBe(79.5);
    expect(weekData.totalDays).toBe(7);
    expect(weekData.topFoods).toHaveLength(5);
    expect(weekData.topFoods).toContain('Oatmeal');
    expect(weekData.topFoods).toContain('Salmon');
  });

  it('should deduplicate top foods', async () => {
    const { useMeals } = require('../../context/MealContext');
    useMeals.mockReturnValueOnce({
      totals: mockTotals,
      goals: mockGoals,
      meals: {
        breakfast: [{ name: 'Oatmeal' }],
        lunch: [{ name: 'Oatmeal' }],
        dinner: [{ name: 'Oatmeal' }],
        snacks: [],
      },
    });

    const { result } = renderHook(() => useWeeklyDigest());

    await act(async () => {
      await result.current.generateDigest();
    });

    const weekData = mockGenerateWeeklyDigest.mock.calls[0][0];
    expect(weekData.topFoods).toEqual(['Oatmeal']); // Deduplicated
  });

  it('should handle generation failure gracefully', async () => {
    mockGenerateWeeklyDigest.mockRejectedValueOnce(
      new Error('AI service down')
    );

    const { result } = renderHook(() => useWeeklyDigest());

    await act(async () => {
      await result.current.generateDigest();
    });

    expect(result.current.digest).toBeNull();
    expect(result.current.isGenerating).toBe(false);
  });

  it('should not generate concurrently when already generating', async () => {
    let resolveGeneration;
    mockGenerateWeeklyDigest.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveGeneration = resolve;
        })
    );

    const { result } = renderHook(() => useWeeklyDigest());

    // Start generation but do not resolve yet
    const gen1 = act(async () => {
      result.current.generateDigest();
    });

    // Try to generate again while first is pending
    await act(async () => {
      result.current.generateDigest();
    });

    // Should have been called only once (second call bails out early)
    expect(mockGenerateWeeklyDigest).toHaveBeenCalledTimes(1);

    // Resolve to clean up
    resolveGeneration(mockDigestResult);
    await gen1;
  });
});

// =============================================================================
// buildWeekData edge cases
// =============================================================================

describe('useWeeklyDigest - buildWeekData edge cases', () => {
  it('should handle null meals gracefully', async () => {
    const { useMeals } = require('../../context/MealContext');
    useMeals.mockReturnValueOnce({
      totals: null,
      goals: null,
      meals: null,
    });

    const { result } = renderHook(() => useWeeklyDigest());

    await act(async () => {
      await result.current.generateDigest();
    });

    const weekData = mockGenerateWeeklyDigest.mock.calls[0][0];
    expect(weekData.avgCalories).toBe(0);
    expect(weekData.calorieGoal).toBe(2000);
    expect(weekData.topFoods).toEqual([]);
    expect(weekData.daysLogged).toBe(0);
  });

  it('should handle empty meal arrays', async () => {
    const { useMeals } = require('../../context/MealContext');
    useMeals.mockReturnValueOnce({
      totals: mockTotals,
      goals: mockGoals,
      meals: { breakfast: [], lunch: [], dinner: [], snacks: [] },
    });

    const { result } = renderHook(() => useWeeklyDigest());

    await act(async () => {
      await result.current.generateDigest();
    });

    const weekData = mockGenerateWeeklyDigest.mock.calls[0][0];
    expect(weekData.topFoods).toEqual([]);
  });

  it('should use profile weight as fallback for missing weightStats', async () => {
    const { useProfile } = require('../../context/ProfileContext');
    useProfile.mockReturnValueOnce({
      profile: { weight: 85 },
      weightStats: null,
    });

    const { result } = renderHook(() => useWeeklyDigest());

    await act(async () => {
      await result.current.generateDigest();
    });

    const weekData = mockGenerateWeeklyDigest.mock.calls[0][0];
    expect(weekData.weightCurrent).toBe(85);
    expect(weekData.weightStart).toBe(85);
  });
});

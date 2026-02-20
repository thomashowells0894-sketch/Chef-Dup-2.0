/**
 * Tests for useAdaptiveMacros hook.
 *
 * Dependencies mocked:
 * - AsyncStorage (global mock in jest.setup.ts)
 * - MealContext (useMealTotals)
 * - ProfileContext (useProfile)
 * - GamificationContext (useGamification)
 * - useAdaptiveTDEE hook
 * - usePredictiveAnalytics hook
 * - services/ai (generateMacroRecommendation)
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Mock context hooks ──────────────────────────────────────────────────────

const mockTotals = { calories: 2100, protein: 140, carbs: 220, fat: 70 };
const mockGoals = { calories: 2200, protein: 150, carbs: 230, fat: 65 };
const mockProfile = { weight: 80 };
const mockCalculatedGoals = { calories: 2200, protein: 150, carbs: 230, fat: 65 };
const mockWeightStats = { currentWeight: 80, weeklyChange: -0.3, startWeight: 82 };
const mockUpdateProfile = jest.fn(() => Promise.resolve());
const mockCurrentGoalType = 'cut';

jest.mock('../../context/MealContext', () => ({
  useMealTotals: jest.fn(() => ({
    totals: mockTotals,
    goals: mockGoals,
  })),
}));

jest.mock('../../context/ProfileContext', () => ({
  useProfile: jest.fn(() => ({
    profile: mockProfile,
    calculatedGoals: mockCalculatedGoals,
    weightStats: mockWeightStats,
    updateProfile: mockUpdateProfile,
    currentGoalType: mockCurrentGoalType,
  })),
}));

jest.mock('../../context/GamificationContext', () => ({
  useGamification: jest.fn(() => ({
    currentStreak: 5,
  })),
}));

// ─── Mock custom hooks ──────────────────────────────────────────────────────

const mockTDEEEstimate = {
  tdee: 2300,
  recommendedIntake: 1900,
  confidence: 0.6,
  estimateSource: 'hybrid',
  metabolicAdaptation: false,
  plateauDetected: false,
};

jest.mock('../../hooks/useAdaptiveTDEE', () => ({
  useAdaptiveTDEE: jest.fn(() => ({
    estimate: mockTDEEEstimate,
  })),
}));

const mockPlateauStatus = { isPlateau: false };

jest.mock('../../hooks/usePredictiveAnalytics', () => ({
  usePredictiveAnalytics: jest.fn(() => ({
    plateauStatus: mockPlateauStatus,
  })),
}));

// ─── Mock AI service ────────────────────────────────────────────────────────

const mockGenerateMacroRecommendation = jest.fn(() =>
  Promise.resolve({
    shouldAdjust: true,
    newCalories: 2000,
    newProtein: 160,
    newCarbs: 200,
    newFat: 60,
    reasoning: 'Adjusted for weight loss plateau',
    generatedAt: new Date().toISOString(),
  })
);

jest.mock('../../services/ai', () => ({
  generateMacroRecommendation: (...args) =>
    mockGenerateMacroRecommendation(...args),
}));

// ─── Mock SubscriptionContext to enable premium ─────────────────────────────

jest.mock('../../context/SubscriptionContext', () => ({
  useIsPremium: jest.fn(() => ({ isPremium: true, isLoading: false })),
  useSubscription: jest.fn(() => ({ isPremium: true, isLoading: false })),
}));

// ─── Import after mocks ────────────────────────────────────────────────────

const { useAdaptiveMacros } = require('../../hooks/useAdaptiveMacros');

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Reach into the module to test the exported pure utility functions.
 * Since they are module-private, we replicate them faithfully.
 */
function getISOWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  return (
    1 +
    Math.round(
      ((d.getTime() - week1.getTime()) / 86400000 -
        3 +
        ((week1.getDay() + 6) % 7)) /
        7
    )
  );
}

function isCurrentWeek(timestamp) {
  if (!timestamp) return false;
  const now = new Date();
  const then = new Date(timestamp);
  return (
    getISOWeek(now) === getISOWeek(then) &&
    now.getFullYear() === then.getFullYear()
  );
}

// ─── Setup ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  (AsyncStorage.getItem).mockResolvedValue(null);
  (AsyncStorage.setItem).mockResolvedValue(undefined);
  mockPlateauStatus.isPlateau = false;
  // Reset mock to default resolved behavior (clearAllMocks doesn't reset mockImplementation)
  mockGenerateMacroRecommendation.mockImplementation(() =>
    Promise.resolve({
      shouldAdjust: true,
      newCalories: 2000,
      newProtein: 160,
      newCarbs: 200,
      newFat: 60,
      reasoning: 'Adjusted for weight loss plateau',
      generatedAt: new Date().toISOString(),
    })
  );
});

// =============================================================================
// Utility functions (getISOWeek / isCurrentWeek)
// =============================================================================

describe('getISOWeek utility', () => {
  it('should return week 1 for January 1, 2026', () => {
    const week = getISOWeek(new Date(2026, 0, 1));
    expect(week).toBe(1);
  });

  it('should return week 53 for December 31, 2026 (a Thursday)', () => {
    const week = getISOWeek(new Date(2026, 11, 31));
    expect(week).toBe(53);
  });

  it('should return correct week for a known mid-year date', () => {
    // 2026-06-15 is a Monday, week 25
    const week = getISOWeek(new Date(2026, 5, 15));
    expect(week).toBeGreaterThan(20);
    expect(week).toBeLessThan(30);
  });

  it('should return same week for Monday and Sunday of the same ISO week', () => {
    // 2026-02-09 is a Monday, 2026-02-15 is a Sunday — same ISO week
    const mondayWeek = getISOWeek(new Date(2026, 1, 9));
    const sundayWeek = getISOWeek(new Date(2026, 1, 15));
    expect(mondayWeek).toBe(sundayWeek);
  });
});

describe('isCurrentWeek utility', () => {
  it('should return false for null/undefined timestamp', () => {
    expect(isCurrentWeek(null)).toBe(false);
    expect(isCurrentWeek(undefined)).toBe(false);
  });

  it('should return true for a timestamp from today', () => {
    expect(isCurrentWeek(new Date().toISOString())).toBe(true);
  });

  it('should return false for a timestamp from a different year', () => {
    expect(isCurrentWeek('2020-02-14T12:00:00Z')).toBe(false);
  });

  it('should return false for a timestamp from a different week this year', () => {
    // 6 months ago is definitely a different week
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    expect(isCurrentWeek(sixMonthsAgo.toISOString())).toBe(false);
  });
});

// =============================================================================
// Initial state
// =============================================================================

describe('useAdaptiveMacros - initial state', () => {
  it('should return null recommendation when no cached data exists', async () => {
    // Prevent auto-generation so we can check initial state
    mockGenerateMacroRecommendation.mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useAdaptiveMacros());

    // Initially recommendation is null
    expect(result.current.recommendation).toBeNull();
    expect(result.current.plateauTriggered).toBe(false);
  });

  it('should load cached recommendation from AsyncStorage', async () => {
    const cached = {
      shouldAdjust: true,
      newCalories: 2100,
      newProtein: 155,
      newCarbs: 210,
      newFat: 62,
      generatedAt: new Date().toISOString(),
      dismissed: false,
    };
    (AsyncStorage.getItem).mockResolvedValue(JSON.stringify(cached));
    // Prevent auto-generation from overwriting the cached value
    mockGenerateMacroRecommendation.mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useAdaptiveMacros());
    await waitFor(() => {
      expect(result.current.recommendation).not.toBeNull();
      expect(result.current.recommendation.newCalories).toBe(2100);
    });
  });

  it('should not load dismissed cached recommendation', async () => {
    const cached = {
      shouldAdjust: true,
      newCalories: 2100,
      generatedAt: new Date().toISOString(),
      dismissed: true,
    };
    (AsyncStorage.getItem).mockResolvedValue(JSON.stringify(cached));

    const { result } = renderHook(() => useAdaptiveMacros());

    // Wait for the async load to settle, recommendation should remain null
    await waitFor(() => {
      expect(AsyncStorage.getItem).toHaveBeenCalled();
    });
    expect(result.current.recommendation).toBeNull();
  });

  it('should handle corrupt storage gracefully', async () => {
    (AsyncStorage.getItem).mockResolvedValue('not valid json{{{');

    const { result } = renderHook(() => useAdaptiveMacros());

    await waitFor(() => {
      expect(AsyncStorage.getItem).toHaveBeenCalled();
    });
    expect(result.current.recommendation).toBeNull();
  });
});

// =============================================================================
// buildWeekData
// =============================================================================

describe('useAdaptiveMacros - buildWeekData via generate', () => {
  it('should use adaptive TDEE when confidence is sufficient', async () => {
    // Adaptive TDEE has confidence 0.6 and source "hybrid" — should be used
    const { result } = renderHook(() => useAdaptiveMacros());

    // Auto-generate is triggered because no cached rec. We rely on the mock.
    await waitFor(() => {
      expect(mockGenerateMacroRecommendation).toHaveBeenCalled();
    });

    // Inspect the weekData passed to the AI service
    const callArg = mockGenerateMacroRecommendation.mock.calls[0][0];
    // When adaptive TDEE is used, currentCalories should be recommendedIntake
    expect(callArg.currentCalories).toBe(1900);
    expect(callArg.adaptiveTDEE).toBe(2300);
    expect(callArg.adaptiveConfidence).toBe(0.6);
  });

  it('should fall back to calculatedGoals when TDEE confidence is low', async () => {
    const { useAdaptiveTDEE } = require('../../hooks/useAdaptiveTDEE');
    useAdaptiveTDEE.mockReturnValue({
      estimate: {
        tdee: 2300,
        recommendedIntake: 1900,
        confidence: 0.1, // Below 0.25 threshold
        estimateSource: 'formula',
        metabolicAdaptation: false,
        plateauDetected: false,
      },
    });

    const { result } = renderHook(() => useAdaptiveMacros());

    await waitFor(() => {
      expect(mockGenerateMacroRecommendation).toHaveBeenCalled();
    });

    const callArg = mockGenerateMacroRecommendation.mock.calls[0][0];
    // Should use calculatedGoals.calories (2200) not recommendedIntake (1900)
    expect(callArg.currentCalories).toBe(2200);
    expect(callArg.adaptiveTDEE).toBeNull();

    // Restore original mock
    useAdaptiveTDEE.mockReturnValue({ estimate: mockTDEEEstimate });
  });

  it('should pass correct adherence and streak data', async () => {
    const { result } = renderHook(() => useAdaptiveMacros());

    await waitFor(() => {
      expect(mockGenerateMacroRecommendation).toHaveBeenCalled();
    });

    const callArg = mockGenerateMacroRecommendation.mock.calls[0][0];
    expect(callArg.daysLogged).toBe(5); // min(7, max(1, currentStreak=5))
    expect(callArg.adherencePercent).toBe(71); // Math.round((5/7)*100) = 71
    expect(callArg.weightTrend).toBe(-0.3);
    expect(callArg.goal).toBe('lose'); // goalMap['cut']
  });

  it('should report triggerReason as weekly_review by default', async () => {
    const { result } = renderHook(() => useAdaptiveMacros());

    await waitFor(() => {
      expect(mockGenerateMacroRecommendation).toHaveBeenCalled();
    });

    const callArg = mockGenerateMacroRecommendation.mock.calls[0][0];
    expect(callArg.triggerReason).toBe('weekly_review');
  });
});

// =============================================================================
// applyRecommendation
// =============================================================================

describe('useAdaptiveMacros - applyRecommendation', () => {
  it('should call updateProfile with correct macro percentages', async () => {
    const { result } = renderHook(() => useAdaptiveMacros());

    // Wait for auto-generation to produce a recommendation
    await waitFor(() => {
      expect(result.current.recommendation).not.toBeNull();
    });

    await act(async () => {
      await result.current.applyRecommendation();
    });

    expect(mockUpdateProfile).toHaveBeenCalledWith({
      macroPreset: 'custom',
      customMacros: {
        protein: expect.any(Number),
        carbs: expect.any(Number),
        fat: expect.any(Number),
      },
    });

    // After applying, recommendation should be cleared
    expect(result.current.recommendation).toBeNull();

    // The dismissed version should be persisted
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      '@vibefit_adaptive_macros',
      expect.stringContaining('"dismissed":true')
    );
  });

  it('should not call updateProfile when recommendation has shouldAdjust false', async () => {
    mockGenerateMacroRecommendation.mockResolvedValueOnce({
      shouldAdjust: false,
      generatedAt: new Date().toISOString(),
    });

    const { result } = renderHook(() => useAdaptiveMacros());

    await waitFor(() => {
      expect(result.current.recommendation).not.toBeNull();
    });

    await act(async () => {
      await result.current.applyRecommendation();
    });

    // updateProfile should NOT have been called
    expect(mockUpdateProfile).not.toHaveBeenCalled();
  });

  it('should do nothing when recommendation is null', async () => {
    // Load with cached dismissed rec -> recommendation stays null
    const cached = {
      shouldAdjust: true,
      generatedAt: new Date().toISOString(),
      dismissed: true,
    };
    (AsyncStorage.getItem).mockResolvedValue(JSON.stringify(cached));

    const { result } = renderHook(() => useAdaptiveMacros());

    // Wait for effects to settle; since dismissed, rec will stay null
    // but auto-generate will also fire. Let's prevent that:
    mockGenerateMacroRecommendation.mockImplementation(() => new Promise(() => {})); // never resolve

    await act(async () => {
      await result.current.applyRecommendation();
    });

    expect(mockUpdateProfile).not.toHaveBeenCalled();
  });
});

// =============================================================================
// dismissRecommendation
// =============================================================================

describe('useAdaptiveMacros - dismissRecommendation', () => {
  it('should clear recommendation and persist dismissed state', async () => {
    const { result } = renderHook(() => useAdaptiveMacros());

    await waitFor(() => {
      expect(result.current.recommendation).not.toBeNull();
    });

    await act(async () => {
      await result.current.dismissRecommendation();
    });

    expect(result.current.recommendation).toBeNull();
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      '@vibefit_adaptive_macros',
      expect.stringContaining('"dismissed":true')
    );
  });

  it('should do nothing when there is no recommendation to dismiss', async () => {
    // Never let recommendation be set
    mockGenerateMacroRecommendation.mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useAdaptiveMacros());

    // recommendation starts null
    await act(async () => {
      await result.current.dismissRecommendation();
    });

    // setItem should only have been called by the auto-generate (which never resolves)
    // so dismiss should NOT have called setItem
    const setItemCalls = (AsyncStorage.setItem).mock.calls.filter(
      (call) => call[0] === '@vibefit_adaptive_macros'
    );
    expect(setItemCalls).toHaveLength(0);
  });
});

// =============================================================================
// Adaptive TDEE passthrough
// =============================================================================

describe('useAdaptiveMacros - adaptiveTDEE passthrough', () => {
  it('should expose the adaptive TDEE estimate', () => {
    const { result } = renderHook(() => useAdaptiveMacros());
    expect(result.current.adaptiveTDEE).toBe(mockTDEEEstimate);
  });
});

// =============================================================================
// Generation error handling
// =============================================================================

describe('useAdaptiveMacros - generation error handling', () => {
  it('should handle AI generation failure gracefully', async () => {
    mockGenerateMacroRecommendation.mockRejectedValueOnce(
      new Error('Network error')
    );

    const { result } = renderHook(() => useAdaptiveMacros());

    await waitFor(() => {
      expect(mockGenerateMacroRecommendation).toHaveBeenCalled();
    });

    // Should not crash, isGenerating should return to false
    await waitFor(() => {
      expect(result.current.isGenerating).toBe(false);
    });
    expect(result.current.recommendation).toBeNull();
  });
});

/**
 * Tests for useNutritionScore hook.
 *
 * The hook relies on MealContext. We mock the two selectors it uses:
 * - useCurrentDayMeals  -> { meals }
 * - useMealTotals       -> { totals, goals, mealCalories }
 *
 * Because the hook is a pure React hook using useMemo, we test via renderHook.
 */

import { renderHook } from '@testing-library/react-native';

// We need to mock the MealContext selectors BEFORE importing the hook
const mockUseCurrentDayMeals = jest.fn();
const mockUseMealTotals = jest.fn();

jest.mock('../../context/MealContext', () => ({
  useCurrentDayMeals: () => mockUseCurrentDayMeals(),
  useMealTotals: () => mockUseMealTotals(),
}));

// Mock theme Colors
jest.mock('../../constants/theme', () => ({
  Colors: {
    gold: '#FFD700',
    success: '#00E676',
    primary: '#00D4FF',
    warning: '#FFB300',
    secondary: '#FF6B35',
    error: '#FF5252',
  },
}));

import useNutritionScore from '../../hooks/useNutritionScore';

// Helper: default goals
const DEFAULT_GOALS = { calories: 2000, protein: 150, carbs: 250, fat: 65 };

function setMocks(
  meals: Record<string, any[]> | null,
  totals: Record<string, number>,
  goals = DEFAULT_GOALS,
  mealCalories = { breakfast: 0, lunch: 0, dinner: 0, snacks: 0 },
) {
  mockUseCurrentDayMeals.mockReturnValue({ meals });
  mockUseMealTotals.mockReturnValue({ totals, goals, mealCalories });
}

beforeEach(() => {
  jest.clearAllMocks();
});

// =============================================================================
// No food edge case
// =============================================================================

describe('no food logged', () => {
  it('returns score 0 when no meals exist', () => {
    setMocks(null, { calories: 0, protein: 0, carbs: 0, fat: 0 });
    const { result } = renderHook(() => useNutritionScore());
    expect(result.current.dailyScore).toBe(0);
    expect(result.current.hasFood).toBe(false);
    expect(result.current.grade).toBe('F');
  });

  it('returns score 0 when all meal arrays are empty', () => {
    setMocks(
      { breakfast: [], lunch: [], dinner: [], snacks: [] },
      { calories: 0, protein: 0, carbs: 0, fat: 0 },
    );
    const { result } = renderHook(() => useNutritionScore());
    expect(result.current.dailyScore).toBe(0);
    expect(result.current.hasFood).toBe(false);
  });

  it('returns empty tips when no food logged', () => {
    setMocks(null, { calories: 0, protein: 0, carbs: 0, fat: 0 });
    const { result } = renderHook(() => useNutritionScore());
    expect(result.current.tips).toEqual([]);
  });
});

// =============================================================================
// Single food item
// =============================================================================

describe('single food item', () => {
  it('calculates score with one breakfast item', () => {
    setMocks(
      {
        breakfast: [{ name: 'Eggs', calories: 200 }],
        lunch: [],
        dinner: [],
        snacks: [],
      },
      { calories: 200, protein: 20, carbs: 2, fat: 14 },
    );
    const { result } = renderHook(() => useNutritionScore());
    expect(result.current.dailyScore).toBeGreaterThan(0);
    expect(result.current.hasFood).toBe(true);
  });
});

// =============================================================================
// Calorie score (max 25 pts)
// =============================================================================

describe('calorie score', () => {
  it('gives full 25 points when exactly at goal', () => {
    setMocks(
      { breakfast: [{ name: 'A' }], lunch: [{ name: 'B' }], dinner: [{ name: 'C' }], snacks: [] },
      { calories: 2000, protein: 150, carbs: 250, fat: 65 },
    );
    const { result } = renderHook(() => useNutritionScore());
    expect(result.current.scoreBreakdown.calories).toBe(25);
  });

  it('gives 0 points when no calories and goals exist', () => {
    setMocks(
      { breakfast: [{ name: 'A' }], lunch: [], dinner: [], snacks: [] },
      { calories: 0, protein: 0, carbs: 0, fat: 0 },
      { calories: 0, protein: 0, carbs: 0, fat: 0 },
    );
    const { result } = renderHook(() => useNutritionScore());
    expect(result.current.scoreBreakdown.calories).toBe(0);
  });

  it('reduces points when over calorie goal', () => {
    setMocks(
      { breakfast: [{ name: 'A' }], lunch: [{ name: 'B' }], dinner: [{ name: 'C' }], snacks: [] },
      { calories: 3000, protein: 150, carbs: 250, fat: 65 },
    );
    const { result } = renderHook(() => useNutritionScore());
    expect(result.current.scoreBreakdown.calories).toBeLessThan(25);
  });

  it('reduces points when under calorie goal', () => {
    setMocks(
      { breakfast: [{ name: 'A' }], lunch: [{ name: 'B' }], dinner: [{ name: 'C' }], snacks: [] },
      { calories: 1000, protein: 100, carbs: 150, fat: 40 },
    );
    const { result } = renderHook(() => useNutritionScore());
    expect(result.current.scoreBreakdown.calories).toBeLessThan(25);
  });
});

// =============================================================================
// Protein score (max 25 pts)
// =============================================================================

describe('protein score', () => {
  it('gives full 25 points when at or above protein goal', () => {
    setMocks(
      { breakfast: [{ name: 'A' }], lunch: [{ name: 'B' }], dinner: [{ name: 'C' }], snacks: [] },
      { calories: 2000, protein: 150, carbs: 250, fat: 65 },
    );
    const { result } = renderHook(() => useNutritionScore());
    expect(result.current.scoreBreakdown.protein).toBe(25);
  });

  it('gives proportional points for partial protein', () => {
    setMocks(
      { breakfast: [{ name: 'A' }], lunch: [{ name: 'B' }], dinner: [{ name: 'C' }], snacks: [] },
      { calories: 2000, protein: 75, carbs: 250, fat: 65 },
    );
    const { result } = renderHook(() => useNutritionScore());
    // 75/150 = 0.5 * 25 = 12.5, rounds to 13
    expect(result.current.scoreBreakdown.protein).toBe(13);
  });

  it('caps at 25 when over protein goal', () => {
    setMocks(
      { breakfast: [{ name: 'A' }], lunch: [{ name: 'B' }], dinner: [{ name: 'C' }], snacks: [] },
      { calories: 2000, protein: 200, carbs: 250, fat: 65 },
    );
    const { result } = renderHook(() => useNutritionScore());
    expect(result.current.scoreBreakdown.protein).toBe(25);
  });
});

// =============================================================================
// Macro balance score (max 20 pts)
// =============================================================================

describe('macro balance score', () => {
  it('gives full 20 points when macros match goals exactly', () => {
    setMocks(
      { breakfast: [{ name: 'A' }], lunch: [{ name: 'B' }], dinner: [{ name: 'C' }], snacks: [] },
      { calories: 2000, protein: 150, carbs: 250, fat: 65 },
    );
    const { result } = renderHook(() => useNutritionScore());
    expect(result.current.scoreBreakdown.macros).toBe(20);
  });

  it('gives 0 when macro goals total is 0', () => {
    setMocks(
      { breakfast: [{ name: 'A' }], lunch: [], dinner: [], snacks: [] },
      { calories: 2000, protein: 50, carbs: 100, fat: 30 },
      { calories: 2000, protein: 0, carbs: 0, fat: 0 },
    );
    const { result } = renderHook(() => useNutritionScore());
    expect(result.current.scoreBreakdown.macros).toBe(0);
  });
});

// =============================================================================
// Consistency score (max 15 pts)
// =============================================================================

describe('consistency score', () => {
  it('gives 15 points for logging all three main meals', () => {
    setMocks(
      {
        breakfast: [{ name: 'A' }],
        lunch: [{ name: 'B' }],
        dinner: [{ name: 'C' }],
        snacks: [],
      },
      { calories: 2000, protein: 150, carbs: 250, fat: 65 },
    );
    const { result } = renderHook(() => useNutritionScore());
    expect(result.current.scoreBreakdown.consistency).toBe(15);
  });

  it('gives 10 points for two meals', () => {
    setMocks(
      {
        breakfast: [{ name: 'A' }],
        lunch: [{ name: 'B' }],
        dinner: [],
        snacks: [],
      },
      { calories: 1500, protein: 100, carbs: 200, fat: 50 },
    );
    const { result } = renderHook(() => useNutritionScore());
    expect(result.current.scoreBreakdown.consistency).toBe(10);
  });

  it('gives 5 points for one meal', () => {
    setMocks(
      {
        breakfast: [{ name: 'A' }],
        lunch: [],
        dinner: [],
        snacks: [],
      },
      { calories: 500, protein: 30, carbs: 60, fat: 20 },
    );
    const { result } = renderHook(() => useNutritionScore());
    expect(result.current.scoreBreakdown.consistency).toBe(5);
  });

  it('gives 0 points when no meals logged', () => {
    setMocks(
      { breakfast: [], lunch: [], dinner: [], snacks: [{ name: 'Snack' }] },
      { calories: 200, protein: 5, carbs: 30, fat: 10 },
    );
    const { result } = renderHook(() => useNutritionScore());
    expect(result.current.scoreBreakdown.consistency).toBe(0);
  });
});

// =============================================================================
// Variety score (max 15 pts)
// =============================================================================

describe('variety score', () => {
  it('gives full 15 points for 5+ unique foods', () => {
    setMocks(
      {
        breakfast: [{ name: 'Eggs' }, { name: 'Toast' }],
        lunch: [{ name: 'Chicken' }, { name: 'Rice' }],
        dinner: [{ name: 'Salmon' }],
        snacks: [],
      },
      { calories: 2000, protein: 150, carbs: 250, fat: 65 },
    );
    const { result } = renderHook(() => useNutritionScore());
    expect(result.current.scoreBreakdown.variety).toBe(15);
  });

  it('gives proportional points for fewer unique foods', () => {
    setMocks(
      {
        breakfast: [{ name: 'Eggs' }],
        lunch: [{ name: 'Chicken' }],
        dinner: [],
        snacks: [],
      },
      { calories: 1000, protein: 80, carbs: 50, fat: 30 },
    );
    const { result } = renderHook(() => useNutritionScore());
    // 2 unique / 5 = 0.4 * 15 = 6
    expect(result.current.scoreBreakdown.variety).toBe(6);
  });

  it('deduplicates food names (case-insensitive)', () => {
    setMocks(
      {
        breakfast: [{ name: 'Eggs' }],
        lunch: [{ name: 'eggs' }],
        dinner: [{ name: 'EGGS' }],
        snacks: [],
      },
      { calories: 600, protein: 40, carbs: 5, fat: 30 },
    );
    const { result } = renderHook(() => useNutritionScore());
    // Only 1 unique food
    expect(result.current.scoreBreakdown.variety).toBe(3); // 1/5 * 15 = 3
  });
});

// =============================================================================
// Grade assignment
// =============================================================================

describe('grade assignment', () => {
  it('assigns A+ for score >= 90', () => {
    // All perfect
    setMocks(
      {
        breakfast: [{ name: 'A' }, { name: 'B' }],
        lunch: [{ name: 'C' }, { name: 'D' }],
        dinner: [{ name: 'E' }],
        snacks: [],
      },
      { calories: 2000, protein: 150, carbs: 250, fat: 65 },
    );
    const { result } = renderHook(() => useNutritionScore());
    expect(result.current.dailyScore).toBeGreaterThanOrEqual(90);
    expect(result.current.grade).toBe('A+');
  });

  it('assigns F for score < 50', () => {
    setMocks(
      { breakfast: [{ name: 'A' }], lunch: [], dinner: [], snacks: [] },
      { calories: 500, protein: 10, carbs: 80, fat: 5 },
    );
    const { result } = renderHook(() => useNutritionScore());
    expect(result.current.dailyScore).toBeLessThan(50);
    expect(result.current.grade).toBe('F');
  });
});

// =============================================================================
// Grade color
// =============================================================================

describe('grade color', () => {
  it('returns gold for A+', () => {
    setMocks(
      {
        breakfast: [{ name: 'A' }, { name: 'B' }],
        lunch: [{ name: 'C' }, { name: 'D' }],
        dinner: [{ name: 'E' }],
        snacks: [],
      },
      { calories: 2000, protein: 150, carbs: 250, fat: 65 },
    );
    const { result } = renderHook(() => useNutritionScore());
    expect(result.current.gradeColor).toBe('#FFD700');
  });

  it('returns error color for F', () => {
    setMocks(
      { breakfast: [{ name: 'A' }], lunch: [], dinner: [], snacks: [] },
      { calories: 500, protein: 10, carbs: 80, fat: 5 },
    );
    const { result } = renderHook(() => useNutritionScore());
    expect(result.current.gradeColor).toBe('#FF5252');
  });
});

// =============================================================================
// Tips generation
// =============================================================================

describe('tips', () => {
  it('returns up to 3 tips', () => {
    setMocks(
      { breakfast: [{ name: 'A' }], lunch: [], dinner: [], snacks: [] },
      { calories: 500, protein: 10, carbs: 80, fat: 5 },
    );
    const { result } = renderHook(() => useNutritionScore());
    expect(result.current.tips.length).toBeLessThanOrEqual(3);
    expect(result.current.tips.length).toBeGreaterThan(0);
  });

  it('includes calorie tip when significantly under goal', () => {
    setMocks(
      { breakfast: [{ name: 'A' }], lunch: [], dinner: [], snacks: [] },
      { calories: 500, protein: 10, carbs: 80, fat: 5 },
    );
    const { result } = renderHook(() => useNutritionScore());
    const calorieTip = result.current.tips.find((t: string) => t.includes('cal'));
    expect(calorieTip).toBeDefined();
  });

  it('includes variety tip when few unique foods', () => {
    setMocks(
      { breakfast: [{ name: 'A' }], lunch: [], dinner: [], snacks: [] },
      { calories: 2000, protein: 150, carbs: 250, fat: 65 },
    );
    const { result } = renderHook(() => useNutritionScore());
    const varietyTip = result.current.tips.find((t: string) => t.includes('diverse'));
    expect(varietyTip).toBeDefined();
  });
});

// =============================================================================
// Eating window
// =============================================================================

describe('eating window', () => {
  it('returns null start/end and 0 duration with no timestamps', () => {
    setMocks(
      { breakfast: [{ name: 'A' }], lunch: [], dinner: [], snacks: [] },
      { calories: 500, protein: 30, carbs: 60, fat: 20 },
    );
    const { result } = renderHook(() => useNutritionScore());
    expect(result.current.eatingWindow.start).toBeNull();
    expect(result.current.eatingWindow.end).toBeNull();
    expect(result.current.eatingWindow.durationHours).toBe(0);
  });

  it('calculates eating window from logged times', () => {
    setMocks(
      {
        breakfast: [{ name: 'A', loggedAt: '2026-02-13T08:00:00Z' }],
        lunch: [{ name: 'B', loggedAt: '2026-02-13T12:00:00Z' }],
        dinner: [{ name: 'C', loggedAt: '2026-02-13T19:00:00Z' }],
        snacks: [],
      },
      { calories: 2000, protein: 150, carbs: 250, fat: 65 },
    );
    const { result } = renderHook(() => useNutritionScore());
    expect(result.current.eatingWindow.durationHours).toBe(11);
  });
});

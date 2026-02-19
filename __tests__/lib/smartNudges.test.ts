import { getSmartNudge } from '../../lib/smartNudges';

// Mock detectPlateau from analyticsEngine
jest.mock('../../lib/analyticsEngine', () => ({
  detectPlateau: jest.fn((data: number[]) => {
    // Simple mock: plateau if all values within 1lb over last 14 entries
    if (!data || data.length < 14) return { isPlateaued: false };
    const recent = data.slice(-14);
    const max = Math.max(...recent);
    const min = Math.min(...recent);
    if (max - min <= 1) {
      return { isPlateaued: true, duration: 14 };
    }
    return { isPlateaued: false };
  }),
}));

// Helper to create a base input with sensible defaults
function makeInput(overrides: Record<string, unknown> = {}) {
  return {
    todayCalories: 0,
    calorieGoal: 2000,
    todayProtein: 0,
    proteinGoal: 150,
    isFasting: false,
    currentStreak: 0,
    waterPercentage: 50,
    ...overrides,
  };
}

/**
 * Helper: set the fake clock to a specific hour of the day.
 */
function setHour(hour: number) {
  jest.setSystemTime(new Date(2026, 1, 13, hour, 0, 0));
}

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

// =============================================================================
// Sugar warning (fires regardless of time)
// =============================================================================

describe('sugar warning nudge', () => {
  it('fires when lastFoodSugarGrams > 30', () => {
    setHour(12);
    const nudge = getSmartNudge(makeInput({ lastFoodSugarGrams: 35 }));
    expect(nudge).not.toBeNull();
    expect(nudge!.title).toContain('sugar');
    expect(nudge!.type).toBe('warning');
    expect(nudge!.actionLabel).toContain('Protein');
  });

  it('does not fire when sugar <= 30', () => {
    setHour(12);
    const nudge = getSmartNudge(makeInput({
      lastFoodSugarGrams: 25,
      todayCalories: 1000,
      todayProtein: 120,
      currentStreak: 5,
    }));
    // Should return something, but not the sugar nudge
    if (nudge) {
      expect(nudge.title).not.toContain('sugar');
    }
  });

  it('does not fire when lastFoodSugarGrams is undefined', () => {
    setHour(12);
    const nudge = getSmartNudge(makeInput({
      todayCalories: 1000,
      todayProtein: 80,
      currentStreak: 5,
    }));
    if (nudge) {
      expect(nudge.title).not.toContain('sugar');
    }
  });

  it('takes priority over time-based nudges', () => {
    // Even during morning with no food logged, sugar warning should take priority
    setHour(8);
    const nudge = getSmartNudge(makeInput({ lastFoodSugarGrams: 40, todayCalories: 0 }));
    expect(nudge).not.toBeNull();
    expect(nudge!.title).toContain('sugar');
  });
});

// =============================================================================
// Plateau detection nudge
// =============================================================================

describe('plateau detection nudge', () => {
  it('fires when weight history shows plateau', () => {
    setHour(12);
    const stableWeight = Array(14).fill(180);
    const nudge = getSmartNudge(makeInput({ weightHistory: stableWeight }));
    expect(nudge).not.toBeNull();
    expect(nudge!.title).toContain('plateau');
    expect(nudge!.type).toBe('insight');
  });

  it('does not fire when weight is changing', () => {
    setHour(12);
    const changingWeight = Array.from({ length: 14 }, (_, i) => 190 - i);
    const nudge = getSmartNudge(makeInput({
      weightHistory: changingWeight,
      todayCalories: 1000,
      todayProtein: 80,
      currentStreak: 3,
    }));
    if (nudge) {
      expect(nudge.title).not.toContain('plateau');
    }
  });

  it('does not fire with fewer than 14 weight entries', () => {
    setHour(12);
    const shortHistory = Array(10).fill(180);
    const nudge = getSmartNudge(makeInput({
      weightHistory: shortHistory,
      todayCalories: 1000,
      todayProtein: 80,
    }));
    if (nudge) {
      expect(nudge.title).not.toContain('plateau');
    }
  });
});

// =============================================================================
// Morning nudges (6-11am)
// =============================================================================

describe('morning nudges (6-11am)', () => {
  it('prompts to log breakfast when no food logged', () => {
    setHour(8);
    const nudge = getSmartNudge(makeInput({ todayCalories: 0 }));
    expect(nudge).not.toBeNull();
    expect(nudge!.title).toContain('breakfast');
    expect(nudge!.action).toBe('logFood');
  });

  it('shows fasting encouragement when fasting in morning', () => {
    setHour(9);
    const nudge = getSmartNudge(makeInput({ todayCalories: 0, isFasting: true }));
    expect(nudge).not.toBeNull();
    expect(nudge!.title).toContain('Hold');
    expect(nudge!.actionLabel).toBeNull();
  });

  it('does not show breakfast nudge when food already logged', () => {
    setHour(8);
    const nudge = getSmartNudge(makeInput({
      todayCalories: 500,
      todayProtein: 30,
      currentStreak: 3,
    }));
    if (nudge) {
      expect(nudge.title).not.toContain('breakfast');
    }
  });
});

// =============================================================================
// Midday nudges (11am-2pm)
// =============================================================================

describe('midday nudges (11am-2pm)', () => {
  it('shows zero-calories warning when nothing logged past 11am', () => {
    setHour(12);
    const nudge = getSmartNudge(makeInput({ todayCalories: 0 }));
    expect(nudge).not.toBeNull();
    expect(nudge!.title).toContain('Zero');
    expect(nudge!.action).toBe('logFood');
  });

  it('shows pace warning when nearly at calorie goal before 2pm', () => {
    setHour(13);
    const nudge = getSmartNudge(makeInput({
      todayCalories: 1850,
      calorieGoal: 2000,
      todayProtein: 100,
      proteinGoal: 150,
    }));
    expect(nudge).not.toBeNull();
    expect(nudge!.title).toContain('pace');
    expect(nudge!.type).toBe('warning');
  });
});

// =============================================================================
// Afternoon nudges (2-6pm)
// =============================================================================

describe('afternoon nudges (2-6pm)', () => {
  it('shows protein warning when below 40% of protein goal', () => {
    setHour(15);
    const nudge = getSmartNudge(makeInput({
      todayCalories: 1000,
      todayProtein: 40, // 40/150 = 26.7%
      proteinGoal: 150,
    }));
    expect(nudge).not.toBeNull();
    expect(nudge!.title).toContain('protein');
    expect(nudge!.body).toContain('eggs');
  });

  it('shows hydration warning when water < 50%', () => {
    setHour(16);
    const nudge = getSmartNudge(makeInput({
      todayCalories: 1200,
      todayProtein: 100,
      proteinGoal: 150,
      waterPercentage: 30,
    }));
    expect(nudge).not.toBeNull();
    expect(nudge!.title).toContain('hydrated');
    expect(nudge!.action).toBe('logWater');
  });
});

// =============================================================================
// Evening nudges (6pm+)
// =============================================================================

describe('evening nudges (6pm+)', () => {
  it('shows calorie remaining + protein guidance when both low', () => {
    setHour(19);
    const nudge = getSmartNudge(makeInput({
      todayCalories: 1200,
      calorieGoal: 2000,
      todayProtein: 80,
      proteinGoal: 150,
    }));
    expect(nudge).not.toBeNull();
    expect(nudge!.title).toContain('800');
    expect(nudge!.title).toContain('cal left');
    expect(nudge!.body).toContain('protein');
  });

  it('shows under-50% warning in the evening', () => {
    setHour(20);
    // Need proteinPercent >= 70 to skip evening cals+protein nudge
    // 110/150 = 73.3% >= 70
    const nudge = getSmartNudge(makeInput({
      todayCalories: 800,
      calorieGoal: 2000,
      todayProtein: 110,
      proteinGoal: 150,
      waterPercentage: 80,
    }));
    expect(nudge).not.toBeNull();
    expect(nudge!.title).toContain('Under 50');
  });
});

// =============================================================================
// Protein celebration
// =============================================================================

describe('protein celebration nudge', () => {
  it('celebrates when protein >= 80% of goal', () => {
    setHour(12);
    const nudge = getSmartNudge(makeInput({
      todayCalories: 1200,
      calorieGoal: 2000,
      todayProtein: 130,
      proteinGoal: 150,
      waterPercentage: 80,
    }));
    expect(nudge).not.toBeNull();
    expect(nudge!.title).toContain('Protein goal');
    expect(nudge!.type).toBe('celebration');
  });
});

// =============================================================================
// Calorie target nudges
// =============================================================================

describe('calorie target nudges', () => {
  it('celebrates when exactly at calorie goal (95-105%)', () => {
    setHour(20);
    const nudge = getSmartNudge(makeInput({
      todayCalories: 2000,
      calorieGoal: 2000,
      todayProtein: 140,
      proteinGoal: 150,
      waterPercentage: 80,
    }));
    expect(nudge).not.toBeNull();
    // protein >= 80% takes priority here (140/150 = 93%)
    // Actually the code checks protein celebration first if proteinPercent >= 80
    // 140/150 = 93.3% >= 80, so protein celebration fires first
    expect(nudge!.type).toBe('celebration');
  });

  it('shows "cal to go" when 80-94% of goal', () => {
    setHour(20);
    const nudge = getSmartNudge(makeInput({
      todayCalories: 1700,
      calorieGoal: 2000,
      todayProtein: 140,
      proteinGoal: 150,
      waterPercentage: 80,
    }));
    expect(nudge).not.toBeNull();
    // Protein >= 80% (93%) fires first
    expect(nudge!.type).toBe('celebration');
  });

  it('shows over-calorie nudge when > 110% and protein met', () => {
    setHour(20);
    // Need protein < 80% to avoid protein celebration taking priority
    const nudge = getSmartNudge(makeInput({
      todayCalories: 2500,
      calorieGoal: 2000,
      todayProtein: 50,
      proteinGoal: 150,
      waterPercentage: 80,
    }));
    expect(nudge).not.toBeNull();
    expect(nudge!.title).toContain('over target');
  });

  it('shows "Target locked" when at goal and protein < 80%', () => {
    setHour(20);
    const nudge = getSmartNudge(makeInput({
      todayCalories: 2000,
      calorieGoal: 2000,
      todayProtein: 50,
      proteinGoal: 150,
      waterPercentage: 80,
    }));
    expect(nudge).not.toBeNull();
    expect(nudge!.title).toContain('Target locked');
  });

  it('shows "cal to go" when 80-94% of goal and protein < 80%', () => {
    setHour(20);
    const nudge = getSmartNudge(makeInput({
      todayCalories: 1700,
      calorieGoal: 2000,
      todayProtein: 50,
      proteinGoal: 150,
      waterPercentage: 80,
    }));
    expect(nudge).not.toBeNull();
    expect(nudge!.title).toContain('cal to go');
  });
});

// =============================================================================
// Streak nudges
// =============================================================================

describe('streak-based nudges', () => {
  // Use hour=5 to avoid all time-based windows.
  // Set calories low so calorie-based checks (80-105%, >110%) don't fire.
  // Keep protein low (<80%) to avoid protein celebration.
  it('shows 7-day streak message', () => {
    setHour(5);
    const nudge = getSmartNudge(makeInput({
      todayCalories: 500,
      calorieGoal: 2000,
      todayProtein: 30,
      proteinGoal: 150,
      currentStreak: 7,
      waterPercentage: 80,
    }));
    expect(nudge).not.toBeNull();
    expect(nudge!.title).toContain('7');
    expect(nudge!.body).toContain('week');
  });

  it('shows 14-day streak message with "unstoppable"', () => {
    setHour(5);
    const nudge = getSmartNudge(makeInput({
      todayCalories: 500,
      calorieGoal: 2000,
      todayProtein: 30,
      proteinGoal: 150,
      currentStreak: 14,
      waterPercentage: 80,
    }));
    expect(nudge).not.toBeNull();
    expect(nudge!.title).toContain('14');
    expect(nudge!.title).toContain('unstoppable');
  });

  it('shows 30+ day streak as "Elite"', () => {
    setHour(5);
    const nudge = getSmartNudge(makeInput({
      todayCalories: 500,
      calorieGoal: 2000,
      todayProtein: 30,
      proteinGoal: 150,
      currentStreak: 30,
      waterPercentage: 80,
    }));
    expect(nudge).not.toBeNull();
    expect(nudge!.title).toContain('30');
    expect(nudge!.title).toContain('Elite');
  });
});

// =============================================================================
// Default nudge
// =============================================================================

describe('default nudge', () => {
  it('shows percentage logged when food is tracked but no other condition matches', () => {
    setHour(5); // 5 AM - outside morning window
    const nudge = getSmartNudge(makeInput({
      todayCalories: 500,
      calorieGoal: 2000,
      todayProtein: 80,
      proteinGoal: 150,
      waterPercentage: 80,
    }));
    expect(nudge).not.toBeNull();
    expect(nudge!.title).toContain('logged');
  });

  it('returns null when no food logged and outside relevant hours', () => {
    setHour(3); // 3 AM
    const nudge = getSmartNudge(makeInput({ todayCalories: 0 }));
    expect(nudge).toBeNull();
  });
});

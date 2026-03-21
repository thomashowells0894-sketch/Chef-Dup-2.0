import {
  buildInitialMealHydration,
  normalizeCachedDayData,
} from '../../lib/mealStartup';

describe('mealStartup', () => {
  it('normalizes cached day payloads into a safe day shape', () => {
    const hydrated = normalizeCachedDayData({
      meals: {
        breakfast: [{ id: 'b1', name: 'Oats' }],
      },
      totals: {
        calories: '420',
        protein: '26',
        carbs: '48',
        fat: '12',
      },
      waterIntake: '500',
      caloriesBurned: '0',
      exerciseMinutes: '0',
    });

    expect(hydrated).toEqual({
      meals: {
        breakfast: [{ id: 'b1', name: 'Oats' }],
        lunch: [],
        dinner: [],
        snacks: [],
      },
      totals: {
        calories: 420,
        protein: 26,
        carbs: 48,
        fat: 12,
      },
      waterIntake: 500,
      exercises: [],
      caloriesBurned: 0,
      exerciseMinutes: 0,
    });
  });

  it('builds a non-blocking initial hydration payload from cache or safe empty state', () => {
    expect(buildInitialMealHydration('2026-03-21', null)).toEqual({});

    expect(
      buildInitialMealHydration('2026-03-21', {
        meals: { breakfast: [], lunch: [], dinner: [], snacks: [] },
        totals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
        waterIntake: 0,
        exercises: [],
        caloriesBurned: 0,
        exerciseMinutes: 0,
      })
    ).toEqual({
      '2026-03-21': {
        meals: { breakfast: [], lunch: [], dinner: [], snacks: [] },
        totals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
        waterIntake: 0,
        exercises: [],
        caloriesBurned: 0,
        exerciseMinutes: 0,
      },
    });
  });
});

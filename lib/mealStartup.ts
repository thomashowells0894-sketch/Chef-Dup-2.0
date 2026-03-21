import type { DayData, DateKey } from '../types';

export function normalizeCachedDayData(payload: any): DayData | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  return {
    meals: {
      breakfast: payload.meals?.breakfast || [],
      lunch: payload.meals?.lunch || [],
      dinner: payload.meals?.dinner || [],
      snacks: payload.meals?.snacks || [],
    },
    totals: {
      calories: Number(payload.totals?.calories) || 0,
      protein: Number(payload.totals?.protein) || 0,
      carbs: Number(payload.totals?.carbs) || 0,
      fat: Number(payload.totals?.fat) || 0,
    },
    waterIntake: Number(payload.waterIntake) || 0,
    exercises: payload.exercises || [],
    caloriesBurned: Number(payload.caloriesBurned) || 0,
    exerciseMinutes: Number(payload.exerciseMinutes) || 0,
  };
}

export function buildInitialMealHydration(
  dateKey: DateKey,
  cachedDayData: DayData | null
): Record<DateKey, DayData> {
  if (!cachedDayData) {
    return {};
  }

  return {
    [dateKey]: cachedDayData,
  };
}

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { parseMyFitnessPalCsv } from '../../services/importMyFitnessPal';

jest.setTimeout(20000);

const mockAwardXP = jest.fn();
const mockQueueOperation = jest.fn();
const mockCheckOnline = jest.fn(async () => true);
const mockShowOfflineAlert = jest.fn();
const mockCaptureException = jest.fn();
const mockRecordFoodLogged = jest.fn(async () => undefined);
const mockRecordFrequentFood = jest.fn(async () => undefined);
const mockMergeFrequentFoods = jest.fn(async () => undefined);
const mockReplaceRecentMealSnapshot = jest.fn(async () => undefined);
const mockSyncRecentMealsForDate = jest.fn(async () => undefined);

let foodLogsStore: any[] = [];
let workoutsStore: any[] = [];
let foodLogIdCounter = 1;
let consoleErrorSpy: jest.SpyInstance;
let alertSpy: jest.SpyInstance;

function cloneRows(rows: any[]) {
  return rows.map((row) => ({ ...row }));
}

function applyFilters(rows: any[], filters: {
  equals: { field: string; value: unknown }[];
  gte?: { field: string; value: string } | null;
  lte?: { field: string; value: string } | null;
}) {
  return rows.filter((row) => {
    const matchesEquals = filters.equals.every(({ field, value }) => row[field] === value);
    const matchesGte = !filters.gte || String(row[filters.gte.field] || '') >= filters.gte.value;
    const matchesLte = !filters.lte || String(row[filters.lte.field] || '') <= filters.lte.value;
    return matchesEquals && matchesGte && matchesLte;
  });
}

function createSelectBuilder(table: string) {
  const filters: {
    equals: { field: string; value: unknown }[];
    gte?: { field: string; value: string } | null;
    lte?: { field: string; value: string } | null;
  } = {
    equals: [],
    gte: null,
    lte: null,
  };

  const builder: any = {
    eq(field: string, value: unknown) {
      filters.equals.push({ field, value });
      return builder;
    },
    gte(field: string, value: string) {
      filters.gte = { field, value };
      return builder;
    },
    lte(field: string, value: string) {
      filters.lte = { field, value };
      return builder;
    },
    then(resolve: (value: { data: any[]; error: null }) => unknown, reject?: (reason?: unknown) => unknown) {
      try {
        const sourceRows = table === 'food_logs' ? foodLogsStore : workoutsStore;
        const data = cloneRows(applyFilters(sourceRows, filters));
        return Promise.resolve(resolve({ data, error: null }));
      } catch (error) {
        if (reject) {
          return Promise.resolve(reject(error));
        }
        return Promise.reject(error);
      }
    },
  };

  return builder;
}

function createInsertBuilder(table: string, rows: any[]) {
  return {
    select() {
      if (table !== 'food_logs') {
        return Promise.resolve({ data: cloneRows(rows), error: null });
      }

      const insertedRows = rows.map((row) => ({
        ...row,
        id: `food-log-${foodLogIdCounter++}`,
        created_at: row.created_at || '2026-03-13T12:00:00.000Z',
        serving_size: row.serving_size || null,
        serving_unit: row.serving_unit || null,
        water_amount: row.water_amount || null,
      }));

      foodLogsStore.push(...insertedRows);
      return Promise.resolve({ data: cloneRows(insertedRows), error: null });
    },
  };
}

const mockFrom = jest.fn((table: string) => ({
  select: () => createSelectBuilder(table),
  insert: (rows: any[] | Record<string, unknown>) =>
    createInsertBuilder(table, Array.isArray(rows) ? rows : [rows]),
}));

jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
  },
}));

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1' },
  }),
}));

jest.mock('../../context/ProfileContext', () => ({
  useProfile: () => ({
    calculatedGoals: { calories: 2000, protein: 150, carbs: 250, fat: 65 },
    isProfileComplete: true,
    isLoading: false,
    calculatedWaterGoal: 2500,
  }),
}));

jest.mock('../../context/GamificationContext', () => ({
  useGamification: () => ({
    awardXP: (...args: any[]) => mockAwardXP(...args),
  }),
}));

jest.mock('../../context/OfflineContext', () => ({
  useOffline: () => ({
    isOnline: true,
    queueOperation: (...args: any[]) => mockQueueOperation(...args),
    checkOnline: (...args: any[]) => mockCheckOnline(...args),
    showOfflineAlert: (...args: any[]) => mockShowOfflineAlert(...args),
  }),
}));

jest.mock('../../lib/sentry', () => ({
  Sentry: {
    captureException: (...args: any[]) => mockCaptureException(...args),
  },
}));

jest.mock('../../lib/activationTracker', () => ({
  recordFoodLogged: (...args: any[]) => mockRecordFoodLogged(...args),
}));

jest.mock('../../lib/frequentFoodsStore', () => ({
  recordFrequentFood: (...args: any[]) => mockRecordFrequentFood(...args),
  mergeFrequentFoods: (...args: any[]) => mockMergeFrequentFoods(...args),
}));

jest.mock('../../lib/recentMeals', () => ({
  replaceRecentMealSnapshot: (...args: any[]) => mockReplaceRecentMealSnapshot(...args),
  syncRecentMealsForDate: (...args: any[]) => mockSyncRecentMealsForDate(...args),
}));

jest.mock('../../lib/haptics', () => ({
  hapticSuccess: jest.fn(async () => undefined),
  hapticLight: jest.fn(async () => undefined),
  hapticImpact: jest.fn(async () => undefined),
}));

import { MealProvider, useMeals } from '../../context/MealContext';

describe('MealContext importFoodDiary', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(MealProvider, { disableInitialFetch: true }, children);

  beforeEach(() => {
    jest.clearAllMocks();
    foodLogsStore = [];
    workoutsStore = [];
    foodLogIdCounter = 1;
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    alertSpy.mockRestore();
  });

  async function renderAndInit() {
    const hook = renderHook(() => useMeals(), { wrapper });
    await waitFor(() => {
      expect(hook.result.current.isLoading).toBe(false);
    });
    return hook;
  }

  it('imports a clean csv into food logs, hydrates day data, and seeds recent/frequent stores', async () => {
    const parsed = parseMyFitnessPalCsv(`
Date,Meal,Food Name,Calories,Protein (g),Carbs (g),Fat (g),Serving
2026-03-10,Breakfast,Greek Yogurt,150,15,10,4,170 g
2026-03-10,Lunch,Chicken Bowl,520,45,35,18,1 bowl
    `);

    const hook = await renderAndInit();

    const importResult = await hook.result.current.importFoodDiary(parsed.entries);
    await act(async () => {
      await Promise.resolve();
    });

    expect(importResult).toEqual({
      importedCount: 2,
      skippedCount: 0,
      dateCount: 1,
    });

    expect(foodLogsStore).toHaveLength(2);
    expect(foodLogsStore).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          date: '2026-03-10',
          meal_type: 'breakfast',
          name: 'Greek Yogurt',
        }),
        expect.objectContaining({
          date: '2026-03-10',
          meal_type: 'lunch',
          name: 'Chicken Bowl',
        }),
      ])
    );

    await waitFor(() => {
      expect(hook.result.current.dayData['2026-03-10'].meals.breakfast[0].name).toBe('Greek Yogurt');
      expect(hook.result.current.dayData['2026-03-10'].meals.lunch[0].name).toBe('Chicken Bowl');
    });

    expect(mockSyncRecentMealsForDate).toHaveBeenCalledWith(
      '2026-03-10',
      expect.objectContaining({
        breakfast: [expect.objectContaining({ name: 'Greek Yogurt' })],
        lunch: [expect.objectContaining({ name: 'Chicken Bowl' })],
      })
    );

    expect(mockMergeFrequentFoods).toHaveBeenCalledWith([
      expect.objectContaining({ name: 'Greek Yogurt', count: 1 }),
      expect.objectContaining({ name: 'Chicken Bowl', count: 1 }),
    ]);

    hook.unmount();
  });

  it('skips duplicate rows when the same csv is imported again', async () => {
    const parsed = parseMyFitnessPalCsv(`
Date,Meal,Food Name,Calories,Protein (g),Carbs (g),Fat (g),Serving
2026-03-10,Breakfast,Greek Yogurt,150,15,10,4,170 g
2026-03-10,Lunch,Chicken Bowl,520,45,35,18,1 bowl
    `);

    const hook = await renderAndInit();

    await hook.result.current.importFoodDiary(parsed.entries);
    await act(async () => {
      await Promise.resolve();
    });

    expect(foodLogsStore).toHaveLength(2);

    const secondImportResult = await hook.result.current.importFoodDiary(parsed.entries);
    await act(async () => {
      await Promise.resolve();
    });

    expect(secondImportResult).toEqual({
      importedCount: 0,
      skippedCount: 2,
      dateCount: 1,
    });

    expect(foodLogsStore).toHaveLength(2);
    expect(mockSyncRecentMealsForDate).toHaveBeenCalledTimes(2);
    expect(mockMergeFrequentFoods).toHaveBeenCalledTimes(2);

    hook.unmount();
  });

  it('copies a repeat meal from fallback snapshot items when the source day is not hydrated', async () => {
    const hook = await renderAndInit();

    const copiedCount = await hook.result.current.copyMeal(
      '2026-03-10',
      'lunch',
      '2026-03-14',
      'lunch',
      [
        {
          name: 'Chicken Bowl',
          calories: 520,
          protein: 45,
          carbs: 35,
          fat: 18,
          serving: '1 bowl',
        },
        {
          name: 'Greek Yogurt',
          calories: 150,
          protein: 15,
          carbs: 10,
          fat: 4,
          serving: '170 g',
        },
      ]
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(copiedCount).toBe(2);
    expect(alertSpy).not.toHaveBeenCalled();
    expect(foodLogsStore).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          date: '2026-03-14',
          meal_type: 'lunch',
          name: 'Chicken Bowl',
        }),
        expect.objectContaining({
          date: '2026-03-14',
          meal_type: 'lunch',
          name: 'Greek Yogurt',
        }),
      ])
    );

    await waitFor(() => {
      expect(hook.result.current.dayData['2026-03-14'].meals.lunch).toHaveLength(2);
    });

    expect(mockReplaceRecentMealSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        dateKey: '2026-03-14',
        mealType: 'lunch',
        items: expect.arrayContaining([
          expect.objectContaining({ name: 'Chicken Bowl' }),
          expect.objectContaining({ name: 'Greek Yogurt' }),
        ]),
      })
    );
    expect(mockRecordFrequentFood).toHaveBeenCalledTimes(2);

    hook.unmount();
  });
});

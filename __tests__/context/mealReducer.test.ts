// Test the mealReducer directly (exported from MealContext)
// We test the pure reducer function without any React context

// The mealReducer will be exported from the converted MealContext.tsx
// For now we import from the module path
import { mealReducer } from '../../context/MealContext';
import type { MealState, MealAction } from '../../types';

const EMPTY_DAY = {
  meals: { breakfast: [], lunch: [], dinner: [], snacks: [] },
  totals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
  waterIntake: 0,
  exercises: [],
  caloriesBurned: 0,
  exerciseMinutes: 0,
};

const initialState: MealState = {
  goals: { calories: 2000, protein: 150, carbs: 250, fat: 65 },
  waterGoal: 2500,
  dayData: {},
  recentLogs: [],
};

describe('mealReducer', () => {
  describe('HYDRATE', () => {
    it('merges payload into state', () => {
      const action: MealAction = {
        type: 'HYDRATE',
        payload: { waterGoal: 3000 },
      };
      const result = mealReducer(initialState, action);
      expect(result.waterGoal).toBe(3000);
      expect(result.goals).toEqual(initialState.goals);
    });

    it('trims dayData to 14 days', () => {
      const dayData: Record<string, typeof EMPTY_DAY> = {};
      for (let i = 0; i < 20; i++) {
        const date = `2024-01-${String(i + 1).padStart(2, '0')}`;
        dayData[date] = { ...EMPTY_DAY };
      }

      const action: MealAction = {
        type: 'HYDRATE',
        payload: { dayData },
      };
      const result = mealReducer(initialState, action);
      expect(Object.keys(result.dayData).length).toBe(14);
    });
  });

  describe('ADD_FOOD', () => {
    it('adds food to the correct meal type', () => {
      const food = {
        id: 1,
        name: 'Chicken',
        calories: 200,
        protein: 30,
        carbs: 0,
        fat: 5,
        serving: '4 oz',
      };

      const action: MealAction = {
        type: 'ADD_FOOD',
        payload: { food, mealType: 'lunch', dateKey: '2024-01-15' },
      };

      const result = mealReducer(initialState, action);
      const day = result.dayData['2024-01-15'];
      expect(day).toBeDefined();
      expect(day!.meals.lunch).toHaveLength(1);
      expect(day!.meals.lunch[0]!.name).toBe('Chicken');
    });

    it('accumulates totals', () => {
      const food1 = { id: 1, name: 'A', calories: 100, protein: 10, carbs: 20, fat: 5, serving: '1' };
      const food2 = { id: 2, name: 'B', calories: 200, protein: 20, carbs: 30, fat: 10, serving: '1' };

      let state = mealReducer(initialState, {
        type: 'ADD_FOOD',
        payload: { food: food1, mealType: 'breakfast', dateKey: '2024-01-15' },
      });
      state = mealReducer(state, {
        type: 'ADD_FOOD',
        payload: { food: food2, mealType: 'lunch', dateKey: '2024-01-15' },
      });

      const day = state.dayData['2024-01-15'];
      expect(day!.totals.calories).toBe(300);
      expect(day!.totals.protein).toBe(30);
      expect(day!.totals.carbs).toBe(50);
      expect(day!.totals.fat).toBe(15);
    });

    it('adds to recentLogs', () => {
      const food = { id: 1, name: 'Test', calories: 100, protein: 10, carbs: 10, fat: 5, serving: '1' };
      const result = mealReducer(initialState, {
        type: 'ADD_FOOD',
        payload: { food, mealType: 'snacks', dateKey: '2024-01-15' },
      });
      expect(result.recentLogs).toHaveLength(1);
      expect(result.recentLogs[0]!.name).toBe('Test');
    });

    it('limits recentLogs to 10', () => {
      let state = initialState;
      for (let i = 0; i < 15; i++) {
        state = mealReducer(state, {
          type: 'ADD_FOOD',
          payload: {
            food: { id: i, name: `Food ${i}`, calories: 100, protein: 10, carbs: 10, fat: 5, serving: '1' },
            mealType: 'snacks',
            dateKey: '2024-01-15',
          },
        });
      }
      expect(state.recentLogs).toHaveLength(10);
    });
  });

  describe('REMOVE_FOOD', () => {
    it('removes food and updates totals', () => {
      const food = { id: 'food-1', name: 'Chicken', calories: 200, protein: 30, carbs: 0, fat: 5, serving: '4 oz' };
      let state = mealReducer(initialState, {
        type: 'ADD_FOOD',
        payload: { food, mealType: 'lunch', dateKey: '2024-01-15' },
      });

      state = mealReducer(state, {
        type: 'REMOVE_FOOD',
        payload: { logId: 'food-1', mealType: 'lunch', dateKey: '2024-01-15' },
      });

      const day = state.dayData['2024-01-15'];
      expect(day!.meals.lunch).toHaveLength(0);
      expect(day!.totals.calories).toBe(0);
      expect(day!.totals.protein).toBe(0);
    });

    it('returns state unchanged if food not found', () => {
      const state = mealReducer(initialState, {
        type: 'REMOVE_FOOD',
        payload: { logId: 'nonexistent', mealType: 'lunch', dateKey: '2024-01-15' },
      });
      expect(state).toBe(initialState);
    });

    it('removes from recentLogs', () => {
      const food = { id: 'food-1', name: 'Test', calories: 100, protein: 10, carbs: 10, fat: 5, serving: '1' };
      let state = mealReducer(initialState, {
        type: 'ADD_FOOD',
        payload: { food, mealType: 'snacks', dateKey: '2024-01-15' },
      });

      state = mealReducer(state, {
        type: 'REMOVE_FOOD',
        payload: { logId: 'food-1', mealType: 'snacks', dateKey: '2024-01-15' },
      });

      expect(state.recentLogs).toHaveLength(0);
    });
  });

  describe('RESET_DAY', () => {
    it('removes all data for the specified date', () => {
      const food = { id: 1, name: 'Food', calories: 100, protein: 10, carbs: 10, fat: 5, serving: '1' };
      let state = mealReducer(initialState, {
        type: 'ADD_FOOD',
        payload: { food, mealType: 'breakfast', dateKey: '2024-01-15' },
      });

      state = mealReducer(state, {
        type: 'RESET_DAY',
        payload: { dateKey: '2024-01-15' },
      });

      expect(state.dayData['2024-01-15']).toBeUndefined();
    });
  });

  describe('ADD_WATER', () => {
    it('adds water intake', () => {
      const state = mealReducer(initialState, {
        type: 'ADD_WATER',
        payload: { amount: 250, dateKey: '2024-01-15' },
      });

      expect(state.dayData['2024-01-15']!.waterIntake).toBe(250);
    });

    it('accumulates water intake', () => {
      let state = mealReducer(initialState, {
        type: 'ADD_WATER',
        payload: { amount: 250, dateKey: '2024-01-15' },
      });
      state = mealReducer(state, {
        type: 'ADD_WATER',
        payload: { amount: 500, dateKey: '2024-01-15' },
      });

      expect(state.dayData['2024-01-15']!.waterIntake).toBe(750);
    });

    it('supports negative amounts (for undo)', () => {
      let state = mealReducer(initialState, {
        type: 'ADD_WATER',
        payload: { amount: 500, dateKey: '2024-01-15' },
      });
      state = mealReducer(state, {
        type: 'ADD_WATER',
        payload: { amount: -250, dateKey: '2024-01-15' },
      });

      expect(state.dayData['2024-01-15']!.waterIntake).toBe(250);
    });
  });

  describe('RESET_WATER', () => {
    it('resets water to 0', () => {
      let state = mealReducer(initialState, {
        type: 'ADD_WATER',
        payload: { amount: 500, dateKey: '2024-01-15' },
      });
      state = mealReducer(state, {
        type: 'RESET_WATER',
        payload: { dateKey: '2024-01-15' },
      });

      expect(state.dayData['2024-01-15']!.waterIntake).toBe(0);
    });
  });

  describe('SET_WATER_GOAL', () => {
    it('updates water goal', () => {
      const state = mealReducer(initialState, {
        type: 'SET_WATER_GOAL',
        payload: 3000,
      });
      expect(state.waterGoal).toBe(3000);
    });
  });

  describe('ADD_EXERCISE', () => {
    it('adds exercise with duration and calories', () => {
      const exercise = { id: 'ex-1', name: 'Running', calories: 0, protein: 0, carbs: 0, fat: 0, serving: '' };
      const state = mealReducer(initialState, {
        type: 'ADD_EXERCISE',
        payload: { exercise, duration: 30, caloriesBurned: 300, dateKey: '2024-01-15' },
      });

      const day = state.dayData['2024-01-15'];
      expect(day!.exercises).toHaveLength(1);
      expect(day!.caloriesBurned).toBe(300);
      expect(day!.exerciseMinutes).toBe(30);
    });

    it('accumulates exercise data', () => {
      const ex1 = { id: 'ex-1', name: 'Run', calories: 0, protein: 0, carbs: 0, fat: 0, serving: '' };
      const ex2 = { id: 'ex-2', name: 'Bike', calories: 0, protein: 0, carbs: 0, fat: 0, serving: '' };

      let state = mealReducer(initialState, {
        type: 'ADD_EXERCISE',
        payload: { exercise: ex1, duration: 30, caloriesBurned: 300, dateKey: '2024-01-15' },
      });
      state = mealReducer(state, {
        type: 'ADD_EXERCISE',
        payload: { exercise: ex2, duration: 45, caloriesBurned: 400, dateKey: '2024-01-15' },
      });

      const day = state.dayData['2024-01-15'];
      expect(day!.exercises).toHaveLength(2);
      expect(day!.caloriesBurned).toBe(700);
      expect(day!.exerciseMinutes).toBe(75);
    });
  });

  describe('REMOVE_EXERCISE', () => {
    it('removes exercise and updates totals', () => {
      const exercise = { id: 'ex-1', name: 'Running', calories: 0, protein: 0, carbs: 0, fat: 0, serving: '' };
      let state = mealReducer(initialState, {
        type: 'ADD_EXERCISE',
        payload: { exercise, duration: 30, caloriesBurned: 300, dateKey: '2024-01-15' },
      });

      state = mealReducer(state, {
        type: 'REMOVE_EXERCISE',
        payload: { logId: 'ex-1', dateKey: '2024-01-15' },
      });

      const day = state.dayData['2024-01-15'];
      expect(day!.exercises).toHaveLength(0);
      expect(day!.caloriesBurned).toBe(0);
      expect(day!.exerciseMinutes).toBe(0);
    });

    it('returns state unchanged if exercise not found', () => {
      const state = mealReducer(initialState, {
        type: 'REMOVE_EXERCISE',
        payload: { logId: 'nonexistent', dateKey: '2024-01-15' },
      });
      expect(state).toBe(initialState);
    });
  });

  describe('UPDATE_GOALS', () => {
    it('merges goal updates', () => {
      const state = mealReducer(initialState, {
        type: 'UPDATE_GOALS',
        payload: { calories: 2500, protein: 180 },
      });

      expect(state.goals.calories).toBe(2500);
      expect(state.goals.protein).toBe(180);
      expect(state.goals.carbs).toBe(250); // unchanged
      expect(state.goals.fat).toBe(65); // unchanged
    });
  });

  describe('unknown action', () => {
    it('returns state unchanged', () => {
      const state = mealReducer(initialState, { type: 'UNKNOWN' } as unknown as MealAction);
      expect(state).toBe(initialState);
    });
  });
});

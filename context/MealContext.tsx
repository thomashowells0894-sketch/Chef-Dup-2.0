import React, {
  createContext,
  useContext,
  useReducer,
  useMemo,
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react';
import { Alert, View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { hapticSuccess, hapticLight, hapticImpact } from '../lib/haptics';
import { format, addDays, subDays, isToday, isTomorrow, isYesterday, isFuture, parseISO } from 'date-fns';
import { useProfile } from './ProfileContext';
import { useGamification } from './GamificationContext';
import { useAuth } from './AuthContext';
import { useOffline } from './OfflineContext';
import { supabase } from '../lib/supabase';
import type {
  MealAction,
  MealState,
  WaterProgress,
  CalorieBalance,
  WeeklyDayData,
  WeeklyStats,
  DateKey,
  MacroSet,
  MealType,
  FoodItem,
  FoodLogEntry,
  ExerciseLog,
  DayData,
  DateDirection,
  MicronutrientSet,
} from '../types';

interface OfflineToast {
  message: string;
  timestamp: number;
}

interface MealContextValue {
  goals: MacroSet;
  waterGoal: number;
  recentLogs: FoodLogEntry[];
  dayData: Record<DateKey, DayData>;
  isLoading: boolean;
  isFetchingDay: boolean;
  selectedDate: Date;
  selectedDateKey: DateKey;
  isPlanningMode: boolean;
  changeDate: (direction: DateDirection) => Promise<void>;
  goToToday: () => Promise<void>;
  goToDate: (date: Date) => Promise<void>;
  getDateLabel: (date: Date) => string;
  getShoppingList: () => ShoppingListItem[];
  meals: Record<MealType, FoodLogEntry[]>;
  totals: MacroSet;
  waterIntake: number;
  exercises: ExerciseLog[];
  caloriesBurned: number;
  exerciseMinutes: number;
  remaining: MacroSet;
  waterProgress: WaterProgress;
  calorieBalance: CalorieBalance;
  mealCalories: Record<MealType, number>;
  weeklyData: WeeklyDayData[];
  weeklyStats: WeeklyStats;
  getCalorieDataForRange: (days: number) => WeeklyDayData[];
  getDayTotals: (dateKey: DateKey) => MacroSet;
  addFood: (food: FoodItem, mealType?: MealType) => Promise<void>;
  removeFood: (logId: string | number, mealType: MealType) => Promise<void>;
  resetDay: () => Promise<void>;
  updateGoals: (goals: Partial<MacroSet>) => void;
  addWater: (amount?: number) => Promise<void>;
  resetWater: () => Promise<void>;
  setWaterGoal: (goal: number) => void;
  addExercise: (exercise: FoodItem, duration: number, caloriesBurned: number) => Promise<void>;
  removeExercise: (logId: string | number) => Promise<void>;
  copyMealFromYesterday: (mealType: MealType) => Promise<number>;
  copyMeal: (sourceDateKey: DateKey, sourceMealType: MealType, targetDateKey: DateKey, targetMealType?: MealType) => Promise<number>;
  copyDay: (sourceDateKey: DateKey, targetDateKey: DateKey) => Promise<number>;
  getDefaultMealType: () => MealType;
  refreshDate: (dateKey?: DateKey) => Promise<void>;
  /** Non-null when a food log was saved offline (for subtle toast display) */
  offlineToast: OfflineToast | null;
  dismissOfflineToast: () => void;
}

interface ShoppingListItem {
  name: string;
  count: number;
  totalCals: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  emoji: string;
}

const MealContext = createContext<MealContextValue | null>(null);

// Default goals (used when profile is not complete)
const DEFAULT_GOALS: MacroSet = {
  calories: 2000,
  protein: 150,
  carbs: 250,
  fat: 65,
};

// Empty day template
const EMPTY_DAY: DayData = {
  meals: { breakfast: [], lunch: [], dinner: [], snacks: [] },
  totals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
  waterIntake: 0,
  exercises: [],
  caloriesBurned: 0,
  exerciseMinutes: 0,
};

const initialState: MealState = {
  goals: DEFAULT_GOALS,
  waterGoal: 2500,
  dayData: {},
  recentLogs: [],
};

// --- Pure helpers ---

function formatDateKey(date: Date): DateKey {
  return format(date, 'yyyy-MM-dd');
}

function getTodayString(): DateKey {
  return formatDateKey(new Date());
}

function getDayData(state: MealState, dateKey: DateKey): DayData {
  return state.dayData[dateKey] || { ...EMPTY_DAY, meals: { ...EMPTY_DAY.meals } };
}

function getDefaultMealType(): MealType {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return 'breakfast';
  if (hour >= 11 && hour < 15) return 'lunch';
  if (hour >= 15 && hour < 20) return 'dinner';
  return 'snacks';
}

function getDateString(daysOffset: number = 0): DateKey {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return formatDateKey(date);
}

function getDayLabel(dateString: string): string {
  const date = parseISO(dateString);
  return format(date, 'EEE');
}

function getCalorieData(dayData: Record<DateKey, DayData>, goal: number, days: number = 7): WeeklyDayData[] {
  const result: WeeklyDayData[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const dateStr = getDateString(-i);
    const dayLabel = getDayLabel(dateStr);
    const data = dayData[dateStr];
    if (data && data.totals) {
      result.push({
        date: dateStr, day: dayLabel,
        calories: data.totals.calories, protein: data.totals.protein,
        carbs: data.totals.carbs, fat: data.totals.fat,
        goal, isToday: i === 0,
      });
    } else {
      result.push({
        date: dateStr, day: dayLabel,
        calories: 0, protein: 0, carbs: 0, fat: 0,
        goal, isToday: i === 0, noData: true,
      });
    }
  }
  return result;
}

function calcWeeklyStats(weekData: WeeklyDayData[]): WeeklyStats {
  const daysWithData = weekData.filter((d) => !d.noData && d.calories > 0);
  if (daysWithData.length === 0) {
    return { totalCalories: 0, avgCalories: 0, daysUnderGoal: 0, daysOverGoal: 0, daysOnTrack: 0, caloriesVsBudget: 0, totalProtein: 0, avgProtein: 0, daysTracked: 0 };
  }
  const totalCalories = daysWithData.reduce((s, d) => s + d.calories, 0);
  const totalGoal = daysWithData.reduce((s, d) => s + d.goal, 0);
  const daysUnderGoal = daysWithData.filter((d) => d.calories <= d.goal).length;
  const totalProtein = daysWithData.reduce((s, d) => s + d.protein, 0);
  return {
    totalCalories,
    avgCalories: Math.round(totalCalories / daysWithData.length),
    daysUnderGoal,
    daysOverGoal: daysWithData.filter((d) => d.calories > d.goal).length,
    daysOnTrack: daysUnderGoal,
    caloriesVsBudget: totalGoal - totalCalories,
    totalProtein,
    avgProtein: Math.round(totalProtein / daysWithData.length),
    daysTracked: daysWithData.length,
  };
}

// --- Reducer ---

export function mealReducer(state: MealState, action: MealAction): MealState {
  switch (action.type) {
    case 'HYDRATE': {
      const merged = { ...state, ...action.payload };
      // LRU eviction: keep only last 14 days of cached day data
      if (merged.dayData) {
        const keys = Object.keys(merged.dayData);
        if (keys.length > 14) {
          const sorted = keys.sort();
          const toRemove = sorted.slice(0, keys.length - 14);
          const trimmed = { ...merged.dayData };
          toRemove.forEach(k => delete trimmed[k]);
          merged.dayData = trimmed;
        }
      }
      return merged;
    }

    case 'ADD_FOOD': {
      const { food, mealType = 'snacks', dateKey } = action.payload;
      const logEntry: FoodLogEntry = { ...food, id: food.id || Date.now(), loggedAt: new Date().toISOString(), mealType, dateKey };
      const day = getDayData(state, dateKey);
      return {
        ...state,
        dayData: {
          ...state.dayData,
          [dateKey]: {
            ...day,
            totals: {
              calories: day.totals.calories + food.calories,
              protein: day.totals.protein + food.protein,
              carbs: day.totals.carbs + food.carbs,
              fat: day.totals.fat + food.fat,
            },
            meals: { ...day.meals, [mealType]: [...(day.meals[mealType] || []), logEntry] },
          },
        },
        recentLogs: [logEntry, ...state.recentLogs].slice(0, 10),
      };
    }

    case 'REMOVE_FOOD': {
      const { logId, mealType, dateKey } = action.payload;
      const day = getDayData(state, dateKey);
      const item = day.meals[mealType]?.find((f) => f.id === logId);
      if (!item) return state;
      return {
        ...state,
        dayData: {
          ...state.dayData,
          [dateKey]: {
            ...day,
            totals: {
              calories: day.totals.calories - item.calories,
              protein: day.totals.protein - item.protein,
              carbs: day.totals.carbs - item.carbs,
              fat: day.totals.fat - item.fat,
            },
            meals: { ...day.meals, [mealType]: day.meals[mealType].filter((f) => f.id !== logId) },
          },
        },
        recentLogs: state.recentLogs.filter((f) => f.id !== logId),
      };
    }

    case 'RESET_DAY': {
      const newDayData = { ...state.dayData };
      delete newDayData[action.payload.dateKey];
      return { ...state, dayData: newDayData };
    }

    case 'ADD_WATER': {
      const { amount, dateKey } = action.payload;
      const day = getDayData(state, dateKey);
      return {
        ...state,
        dayData: {
          ...state.dayData,
          [dateKey]: { ...day, waterIntake: (day.waterIntake || 0) + amount },
        },
      };
    }

    case 'RESET_WATER': {
      const day = getDayData(state, action.payload.dateKey);
      return {
        ...state,
        dayData: {
          ...state.dayData,
          [action.payload.dateKey]: { ...day, waterIntake: 0 },
        },
      };
    }

    case 'SET_WATER_GOAL':
      return { ...state, waterGoal: action.payload };

    case 'ADD_EXERCISE': {
      const { exercise, duration, caloriesBurned, dateKey } = action.payload;
      const logEntry: ExerciseLog = { ...exercise, id: exercise.id || Date.now(), loggedAt: new Date().toISOString(), duration, caloriesBurned, dateKey };
      const day = getDayData(state, dateKey);
      return {
        ...state,
        dayData: {
          ...state.dayData,
          [dateKey]: {
            ...day,
            exercises: [...(day.exercises || []), logEntry],
            caloriesBurned: (day.caloriesBurned || 0) + caloriesBurned,
            exerciseMinutes: (day.exerciseMinutes || 0) + duration,
          },
        },
      };
    }

    case 'REMOVE_EXERCISE': {
      const { logId, dateKey } = action.payload;
      const day = getDayData(state, dateKey);
      const ex = day.exercises?.find((e) => e.id === logId);
      if (!ex) return state;
      return {
        ...state,
        dayData: {
          ...state.dayData,
          [dateKey]: {
            ...day,
            exercises: day.exercises.filter((e) => e.id !== logId),
            caloriesBurned: (day.caloriesBurned || 0) - ex.caloriesBurned,
            exerciseMinutes: (day.exerciseMinutes || 0) - ex.duration,
          },
        },
      };
    }

    case 'UPDATE_GOALS':
      return { ...state, goals: { ...state.goals, ...action.payload } };

    default:
      return state;
  }
}

// --- Provider ---

export function MealProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [state, dispatch] = useReducer(mealReducer, initialState);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isHydrated, setIsHydrated] = useState<boolean>(false);
  const [isFetchingDay, setIsFetchingDay] = useState<boolean>(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [offlineToast, setOfflineToast] = useState<OfflineToast | null>(null);
  const fetchedDatesRef = useRef<Set<string>>(new Set());

  // Ref for stable access to current state without dependency churn
  const stateRef = useRef<MealState>(state);
  stateRef.current = state;

  const { calculatedGoals, isProfileComplete, isLoading: profileLoading, calculatedWaterGoal } = useProfile();
  const { awardXP } = useGamification();
  const { isOnline: networkOnline, queueOperation, checkOnline, showOfflineAlert } = useOffline();

  const selectedDateKey = useMemo<DateKey>(() => formatDateKey(selectedDate), [selectedDate]);
  const isPlanningMode = useMemo<boolean>(() => isFuture(selectedDate) && !isToday(selectedDate), [selectedDate]);

  // Sync water goal from profile
  useEffect(() => {
    if (isHydrated && calculatedWaterGoal && calculatedWaterGoal !== state.waterGoal) {
      dispatch({ type: 'SET_WATER_GOAL', payload: calculatedWaterGoal });
    }
  }, [calculatedWaterGoal, isHydrated, state.waterGoal]);

  // Fetch data for a specific date from Supabase
  const fetchDayData = useCallback(async (dateKey: DateKey) => {
    if (!user) return;
    if (!(await checkOnline())) return;

    setIsFetchingDay(true);
    try {
      const [foodResult, workoutResult] = await Promise.all([
        supabase.from('food_logs').select('*').eq('user_id', user.id).eq('date', dateKey),
        supabase.from('workouts').select('*').eq('user_id', user.id).eq('date', dateKey),
      ]);

      const { data: foodLogs, error: foodError } = foodResult;
      const { data: workouts, error: workoutError } = workoutResult;
      if (foodError && __DEV__) console.error('[Meal] Food fetch error:', foodError.message);
      if (workoutError && __DEV__) console.error('[Meal] Workout fetch error:', workoutError.message);

      const meals: Record<MealType, FoodLogEntry[]> = { breakfast: [], lunch: [], dinner: [], snacks: [] };
      const totals: MacroSet = { calories: 0, protein: 0, carbs: 0, fat: 0 };
      let waterIntake = 0;

      if (foodLogs) {
        foodLogs.forEach((log: any) => {
          if (log.name === 'Water' && log.calories === 0) {
            waterIntake += log.water_amount || 250;
          } else {
            const mt = (log.meal_type || 'snacks') as MealType;
            const foodItem: FoodLogEntry = {
              id: log.id, name: log.name || 'Food', emoji: log.emoji || '🍽️',
              calories: log.calories || 0, protein: log.protein || 0,
              carbs: log.carbs || 0, fat: log.fat || 0,
              serving: log.serving, servingSize: log.serving_size, servingUnit: log.serving_unit,
              loggedAt: log.created_at, mealType: mt, dateKey,
            };
            meals[mt].push(foodItem);
            totals.calories += foodItem.calories;
            totals.protein += foodItem.protein;
            totals.carbs += foodItem.carbs;
            totals.fat += foodItem.fat;
          }
        });
      }

      const exercises: ExerciseLog[] = [];
      let caloriesBurned = 0;
      let exerciseMinutes = 0;
      if (workouts) {
        workouts.forEach((w: any) => {
          exercises.push({
            id: w.id, name: w.name, emoji: w.emoji || '🏃',
            duration: w.duration || 0, caloriesBurned: w.calories_burned || 0,
            loggedAt: w.created_at, dateKey,
          });
          caloriesBurned += w.calories_burned || 0;
          exerciseMinutes += w.duration || 0;
        });
      }

      dispatch({
        type: 'HYDRATE',
        payload: {
          dayData: {
            ...stateRef.current.dayData,
            [dateKey]: { meals, totals, waterIntake, exercises, caloriesBurned, exerciseMinutes },
          },
        },
      });

      fetchedDatesRef.current.add(dateKey);
    } catch (error: any) {
      if (__DEV__) console.error('[Meal] Fetch failed:', error.message);
    } finally {
      setIsFetchingDay(false);
    }
  }, [user, checkOnline]);

  // Initial load
  useEffect(() => {
    if (!user) {
      dispatch({ type: 'HYDRATE', payload: initialState });
      setIsLoading(false);
      setIsHydrated(true);
      fetchedDatesRef.current.clear();
      return;
    }
    (async () => {
      setIsLoading(true);
      try {
        await fetchDayData(getTodayString());
      } catch (error: any) {
        if (__DEV__) console.error('[Meal] Initial load failed:', error.message);
      } finally {
        setIsLoading(false);
        setIsHydrated(true);
      }
    })();
  }, [user]);

  // Fetch when selected date changes + prefetch adjacent days
  useEffect(() => {
    if (!user || !isHydrated) return;
    if (!fetchedDatesRef.current.has(selectedDateKey)) {
      fetchDayData(selectedDateKey);
    }
    // Background prefetch yesterday & tomorrow for instant date navigation
    const yesterday = formatDateKey(subDays(selectedDate, 1));
    const tomorrow = formatDateKey(addDays(selectedDate, 1));
    if (!fetchedDatesRef.current.has(yesterday)) {
      // Use setTimeout to avoid blocking the current fetch
      setTimeout(() => fetchDayData(yesterday), 200);
    }
    if (!fetchedDatesRef.current.has(tomorrow)) {
      setTimeout(() => fetchDayData(tomorrow), 400);
    }
  }, [user, isHydrated, selectedDateKey, selectedDate, fetchDayData]);

  // --- Haptics ---
  const triggerHaptic = useCallback(async (type: string = 'success') => {
    if (type === 'success') await hapticSuccess();
    else if (type === 'light') await hapticLight();
    else if (type === 'medium') await hapticImpact();
  }, []);

  // --- Offline toast (subtle, non-blocking) ---
  const showSubtleOfflineToast = useCallback((action: string) => {
    setOfflineToast({ message: `${action} saved offline -- will sync when connected`, timestamp: Date.now() });
    // Auto-dismiss after 3 seconds
    setTimeout(() => setOfflineToast(null), 3000);
  }, []);

  const dismissOfflineToast = useCallback(() => {
    setOfflineToast(null);
  }, []);

  // --- Date nav ---
  const changeDate = useCallback(async (direction: DateDirection) => {
    await triggerHaptic('light');
    setSelectedDate((current) => {
      if (direction === 'next' || direction === 1) return addDays(current, 1);
      if (direction === 'prev' || direction === -1) return subDays(current, 1);
      return current;
    });
  }, [triggerHaptic]);

  const goToToday = useCallback(async () => {
    await triggerHaptic('light');
    setSelectedDate(new Date());
  }, [triggerHaptic]);

  const goToDate = useCallback(async (date: Date) => {
    await triggerHaptic('light');
    setSelectedDate(date);
  }, [triggerHaptic]);

  const getDateLabel = useCallback((date: Date): string => {
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMM d');
  }, []);

  // --- Refresh date data ---
  const refreshDate = useCallback(async (dateKey?: DateKey) => {
    const key = dateKey || selectedDateKey;
    fetchedDatesRef.current.delete(key);
    await fetchDayData(key);
  }, [selectedDateKey, fetchDayData]);

  // --- Shopping list ---
  const getShoppingList = useCallback((): ShoppingListItem[] => {
    const aggregatedItems: Record<string, ShoppingListItem> = {};
    const today = new Date();
    for (let i = 1; i <= 7; i++) {
      const futureDate = addDays(today, i);
      const dateKey = formatDateKey(futureDate);
      const dayData = stateRef.current.dayData[dateKey];
      if (!dayData || !dayData.meals) continue;
      for (const mealType of ['breakfast', 'lunch', 'dinner', 'snacks'] as MealType[]) {
        for (const item of dayData.meals[mealType] || []) {
          const key = item.name.toLowerCase().trim();
          if (!aggregatedItems[key]) {
            aggregatedItems[key] = { name: item.name, count: 0, totalCals: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0, emoji: item.emoji || '🍽️' };
          }
          aggregatedItems[key].count += 1;
          aggregatedItems[key].totalCals += item.calories || 0;
          aggregatedItems[key].totalProtein += item.protein || 0;
          aggregatedItems[key].totalCarbs += item.carbs || 0;
          aggregatedItems[key].totalFat += item.fat || 0;
        }
      }
    }
    return Object.values(aggregatedItems).sort((a, b) => b.count - a.count);
  }, []);

  // --- Actions ---
  const actions = useMemo(
    () => ({
      addFood: async (food: FoodItem, mealType?: MealType) => {
        if (!user) return;
        const effectiveMealType = mealType || getDefaultMealType();
        const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const optimisticFood = { ...food, id: tempId };

        // Validate food input
        const foodName = (food.name || '').trim();
        if (!foodName || foodName.length > 200) {
          Alert.alert('Invalid Food', 'Food name must be between 1 and 200 characters.');
          return;
        }
        const cal = Number(food.calories) || 0;
        const pro = Number(food.protein) || 0;
        const carb = Number(food.carbs) || 0;
        const fatVal = Number(food.fat) || 0;
        if (cal < 0 || cal > 10000 || pro < 0 || pro > 1000 || carb < 0 || carb > 1000 || fatVal < 0 || fatVal > 1000) {
          Alert.alert('Invalid Nutrition', 'Please check the nutrition values are reasonable.');
          return;
        }

        // Optimistic update -- food appears instantly in UI regardless of network
        dispatch({ type: 'ADD_FOOD', payload: { food: optimisticFood, mealType: effectiveMealType, dateKey: selectedDateKey } });
        if (!isPlanningMode) awardXP('LOG_FOOD');
        await triggerHaptic('success');

        const online = await checkOnline();
        if (!online) {
          // Queue for later sync instead of rollback -- food stays in local state
          await queueOperation({
            table: 'food_logs',
            type: 'INSERT',
            payload: {
              user_id: user.id, date: selectedDateKey,
              name: (food.name || '').trim(), calories: food.calories || 0,
              protein: food.protein || 0, carbs: food.carbs || 0, fat: food.fat || 0,
              meal_type: effectiveMealType,
            },
            tempId,
          });
          // Subtle non-blocking indicator instead of Alert dialog
          showSubtleOfflineToast('Food log');
          return;
        }

        try {
          const { data, error } = await supabase
            .from('food_logs')
            .insert({
              user_id: user.id, date: selectedDateKey,
              name: (food.name || '').trim(), calories: food.calories || 0,
              protein: food.protein || 0, carbs: food.carbs || 0, fat: food.fat || 0,
              meal_type: effectiveMealType,
            })
            .select().single();

          if (error) {
            dispatch({ type: 'REMOVE_FOOD', payload: { logId: tempId, mealType: effectiveMealType, dateKey: selectedDateKey } });
            Alert.alert('Error', 'Failed to save food. Please try again.');
            return;
          }

          // Replace temp ID with server ID
          dispatch({ type: 'REMOVE_FOOD', payload: { logId: tempId, mealType: effectiveMealType, dateKey: selectedDateKey } });
          dispatch({ type: 'ADD_FOOD', payload: { food: { ...food, id: data.id }, mealType: effectiveMealType, dateKey: selectedDateKey } });
        } catch {
          dispatch({ type: 'REMOVE_FOOD', payload: { logId: tempId, mealType: effectiveMealType, dateKey: selectedDateKey } });
          Alert.alert('Error', 'Failed to save food. Please try again.');
        }
      },

      removeFood: async (logId: string | number, mealType: MealType) => {
        if (!user) return;

        // Optimistic removal — food disappears instantly regardless of network
        dispatch({ type: 'REMOVE_FOOD', payload: { logId, mealType, dateKey: selectedDateKey } });
        await triggerHaptic('light');

        const online = await checkOnline();
        if (!online) {
          await queueOperation({
            table: 'food_logs',
            type: 'DELETE',
            payload: { id: logId, user_id: user.id },
          });
          showSubtleOfflineToast('Food removal');
          return;
        }

        try {
          const { error } = await supabase.from('food_logs').delete().eq('id', logId).eq('user_id', user.id);
          if (error) {
            if (__DEV__) console.error('[Meal] Remove error:', error.code);
          }
        } catch (error: any) {
          if (__DEV__) console.error('[Meal] Remove failed:', error.message);
        }
      },

      resetDay: async () => {
        if (!user) return;
        if (!(await checkOnline())) { showOfflineAlert('reset day'); return; }
        try {
          await Promise.all([
            supabase.from('food_logs').delete().eq('user_id', user.id).eq('date', selectedDateKey),
            supabase.from('workouts').delete().eq('user_id', user.id).eq('date', selectedDateKey),
          ]);
          dispatch({ type: 'RESET_DAY', payload: { dateKey: selectedDateKey } });
          fetchedDatesRef.current.delete(selectedDateKey);
          await triggerHaptic('medium');
        } catch (error: any) {
          if (__DEV__) console.error('[Meal] Reset failed:', error.message);
        }
      },

      updateGoals: (goals: Partial<MacroSet>) => dispatch({ type: 'UPDATE_GOALS', payload: goals }),

      addWater: async (amount: number = 250) => {
        if (!user) return;
        dispatch({ type: 'ADD_WATER', payload: { amount, dateKey: selectedDateKey } });
        if (!isPlanningMode) awardXP('LOG_WATER');
        await triggerHaptic('light');

        const online = await checkOnline();
        if (!online) {
          await queueOperation({
            table: 'food_logs', type: 'INSERT',
            payload: { user_id: user.id, date: selectedDateKey, name: 'Water', calories: 0, protein: 0, carbs: 0, fat: 0 },
          });
          showOfflineAlert('water log');
          return;
        }
        try {
          const { error } = await supabase.from('food_logs')
            .insert({ user_id: user.id, date: selectedDateKey, name: 'Water', calories: 0, protein: 0, carbs: 0, fat: 0 })
            .select();
          if (error) {
            dispatch({ type: 'ADD_WATER', payload: { amount: -amount, dateKey: selectedDateKey } });
            Alert.alert('Error', 'Failed to save water. Please try again.');
          }
        } catch {
          dispatch({ type: 'ADD_WATER', payload: { amount: -amount, dateKey: selectedDateKey } });
          Alert.alert('Error', 'Failed to save water. Please try again.');
        }
      },

      resetWater: async () => {
        if (!user) return;
        if (!(await checkOnline())) { showOfflineAlert('reset water'); return; }
        try {
          const { error } = await supabase.from('food_logs').delete()
            .eq('user_id', user.id).eq('date', selectedDateKey).eq('name', 'Water');
          if (error) { if (__DEV__) console.error('[Meal] Reset water error:', error.code); return; }
          dispatch({ type: 'RESET_WATER', payload: { dateKey: selectedDateKey } });
          await triggerHaptic('medium');
        } catch (error: any) {
          if (__DEV__) console.error('[Meal] Reset water failed:', error.message);
        }
      },

      setWaterGoal: (goal: number) => dispatch({ type: 'SET_WATER_GOAL', payload: goal }),

      addExercise: async (exercise: FoodItem, duration: number, caloriesBurned: number) => {
        if (!user) return;
        const tempId = `temp-ex-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const optimisticExercise = { ...exercise, id: tempId };
        dispatch({ type: 'ADD_EXERCISE', payload: { exercise: optimisticExercise, duration, caloriesBurned, dateKey: selectedDateKey } });
        if (!isPlanningMode) awardXP('LOG_EXERCISE');
        await triggerHaptic('success');

        const online = await checkOnline();
        if (!online) {
          await queueOperation({
            table: 'workouts', type: 'INSERT',
            payload: { user_id: user.id, date: selectedDateKey, name: (exercise.name || '').trim(), duration, calories_burned: caloriesBurned },
          });
          showOfflineAlert('exercise log');
          return;
        }

        try {
          const { data, error } = await supabase.from('workouts')
            .insert({ user_id: user.id, date: selectedDateKey, name: (exercise.name || '').trim(), duration, calories_burned: caloriesBurned })
            .select().single();
          if (error) {
            dispatch({ type: 'REMOVE_EXERCISE', payload: { logId: tempId, dateKey: selectedDateKey } });
            Alert.alert('Error', 'Failed to save exercise. Please try again.');
            return;
          }
          dispatch({ type: 'REMOVE_EXERCISE', payload: { logId: tempId, dateKey: selectedDateKey } });
          dispatch({ type: 'ADD_EXERCISE', payload: { exercise: { ...exercise, id: data.id }, duration, caloriesBurned, dateKey: selectedDateKey } });
        } catch {
          dispatch({ type: 'REMOVE_EXERCISE', payload: { logId: tempId, dateKey: selectedDateKey } });
          Alert.alert('Error', 'Failed to save exercise. Please try again.');
        }
      },

      removeExercise: async (logId: string | number) => {
        if (!user) return;
        if (!(await checkOnline())) { showOfflineAlert('remove exercise'); return; }
        try {
          const { error } = await supabase.from('workouts').delete().eq('id', logId).eq('user_id', user.id);
          if (error) { if (__DEV__) console.error('[Meal] Remove exercise error:', error.code); return; }
          dispatch({ type: 'REMOVE_EXERCISE', payload: { logId, dateKey: selectedDateKey } });
          await triggerHaptic('light');
        } catch (error: any) {
          if (__DEV__) console.error('[Meal] Remove exercise failed:', error.message);
        }
      },

      /**
       * MISSION 2: Copy all items from yesterday's meal into today.
       * @param mealType - 'breakfast' | 'lunch' | 'dinner' | 'snacks'
       * @returns count of items copied
       */
      copyMealFromYesterday: async (mealType: MealType): Promise<number> => {
        if (!user) return 0;

        const yesterdayKey = formatDateKey(subDays(selectedDate, 1));

        if (!fetchedDatesRef.current.has(yesterdayKey)) {
          await fetchDayData(yesterdayKey);
        }

        const yesterdayData = getDayData(stateRef.current, yesterdayKey);
        const items = yesterdayData.meals[mealType] || [];

        if (items.length === 0) {
          Alert.alert('Nothing to Copy', `You didn't log any ${mealType} yesterday.`);
          return 0;
        }

        // Build all foods + optimistic entries at once
        const entries = items.map(item => {
          const food: FoodItem = {
            name: item.name, emoji: item.emoji,
            calories: item.calories, protein: item.protein,
            carbs: item.carbs, fat: item.fat,
            serving: item.serving, servingSize: item.servingSize, servingUnit: item.servingUnit,
          } as FoodItem;
          const tempId = `temp-copy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          return { food, tempId };
        });

        // Optimistic: add all items to UI immediately
        for (const { food, tempId } of entries) {
          dispatch({ type: 'ADD_FOOD', payload: { food: { ...food, id: tempId }, mealType, dateKey: selectedDateKey } });
        }

        const online = await checkOnline();
        if (!online) {
          for (const { food } of entries) {
            await queueOperation({
              table: 'food_logs', type: 'INSERT',
              payload: {
                user_id: user.id, date: selectedDateKey,
                name: (food.name || '').trim(), calories: food.calories || 0,
                protein: food.protein || 0, carbs: food.carbs || 0, fat: food.fat || 0,
                meal_type: mealType,
              },
            });
          }
          showSubtleOfflineToast('Meal copy');
        } else {
          // Batch insert — single network round-trip
          const rows = entries.map(({ food }) => ({
            user_id: user.id, date: selectedDateKey,
            name: (food.name || '').trim(), calories: food.calories || 0,
            protein: food.protein || 0, carbs: food.carbs || 0, fat: food.fat || 0,
            meal_type: mealType,
          }));
          try {
            const { data, error } = await supabase.from('food_logs').insert(rows).select();
            if (!error && data) {
              // Replace temp IDs with server IDs
              entries.forEach(({ food, tempId }, i) => {
                if (data[i]) {
                  dispatch({ type: 'REMOVE_FOOD', payload: { logId: tempId, mealType, dateKey: selectedDateKey } });
                  dispatch({ type: 'ADD_FOOD', payload: { food: { ...food, id: data[i].id }, mealType, dateKey: selectedDateKey } });
                }
              });
            }
          } catch {
            // Keep optimistic entries
          }
        }

        if (!isPlanningMode) awardXP('LOG_FOOD');
        await triggerHaptic('success');
        return entries.length;
      },

      /**
       * Copy a single meal from one date to another.
       * @param srcDateKey  - source date key (YYYY-MM-DD)
       * @param srcMealType - source meal type
       * @param tgtDateKey  - target date key
       * @param tgtMealType - target meal type (defaults to same as source)
       * @returns count of items copied
       */
      copyMeal: async (srcDateKey: DateKey, srcMealType: MealType, tgtDateKey: DateKey, tgtMealType?: MealType): Promise<number> => {
        if (!user) return 0;
        const effectiveTargetMeal = tgtMealType || srcMealType;

        if (!fetchedDatesRef.current.has(srcDateKey)) {
          await fetchDayData(srcDateKey);
        }

        const srcDay = getDayData(stateRef.current, srcDateKey);
        const items = srcDay.meals[srcMealType] || [];

        if (items.length === 0) {
          Alert.alert('Nothing to Copy', `No ${srcMealType} items found on that day.`);
          return 0;
        }

        const entries = items.map(item => {
          const food: FoodItem = {
            name: item.name, emoji: item.emoji,
            calories: item.calories, protein: item.protein,
            carbs: item.carbs, fat: item.fat,
            serving: item.serving, servingSize: item.servingSize, servingUnit: item.servingUnit,
          } as FoodItem;
          const tempId = `temp-copy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          return { food, tempId };
        });

        for (const { food, tempId } of entries) {
          dispatch({ type: 'ADD_FOOD', payload: { food: { ...food, id: tempId }, mealType: effectiveTargetMeal, dateKey: tgtDateKey } });
        }

        const online = await checkOnline();
        if (!online) {
          for (const { food } of entries) {
            await queueOperation({
              table: 'food_logs', type: 'INSERT',
              payload: {
                user_id: user.id, date: tgtDateKey,
                name: (food.name || '').trim(), calories: food.calories || 0,
                protein: food.protein || 0, carbs: food.carbs || 0, fat: food.fat || 0,
                meal_type: effectiveTargetMeal,
              },
            });
          }
          showSubtleOfflineToast('Meal copy');
        } else {
          const rows = entries.map(({ food }) => ({
            user_id: user.id, date: tgtDateKey,
            name: (food.name || '').trim(), calories: food.calories || 0,
            protein: food.protein || 0, carbs: food.carbs || 0, fat: food.fat || 0,
            meal_type: effectiveTargetMeal,
          }));
          try {
            const { data, error } = await supabase.from('food_logs').insert(rows).select();
            if (!error && data) {
              entries.forEach(({ food, tempId }, i) => {
                if (data[i]) {
                  dispatch({ type: 'REMOVE_FOOD', payload: { logId: tempId, mealType: effectiveTargetMeal, dateKey: tgtDateKey } });
                  dispatch({ type: 'ADD_FOOD', payload: { food: { ...food, id: data[i].id }, mealType: effectiveTargetMeal, dateKey: tgtDateKey } });
                }
              });
            }
          } catch {
            // Keep optimistic entries
          }
        }

        await triggerHaptic('success');
        return entries.length;
      },

      /**
       * Copy all meals from one day to another.
       * @param srcDateKey - source date key (YYYY-MM-DD)
       * @param tgtDateKey - target date key
       * @returns total count of items copied across all meals
       */
      copyDay: async (srcDateKey: DateKey, tgtDateKey: DateKey): Promise<number> => {
        if (!user) return 0;

        if (!fetchedDatesRef.current.has(srcDateKey)) {
          await fetchDayData(srcDateKey);
        }

        const srcDay = getDayData(stateRef.current, srcDateKey);
        const allMealTypes: MealType[] = ['breakfast', 'lunch', 'dinner', 'snacks'];

        // Collect all entries across all meal types
        const entries: { food: FoodItem; tempId: string; mt: MealType }[] = [];
        for (const mt of allMealTypes) {
          for (const item of srcDay.meals[mt] || []) {
            const food: FoodItem = {
              name: item.name, emoji: item.emoji,
              calories: item.calories, protein: item.protein,
              carbs: item.carbs, fat: item.fat,
              serving: item.serving, servingSize: item.servingSize, servingUnit: item.servingUnit,
            } as FoodItem;
            const tempId = `temp-copyday-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            entries.push({ food, tempId, mt });
          }
        }

        if (entries.length === 0) {
          Alert.alert('Nothing to Copy', 'No food items found on that day.');
          return 0;
        }

        // Optimistic: add all items to UI immediately
        for (const { food, tempId, mt } of entries) {
          dispatch({ type: 'ADD_FOOD', payload: { food: { ...food, id: tempId }, mealType: mt, dateKey: tgtDateKey } });
        }

        const online = await checkOnline();
        if (!online) {
          for (const { food, mt } of entries) {
            await queueOperation({
              table: 'food_logs', type: 'INSERT',
              payload: {
                user_id: user.id, date: tgtDateKey,
                name: (food.name || '').trim(), calories: food.calories || 0,
                protein: food.protein || 0, carbs: food.carbs || 0, fat: food.fat || 0,
                meal_type: mt,
              },
            });
          }
          showSubtleOfflineToast('Day copy');
        } else {
          // Batch insert — single network round-trip for entire day
          const rows = entries.map(({ food, mt }) => ({
            user_id: user.id, date: tgtDateKey,
            name: (food.name || '').trim(), calories: food.calories || 0,
            protein: food.protein || 0, carbs: food.carbs || 0, fat: food.fat || 0,
            meal_type: mt,
          }));
          try {
            const { data, error } = await supabase.from('food_logs').insert(rows).select();
            if (!error && data) {
              entries.forEach(({ food, tempId, mt }, i) => {
                if (data[i]) {
                  dispatch({ type: 'REMOVE_FOOD', payload: { logId: tempId, mealType: mt, dateKey: tgtDateKey } });
                  dispatch({ type: 'ADD_FOOD', payload: { food: { ...food, id: data[i].id }, mealType: mt, dateKey: tgtDateKey } });
                }
              });
            }
          } catch {
            // Keep optimistic entries
          }
        }

        await triggerHaptic('success');
        return entries.length;
      },
    }),
    [user, selectedDateKey, selectedDate, isPlanningMode, triggerHaptic, awardXP, checkOnline, queueOperation, showOfflineAlert, showSubtleOfflineToast, fetchDayData]
  );

  // Profile-aware goals
  const activeGoals = useMemo<MacroSet>(() => {
    if (isProfileComplete && calculatedGoals) {
      return { calories: calculatedGoals.calories, protein: calculatedGoals.protein, carbs: calculatedGoals.carbs, fat: calculatedGoals.fat };
    }
    return state.goals;
  }, [isProfileComplete, calculatedGoals, state.goals]);

  const currentDayData = useMemo<DayData>(() => getDayData(state, selectedDateKey), [state, selectedDateKey]);

  const weeklyData = useMemo<WeeklyDayData[]>(() => getCalorieData(state.dayData, activeGoals.calories, 7), [state.dayData, activeGoals.calories]);
  const weeklyStats = useMemo<WeeklyStats>(() => calcWeeklyStats(weeklyData), [weeklyData]);

  // Extended range data for stats screen (30/90 day)
  const getCalorieDataForRange = useCallback((days: number): WeeklyDayData[] => {
    return getCalorieData(stateRef.current.dayData, activeGoals.calories, days);
  }, [activeGoals.calories]);

  // Get totals for any given date key (used by MorningBriefing)
  const getDayTotals = useCallback((dateKey: DateKey): MacroSet => {
    return getDayData(stateRef.current, dateKey).totals;
  }, []);

  const mealCalories = useMemo<Record<MealType, number>>(() => {
    const meals = currentDayData.meals;
    return {
      breakfast: meals.breakfast?.reduce((s, i) => s + i.calories, 0) || 0,
      lunch: meals.lunch?.reduce((s, i) => s + i.calories, 0) || 0,
      dinner: meals.dinner?.reduce((s, i) => s + i.calories, 0) || 0,
      snacks: meals.snacks?.reduce((s, i) => s + i.calories, 0) || 0,
    };
  }, [currentDayData.meals]);

  const waterProgress = useMemo<WaterProgress>(() => {
    const waterIntake = currentDayData.waterIntake || 0;
    const glasses = Math.floor(waterIntake / 250);
    const glassesGoal = Math.floor(state.waterGoal / 250);
    const percentage = Math.min((waterIntake / state.waterGoal) * 100, 100);
    return { ml: waterIntake, goal: state.waterGoal, glasses, glassesGoal, percentage, remaining: Math.max(state.waterGoal - waterIntake, 0) };
  }, [currentDayData.waterIntake, state.waterGoal]);

  const calorieBalance = useMemo<CalorieBalance>(() => {
    const foodCalories = currentDayData.totals.calories;
    const burnedCalories = currentDayData.caloriesBurned || 0;
    const baseGoal = activeGoals.calories;
    const effectiveGoal = baseGoal + burnedCalories;
    const remaining = effectiveGoal - foodCalories;
    return { food: foodCalories, burned: burnedCalories, net: foodCalories - burnedCalories, baseGoal, effectiveGoal, remaining, exerciseMinutes: currentDayData.exerciseMinutes || 0 };
  }, [currentDayData, activeGoals.calories]);

  const value = useMemo<MealContextValue>(
    () => ({
      // State
      goals: activeGoals,
      waterGoal: state.waterGoal,
      recentLogs: state.recentLogs,
      dayData: state.dayData,
      isLoading: isLoading || profileLoading,
      isFetchingDay,

      // Selected date
      selectedDate, selectedDateKey, isPlanningMode,

      // Date navigation
      changeDate, goToToday, goToDate, getDateLabel, getShoppingList,

      // Current day
      meals: currentDayData.meals,
      totals: currentDayData.totals,
      waterIntake: currentDayData.waterIntake || 0,
      exercises: currentDayData.exercises || [],
      caloriesBurned: currentDayData.caloriesBurned || 0,
      exerciseMinutes: currentDayData.exerciseMinutes || 0,

      // Computed
      remaining: {
        calories: activeGoals.calories + (currentDayData.caloriesBurned || 0) - currentDayData.totals.calories,
        protein: activeGoals.protein - currentDayData.totals.protein,
        carbs: activeGoals.carbs - currentDayData.totals.carbs,
        fat: activeGoals.fat - currentDayData.totals.fat,
      },
      waterProgress, calorieBalance, mealCalories,

      // Weekly data
      weeklyData, weeklyStats,

      // Range data helpers
      getCalorieDataForRange,
      getDayTotals,

      // Actions
      ...actions,

      // Utility
      getDefaultMealType,
      refreshDate,

      // Offline toast (subtle sync indicator)
      offlineToast,
      dismissOfflineToast,
    }),
    [
      state, activeGoals, isLoading, profileLoading, isFetchingDay,
      selectedDate, selectedDateKey, isPlanningMode,
      changeDate, goToToday, goToDate, getDateLabel, getShoppingList,
      currentDayData, waterProgress, calorieBalance, mealCalories,
      weeklyData, weeklyStats, getCalorieDataForRange, getDayTotals, actions, refreshDate,
      offlineToast, dismissOfflineToast,
    ]
  );

  return (
    <MealContext.Provider value={value}>
      {children}
      {offlineToast && (
        <Animated.View
          entering={FadeInUp.duration(250)}
          exiting={FadeOutUp.duration(250)}
          style={offlineStyles.toastContainer}
        >
          <View style={offlineStyles.toast}>
            <Text style={offlineStyles.toastText}>{offlineToast.message}</Text>
          </View>
        </Animated.View>
      )}
    </MealContext.Provider>
  );
}

export function useMeals(): MealContextValue {
  const context = useContext(MealContext);
  if (!context) {
    throw new Error('useMeals must be used within a MealProvider');
  }
  return context;
}

// ============================================================================
// GRANULAR SELECTOR HOOKS
// Components should use these instead of useMeals() to minimize re-renders.
// Each hook returns a stable slice — components only re-render when their
// specific data changes.
// ============================================================================

/** Totals + goals + remaining — for dashboard/summary components */
export function useMealTotals() {
  const { totals, goals, remaining, calorieBalance, mealCalories } = useMeals();
  return useMemo(
    () => ({ totals, goals, remaining, calorieBalance, mealCalories }),
    [totals, goals, remaining, calorieBalance, mealCalories]
  );
}

/** Water progress only — for WaterCard and water-tracker */
export function useWaterProgress() {
  const { waterProgress, addWater, resetWater, setWaterGoal, waterGoal } = useMeals();
  return useMemo(
    () => ({ waterProgress, addWater, resetWater, setWaterGoal, waterGoal }),
    [waterProgress, addWater, resetWater, setWaterGoal, waterGoal]
  );
}

/** Meal actions only — for add.js, diary.js (food logging) */
export function useMealActions() {
  const { addFood, removeFood, resetDay, addExercise, removeExercise, copyMealFromYesterday, copyMeal, copyDay, getDefaultMealType } = useMeals();
  return useMemo(
    () => ({ addFood, removeFood, resetDay, addExercise, removeExercise, copyMealFromYesterday, copyMeal, copyDay, getDefaultMealType }),
    [addFood, removeFood, resetDay, addExercise, removeExercise, copyMealFromYesterday, copyMeal, copyDay, getDefaultMealType]
  );
}

/** Date navigation only — for DateNavigator components */
export function useDateNav() {
  const { selectedDate, selectedDateKey, isPlanningMode, changeDate, goToToday, goToDate, getDateLabel } = useMeals();
  return useMemo(
    () => ({ selectedDate, selectedDateKey, isPlanningMode, changeDate, goToToday, goToDate, getDateLabel }),
    [selectedDate, selectedDateKey, isPlanningMode, changeDate, goToToday, goToDate, getDateLabel]
  );
}

/** Weekly data only — for stats screen */
export function useWeeklyData() {
  const { weeklyData, weeklyStats, getCalorieDataForRange, dayData, getDayTotals } = useMeals();
  return useMemo(
    () => ({ weeklyData, weeklyStats, getCalorieDataForRange, dayData, getDayTotals }),
    [weeklyData, weeklyStats, getCalorieDataForRange, dayData, getDayTotals]
  );
}

/** Current day meals — for diary screen */
export function useCurrentDayMeals() {
  const { meals, exercises, caloriesBurned, exerciseMinutes, isFetchingDay } = useMeals();
  return useMemo(
    () => ({ meals, exercises, caloriesBurned, exerciseMinutes, isFetchingDay }),
    [meals, exercises, caloriesBurned, exerciseMinutes, isFetchingDay]
  );
}

// Styles for the subtle offline toast indicator
const offlineStyles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    zIndex: 9999,
    alignItems: 'center',
  },
  toast: {
    backgroundColor: 'rgba(255, 179, 0, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 179, 0, 0.3)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFB300',
    textAlign: 'center',
  },
});

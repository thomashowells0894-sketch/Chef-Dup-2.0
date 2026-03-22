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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { hapticSuccess, hapticLight, hapticImpact } from '../lib/haptics';
import { format, addDays, subDays, isToday, isTomorrow, isYesterday, isFuture, parseISO } from 'date-fns';
import { useProfile } from './ProfileContext';
import { useGamification } from './GamificationContext';
import { useAuth } from './AuthContext';
import { useOffline } from './OfflineContext';
import { supabase } from '../lib/supabase';
import { Sentry } from '../lib/sentry';
import { recordFoodLogged } from '../lib/activationTracker';
import { mergeFrequentFoods, recordFrequentFood } from '../lib/frequentFoodsStore';
import { buildInitialMealHydration, normalizeCachedDayData } from '../lib/mealStartup';
import { buildMealCacheKey, getLegacyMealCacheKeys } from '../lib/profileState';
import { replaceRecentMealSnapshot, syncRecentMealsForDate } from '../lib/recentMeals';
import { buildFoodLogInsertPayload } from '../lib/mealLogPayload';
import { recordFirstFoodAddFromStartup } from '../lib/startupTrace';
import type { ImportedFoodDiaryEntry } from '../services/importMyFitnessPal';
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
} from '../types';

interface OfflineToast {
  message: string;
  timestamp: number;
}

type CopyMealSeedItem = Pick<
  FoodItem,
  'name' | 'emoji' | 'calories' | 'protein' | 'carbs' | 'fat' | 'serving' | 'servingSize' | 'servingUnit'
>;

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
  copyMeal: (
    sourceDateKey: DateKey,
    sourceMealType: MealType,
    targetDateKey: DateKey,
    targetMealType?: MealType,
    fallbackItems?: CopyMealSeedItem[]
  ) => Promise<number>;
  copyDay: (sourceDateKey: DateKey, targetDateKey: DateKey) => Promise<number>;
  importFoodDiary: (entries: ImportedFoodDiaryEntry[]) => Promise<{
    importedCount: number;
    skippedCount: number;
    dateCount: number;
  }>;
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

interface FetchDayOptions {
  silent?: boolean;
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

const ALL_MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snacks'];
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

function cloneDayData(dayData?: DayData | null): DayData {
  const source = dayData || EMPTY_DAY;
  return {
    meals: {
      breakfast: [...(source.meals?.breakfast || [])],
      lunch: [...(source.meals?.lunch || [])],
      dinner: [...(source.meals?.dinner || [])],
      snacks: [...(source.meals?.snacks || [])],
    },
    totals: {
      calories: source.totals?.calories || 0,
      protein: source.totals?.protein || 0,
      carbs: source.totals?.carbs || 0,
      fat: source.totals?.fat || 0,
    },
    waterIntake: source.waterIntake || 0,
    exercises: [...(source.exercises || [])],
    caloriesBurned: source.caloriesBurned || 0,
    exerciseMinutes: source.exerciseMinutes || 0,
  };
}

function createClientRequestId(): string {
  return `food-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function matchesFoodLog(log: FoodLogEntry | undefined, logId: string | number): boolean {
  if (!log) return false;
  return log.id === logId || log.clientRequestId === logId;
}

function buildFoodLogEntry(food: FoodItem, mealType: MealType, dateKey: DateKey): FoodLogEntry {
  return {
    ...food,
    id: food.id || `food-${Date.now()}`,
    clientRequestId: food.clientRequestId,
    loggedAt: new Date().toISOString(),
    mealType,
    dateKey,
  };
}

interface RemoteFoodLogRow {
  id: string | number;
  date: DateKey;
  name: string;
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  meal_type?: string | null;
  serving?: string | null;
  serving_size?: number | null;
  serving_unit?: string | null;
  water_amount?: number | null;
  created_at?: string | null;
}

const IMPORT_BATCH_SIZE = 200;
const IMPORT_HYDRATED_DATE_LIMIT = 14;
const IMPORT_RECENT_SNAPSHOT_LIMIT = 7;

function normalizeMealTypeValue(mealType?: string | null): MealType {
  const normalized = (mealType || '').toLowerCase();
  if (normalized === 'breakfast' || normalized === 'lunch' || normalized === 'dinner' || normalized === 'snacks') {
    return normalized;
  }
  return 'snacks';
}

function normalizeFoodSignatureValue(value: string | null | undefined): string {
  return (value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function buildImportSignature(input: {
  dateKey: DateKey;
  mealType: MealType;
  name: string;
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
}): string {
  return [
    input.dateKey,
    input.mealType,
    normalizeFoodSignatureValue(input.name),
    Number(input.calories) || 0,
    Number(input.protein) || 0,
    Number(input.carbs) || 0,
    Number(input.fat) || 0,
  ].join('|');
}

function buildDayDataFromRemoteRows(rows: RemoteFoodLogRow[]): Record<DateKey, DayData> {
  const nextDayData: Record<DateKey, DayData> = {};

  rows.forEach((row, index) => {
    const dateKey = row.date;
    if (!dateKey) {
      return;
    }

    const mealType = normalizeMealTypeValue(row.meal_type);
    const existingDay = nextDayData[dateKey] || {
      meals: { breakfast: [], lunch: [], dinner: [], snacks: [] },
      totals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      waterIntake: 0,
      exercises: [],
      caloriesBurned: 0,
      exerciseMinutes: 0,
    };

    if (normalizeFoodSignatureValue(row.name) === 'water' && (Number(row.calories) || 0) === 0) {
      existingDay.waterIntake += Number(row.water_amount) || 250;
      nextDayData[dateKey] = existingDay;
      return;
    }

    const foodItem: FoodLogEntry = {
      id: row.id || `imported-${dateKey}-${mealType}-${index}`,
      name: row.name || 'Food',
      emoji: '🍽️',
      calories: Number(row.calories) || 0,
      protein: Number(row.protein) || 0,
      carbs: Number(row.carbs) || 0,
      fat: Number(row.fat) || 0,
      serving: row.serving || '1 serving',
      servingSize: row.serving_size || undefined,
      servingUnit: row.serving_unit || undefined,
      loggedAt: row.created_at || `${dateKey}T12:00:00.000Z`,
      mealType,
      dateKey,
    };

    existingDay.meals[mealType] = [...existingDay.meals[mealType], foodItem];
    existingDay.totals = {
      calories: existingDay.totals.calories + foodItem.calories,
      protein: existingDay.totals.protein + foodItem.protein,
      carbs: existingDay.totals.carbs + foodItem.carbs,
      fat: existingDay.totals.fat + foodItem.fat,
    };

    nextDayData[dateKey] = existingDay;
  });

  return nextDayData;
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

function buildCacheKey(userId: string | null | undefined, dateKey: DateKey): string {
  return buildMealCacheKey(userId, dateKey);
}

async function readCachedDayData(
  userId: string | null | undefined,
  dateKey: DateKey
): Promise<DayData | null> {
  const primaryKey = buildCacheKey(userId, dateKey);

  for (const key of [primaryKey, ...getLegacyMealCacheKeys(dateKey)]) {
    try {
      const cached = await AsyncStorage.getItem(key);
      if (!cached) {
        continue;
      }

      const normalized = normalizeCachedDayData(JSON.parse(cached));
      if (normalized && key !== primaryKey) {
        writeCachedDayData(userId, dateKey, normalized).catch(() => {});
      }

      return normalized;
    } catch (error) {
      if (__DEV__) {
        console.warn('[Meal] Failed to read day cache:', error);
      }
    }
  }

  return null;
}

async function writeCachedDayData(
  userId: string | null | undefined,
  dateKey: DateKey,
  dayData: DayData
): Promise<void> {
  try {
    await AsyncStorage.setItem(buildCacheKey(userId, dateKey), JSON.stringify(dayData));
  } catch (error) {
    if (__DEV__) {
      console.warn('[Meal] Failed to write day cache:', error);
    }
  }
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
      const logEntry = buildFoodLogEntry(food, mealType, dateKey);
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
      const item = day.meals[mealType]?.find((food) => matchesFoodLog(food, logId));
      if (!item) return state;
      const nextMealItems = day.meals[mealType].filter((food) => !matchesFoodLog(food, logId));
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
            meals: { ...day.meals, [mealType]: nextMealItems },
          },
        },
        recentLogs: state.recentLogs.filter((food) => !matchesFoodLog(food, logId)),
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

export function MealProvider({
  children,
  disableInitialFetch = false,
}: {
  children: React.ReactNode;
  disableInitialFetch?: boolean;
}) {
  const { user } = useAuth();
  const [state, dispatch] = useReducer(mealReducer, initialState);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isHydrated, setIsHydrated] = useState<boolean>(false);
  const [isFetchingDay, setIsFetchingDay] = useState<boolean>(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [offlineToast, setOfflineToast] = useState<OfflineToast | null>(null);
  const fetchedDatesRef = useRef<Set<string>>(new Set());
  const fetchingDatesRef = useRef<Set<string>>(new Set());

  // Ref for stable access to current state without dependency churn
  const stateRef = useRef<MealState>(state);
  stateRef.current = state;

  const { calculatedGoals, isProfileComplete, calculatedWaterGoal } = useProfile();
  const { awardXP } = useGamification();
  const { queueOperation, checkOnline, showOfflineAlert } = useOffline();

  const selectedDateKey = useMemo<DateKey>(() => formatDateKey(selectedDate), [selectedDate]);
  const isPlanningMode = useMemo<boolean>(() => isFuture(selectedDate) && !isToday(selectedDate), [selectedDate]);

  // Sync water goal from profile
  useEffect(() => {
    if (isHydrated && calculatedWaterGoal && calculatedWaterGoal !== state.waterGoal) {
      dispatch({ type: 'SET_WATER_GOAL', payload: calculatedWaterGoal });
    }
  }, [calculatedWaterGoal, isHydrated, state.waterGoal]);

  // Fetch data for a specific date from Supabase
  const fetchDayData = useCallback(async (dateKey: DateKey, options: FetchDayOptions = {}) => {
    if (!user) return;
    if (fetchingDatesRef.current.has(dateKey)) return;
    if (!(await checkOnline())) return;

    fetchingDatesRef.current.add(dateKey);
    if (!options.silent) {
      setIsFetchingDay(true);
    }
    try {
      const [foodResult, workoutResult] = await Promise.all([
        supabase.from('food_logs').select('*').eq('user_id', user.id).eq('date', dateKey),
        supabase.from('workouts').select('*').eq('user_id', user.id).eq('date', dateKey),
      ]);

      const { data: foodLogs, error: foodError } = foodResult;
      const { data: workouts, error: workoutError } = workoutResult;
      if (foodError && __DEV__) console.error('[Meal] Food fetch error:', foodError.message);
      if (workoutError && __DEV__) console.error('[Meal] Workout fetch error:', workoutError.message);

      const existingDay =
        stateRef.current.dayData[dateKey] ||
        await readCachedDayData(user.id, dateKey) ||
        cloneDayData();

      if (foodError && workoutError) {
        if (!stateRef.current.dayData[dateKey]) {
          dispatch({
            type: 'HYDRATE',
            payload: {
              dayData: {
                ...stateRef.current.dayData,
                [dateKey]: existingDay,
              },
            },
          });
        }
        return;
      }

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

      const nextDayData = {
        meals: foodError ? existingDay.meals : meals,
        totals: foodError ? existingDay.totals : totals,
        waterIntake: foodError ? existingDay.waterIntake : waterIntake,
        exercises: workoutError ? existingDay.exercises : exercises,
        caloriesBurned: workoutError ? existingDay.caloriesBurned : caloriesBurned,
        exerciseMinutes: workoutError ? existingDay.exerciseMinutes : exerciseMinutes,
      };

      dispatch({
        type: 'HYDRATE',
        payload: {
          dayData: {
            ...stateRef.current.dayData,
            [dateKey]: nextDayData,
          },
        },
      });

      writeCachedDayData(user.id, dateKey, nextDayData).catch(() => {});

      syncRecentMealsForDate(dateKey, meals).catch((error) => {
        if (__DEV__) console.warn('[Meal] Failed to sync recent meal snapshots:', error);
      });

      fetchedDatesRef.current.add(dateKey);
    } catch (error: any) {
      if (__DEV__) console.error('[Meal] Fetch failed:', error.message);
    } finally {
      fetchingDatesRef.current.delete(dateKey);
      if (!options.silent) {
        setIsFetchingDay(false);
      }
    }
  }, [user, checkOnline]);

  // Initial load
  useEffect(() => {
    if (disableInitialFetch) {
      setIsLoading(false);
      setIsHydrated(true);
      return;
    }

    if (!user) {
      dispatch({ type: 'HYDRATE', payload: initialState });
      setIsLoading(false);
      setIsHydrated(true);
      fetchedDatesRef.current.clear();
      fetchingDatesRef.current.clear();
      return;
    }
    (async () => {
      setIsLoading(true);
      const todayKey = getTodayString();

      let cachedToday: DayData | null = null;
      try {
        cachedToday = await readCachedDayData(user.id, todayKey);
        if (cachedToday) {
          dispatch({
            type: 'HYDRATE',
            payload: {
              dayData: {
                ...stateRef.current.dayData,
                ...buildInitialMealHydration(todayKey, cachedToday),
              },
            },
          });
        }
      } catch (error: any) {
        if (__DEV__) console.error('[Meal] Initial cache hydrate failed:', error.message);
      } finally {
        setIsLoading(false);
        setIsHydrated(true);
      }

      fetchDayData(todayKey, { silent: Boolean(cachedToday) }).catch((error: any) => {
        if (__DEV__) console.error('[Meal] Initial load failed:', error.message);
      });
    })();
  }, [user, disableInitialFetch, fetchDayData]);

  // Fetch when selected date changes + prefetch adjacent days
  useEffect(() => {
    if (disableInitialFetch) return;
    if (!user || !isHydrated) return;
    if (!fetchedDatesRef.current.has(selectedDateKey)) {
      fetchDayData(selectedDateKey, {
        silent: Boolean(stateRef.current.dayData[selectedDateKey]),
      });
    }
    // Background prefetch yesterday & tomorrow for instant date navigation
    const yesterday = formatDateKey(subDays(selectedDate, 1));
    const tomorrow = formatDateKey(addDays(selectedDate, 1));
    if (!fetchedDatesRef.current.has(yesterday)) {
      setTimeout(() => fetchDayData(yesterday, { silent: true }), 200);
    }
    if (!fetchedDatesRef.current.has(tomorrow)) {
      setTimeout(() => fetchDayData(tomorrow, { silent: true }), 400);
    }
  }, [user, isHydrated, selectedDateKey, selectedDate, fetchDayData, disableInitialFetch]);

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
      for (const mealType of ALL_MEAL_TYPES) {
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
        const clientRequestId = food.clientRequestId || createClientRequestId();
        const tempId = String(food.id || `temp-${clientRequestId}`);
        const optimisticFood = { ...food, id: tempId, clientRequestId };
        const currentDay = getDayData(stateRef.current, selectedDateKey);
        const previousMealItems = [...(currentDay.meals[effectiveMealType] || [])];
        const optimisticEntry = buildFoodLogEntry(optimisticFood, effectiveMealType, selectedDateKey);
        const nextMealItems = [...previousMealItems, optimisticEntry];

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
        recordFirstFoodAddFromStartup({
          mealType: effectiveMealType,
          selectedDateKey,
          source: food.sourceLabel || food.source || 'manual',
        });
        replaceRecentMealSnapshot({
          dateKey: selectedDateKey,
          mealType: effectiveMealType,
          items: nextMealItems,
        }).catch((error) => {
          if (__DEV__) console.warn('[Meal] Failed to update recent meal snapshot after add:', error);
        });
        if (!isPlanningMode) awardXP('LOG_FOOD');
        if (!food.skipHaptic) {
          await triggerHaptic('success');
        }
        recordFoodLogged({
          mealType: effectiveMealType,
          calories: food.calories || 0,
          source: food.sourceLabel || food.source || 'manual',
        }).catch((error) => {
          if (__DEV__) console.warn('[Meal] Failed to record activation funnel food log:', error);
        });

        const online = await checkOnline();
        if (!online) {
          // Queue for later sync instead of rollback -- food stays in local state
          await queueOperation({
            table: 'food_logs',
            type: 'INSERT',
            payload: buildFoodLogInsertPayload(user.id, selectedDateKey, effectiveMealType, food),
            tempId,
          });
          await recordFrequentFood(optimisticFood);
          // Subtle non-blocking indicator instead of Alert dialog
          showSubtleOfflineToast('Food log');
          return;
        }

        try {
          const { data, error } = await supabase
            .from('food_logs')
            .insert(buildFoodLogInsertPayload(user.id, selectedDateKey, effectiveMealType, food))
            .select().single();

          if (error) {
            dispatch({ type: 'REMOVE_FOOD', payload: { logId: tempId, mealType: effectiveMealType, dateKey: selectedDateKey } });
            replaceRecentMealSnapshot({
              dateKey: selectedDateKey,
              mealType: effectiveMealType,
              items: previousMealItems,
            }).catch((snapshotError) => {
              if (__DEV__) console.warn('[Meal] Failed to roll back recent meal snapshot:', snapshotError);
            });
            Alert.alert('Error', 'Failed to save food. Please try again.');
            return;
          }

          // Replace temp ID with server ID
          dispatch({ type: 'REMOVE_FOOD', payload: { logId: tempId, mealType: effectiveMealType, dateKey: selectedDateKey } });
          dispatch({
            type: 'ADD_FOOD',
            payload: {
              food: { ...food, id: data.id, clientRequestId },
              mealType: effectiveMealType,
              dateKey: selectedDateKey,
            },
          });
          await recordFrequentFood({ ...food, id: String(data.id), clientRequestId });
        } catch (e) {
          Sentry.captureException(e);
          dispatch({ type: 'REMOVE_FOOD', payload: { logId: tempId, mealType: effectiveMealType, dateKey: selectedDateKey } });
          replaceRecentMealSnapshot({
            dateKey: selectedDateKey,
            mealType: effectiveMealType,
            items: previousMealItems,
          }).catch((snapshotError) => {
            if (__DEV__) console.warn('[Meal] Failed to roll back recent meal snapshot:', snapshotError);
          });
          Alert.alert('Error', 'Failed to save food. Please try again.');
        }
      },

      removeFood: async (logId: string | number, mealType: MealType) => {
        if (!user) return;
        const currentDay = getDayData(stateRef.current, selectedDateKey);
        const mealItems = currentDay.meals[mealType] || [];
        const itemToRemove = mealItems.find((food) => matchesFoodLog(food, logId));
        if (!itemToRemove) return;
        const nextMealItems = mealItems.filter((food) => !matchesFoodLog(food, logId));

        // Optimistic removal — food disappears instantly regardless of network
        dispatch({ type: 'REMOVE_FOOD', payload: { logId, mealType, dateKey: selectedDateKey } });
        replaceRecentMealSnapshot({
          dateKey: selectedDateKey,
          mealType,
          items: nextMealItems,
        }).catch((error) => {
          if (__DEV__) console.warn('[Meal] Failed to update recent meal snapshot after remove:', error);
        });
        await triggerHaptic('light');

        const online = await checkOnline();
        if (!online) {
          await queueOperation({
            table: 'food_logs',
            type: 'DELETE',
            payload: { id: itemToRemove.id, user_id: user.id },
          });
          showSubtleOfflineToast('Food removal');
          return;
        }

        try {
          const { error } = await supabase.from('food_logs').delete().eq('id', itemToRemove.id).eq('user_id', user.id);
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
          syncRecentMealsForDate(selectedDateKey, EMPTY_DAY.meals).catch((error) => {
            if (__DEV__) console.warn('[Meal] Failed to clear recent meal snapshots for day reset:', error);
          });
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
        } catch (e) {
          Sentry.captureException(e);
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
        } catch (e) {
          Sentry.captureException(e);
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

        const targetDay = getDayData(stateRef.current, selectedDateKey);
        const existingMealItems = [...(targetDay.meals[mealType] || [])];

        // Build all foods + optimistic entries at once
        const entries = items.map(item => {
          const clientRequestId = createClientRequestId();
          const food: FoodItem = {
            name: item.name, emoji: item.emoji,
            calories: item.calories, protein: item.protein,
            carbs: item.carbs, fat: item.fat,
            serving: item.serving, servingSize: item.servingSize, servingUnit: item.servingUnit,
            clientRequestId,
          } as FoodItem;
          const tempId = `temp-copy-${clientRequestId}`;
          return { food, tempId, clientRequestId };
        });
        const optimisticEntries = entries.map(({ food, tempId, clientRequestId }) =>
          buildFoodLogEntry({ ...food, id: tempId, clientRequestId }, mealType, selectedDateKey)
        );

        // Optimistic: add all items to UI immediately
        for (const { food, tempId, clientRequestId } of entries) {
          dispatch({
            type: 'ADD_FOOD',
            payload: {
              food: { ...food, id: tempId, clientRequestId },
              mealType,
              dateKey: selectedDateKey,
            },
          });
        }
        replaceRecentMealSnapshot({
          dateKey: selectedDateKey,
          mealType,
          items: [...existingMealItems, ...optimisticEntries],
        }).catch((error) => {
          if (__DEV__) console.warn('[Meal] Failed to update recent meal snapshot after meal copy:', error);
        });
        await Promise.all(entries.map(({ food }) => recordFrequentFood(food)));

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
              entries.forEach(({ food, tempId, clientRequestId }, i) => {
                if (data[i]) {
                  dispatch({ type: 'REMOVE_FOOD', payload: { logId: tempId, mealType, dateKey: selectedDateKey } });
                  dispatch({
                    type: 'ADD_FOOD',
                    payload: {
                      food: { ...food, id: data[i].id, clientRequestId },
                      mealType,
                      dateKey: selectedDateKey,
                    },
                  });
                }
              });
            }
          } catch (e) {
            Sentry.captureException(e);
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
      copyMeal: async (
        srcDateKey: DateKey,
        srcMealType: MealType,
        tgtDateKey: DateKey,
        tgtMealType?: MealType,
        fallbackItems?: CopyMealSeedItem[]
      ): Promise<number> => {
        if (!user) return 0;
        const effectiveTargetMeal = tgtMealType || srcMealType;
        const srcDay = getDayData(stateRef.current, srcDateKey);
        let items: (FoodLogEntry | CopyMealSeedItem)[] = srcDay.meals[srcMealType] || [];

        if (items.length === 0 && Array.isArray(fallbackItems) && fallbackItems.length > 0) {
          items = fallbackItems;
        } else if (items.length === 0 && !fetchedDatesRef.current.has(srcDateKey)) {
          await fetchDayData(srcDateKey);
          items = getDayData(stateRef.current, srcDateKey).meals[srcMealType] || [];
        }

        if (items.length === 0) {
          Alert.alert('Nothing to Copy', `No ${srcMealType} items found on that day.`);
          return 0;
        }

        const targetDay = getDayData(stateRef.current, tgtDateKey);
        const existingMealItems = [...(targetDay.meals[effectiveTargetMeal] || [])];
        const entries = items.map(item => {
          const clientRequestId = createClientRequestId();
          const food: FoodItem = {
            name: item.name, emoji: item.emoji,
            calories: item.calories, protein: item.protein,
            carbs: item.carbs, fat: item.fat,
            serving: item.serving, servingSize: item.servingSize, servingUnit: item.servingUnit,
            clientRequestId,
          } as FoodItem;
          const tempId = `temp-copy-${clientRequestId}`;
          return { food, tempId, clientRequestId };
        });
        const optimisticEntries = entries.map(({ food, tempId, clientRequestId }) =>
          buildFoodLogEntry({ ...food, id: tempId, clientRequestId }, effectiveTargetMeal, tgtDateKey)
        );

        for (const { food, tempId, clientRequestId } of entries) {
          dispatch({
            type: 'ADD_FOOD',
            payload: {
              food: { ...food, id: tempId, clientRequestId },
              mealType: effectiveTargetMeal,
              dateKey: tgtDateKey,
            },
          });
        }
        replaceRecentMealSnapshot({
          dateKey: tgtDateKey,
          mealType: effectiveTargetMeal,
          items: [...existingMealItems, ...optimisticEntries],
        }).catch((error) => {
          if (__DEV__) console.warn('[Meal] Failed to update recent meal snapshot after copy:', error);
        });
        await Promise.all(entries.map(({ food }) => recordFrequentFood(food)));

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
              entries.forEach(({ food, tempId, clientRequestId }, i) => {
                if (data[i]) {
                  dispatch({ type: 'REMOVE_FOOD', payload: { logId: tempId, mealType: effectiveTargetMeal, dateKey: tgtDateKey } });
                  dispatch({
                    type: 'ADD_FOOD',
                    payload: {
                      food: { ...food, id: data[i].id, clientRequestId },
                      mealType: effectiveTargetMeal,
                      dateKey: tgtDateKey,
                    },
                  });
                }
              });
            }
          } catch (e) {
            Sentry.captureException(e);
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
        const targetDay = getDayData(stateRef.current, tgtDateKey);
        const nextMeals: Record<MealType, FoodLogEntry[]> = {
          breakfast: [...(targetDay.meals.breakfast || [])],
          lunch: [...(targetDay.meals.lunch || [])],
          dinner: [...(targetDay.meals.dinner || [])],
          snacks: [...(targetDay.meals.snacks || [])],
        };

        // Collect all entries across all meal types
        const entries: { food: FoodItem; tempId: string; mt: MealType; clientRequestId: string }[] = [];
        for (const mt of ALL_MEAL_TYPES) {
          for (const item of srcDay.meals[mt] || []) {
            const clientRequestId = createClientRequestId();
            const food: FoodItem = {
              name: item.name, emoji: item.emoji,
              calories: item.calories, protein: item.protein,
              carbs: item.carbs, fat: item.fat,
              serving: item.serving, servingSize: item.servingSize, servingUnit: item.servingUnit,
              clientRequestId,
            } as FoodItem;
            const tempId = `temp-copyday-${clientRequestId}`;
            const optimisticEntry = buildFoodLogEntry({ ...food, id: tempId, clientRequestId }, mt, tgtDateKey);
            nextMeals[mt].push(optimisticEntry);
            entries.push({ food, tempId, mt, clientRequestId });
          }
        }

        if (entries.length === 0) {
          Alert.alert('Nothing to Copy', 'No food items found on that day.');
          return 0;
        }

        // Optimistic: add all items to UI immediately
        for (const { food, tempId, mt, clientRequestId } of entries) {
          dispatch({
            type: 'ADD_FOOD',
            payload: {
              food: { ...food, id: tempId, clientRequestId },
              mealType: mt,
              dateKey: tgtDateKey,
            },
          });
        }
        syncRecentMealsForDate(tgtDateKey, nextMeals).catch((error) => {
          if (__DEV__) console.warn('[Meal] Failed to update recent meal snapshots after day copy:', error);
        });
        await Promise.all(entries.map(({ food }) => recordFrequentFood(food)));

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
              entries.forEach(({ food, tempId, mt, clientRequestId }, i) => {
                if (data[i]) {
                  dispatch({ type: 'REMOVE_FOOD', payload: { logId: tempId, mealType: mt, dateKey: tgtDateKey } });
                  dispatch({
                    type: 'ADD_FOOD',
                    payload: {
                      food: { ...food, id: data[i].id, clientRequestId },
                      mealType: mt,
                      dateKey: tgtDateKey,
                    },
                  });
                }
              });
            }
          } catch (e) {
            Sentry.captureException(e);
            // Keep optimistic entries
          }
        }

        await triggerHaptic('success');
        return entries.length;
      },

      importFoodDiary: async (entries: ImportedFoodDiaryEntry[]) => {
        if (!user) {
          throw new Error('Sign in before importing data.');
        }

        if (!Array.isArray(entries) || entries.length === 0) {
          return { importedCount: 0, skippedCount: 0, dateCount: 0 };
        }

        const uniqueDateKeys = [...new Set(entries.map((entry) => entry.dateKey))].sort();
        if (!(await checkOnline())) {
          showOfflineAlert('import food diary');
          throw new Error('An internet connection is required to import and save your diary.');
        }

        const startDateKey = uniqueDateKeys[0];
        const endDateKey = uniqueDateKeys[uniqueDateKeys.length - 1];
        let existingRows: RemoteFoodLogRow[] = [];

        try {
          const { data, error } = await supabase
            .from('food_logs')
            .select('id,date,name,calories,protein,carbs,fat,meal_type,serving,serving_size,serving_unit,water_amount,created_at')
            .eq('user_id', user.id)
            .gte('date', startDateKey)
            .lte('date', endDateKey);

          if (error) {
            throw error;
          }

          existingRows = Array.isArray(data) ? data : [];
        } catch (error) {
          Sentry.captureException(error);
          throw new Error('Failed to check your existing diary before import.');
        }

        const existingSignatureCounts = new Map<string, number>();
        existingRows.forEach((row) => {
          const signature = buildImportSignature({
            dateKey: row.date,
            mealType: normalizeMealTypeValue(row.meal_type),
            name: row.name,
            calories: row.calories,
            protein: row.protein,
            carbs: row.carbs,
            fat: row.fat,
          });
          existingSignatureCounts.set(signature, (existingSignatureCounts.get(signature) || 0) + 1);
        });

        const rowsToInsert = entries.reduce<Record<string, unknown>[]>((accumulator, entry) => {
          const signature = buildImportSignature(entry);
          const remainingExistingCount = existingSignatureCounts.get(signature) || 0;

          if (remainingExistingCount > 0) {
            existingSignatureCounts.set(signature, remainingExistingCount - 1);
            return accumulator;
          }

          accumulator.push({
            user_id: user.id,
            date: entry.dateKey,
            meal_type: entry.mealType,
            name: entry.name.trim(),
            calories: entry.calories || 0,
            protein: entry.protein || 0,
            carbs: entry.carbs || 0,
            fat: entry.fat || 0,
            serving: entry.serving || null,
          });
          return accumulator;
        }, []);

        const insertedRows: RemoteFoodLogRow[] = [];
        try {
          for (let index = 0; index < rowsToInsert.length; index += IMPORT_BATCH_SIZE) {
            const chunk = rowsToInsert.slice(index, index + IMPORT_BATCH_SIZE);
            const { data, error } = await supabase
              .from('food_logs')
              .insert(chunk)
              .select('id,date,name,calories,protein,carbs,fat,meal_type,serving,serving_size,serving_unit,water_amount,created_at');

            if (error) {
              throw error;
            }

            insertedRows.push(...((data as RemoteFoodLogRow[] | null) || []));
          }
        } catch (error) {
          Sentry.captureException(error);
          throw new Error('Failed to save the imported meals. Please try again.');
        }

        const combinedRows = [...existingRows, ...insertedRows];
        const hydratedDateKeys = uniqueDateKeys.slice(-IMPORT_HYDRATED_DATE_LIMIT);
        const importedHydratedDayData = buildDayDataFromRemoteRows(
          combinedRows.filter((row) => hydratedDateKeys.includes(row.date))
        );
        const hydratedDayData = Object.fromEntries(
          Object.entries(importedHydratedDayData).map(([dateKey, importedDay]) => {
            const existingCachedDay = stateRef.current.dayData[dateKey];
            if (!existingCachedDay) {
              return [dateKey, importedDay];
            }

            return [dateKey, {
              ...importedDay,
              waterIntake: importedDay.waterIntake || existingCachedDay.waterIntake || 0,
              exercises: existingCachedDay.exercises || [],
              caloriesBurned: existingCachedDay.caloriesBurned || 0,
              exerciseMinutes: existingCachedDay.exerciseMinutes || 0,
            }];
          })
        ) as Record<DateKey, DayData>;

        if (Object.keys(hydratedDayData).length > 0) {
          dispatch({
            type: 'HYDRATE',
            payload: {
              dayData: {
                ...stateRef.current.dayData,
                ...hydratedDayData,
              },
            },
          });
        }

        const recentSnapshotDateKeys = uniqueDateKeys.slice(-IMPORT_RECENT_SNAPSHOT_LIMIT);
        const recentSnapshotData = buildDayDataFromRemoteRows(
          combinedRows.filter((row) => recentSnapshotDateKeys.includes(row.date))
        );

        for (const dateKey of recentSnapshotDateKeys) {
          const dayData = recentSnapshotData[dateKey];
          if (!dayData) {
            continue;
          }

          await syncRecentMealsForDate(dateKey, dayData.meals);
        }

        const frequentFoodSeeds = new Map<string, {
          name: string;
          calories: number;
          protein: number;
          carbs: number;
          fat: number;
          serving: string;
          count: number;
          lastUsed: string;
        }>();

        entries.forEach((entry) => {
          const normalizedName = normalizeFoodSignatureValue(entry.name);
          const existing = frequentFoodSeeds.get(normalizedName);
          const lastUsed = `${entry.dateKey}T12:00:00.000Z`;

          if (existing) {
            frequentFoodSeeds.set(normalizedName, {
              ...existing,
              count: existing.count + 1,
              lastUsed: lastUsed > existing.lastUsed ? lastUsed : existing.lastUsed,
            });
            return;
          }

          frequentFoodSeeds.set(normalizedName, {
            name: entry.name,
            calories: entry.calories || 0,
            protein: entry.protein || 0,
            carbs: entry.carbs || 0,
            fat: entry.fat || 0,
            serving: entry.serving || '1 serving',
            count: 1,
            lastUsed,
          });
        });

        await mergeFrequentFoods([...frequentFoodSeeds.values()]);
        await triggerHaptic(rowsToInsert.length > 0 ? 'success' : 'light');

        return {
          importedCount: rowsToInsert.length,
          skippedCount: entries.length - rowsToInsert.length,
          dateCount: uniqueDateKeys.length,
        };
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

  useEffect(() => {
    if (!user || !isHydrated) return;
    writeCachedDayData(user.id, selectedDateKey, currentDayData).catch(() => {});
  }, [currentDayData, isHydrated, selectedDateKey, user]);

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
      isLoading,
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
      state, activeGoals, isLoading, isFetchingDay,
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

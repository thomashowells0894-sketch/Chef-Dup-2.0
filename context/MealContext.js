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
import { Alert } from 'react-native';
import { hapticSuccess, hapticLight, hapticImpact } from '../lib/haptics';
import { format, addDays, subDays, isToday, isTomorrow, isYesterday, isFuture, parseISO } from 'date-fns';
import { useProfile } from './ProfileContext';
import { useGamification } from './GamificationContext';
import { useAuth } from './AuthContext';
import { useOffline } from './OfflineContext';
import { supabase } from '../lib/supabase';

const MealContext = createContext(null);

// Default goals (used when profile is not complete)
const DEFAULT_GOALS = {
  calories: 2000,
  protein: 150,
  carbs: 250,
  fat: 65,
};

// Empty day template
const EMPTY_DAY = {
  meals: { breakfast: [], lunch: [], dinner: [], snacks: [] },
  totals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
  waterIntake: 0,
  exercises: [],
  caloriesBurned: 0,
  exerciseMinutes: 0,
};

const initialState = {
  goals: DEFAULT_GOALS,
  waterGoal: 2500,
  dayData: {},
  recentLogs: [],
};

// --- Pure helpers ---

function formatDateKey(date) {
  return format(date, 'yyyy-MM-dd');
}

function getTodayString() {
  return formatDateKey(new Date());
}

function getDayData(state, dateKey) {
  return state.dayData[dateKey] || { ...EMPTY_DAY, meals: { ...EMPTY_DAY.meals } };
}

function getDefaultMealType() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return 'breakfast';
  if (hour >= 11 && hour < 15) return 'lunch';
  if (hour >= 15 && hour < 20) return 'dinner';
  return 'snacks';
}

function getDateString(daysOffset = 0) {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return formatDateKey(date);
}

function getDayLabel(dateString) {
  const date = parseISO(dateString);
  return format(date, 'EEE');
}

function getCalorieData(dayData, goal, days = 7) {
  const result = [];
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

function calcWeeklyStats(weekData) {
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

function mealReducer(state, action) {
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
      const logEntry = { ...food, id: food.id || Date.now(), loggedAt: new Date().toISOString(), mealType, dateKey };
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
      const logEntry = { ...exercise, id: exercise.id || Date.now(), loggedAt: new Date().toISOString(), duration, caloriesBurned, dateKey };
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

export function MealProvider({ children }) {
  const { user } = useAuth();
  const [state, dispatch] = useReducer(mealReducer, initialState);
  const [isLoading, setIsLoading] = useState(true);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isFetchingDay, setIsFetchingDay] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const fetchedDatesRef = useRef(new Set());

  // Ref for stable access to current state without dependency churn
  const stateRef = useRef(state);
  stateRef.current = state;

  const { calculatedGoals, isProfileComplete, isLoading: profileLoading, calculatedWaterGoal } = useProfile();
  const { awardXP } = useGamification();
  const { isOnline: networkOnline, queueOperation, checkOnline, showOfflineAlert } = useOffline();

  const selectedDateKey = useMemo(() => formatDateKey(selectedDate), [selectedDate]);
  const isPlanningMode = useMemo(() => isFuture(selectedDate) && !isToday(selectedDate), [selectedDate]);

  // Sync water goal from profile
  useEffect(() => {
    if (isHydrated && calculatedWaterGoal && calculatedWaterGoal !== state.waterGoal) {
      dispatch({ type: 'SET_WATER_GOAL', payload: calculatedWaterGoal });
    }
  }, [calculatedWaterGoal, isHydrated, state.waterGoal]);

  // Fetch data for a specific date from Supabase
  const fetchDayData = useCallback(async (dateKey) => {
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

      const meals = { breakfast: [], lunch: [], dinner: [], snacks: [] };
      const totals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
      let waterIntake = 0;

      if (foodLogs) {
        foodLogs.forEach((log) => {
          if (log.name === 'Water' && log.calories === 0) {
            waterIntake += log.water_amount || 250;
          } else {
            const mt = log.meal_type || 'snacks';
            const foodItem = {
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

      const exercises = [];
      let caloriesBurned = 0;
      let exerciseMinutes = 0;
      if (workouts) {
        workouts.forEach((w) => {
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
    } catch (error) {
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
      } catch (error) {
        if (__DEV__) console.error('[Meal] Initial load failed:', error.message);
      } finally {
        setIsLoading(false);
        setIsHydrated(true);
      }
    })();
  }, [user]);

  // Fetch when selected date changes
  useEffect(() => {
    if (!user || !isHydrated) return;
    if (!fetchedDatesRef.current.has(selectedDateKey)) {
      fetchDayData(selectedDateKey);
    }
  }, [user, isHydrated, selectedDateKey, fetchDayData]);

  // --- Haptics ---
  const triggerHaptic = useCallback(async (type = 'success') => {
    if (type === 'success') await hapticSuccess();
    else if (type === 'light') await hapticLight();
    else if (type === 'medium') await hapticImpact();
  }, []);

  // --- Date nav ---
  const changeDate = useCallback(async (direction) => {
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

  const goToDate = useCallback(async (date) => {
    await triggerHaptic('light');
    setSelectedDate(date);
  }, [triggerHaptic]);

  const getDateLabel = useCallback((date) => {
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMM d');
  }, []);

  // --- Shopping list ---
  const getShoppingList = useCallback(() => {
    const aggregatedItems = {};
    const today = new Date();
    for (let i = 1; i <= 7; i++) {
      const futureDate = addDays(today, i);
      const dateKey = formatDateKey(futureDate);
      const dayData = stateRef.current.dayData[dateKey];
      if (!dayData || !dayData.meals) continue;
      for (const mealType of ['breakfast', 'lunch', 'dinner', 'snacks']) {
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
      addFood: async (food, mealType) => {
        if (!user) return;
        const effectiveMealType = mealType || getDefaultMealType();
        const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const optimisticFood = { ...food, id: tempId };

        dispatch({ type: 'ADD_FOOD', payload: { food: optimisticFood, mealType: effectiveMealType, dateKey: selectedDateKey } });
        if (!isPlanningMode) awardXP('LOG_FOOD');
        await triggerHaptic('success');

        const online = await checkOnline();
        if (!online) {
          // Queue for later sync instead of rollback
          await queueOperation({
            table: 'food_logs',
            type: 'INSERT',
            payload: {
              user_id: user.id, date: selectedDateKey,
              name: (food.name || '').trim(), calories: food.calories || 0,
              protein: food.protein || 0, carbs: food.carbs || 0, fat: food.fat || 0,
            },
            tempId,
          });
          showOfflineAlert('food log');
          return;
        }

        try {
          const { data, error } = await supabase
            .from('food_logs')
            .insert({
              user_id: user.id, date: selectedDateKey,
              name: (food.name || '').trim(), calories: food.calories || 0,
              protein: food.protein || 0, carbs: food.carbs || 0, fat: food.fat || 0,
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

      removeFood: async (logId, mealType) => {
        if (!user) return;
        if (!(await checkOnline())) {
          showOfflineAlert('remove food');
          return;
        }
        try {
          const { error } = await supabase.from('food_logs').delete().eq('id', logId).eq('user_id', user.id);
          if (error) { if (__DEV__) console.error('[Meal] Remove error:', error.code); return; }
          dispatch({ type: 'REMOVE_FOOD', payload: { logId, mealType, dateKey: selectedDateKey } });
          await triggerHaptic('light');
        } catch (error) {
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
        } catch (error) {
          if (__DEV__) console.error('[Meal] Reset failed:', error.message);
        }
      },

      updateGoals: (goals) => dispatch({ type: 'UPDATE_GOALS', payload: goals }),

      addWater: async (amount = 250) => {
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
        } catch (error) {
          if (__DEV__) console.error('[Meal] Reset water failed:', error.message);
        }
      },

      setWaterGoal: (goal) => dispatch({ type: 'SET_WATER_GOAL', payload: goal }),

      addExercise: async (exercise, duration, caloriesBurned) => {
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

      removeExercise: async (logId) => {
        if (!user) return;
        if (!(await checkOnline())) { showOfflineAlert('remove exercise'); return; }
        try {
          const { error } = await supabase.from('workouts').delete().eq('id', logId).eq('user_id', user.id);
          if (error) { if (__DEV__) console.error('[Meal] Remove exercise error:', error.code); return; }
          dispatch({ type: 'REMOVE_EXERCISE', payload: { logId, dateKey: selectedDateKey } });
          await triggerHaptic('light');
        } catch (error) {
          if (__DEV__) console.error('[Meal] Remove exercise failed:', error.message);
        }
      },

      /**
       * MISSION 2: Copy all items from yesterday's meal into today.
       * @param {string} mealType - 'breakfast' | 'lunch' | 'dinner' | 'snacks'
       * @returns {number} count of items copied
       */
      copyMealFromYesterday: async (mealType) => {
        if (!user) return 0;

        const yesterdayKey = formatDateKey(subDays(selectedDate, 1));

        // Ensure yesterday's data is fetched
        if (!fetchedDatesRef.current.has(yesterdayKey)) {
          await fetchDayData(yesterdayKey);
        }

        const yesterdayData = getDayData(stateRef.current, yesterdayKey);
        const items = yesterdayData.meals[mealType] || [];

        if (items.length === 0) {
          Alert.alert('Nothing to Copy', `You didn't log any ${mealType} yesterday.`);
          return 0;
        }

        // Copy each item as a new food entry
        let copied = 0;
        for (const item of items) {
          const food = {
            name: item.name,
            emoji: item.emoji,
            calories: item.calories,
            protein: item.protein,
            carbs: item.carbs,
            fat: item.fat,
            serving: item.serving,
            servingSize: item.servingSize,
            servingUnit: item.servingUnit,
          };

          const tempId = `temp-copy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          const optimisticFood = { ...food, id: tempId };
          dispatch({ type: 'ADD_FOOD', payload: { food: optimisticFood, mealType, dateKey: selectedDateKey } });

          const online = await checkOnline();
          if (!online) {
            await queueOperation({
              table: 'food_logs', type: 'INSERT',
              payload: {
                user_id: user.id, date: selectedDateKey,
                name: (food.name || '').trim(), calories: food.calories || 0,
                protein: food.protein || 0, carbs: food.carbs || 0, fat: food.fat || 0,
              },
            });
          } else {
            try {
              const { data, error } = await supabase.from('food_logs')
                .insert({
                  user_id: user.id, date: selectedDateKey,
                  name: (food.name || '').trim(), calories: food.calories || 0,
                  protein: food.protein || 0, carbs: food.carbs || 0, fat: food.fat || 0,
                })
                .select().single();

              if (!error && data) {
                dispatch({ type: 'REMOVE_FOOD', payload: { logId: tempId, mealType, dateKey: selectedDateKey } });
                dispatch({ type: 'ADD_FOOD', payload: { food: { ...food, id: data.id }, mealType, dateKey: selectedDateKey } });
              }
            } catch {
              // Keep optimistic entry
            }
          }
          copied++;
        }

        if (!isPlanningMode) awardXP('LOG_FOOD');
        await triggerHaptic('success');
        return copied;
      },
    }),
    [user, selectedDateKey, selectedDate, isPlanningMode, triggerHaptic, awardXP, checkOnline, queueOperation, showOfflineAlert, fetchDayData]
  );

  // Profile-aware goals
  const activeGoals = useMemo(() => {
    if (isProfileComplete && calculatedGoals) {
      return { calories: calculatedGoals.calories, protein: calculatedGoals.protein, carbs: calculatedGoals.carbs, fat: calculatedGoals.fat };
    }
    return state.goals;
  }, [isProfileComplete, calculatedGoals, state.goals]);

  const currentDayData = useMemo(() => getDayData(state, selectedDateKey), [state, selectedDateKey]);

  const weeklyData = useMemo(() => getCalorieData(state.dayData, activeGoals.calories, 7), [state.dayData, activeGoals.calories]);
  const weeklyStats = useMemo(() => calcWeeklyStats(weeklyData), [weeklyData]);

  // Extended range data for stats screen (30/90 day)
  const getCalorieDataForRange = useCallback((days) => {
    return getCalorieData(stateRef.current.dayData, activeGoals.calories, days);
  }, [activeGoals.calories]);

  // Get totals for any given date key (used by MorningBriefing)
  const getDayTotals = useCallback((dateKey) => {
    return getDayData(stateRef.current, dateKey).totals;
  }, []);

  const mealCalories = useMemo(() => {
    const meals = currentDayData.meals;
    return {
      breakfast: meals.breakfast?.reduce((s, i) => s + i.calories, 0) || 0,
      lunch: meals.lunch?.reduce((s, i) => s + i.calories, 0) || 0,
      dinner: meals.dinner?.reduce((s, i) => s + i.calories, 0) || 0,
      snacks: meals.snacks?.reduce((s, i) => s + i.calories, 0) || 0,
    };
  }, [currentDayData.meals]);

  const waterProgress = useMemo(() => {
    const waterIntake = currentDayData.waterIntake || 0;
    const glasses = Math.floor(waterIntake / 250);
    const glassesGoal = Math.floor(state.waterGoal / 250);
    const percentage = Math.min((waterIntake / state.waterGoal) * 100, 100);
    return { ml: waterIntake, goal: state.waterGoal, glasses, glassesGoal, percentage, remaining: Math.max(state.waterGoal - waterIntake, 0) };
  }, [currentDayData.waterIntake, state.waterGoal]);

  const calorieBalance = useMemo(() => {
    const foodCalories = currentDayData.totals.calories;
    const burnedCalories = currentDayData.caloriesBurned || 0;
    const baseGoal = activeGoals.calories;
    const effectiveGoal = baseGoal + burnedCalories;
    const remaining = effectiveGoal - foodCalories;
    return { food: foodCalories, burned: burnedCalories, net: foodCalories - burnedCalories, baseGoal, effectiveGoal, remaining, exerciseMinutes: currentDayData.exerciseMinutes || 0 };
  }, [currentDayData, activeGoals.calories]);

  const value = useMemo(
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
    }),
    [
      state, activeGoals, isLoading, profileLoading, isFetchingDay,
      selectedDate, selectedDateKey, isPlanningMode,
      changeDate, goToToday, goToDate, getDateLabel, getShoppingList,
      currentDayData, waterProgress, calorieBalance, mealCalories,
      weeklyData, weeklyStats, getCalorieDataForRange, getDayTotals, actions,
    ]
  );

  return <MealContext.Provider value={value}>{children}</MealContext.Provider>;
}

export function useMeals() {
  const context = useContext(MealContext);
  if (!context) {
    throw new Error('useMeals must be used within a MealProvider');
  }
  return context;
}

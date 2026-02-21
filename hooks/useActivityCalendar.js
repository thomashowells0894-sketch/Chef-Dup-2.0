import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval, getDay, eachMonthOfInterval, startOfYear, endOfYear } from 'date-fns';

const STORAGE_KEY = '@fueliq_activity_scores';

/**
 * useActivityCalendar
 *
 * Aggregates data from multiple sources to build a daily activity score (0-4)
 * similar to the GitHub contribution heatmap.
 *
 * Levels:
 *   0 - No activity
 *   1 - Logged some food OR water
 *   2 - Met calorie target OR completed a fast
 *   3 - Met macros + logged exercise
 *   4 - Perfect day (macros, exercise, water goal, and fasting complete)
 *
 * Data is persisted in AsyncStorage under @fueliq_activity_scores.
 * Each time the hook mounts, it also tries to enrich today's entry by reading
 * from sibling AsyncStorage keys used across FuelIQ.
 */
export default function useActivityCalendar() {
  const [scores, setScores] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  // ── Food & Fasting contexts (optional, wrapped in try/catch) ──
  let foodCtx = null;
  let fastingCtx = null;
  try {
    const { useFood } = require('../context/FoodContext');
    foodCtx = useFood();
  } catch (_) { /* context not available */ }
  try {
    const { useFasting } = require('../context/FastingContext');
    fastingCtx = useFasting();
  } catch (_) { /* context not available */ }

  // ── Load persisted scores on mount ──
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          setScores(JSON.parse(raw));
        }
      } catch (_) { /* ignore */ }

      // Enrich from sibling storage keys for historical data
      await enrichFromStorage(setScores);
      setIsLoading(false);
    })();
  }, []);

  // ── Update today's score from live context data ──
  useEffect(() => {
    if (isLoading) return;
    const today = format(new Date(), 'yyyy-MM-dd');

    const activities = [];
    let foodLogged = false;
    let waterMet = false;
    let caloriesMet = false;
    let macrosMet = false;
    let exerciseLogged = false;
    let fastCompleted = false;

    if (foodCtx) {
      try {
        const dayData = foodCtx.dayData?.[today];
        if (dayData) {
          const totalCals = dayData.totals?.calories || 0;
          const totalProtein = dayData.totals?.protein || 0;
          const totalCarbs = dayData.totals?.carbs || 0;
          const totalFat = dayData.totals?.fat || 0;

          // Check if any food logged
          const mealTypes = ['breakfast', 'lunch', 'dinner', 'snacks'];
          const anyFood = mealTypes.some(m => (dayData.meals?.[m] || []).length > 0);
          if (anyFood) {
            foodLogged = true;
            activities.push('Food logged');
          }

          // Check water goal
          const waterIntake = dayData.waterIntake || 0;
          const waterGoal = foodCtx.waterGoal || 2500;
          if (waterIntake >= waterGoal) {
            waterMet = true;
            activities.push('Water goal met');
          } else if (waterIntake > 0) {
            activities.push('Water tracked');
          }

          // Check calorie target
          const calorieGoal = foodCtx.goals?.calories || 2000;
          if (totalCals > 0 && totalCals >= calorieGoal * 0.85 && totalCals <= calorieGoal * 1.15) {
            caloriesMet = true;
            activities.push('Calorie target met');
          }

          // Check macros (within 15% of goals)
          const proteinGoal = foodCtx.goals?.protein || 150;
          const carbsGoal = foodCtx.goals?.carbs || 250;
          const fatGoal = foodCtx.goals?.fat || 65;
          const proteinOk = totalProtein >= proteinGoal * 0.85;
          const carbsOk = totalCarbs >= carbsGoal * 0.75;
          const fatOk = totalFat >= fatGoal * 0.75;
          if (proteinOk && carbsOk && fatOk) {
            macrosMet = true;
            activities.push('Macros met');
          }

          // Check exercise
          const exercises = dayData.exercises || [];
          if (exercises.length > 0 || (dayData.exerciseMinutes && dayData.exerciseMinutes > 0)) {
            exerciseLogged = true;
            activities.push('Exercise logged');
          }
        }
      } catch (_) { /* ignore */ }
    }

    if (fastingCtx) {
      try {
        // If not currently fasting but has recorded a completed fast
        if (!fastingCtx.isFasting && fastingCtx.fastingProgress?.isComplete) {
          fastCompleted = true;
          activities.push('Fasting completed');
        }
      } catch (_) { /* ignore */ }
    }

    // Compute level
    let level = 0;
    if (foodLogged || waterMet) level = 1;
    if (caloriesMet || fastCompleted) level = Math.max(level, 2);
    if (macrosMet && exerciseLogged) level = Math.max(level, 3);
    if (macrosMet && exerciseLogged && waterMet && fastCompleted) level = 4;

    // Only update if we actually have data to record
    if (level > 0 || activities.length > 0) {
      setScores(prev => {
        const existing = prev[today] || {};
        const existingLevel = existing.level || 0;
        // Only update if the new level is higher or we have more activities
        if (level >= existingLevel || activities.length > (existing.activities || []).length) {
          return {
            ...prev,
            [today]: {
              level: Math.max(level, existingLevel),
              activities: [...new Set([...(existing.activities || []), ...activities])],
              foodLogged: foodLogged || existing.foodLogged,
              waterMet: waterMet || existing.waterMet,
              exerciseLogged: exerciseLogged || existing.exerciseLogged,
              fastCompleted: fastCompleted || existing.fastCompleted,
              sleepLogged: existing.sleepLogged || false,
              habitsCompleted: existing.habitsCompleted || 0,
              habitsTotal: existing.habitsTotal || 0,
              exerciseMinutes: existing.exerciseMinutes || 0,
              updatedAt: new Date().toISOString(),
            },
          };
        }
        return prev;
      });
    }
  }, [isLoading, foodCtx?.dayData, fastingCtx?.isFasting]);

  // ── Persist scores when they change ──
  useEffect(() => {
    if (isLoading) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(scores)).catch(() => {});
  }, [scores, isLoading]);

  // ── Record activity manually ──
  const recordActivity = useCallback((date, data) => {
    const dateStr = typeof date === 'string' ? date : format(date, 'yyyy-MM-dd');
    setScores(prev => {
      const existing = prev[dateStr] || {};
      const merged = { ...existing, ...data, updatedAt: new Date().toISOString() };

      // Recompute level from merged data
      let level = 0;
      if (merged.foodLogged || merged.waterMet) level = 1;
      if (merged.caloriesMet || merged.fastCompleted) level = Math.max(level, 2);
      if (merged.macrosMet && merged.exerciseLogged) level = Math.max(level, 3);
      if (merged.macrosMet && merged.exerciseLogged && merged.waterMet && merged.fastCompleted) level = 4;

      // Fallback: use original scoring if fields match the old schema
      if (level === 0) {
        let score = 0;
        if (merged.foodLogged) score++;
        if (merged.exerciseMinutes > 0 || merged.exerciseLogged) score++;
        if (merged.waterMet) score++;
        if (merged.fastCompleted || merged.sleepLogged) score++;
        if (merged.habitsTotal > 0 && merged.habitsCompleted >= merged.habitsTotal) score++;
        level = Math.min(score, 4);
      }

      merged.level = Math.max(level, merged.level || 0);
      return { ...prev, [dateStr]: merged };
    });
  }, []);

  // ── Get activity level for a date ──
  const getActivityLevel = useCallback((dateStr) => {
    const entry = scores[dateStr];
    if (!entry) return 0;
    if (typeof entry.level === 'number') return entry.level;

    // Fallback computation
    let score = 0;
    if (entry.foodLogged) score++;
    if (entry.exerciseMinutes > 0 || entry.exerciseLogged) score++;
    if (entry.waterMet) score++;
    if (entry.fastCompleted || entry.sleepLogged) score++;
    if (entry.habitsTotal > 0 && entry.habitsCompleted >= entry.habitsTotal) score++;
    return Math.min(score, 4);
  }, [scores]);

  // ── getMonthData(year, month) ──
  const getMonthData = useCallback((yearOrDate, month) => {
    let start, end;
    if (typeof yearOrDate === 'number' && typeof month === 'number') {
      const d = new Date(yearOrDate, month, 1);
      start = startOfMonth(d);
      end = endOfMonth(d);
    } else {
      // Accept a Date object for backward compatibility
      start = startOfMonth(yearOrDate);
      end = endOfMonth(yearOrDate);
    }

    const days = eachDayOfInterval({ start, end });
    return days.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const entry = scores[dateStr] || null;
      const level = getActivityLevel(dateStr);
      return {
        date: dateStr,
        dayOfMonth: day.getDate(),
        dayOfWeek: getDay(day),
        level,
        activities: entry?.activities || [],
        details: entry,
      };
    });
  }, [getActivityLevel, scores]);

  // ── getCurrentStreak() - consecutive days with level >= 1 ──
  const getCurrentStreak = useCallback(() => {
    let streak = 0;
    for (let i = 0; i < 365; i++) {
      const day = format(subDays(new Date(), i), 'yyyy-MM-dd');
      if (getActivityLevel(day) >= 1) {
        streak++;
      } else {
        // Allow skipping today if it's early in the day
        if (i === 0) continue;
        break;
      }
    }
    return streak;
  }, [getActivityLevel]);

  // ── getBestStreak() - best all-time streak ──
  const getBestStreak = useCallback(() => {
    const sortedDates = Object.keys(scores)
      .filter(k => getActivityLevel(k) >= 1)
      .sort();

    if (sortedDates.length === 0) return 0;

    let best = 1;
    let current = 1;

    for (let i = 1; i < sortedDates.length; i++) {
      const prevDate = new Date(sortedDates[i - 1] + 'T12:00:00');
      const currDate = new Date(sortedDates[i] + 'T12:00:00');
      const diffDays = Math.round((currDate - prevDate) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        current++;
        best = Math.max(best, current);
      } else {
        current = 1;
      }
    }
    return best;
  }, [scores, getActivityLevel]);

  // ── getMonthScore(year, month) - average activity level as percentage ──
  const getMonthScore = useCallback((year, month) => {
    const monthData = getMonthData(year, month);
    if (monthData.length === 0) return 0;

    // Only count days up to today
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const relevantDays = monthData.filter(d => d.date <= todayStr);
    if (relevantDays.length === 0) return 0;

    const totalScore = relevantDays.reduce((sum, d) => sum + d.level, 0);
    const maxScore = relevantDays.length * 4;
    return Math.round((totalScore / maxScore) * 100);
  }, [getMonthData]);

  // ── getTotalActiveDays() ──
  const getTotalActiveDays = useCallback(() => {
    return Object.keys(scores).filter(k => getActivityLevel(k) >= 1).length;
  }, [scores, getActivityLevel]);

  // ── getMonthActiveDays(year, month) ──
  const getMonthActiveDays = useCallback((year, month) => {
    const monthData = getMonthData(year, month);
    return monthData.filter(d => d.level >= 1).length;
  }, [getMonthData]);

  // ── Backward-compat aliases ──
  const getStreak = getCurrentStreak;

  const totalActiveDays = useMemo(() => getTotalActiveDays(), [getTotalActiveDays]);

  const thisMonthStats = useMemo(() => {
    const now = new Date();
    const days = getMonthData(now);
    const active = days.filter(d => d.level >= 1).length;
    const perfect = days.filter(d => d.level >= 4).length;
    return { totalDays: days.length, activeDays: active, perfectDays: perfect };
  }, [getMonthData]);

  return {
    scores,
    activities: scores, // backward compat alias
    isLoading,
    recordActivity,
    getActivityLevel,
    getMonthData,
    getCurrentStreak,
    getBestStreak,
    getMonthScore,
    getTotalActiveDays,
    getMonthActiveDays,
    getStreak,
    totalActiveDays,
    thisMonthStats,
  };
}

/**
 * Read sibling AsyncStorage keys to enrich historical activity data.
 * This runs once on mount and backfills scores that may not have been
 * recorded if the Activity Calendar screen was not previously opened.
 */
async function enrichFromStorage(setScores) {
  try {
    const keys = [
      '@fueliq_workout_history',
      '@fueliq_weight_history',
      '@fueliq_sleep_history',
      '@fueliq_fasting_history',
      '@fueliq_water_history',
      '@fueliq_habits_log',
    ];

    const results = await AsyncStorage.multiGet(keys);
    const storageMap = {};
    results.forEach(([key, val]) => {
      if (val) {
        try {
          storageMap[key] = JSON.parse(val);
        } catch (_) { /* ignore */ }
      }
    });

    setScores(prev => {
      const updated = { ...prev };
      let changed = false;

      // Workout history
      const workouts = storageMap['@fueliq_workout_history'];
      if (Array.isArray(workouts)) {
        workouts.forEach(w => {
          const dateStr = w.date ? w.date.slice(0, 10) : null;
          if (!dateStr) return;
          if (!updated[dateStr]) updated[dateStr] = {};
          if (!updated[dateStr].exerciseLogged) {
            updated[dateStr].exerciseLogged = true;
            updated[dateStr].exerciseMinutes = w.duration || w.exerciseMinutes || 30;
            if (!updated[dateStr].activities) updated[dateStr].activities = [];
            if (!updated[dateStr].activities.includes('Exercise logged')) {
              updated[dateStr].activities.push('Exercise logged');
            }
            changed = true;
          }
        });
      }

      // Fasting history
      const fasts = storageMap['@fueliq_fasting_history'];
      if (Array.isArray(fasts)) {
        fasts.forEach(f => {
          const dateStr = f.date ? f.date.slice(0, 10) : null;
          if (!dateStr) return;
          if (!updated[dateStr]) updated[dateStr] = {};
          if (f.completed && !updated[dateStr].fastCompleted) {
            updated[dateStr].fastCompleted = true;
            if (!updated[dateStr].activities) updated[dateStr].activities = [];
            if (!updated[dateStr].activities.includes('Fasting completed')) {
              updated[dateStr].activities.push('Fasting completed');
            }
            changed = true;
          }
        });
      }

      // Sleep history
      const sleep = storageMap['@fueliq_sleep_history'];
      if (Array.isArray(sleep)) {
        sleep.forEach(s => {
          const dateStr = s.date ? s.date.slice(0, 10) : null;
          if (!dateStr) return;
          if (!updated[dateStr]) updated[dateStr] = {};
          if (!updated[dateStr].sleepLogged) {
            updated[dateStr].sleepLogged = true;
            if (!updated[dateStr].activities) updated[dateStr].activities = [];
            if (!updated[dateStr].activities.includes('Sleep logged')) {
              updated[dateStr].activities.push('Sleep logged');
            }
            changed = true;
          }
        });
      }

      // Weight history
      const weights = storageMap['@fueliq_weight_history'];
      if (Array.isArray(weights)) {
        weights.forEach(w => {
          const dateStr = w.date ? w.date.slice(0, 10) : null;
          if (!dateStr) return;
          if (!updated[dateStr]) updated[dateStr] = {};
          if (!updated[dateStr].activities) updated[dateStr].activities = [];
          if (!updated[dateStr].activities.includes('Weight logged')) {
            updated[dateStr].activities.push('Weight logged');
            changed = true;
          }
        });
      }

      // Water history
      const water = storageMap['@fueliq_water_history'];
      if (Array.isArray(water)) {
        water.forEach(w => {
          const dateStr = w.date ? w.date.slice(0, 10) : null;
          if (!dateStr) return;
          if (!updated[dateStr]) updated[dateStr] = {};
          if (w.met && !updated[dateStr].waterMet) {
            updated[dateStr].waterMet = true;
            if (!updated[dateStr].activities) updated[dateStr].activities = [];
            if (!updated[dateStr].activities.includes('Water goal met')) {
              updated[dateStr].activities.push('Water goal met');
            }
            changed = true;
          }
        });
      }

      // Habits log
      const habits = storageMap['@fueliq_habits_log'];
      if (habits && typeof habits === 'object') {
        Object.entries(habits).forEach(([dateStr, data]) => {
          if (!dateStr || dateStr.length !== 10) return;
          if (!updated[dateStr]) updated[dateStr] = {};
          if (data.completed !== undefined && data.total !== undefined) {
            updated[dateStr].habitsCompleted = data.completed;
            updated[dateStr].habitsTotal = data.total;
            if (!updated[dateStr].activities) updated[dateStr].activities = [];
            if (data.completed >= data.total && data.total > 0) {
              if (!updated[dateStr].activities.includes('All habits completed')) {
                updated[dateStr].activities.push('All habits completed');
                changed = true;
              }
            }
          }
        });
      }

      // Recompute levels for all enriched entries
      if (changed) {
        Object.keys(updated).forEach(dateStr => {
          const entry = updated[dateStr];
          let score = 0;
          if (entry.foodLogged) score++;
          if (entry.exerciseMinutes > 0 || entry.exerciseLogged) score++;
          if (entry.waterMet) score++;
          if (entry.fastCompleted || entry.sleepLogged) score++;
          if (entry.habitsTotal > 0 && entry.habitsCompleted >= entry.habitsTotal) score++;
          entry.level = Math.max(Math.min(score, 4), entry.level || 0);
        });
      }

      return changed ? updated : prev;
    });
  } catch (_) {
    // Silently fail enrichment
  }
}

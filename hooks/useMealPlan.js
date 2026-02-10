import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useProfile } from '../context/ProfileContext';
import { generateMealPlan } from '../services/ai';

const STORAGE_KEY = '@vibefit_meal_plan';

/**
 * Get the ISO week number for a given date.
 */
function getISOWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  return (
    1 +
    Math.round(
      ((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7
    )
  );
}

/**
 * Check if a timestamp falls within the current ISO week.
 * A meal plan is considered stale after 7 days (different ISO week).
 */
function isCurrentWeek(timestamp) {
  if (!timestamp) return false;
  const now = new Date();
  const then = new Date(timestamp);
  return (
    getISOWeek(now) === getISOWeek(then) &&
    now.getFullYear() === then.getFullYear()
  );
}

/**
 * Hook for managing AI-generated meal plans with caching.
 *
 * - Caches meal plan in AsyncStorage with a `generatedAt` timestamp
 * - Considers the plan stale after 7 days (compares ISO weeks)
 * - Auto-generates on mount if stale
 * - Pulls calorie/macro targets and dietary prefs from useProfile
 */
export function useMealPlan() {
  const [mealPlan, setMealPlan] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastGenerated, setLastGenerated] = useState(null);
  const hasChecked = useRef(false);

  const { profile, calculatedGoals, currentGoalType } = useProfile();

  // Load cached meal plan on mount
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const cached = JSON.parse(raw);
          if (cached && cached.generatedAt) {
            setMealPlan(cached);
            setLastGenerated(cached.generatedAt);
          }
        }
      } catch {
        // Ignore storage read errors
      }
    })();
  }, []);

  // Generate a new meal plan
  const generatePlan = useCallback(async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    try {
      // Map currentGoalType ('cut', 'maintain', 'bulk') to API goal ('lose', 'maintain', 'gain')
      let goal = 'maintain';
      if (currentGoalType === 'cut') goal = 'lose';
      else if (currentGoalType === 'bulk') goal = 'gain';

      const params = {
        calorieTarget: calculatedGoals?.calories || 2000,
        proteinTarget: calculatedGoals?.protein || 150,
        carbsTarget: calculatedGoals?.carbs || 200,
        fatTarget: calculatedGoals?.fat || 65,
        dietaryPreferences: profile?.dietaryRestrictions || [],
        allergies: [],
        goal,
        daysCount: 3,
      };

      const result = await generateMealPlan(params);
      setMealPlan(result);
      setLastGenerated(result.generatedAt);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(result));
    } catch (error) {
      if (__DEV__) {
        console.error('[MealPlan] Generation failed:', error.message);
      }
    } finally {
      setIsGenerating(false);
    }
  }, [isGenerating, calculatedGoals, profile, currentGoalType]);

  // Auto-generate if stale
  useEffect(() => {
    if (hasChecked.current) return;
    hasChecked.current = true;

    const isStale = !mealPlan || !isCurrentWeek(mealPlan.generatedAt);
    if (isStale) {
      generatePlan();
    }
  }, [mealPlan, generatePlan]);

  return { mealPlan, isGenerating, generatePlan, lastGenerated };
}

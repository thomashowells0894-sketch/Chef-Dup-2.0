import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFood } from '../context/FoodContext';
import { useProfile } from '../context/ProfileContext';
import { useGamification } from '../context/GamificationContext';
import { generateMacroRecommendation } from '../services/ai';

const STORAGE_KEY = '@vibefit_adaptive_macros';

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
 * Check if a timestamp falls in the current ISO week.
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
 * Returns true if right now is past Sunday 6 PM or Monday onward.
 */
function isPastSundayEvening() {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 1=Mon
  if (day === 0) return now.getHours() >= 18; // Sunday, check 6 PM
  return true; // Mon-Sat
}

export function useAdaptiveMacros() {
  const [recommendation, setRecommendation] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const hasChecked = useRef(false);

  const { totals, goals } = useFood();
  const { profile, calculatedGoals, weightStats, updateProfile, currentGoalType } = useProfile();
  const { currentStreak } = useGamification();

  // Load cached recommendation on mount
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const cached = JSON.parse(raw);
          if (cached && cached.generatedAt && !cached.dismissed) {
            setRecommendation(cached);
          }
        }
      } catch {
        // Ignore storage read errors
      }
    })();
  }, []);

  // Build the weekData payload from context
  const buildWeekData = useCallback(() => {
    const goalMap = { cut: 'lose', maintain: 'maintain', bulk: 'gain' };
    return {
      currentCalories: calculatedGoals?.calories || goals?.calories || 2000,
      currentProtein: calculatedGoals?.protein || goals?.protein || 150,
      currentCarbs: calculatedGoals?.carbs || goals?.carbs || 200,
      currentFat: calculatedGoals?.fat || goals?.fat || 65,
      avgCaloriesConsumed: totals?.calories || 0,
      avgProteinConsumed: totals?.protein || 0,
      avgCarbsConsumed: totals?.carbs || 0,
      avgFatConsumed: totals?.fat || 0,
      adherencePercent: currentStreak > 0 ? Math.min(100, currentStreak * 14) : 0,
      weightTrend: weightStats?.weeklyChange || 0,
      weightCurrent: weightStats?.currentWeight || profile?.weight || 0,
      goal: goalMap[currentGoalType] || 'maintain',
      daysLogged: totals?.calories > 0 ? Math.max(1, Math.min(7, currentStreak)) : 0,
      avgEnergy: 0,
    };
  }, [totals, goals, calculatedGoals, profile, weightStats, currentStreak, currentGoalType]);

  // Generate a new recommendation
  const generate = useCallback(async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    try {
      const weekData = buildWeekData();
      const result = await generateMacroRecommendation(weekData);
      // Attach current values for display in the card
      const enriched = {
        ...result,
        currentCalories: weekData.currentCalories,
        currentProtein: weekData.currentProtein,
        currentCarbs: weekData.currentCarbs,
        currentFat: weekData.currentFat,
      };
      setRecommendation(enriched);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(enriched));
    } catch (error) {
      if (__DEV__) {
        console.error('[AdaptiveMacros] Generation failed:', error.message);
      }
    } finally {
      setIsGenerating(false);
    }
  }, [buildWeekData, isGenerating]);

  // Auto-generate if stale and past Sunday evening
  useEffect(() => {
    if (hasChecked.current) return;
    hasChecked.current = true;

    const isStale = !recommendation || !isCurrentWeek(recommendation.generatedAt);
    if (isStale && isPastSundayEvening()) {
      generate();
    }
  }, [recommendation, generate]);

  // Apply the recommendation to the profile
  const applyRecommendation = useCallback(async () => {
    if (!recommendation || !recommendation.shouldAdjust) return;
    await updateProfile({
      macroPreset: 'custom',
      customMacros: {
        protein: Math.round((recommendation.newProtein * 4 / recommendation.newCalories) * 100),
        carbs: Math.round((recommendation.newCarbs * 4 / recommendation.newCalories) * 100),
        fat: Math.round((recommendation.newFat * 9 / recommendation.newCalories) * 100),
      },
    });
    const dismissed = { ...recommendation, dismissed: true };
    setRecommendation(null);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(dismissed));
  }, [recommendation, updateProfile]);

  // Dismiss the current recommendation
  const dismissRecommendation = useCallback(async () => {
    if (!recommendation) return;
    const dismissed = { ...recommendation, dismissed: true };
    setRecommendation(null);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(dismissed));
  }, [recommendation]);

  return { recommendation, isGenerating, applyRecommendation, dismissRecommendation };
}

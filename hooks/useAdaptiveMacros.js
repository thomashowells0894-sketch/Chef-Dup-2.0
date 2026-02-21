import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMealTotals } from '../context/MealContext';
import { useProfile } from '../context/ProfileContext';
import { useGamification } from '../context/GamificationContext';
import { useIsPremium } from '../context/SubscriptionContext';
import { generateMacroRecommendation } from '../services/ai';
import { useAdaptiveTDEE } from './useAdaptiveTDEE';
import { usePredictiveAnalytics } from './usePredictiveAnalytics';

const STORAGE_KEY = '@fueliq_adaptive_macros';

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
  const { isPremium } = useIsPremium();
  const [recommendation, setRecommendation] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [plateauTriggered, setPlateauTriggered] = useState(false);
  const hasChecked = useRef(false);
  const plateauChecked = useRef(false);

  const { totals, goals } = useMealTotals();
  const { profile, calculatedGoals, weightStats, updateProfile, currentGoalType } = useProfile();
  const { currentStreak } = useGamification();
  const { plateauStatus } = usePredictiveAnalytics();

  // --- Adaptive TDEE integration ---
  // Pull in the adaptive TDEE engine to use real metabolic data for calorie targets
  const { estimate: tdeeEstimate } = useAdaptiveTDEE();

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

  // Build the weekData payload from context.
  // When the adaptive TDEE engine has a confident estimate, use its
  // recommendedIntake as the calorie target instead of the static
  // formula-based calculatedGoals.
  const buildWeekData = useCallback(() => {
    const goalMap = { cut: 'lose', maintain: 'maintain', bulk: 'gain' };

    // Determine the effective calorie target.
    // If adaptive TDEE has reasonable confidence (hybrid or observed), prefer it.
    const useAdaptive = tdeeEstimate &&
      tdeeEstimate.confidence >= 0.25 &&
      tdeeEstimate.estimateSource !== 'formula';

    const effectiveCalories = useAdaptive
      ? tdeeEstimate.recommendedIntake
      : (calculatedGoals?.calories || goals?.calories || 2000);

    return {
      currentCalories: effectiveCalories,
      currentProtein: calculatedGoals?.protein || goals?.protein || 150,
      currentCarbs: calculatedGoals?.carbs || goals?.carbs || 200,
      currentFat: calculatedGoals?.fat || goals?.fat || 65,
      avgCaloriesConsumed: totals?.calories || 0,
      avgProteinConsumed: totals?.protein || 0,
      avgCarbsConsumed: totals?.carbs || 0,
      avgFatConsumed: totals?.fat || 0,
      // Calculate adherence as percentage of days with logged calories in the last 7 days
      adherencePercent: totals?.calories > 0
        ? Math.min(100, Math.round((Math.min(7, Math.max(1, currentStreak)) / 7) * 100))
        : 0,
      weightTrend: weightStats?.weeklyChange || 0,
      weightCurrent: weightStats?.currentWeight || profile?.weight || 0,
      goal: goalMap[currentGoalType] || 'maintain',
      daysLogged: totals?.calories > 0 ? Math.min(7, Math.max(1, currentStreak)) : 0,
      avgEnergy: 0,
      // Pass adaptive TDEE metadata so the AI recommendation can factor it in
      adaptiveTDEE: useAdaptive ? tdeeEstimate.tdee : null,
      adaptiveConfidence: useAdaptive ? tdeeEstimate.confidence : 0,
      metabolicAdaptation: tdeeEstimate?.metabolicAdaptation || false,
      plateauDetected: tdeeEstimate?.plateauDetected || false,
      // Indicate whether this was triggered by a weekly review or a plateau detection
      triggerReason: plateauTriggered ? 'plateau_detected' : 'weekly_review',
    };
  }, [totals, goals, calculatedGoals, profile, weightStats, currentStreak, currentGoalType, tdeeEstimate, plateauTriggered]);

  // Generate a new recommendation (premium only)
  const generate = useCallback(async () => {
    if (!isPremium) return;
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

  // Auto-generate if stale and past Sunday evening (premium only)
  useEffect(() => {
    if (!isPremium) return;
    if (hasChecked.current) return;
    hasChecked.current = true;

    const isStale = !recommendation || !isCurrentWeek(recommendation.generatedAt);
    if (isStale && isPastSundayEvening()) {
      generate();
    }
  }, [recommendation, generate]);

  // Auto-trigger when a plateau is detected (premium only, regardless of day of week)
  useEffect(() => {
    if (!isPremium) return;
    if (!plateauStatus?.isPlateau) {
      plateauChecked.current = false;
      return;
    }
    if (plateauChecked.current) return;

    // Only auto-trigger if no current recommendation exists
    const hasCurrentRec = recommendation && isCurrentWeek(recommendation.generatedAt) && !recommendation.dismissed;
    if (hasCurrentRec) return;

    plateauChecked.current = true;
    setPlateauTriggered(true);
    generate();
  }, [plateauStatus, recommendation, generate]);

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

  return {
    recommendation,
    isGenerating,
    plateauTriggered,
    applyRecommendation,
    dismissRecommendation,
    // Expose adaptive TDEE data so consumers can show TDEE-aware info
    adaptiveTDEE: tdeeEstimate,
  };
}

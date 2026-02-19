/**
 * usePredictiveAnalytics - Hook for accessing predictive analytics
 */
import { useMemo } from 'react';
import { useProfile } from '../context/ProfileContext';
import { useMeals } from '../context/MealContext';
import { useGamification } from '../context/GamificationContext';
import {
  detectTrend,
  detectPlateau,
  calculateNutritionScore,
  calculateFitnessScore,
  projectGoalTimeline,
  generateWeeklyInsights,
  predictFuture,
} from '../lib/analyticsEngine';

export function usePredictiveAnalytics() {
  const { profile, weightHistory, weightStats, calculatedGoals } = useProfile();
  const { totals, weeklyData, weeklyStats, waterProgress, meals } = useMeals();
  const { currentStreak, totalXP } = useGamification();

  // Weight trend analysis
  const weightTrend = useMemo(() => {
    if (!weightHistory || weightHistory.length < 3) return null;
    const weights = weightHistory.map(w => w.weight).filter(Boolean);
    return detectTrend(weights);
  }, [weightHistory]);

  // Weight plateau detection
  const plateauStatus = useMemo(() => {
    if (!weightHistory || weightHistory.length < 7) return null;
    const weights = weightHistory.map(w => w.weight).filter(Boolean);
    return detectPlateau(weights);
  }, [weightHistory]);

  // Weight prediction
  const weightPrediction = useMemo(() => {
    if (!weightHistory || weightHistory.length < 7) return null;
    const weights = weightHistory.map(w => w.weight).filter(Boolean);
    return predictFuture(weights, 14);
  }, [weightHistory]);

  // Goal timeline projection
  const goalProjection = useMemo(() => {
    if (!profile.weight || !profile.goalWeight) return null;
    const weeklyRate = profile.weeklyGoal === 'lose2' ? 2 : profile.weeklyGoal === 'lose1' ? 1 : profile.weeklyGoal === 'lose05' ? 0.5 : profile.weeklyGoal === 'gain1' ? 1 : profile.weeklyGoal === 'gain05' ? 0.5 : 0;
    if (weeklyRate === 0) return null;
    return projectGoalTimeline(profile.weight, profile.goalWeight, weeklyRate);
  }, [profile.weight, profile.goalWeight, profile.weeklyGoal]);

  // Today's nutrition score
  const todayNutritionScore = useMemo(() => {
    const mealCount = Object.values(meals || {}).filter(arr => arr && arr.length > 0).length;
    return calculateNutritionScore({ ...totals, mealCount }, calculatedGoals);
  }, [totals, calculatedGoals, meals]);

  // Overall fitness score
  const fitnessScore = useMemo(() => {
    return calculateFitnessScore({
      streak: currentStreak,
      weeklyWorkouts: weeklyStats?.daysTracked || 0,
      nutritionScore: todayNutritionScore.score,
      waterAdherence: waterProgress?.percentage || 0,
      sleepScore: 70, // Default until sleep tracking is connected
      weightProgress: weightTrend?.slope || 0,
    });
  }, [currentStreak, weeklyStats, todayNutritionScore, waterProgress, weightTrend]);

  // Weekly insights
  const weeklyInsights = useMemo(() => {
    return generateWeeklyInsights({
      daysLogged: weeklyStats?.daysTracked || 0,
      avgCalories: weeklyStats?.avgCalories || 0,
      avgProtein: weeklyStats?.avgProtein || 0,
      proteinGoal: calculatedGoals?.protein || 150,
      streak: currentStreak,
      avgWaterPercent: waterProgress?.percentage || 0,
      calorieVariance: 0,
    });
  }, [weeklyStats, calculatedGoals, currentStreak, waterProgress]);

  return {
    weightTrend,
    plateauStatus,
    weightPrediction,
    goalProjection,
    todayNutritionScore,
    fitnessScore,
    weeklyInsights,
  };
}

export default usePredictiveAnalytics;

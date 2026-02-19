import { useMemo } from 'react';
import { useMeals } from '../context/MealContext';
import { useProfile } from '../context/ProfileContext';
import { useFasting } from '../context/FastingContext';
import { useGamification } from '../context/GamificationContext';
import { usePredictiveAnalytics } from './usePredictiveAnalytics';

interface AIContextData {
  name?: string;
  weight?: number;
  weightUnit?: string;
  height?: number;
  age?: number;
  gender?: string;
  tdee?: number;
  goal?: string;
  todayCalories?: number;
  todayProtein?: number;
  todayCarbs?: number;
  todayFat?: number;
  calorieGoal?: number;
  proteinGoal?: number;
  carbsGoal?: number;
  fatGoal?: number;
  remainingCalories?: number;
  waterProgress?: string;
  isFasting?: boolean;
  fastingProgress?: string;
  streak?: number;
  totalXP?: number;
  level?: string;
  weeklyAvgCalories?: number;
  weeklyAvgProtein?: number;
  daysTrackedThisWeek?: number;
  fitnessScore?: number;
  nutritionScore?: number;
  nutritionGrade?: string;
  weightTrend?: string;
  isOnPlateau?: boolean;
}

/**
 * Aggregates user data from all contexts into a plain serializable object
 * for passing to the AI nutritionist as prompt context.
 */
export function useAIContext(): AIContextData {
  const { totals, goals, remaining, waterProgress, weeklyStats } = useMeals();
  const { profile } = useProfile();
  const { isFasting, fastingProgress, formattedElapsed, formattedRemaining } = useFasting();
  const { currentStreak, totalXP, levelInfo } = useGamification();
  const { fitnessScore, todayNutritionScore, plateauStatus, weightTrend } = usePredictiveAnalytics();

  return useMemo((): AIContextData => {
    const ctx: AIContextData = {};

    // Profile data
    if (profile) {
      if (profile.name) ctx.name = profile.name;
      if (profile.weight) {
        ctx.weight = profile.weight;
        ctx.weightUnit = profile.weightUnit || 'lbs';
      }
      if (profile.height) ctx.height = profile.height;
      if (profile.age) ctx.age = profile.age;
      if (profile.gender) ctx.gender = profile.gender;
      if (profile.tdee) ctx.tdee = profile.tdee;
      if (profile.weeklyGoal) ctx.goal = profile.weeklyGoal;
    }

    // Today's nutrition
    if (totals) {
      ctx.todayCalories = totals.calories || 0;
      ctx.todayProtein = totals.protein || 0;
      ctx.todayCarbs = totals.carbs || 0;
      ctx.todayFat = totals.fat || 0;
    }

    if (goals) {
      ctx.calorieGoal = goals.calories || 0;
      ctx.proteinGoal = goals.protein || 0;
      ctx.carbsGoal = goals.carbs || 0;
      ctx.fatGoal = goals.fat || 0;
    }

    if (remaining) {
      ctx.remainingCalories = remaining.calories || 0;
    }

    // Water progress
    if (waterProgress) {
      ctx.waterProgress = `${waterProgress.glasses}/${waterProgress.glassesGoal} glasses (${waterProgress.percentage}%)`;
    }

    // Fasting state
    ctx.isFasting = !!isFasting;
    if (isFasting && fastingProgress) {
      ctx.fastingProgress = `${formattedElapsed || '0h 0m'} elapsed, ${formattedRemaining || '0h 0m'} remaining (${Math.round((fastingProgress.progress || 0) * 100)}%)`;
    }

    // Gamification
    ctx.streak = currentStreak || 0;
    ctx.totalXP = totalXP || 0;
    if (levelInfo) ctx.level = levelInfo.name;

    // Weekly stats
    if (weeklyStats) {
      ctx.weeklyAvgCalories = weeklyStats.avgCalories || 0;
      ctx.weeklyAvgProtein = weeklyStats.avgProtein || 0;
      ctx.daysTrackedThisWeek = weeklyStats.daysTracked || 0;
    }

    // Fitness & Nutrition Scores
    if (fitnessScore?.score) ctx.fitnessScore = fitnessScore.score;
    if (todayNutritionScore?.score) ctx.nutritionScore = todayNutritionScore.score;
    if (todayNutritionScore?.grade) ctx.nutritionGrade = todayNutritionScore.grade;

    // Weight trend & plateau
    if (weightTrend) ctx.weightTrend = weightTrend.direction;
    if (plateauStatus?.isPlateaued) ctx.isOnPlateau = true;

    return ctx;
  }, [totals, goals, remaining, waterProgress, profile, isFasting, fastingProgress, formattedElapsed, formattedRemaining, currentStreak, totalXP, levelInfo, weeklyStats, fitnessScore, todayNutritionScore, weightTrend, plateauStatus]);
}

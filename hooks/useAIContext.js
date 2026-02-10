import { useMemo } from 'react';
import { useFood } from '../context/FoodContext';
import { useProfile } from '../context/ProfileContext';
import { useFasting } from '../context/FastingContext';
import { useGamification } from '../context/GamificationContext';

/**
 * Aggregates user data from all contexts into a plain serializable object
 * for passing to the AI nutritionist as prompt context.
 */
export function useAIContext() {
  const { totals, goals, remaining, waterProgress } = useFood();
  const { profile } = useProfile();
  const { isFasting, fastingProgress, formattedElapsed, formattedRemaining } = useFasting();
  const { currentStreak, totalXP } = useGamification();

  return useMemo(() => {
    const ctx = {};

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

    return ctx;
  }, [totals, goals, remaining, waterProgress, profile, isFasting, fastingProgress, formattedElapsed, formattedRemaining, currentStreak, totalXP]);
}

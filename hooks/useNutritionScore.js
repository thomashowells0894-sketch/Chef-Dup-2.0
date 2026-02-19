import { useMemo } from 'react';
import { useCurrentDayMeals, useMealTotals } from '../context/MealContext';
import { Colors } from '../constants/theme';

/**
 * useNutritionScore - Computes daily nutrition quality scores.
 *
 * Scoring (0-100):
 *   Calorie accuracy  25 pts
 *   Protein target     25 pts
 *   Macro balance      20 pts
 *   Meal consistency   15 pts
 *   Variety            15 pts
 */
export default function useNutritionScore() {
  const { meals } = useCurrentDayMeals();
  const { totals, goals, mealCalories } = useMealTotals();

  // ---- Flat list of every food item for the selected day ----
  const allFoods = useMemo(() => {
    if (!meals) return [];
    return [
      ...(meals.breakfast || []),
      ...(meals.lunch || []),
      ...(meals.dinner || []),
      ...(meals.snacks || []),
    ];
  }, [meals]);

  const hasFood = allFoods.length > 0;

  // ---- Individual category scores ----

  const calorieScore = useMemo(() => {
    if (!hasFood || !goals.calories) return 0;
    const ratio = totals.calories / goals.calories;
    // Perfect = 1.0, lose points for deviation
    const accuracy = 1 - Math.min(Math.abs(1 - ratio), 1);
    return Math.round(accuracy * 25);
  }, [hasFood, totals.calories, goals.calories]);

  const proteinScore = useMemo(() => {
    if (!hasFood || !goals.protein) return 0;
    const pct = Math.min(totals.protein / goals.protein, 1);
    return Math.round(pct * 25);
  }, [hasFood, totals.protein, goals.protein]);

  const macroScore = useMemo(() => {
    if (!hasFood) return 0;
    const totalMacroGrams = totals.protein + totals.carbs + totals.fat;
    if (totalMacroGrams === 0) return 0;

    const goalTotal = goals.protein + goals.carbs + goals.fat;
    if (goalTotal === 0) return 0;

    // Target split from goals
    const idealProt = goals.protein / goalTotal;
    const idealCarbs = goals.carbs / goalTotal;
    const idealFat = goals.fat / goalTotal;

    const actualProt = totals.protein / totalMacroGrams;
    const actualCarbs = totals.carbs / totalMacroGrams;
    const actualFat = totals.fat / totalMacroGrams;

    // Sum of absolute deviations (max deviation = 2, when completely off)
    const deviation =
      Math.abs(idealProt - actualProt) +
      Math.abs(idealCarbs - actualCarbs) +
      Math.abs(idealFat - actualFat);

    const balance = Math.max(0, 1 - deviation);
    return Math.round(balance * 20);
  }, [hasFood, totals, goals]);

  const consistencyScore = useMemo(() => {
    if (!meals) return 0;
    let score = 0;
    if (meals.breakfast && meals.breakfast.length > 0) score += 5;
    if (meals.lunch && meals.lunch.length > 0) score += 5;
    if (meals.dinner && meals.dinner.length > 0) score += 5;
    return score;
  }, [meals]);

  const varietyScore = useMemo(() => {
    if (!hasFood) return 0;
    const uniqueNames = new Set(
      allFoods.map((f) => (f.name || '').toLowerCase().trim())
    );
    // 5+ unique foods = full 15 pts
    const count = uniqueNames.size;
    const pct = Math.min(count / 5, 1);
    return Math.round(pct * 15);
  }, [hasFood, allFoods]);

  // ---- Aggregates ----

  const dailyScore = useMemo(
    () =>
      hasFood
        ? calorieScore + proteinScore + macroScore + consistencyScore + varietyScore
        : 0,
    [hasFood, calorieScore, proteinScore, macroScore, consistencyScore, varietyScore]
  );

  const scoreBreakdown = useMemo(
    () => ({
      calories: calorieScore,
      protein: proteinScore,
      macros: macroScore,
      consistency: consistencyScore,
      variety: varietyScore,
    }),
    [calorieScore, proteinScore, macroScore, consistencyScore, varietyScore]
  );

  const grade = useMemo(() => {
    if (dailyScore >= 90) return 'A+';
    if (dailyScore >= 80) return 'A';
    if (dailyScore >= 70) return 'B';
    if (dailyScore >= 60) return 'C';
    if (dailyScore >= 50) return 'D';
    return 'F';
  }, [dailyScore]);

  const gradeColor = useMemo(() => {
    if (dailyScore >= 90) return Colors.gold;
    if (dailyScore >= 80) return Colors.success;
    if (dailyScore >= 70) return Colors.primary;
    if (dailyScore >= 60) return Colors.warning;
    if (dailyScore >= 50) return Colors.secondary;
    return Colors.error;
  }, [dailyScore]);

  // ---- Meal timing data ----

  const mealTimingData = useMemo(() => {
    if (!meals) return [];
    const types = ['breakfast', 'lunch', 'dinner', 'snacks'];
    return types
      .map((mealType) => {
        const items = meals[mealType] || [];
        if (items.length === 0) return null;
        const times = items
          .map((f) => (f.loggedAt ? new Date(f.loggedAt) : null))
          .filter(Boolean)
          .sort((a, b) => a - b);
        const totalCalories = items.reduce((s, f) => s + (f.calories || 0), 0);
        return {
          mealType,
          firstFoodTime: times[0] || null,
          lastFoodTime: times[times.length - 1] || null,
          totalCalories,
        };
      })
      .filter(Boolean);
  }, [meals]);

  const eatingWindow = useMemo(() => {
    const allTimes = allFoods
      .map((f) => (f.loggedAt ? new Date(f.loggedAt) : null))
      .filter(Boolean)
      .sort((a, b) => a - b);

    if (allTimes.length === 0) return { start: null, end: null, durationHours: 0 };
    const start = allTimes[0];
    const end = allTimes[allTimes.length - 1];
    const durationHours = Math.round(((end - start) / (1000 * 60 * 60)) * 100) / 100;
    return { start, end, durationHours };
  }, [allFoods]);

  const mealDistribution = useMemo(() => {
    const total = totals.calories || 1; // avoid division by zero
    const mc = mealCalories || { breakfast: 0, lunch: 0, dinner: 0, snacks: 0 };
    return {
      breakfast: Math.round((mc.breakfast / total) * 100),
      lunch: Math.round((mc.lunch / total) * 100),
      dinner: Math.round((mc.dinner / total) * 100),
      snack: Math.round((mc.snacks / total) * 100),
    };
  }, [totals.calories, mealCalories]);

  // ---- Improvement tips ----

  const tips = useMemo(() => {
    if (!hasFood) return [];
    const items = [];

    // Sort categories by how far below max they are
    const categories = [
      { key: 'calories', score: calorieScore, max: 25 },
      { key: 'protein', score: proteinScore, max: 25 },
      { key: 'macros', score: macroScore, max: 20 },
      { key: 'consistency', score: consistencyScore, max: 15 },
      { key: 'variety', score: varietyScore, max: 15 },
    ].sort((a, b) => a.score / a.max - b.score / b.max);

    for (const cat of categories) {
      if (items.length >= 3) break;
      const pct = cat.score / cat.max;
      if (pct >= 0.85) continue; // already good

      switch (cat.key) {
        case 'calories': {
          const diff = totals.calories - goals.calories;
          if (diff > 0) {
            items.push(`You're ${diff} cal over target. Try swapping a snack for a lighter option.`);
          } else {
            items.push(
              `You're ${Math.abs(diff)} cal under target. Consider adding a healthy snack.`
            );
          }
          break;
        }
        case 'protein': {
          const remaining = goals.protein - totals.protein;
          if (remaining > 0) {
            items.push(
              `Add ${remaining}g more protein. Try Greek yogurt, chicken, or a protein shake.`
            );
          }
          break;
        }
        case 'macros':
          items.push(
            'Your macro split is off-balance. Try adjusting your carb and fat portions.'
          );
          break;
        case 'consistency': {
          const missing = [];
          if (!meals.breakfast?.length) missing.push('breakfast');
          if (!meals.lunch?.length) missing.push('lunch');
          if (!meals.dinner?.length) missing.push('dinner');
          if (missing.length > 0) {
            items.push(`Log ${missing.join(' and ')} to boost your meal consistency score.`);
          }
          break;
        }
        case 'variety':
          items.push(
            'Try adding more diverse foods. Aim for 5+ unique items per day.'
          );
          break;
      }
    }

    return items;
  }, [hasFood, calorieScore, proteinScore, macroScore, consistencyScore, varietyScore, totals, goals, meals]);

  return {
    dailyScore,
    scoreBreakdown,
    grade,
    gradeColor,
    mealTimingData,
    eatingWindow,
    mealDistribution,
    tips,
    hasFood,
  };
}

/**
 * Smart Coach Meal Recommendation Engine
 * Recommends meals based on remaining calories/protein budget
 */

import { mealDatabase } from '../data/mealDatabase';

const CALORIE_BUFFER = 100; // Allow ±100 kcal flexibility

/**
 * Get recommended meals based on remaining nutritional budget
 * @param {number} remainingCalories - Calories left for the day
 * @param {number} remainingProtein - Protein grams left for the day
 * @param {string} preferredMealType - Optional: filter by meal category
 * @returns {object} - Three recommendation categories
 */
export function getRecommendations(remainingCalories, remainingProtein, preferredMealType = null) {
  // Filter meals that fit within the calorie budget (±buffer)
  const maxCalories = remainingCalories + CALORIE_BUFFER;
  const minCalories = Math.max(0, remainingCalories - CALORIE_BUFFER * 3); // Allow lower, but not too low

  let eligibleMeals = mealDatabase.filter((meal) => {
    const fitsCalories = meal.calories <= maxCalories && meal.calories >= minCalories;
    const matchesMealType = !preferredMealType || meal.category === preferredMealType;
    return fitsCalories && matchesMealType;
  });

  // If no meals fit exactly, expand the search
  if (eligibleMeals.length < 3) {
    eligibleMeals = mealDatabase.filter((meal) => {
      const fitsCalories = meal.calories <= maxCalories;
      const matchesMealType = !preferredMealType || meal.category === preferredMealType;
      return fitsCalories && matchesMealType;
    });
  }

  // Still not enough? Just get the lowest calorie options
  if (eligibleMeals.length < 3) {
    eligibleMeals = [...mealDatabase]
      .sort((a, b) => a.calories - b.calories)
      .slice(0, 10);
  }

  // === RECOMMENDATION 1: Best for Protein ===
  // Sort by protein density (protein per calorie) and absolute protein
  const proteinScored = [...eligibleMeals].map((meal) => ({
    ...meal,
    proteinScore: (meal.protein / meal.calories) * 100 + meal.protein,
  })).sort((a, b) => b.proteinScore - a.proteinScore);

  const bestForProtein = proteinScored[0] || null;

  // === RECOMMENDATION 2: Most Filling (Volume) ===
  // Sort by volume score and fiber-like properties
  const volumeScored = [...eligibleMeals].map((meal) => ({
    ...meal,
    fillScore: meal.volumeScore * 10 + (meal.tags.includes('filling') ? 20 : 0) + (meal.tags.includes('fiber') ? 15 : 0),
  })).sort((a, b) => b.fillScore - a.fillScore);

  // Get a different meal than protein pick if possible
  let mostFilling = volumeScored.find((m) => m.id !== bestForProtein?.id) || volumeScored[0] || null;

  // === RECOMMENDATION 3: Quick & Easy ===
  // Sort by prep time (lowest first)
  const quickScored = [...eligibleMeals].map((meal) => ({
    ...meal,
    quickScore: (15 - meal.prepTime) * 5 + (meal.tags.includes('quick') ? 30 : 0) + (meal.tags.includes('portable') ? 10 : 0),
  })).sort((a, b) => b.quickScore - a.quickScore);

  // Get a different meal than the other two if possible
  let quickEasy = quickScored.find((m) =>
    m.id !== bestForProtein?.id && m.id !== mostFilling?.id
  ) || quickScored[0] || null;

  return {
    bestForProtein,
    mostFilling,
    quickEasy,
    remainingCalories,
    remainingProtein,
    totalEligible: eligibleMeals.length,
  };
}

/**
 * Convert a meal database item to food format for logging
 * @param {object} meal - Meal from database
 * @returns {object} - Food object compatible with FoodContext
 */
export function mealToFood(meal) {
  return {
    id: `${meal.id}-${Date.now()}`,
    name: meal.name,
    serving: meal.serving,
    servingSize: meal.servingSize,
    servingUnit: meal.servingUnit,
    calories: meal.calories,
    protein: meal.protein,
    carbs: meal.carbs,
    fat: meal.fat,
    category: 'recommended',
    isPerServing: true,
  };
}

/**
 * Get contextual message based on remaining stats
 * @param {number} remainingCalories
 * @param {number} remainingProtein
 * @returns {string}
 */
export function getCoachMessage(remainingCalories, remainingProtein) {
  if (remainingCalories <= 0) {
    return "You've hit your calorie goal! Here are some light options if you're still hungry.";
  }

  if (remainingCalories < 200) {
    return "Almost there! Here are some light options to finish your day.";
  }

  if (remainingProtein > 30 && remainingCalories > 300) {
    return "You need more protein! Here are some high-protein options.";
  }

  if (remainingCalories > 800) {
    return "Plenty of room left! Here are some satisfying options.";
  }

  return "Based on what you've eaten, here are my top picks:";
}

/**
 * Get the best meal type suggestion based on time of day
 * @returns {string} - Suggested meal category
 */
export function getSuggestedMealType() {
  const hour = new Date().getHours();

  if (hour < 10) return 'breakfast';
  if (hour < 14) return 'lunch';
  if (hour < 18) return 'snacks';
  return 'dinner';
}

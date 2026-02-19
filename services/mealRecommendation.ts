/**
 * Smart Coach Meal Recommendation Engine
 * Recommends meals based on remaining calories/protein budget
 */

import { mealDatabase } from '../data/mealDatabase';
import type { MealDatabaseEntry } from '../types';

const CALORIE_BUFFER: number = 100; // Allow +/-100 kcal flexibility

interface ScoredMeal extends MealDatabaseEntry {
  proteinScore?: number;
  fillScore?: number;
  quickScore?: number;
}

export interface RecommendationResult {
  bestForProtein: ScoredMeal | null;
  mostFilling: ScoredMeal | null;
  quickEasy: ScoredMeal | null;
  remainingCalories: number;
  remainingProtein: number;
  totalEligible: number;
}

export interface FoodFromMeal {
  id: string;
  name: string;
  serving: string;
  servingSize: number;
  servingUnit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  category: string;
  isPerServing: boolean;
}

/**
 * Get recommended meals based on remaining nutritional budget
 * @param remainingCalories - Calories left for the day
 * @param remainingProtein - Protein grams left for the day
 * @param preferredMealType - Optional: filter by meal category
 * @returns Three recommendation categories
 */
export function getRecommendations(
  remainingCalories: number,
  remainingProtein: number,
  preferredMealType: string | null = null
): RecommendationResult {
  // Filter meals that fit within the calorie budget (+/-buffer)
  const maxCalories: number = remainingCalories + CALORIE_BUFFER;
  const minCalories: number = Math.max(0, remainingCalories - CALORIE_BUFFER * 3); // Allow lower, but not too low

  let eligibleMeals: MealDatabaseEntry[] = (mealDatabase as MealDatabaseEntry[]).filter((meal) => {
    const fitsCalories: boolean = meal.calories <= maxCalories && meal.calories >= minCalories;
    const matchesMealType: boolean = !preferredMealType || meal.category === preferredMealType;
    return fitsCalories && matchesMealType;
  });

  // If no meals fit exactly, expand the search
  if (eligibleMeals.length < 3) {
    eligibleMeals = (mealDatabase as MealDatabaseEntry[]).filter((meal) => {
      const fitsCalories: boolean = meal.calories <= maxCalories;
      const matchesMealType: boolean = !preferredMealType || meal.category === preferredMealType;
      return fitsCalories && matchesMealType;
    });
  }

  // Still not enough? Just get the lowest calorie options
  if (eligibleMeals.length < 3) {
    eligibleMeals = [...(mealDatabase as MealDatabaseEntry[])]
      .sort((a, b) => a.calories - b.calories)
      .slice(0, 10);
  }

  // === RECOMMENDATION 1: Best for Protein ===
  // Sort by protein density (protein per calorie) and absolute protein
  const proteinScored: ScoredMeal[] = [...eligibleMeals].map((meal) => ({
    ...meal,
    proteinScore: (meal.protein / meal.calories) * 100 + meal.protein,
  })).sort((a, b) => (b.proteinScore || 0) - (a.proteinScore || 0));

  const bestForProtein: ScoredMeal | null = proteinScored[0] || null;

  // === RECOMMENDATION 2: Most Filling (Volume) ===
  // Sort by volume score and fiber-like properties
  const volumeScored: ScoredMeal[] = [...eligibleMeals].map((meal) => ({
    ...meal,
    fillScore: meal.volumeScore * 10 + (meal.tags.includes('filling') ? 20 : 0) + (meal.tags.includes('fiber') ? 15 : 0),
  })).sort((a, b) => (b.fillScore || 0) - (a.fillScore || 0));

  // Get a different meal than protein pick if possible
  let mostFilling: ScoredMeal | null = volumeScored.find((m) => m.id !== bestForProtein?.id) || volumeScored[0] || null;

  // === RECOMMENDATION 3: Quick & Easy ===
  // Sort by prep time (lowest first)
  const quickScored: ScoredMeal[] = [...eligibleMeals].map((meal) => ({
    ...meal,
    quickScore: (15 - meal.prepTime) * 5 + (meal.tags.includes('quick') ? 30 : 0) + (meal.tags.includes('portable') ? 10 : 0),
  })).sort((a, b) => (b.quickScore || 0) - (a.quickScore || 0));

  // Get a different meal than the other two if possible
  let quickEasy: ScoredMeal | null = quickScored.find((m) =>
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
 * @param meal - Meal from database
 * @returns Food object compatible with FoodContext
 */
export function mealToFood(meal: MealDatabaseEntry): FoodFromMeal {
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
 * @param remainingCalories
 * @param remainingProtein
 * @returns Coach message string
 */
export function getCoachMessage(remainingCalories: number, remainingProtein: number): string {
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
 * @returns Suggested meal category
 */
export function getSuggestedMealType(): string {
  const hour: number = new Date().getHours();

  if (hour < 10) return 'breakfast';
  if (hour < 14) return 'lunch';
  if (hour < 18) return 'snacks';
  return 'dinner';
}

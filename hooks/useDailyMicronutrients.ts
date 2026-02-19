/**
 * Estimates daily micronutrient intake from logged foods.
 *
 * Strategy:
 * 1. For each logged food, fuzzy-match against a known micronutrient profile database.
 * 2. Scale micronutrient values by the food's calorie ratio vs the reference serving.
 * 3. Sum across all foods for the day.
 *
 * This is an estimation — real micronutrient data from USDA/OpenFoodFacts is sparse,
 * so we use a curated set of ~60 common foods with known micronutrient profiles.
 */

import { useMemo } from 'react';

// Each entry: per-serving micronutrient values with a reference calorie amount.
// Values sourced from USDA FoodData Central (SR Legacy) for standard servings.
interface FoodMicroProfile {
  keywords: string[];
  refCalories: number;
  nutrients: Record<string, number>;
}

const FOOD_MICRO_DB: FoodMicroProfile[] = [
  {
    keywords: ['chicken', 'breast', 'poultry'],
    refCalories: 165,
    nutrients: { vitB3: 13.7, vitB6: 0.6, vitB12: 0.3, zinc: 0.9, phosphorus: 228, selenium: 27.6, iron: 0.4, potassium: 256, magnesium: 29 },
  },
  {
    keywords: ['salmon', 'fish'],
    refCalories: 208,
    nutrients: { vitD: 11, vitB12: 2.8, vitB3: 8.6, vitB6: 0.8, omega3: 2.2, selenium: 40, phosphorus: 252, potassium: 363, magnesium: 30 },
  },
  {
    keywords: ['egg', 'eggs'],
    refCalories: 78,
    nutrients: { vitA: 80, vitD: 1.1, vitB2: 0.23, vitB12: 0.56, vitB5: 0.7, selenium: 15.4, phosphorus: 99, iron: 0.9, zinc: 0.6, cholesterol: 186, folate: 24 },
  },
  {
    keywords: ['milk', 'dairy'],
    refCalories: 149,
    nutrients: { calcium: 276, vitD: 3.2, vitB2: 0.45, vitB12: 1.1, phosphorus: 205, potassium: 322, vitA: 112, magnesium: 24, zinc: 1.0 },
  },
  {
    keywords: ['yogurt', 'greek yogurt'],
    refCalories: 100,
    nutrients: { calcium: 110, vitB2: 0.27, vitB12: 0.75, phosphorus: 135, potassium: 141, zinc: 0.7, vitB6: 0.05, magnesium: 12 },
  },
  {
    keywords: ['cheese', 'cheddar'],
    refCalories: 113,
    nutrients: { calcium: 202, vitA: 99, vitB12: 0.24, phosphorus: 145, zinc: 0.9, sodium: 174, selenium: 8.3, vitK: 0.8 },
  },
  {
    keywords: ['beef', 'steak', 'ground beef'],
    refCalories: 250,
    nutrients: { vitB12: 2.6, vitB3: 5.4, vitB6: 0.35, zinc: 5.4, iron: 2.7, phosphorus: 175, selenium: 18, potassium: 270 },
  },
  {
    keywords: ['rice', 'white rice'],
    refCalories: 206,
    nutrients: { vitB1: 0.26, vitB3: 2.3, iron: 1.9, magnesium: 19, phosphorus: 68, zinc: 0.8, selenium: 11.9, folate: 97, fiber: 0.6 },
  },
  {
    keywords: ['brown rice'],
    refCalories: 216,
    nutrients: { vitB1: 0.2, vitB3: 3.0, magnesium: 86, phosphorus: 150, zinc: 1.2, selenium: 19.1, fiber: 3.5, iron: 0.8, potassium: 84 },
  },
  {
    keywords: ['oat', 'oatmeal', 'porridge'],
    refCalories: 154,
    nutrients: { vitB1: 0.19, iron: 2.1, magnesium: 56, phosphorus: 180, zinc: 1.5, fiber: 4.0, selenium: 13, copper: 0.16, vitB5: 0.5 },
  },
  {
    keywords: ['banana'],
    refCalories: 105,
    nutrients: { vitB6: 0.43, vitC: 10.3, potassium: 422, magnesium: 32, fiber: 3.1, manganese: 0.32, folate: 24, copper: 0.09 },
  },
  {
    keywords: ['apple'],
    refCalories: 95,
    nutrients: { vitC: 8.4, fiber: 4.4, potassium: 195, vitK: 4.0, vitA: 5, copper: 0.05 },
  },
  {
    keywords: ['orange', 'citrus'],
    refCalories: 62,
    nutrients: { vitC: 70, folate: 40, potassium: 237, fiber: 3.1, vitA: 14, vitB1: 0.11, calcium: 52, magnesium: 13 },
  },
  {
    keywords: ['broccoli'],
    refCalories: 55,
    nutrients: { vitC: 135, vitK: 155, vitA: 60, folate: 101, fiber: 5.1, potassium: 505, calcium: 74, iron: 1.1, magnesium: 33, phosphorus: 105 },
  },
  {
    keywords: ['spinach'],
    refCalories: 41,
    nutrients: { vitA: 943, vitK: 888, vitC: 50, folate: 263, iron: 4.9, magnesium: 119, potassium: 839, calcium: 167, fiber: 3.9, vitB2: 0.27, vitE: 2.9 },
  },
  {
    keywords: ['sweet potato'],
    refCalories: 103,
    nutrients: { vitA: 1096, vitC: 3.2, potassium: 438, fiber: 3.8, vitB6: 0.29, magnesium: 27, calcium: 38, iron: 0.7, phosphorus: 54 },
  },
  {
    keywords: ['potato'],
    refCalories: 161,
    nutrients: { vitC: 16.6, potassium: 926, vitB6: 0.41, fiber: 3.8, magnesium: 48, phosphorus: 121, iron: 1.9, vitB3: 2.4, folate: 48 },
  },
  {
    keywords: ['tomato'],
    refCalories: 22,
    nutrients: { vitC: 17, vitA: 52, potassium: 292, vitK: 9.7, fiber: 1.5, folate: 18, magnesium: 13 },
  },
  {
    keywords: ['carrot'],
    refCalories: 52,
    nutrients: { vitA: 1069, vitK: 16.9, vitC: 7.6, potassium: 410, fiber: 3.6, calcium: 42, magnesium: 15, phosphorus: 44 },
  },
  {
    keywords: ['avocado'],
    refCalories: 240,
    nutrients: { vitK: 31, vitC: 15, vitE: 3.1, vitB6: 0.39, folate: 122, potassium: 728, magnesium: 44, fiber: 10, copper: 0.28 },
  },
  {
    keywords: ['almond', 'almonds'],
    refCalories: 164,
    nutrients: { vitE: 7.3, magnesium: 77, calcium: 76, fiber: 3.5, iron: 1.1, phosphorus: 137, zinc: 0.9, copper: 0.29, vitB2: 0.32 },
  },
  {
    keywords: ['peanut butter', 'peanut'],
    refCalories: 188,
    nutrients: { vitB3: 4.3, vitE: 2.9, magnesium: 57, phosphorus: 115, zinc: 0.9, iron: 0.6, fiber: 1.9, potassium: 208, folate: 29 },
  },
  {
    keywords: ['bread', 'toast', 'whole wheat'],
    refCalories: 69,
    nutrients: { vitB1: 0.11, vitB3: 1.4, iron: 0.7, selenium: 10, fiber: 1.9, folate: 24, magnesium: 23, phosphorus: 57, zinc: 0.5 },
  },
  {
    keywords: ['pasta', 'spaghetti', 'noodle'],
    refCalories: 220,
    nutrients: { vitB1: 0.29, vitB3: 2.4, iron: 1.8, selenium: 26, folate: 102, phosphorus: 76, magnesium: 25, fiber: 2.5, zinc: 0.7 },
  },
  {
    keywords: ['tuna'],
    refCalories: 179,
    nutrients: { vitB12: 2.5, vitB3: 18.8, vitB6: 0.45, vitD: 1.7, selenium: 80, phosphorus: 264, potassium: 252, omega3: 1.3, iron: 1.0 },
  },
  {
    keywords: ['shrimp', 'prawn'],
    refCalories: 85,
    nutrients: { vitB12: 1.3, selenium: 40, phosphorus: 116, zinc: 1.3, vitB3: 2.6, iron: 0.3, copper: 0.18, omega3: 0.3 },
  },
  {
    keywords: ['tofu', 'soy'],
    refCalories: 76,
    nutrients: { calcium: 253, iron: 2.7, magnesium: 37, phosphorus: 121, zinc: 0.8, selenium: 11, copper: 0.19, fiber: 0.3, folate: 19 },
  },
  {
    keywords: ['lentil', 'lentils', 'dal'],
    refCalories: 230,
    nutrients: { iron: 6.6, folate: 358, fiber: 15.6, potassium: 731, phosphorus: 356, magnesium: 71, zinc: 2.5, vitB1: 0.33, vitB6: 0.35, copper: 0.50 },
  },
  {
    keywords: ['bean', 'beans', 'kidney', 'black bean'],
    refCalories: 225,
    nutrients: { iron: 3.6, folate: 256, fiber: 15.0, potassium: 611, phosphorus: 244, magnesium: 74, zinc: 1.8, vitB1: 0.28, copper: 0.36 },
  },
  {
    keywords: ['quinoa'],
    refCalories: 222,
    nutrients: { magnesium: 118, phosphorus: 281, iron: 2.8, zinc: 2.0, fiber: 5.2, folate: 78, vitB1: 0.2, vitB2: 0.2, vitE: 1.2, copper: 0.36 },
  },
  {
    keywords: ['blueberry', 'blueberries', 'berry', 'berries'],
    refCalories: 84,
    nutrients: { vitC: 14.4, vitK: 28.6, fiber: 3.6, potassium: 114, manganese: 0.50 },
  },
  {
    keywords: ['strawberry', 'strawberries'],
    refCalories: 49,
    nutrients: { vitC: 89.4, folate: 36, potassium: 233, fiber: 3.0, manganese: 0.59, magnesium: 20 },
  },
  {
    keywords: ['kale'],
    refCalories: 33,
    nutrients: { vitA: 885, vitK: 547, vitC: 80, calcium: 94, potassium: 296, fiber: 1.3, magnesium: 23, iron: 1.1, copper: 0.20 },
  },
  {
    keywords: ['turkey'],
    refCalories: 170,
    nutrients: { vitB3: 7.6, vitB6: 0.46, vitB12: 0.35, selenium: 31, zinc: 2.4, phosphorus: 196, iron: 1.4, potassium: 249 },
  },
  {
    keywords: ['pork', 'ham', 'bacon'],
    refCalories: 206,
    nutrients: { vitB1: 0.88, vitB3: 4.0, vitB6: 0.39, vitB12: 0.7, selenium: 33, zinc: 2.4, phosphorus: 197, iron: 0.9, potassium: 356 },
  },
  {
    keywords: ['mushroom'],
    refCalories: 22,
    nutrients: { vitD: 0.2, vitB2: 0.4, vitB3: 3.6, selenium: 9.3, copper: 0.32, potassium: 318, phosphorus: 86, zinc: 0.5 },
  },
  {
    keywords: ['pepper', 'bell pepper', 'capsicum'],
    refCalories: 31,
    nutrients: { vitC: 128, vitA: 157, vitB6: 0.22, vitE: 1.6, vitK: 7.4, potassium: 211, fiber: 2.1, folate: 46 },
  },
  {
    keywords: ['corn'],
    refCalories: 96,
    nutrients: { vitB1: 0.16, vitB3: 1.8, vitB5: 0.72, vitC: 6.8, fiber: 2.4, magnesium: 37, phosphorus: 89, potassium: 270, folate: 42 },
  },
  {
    keywords: ['cereal', 'granola'],
    refCalories: 190,
    nutrients: { vitB1: 0.5, vitB2: 0.6, vitB3: 6.7, vitB6: 0.67, vitB12: 2.0, iron: 6.0, zinc: 5.0, folate: 133, fiber: 3.0, calcium: 40 },
  },
  {
    keywords: ['protein shake', 'whey', 'protein powder'],
    refCalories: 120,
    nutrients: { calcium: 150, iron: 1.5, phosphorus: 130, magnesium: 40, zinc: 2.0, vitB6: 0.3, vitB12: 0.9 },
  },
  {
    keywords: ['coffee'],
    refCalories: 2,
    nutrients: { vitB2: 0.18, vitB3: 0.45, potassium: 116, magnesium: 7 },
  },
  {
    keywords: ['olive oil', 'oil'],
    refCalories: 119,
    nutrients: { vitE: 1.9, vitK: 8.1 },
  },
  {
    keywords: ['dark chocolate', 'chocolate'],
    refCalories: 170,
    nutrients: { iron: 3.4, magnesium: 65, copper: 0.50, fiber: 3.1, zinc: 1.0, phosphorus: 86, potassium: 203 },
  },
];

/**
 * Find the best matching micronutrient profile for a food name.
 * Returns null if no match found.
 */
function findFoodProfile(foodName: string): FoodMicroProfile | null {
  const lower = foodName.toLowerCase();
  let bestMatch: FoodMicroProfile | null = null;
  let bestScore = 0;

  for (const profile of FOOD_MICRO_DB) {
    for (const keyword of profile.keywords) {
      if (lower.includes(keyword)) {
        // Longer keyword matches are more specific, so score by keyword length
        const score = keyword.length;
        if (score > bestScore) {
          bestScore = score;
          bestMatch = profile;
        }
      }
    }
  }

  return bestMatch;
}

export interface DailyMicronutrientResult {
  intake: Record<string, number>;
  matchedFoods: number;
  totalFoods: number;
  isEstimated: boolean;
}

/**
 * Estimate daily micronutrient intake from an array of logged foods.
 * Each food should have at minimum: name, calories.
 */
export function useDailyMicronutrients(
  foods: Array<{ name: string; calories: number }>,
): DailyMicronutrientResult {
  return useMemo(() => {
    const intake: Record<string, number> = {};
    let matchedFoods = 0;

    for (const food of foods) {
      const profile = findFoodProfile(food.name);
      if (!profile) continue;

      matchedFoods++;
      // Scale micronutrients proportionally to actual calories vs reference
      const scale = profile.refCalories > 0 ? food.calories / profile.refCalories : 1;

      for (const [nutrientId, amount] of Object.entries(profile.nutrients)) {
        intake[nutrientId] = (intake[nutrientId] || 0) + amount * scale;
      }
    }

    // Round all values for clean display
    for (const key of Object.keys(intake)) {
      intake[key] = Math.round(intake[key] * 100) / 100;
    }

    return {
      intake,
      matchedFoods,
      totalFoods: foods.length,
      isEstimated: true,
    };
  }, [foods]);
}

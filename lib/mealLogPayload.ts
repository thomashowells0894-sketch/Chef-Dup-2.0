import type { DateKey, FoodItem, MealType } from '../types';

export function buildFoodLogInsertPayload(
  userId: string,
  dateKey: DateKey,
  mealType: MealType,
  food: FoodItem,
) {
  const numericServingSize = Number(food.servingSize);

  return {
    user_id: userId,
    date: dateKey,
    name: (food.name || '').trim(),
    calories: food.calories || 0,
    protein: food.protein || 0,
    carbs: food.carbs || 0,
    fat: food.fat || 0,
    meal_type: mealType,
    serving: food.serving || null,
    serving_size: Number.isFinite(numericServingSize) && numericServingSize > 0
      ? numericServingSize
      : null,
    serving_unit: food.servingUnit || null,
  };
}


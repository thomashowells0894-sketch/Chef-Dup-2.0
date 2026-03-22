const DEFAULT_QUICK_FOODS = [
  { name: 'Coffee', emoji: '☕', calories: 5, protein: 0, carbs: 0, fat: 0 },
  { name: 'Eggs (2)', emoji: '🥚', calories: 140, protein: 12, carbs: 1, fat: 10 },
  { name: 'Banana', emoji: '🍌', calories: 105, protein: 1, carbs: 27, fat: 0 },
  { name: 'Greek Yogurt', emoji: '🥛', calories: 100, protein: 17, carbs: 6, fat: 1 },
  { name: 'Apple', emoji: '🍎', calories: 95, protein: 0, carbs: 25, fat: 0 },
];

function normalizeKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ');
}

function toSavedMealItem(recipe) {
  const servings = Math.max(recipe?.servings || 1, 1);
  return {
    id: recipe?.id || recipe?.name,
    kind: 'saved_meal',
    name: recipe?.name || 'Saved meal',
    emoji: recipe?.emoji || '🍽️',
    calories: Math.round(recipe?.calories || 0),
    protein: Math.round(recipe?.protein || 0),
    carbs: Math.round(recipe?.carbs || 0),
    fat: Math.round(recipe?.fat || 0),
    serving: `1 serving (1/${servings} recipe)`,
    servingSize: 1,
    servingUnit: 'serving',
    subtitle: `Go-to meal · ${Math.round(recipe?.calories || 0)} kcal`,
    recipe,
  };
}

function toFoodItem(food) {
  return {
    id: food?.id || food?.name,
    kind: 'food',
    name: food?.name || 'Food',
    emoji: food?.emoji || '🍽️',
    calories: Math.round(food?.calories || 0),
    protein: Math.round(food?.protein || 0),
    carbs: Math.round(food?.carbs || 0),
    fat: Math.round(food?.fat || 0),
    serving: food?.serving || '1 serving',
    servingSize: food?.servingSize,
    servingUnit: food?.servingUnit,
    subtitle: `${Math.round(food?.calories || 0)} kcal`,
  };
}

export function buildQuickLogItems({
  recipes = [],
  frequentFoods = [],
  limit = 6,
}) {
  const items = [];
  const seen = new Set();

  const pushUnique = (item) => {
    const key = normalizeKey(item?.name);
    if (!key || seen.has(key)) {
      return;
    }
    seen.add(key);
    items.push(item);
  };

  recipes.slice(0, 2).map(toSavedMealItem).forEach(pushUnique);
  frequentFoods.map(toFoodItem).forEach(pushUnique);

  if (items.length < limit) {
    DEFAULT_QUICK_FOODS.map(toFoodItem).forEach(pushUnique);
  }

  return items.slice(0, limit);
}

export { DEFAULT_QUICK_FOODS };

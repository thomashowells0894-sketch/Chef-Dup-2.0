// Mock food database
export const foodDatabase = [
  {
    id: 'oatmeal',
    name: 'Oatmeal',
    serving: '1 cup cooked',
    calories: 158,
    protein: 6,
    carbs: 27,
    fat: 3,
    category: 'breakfast',
  },
  {
    id: 'chicken-breast',
    name: 'Chicken Breast',
    serving: '4 oz grilled',
    calories: 187,
    protein: 35,
    carbs: 0,
    fat: 4,
    category: 'protein',
  },
  {
    id: 'white-rice',
    name: 'White Rice',
    serving: '1 cup cooked',
    calories: 206,
    protein: 4,
    carbs: 45,
    fat: 0,
    category: 'carbs',
  },
  {
    id: 'whey-protein',
    name: 'Whey Protein',
    serving: '1 scoop',
    calories: 120,
    protein: 24,
    carbs: 3,
    fat: 1,
    category: 'protein',
  },
  {
    id: 'banana',
    name: 'Banana',
    serving: '1 medium',
    calories: 105,
    protein: 1,
    carbs: 27,
    fat: 0,
    category: 'fruit',
  },
  {
    id: 'eggs',
    name: 'Eggs',
    serving: '2 large',
    calories: 156,
    protein: 12,
    carbs: 1,
    fat: 11,
    category: 'protein',
  },
  {
    id: 'greek-yogurt',
    name: 'Greek Yogurt',
    serving: '1 cup',
    calories: 130,
    protein: 17,
    carbs: 8,
    fat: 4,
    category: 'dairy',
  },
  {
    id: 'salmon',
    name: 'Salmon',
    serving: '4 oz',
    calories: 234,
    protein: 25,
    carbs: 0,
    fat: 14,
    category: 'protein',
  },
  {
    id: 'avocado',
    name: 'Avocado',
    serving: '1/2 medium',
    calories: 160,
    protein: 2,
    carbs: 9,
    fat: 15,
    category: 'fat',
  },
  {
    id: 'almonds',
    name: 'Almonds',
    serving: '1 oz (23 nuts)',
    calories: 164,
    protein: 6,
    carbs: 6,
    fat: 14,
    category: 'snack',
  },
];

// Get foods by category
export function getFoodsByCategory(category) {
  return foodDatabase.filter((food) => food.category === category);
}

// Search foods by name
export function searchFoods(query) {
  const lowerQuery = query.toLowerCase();
  return foodDatabase.filter((food) =>
    food.name.toLowerCase().includes(lowerQuery)
  );
}

// Get food by ID
export function getFoodById(id) {
  return foodDatabase.find((food) => food.id === id);
}

/** Date in YYYY-MM-DD format */
export type DateKey = string;

/** Standard macro nutrients */
export interface MacroSet {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

/** Meal types used throughout the app */
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snacks';

/** Generic loading state */
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

/** Async operation result wrapper */
export type AsyncResult<T> =
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: string };

/** Direction for date navigation */
export type DateDirection = 'next' | 'prev' | 1 | -1;

/** Food category */
export type FoodCategory =
  | 'breakfast' | 'protein' | 'carbs' | 'fruit' | 'dairy' | 'fat' | 'snack'
  | 'lunch' | 'dinner' | 'snacks' | 'vegetable' | 'grain' | 'beverage'
  | 'condiment' | 'legume' | 'nut' | 'seafood' | 'baked' | 'fast-food'
  | 'dessert' | 'oil' | 'soup' | 'searched';

/** Exercise category */
export type ExerciseCategory = 'Cardio' | 'Strength' | 'Flexibility';

/** Micronutrient data set */
export interface MicronutrientSet {
  fiber?: number;
  sugar?: number;
  sodium?: number;
  saturated_fat?: number;
  trans_fat?: number;
  cholesterol?: number;
  calcium?: number;
  iron?: number;
  magnesium?: number;
  potassium?: number;
  zinc?: number;
  copper?: number;
  manganese?: number;
  selenium?: number;
  phosphorus?: number;
  vitaminA?: number;
  vitaminC?: number;
  vitaminD?: number;
  vitaminE?: number;
  vitaminK?: number;
  vitaminB1?: number;
  vitaminB2?: number;
  vitaminB3?: number;
  vitaminB5?: number;
  vitaminB6?: number;
  vitaminB12?: number;
  folate?: number;
  choline?: number;
  omega3?: number;
  omega6?: number;
}

/** Meal tag */
export type MealTag =
  | 'high-protein' | 'quick' | 'vegetarian' | 'keto' | 'meal-prep'
  | 'fiber' | 'balanced' | 'low-carb' | 'filling' | 'portable'
  | 'omega-3' | 'vegan' | 'comfort' | 'low-calorie' | 'vegetarian-option';

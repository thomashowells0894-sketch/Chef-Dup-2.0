
export enum Screen {
  AUTH = 'AUTH',
  ONBOARDING = 'ONBOARDING',
  HOME = 'HOME',
  CAMERA = 'CAMERA',
  PANTRY = 'PANTRY',
  RECIPES = 'RECIPES',
  RECIPE_DETAIL = 'RECIPE_DETAIL',
  COOKING = 'COOKING',
  SHOPPING = 'SHOPPING',
  PAYWALL = 'PAYWALL',
  SHARE = 'SHARE',
  PROFILE = 'PROFILE',
  PLANNER = 'PLANNER',
  FITNESS_HOME = 'FITNESS_HOME',
  ACTIVE_WORKOUT = 'ACTIVE_WORKOUT',
  TRENDS = 'TRENDS',
  CUSTOM_FOOD = 'CUSTOM_FOOD',
  PROGRESS_GALLERY = 'PROGRESS_GALLERY',
  RESTAURANT_MENU = 'RESTAURANT_MENU',
  RECIPE_IMPORT = 'RECIPE_IMPORT',
  INGREDIENT_EDITOR = 'INGREDIENT_EDITOR'
}

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
}

export type Gender = 'male' | 'female';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'athlete';
export type FitnessGoal = 'lose_weight' | 'build_muscle' | 'maintain';

export interface FastingState {
  isFasting: boolean;
  startTime: number | null;
  targetHours: number;
  history: { startTime: number; endTime: number; durationHours: number }[];
}

export interface StreakState {
  currentStreak: number;
  lastLoginDate: string;
  longestStreak: number;
}

export interface UserProfile {
  name: string;
  hasCompletedOnboarding: boolean;
  age: number;
  gender: Gender;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  goal: FitnessGoal;
  waterIntakeMl: number;
  waterGoalMl: number;
  weightHistory: { date: string; weight: number }[];
  fasting: FastingState;
  streak: StreakState;
  isVegan: boolean;
  isGlutenFree: boolean;
  isKeto: boolean;
  allergies: string[];
  dailyCalorieGoal: number;
  dailyProteinGoal: number;
  dailyCarbGoal: number;
  dailyFatGoal: number;
  totalSaved: number;
  freeScansRemaining: number;
  isSubscribed: boolean;
  badges: string[];
  savedRecipeIds: string[];
  ratings: Record<string, number>;
  workoutSchedule: Record<string, string>;
  connectedDevices: string[];
}

export interface Ingredient {
  id: string;
  name: string;
  confidence: number;
  addedAt?: number;
  imageUrl?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

export interface RecipeIngredient {
  name: string;
  amount: number;
  unit: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  sugar?: number;
  fiber?: number;
  sodium?: number;
  // Micros
  iron?: number;
  calcium?: number;
  vitaminA?: number;
  vitaminC?: number;
  potassium?: number;
  cholesterol?: number;
}

export interface RecipeStep {
  id: number;
  text: string;
  durationSeconds?: number;
}

export interface Recipe {
  id: string;
  title: string;
  description: string;
  ingredients: RecipeIngredient[];
  missingIngredients: string[];
  steps: RecipeStep[];
  imageUrl: string;
  isVegan: boolean;
  isGlutenFree: boolean;
  isKeto: boolean;
  servings: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  sugar: number;
  fiber: number;
  sodium: number;
  prepTimeMinutes: number;
  savings: number;
  sourceUrl?: string;
  // Micros (Optional aggregations)
  iron?: number;
  calcium?: number;
  vitaminA?: number;
  vitaminC?: number;
  potassium?: number;
  cholesterol?: number;
}

export interface FoodItem {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize: number;
  servingUnit: string;
  category?: string;
  isVerified?: boolean;
  aiConfidence?: number; // New field for AI confidence
  // Micros
  sugar?: number;
  fiber?: number;
  sodium?: number;
  iron?: number;
  calcium?: number;
  vitaminA?: number;
  vitaminC?: number;
  potassium?: number;
  cholesterol?: number;
  zinc?: number;
  vitaminD?: number;
}

export interface ShoppingItem {
  id: string;
  name: string;
  checked: boolean;
  recipeId?: string;
  addedAt: number;
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface MealPlanEntry {
  id: string;
  date: string; // ISO Date string
  mealType: MealType;
  recipe: Recipe;
  isCompleted: boolean;
  isQuickAdd?: boolean;
}

export interface CustomFood {
  id: string;
  name: string;
  brand: string;
  servingSize: number;
  servingUnit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  sugar: number;
  fiber: number;
  sodium: number;
}

export interface ProgressPhoto {
  id: string;
  date: string;
  weight: number;
  imageBase64: string;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  price: number;
  tags: string[];
  matchScore: number;
  recommendationReason?: string;
}

export type WorkoutCategory = 'Strength' | 'Yoga' | 'HIIT' | 'Calisthenics' | 'Cardio';

export interface Exercise {
  id: string;
  name: string;
  type: string; // 'strength', 'calisthenics', 'yoga', 'cardio', 'hiit'
  muscleGroup: string;
  defaultRestSeconds: number;
}

export interface WorkoutPlanExercise {
    exerciseId: string;
    targetSets: number;
    targetReps: number;
    targetDuration?: number; // seconds
}

export interface WorkoutPlan {
    id: string;
    title: string;
    description: string;
    category: WorkoutCategory;
    difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
    durationMinutes: number;
    tags: string[];
    exercises: WorkoutPlanExercise[];
}

export interface WorkoutSet {
    id: string;
    reps: number;
    weight: number;
    completed: boolean;
    note?: string;
}

export interface WorkoutExercise {
    id: string;
    exercise: Exercise;
    sets: WorkoutSet[];
}

export interface WorkoutSession {
    id: string;
    date: string;
    exercises: WorkoutExercise[];
    totalVolume: number;
    durationSeconds: number;
    caloriesBurned: number;
}

export interface ChatMessage {
    id: string;
    role: 'user' | 'ai';
    text: string;
}

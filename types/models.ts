import type { DateKey, MacroSet, MealType, FoodCategory, ExerciseCategory, MealTag, MicronutrientSet } from './common';

/** Food item from the database or scanned */
export interface FoodItem extends MacroSet {
  id: string | number;
  name: string;
  serving: string;
  category?: FoodCategory;
  emoji?: string;
  servingSize?: number;
  servingUnit?: string;
  micronutrients?: MicronutrientSet;
}

/** Food item as logged in a meal */
export interface FoodLogEntry extends FoodItem {
  loggedAt: string;
  mealType: MealType;
  dateKey: DateKey;
}

/** Exercise from the exercise database */
export interface ExerciseDefinition {
  id: string;
  name: string;
  category: ExerciseCategory;
  met: number;
  icon: string;
}

/** Logged exercise entry */
export interface ExerciseLog {
  id: string | number;
  name: string;
  emoji?: string;
  duration: number;
  caloriesBurned: number;
  loggedAt: string;
  dateKey: DateKey;
}

/** Data for a single day */
export interface DayData {
  meals: Record<MealType, FoodLogEntry[]>;
  totals: MacroSet;
  micronutrientTotals?: MicronutrientSet;
  waterIntake: number;
  exercises: ExerciseLog[];
  caloriesBurned: number;
  exerciseMinutes: number;
}

/** User profile data */
export interface UserProfile {
  weight: number | null;
  height: number | null;
  age: number | null;
  gender: 'male' | 'female' | null;
  activityLevel: string | null;
  goal: string | null;
}

/** Weight history entry */
export interface WeightEntry {
  weight: number;
  date: string;
  note: string;
}

/** Sleep entry */
export interface SleepEntry {
  date: string;
  bedtime: string;
  wakeTime: string;
  duration: number;
  quality: number;
  notes: string;
}

/** Mood log entry */
export interface MoodLog {
  date: string;
  mood: number;
  energy: number;
  notes: string;
}

/** Recipe from AI chef */
export interface Recipe {
  id: string;
  name: string;
  emoji: string;
  description: string;
  difficulty: string;
  time: string;
  servings: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  ingredients_used: string[];
  missing_ingredients: string[];
  instructions: string[];
  chef_tip: string;
}

/** Meal database entry (Smart Coach) */
export interface MealDatabaseEntry extends MacroSet {
  id: string;
  name: string;
  category: MealType;
  serving: string;
  servingSize: number;
  servingUnit: string;
  tags: MealTag[];
  prepTime: number;
  volumeScore: number;
}

/** Achievement definition */
export interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
  emoji: string;
  category: string;
  check: (ctx: AchievementContext) => boolean;
  getProgress: (ctx: AchievementContext) => { current: number; target: number };
}

/** Achievement context for checking unlock conditions */
export interface AchievementContext {
  streak?: number;
  totalFoodsLogged?: number;
  allMealsLoggedInDay?: boolean;
  totalWorkouts?: number;
  hasSetPR?: boolean;
  hasCompletedFast?: boolean;
  hasHitWaterGoal?: boolean;
  waterGoalStreak?: number;
  hasHitProteinGoal?: boolean;
  calorieTargetStreak?: number;
  hasScannedFood?: boolean;
  hasChatted?: boolean;
  hasGeneratedMealPlan?: boolean;
  hasUsedVoiceLog?: boolean;
  totalXP?: number;
  hasTakenProgressPhoto?: boolean;
  hasReachedWeightGoal?: boolean;
}

/** Unlocked achievement state */
export interface UnlockedAchievement {
  unlockedAt: string;
  isNew: boolean;
}

/** Achievement with UI state */
export interface Achievement {
  id: string;
  title: string;
  description: string;
  emoji: string;
  category: string;
  unlockedAt: string | null;
  isNew: boolean;
  isUnlocked: boolean;
}

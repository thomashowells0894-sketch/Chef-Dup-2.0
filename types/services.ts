import type { MacroSet } from './common';
import type { SupersetGroup } from '../lib/workoutEngine';

/** Result of scanning a food image */
export interface FoodScanResult extends MacroSet {
  name: string;
  emoji: string;
  serving: string;
  confidence: string;
}

/** AI-generated workout plan */
export interface WorkoutPlan {
  id: string;
  title: string;
  subtitle: string;
  goal: string;
  level: number;
  duration: number;
  warmup: WorkoutExercise[];
  main_set: WorkoutExercise[];
  cooldown: WorkoutExercise[];
  difficulty_rating: number;
  estimated_calories: number;
  coach_notes: string;
  pro_tips: string[];
  supersets?: SupersetGroup[];
}

export interface WorkoutExercise {
  name: string;
  sets?: number;
  reps?: string;
  duration?: string;
  rest?: string;
  notes?: string;
}

/** Chat response from AI nutritionist */
export interface ChatResponse {
  reply: string;
  suggestions: string[];
  foodItems: unknown[];
}

/** Weekly coaching digest */
export interface WeeklyDigest {
  headline: string;
  insights: unknown[];
  weeklyScore: number;
  motivationalQuote: string;
  generatedAt: number;
}

/** AI-generated meal plan */
export interface MealPlan {
  days: unknown[];
  shoppingList: unknown[];
  coachNote: string;
  generatedAt: number;
}

/** Rate limit check result */
export interface RateLimitResult {
  allowed: boolean;
  retryAfterMs: number;
  message: string;
}

/** Rate limit check options */
export interface RateLimitOptions {
  maxCalls?: number;
  windowMs?: number;
  cooldownMs?: number;
}

/** AI morning briefing */
export interface MorningBriefing {
  greeting: string;
  headline: string;
  insights: unknown[];
  todayFocus: { food: string; workout: string };
  motivationalQuote: string;
  score: number;
  generatedAt: number;
}

/** Macro recommendation */
export interface MacroRecommendation {
  shouldAdjust: boolean;
  reason: string;
  newCalories: number;
  newProtein: number;
  newCarbs: number;
  newFat: number;
  calorieChange: number;
  headline: string;
  explanation: string;
  generatedAt: number;
}

/** Food swap result */
export interface FoodSwapResult {
  originalFood: Record<string, unknown>;
  swaps: unknown[];
  tip: string;
}

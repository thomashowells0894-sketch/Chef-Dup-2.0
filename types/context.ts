import type { DateKey, MacroSet, MealType, DateDirection } from './common';
import type { DayData, FoodItem, FoodLogEntry, ExerciseLog } from './models';

// ============================================================================
// Meal Context
// ============================================================================

/** All actions the meal reducer can handle */
export type MealAction =
  | { type: 'HYDRATE'; payload: Partial<MealState> }
  | { type: 'ADD_FOOD'; payload: { food: FoodItem; mealType: MealType; dateKey: DateKey } }
  | { type: 'REMOVE_FOOD'; payload: { logId: string | number; mealType: MealType; dateKey: DateKey } }
  | { type: 'RESET_DAY'; payload: { dateKey: DateKey } }
  | { type: 'ADD_WATER'; payload: { amount: number; dateKey: DateKey } }
  | { type: 'RESET_WATER'; payload: { dateKey: DateKey } }
  | { type: 'SET_WATER_GOAL'; payload: number }
  | { type: 'ADD_EXERCISE'; payload: { exercise: FoodItem; duration: number; caloriesBurned: number; dateKey: DateKey } }
  | { type: 'REMOVE_EXERCISE'; payload: { logId: string | number; dateKey: DateKey } }
  | { type: 'UPDATE_GOALS'; payload: Partial<MacroSet> };

export interface MealState {
  goals: MacroSet;
  waterGoal: number;
  dayData: Record<DateKey, DayData>;
  recentLogs: FoodLogEntry[];
}

export interface WaterProgress {
  ml: number;
  goal: number;
  glasses: number;
  glassesGoal: number;
  percentage: number;
  remaining: number;
}

export interface CalorieBalance {
  food: number;
  burned: number;
  net: number;
  baseGoal: number;
  effectiveGoal: number;
  remaining: number;
  exerciseMinutes: number;
}

export interface WeeklyDayData {
  date: DateKey;
  day: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  goal: number;
  isToday: boolean;
  noData?: boolean;
}

export interface WeeklyStats {
  totalCalories: number;
  avgCalories: number;
  daysUnderGoal: number;
  daysOverGoal: number;
  daysOnTrack: number;
  caloriesVsBudget: number;
  totalProtein: number;
  avgProtein: number;
  daysTracked: number;
}

// ============================================================================
// Auth Context
// ============================================================================

export interface AuthContextValue {
  user: { id: string; email?: string } | null;
  session: unknown;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ data: unknown; error: unknown }>;
  signUp: (email: string, password: string) => Promise<{ data: unknown; error: unknown }>;
  signOut: () => Promise<{ error: unknown }>;
  recordActivity: () => void;
}

// ============================================================================
// Fasting Context
// ============================================================================

export interface FastingProgress {
  elapsedMs: number;
  remainingMs: number;
  elapsedHours: number;
  elapsedMinutes: number;
  remainingHours: number;
  remainingMinutes: number;
  progress: number;
  isComplete: boolean;
}

export interface FastingPrompt {
  type: 'START_FAST' | 'END_FAST';
  mealType: MealType;
  message: string;
  description: string;
}

export interface FastingProtocol {
  fastHours: number;
  eatHours: number;
  label: string;
}

export interface EatingWindowInfo {
  totalHours: number;
  hoursUsed: number;
  hoursRemaining: number;
  progress: number;
}

export interface FastingContextValue {
  isFasting: boolean;
  fastingState: string;
  fastStartTime: number | null;
  fastDuration: number;
  lastMealTime: number | null;
  lastMealType: MealType | null;
  isLoading: boolean;
  pendingPrompt: FastingPrompt | null;
  startFast: (durationHours?: number | null) => Promise<void>;
  endFast: () => Promise<FastingProgress>;
  updateDuration: (hours: number) => void;
  recordMealLogged: (mealType: MealType) => void;
  acceptPrompt: () => Promise<void>;
  dismissPrompt: () => void;
  fastingProgress: FastingProgress;
  eatingWindowInfo: EatingWindowInfo | null;
  formattedElapsed: string;
  formattedRemaining: string;
  protocols: Record<string, FastingProtocol>;
  states: Record<string, string>;
}

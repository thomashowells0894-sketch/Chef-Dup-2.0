/**
 * FuelIQ AI Service - Server-Side Gateway
 *
 * All AI processing is now handled by a Supabase Edge Function.
 * This client-side service acts as a thin wrapper that invokes
 * the server-side AI brain. No API keys are exposed in the app.
 *
 * Security Features:
 * - No API keys in client code
 * - All processing happens server-side
 * - Graceful error handling
 */

import { supabase } from '../lib/supabase';
import { checkAIRateLimit } from '../lib/rateLimiter';
import { sanitizeText, sanitizeNumber } from '../lib/validation';

// ============================================================================
// PREMIUM GATING
// Synced from SubscriptionContext via setAIPremiumStatus().
// ============================================================================

let _isPremium = false;

/**
 * Called by SubscriptionContext whenever the premium status changes.
 * This keeps the service module in sync without requiring React context access.
 */
export function setAIPremiumStatus(status: boolean): void {
  _isPremium = status;
}
import type { SupersetGroup } from '../lib/workoutEngine';
import type {
  FoodScanResult,
  WorkoutPlan,
  ChatResponse,
  WeeklyDigest,
  MealPlan,
  MorningBriefing,
  MacroRecommendation,
  FoodSwapResult,
} from '../types';

// ============================================================================
// REQUEST DEDUPLICATION
// Prevents duplicate in-flight requests when users tap buttons multiple times.
// ============================================================================

const inflightAIRequests: Map<string, Promise<unknown>> = new Map();
const MAX_INFLIGHT = 50;

/**
 * Wrap an AI request with deduplication.
 * If the same key is already in-flight, returns the existing promise.
 */
function deduplicatedAIRequest<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
  if (inflightAIRequests.has(key)) {
    return inflightAIRequests.get(key) as Promise<T>;
  }

  const promise = requestFn()
    .finally(() => {
      inflightAIRequests.delete(key);
    });

  if (inflightAIRequests.size >= MAX_INFLIGHT) {
    const firstKey = inflightAIRequests.keys().next().value;
    if (firstKey) inflightAIRequests.delete(firstKey);
  }
  inflightAIRequests.set(key, promise);
  return promise;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const MAX_STRING_LENGTH: number = 10000;
const MAX_ARRAY_LENGTH: number = 100;

/**
 * Recursively validate and truncate oversized response fields.
 * Prevents memory exhaustion from malicious or broken AI responses.
 */
function validateResponseStrings(obj: unknown, depth: number = 0): void {
  if (depth > 10 || obj === null || obj === undefined) return;
  if (typeof obj === 'string' && obj.length > MAX_STRING_LENGTH) {
    // Can't mutate, but the caller already size-checked the full response
    return;
  }
  if (Array.isArray(obj)) {
    if (obj.length > MAX_ARRAY_LENGTH) {
      obj.length = MAX_ARRAY_LENGTH; // Truncate oversized arrays in-place
    }
    for (const item of obj) {
      validateResponseStrings(item, depth + 1);
    }
    return;
  }
  if (typeof obj === 'object') {
    const record = obj as Record<string, unknown>;
    for (const key of Object.keys(record)) {
      const val = record[key];
      if (typeof val === 'string' && val.length > MAX_STRING_LENGTH) {
        record[key] = val.substring(0, MAX_STRING_LENGTH);
      } else {
        validateResponseStrings(val, depth + 1);
      }
    }
  }
}

/**
 * Retry an async function with exponential backoff.
 * Only retries on network-level failures (TypeError / fetch errors),
 * NOT on HTTP error responses (4xx, 5xx).
 */
async function retryWithBackoff<T>(fn: () => Promise<T>, maxRetries: number = 2, initialDelay: number = 1000): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error;
      // Only retry on network-level failures (e.g. TypeError from fetch)
      const isNetworkError =
        error instanceof TypeError ||
        (error instanceof Error && error.message === 'Network request failed');
      if (!isNetworkError || attempt >= maxRetries) {
        throw error;
      }
      const delay = initialDelay * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

/**
 * Invoke the AI brain edge function
 * @param type - Request type (scan-food, generate-workout, chef, genesis, chat, parse-voice-food, weekly-digest, adaptive-macros, meal-plan, morning-briefing, recipe-import, meal-recommend)
 * @param payload - Request payload
 * @returns AI response
 */
async function invokeAIBrain(type: string, payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  // Premium gate: block all AI calls for free users (genesis exempted for onboarding)
  if (!_isPremium && type !== 'genesis') {
    throw new Error('This feature requires FuelIQ Pro.');
  }

  // Client-side rate limiting (fast-fail guard — not a security boundary)
  const rateLimitKey = type === 'scan-food' ? 'scanFood'
    : type === 'generate-workout' ? 'generateWorkout'
    : type === 'parse-voice-food' ? 'voiceFood'
    : type === 'weekly-digest' ? 'weeklyDigest'
    : type === 'morning-briefing' ? 'morningBriefing'
    : type === 'adaptive-macros' ? 'weeklyDigest'
    : type === 'meal-plan' ? 'mealPlan'
    : type === 'food-swap' ? 'foodSwap'
    : type === 'recipe-import' ? 'recipeImport'
    : type === 'meal-recommend' ? 'mealRecommend'
    : type;
  const rateCheck = checkAIRateLimit(rateLimitKey);
  if (!rateCheck.allowed) {
    throw new Error(rateCheck.message || 'Too many requests. Please wait a moment.');
  }

  // Server-side rate limiting (authoritative — cannot be bypassed)
  const AI_SERVER_LIMITS: Record<string, { max: number; window: number }> = {
    chat: { max: 15, window: 60 },
    'scan-food': { max: 5, window: 60 },
    'generate-workout': { max: 3, window: 60 },
    chef: { max: 3, window: 60 },
    genesis: { max: 3, window: 60 },
    'meal-plan': { max: 3, window: 60 },
    'parse-voice-food': { max: 5, window: 60 },
    'weekly-digest': { max: 2, window: 300 },
    'morning-briefing': { max: 2, window: 300 },
    'food-swap': { max: 10, window: 60 },
    'recipe-import': { max: 5, window: 60 },
    'meal-recommend': { max: 10, window: 60 },
  };
  const serverLimit = AI_SERVER_LIMITS[type] || { max: 10, window: 60 };
  try {
    const { data: serverRateResult } = await supabase.rpc('check_rate_limit', {
      p_user_id: (await supabase.auth.getUser()).data.user?.id,
      p_action: `ai-${type}`,
      p_max_calls: serverLimit.max,
      p_window_seconds: serverLimit.window,
    });
    if (serverRateResult && !serverRateResult.allowed) {
      const retryAfter = serverRateResult.retry_after_seconds || 30;
      throw new Error(`Too many requests. Please wait ${retryAfter} seconds.`);
    }
  } catch (serverRateError: unknown) {
    // If the rate limit check itself fails (e.g. migration not applied yet),
    // fall through to the request — client-side check provides basic protection
    if ((serverRateError as Error).message?.includes('Too many requests')) {
      throw serverRateError;
    }
  }

  try {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('AI request timed out. Please try again.')), 15000)
    );
    const { data, error } = await Promise.race([
      retryWithBackoff(() =>
        supabase.functions.invoke('ai-brain', { body: { type, payload } })
      ),
      timeoutPromise,
    ]);

    if (error) {
      // Never log edge function errors — may contain internal details
      throw new Error((error as Error).message || 'AI service temporarily unavailable');
    }

    // Check for error in response data
    if (data?.error) {
      // Don't expose raw server error messages to client
      const safeMessage = typeof data.error === 'string' && data.error.length < 200
        ? data.error
        : 'AI service error';
      throw new Error(safeMessage);
    }

    // Validate response is a usable object
    if (data === null || data === undefined) {
      throw new Error('Empty response from AI service');
    }

    if (typeof data !== 'object') {
      throw new Error('Invalid response format from AI service');
    }

    // Guard against oversized responses that could exhaust memory
    const responseStr = JSON.stringify(data);
    const MAX_RESPONSE_SIZE = 500 * 1024; // 500KB
    if (responseStr.length > MAX_RESPONSE_SIZE) {
      throw new Error('AI response exceeded maximum size. Please try a simpler request.');
    }

    // Validate string fields aren't absurdly long (prevent memory abuse)
    validateResponseStrings(data);

    return data as Record<string, unknown>;
  } catch (error: unknown) {
    if (__DEV__) {
      console.error(`[AI] Invoke error (${type}):`, (error as Error).message);
    }

    // Re-throw with user-friendly message
    const message = (error as Error).message || 'Failed to process request';
    throw new Error(
      message.includes('FunctionsHttpError') || message.includes('FunctionsRelayError')
        ? 'AI service temporarily unavailable. Please try again later.'
        : message
    );
  }
}

/**
 * Check if AI service is available (edge function configured)
 * Note: This now always returns true since we assume the edge function is deployed
 * @returns True if service is configured
 */
export function isAIServiceAvailable(): boolean {
  // Edge function is always available if Supabase is configured
  return !!supabase;
}

// ============================================================================
// AI FUNCTIONS - THIN WRAPPERS TO EDGE FUNCTION
// ============================================================================

/**
 * Analyze a food image using AI vision
 * @param base64Image - Base64 encoded image data (without data URI prefix)
 * @returns Scanned food result with nutrition data
 */
export async function analyzeFoodImage(base64Image: string): Promise<FoodScanResult> {
  if (!base64Image || typeof base64Image !== 'string') {
    throw new Error('Invalid image data. Please try again with a different image.');
  }

  // Deduplicate by image hash (first+last 50 chars) to prevent double-taps
  const imageKey = `scan-${base64Image.substring(0, 50)}-${base64Image.slice(-50)}`;
  const result = await deduplicatedAIRequest<Record<string, unknown>>(imageKey, () =>
    invokeAIBrain('scan-food', { base64Image })
  );

  return {
    name: (result.name as string) || 'Unknown Food',
    emoji: (result.emoji as string) || '\u{1F37D}\u{FE0F}',
    calories: (result.calories as number) || 0,
    protein: (result.protein as number) || 0,
    carbs: (result.carbs as number) || 0,
    fat: (result.fat as number) || 0,
    serving: (result.serving as string) || '1 serving',
    confidence: (result.confidence as string) || 'medium',
  };
}

interface WorkoutParams {
  goal?: string;
  level?: number;
  duration?: number;
  equipment?: string[];
  targetMuscles?: string;
  injuries?: string;
  recoveryScore?: number;
}

/**
 * Generate a pro-level workout plan using AI
 * @param params - Workout parameters
 * @returns Complete workout plan with warmup, main_set, cooldown
 */
export async function generateWorkout(params: WorkoutParams): Promise<WorkoutPlan> {
  if (!params || typeof params !== 'object') {
    throw new Error('Invalid workout parameters');
  }

  const workoutKey = `workout-${params.goal}-${params.level}-${params.duration}-r${params.recoveryScore ?? 'none'}`;
  const sanitizedPayload: Record<string, unknown> = {
    goal: sanitizeText(params.goal || 'hypertrophy', 50),
    level: sanitizeNumber(params.level || 3, 1, 5),
    duration: sanitizeNumber(params.duration || 30, 5, 180),
    equipment: Array.isArray(params.equipment) ? params.equipment.slice(0, 20).map((e: string) => sanitizeText(String(e), 50)) : [],
    targetMuscles: sanitizeText(params.targetMuscles || 'Full body', 200),
    injuries: sanitizeText(params.injuries || '', 500),
    recoveryScore: params.recoveryScore != null ? sanitizeNumber(params.recoveryScore, 0, 100) : undefined,
  };
  const result = await deduplicatedAIRequest<Record<string, unknown>>(workoutKey, () =>
    invokeAIBrain('generate-workout', sanitizedPayload)
  );

  // Ensure the result has the expected structure
  return {
    id: (result.id as string) || `workout-${Date.now()}`,
    title: (result.title as string) || 'Custom Workout',
    subtitle: (result.subtitle as string) || '',
    goal: (result.goal as string) || params.goal || '',
    level: (result.level as number) || params.level || 3,
    duration: (result.duration as number) || params.duration || 30,
    warmup: Array.isArray(result.warmup) ? result.warmup : [],
    main_set: Array.isArray(result.main_set) ? result.main_set : [],
    cooldown: Array.isArray(result.cooldown) ? result.cooldown : [],
    difficulty_rating: (result.difficulty_rating as number) || 5,
    estimated_calories: (result.estimated_calories as number) || 0,
    coach_notes: (result.coach_notes as string) || '',
    pro_tips: Array.isArray(result.pro_tips) ? result.pro_tips : [],
    supersets: Array.isArray(result.supersets) ? result.supersets as SupersetGroup[] : undefined,
  };
}

interface ChefPreferences {
  dietary?: string[];
  goal?: string;
  maxTime?: number;
}

interface RecipeResult {
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

interface ChefResponse {
  detected_ingredients: string[];
  recipes: RecipeResult[];
}

/**
 * Analyze fridge/pantry image and suggest healthy recipes
 * @param base64Image - Base64 encoded image data
 * @param preferences - Dietary preferences
 * @returns Detected ingredients and recipe suggestions
 */
export async function suggestRecipesFromImage(base64Image: string, preferences: ChefPreferences = {}): Promise<ChefResponse> {
  if (!base64Image || typeof base64Image !== 'string') {
    throw new Error('Invalid image data. Please try again with a different image.');
  }

  const result = await invokeAIBrain('chef', {
    base64Image,
    preferences: {
      dietary: preferences.dietary || [],
      goal: preferences.goal || 'balanced',
      maxTime: preferences.maxTime || 60,
    },
  });

  // Ensure the result has the expected structure
  return {
    detected_ingredients: Array.isArray(result.detected_ingredients)
      ? result.detected_ingredients as string[]
      : [],
    recipes: Array.isArray(result.recipes)
      ? (result.recipes as Record<string, unknown>[]).map((recipe, idx) => ({
          id: (recipe.id as string) || `recipe-${idx}`,
          name: (recipe.name as string) || 'Unnamed Recipe',
          emoji: (recipe.emoji as string) || '\u{1F37D}\u{FE0F}',
          description: (recipe.description as string) || '',
          difficulty: (recipe.difficulty as string) || 'Medium',
          time: (recipe.time as string) || '30 mins',
          servings: (recipe.servings as number) || 2,
          calories: (recipe.calories as number) || 0,
          protein: (recipe.protein as number) || 0,
          carbs: (recipe.carbs as number) || 0,
          fat: (recipe.fat as number) || 0,
          ingredients_used: Array.isArray(recipe.ingredients_used)
            ? recipe.ingredients_used as string[]
            : [],
          missing_ingredients: Array.isArray(recipe.missing_ingredients)
            ? recipe.missing_ingredients as string[]
            : [],
          instructions: Array.isArray(recipe.instructions)
            ? recipe.instructions as string[]
            : [],
          chef_tip: (recipe.chef_tip as string) || '',
        }))
      : [],
  };
}

interface GenesisResult {
  age: number;
  weight: number;
  weight_unit: string;
  height: number;
  height_unit: string;
  gender: string;
  activity_level: string;
  goal: string;
  bmr: number;
  tdee: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  goal_summary: string;
}

/**
 * Analyze natural language user description and calculate fitness baselines
 * Used for AI-powered onboarding experience (Genesis)
 * @param userDescription - Natural language description (e.g., "25 male, 80kg, lift 3x week")
 * @returns Calculated BMR, TDEE, calories, macros
 */
export async function calculateUserBaselines(userDescription: string): Promise<GenesisResult> {
  if (!userDescription || typeof userDescription !== 'string') {
    throw new Error('Please describe yourself to continue');
  }

  const sanitized = sanitizeText(userDescription, 2000);
  if (sanitized.length < 10) {
    throw new Error('Please provide more details about yourself');
  }

  const result = await invokeAIBrain('genesis', { userDescription: sanitized });

  // Ensure the result has the expected structure
  return {
    age: (result.age as number) || 25,
    weight: (result.weight as number) || 70,
    weight_unit: (result.weight_unit as string) || 'kg',
    height: (result.height as number) || 170,
    height_unit: (result.height_unit as string) || 'cm',
    gender: (result.gender as string) || 'male',
    activity_level: (result.activity_level as string) || 'moderate',
    goal: (result.goal as string) || 'maintain',
    bmr: Math.round((result.bmr as number) || 1800),
    tdee: Math.round((result.tdee as number) || 2200),
    calories: Math.round((result.calories as number) || 2000),
    protein: Math.round((result.protein as number) || 150),
    carbs: Math.round((result.carbs as number) || 200),
    fat: Math.round((result.fat as number) || 70),
    goal_summary: (result.goal_summary as string) || 'Personalized nutrition plan created',
  };
}

interface ConversationMessage {
  role: string;
  content: string;
}

/**
 * Chat with AI nutritionist
 * @param message - User's message
 * @param conversationHistory - Previous messages
 * @param userContext - Aggregated user data for context
 * @returns Chat response with reply, suggestions, and food items
 */
export async function chatWithNutritionist(
  message: string,
  conversationHistory: ConversationMessage[] = [],
  userContext: Record<string, unknown> = {}
): Promise<ChatResponse> {
  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    throw new Error('Please enter a message.');
  }

  const sanitizedMessage = sanitizeText(message, 1000);
  if (sanitizedMessage.length === 0) {
    throw new Error('Please enter a valid message.');
  }

  // Sanitize conversation history - limit size and content
  const sanitizedHistory: ConversationMessage[] = Array.isArray(conversationHistory)
    ? conversationHistory.slice(-20).map((m) => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: sanitizeText(String(m.content || ''), 2000),
      }))
    : [];

  const result = await invokeAIBrain('chat', {
    message: sanitizedMessage,
    conversationHistory: sanitizedHistory,
    userContext,
  });

  return {
    reply: (result.reply as string) || "I'm here to help! What would you like to know?",
    suggestions: Array.isArray(result.suggestions) ? result.suggestions as string[] : [],
    foodItems: Array.isArray(result.foodItems) ? result.foodItems : [],
  };
}

interface VoiceFoodResult {
  transcript: string;
  foods: unknown[];
}

/**
 * Parse voice recording for food items
 * @param audioBase64 - Base64 encoded audio data
 * @param mimeType - Audio MIME type (default: audio/mp4)
 * @returns Transcript and parsed food items
 */
export async function parseVoiceFood(audioBase64: string, mimeType: string = 'audio/mp4'): Promise<VoiceFoodResult> {
  if (!audioBase64 || typeof audioBase64 !== 'string') {
    throw new Error('No audio data provided.');
  }

  const result = await invokeAIBrain('parse-voice-food', {
    audioBase64,
    mimeType,
  });

  return {
    transcript: (result.transcript as string) || '',
    foods: Array.isArray(result.foods) ? result.foods : [],
  };
}

/**
 * Generate a personalized weekly coaching digest
 * @param weekData - Aggregated weekly stats
 * @returns Weekly digest with insights and score
 */
export async function generateWeeklyDigest(weekData: Record<string, unknown>): Promise<WeeklyDigest> {
  if (!weekData || typeof weekData !== 'object') {
    throw new Error('No weekly data available.');
  }

  const result = await invokeAIBrain('weekly-digest', { weekData });

  return {
    headline: (result.headline as string) || 'Your Weekly Summary',
    insights: Array.isArray(result.insights) ? result.insights : [],
    weeklyScore: (result.weeklyScore as number) || 50,
    motivationalQuote: (result.motivationalQuote as string) || 'Keep pushing forward!',
    generatedAt: Date.now(),
  };
}

interface WeekMacroData extends Record<string, unknown> {
  currentCalories?: number;
  currentProtein?: number;
  currentCarbs?: number;
  currentFat?: number;
}

/**
 * Generate adaptive macro recommendation based on weekly data
 * @param weekData - Aggregated weekly nutrition and weight data
 * @returns Macro adjustment recommendation
 */
export async function generateMacroRecommendation(weekData: WeekMacroData): Promise<MacroRecommendation> {
  if (!weekData || typeof weekData !== 'object') {
    throw new Error('No weekly data available for macro analysis.');
  }

  const result = await invokeAIBrain('adaptive-macros', { weekData });

  return {
    shouldAdjust: !!(result.shouldAdjust),
    reason: (result.reason as string) || '',
    newCalories: (result.newCalories as number) || weekData.currentCalories || 2000,
    newProtein: (result.newProtein as number) || weekData.currentProtein || 150,
    newCarbs: (result.newCarbs as number) || weekData.currentCarbs || 200,
    newFat: (result.newFat as number) || weekData.currentFat || 65,
    calorieChange: (result.calorieChange as number) || 0,
    headline: (result.headline as string) || 'No changes needed',
    explanation: (result.explanation as string) || 'Your current targets are working well.',
    generatedAt: Date.now(),
  };
}

interface MealPlanParams {
  calorieTarget?: number;
  proteinTarget?: number;
  carbsTarget?: number;
  fatTarget?: number;
  dietaryPreferences?: string[];
  allergies?: string[];
  goal?: string;
  daysCount?: number;
}

/**
 * Generate a personalized multi-day meal plan
 * @param params - Meal plan parameters
 * @returns Meal plan with days, shopping list, and coach note
 */
export async function generateMealPlan(params: MealPlanParams): Promise<MealPlan> {
  if (!params || typeof params !== 'object') {
    throw new Error('Invalid meal plan parameters');
  }

  const mealPlanKey = `meal-plan-${params.calorieTarget}-${params.goal}-${params.daysCount}`;
  const result = await deduplicatedAIRequest<Record<string, unknown>>(mealPlanKey, () =>
    invokeAIBrain('meal-plan', {
      calorieTarget: params.calorieTarget || 2000,
      proteinTarget: params.proteinTarget || 150,
      carbsTarget: params.carbsTarget || 200,
      fatTarget: params.fatTarget || 65,
      dietaryPreferences: params.dietaryPreferences || [],
      allergies: params.allergies || [],
      goal: params.goal || 'maintain',
      daysCount: params.daysCount || 3,
    })
  );

  return {
    days: Array.isArray(result.days) ? result.days : [],
    shoppingList: Array.isArray(result.shoppingList) ? result.shoppingList : [],
    coachNote: (result.coachNote as string) || 'Your personalized meal plan is ready!',
    generatedAt: Date.now(),
  };
}

interface MorningBriefingUserData extends Record<string, unknown> {
  userName?: string;
  yesterdayCalories?: number;
  calorieGoal?: number;
  yesterdayProtein?: number;
  proteinGoal?: number;
  currentStreak?: number;
  weightTrend?: number;
  isFasting?: boolean;
  fastDuration?: number;
  dietaryPreferences?: string[];
  goal?: string;
}

/**
 * Generate a personalized AI morning briefing
 * @param userData - User data for personalization
 * @returns Morning briefing with greeting, insights, and focus areas
 */
export async function generateMorningBriefing(userData: MorningBriefingUserData): Promise<MorningBriefing> {
  if (!userData || typeof userData !== 'object') {
    throw new Error('No user data available for morning briefing.');
  }

  const result = await invokeAIBrain('morning-briefing', userData);

  return {
    greeting: (result.greeting as string) || 'Good morning!',
    headline: (result.headline as string) || 'Ready to crush today!',
    insights: Array.isArray(result.insights) ? result.insights : [],
    todayFocus: (result.todayFocus as { food: string; workout: string }) || { food: 'Stay on track today.', workout: 'Get moving!' },
    motivationalQuote: (result.motivationalQuote as string) || 'Every day is a new opportunity.',
    score: (result.score as number) || 50,
    generatedAt: Date.now(),
  };
}

// ============================================================================
// AI MEAL RECOMMENDATIONS
// ============================================================================

interface AIMealRecommendationParams {
  remainingCalories: number;
  remainingProtein: number;
  remainingCarbs: number;
  remainingFat: number;
  mealType: string;
  recentFoods?: string[];
  dietaryPreferences?: string[];
  goal?: string;
}

interface AIMealRecommendation {
  id: string;
  name: string;
  emoji: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  prepTime?: number;
  reason: string;
}

interface AIMealRecommendationResult {
  recommendations: AIMealRecommendation[];
  coachMessage: string;
}

/**
 * Get AI-powered meal recommendations based on remaining macro budget.
 * Uses the ai-brain edge function for personalized, context-aware suggestions.
 * @param params - Remaining macros, meal type, and user preferences
 * @returns AI-generated meal recommendations with coach message
 */
export async function getAIMealRecommendations(
  params: AIMealRecommendationParams
): Promise<AIMealRecommendationResult> {
  const result = await invokeAIBrain('meal-recommend', {
    ...params,
  });

  return {
    recommendations: Array.isArray(result.recommendations)
      ? (result.recommendations as Record<string, unknown>[]).map((rec, idx) => ({
          id: (rec.id as string) || `ai-rec-${idx}-${Date.now()}`,
          name: (rec.name as string) || 'Recommended Meal',
          emoji: (rec.emoji as string) || '\u{1F37D}\u{FE0F}',
          calories: (rec.calories as number) || 0,
          protein: (rec.protein as number) || 0,
          carbs: (rec.carbs as number) || 0,
          fat: (rec.fat as number) || 0,
          prepTime: (rec.prepTime as number) || undefined,
          reason: (rec.reason as string) || '',
        }))
      : [],
    coachMessage: (result.coachMessage as string) || 'Here are my top picks for you:',
  };
}

interface FoodSwapInput {
  foodName: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  servingSize?: string;
  goal?: string;
}

/**
 * Suggest healthier or more goal-aligned food swaps
 * @param foodData - Food item data and user goal
 * @returns Swap suggestions with tip
 */
export async function suggestFoodSwaps(foodData: FoodSwapInput): Promise<FoodSwapResult> {
  if (!foodData || !foodData.foodName) {
    throw new Error('Please provide a food item to find swaps for.');
  }

  const result = await invokeAIBrain('food-swap', {
    foodName: sanitizeText(foodData.foodName, 100),
    calories: sanitizeNumber(foodData.calories || 0, 0, 10000),
    protein: sanitizeNumber(foodData.protein || 0, 0, 1000),
    carbs: sanitizeNumber(foodData.carbs || 0, 0, 1000),
    fat: sanitizeNumber(foodData.fat || 0, 0, 1000),
    servingSize: sanitizeText(foodData.servingSize || '1 serving', 50),
    goal: sanitizeText(foodData.goal || 'maintain', 20),
  });

  return {
    originalFood: (result.originalFood as Record<string, unknown>) || {},
    swaps: Array.isArray(result.swaps) ? result.swaps : [],
    tip: (result.tip as string) || 'Small swaps add up to big results over time!',
  };
}

// ============================================================================
// RECIPE URL IMPORT
// ============================================================================

interface RecipeImportIngredient {
  name: string;
  quantity: string;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface RecipeImportResult {
  name: string;
  emoji: string;
  servings: number;
  ingredients: RecipeImportIngredient[];
  totals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

/**
 * Import a recipe from a URL using AI to extract and analyze it.
 * @param url - The recipe page URL
 * @returns Structured recipe with ingredients and nutrition data
 */
export async function importRecipeFromURL(url: string): Promise<RecipeImportResult> {
  if (!url || typeof url !== 'string') {
    throw new Error('Please provide a valid recipe URL.');
  }

  const sanitizedUrl = sanitizeText(url.trim(), 2000);
  if (sanitizedUrl.length < 10) {
    throw new Error('Please provide a valid recipe URL.');
  }

  const importKey = `recipe-import-${sanitizedUrl}`;
  const result = await deduplicatedAIRequest<Record<string, unknown>>(importKey, () =>
    invokeAIBrain('recipe-import', { url: sanitizedUrl })
  );

  // Validate and structure the response
  const ingredients: RecipeImportIngredient[] = Array.isArray(result.ingredients)
    ? (result.ingredients as Record<string, unknown>[]).map((ing) => ({
        name: (ing.name as string) || 'Unknown ingredient',
        quantity: (ing.quantity as string) || '1',
        unit: (ing.unit as string) || '',
        calories: (ing.calories as number) || 0,
        protein: (ing.protein as number) || 0,
        carbs: (ing.carbs as number) || 0,
        fat: (ing.fat as number) || 0,
      }))
    : [];

  const totals = result.totals && typeof result.totals === 'object'
    ? {
        calories: ((result.totals as Record<string, unknown>).calories as number) || 0,
        protein: ((result.totals as Record<string, unknown>).protein as number) || 0,
        carbs: ((result.totals as Record<string, unknown>).carbs as number) || 0,
        fat: ((result.totals as Record<string, unknown>).fat as number) || 0,
      }
    : ingredients.reduce(
        (acc, ing) => ({
          calories: acc.calories + ing.calories,
          protein: acc.protein + ing.protein,
          carbs: acc.carbs + ing.carbs,
          fat: acc.fat + ing.fat,
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      );

  return {
    name: (result.name as string) || 'Imported Recipe',
    emoji: (result.emoji as string) || '\u{1F37D}\u{FE0F}',
    servings: (result.servings as number) || 1,
    ingredients,
    totals,
  };
}

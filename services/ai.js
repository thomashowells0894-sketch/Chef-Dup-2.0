/**
 * VibeFit AI Service - Server-Side Gateway
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

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Retry an async function with exponential backoff.
 * Only retries on network-level failures (TypeError / fetch errors),
 * NOT on HTTP error responses (4xx, 5xx).
 */
async function retryWithBackoff(fn, maxRetries = 2, initialDelay = 1000) {
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      // Only retry on network-level failures (e.g. TypeError from fetch)
      const isNetworkError =
        error instanceof TypeError ||
        error.message === 'Network request failed';
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
 * @param {string} type - Request type (scan-food, generate-workout, chef, genesis, chat, parse-voice-food, weekly-digest, adaptive-macros, meal-plan, morning-briefing)
 * @param {Object} payload - Request payload
 * @returns {Promise<Object>} AI response
 */
async function invokeAIBrain(type, payload) {
  try {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('AI request timed out. Please try again.')), 30000)
    );
    const { data, error } = await Promise.race([
      retryWithBackoff(() =>
        supabase.functions.invoke('ai-brain', { body: { type, payload } })
      ),
      timeoutPromise,
    ]);

    if (error) {
      // Handle Supabase function errors
      if (__DEV__) {
        console.error(`[AI] Edge function error (${type}):`, error.message);
      }
      throw new Error(error.message || 'AI service temporarily unavailable');
    }

    // Check for error in response data
    if (data?.error) {
      throw new Error(data.error);
    }

    return data;
  } catch (error) {
    if (__DEV__) {
      console.error(`[AI] Invoke error (${type}):`, error.message);
    }

    // Re-throw with user-friendly message
    const message = error.message || 'Failed to process request';
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
 * @returns {boolean} True if service is configured
 */
export function isAIServiceAvailable() {
  // Edge function is always available if Supabase is configured
  return !!supabase;
}

// ============================================================================
// AI FUNCTIONS - THIN WRAPPERS TO EDGE FUNCTION
// ============================================================================

/**
 * Analyze a food image using AI vision
 * @param {string} base64Image - Base64 encoded image data (without data URI prefix)
 * @returns {Promise<{name: string, calories: number, protein: number, carbs: number, fat: number, emoji?: string}>}
 */
export async function analyzeFoodImage(base64Image) {
  if (!base64Image || typeof base64Image !== 'string') {
    throw new Error('Invalid image data. Please try again with a different image.');
  }

  const result = await invokeAIBrain('scan-food', { base64Image });

  return {
    name: result.name || 'Unknown Food',
    emoji: result.emoji || '🍽️',
    calories: result.calories || 0,
    protein: result.protein || 0,
    carbs: result.carbs || 0,
    fat: result.fat || 0,
    serving: result.serving || '1 serving',
    confidence: result.confidence || 'medium',
  };
}

/**
 * Generate a pro-level workout plan using AI
 * @param {Object} params - Workout parameters
 * @param {string} params.goal - Training goal (hypertrophy, strength, yoga, hiit, flexibility, endurance)
 * @param {number} params.level - Skill level 1-5 (1=beginner, 5=elite)
 * @param {number} params.duration - Workout duration in minutes
 * @param {string[]} params.equipment - Available equipment array
 * @param {string} params.targetMuscles - Target muscle groups
 * @param {string} params.injuries - Injury limitations (optional)
 * @returns {Promise<Object>} Complete workout plan with warmup, main_set, cooldown
 */
export async function generateWorkout(params) {
  if (!params || typeof params !== 'object') {
    throw new Error('Invalid workout parameters');
  }

  const result = await invokeAIBrain('generate-workout', {
    goal: params.goal || 'hypertrophy',
    level: params.level || 3,
    duration: params.duration || 30,
    equipment: params.equipment || [],
    targetMuscles: params.targetMuscles || 'Full body',
    injuries: params.injuries || '',
  });

  // Ensure the result has the expected structure
  return {
    id: result.id || `workout-${Date.now()}`,
    title: result.title || 'Custom Workout',
    subtitle: result.subtitle || '',
    goal: result.goal || params.goal,
    level: result.level || params.level,
    duration: result.duration || params.duration,
    warmup: Array.isArray(result.warmup) ? result.warmup : [],
    main_set: Array.isArray(result.main_set) ? result.main_set : [],
    cooldown: Array.isArray(result.cooldown) ? result.cooldown : [],
    difficulty_rating: result.difficulty_rating || 5,
    estimated_calories: result.estimated_calories || 0,
    coach_notes: result.coach_notes || '',
    pro_tips: Array.isArray(result.pro_tips) ? result.pro_tips : [],
  };
}

/**
 * Analyze fridge/pantry image and suggest healthy recipes
 * @param {string} base64Image - Base64 encoded image data
 * @param {Object} preferences - Dietary preferences
 * @param {string[]} preferences.dietary - Dietary restrictions (vegetarian, vegan, gluten-free, etc.)
 * @param {string} preferences.goal - Health goal (weight-loss, muscle-gain, balanced)
 * @param {number} preferences.maxTime - Maximum cooking time in minutes
 * @returns {Promise<Object>} Detected ingredients and recipe suggestions
 */
export async function suggestRecipesFromImage(base64Image, preferences = {}) {
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
      ? result.detected_ingredients
      : [],
    recipes: Array.isArray(result.recipes)
      ? result.recipes.map((recipe, idx) => ({
          id: recipe.id || `recipe-${idx}`,
          name: recipe.name || 'Unnamed Recipe',
          emoji: recipe.emoji || '🍽️',
          description: recipe.description || '',
          difficulty: recipe.difficulty || 'Medium',
          time: recipe.time || '30 mins',
          servings: recipe.servings || 2,
          calories: recipe.calories || 0,
          protein: recipe.protein || 0,
          carbs: recipe.carbs || 0,
          fat: recipe.fat || 0,
          ingredients_used: Array.isArray(recipe.ingredients_used)
            ? recipe.ingredients_used
            : [],
          missing_ingredients: Array.isArray(recipe.missing_ingredients)
            ? recipe.missing_ingredients
            : [],
          instructions: Array.isArray(recipe.instructions)
            ? recipe.instructions
            : [],
          chef_tip: recipe.chef_tip || '',
        }))
      : [],
  };
}

/**
 * Analyze natural language user description and calculate fitness baselines
 * Used for AI-powered onboarding experience (Genesis)
 * @param {string} userDescription - Natural language description (e.g., "25 male, 80kg, lift 3x week")
 * @returns {Promise<Object>} Calculated BMR, TDEE, calories, macros
 */
export async function calculateUserBaselines(userDescription) {
  if (!userDescription || typeof userDescription !== 'string') {
    throw new Error('Please describe yourself to continue');
  }

  if (userDescription.trim().length < 10) {
    throw new Error('Please provide more details about yourself');
  }

  const result = await invokeAIBrain('genesis', { userDescription });

  // Ensure the result has the expected structure
  return {
    age: result.age || 25,
    weight: result.weight || 70,
    weight_unit: result.weight_unit || 'kg',
    height: result.height || 170,
    height_unit: result.height_unit || 'cm',
    gender: result.gender || 'male',
    activity_level: result.activity_level || 'moderate',
    goal: result.goal || 'maintain',
    bmr: Math.round(result.bmr || 1800),
    tdee: Math.round(result.tdee || 2200),
    calories: Math.round(result.calories || 2000),
    protein: Math.round(result.protein || 150),
    carbs: Math.round(result.carbs || 200),
    fat: Math.round(result.fat || 70),
    goal_summary: result.goal_summary || 'Personalized nutrition plan created',
  };
}

/**
 * Chat with AI nutritionist
 * @param {string} message - User's message
 * @param {Array<{role: string, content: string}>} conversationHistory - Previous messages
 * @param {Object} userContext - Aggregated user data for context
 * @returns {Promise<{reply: string, suggestions: string[], foodItems: Array}>}
 */
export async function chatWithNutritionist(message, conversationHistory = [], userContext = {}) {
  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    throw new Error('Please enter a message.');
  }

  const result = await invokeAIBrain('chat', {
    message: message.trim(),
    conversationHistory,
    userContext,
  });

  return {
    reply: result.reply || "I'm here to help! What would you like to know?",
    suggestions: Array.isArray(result.suggestions) ? result.suggestions : [],
    foodItems: Array.isArray(result.foodItems) ? result.foodItems : [],
  };
}

/**
 * Parse voice recording for food items
 * @param {string} audioBase64 - Base64 encoded audio data
 * @param {string} mimeType - Audio MIME type (default: audio/mp4)
 * @returns {Promise<{transcript: string, foods: Array}>}
 */
export async function parseVoiceFood(audioBase64, mimeType = 'audio/mp4') {
  if (!audioBase64 || typeof audioBase64 !== 'string') {
    throw new Error('No audio data provided.');
  }

  const result = await invokeAIBrain('parse-voice-food', {
    audioBase64,
    mimeType,
  });

  return {
    transcript: result.transcript || '',
    foods: Array.isArray(result.foods) ? result.foods : [],
  };
}

/**
 * Generate a personalized weekly coaching digest
 * @param {Object} weekData - Aggregated weekly stats
 * @returns {Promise<{headline: string, insights: Array, weeklyScore: number, motivationalQuote: string, generatedAt: number}>}
 */
export async function generateWeeklyDigest(weekData) {
  if (!weekData || typeof weekData !== 'object') {
    throw new Error('No weekly data available.');
  }

  const result = await invokeAIBrain('weekly-digest', { weekData });

  return {
    headline: result.headline || 'Your Weekly Summary',
    insights: Array.isArray(result.insights) ? result.insights : [],
    weeklyScore: result.weeklyScore || 50,
    motivationalQuote: result.motivationalQuote || 'Keep pushing forward!',
    generatedAt: Date.now(),
  };
}

/**
 * Generate adaptive macro recommendation based on weekly data
 * @param {Object} weekData - Aggregated weekly nutrition and weight data
 * @returns {Promise<Object>} Macro adjustment recommendation
 */
export async function generateMacroRecommendation(weekData) {
  if (!weekData || typeof weekData !== 'object') {
    throw new Error('No weekly data available for macro analysis.');
  }

  const result = await invokeAIBrain('adaptive-macros', { weekData });

  return {
    shouldAdjust: !!result.shouldAdjust,
    reason: result.reason || '',
    newCalories: result.newCalories || weekData.currentCalories || 2000,
    newProtein: result.newProtein || weekData.currentProtein || 150,
    newCarbs: result.newCarbs || weekData.currentCarbs || 200,
    newFat: result.newFat || weekData.currentFat || 65,
    calorieChange: result.calorieChange || 0,
    headline: result.headline || 'No changes needed',
    explanation: result.explanation || 'Your current targets are working well.',
    generatedAt: Date.now(),
  };
}

/**
 * Generate a personalized multi-day meal plan
 * @param {Object} params - Meal plan parameters
 * @param {number} params.calorieTarget - Daily calorie target
 * @param {number} params.proteinTarget - Daily protein target (grams)
 * @param {number} params.carbsTarget - Daily carbs target (grams)
 * @param {number} params.fatTarget - Daily fat target (grams)
 * @param {string[]} params.dietaryPreferences - Dietary preferences
 * @param {string[]} params.allergies - Food allergies
 * @param {string} params.goal - Fitness goal (lose, maintain, gain)
 * @param {number} params.daysCount - Number of days (default 3)
 * @returns {Promise<Object>} Meal plan with days, shopping list, and coach note
 */
export async function generateMealPlan(params) {
  if (!params || typeof params !== 'object') {
    throw new Error('Invalid meal plan parameters');
  }

  const result = await invokeAIBrain('meal-plan', {
    calorieTarget: params.calorieTarget || 2000,
    proteinTarget: params.proteinTarget || 150,
    carbsTarget: params.carbsTarget || 200,
    fatTarget: params.fatTarget || 65,
    dietaryPreferences: params.dietaryPreferences || [],
    allergies: params.allergies || [],
    goal: params.goal || 'maintain',
    daysCount: params.daysCount || 3,
  });

  return {
    days: Array.isArray(result.days) ? result.days : [],
    shoppingList: Array.isArray(result.shoppingList) ? result.shoppingList : [],
    coachNote: result.coachNote || 'Your personalized meal plan is ready!',
    generatedAt: Date.now(),
  };
}

/**
 * Generate a personalized AI morning briefing
 * @param {Object} userData - User data for personalization
 * @param {string} userData.userName - User's name
 * @param {number} userData.yesterdayCalories - Yesterday's total calories
 * @param {number} userData.calorieGoal - Daily calorie goal
 * @param {number} userData.yesterdayProtein - Yesterday's total protein
 * @param {number} userData.proteinGoal - Daily protein goal
 * @param {number} userData.currentStreak - Current logging streak
 * @param {number} userData.weightTrend - Weekly weight change
 * @param {boolean} userData.isFasting - Whether user is currently fasting
 * @param {number} userData.fastDuration - Fasting duration in hours
 * @param {string[]} userData.dietaryPreferences - Dietary restrictions
 * @param {string} userData.goal - Fitness goal (lose, maintain, gain)
 * @returns {Promise<{greeting: string, headline: string, insights: Array, todayFocus: Object, motivationalQuote: string, score: number}>}
 */
export async function generateMorningBriefing(userData) {
  if (!userData || typeof userData !== 'object') {
    throw new Error('No user data available for morning briefing.');
  }

  const result = await invokeAIBrain('morning-briefing', userData);

  return {
    greeting: result.greeting || 'Good morning!',
    headline: result.headline || 'Ready to crush today!',
    insights: Array.isArray(result.insights) ? result.insights : [],
    todayFocus: result.todayFocus || { food: 'Stay on track today.', workout: 'Get moving!' },
    motivationalQuote: result.motivationalQuote || 'Every day is a new opportunity.',
    score: result.score || 50,
    generatedAt: Date.now(),
  };
}

/**
 * Suggest healthier or more goal-aligned food swaps
 * @param {Object} foodData - Food item data and user goal
 * @param {string} foodData.foodName - Name of the food to find swaps for
 * @param {number} foodData.calories - Calories of the original food
 * @param {number} foodData.protein - Protein in grams
 * @param {number} foodData.carbs - Carbs in grams
 * @param {number} foodData.fat - Fat in grams
 * @param {string} foodData.servingSize - Serving size description
 * @param {string} foodData.goal - User goal: "lose", "maintain", or "gain"
 * @returns {Promise<{originalFood: Object, swaps: Array, tip: string}>}
 */
export async function suggestFoodSwaps(foodData) {
  if (!foodData || !foodData.foodName) {
    throw new Error('Please provide a food item to find swaps for.');
  }

  const result = await invokeAIBrain('food-swap', {
    foodName: foodData.foodName,
    calories: foodData.calories || 0,
    protein: foodData.protein || 0,
    carbs: foodData.carbs || 0,
    fat: foodData.fat || 0,
    servingSize: foodData.servingSize || '1 serving',
    goal: foodData.goal || 'maintain',
  });

  return {
    originalFood: result.originalFood || {},
    swaps: Array.isArray(result.swaps) ? result.swaps : [],
    tip: result.tip || 'Small swaps add up to big results over time!',
  };
}

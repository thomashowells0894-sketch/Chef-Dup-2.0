/**
 * FuelIQ AI Brain - Supabase Edge Function
 *
 * Server-side AI gateway that securely processes all Gemini API requests.
 * The API key is stored as a secret and never exposed to the client.
 *
 * Supported request types:
 * - scan-food: Analyze food images for nutritional info
 * - generate-workout: Create personalized workout plans
 * - chef: Suggest recipes from ingredient photos
 * - genesis: Calculate user baselines for onboarding
 * - chat: AI nutritionist chat with user context
 * - parse-voice-food: Transcribe audio + extract food items
 * - weekly-digest: Generate personalized weekly coaching summary
 * - adaptive-macros: Analyze weekly data and recommend macro adjustments
 * - meal-plan: Generate personalized multi-day meal plans
 * - morning-briefing: Generate personalized AI morning briefing
 * - recipe-import: Extract recipe from a URL with ingredient nutrition estimates
 */

import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers for cross-origin requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-fueliq-timestamp, x-fueliq-nonce",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Counter for periodic nonce cleanup (every 100th request)
let requestCounter = 0;

// Safety limits
const MAX_RESPONSE_LENGTH = 50000;
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const GEMINI_TIMEOUT_MS = 30000; // 30 second timeout for Gemini calls

// ============================================================================
// CACHING
// ============================================================================

/** Cache TTLs in seconds by request type. Types not listed are never cached. */
const CACHE_TTL: Record<string, number> = {
  "generate-workout": 3600,    // 1 hour
  "meal-plan": 3600,           // 1 hour
  "weekly-digest": 14400,      // 4 hours
  "morning-briefing": 7200,    // 2 hours
  "adaptive-macros": 14400,    // 4 hours
};

/** In-flight dedup map: prevents concurrent duplicate Gemini calls. */
const inflight = new Map<string, Promise<Record<string, unknown>>>();

/**
 * Create a SHA-256 hex cache key from request type + payload.
 */
async function makeCacheKey(type: string, payload: unknown): Promise<string> {
  const data = JSON.stringify({ type, payload });
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data));
  const hex = [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return hex;
}

/**
 * Look up a cached response. Returns null on miss.
 */
async function cacheGet(
  supabaseUrl: string,
  serviceKey: string,
  cacheKey: string
): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/ai_response_cache?cache_key=eq.${cacheKey}&expires_at=gt.${new Date().toISOString()}&select=response`,
      {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
      }
    );
    if (!res.ok) return null;
    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) return null;

    // Fire-and-forget hit_count increment
    fetch(
      `${supabaseUrl}/rest/v1/ai_response_cache?cache_key=eq.${cacheKey}`,
      {
        method: "PATCH",
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({ hit_count: (rows[0].hit_count ?? 0) + 1 }),
      }
    ).catch(() => {});

    return rows[0].response as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Write a response into the cache (fire-and-forget).
 */
function cacheSet(
  supabaseUrl: string,
  serviceKey: string,
  cacheKey: string,
  requestType: string,
  response: Record<string, unknown>,
  ttlSeconds: number
): void {
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
  fetch(`${supabaseUrl}/rest/v1/ai_response_cache`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal,resolution=merge-duplicates",
    },
    body: JSON.stringify({
      cache_key: cacheKey,
      request_type: requestType,
      response,
      expires_at: expiresAt,
      hit_count: 0,
    }),
  }).catch(() => {});
}

/**
 * Wrap a promise with a timeout
 */
function withTimeout<T>(promise: Promise<T>, ms: number, label = "AI"): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} request timed out. Please try again.`)), ms)
    ),
  ]);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Safely parse JSON with multiple fallback strategies
 */
function safeParseJSON(text: string): Record<string, unknown> | null {
  if (!text || typeof text !== "string") {
    return null;
  }

  const truncatedText = text.length > MAX_RESPONSE_LENGTH
    ? text.slice(0, MAX_RESPONSE_LENGTH)
    : text;

  // Strategy 1: Direct parse
  try {
    return JSON.parse(truncatedText);
  } catch {
    // Continue to fallbacks
  }

  // Strategy 2: Clean markdown code blocks
  let cleanedText = truncatedText.trim();
  cleanedText = cleanedText.replace(/^```json\s*/i, "");
  cleanedText = cleanedText.replace(/^```\s*/, "");
  cleanedText = cleanedText.replace(/^`/, "");
  cleanedText = cleanedText.replace(/```\s*$/g, "").replace(/`\s*$/g, "").trim();

  try {
    return JSON.parse(cleanedText);
  } catch {
    // Continue to fallbacks
  }

  // Strategy 3: Extract JSON object from text
  const jsonObjectMatch = cleanedText.match(/\{[\s\S]*\}/);
  if (jsonObjectMatch) {
    try {
      return JSON.parse(jsonObjectMatch[0]);
    } catch {
      // Continue
    }
  }

  // Strategy 4: Extract JSON array from text
  const jsonArrayMatch = cleanedText.match(/\[[\s\S]*\]/);
  if (jsonArrayMatch) {
    try {
      return JSON.parse(jsonArrayMatch[0]);
    } catch {
      // All strategies failed
    }
  }

  return null;
}

/**
 * Sanitize a string value
 */
function sanitizeString(value: unknown, maxLength = 500): string {
  if (value === null || value === undefined) {
    return "";
  }
  const str = String(value);
  const sanitized = str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+=/gi, "")
    .trim();
  return sanitized.slice(0, maxLength);
}

/**
 * Sanitize a number value
 */
function sanitizeNumber(value: unknown, defaultValue = 0, min = 0, max = 100000): number {
  const num = parseInt(String(value), 10);
  if (isNaN(num)) return defaultValue;
  return Math.max(min, Math.min(max, num));
}

/**
 * Validate base64 image data
 */
function isValidBase64Image(base64: string): boolean {
  if (!base64 || typeof base64 !== "string") {
    return false;
  }
  const estimatedSize = (base64.length * 3) / 4;
  if (estimatedSize > MAX_IMAGE_SIZE) {
    return false;
  }
  const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
  return base64Regex.test(base64);
}

// ============================================================================
// AI HANDLERS
// ============================================================================

/**
 * Scan Food - Analyze food image for nutritional info
 */
async function handleScanFood(
  genAI: GoogleGenerativeAI,
  payload: { base64Image: string }
): Promise<Record<string, unknown>> {
  const { base64Image } = payload;

  if (!isValidBase64Image(base64Image)) {
    throw new Error("Invalid image data. Please try again with a different image.");
  }

  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `Analyze this image of food. Identify the food item(s) and estimate the nutritional information for a typical serving size.

Return ONLY a valid JSON object with this exact structure (no markdown, no code blocks, just the raw JSON):
{
  "name": "Food Name",
  "emoji": "relevant food emoji",
  "calories": number,
  "protein": number (in grams),
  "carbs": number (in grams),
  "fat": number (in grams),
  "serving": "estimated serving size description",
  "confidence": "high" | "medium" | "low"
}

If you cannot identify the food or the image doesn't contain food, return:
{
  "error": "Could not identify food in image",
  "name": null
}`;

  const imagePart = {
    inlineData: {
      data: base64Image,
      mimeType: "image/jpeg",
    },
  };

  const result = await withTimeout(model.generateContent([prompt, imagePart]), GEMINI_TIMEOUT_MS, "Food scan");
  const response = await result.response;
  const text = response.text();

  const parsed = safeParseJSON(text);
  if (!parsed) {
    throw new Error("Could not parse AI response. Please try again.");
  }

  if (parsed.error || !parsed.name) {
    throw new Error(sanitizeString(parsed.error) || "Could not identify food in the image");
  }

  return {
    name: sanitizeString(parsed.name, 200),
    emoji: sanitizeString(parsed.emoji, 10) || "🍽️",
    calories: sanitizeNumber(parsed.calories, 0, 0, 10000),
    protein: sanitizeNumber(parsed.protein, 0, 0, 1000),
    carbs: sanitizeNumber(parsed.carbs, 0, 0, 1000),
    fat: sanitizeNumber(parsed.fat, 0, 0, 1000),
    serving: sanitizeString(parsed.serving, 100) || "1 serving",
    confidence: ["high", "medium", "low"].includes(String(parsed.confidence))
      ? parsed.confidence
      : "medium",
  };
}

/**
 * Generate Workout - Create personalized workout plan
 */
async function handleGenerateWorkout(
  genAI: GoogleGenerativeAI,
  payload: {
    goal: string;
    level: number;
    duration: number;
    equipment: string[];
    targetMuscles: string;
    injuries?: string;
  }
): Promise<Record<string, unknown>> {
  const validGoals = ["hypertrophy", "strength", "yoga", "hiit", "flexibility", "endurance"];
  const sanitizedParams = {
    goal: validGoals.includes(payload.goal) ? payload.goal : "hypertrophy",
    level: sanitizeNumber(payload.level, 3, 1, 5),
    duration: sanitizeNumber(payload.duration, 30, 10, 180),
    equipment: Array.isArray(payload.equipment)
      ? payload.equipment.slice(0, 20).map((e) => sanitizeString(e, 50))
      : [],
    targetMuscles: sanitizeString(payload.targetMuscles, 200) || "Full body",
    injuries: sanitizeString(payload.injuries || "", 500),
  };

  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const levelDescriptions: Record<number, string> = {
    1: "Complete beginner - focus on form and basic movements",
    2: "Novice - familiar with basic exercises, building consistency",
    3: "Intermediate - solid foundation, ready for progressive overload",
    4: "Advanced - experienced athlete, can handle complex movements",
    5: "Elite/Pro - competition-ready, maximum intensity protocols",
  };

  const goalInstructions: Record<string, string> = {
    hypertrophy: "Focus on muscle hypertrophy with moderate weight, controlled tempo (3-0-1-0), and 8-12 rep ranges. Include compound and isolation movements. Rest periods 60-90 seconds.",
    strength: "Focus on maximal strength with heavy loads, 3-6 rep ranges, and longer rest (2-3 min). Prioritize compound movements. Include tempo notation for controlled eccentrics.",
    yoga: 'Create a flowing yoga sequence. Use Sanskrit names with English translations. Use "breaths" for duration. Include proper vinyasa transitions.',
    hiit: "High-intensity interval training with work:rest ratios. Include explosive movements, cardio bursts, and metabolic conditioning. Minimal rest between exercises.",
    flexibility: "Focus on mobility and flexibility. Include dynamic stretches, static holds (30-60 sec), and myofascial release techniques. Emphasize breathing cues.",
    endurance: "Cardiovascular endurance focus. Include sustained efforts, circuit-style training, and aerobic conditioning. Higher rep ranges (15-20+) with minimal rest.",
  };

  const equipmentDescription = sanitizedParams.equipment.length === 0 || sanitizedParams.equipment.includes("bodyweight")
    ? "Bodyweight only - no equipment required"
    : `Available equipment: ${sanitizedParams.equipment.join(", ")}`;

  const injuryNote = sanitizedParams.injuries
    ? `IMPORTANT - Injury/Limitation: ${sanitizedParams.injuries}. Provide safe alternatives and avoid movements that could aggravate this condition.`
    : "";

  const systemPrompt = `You are an elite Olympic-level coach with 20+ years of experience training professional athletes, celebrities, and everyday clients to achieve extraordinary results.`;

  const prompt = `${systemPrompt}

Create a complete ${sanitizedParams.duration}-minute training session based on these parameters:
${JSON.stringify({
  goal: sanitizedParams.goal,
  level: `${sanitizedParams.level}/5 - ${levelDescriptions[sanitizedParams.level]}`,
  duration: `${sanitizedParams.duration} minutes`,
  equipment: equipmentDescription,
  target: sanitizedParams.targetMuscles,
}, null, 2)}

${goalInstructions[sanitizedParams.goal]}

${injuryNote}

Return ONLY a valid JSON object (no markdown, no code blocks, just raw JSON) with this EXACT structure:
{
  "title": "Creative, Motivating Workout Name",
  "subtitle": "Brief tagline describing the session",
  "warmup": [
    {
      "name": "Movement Name",
      "duration": "time or reps",
      "notes": "Key coaching cue"
    }
  ],
  "main_set": [
    {
      "name": "Exercise Name",
      "sets": number,
      "reps": "rep range or duration",
      "rest": "rest time (e.g., '60s')",
      "tempo": "tempo notation or 'Controlled'",
      "tips": "Elite form cue",
      "muscle_group": "primary muscle targeted"
    }
  ],
  "cooldown": [
    {
      "name": "Stretch/Recovery Movement",
      "duration": "hold time",
      "notes": "Breathing or form cue"
    }
  ],
  "difficulty_rating": number (1-10),
  "estimated_calories": number,
  "coach_notes": "Brief motivational message",
  "pro_tips": ["Array of 2-3 advanced tips"]
}

Requirements:
- Warmup: 3-5 dynamic movements
- Main Set: ${Math.max(4, Math.floor(sanitizedParams.duration / 8))} exercises minimum
- Cooldown: 3-4 stretches/recovery movements
- All exercises must be appropriate for the skill level`;

  const result = await withTimeout(model.generateContent(prompt), GEMINI_TIMEOUT_MS, "Workout");
  const response = await result.response;
  const text = response.text();

  const workoutRaw = safeParseJSON(text);
  if (!workoutRaw) {
    throw new Error("Could not parse workout response. Please try again.");
  }

  if (!workoutRaw.title || !workoutRaw.main_set || !Array.isArray(workoutRaw.main_set) || workoutRaw.main_set.length === 0) {
    throw new Error("Invalid workout structure generated. Please try again.");
  }

  // Normalize the workout data
  const warmup = Array.isArray(workoutRaw.warmup) ? workoutRaw.warmup : [];
  const mainSet = Array.isArray(workoutRaw.main_set) ? workoutRaw.main_set : [];
  const cooldown = Array.isArray(workoutRaw.cooldown) ? workoutRaw.cooldown : [];
  const proTips = Array.isArray(workoutRaw.pro_tips) ? workoutRaw.pro_tips : [];

  return {
    id: `workout-${Date.now()}`,
    title: sanitizeString(workoutRaw.title, 200) || "Custom Workout",
    subtitle: sanitizeString(workoutRaw.subtitle, 300) || "",
    goal: sanitizedParams.goal,
    level: sanitizedParams.level,
    duration: sanitizedParams.duration,
    warmup: warmup.slice(0, 10).map((item: Record<string, unknown>, idx: number) => ({
      id: `warmup-${idx}`,
      name: sanitizeString(item?.name, 200) || "Warmup Exercise",
      duration: sanitizeString(item?.duration, 50) || "30 seconds",
      notes: sanitizeString(item?.notes, 300) || "",
    })),
    main_set: mainSet.slice(0, 20).map((item: Record<string, unknown>, idx: number) => ({
      id: `main-${idx}`,
      name: sanitizeString(item?.name, 200) || "Exercise",
      sets: sanitizeNumber(item?.sets, 3, 1, 20),
      reps: sanitizeString(item?.reps, 50) || "10-12",
      rest: sanitizeString(item?.rest, 20) || "60s",
      tempo: sanitizeString(item?.tempo, 50) || "Controlled",
      tips: sanitizeString(item?.tips, 300) || "",
      muscle_group: sanitizeString(item?.muscle_group, 100) || "",
    })),
    cooldown: cooldown.slice(0, 10).map((item: Record<string, unknown>, idx: number) => ({
      id: `cooldown-${idx}`,
      name: sanitizeString(item?.name, 200) || "Cooldown Stretch",
      duration: sanitizeString(item?.duration, 50) || "30 seconds",
      notes: sanitizeString(item?.notes, 300) || "",
    })),
    difficulty_rating: sanitizeNumber(workoutRaw.difficulty_rating, 5, 1, 10),
    estimated_calories: sanitizeNumber(workoutRaw.estimated_calories, sanitizedParams.duration * 8, 0, 5000),
    coach_notes: sanitizeString(workoutRaw.coach_notes, 500) || "",
    pro_tips: proTips.slice(0, 5).map((tip: unknown) => sanitizeString(tip, 300)).filter(Boolean),
  };
}

/**
 * Chef - Suggest recipes from ingredient photo
 */
async function handleChef(
  genAI: GoogleGenerativeAI,
  payload: {
    base64Image: string;
    preferences?: {
      dietary?: string[];
      goal?: string;
      maxTime?: number;
    };
  }
): Promise<Record<string, unknown>> {
  const { base64Image, preferences = {} } = payload;

  if (!isValidBase64Image(base64Image)) {
    throw new Error("Invalid image data. Please try again with a different image.");
  }

  const sanitizedPrefs = {
    dietary: Array.isArray(preferences.dietary)
      ? preferences.dietary.slice(0, 10).map((d) => sanitizeString(d, 50))
      : [],
    goal: ["weight-loss", "muscle-gain", "balanced"].includes(String(preferences.goal))
      ? preferences.goal
      : "balanced",
    maxTime: sanitizeNumber(preferences.maxTime, 60, 5, 480),
  };

  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const dietaryNote = sanitizedPrefs.dietary.length
    ? `Dietary restrictions: ${sanitizedPrefs.dietary.join(", ")}. All recipes MUST comply with these restrictions.`
    : "";

  const goalNote = `Optimize recipes for: ${
    sanitizedPrefs.goal === "weight-loss" ? "low calorie, high protein"
    : sanitizedPrefs.goal === "muscle-gain" ? "high protein, moderate carbs"
    : "balanced macros"
  }.`;

  const timeNote = `Maximum cooking time: ${sanitizedPrefs.maxTime} minutes.`;

  const prompt = `You are a professional chef and nutritionist. Analyze this image of a fridge, pantry, or ingredients.

Your task:
1. Identify ALL visible food ingredients in the image
2. Based on these ingredients (and assuming basic staples like oil, salt, pepper, garlic, onion, common spices), generate 3 healthy, delicious recipe options

${dietaryNote}
${goalNote}
${timeNote}

Return ONLY a valid JSON object (no markdown, no code blocks, just raw JSON) with this EXACT structure:
{
  "detected_ingredients": ["ingredient1", "ingredient2", "ingredient3", ...],
  "recipes": [
    {
      "id": "recipe-1",
      "name": "Creative Recipe Title",
      "emoji": "relevant food emoji",
      "description": "One sentence describing the dish",
      "difficulty": "Easy" | "Medium" | "Hard",
      "time": "XX mins",
      "servings": number,
      "calories": number (per serving),
      "protein": number (grams per serving),
      "carbs": number (grams per serving),
      "fat": number (grams per serving),
      "ingredients_used": ["list of detected ingredients this recipe uses"],
      "missing_ingredients": ["list of ingredients needed but not detected"],
      "instructions": [
        "Step 1: Detailed instruction...",
        "Step 2: Detailed instruction..."
      ],
      "chef_tip": "One professional cooking tip for this recipe"
    }
  ]
}

If you cannot identify any food items, return: { "error": "No food ingredients detected", "detected_ingredients": [] }`;

  const imagePart = {
    inlineData: {
      data: base64Image,
      mimeType: "image/jpeg",
    },
  };

  const result = await withTimeout(model.generateContent([prompt, imagePart]), GEMINI_TIMEOUT_MS, "Chef");
  const response = await result.response;
  const text = response.text();

  const parsed = safeParseJSON(text);
  if (!parsed) {
    throw new Error("Could not parse recipe response. Please try again.");
  }

  if (parsed.error || !parsed.detected_ingredients || !Array.isArray(parsed.detected_ingredients) || parsed.detected_ingredients.length === 0) {
    throw new Error(sanitizeString(parsed.error) || "No ingredients detected in image. Please try with a clearer photo.");
  }

  const recipes = Array.isArray(parsed.recipes) ? parsed.recipes : [];
  const detectedIngredients = Array.isArray(parsed.detected_ingredients) ? parsed.detected_ingredients : [];

  return {
    detected_ingredients: detectedIngredients
      .slice(0, 50)
      .map((i: unknown) => sanitizeString(i, 100))
      .filter(Boolean),
    recipes: recipes.slice(0, 5).map((recipe: Record<string, unknown>, idx: number) => {
      const ingredientsUsed = Array.isArray(recipe?.ingredients_used) ? recipe.ingredients_used : [];
      const missingIngredients = Array.isArray(recipe?.missing_ingredients) ? recipe.missing_ingredients : [];
      const instructions = Array.isArray(recipe?.instructions) ? recipe.instructions : [];

      return {
        id: sanitizeString(recipe?.id, 50) || `recipe-${idx}`,
        name: sanitizeString(recipe?.name, 200) || "Unnamed Recipe",
        emoji: sanitizeString(recipe?.emoji, 10) || "🍽️",
        description: sanitizeString(recipe?.description, 300) || "",
        difficulty: ["Easy", "Medium", "Hard"].includes(String(recipe?.difficulty)) ? recipe.difficulty : "Medium",
        time: sanitizeString(recipe?.time, 30) || "30 mins",
        servings: sanitizeNumber(recipe?.servings, 2, 1, 20),
        calories: sanitizeNumber(recipe?.calories, 0, 0, 5000),
        protein: sanitizeNumber(recipe?.protein, 0, 0, 500),
        carbs: sanitizeNumber(recipe?.carbs, 0, 0, 500),
        fat: sanitizeNumber(recipe?.fat, 0, 0, 500),
        ingredients_used: ingredientsUsed.slice(0, 20).map((i: unknown) => sanitizeString(i, 100)).filter(Boolean),
        missing_ingredients: missingIngredients.slice(0, 20).map((i: unknown) => sanitizeString(i, 100)).filter(Boolean),
        instructions: instructions.slice(0, 20).map((i: unknown) => sanitizeString(i, 500)).filter(Boolean),
        chef_tip: sanitizeString(recipe?.chef_tip, 300) || "",
      };
    }),
  };
}

/**
 * Genesis - Calculate user baselines for onboarding
 */
async function handleGenesis(
  genAI: GoogleGenerativeAI,
  payload: { userDescription: string }
): Promise<Record<string, unknown>> {
  const { userDescription } = payload;

  if (!userDescription || typeof userDescription !== "string") {
    throw new Error("Please describe yourself to continue");
  }

  const sanitizedDescription = sanitizeString(userDescription.trim(), 1000);

  if (sanitizedDescription.length < 10) {
    throw new Error("Please provide more details about yourself");
  }

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      temperature: 0.3,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 2048,
    },
  });

  const prompt = `You are a certified nutritionist and fitness expert. Analyze the following user description and extract their physical stats, then calculate their personalized nutrition targets.

USER DESCRIPTION:
"${sanitizedDescription}"

EXTRACTION RULES:
1. Extract: age, weight (convert to kg if in lbs), height (convert to cm if in ft/in), gender, activity level
2. Infer activity_level from exercise mentions:
   - "sedentary" = desk job, no exercise
   - "light" = 1-2 workouts/week
   - "moderate" = 3-4 workouts/week
   - "active" = 5-6 workouts/week
   - "extreme" = daily intense training or physical job
3. Infer goal from keywords:
   - "lose/cut/lean/shred/deficit" = "lose"
   - "maintain/stay/current" = "maintain"
   - "gain/bulk/build/grow/muscle" = "gain"

CALCULATION FORMULAS (use these exactly):
- BMR (Mifflin-St Jeor):
  - Male: BMR = (10 × weight_kg) + (6.25 × height_cm) - (5 × age) + 5
  - Female: BMR = (10 × weight_kg) + (6.25 × height_cm) - (5 × age) - 161
- TDEE = BMR × activity_multiplier
  - sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, extreme: 1.9
- Calorie Target:
  - lose: TDEE - 500
  - maintain: TDEE
  - gain: TDEE + 300
- Protein: 2.0g per kg bodyweight for muscle building, 1.6g for maintenance/fat loss
- Fat: 25% of calories / 9
- Carbs: remaining calories / 4

RESPONSE FORMAT (return ONLY this JSON, no other text):
{
  "age": <number>,
  "weight": <number in kg>,
  "weight_unit": "kg",
  "height": <number in cm>,
  "height_unit": "cm",
  "gender": "male" or "female",
  "activity_level": "sedentary" | "light" | "moderate" | "active" | "extreme",
  "goal": "lose" | "maintain" | "gain",
  "bmr": <calculated BMR>,
  "tdee": <calculated TDEE>,
  "calories": <daily calorie target>,
  "protein": <grams>,
  "carbs": <grams>,
  "fat": <grams>,
  "goal_summary": "<one sentence describing their personalized plan>"
}

If the description is too vague or missing critical info, make reasonable assumptions for a healthy adult but note it in goal_summary.`;

  const result = await withTimeout(model.generateContent(prompt), GEMINI_TIMEOUT_MS, "Genesis");
  const response = await result.response;
  const text = response.text();

  const parsed = safeParseJSON(text);
  if (!parsed) {
    throw new Error("Could not process your description. Please try rephrasing.");
  }

  const validActivityLevels = ["sedentary", "light", "moderate", "active", "extreme"];
  const validGoals = ["lose", "maintain", "gain"];

  return {
    age: sanitizeNumber(parsed.age, 25, 13, 120),
    weight: sanitizeNumber(parsed.weight, 70, 30, 500),
    weight_unit: "kg",
    height: sanitizeNumber(parsed.height, 170, 100, 250),
    height_unit: "cm",
    gender: parsed.gender === "female" ? "female" : "male",
    activity_level: validActivityLevels.includes(String(parsed.activity_level))
      ? parsed.activity_level
      : "moderate",
    goal: validGoals.includes(String(parsed.goal)) ? parsed.goal : "maintain",
    bmr: Math.round(sanitizeNumber(parsed.bmr, 1800, 800, 5000)),
    tdee: Math.round(sanitizeNumber(parsed.tdee, 2200, 1000, 8000)),
    calories: Math.round(sanitizeNumber(parsed.calories, 2000, 1000, 6000)),
    protein: Math.round(sanitizeNumber(parsed.protein, 150, 30, 400)),
    carbs: Math.round(sanitizeNumber(parsed.carbs, 200, 50, 600)),
    fat: Math.round(sanitizeNumber(parsed.fat, 70, 20, 250)),
    goal_summary: sanitizeString(parsed.goal_summary, 300) || "Personalized nutrition plan created",
  };
}

/**
 * Chat - AI Nutritionist with full user context
 */
async function handleChat(
  genAI: GoogleGenerativeAI,
  payload: {
    message: string;
    conversationHistory?: Array<{ role: string; content: string }>;
    userContext?: Record<string, unknown>;
  }
): Promise<Record<string, unknown>> {
  const { message, conversationHistory = [], userContext = {} } = payload;

  if (!message || typeof message !== "string" || message.trim().length === 0) {
    throw new Error("Please enter a message.");
  }

  const sanitizedMessage = sanitizeString(message, 2000);

  // Build user context summary for the system prompt
  const contextParts: string[] = [];
  if (userContext.name) contextParts.push(`User's name: ${sanitizeString(userContext.name, 100)}`);
  if (userContext.gender) contextParts.push(`Gender: ${sanitizeString(userContext.gender, 20)}`);
  if (userContext.age) contextParts.push(`Age: ${sanitizeNumber(userContext.age, 0, 0, 150)}`);
  if (userContext.weight) {
    const weightUnit = sanitizeString(userContext.weightUnit, 5) || "lbs";
    contextParts.push(`Weight: ${sanitizeNumber(userContext.weight, 0, 0, 1000)} ${weightUnit}`);
  }
  if (userContext.height) {
    const heightVal = sanitizeNumber(userContext.height, 0, 0, 300);
    // Height stored in inches internally; convert to readable format
    const feet = Math.floor(heightVal / 12);
    const inches = heightVal % 12;
    contextParts.push(`Height: ${feet}'${inches}" (${Math.round(heightVal * 2.54)} cm)`);
  }
  if (userContext.tdee) contextParts.push(`TDEE: ${sanitizeNumber(userContext.tdee, 0, 0, 10000)} kcal`);
  if (userContext.goal) contextParts.push(`Goal: ${sanitizeString(userContext.goal, 50)}`);

  if (userContext.todayCalories !== undefined) {
    contextParts.push(`Today's intake: ${sanitizeNumber(userContext.todayCalories, 0, 0, 20000)} kcal consumed`);
  }
  if (userContext.calorieGoal) {
    contextParts.push(`Daily calorie goal: ${sanitizeNumber(userContext.calorieGoal, 0, 0, 10000)} kcal`);
  }
  if (userContext.remainingCalories !== undefined) {
    contextParts.push(`Remaining today: ${sanitizeNumber(userContext.remainingCalories, 0, -5000, 10000)} kcal`);
  }
  if (userContext.todayProtein !== undefined) {
    contextParts.push(`Protein today: ${sanitizeNumber(userContext.todayProtein, 0, 0, 1000)}g / ${sanitizeNumber(userContext.proteinGoal, 0, 0, 1000)}g goal`);
  }
  if (userContext.todayCarbs !== undefined) {
    contextParts.push(`Carbs today: ${sanitizeNumber(userContext.todayCarbs, 0, 0, 1000)}g / ${sanitizeNumber(userContext.carbsGoal, 0, 0, 1000)}g goal`);
  }
  if (userContext.todayFat !== undefined) {
    contextParts.push(`Fat today: ${sanitizeNumber(userContext.todayFat, 0, 0, 1000)}g / ${sanitizeNumber(userContext.fatGoal, 0, 0, 1000)}g goal`);
  }
  if (userContext.waterProgress) {
    contextParts.push(`Water: ${sanitizeString(userContext.waterProgress, 100)}`);
  }
  if (userContext.isFasting !== undefined) {
    contextParts.push(`Fasting: ${userContext.isFasting ? "Currently fasting" : "In eating window"}`);
    if (userContext.fastingProgress) contextParts.push(`Fasting progress: ${sanitizeString(userContext.fastingProgress, 100)}`);
  }
  if (userContext.streak) {
    contextParts.push(`Current streak: ${sanitizeNumber(userContext.streak, 0, 0, 10000)} days`);
  }
  if (userContext.totalXP) {
    contextParts.push(`Total XP: ${sanitizeNumber(userContext.totalXP, 0, 0, 1000000)}`);
  }

  const contextString = contextParts.length > 0
    ? `\n\nCURRENT USER DATA:\n${contextParts.join("\n")}`
    : "";

  const systemPrompt = `You are FuelIQ AI, a certified nutritionist and wellness coach built into the FuelIQ fitness app. You are friendly, knowledgeable, motivating, and concise.${contextString}

GUIDELINES:
- Give personalized advice based on the user's current data when available
- Keep responses concise (2-4 sentences for simple questions, more for detailed advice)
- If the user describes food they ate or want to eat, include a "foodItems" array in your JSON response with parsed nutritional estimates
- Always be encouraging and supportive
- Use metric or imperial based on what the user seems to prefer
- If you don't have enough context, ask clarifying questions
- Never give medical diagnoses or replace professional medical advice

RESPONSE FORMAT - Return ONLY valid JSON (no markdown, no code blocks):
{
  "reply": "Your conversational response here",
  "suggestions": ["Suggestion 1", "Suggestion 2", "Suggestion 3"],
  "foodItems": [
    {
      "name": "Food Name",
      "emoji": "🍳",
      "calories": 150,
      "protein": 12,
      "carbs": 1,
      "fat": 10,
      "serving": "2 large eggs"
    }
  ]
}

The "foodItems" array should ONLY be included if the user is describing food they ate, want to eat, or is asking about specific foods. Otherwise omit it or set it to an empty array.
The "suggestions" array should contain 2-3 short follow-up questions or topics the user might want to explore next.`;

  // Build multi-turn conversation for Gemini
  // Gemini requires strictly alternating user/model turns
  const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

  // Add conversation history (last 20 messages), merging consecutive same-role messages
  const recentHistory = conversationHistory.slice(-20);
  for (const msg of recentHistory) {
    const role = msg.role === "user" ? "user" : "model";
    const text = sanitizeString(msg.content, 2000);
    if (!text) continue;
    const last = contents[contents.length - 1];
    if (last && last.role === role) {
      // Merge consecutive same-role messages to maintain alternation
      last.parts[0].text += "\n" + text;
    } else {
      contents.push({ role, parts: [{ text }] });
    }
  }

  // Add current user message (merge if last was also user)
  const lastEntry = contents[contents.length - 1];
  if (lastEntry && lastEntry.role === "user") {
    lastEntry.parts[0].text += "\n" + sanitizedMessage;
  } else {
    contents.push({ role: "user", parts: [{ text: sanitizedMessage }] });
  }

  // Ensure first message is from user (Gemini requirement)
  if (contents.length > 0 && contents[0].role !== "user") {
    contents.shift();
  }

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 2048,
    },
    systemInstruction: systemPrompt,
  });

  const result = await withTimeout(model.generateContent({ contents }), GEMINI_TIMEOUT_MS, "Chat");
  const response = await result.response;
  const text = response.text();

  const parsed = safeParseJSON(text);

  // If we can't parse as JSON, still return the raw text as the reply
  if (!parsed) {
    return {
      reply: sanitizeString(text, 2000) || "I'm sorry, I had trouble processing that. Could you try again?",
      suggestions: ["Tell me about my macros", "What should I eat next?", "How's my progress?"],
      foodItems: [],
    };
  }

  // Sanitize food items if present
  const foodItems = Array.isArray(parsed.foodItems)
    ? parsed.foodItems.slice(0, 10).map((item: Record<string, unknown>) => ({
        name: sanitizeString(item?.name, 200) || "Unknown Food",
        emoji: sanitizeString(item?.emoji, 10) || "🍽️",
        calories: sanitizeNumber(item?.calories, 0, 0, 10000),
        protein: sanitizeNumber(item?.protein, 0, 0, 1000),
        carbs: sanitizeNumber(item?.carbs, 0, 0, 1000),
        fat: sanitizeNumber(item?.fat, 0, 0, 1000),
        serving: sanitizeString(item?.serving, 100) || "1 serving",
      }))
    : [];

  const suggestions = Array.isArray(parsed.suggestions)
    ? parsed.suggestions.slice(0, 5).map((s: unknown) => sanitizeString(s, 200)).filter(Boolean)
    : ["Tell me about my macros", "What should I eat next?", "How's my progress?"];

  return {
    reply: sanitizeString(parsed.reply, 3000) || "I'm here to help! What would you like to know?",
    suggestions,
    foodItems,
  };
}

/**
 * Parse Voice Food - Transcribe audio and extract food items
 */
async function handleParseVoiceFood(
  genAI: GoogleGenerativeAI,
  payload: {
    audioBase64: string;
    mimeType?: string;
  }
): Promise<Record<string, unknown>> {
  const { audioBase64, mimeType = "audio/mp4" } = payload;

  if (!audioBase64 || typeof audioBase64 !== "string") {
    throw new Error("No audio data provided.");
  }

  // Validate audio size (max 10MB)
  const estimatedSize = (audioBase64.length * 3) / 4;
  if (estimatedSize > MAX_IMAGE_SIZE) {
    throw new Error("Audio recording is too large. Please try a shorter recording.");
  }

  const validMimeTypes = ["audio/mp4", "audio/m4a", "audio/mpeg", "audio/wav", "audio/webm", "audio/ogg"];
  const safeMimeType = validMimeTypes.includes(mimeType) ? mimeType : "audio/mp4";

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 2048,
    },
  });

  const prompt = `You are a food logging assistant. Listen to this audio recording and:
1. Transcribe what the user said
2. Extract all food items mentioned with estimated nutritional info

Return ONLY valid JSON (no markdown, no code blocks):
{
  "transcript": "What the user said, transcribed accurately",
  "foods": [
    {
      "name": "Food Name",
      "emoji": "relevant food emoji",
      "calories": number,
      "protein": number (grams),
      "carbs": number (grams),
      "fat": number (grams),
      "serving": "serving size description"
    }
  ]
}

If you cannot understand the audio or no food is mentioned, return:
{
  "transcript": "best effort transcription or empty string",
  "foods": []
}

Estimate nutritional values for typical serving sizes. Be practical and reasonable with estimates.`;

  const audioPart = {
    inlineData: {
      data: audioBase64,
      mimeType: safeMimeType,
    },
  };

  const result = await withTimeout(model.generateContent([prompt, audioPart]), GEMINI_TIMEOUT_MS, "Voice");
  const response = await result.response;
  const text = response.text();

  const parsed = safeParseJSON(text);
  if (!parsed) {
    throw new Error("Could not process audio. Please try again or speak more clearly.");
  }

  const foods = Array.isArray(parsed.foods)
    ? parsed.foods.slice(0, 20).map((item: Record<string, unknown>) => ({
        name: sanitizeString(item?.name, 200) || "Unknown Food",
        emoji: sanitizeString(item?.emoji, 10) || "🍽️",
        calories: sanitizeNumber(item?.calories, 0, 0, 10000),
        protein: sanitizeNumber(item?.protein, 0, 0, 1000),
        carbs: sanitizeNumber(item?.carbs, 0, 0, 1000),
        fat: sanitizeNumber(item?.fat, 0, 0, 1000),
        serving: sanitizeString(item?.serving, 100) || "1 serving",
      }))
    : [];

  return {
    transcript: sanitizeString(parsed.transcript, 1000) || "",
    foods,
  };
}

/**
 * Weekly Digest - Generate personalized weekly coaching summary
 */
async function handleWeeklyDigest(
  genAI: GoogleGenerativeAI,
  payload: {
    weekData: {
      avgCalories?: number;
      calorieGoal?: number;
      avgProtein?: number;
      proteinGoal?: number;
      daysLogged?: number;
      totalDays?: number;
      weightStart?: number;
      weightCurrent?: number;
      currentStreak?: number;
      bestStreak?: number;
      avgEnergy?: number;
      topFoods?: string[];
    };
  }
): Promise<Record<string, unknown>> {
  const { weekData } = payload;

  if (!weekData || typeof weekData !== "object") {
    throw new Error("No weekly data available.");
  }

  const sanitized = {
    avgCalories: sanitizeNumber(weekData.avgCalories, 0, 0, 20000),
    calorieGoal: sanitizeNumber(weekData.calorieGoal, 2000, 0, 10000),
    avgProtein: sanitizeNumber(weekData.avgProtein, 0, 0, 1000),
    proteinGoal: sanitizeNumber(weekData.proteinGoal, 150, 0, 1000),
    daysLogged: sanitizeNumber(weekData.daysLogged, 0, 0, 7),
    totalDays: sanitizeNumber(weekData.totalDays, 7, 1, 7),
    weightStart: sanitizeNumber(weekData.weightStart, 0, 0, 1000),
    weightCurrent: sanitizeNumber(weekData.weightCurrent, 0, 0, 1000),
    currentStreak: sanitizeNumber(weekData.currentStreak, 0, 0, 10000),
    bestStreak: sanitizeNumber(weekData.bestStreak, 0, 0, 10000),
    avgEnergy: sanitizeNumber(weekData.avgEnergy, 0, 0, 10),
    topFoods: Array.isArray(weekData.topFoods)
      ? weekData.topFoods.slice(0, 10).map((f: unknown) => sanitizeString(f, 100)).filter(Boolean)
      : [],
  };

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 2048,
    },
  });

  const systemPrompt = "You are FuelIQ AI, analyzing a user's weekly fitness data. Generate a personalized coaching summary.";

  const prompt = `${systemPrompt}

Here is the user's weekly data:
${JSON.stringify(sanitized, null, 2)}

Based on this data, generate a motivational and insightful weekly coaching digest.

Return ONLY valid JSON (no markdown, no code blocks, just raw JSON) with this EXACT structure:
{
  "headline": "A short, punchy headline summarizing the week (max 60 chars)",
  "insights": [
    {
      "emoji": "relevant emoji",
      "title": "Short insight title",
      "body": "1-2 sentence actionable coaching insight",
      "type": "success" | "warning" | "tip"
    }
  ],
  "weeklyScore": number (1-100, based on consistency, goal adherence, and overall effort),
  "motivationalQuote": "A unique, relevant motivational quote or coaching message"
}

Guidelines:
- Provide 2-4 insights
- Use "success" type for things they did well
- Use "warning" type for areas needing improvement
- Use "tip" type for actionable advice
- The weeklyScore should reflect overall adherence: logging consistency, calorie/protein goal proximity, streak maintenance
- Be encouraging but honest
- Make the headline personal and specific to their data`;

  const result = await withTimeout(model.generateContent(prompt), GEMINI_TIMEOUT_MS, "Weekly Digest");
  const response = await result.response;
  const text = response.text();

  const parsed = safeParseJSON(text);
  if (!parsed) {
    throw new Error("Could not generate weekly digest. Please try again.");
  }

  const insights = Array.isArray(parsed.insights)
    ? parsed.insights.slice(0, 5).map((item: Record<string, unknown>) => ({
        emoji: sanitizeString(item?.emoji, 10) || "💡",
        title: sanitizeString(item?.title, 100) || "Insight",
        body: sanitizeString(item?.body, 300) || "",
        type: ["success", "warning", "tip"].includes(String(item?.type))
          ? item.type
          : "tip",
      }))
    : [];

  return {
    headline: sanitizeString(parsed.headline, 100) || "Your Weekly Summary",
    insights,
    weeklyScore: sanitizeNumber(parsed.weeklyScore, 50, 1, 100),
    motivationalQuote: sanitizeString(parsed.motivationalQuote, 300) || "Keep pushing forward!",
  };
}

/**
 * Meal Plan - Generate personalized multi-day meal plan
 */
async function handleMealPlan(
  genAI: GoogleGenerativeAI,
  payload: {
    calorieTarget?: number;
    proteinTarget?: number;
    carbsTarget?: number;
    fatTarget?: number;
    dietaryPreferences?: string[];
    allergies?: string[];
    goal?: string;
    daysCount?: number;
  }
): Promise<Record<string, unknown>> {
  const daysCount = sanitizeNumber(payload.daysCount, 3, 1, 7);
  const sanitizedParams = {
    calorieTarget: sanitizeNumber(payload.calorieTarget, 2000, 800, 10000),
    proteinTarget: sanitizeNumber(payload.proteinTarget, 150, 30, 500),
    carbsTarget: sanitizeNumber(payload.carbsTarget, 200, 20, 800),
    fatTarget: sanitizeNumber(payload.fatTarget, 65, 15, 300),
    dietaryPreferences: Array.isArray(payload.dietaryPreferences)
      ? payload.dietaryPreferences.slice(0, 10).map((d) => sanitizeString(d, 50))
      : [],
    allergies: Array.isArray(payload.allergies)
      ? payload.allergies.slice(0, 10).map((a) => sanitizeString(a, 50))
      : [],
    goal: ["lose", "maintain", "gain"].includes(String(payload.goal))
      ? payload.goal
      : "maintain",
    daysCount,
  };

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 4096,
    },
  });

  const dietaryNote = sanitizedParams.dietaryPreferences.length
    ? `Dietary preferences: ${sanitizedParams.dietaryPreferences.join(", ")}. All meals MUST comply with these preferences.`
    : "";

  const allergyNote = sanitizedParams.allergies.length
    ? `CRITICAL - Allergies: ${sanitizedParams.allergies.join(", ")}. NEVER include these allergens in any meal.`
    : "";

  const goalNote = sanitizedParams.goal === "lose"
    ? "Optimize for fat loss: high protein, moderate carbs, filling meals with high volume and fiber."
    : sanitizedParams.goal === "gain"
    ? "Optimize for muscle gain: high protein, higher carbs around training, calorie-dense meals."
    : "Optimize for balanced nutrition: moderate macros, variety, and sustainability.";

  const systemPrompt = "You are FuelIQ AI, a certified nutritionist. Generate a personalized meal plan based on the user's macro targets, dietary preferences, and fitness goals.";

  const prompt = `${systemPrompt}

Create a ${sanitizedParams.daysCount}-day meal plan with these daily targets:
- Calories: ${sanitizedParams.calorieTarget} kcal
- Protein: ${sanitizedParams.proteinTarget}g
- Carbs: ${sanitizedParams.carbsTarget}g
- Fat: ${sanitizedParams.fatTarget}g

Goal: ${sanitizedParams.goal}
${goalNote}

${dietaryNote}
${allergyNote}

Return ONLY a valid JSON object (no markdown, no code blocks, just raw JSON) with this EXACT structure:
{
  "days": [
    {
      "dayNumber": 1,
      "totalCalories": number,
      "totalProtein": number,
      "meals": [
        {
          "type": "breakfast" | "lunch" | "dinner" | "snack",
          "name": "Meal Name",
          "emoji": "relevant food emoji",
          "calories": number,
          "protein": number (grams),
          "carbs": number (grams),
          "fat": number (grams),
          "ingredients": ["ingredient 1", "ingredient 2"],
          "prepTime": "XX mins"
        }
      ]
    }
  ],
  "shoppingList": ["all unique ingredients needed across all days"],
  "coachNote": "Brief personalized coaching message about this meal plan"
}

Requirements:
- Each day MUST have breakfast, lunch, dinner, and 1-2 snacks
- Daily totals should be within 5% of the calorie target
- Protein should be distributed across all meals
- Include practical, easy-to-prepare meals
- Vary meals across days for variety
- Shopping list should be deduplicated and organized`;

  const result = await withTimeout(model.generateContent(prompt), GEMINI_TIMEOUT_MS, "Meal Plan");
  const response = await result.response;
  const text = response.text();

  const parsed = safeParseJSON(text);
  if (!parsed) {
    throw new Error("Could not generate meal plan. Please try again.");
  }

  if (!parsed.days || !Array.isArray(parsed.days) || parsed.days.length === 0) {
    throw new Error("Invalid meal plan structure generated. Please try again.");
  }

  const days = Array.isArray(parsed.days) ? parsed.days : [];
  const shoppingList = Array.isArray(parsed.shoppingList) ? parsed.shoppingList : [];

  return {
    days: days.slice(0, 7).map((day: Record<string, unknown>, dayIdx: number) => {
      const meals = Array.isArray(day?.meals) ? day.meals : [];
      return {
        dayNumber: sanitizeNumber(day?.dayNumber, dayIdx + 1, 1, 7),
        totalCalories: sanitizeNumber(day?.totalCalories, 0, 0, 20000),
        totalProtein: sanitizeNumber(day?.totalProtein, 0, 0, 1000),
        meals: meals.slice(0, 10).map((meal: Record<string, unknown>, mealIdx: number) => {
          const ingredients = Array.isArray(meal?.ingredients) ? meal.ingredients : [];
          return {
            type: ["breakfast", "lunch", "dinner", "snack"].includes(String(meal?.type))
              ? meal.type
              : "snack",
            name: sanitizeString(meal?.name, 200) || "Unnamed Meal",
            emoji: sanitizeString(meal?.emoji, 10) || "\uD83C\uDF7D\uFE0F",
            calories: sanitizeNumber(meal?.calories, 0, 0, 5000),
            protein: sanitizeNumber(meal?.protein, 0, 0, 500),
            carbs: sanitizeNumber(meal?.carbs, 0, 0, 500),
            fat: sanitizeNumber(meal?.fat, 0, 0, 500),
            ingredients: ingredients.slice(0, 20).map((i: unknown) => sanitizeString(i, 100)).filter(Boolean),
            prepTime: sanitizeString(meal?.prepTime, 30) || "15 mins",
          };
        }),
      };
    }),
    shoppingList: shoppingList.slice(0, 100).map((item: unknown) => sanitizeString(item, 100)).filter(Boolean),
    coachNote: sanitizeString(parsed.coachNote, 500) || "Your personalized meal plan is ready! Stay consistent and enjoy your meals.",
  };
}

/**
 * Morning Briefing - Generate personalized AI morning briefing
 */
async function handleMorningBriefing(
  genAI: GoogleGenerativeAI,
  payload: {
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
): Promise<Record<string, unknown>> {
  const sanitized = {
    userName: sanitizeString(payload.userName, 100) || "Champion",
    yesterdayCalories: sanitizeNumber(payload.yesterdayCalories, 0, 0, 20000),
    calorieGoal: sanitizeNumber(payload.calorieGoal, 2000, 0, 10000),
    yesterdayProtein: sanitizeNumber(payload.yesterdayProtein, 0, 0, 1000),
    proteinGoal: sanitizeNumber(payload.proteinGoal, 150, 0, 1000),
    currentStreak: sanitizeNumber(payload.currentStreak, 0, 0, 10000),
    weightTrend: sanitizeNumber(payload.weightTrend, 0, -50, 50),
    isFasting: !!payload.isFasting,
    fastDuration: sanitizeNumber(payload.fastDuration, 0, 0, 48),
    dietaryPreferences: Array.isArray(payload.dietaryPreferences)
      ? payload.dietaryPreferences.slice(0, 10).map((d: unknown) => sanitizeString(d, 50)).filter(Boolean)
      : [],
    goal: ["lose", "maintain", "gain"].includes(String(payload.goal))
      ? payload.goal
      : "maintain",
  };

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 2048,
    },
  });

  const systemPrompt = "You are FuelIQ AI, a certified nutritionist and fitness coach. Generate a personalized morning briefing to help the user start their day with focus and motivation.";

  const prompt = `${systemPrompt}

Here is the user's data:
${JSON.stringify(sanitized, null, 2)}

Based on this data, generate a personalized morning briefing.

Return ONLY valid JSON (no markdown, no code blocks, just raw JSON) with this EXACT structure:
{
  "greeting": "A warm, personalized greeting using the user's name and time-appropriate language",
  "headline": "A short, punchy headline summarizing their status (max 80 chars)",
  "insights": [
    {
      "emoji": "relevant emoji",
      "title": "Short insight title",
      "body": "1-2 sentence actionable insight based on their data"
    }
  ],
  "todayFocus": {
    "food": "One specific, actionable nutrition tip for today based on their goals and yesterday's performance",
    "workout": "One specific workout suggestion or active recovery tip for today"
  },
  "motivationalQuote": "A unique, relevant motivational quote or coaching message",
  "score": number (1-100 based on yesterday's performance)
}

Guidelines:
- Provide exactly 3 insights
- The score should reflect yesterday's adherence: calorie goal proximity, protein goal proximity, streak maintenance
  - If yesterdayCalories is 0 (no data logged), score should be between 30-50
  - If within 10% of calorie goal AND protein goal met, score 80-100
  - If within 20% of calorie goal, score 60-80
  - If over 20% off calorie goal, score 30-60
  - Add bonus points for streaks (up to +10 for 7+ day streaks)
- If the user is fasting, mention it in an insight and provide fasting-aware food tips
- If dietaryPreferences are provided, ensure food tips respect them
- Make the greeting warm and personal
- Make the headline specific to their data, not generic
- todayFocus food and workout tips should be concrete and actionable`;

  const result = await withTimeout(model.generateContent(prompt), GEMINI_TIMEOUT_MS, "Morning Briefing");
  const response = await result.response;
  const text = response.text();

  const parsed = safeParseJSON(text);
  if (!parsed) {
    throw new Error("Could not generate morning briefing. Please try again.");
  }

  const insights = Array.isArray(parsed.insights)
    ? parsed.insights.slice(0, 3).map((item: Record<string, unknown>) => ({
        emoji: sanitizeString(item?.emoji, 10) || "💡",
        title: sanitizeString(item?.title, 100) || "Insight",
        body: sanitizeString(item?.body, 300) || "",
      }))
    : [];

  const todayFocus = parsed.todayFocus && typeof parsed.todayFocus === "object"
    ? {
        food: sanitizeString((parsed.todayFocus as Record<string, unknown>).food, 300) || "Focus on hitting your protein goal today.",
        workout: sanitizeString((parsed.todayFocus as Record<string, unknown>).workout, 300) || "Stay active with at least 30 minutes of movement.",
      }
    : {
        food: "Focus on hitting your protein goal today.",
        workout: "Stay active with at least 30 minutes of movement.",
      };

  return {
    greeting: sanitizeString(parsed.greeting, 200) || `Good morning, ${sanitized.userName}!`,
    headline: sanitizeString(parsed.headline, 100) || "Ready to crush today!",
    insights,
    todayFocus,
    motivationalQuote: sanitizeString(parsed.motivationalQuote, 300) || "Every day is a new opportunity to be better than yesterday.",
    score: sanitizeNumber(parsed.score, 50, 1, 100),
  };
}

/**
 * Adaptive Macros - Analyze weekly data and recommend macro adjustments
 */
async function handleAdaptiveMacros(
  genAI: GoogleGenerativeAI,
  payload: {
    weekData: {
      currentCalories?: number;
      currentProtein?: number;
      currentCarbs?: number;
      currentFat?: number;
      avgCaloriesConsumed?: number;
      avgProteinConsumed?: number;
      avgCarbsConsumed?: number;
      avgFatConsumed?: number;
      adherencePercent?: number;
      weightTrend?: number;
      weightCurrent?: number;
      goal?: string;
      daysLogged?: number;
      avgEnergy?: number;
    };
  }
): Promise<Record<string, unknown>> {
  const { weekData } = payload;

  if (!weekData || typeof weekData !== "object") {
    throw new Error("No weekly data available for macro analysis.");
  }

  const sanitized = {
    currentCalories: sanitizeNumber(weekData.currentCalories, 2000, 800, 10000),
    currentProtein: sanitizeNumber(weekData.currentProtein, 150, 0, 1000),
    currentCarbs: sanitizeNumber(weekData.currentCarbs, 200, 0, 1000),
    currentFat: sanitizeNumber(weekData.currentFat, 65, 0, 500),
    avgCaloriesConsumed: sanitizeNumber(weekData.avgCaloriesConsumed, 0, 0, 20000),
    avgProteinConsumed: sanitizeNumber(weekData.avgProteinConsumed, 0, 0, 1000),
    avgCarbsConsumed: sanitizeNumber(weekData.avgCarbsConsumed, 0, 0, 1000),
    avgFatConsumed: sanitizeNumber(weekData.avgFatConsumed, 0, 0, 500),
    adherencePercent: sanitizeNumber(weekData.adherencePercent, 0, 0, 100),
    weightTrend: sanitizeNumber(weekData.weightTrend, 0, -50, 50),
    weightCurrent: sanitizeNumber(weekData.weightCurrent, 0, 0, 1000),
    goal: ["lose", "maintain", "gain"].includes(String(weekData.goal))
      ? weekData.goal
      : "maintain",
    daysLogged: sanitizeNumber(weekData.daysLogged, 0, 0, 7),
    avgEnergy: sanitizeNumber(weekData.avgEnergy, 0, 0, 10),
  };

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      temperature: 0.3,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 2048,
    },
  });

  const systemPrompt = "You are FuelIQ AI, a precision nutrition coach. Analyze this user's weekly data and recommend specific macro adjustments.";

  const prompt = `${systemPrompt}

Here is the user's weekly nutrition data:
${JSON.stringify(sanitized, null, 2)}

Based on this data, determine whether the user's macro targets should be adjusted.

Consider:
- If the user's goal is "lose" and weight trend is positive (gaining), they may need fewer calories
- If the user's goal is "gain" and weight trend is negative (losing), they may need more calories
- If adherence is below 70%, focus on realistic targets rather than large swings
- If fewer than 3 days were logged, do NOT recommend changes (insufficient data)
- Keep adjustments conservative: max 200 calories change per week
- Protein should stay at or above 1.6g per kg bodyweight
- Fat should not drop below 20% of total calories
- If energy levels are low (avgEnergy < 4), consider increasing carbs

Return ONLY valid JSON (no markdown, no code blocks, just raw JSON) with this EXACT structure:
{
  "shouldAdjust": boolean,
  "reason": "Why or why not to adjust",
  "newCalories": number,
  "newProtein": number,
  "newCarbs": number,
  "newFat": number,
  "calorieChange": number (positive or negative delta from current),
  "headline": "Short summary like 'Bump calories by 150'",
  "explanation": "2-3 sentence explanation of why this adjustment will help"
}

If shouldAdjust is false, set newCalories/newProtein/newCarbs/newFat to the current values and calorieChange to 0.`;

  const result = await withTimeout(model.generateContent(prompt), GEMINI_TIMEOUT_MS, "Adaptive Macros");
  const response = await result.response;
  const text = response.text();

  const parsed = safeParseJSON(text);
  if (!parsed) {
    throw new Error("Could not generate macro recommendation. Please try again.");
  }

  return {
    shouldAdjust: !!parsed.shouldAdjust,
    reason: sanitizeString(parsed.reason, 500) || "Unable to determine.",
    newCalories: sanitizeNumber(parsed.newCalories, sanitized.currentCalories, 800, 10000),
    newProtein: sanitizeNumber(parsed.newProtein, sanitized.currentProtein, 30, 500),
    newCarbs: sanitizeNumber(parsed.newCarbs, sanitized.currentCarbs, 20, 800),
    newFat: sanitizeNumber(parsed.newFat, sanitized.currentFat, 15, 300),
    calorieChange: sanitizeNumber(parsed.calorieChange, 0, -1000, 1000),
    headline: sanitizeString(parsed.headline, 100) || "No changes needed",
    explanation: sanitizeString(parsed.explanation, 500) || "Your current targets are working well.",
  };
}

/**
 * Recipe Import - Extract recipe from a URL and estimate nutrition
 */
async function handleRecipeImport(
  genAI: GoogleGenerativeAI,
  payload: { url: string }
): Promise<Record<string, unknown>> {
  const { url } = payload;

  if (!url || typeof url !== "string") {
    throw new Error("Please provide a valid recipe URL.");
  }

  const sanitizedUrl = sanitizeString(url.trim(), 2000);

  // Basic URL validation
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(sanitizedUrl);
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      throw new Error("Invalid URL protocol.");
    }
  } catch {
    throw new Error("Please provide a valid URL starting with http:// or https://.");
  }

  // Fetch the recipe page content so we can pass it to the model
  let pageContent = "";
  try {
    const fetchResponse = await withTimeout(
      fetch(parsedUrl.toString(), {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; FuelIQ/1.0; +https://fueliq.app)",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        redirect: "follow",
      }),
      10000,
      "Recipe Fetch"
    );
    if (!fetchResponse.ok) {
      throw new Error(`Failed to fetch recipe page (HTTP ${fetchResponse.status}).`);
    }
    const rawHtml = await fetchResponse.text();
    // Strip HTML tags, scripts, styles to get text content (keep structured data)
    pageContent = rawHtml
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 15000); // Limit to ~15K chars to fit in context
  } catch (fetchErr) {
    // If fetch fails, fall back to URL-only mode (Gemini may still recognise popular recipes)
    pageContent = "";
  }

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      temperature: 0.3,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 4096,
    },
  });

  const contentSection = pageContent
    ? `Here is the text content extracted from the recipe page at ${sanitizedUrl}:\n\n---\n${pageContent}\n---`
    : `Recipe URL: ${sanitizedUrl}\n\nNote: The page content could not be fetched. If you recognize this recipe from a well-known site, extract what you know. Otherwise return an error.`;

  const prompt = `You are a professional nutritionist and recipe analyst. Analyze and extract the complete recipe information from the content below.

${contentSection}

Your task:
1. Extract the recipe name, servings count, and all ingredients with their quantities and units from the page content.
2. For each ingredient, estimate the calories, protein, carbs, and fat based on standard nutritional databases.
3. Calculate the total nutrition for the entire recipe.

Return ONLY a valid JSON object (no markdown, no code blocks, just raw JSON) with this EXACT structure:
{
  "name": "Recipe Name",
  "emoji": "relevant food emoji",
  "servings": number,
  "ingredients": [
    {
      "name": "Ingredient Name",
      "quantity": "amount (e.g., '2', '1/2', '200')",
      "unit": "unit (e.g., 'cups', 'g', 'tbsp', 'whole')",
      "calories": number,
      "protein": number (grams),
      "carbs": number (grams),
      "fat": number (grams)
    }
  ],
  "totals": {
    "calories": number (sum of all ingredients),
    "protein": number (sum of all ingredients, grams),
    "carbs": number (sum of all ingredients, grams),
    "fat": number (sum of all ingredients, grams)
  }
}

Requirements:
- Extract the EXACT recipe name from the page
- Extract the EXACT serving count from the page (default to 4 if not specified)
- List ALL ingredients with accurate quantities and units
- Nutrition estimates should be based on standard USDA nutritional data
- The totals must be the sum of all individual ingredient values
- Use reasonable serving-size assumptions when the recipe is ambiguous
- If you cannot access or identify a recipe from this URL, return: { "error": "Could not extract a recipe from this URL." }`;

  const result = await withTimeout(model.generateContent(prompt), GEMINI_TIMEOUT_MS, "Recipe Import");
  const response = await result.response;
  const text = response.text();

  const parsed = safeParseJSON(text);
  if (!parsed) {
    throw new Error("Could not parse recipe data. Please try a different recipe URL.");
  }

  if (parsed.error) {
    throw new Error(sanitizeString(parsed.error) || "Could not extract a recipe from this URL.");
  }

  if (!parsed.name || !parsed.ingredients || !Array.isArray(parsed.ingredients) || parsed.ingredients.length === 0) {
    throw new Error("Could not identify a valid recipe from this URL. Please try a different recipe page.");
  }

  const ingredients = Array.isArray(parsed.ingredients) ? parsed.ingredients : [];
  const totals = parsed.totals && typeof parsed.totals === "object"
    ? parsed.totals as Record<string, unknown>
    : null;

  const sanitizedIngredients = ingredients.slice(0, 50).map((ing: Record<string, unknown>) => ({
    name: sanitizeString(ing?.name, 200) || "Unknown ingredient",
    quantity: sanitizeString(ing?.quantity, 50) || "1",
    unit: sanitizeString(ing?.unit, 30) || "",
    calories: sanitizeNumber(ing?.calories, 0, 0, 10000),
    protein: sanitizeNumber(ing?.protein, 0, 0, 1000),
    carbs: sanitizeNumber(ing?.carbs, 0, 0, 1000),
    fat: sanitizeNumber(ing?.fat, 0, 0, 1000),
  }));

  // Calculate totals from ingredients if not provided or invalid
  const calculatedTotals = sanitizedIngredients.reduce(
    (acc: Record<string, number>, ing: Record<string, number>) => ({
      calories: acc.calories + ing.calories,
      protein: acc.protein + ing.protein,
      carbs: acc.carbs + ing.carbs,
      fat: acc.fat + ing.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const finalTotals = totals
    ? {
        calories: sanitizeNumber(totals.calories, calculatedTotals.calories, 0, 100000),
        protein: sanitizeNumber(totals.protein, calculatedTotals.protein, 0, 10000),
        carbs: sanitizeNumber(totals.carbs, calculatedTotals.carbs, 0, 10000),
        fat: sanitizeNumber(totals.fat, calculatedTotals.fat, 0, 10000),
      }
    : calculatedTotals;

  return {
    name: sanitizeString(parsed.name, 300) || "Imported Recipe",
    emoji: sanitizeString(parsed.emoji, 10) || "\uD83C\uDF7D\uFE0F",
    servings: sanitizeNumber(parsed.servings, 4, 1, 100),
    ingredients: sanitizedIngredients,
    totals: finalTotals,
  };
}

/**
 * Food Swap - Suggest healthier or more goal-aligned food alternatives
 */
async function handleFoodSwap(
  genAI: GoogleGenerativeAI,
  payload: {
    foodName: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    servingSize?: string;
    goal?: string;
  }
): Promise<Record<string, unknown>> {
  const validGoals = ["lose", "maintain", "gain"];
  const sanitizedParams = {
    foodName: sanitizeString(payload.foodName, 200),
    calories: sanitizeNumber(payload.calories, 0, 0, 10000),
    protein: sanitizeNumber(payload.protein, 0, 0, 1000),
    carbs: sanitizeNumber(payload.carbs, 0, 0, 1000),
    fat: sanitizeNumber(payload.fat, 0, 0, 1000),
    servingSize: sanitizeString(payload.servingSize || "1 serving", 100),
    goal: validGoals.includes(String(payload.goal)) ? payload.goal : "maintain",
  };

  if (!sanitizedParams.foodName) {
    throw new Error("Please provide a food name to find swaps for.");
  }

  const goalDescriptions: Record<string, string> = {
    lose: "weight loss (lower calorie, higher protein, higher satiety)",
    maintain: "balanced nutrition (similar calories but better macro profile)",
    gain: "muscle gain (higher protein and calorie density)",
  };

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      temperature: 0.6,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 2048,
    },
  });

  const systemPrompt = "You are FuelIQ AI, a certified nutritionist. Given a food item, suggest 3 healthier or more goal-aligned alternatives. Each swap should be a realistic, commonly available food that someone could easily substitute. Focus on practical swaps that taste good and serve a similar role in a meal.";

  const prompt = `${systemPrompt}

The user's goal is: ${goalDescriptions[sanitizedParams.goal!]}

ORIGINAL FOOD:
- Name: ${sanitizedParams.foodName}
- Calories: ${sanitizedParams.calories} kcal
- Protein: ${sanitizedParams.protein}g
- Carbs: ${sanitizedParams.carbs}g
- Fat: ${sanitizedParams.fat}g
- Serving: ${sanitizedParams.servingSize}

Suggest 3 alternative foods that are better aligned with the user's goal. For each swap, provide equivalent serving sizes and accurate nutritional estimates.

Return ONLY a valid JSON object (no markdown, no code blocks, just raw JSON) with this EXACT structure:
{
  "originalFood": {
    "name": "${sanitizedParams.foodName}",
    "calories": ${sanitizedParams.calories},
    "protein": ${sanitizedParams.protein},
    "carbs": ${sanitizedParams.carbs},
    "fat": ${sanitizedParams.fat}
  },
  "swaps": [
    {
      "name": "Alternative Food Name",
      "emoji": "relevant food emoji",
      "calories": number,
      "protein": number (grams),
      "carbs": number (grams),
      "fat": number (grams),
      "serving": "equivalent serving size",
      "reason": "Why this is better (e.g. 'Higher protein, lower fat')",
      "improvement": "Short delta summary (e.g. '+12g protein, -8g fat')"
    }
  ],
  "tip": "A brief, actionable nutrition tip related to this food swap"
}

Requirements:
- Exactly 3 swaps
- Each swap must be a real, commonly available food
- Serving sizes should be comparable to the original
- reason should explain WHY this swap is better for the user's goal
- improvement should be a concise delta string showing key macro differences vs the original
- The tip should be specific and actionable`;

  const result = await withTimeout(model.generateContent(prompt), GEMINI_TIMEOUT_MS, "Food Swap");
  const response = await result.response;
  const text = response.text();

  const parsed = safeParseJSON(text);
  if (!parsed) {
    throw new Error("Could not generate food swap suggestions. Please try again.");
  }

  const swaps = Array.isArray(parsed.swaps) ? parsed.swaps : [];
  if (swaps.length === 0) {
    throw new Error("No swap suggestions were generated. Please try again.");
  }

  const originalFood = parsed.originalFood && typeof parsed.originalFood === "object"
    ? parsed.originalFood as Record<string, unknown>
    : {};

  return {
    originalFood: {
      name: sanitizeString(originalFood.name || sanitizedParams.foodName, 200),
      calories: sanitizeNumber(originalFood.calories || sanitizedParams.calories, 0, 0, 10000),
      protein: sanitizeNumber(originalFood.protein || sanitizedParams.protein, 0, 0, 1000),
      carbs: sanitizeNumber(originalFood.carbs || sanitizedParams.carbs, 0, 0, 1000),
      fat: sanitizeNumber(originalFood.fat || sanitizedParams.fat, 0, 0, 1000),
    },
    swaps: swaps.slice(0, 3).map((swap: Record<string, unknown>) => ({
      name: sanitizeString(swap?.name, 200) || "Alternative Food",
      emoji: sanitizeString(swap?.emoji, 10) || "\uD83C\uDF7D\uFE0F",
      calories: sanitizeNumber(swap?.calories, 0, 0, 10000),
      protein: sanitizeNumber(swap?.protein, 0, 0, 1000),
      carbs: sanitizeNumber(swap?.carbs, 0, 0, 1000),
      fat: sanitizeNumber(swap?.fat, 0, 0, 1000),
      serving: sanitizeString(swap?.serving, 100) || "1 serving",
      reason: sanitizeString(swap?.reason, 300) || "A healthier alternative",
      improvement: sanitizeString(swap?.improvement, 200) || "",
    })),
    tip: sanitizeString(parsed.tip, 500) || "Small swaps add up to big results over time!",
  };
}

/**
 * Meal Recommend - Suggest meals based on remaining macro budget
 */
async function handleMealRecommend(
  genAI: GoogleGenerativeAI,
  payload: {
    remainingCalories: number;
    remainingProtein: number;
    remainingCarbs: number;
    remainingFat: number;
    mealType: string;
    recentFoods?: string[];
    dietaryPreferences?: string[];
    goal?: string;
  }
): Promise<Record<string, unknown>> {
  const validMealTypes = ["breakfast", "lunch", "dinner", "snacks"];
  const validGoals = ["lose", "maintain", "gain"];

  const sanitizedParams = {
    remainingCalories: sanitizeNumber(payload.remainingCalories, 500, 0, 10000),
    remainingProtein: sanitizeNumber(payload.remainingProtein, 30, 0, 1000),
    remainingCarbs: sanitizeNumber(payload.remainingCarbs, 50, 0, 1000),
    remainingFat: sanitizeNumber(payload.remainingFat, 20, 0, 1000),
    mealType: validMealTypes.includes(String(payload.mealType)) ? payload.mealType : "lunch",
    recentFoods: Array.isArray(payload.recentFoods)
      ? payload.recentFoods.slice(0, 20).map((f: string) => sanitizeString(f, 100))
      : [],
    dietaryPreferences: Array.isArray(payload.dietaryPreferences)
      ? payload.dietaryPreferences.slice(0, 10).map((p: string) => sanitizeString(p, 50))
      : [],
    goal: validGoals.includes(String(payload.goal)) ? payload.goal : "maintain",
  };

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 2048,
    },
  });

  const goalDescriptions: Record<string, string> = {
    lose: "weight loss (prioritize high protein, high fiber, lower calorie density)",
    maintain: "weight maintenance (balanced and satisfying meals)",
    gain: "muscle gain (higher calories and protein)",
  };

  const recentFoodsNote = sanitizedParams.recentFoods.length > 0
    ? `\nThe user recently ate: ${sanitizedParams.recentFoods.join(", ")}. Suggest DIFFERENT foods to add variety.`
    : "";

  const dietaryNote = sanitizedParams.dietaryPreferences.length > 0
    ? `\nDietary preferences/restrictions: ${sanitizedParams.dietaryPreferences.join(", ")}.`
    : "";

  const prompt = `You are FuelIQ AI, a certified nutritionist. Suggest 3-4 meal ideas for ${sanitizedParams.mealType} that fit the user's remaining macro budget.

REMAINING MACROS FOR TODAY:
- Calories: ${sanitizedParams.remainingCalories} kcal
- Protein: ${sanitizedParams.remainingProtein}g
- Carbs: ${sanitizedParams.remainingCarbs}g
- Fat: ${sanitizedParams.remainingFat}g

Goal: ${goalDescriptions[sanitizedParams.goal]}${recentFoodsNote}${dietaryNote}

Return ONLY a valid JSON object (no markdown, no code blocks, just raw JSON) with this EXACT structure:
{
  "recommendations": [
    {
      "id": "unique-id",
      "name": "Meal Name",
      "emoji": "relevant food emoji",
      "calories": number,
      "protein": number (grams),
      "carbs": number (grams),
      "fat": number (grams),
      "prepTime": number (minutes, optional),
      "reason": "Brief explanation of why this fits (e.g., 'High protein to hit your target')"
    }
  ],
  "coachMessage": "A brief, encouraging message about their remaining budget and these suggestions"
}

Requirements:
- 3-4 recommendations that each fit within the remaining macro budget
- Each meal should be realistic, commonly available, and easy to prepare
- Nutrition values must be accurate based on standard USDA data
- Prioritize meals that help the user hit their remaining protein target
- The coachMessage should reference their specific remaining budget`;

  const result = await withTimeout(model.generateContent(prompt), GEMINI_TIMEOUT_MS, "Meal Recommend");
  const response = await result.response;
  const text = response.text();

  const parsed = safeParseJSON(text);
  if (!parsed) {
    throw new Error("Could not generate meal recommendations. Please try again.");
  }

  const recommendations = Array.isArray(parsed.recommendations) ? parsed.recommendations : [];

  return {
    recommendations: recommendations.slice(0, 4).map((rec: Record<string, unknown>, idx: number) => ({
      id: sanitizeString(rec?.id, 50) || `ai-rec-${idx}-${Date.now()}`,
      name: sanitizeString(rec?.name, 200) || "Recommended Meal",
      emoji: sanitizeString(rec?.emoji, 10) || "\uD83C\uDF7D\uFE0F",
      calories: sanitizeNumber(rec?.calories, 0, 0, 10000),
      protein: sanitizeNumber(rec?.protein, 0, 0, 1000),
      carbs: sanitizeNumber(rec?.carbs, 0, 0, 1000),
      fat: sanitizeNumber(rec?.fat, 0, 0, 1000),
      prepTime: rec?.prepTime ? sanitizeNumber(rec.prepTime, 0, 0, 480) : undefined,
      reason: sanitizeString(rec?.reason, 300) || "",
    })),
    coachMessage: sanitizeString(parsed.coachMessage, 500) || "Here are my top picks for you:",
  };
}

// ============================================================================
// RATE LIMITING (in-memory, per-isolate)
// ============================================================================

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 20; // 20 requests per minute per user

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }

  entry.count++;
  return true;
}

// Periodic cleanup to prevent memory growth (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap) {
    if (now > entry.resetAt) {
      rateLimitMap.delete(key);
    }
  }
}, 300_000);

// ============================================================================
// MAIN REQUEST HANDLER
// ============================================================================

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate user authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Service-role client for server-side operations (audit, nonce, rate limit)
    const serviceRoleKeyEarly = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabaseService = serviceRoleKeyEarly
      ? createClient(supabaseUrl, serviceRoleKeyEarly)
      : null;

    // Timestamp freshness validation (replay attack mitigation)
    const requestTimestamp = req.headers.get("x-fueliq-timestamp");
    const requestNonce = req.headers.get("x-fueliq-nonce");

    if (requestTimestamp) {
      const ts = parseInt(requestTimestamp, 10);
      if (isNaN(ts) || Math.abs(Date.now() - ts) > 5 * 60 * 1000) {
        // Log validation failure to audit
        if (supabaseService) {
          supabaseService.rpc("log_audit", {
            p_user_id: user.id,
            p_action: "auth_timestamp_expired",
            p_resource_type: "security",
            p_details: { timestamp: requestTimestamp, delta_ms: isNaN(ts) ? null : Math.abs(Date.now() - ts) },
          }).catch(() => {});
        }
        return new Response(
          JSON.stringify({ error: "Request expired" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      // Log missing signatures to track client adoption during rollout
      console.warn(`[AI Brain] Missing x-fueliq-timestamp header from user ${user.id}`);
      if (supabaseService) {
        supabaseService.rpc("log_audit", {
          p_user_id: user.id,
          p_action: "auth_missing_timestamp",
          p_resource_type: "security",
          p_details: { warning: "backwards_compat_allowed" },
        }).catch(() => {});
      }
    }

    // Nonce deduplication (replay prevention)
    if (requestNonce && supabaseService) {
      try {
        // Try to insert the nonce — if it already exists, it's a replay
        const { error: nonceError } = await supabaseService
          .from("request_nonces")
          .insert({ nonce: requestNonce, user_id: user.id });

        if (nonceError) {
          // Duplicate nonce — reject as replay
          supabaseService.rpc("log_audit", {
            p_user_id: user.id,
            p_action: "auth_nonce_replay",
            p_resource_type: "security",
            p_details: { nonce: requestNonce },
          }).catch(() => {});
          return new Response(
            JSON.stringify({ error: "Duplicate request detected" }),
            { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Periodic nonce cleanup (every 100th request)
        requestCounter++;
        if (requestCounter % 100 === 0) {
          supabaseService.rpc("cleanup_nonces").catch(() => {});
        }
      } catch {
        // If nonce check fails, allow through defensively but log
        console.warn(`[AI Brain] Nonce check failed for user ${user.id}`);
      }
    } else if (requestTimestamp && !requestNonce) {
      // Timestamp present but no nonce — log for monitoring
      console.warn(`[AI Brain] Missing x-fueliq-nonce header from user ${user.id}`);
    }

    // Parse request body early so we can check type for genesis exemption
    const { type, payload } = await req.json();
    const startTime = Date.now();

    // Premium AI usage limit check (genesis exempted for onboarding)
    if (supabaseService && type !== "genesis") {
      const { data: limitResult, error: limitError } = await supabaseService.rpc(
        "check_ai_premium_limit",
        { p_user_id: user.id }
      );
      const isPremium = !limitError && limitResult && limitResult.is_premium;
      if (!limitError && limitResult && limitResult.allowed === false) {
        return new Response(
          JSON.stringify({
            error: "Daily AI limit reached",
            upgrade_needed: !isPremium,
            limit: limitResult.limit,
            used: limitResult.used,
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Rate limit check
    if (!checkRateLimit(user.id)) {
      return new Response(
        JSON.stringify({ error: "Too many requests. Please wait a moment and try again." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get API key from environment (server-side secret)
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

    if (!GEMINI_API_KEY) {
      console.error("[AI Brain] GEMINI_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

    if (!type) {
      return new Response(
        JSON.stringify({ error: "Missing request type" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Server-side rate limit check (per-action limits via DB function)
    if (supabaseService) {
      try {
        const { data: rateCheck } = await supabaseService.rpc("check_rate_limit", {
          p_user_id: user.id,
          p_action: type,
          p_max_calls: 30,
          p_window_seconds: 60,
        });
        if (rateCheck && !rateCheck.allowed) {
          return new Response(
            JSON.stringify({ error: "Rate limit exceeded" }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } catch {
        // If rate limit check fails, allow through defensively
        console.warn(`[AI Brain] Server-side rate limit check failed for user ${user.id}`);
      }
    }

    // ---- Cache-aside lookup ----
    const ttl = CACHE_TTL[type] ?? 0;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    let cacheKey: string | null = null;
    let cacheHit = false;

    if (ttl > 0 && serviceRoleKey) {
      cacheKey = await makeCacheKey(type, payload);

      // Check cache
      const cached = await cacheGet(supabaseUrl, serviceRoleKey, cacheKey);
      if (cached) {
        // Fire-and-forget audit log for cached response
        if (supabaseService) {
          supabaseService.rpc("log_audit", {
            p_user_id: user.id,
            p_action: `ai_${type}`,
            p_resource_type: "ai_request",
            p_details: { type, cached: true, duration_ms: Date.now() - startTime },
          }).catch(() => {});
        }
        return new Response(JSON.stringify(cached), {
          headers: { ...corsHeaders, "Content-Type": "application/json", "X-Cache": "hit" },
        });
      }

      // In-flight dedup: if an identical request is already running, wait for it
      const pending = inflight.get(cacheKey);
      if (pending) {
        const deduped = await pending;
        return new Response(JSON.stringify(deduped), {
          headers: { ...corsHeaders, "Content-Type": "application/json", "X-Cache": "dedup" },
        });
      }
    }

    // Build a promise for the AI call so we can register it in the inflight map
    const aiCall = async (): Promise<Record<string, unknown>> => {
      // Route to appropriate handler
      switch (type) {
        case "scan-food":
          return await handleScanFood(genAI, payload);

        case "generate-workout":
          return await handleGenerateWorkout(genAI, payload);

        case "chef":
          return await handleChef(genAI, payload);

        case "genesis":
          return await handleGenesis(genAI, payload);

        case "chat":
          return await handleChat(genAI, payload);

        case "parse-voice-food":
          return await handleParseVoiceFood(genAI, payload);

        case "weekly-digest":
          return await handleWeeklyDigest(genAI, payload);

        case "adaptive-macros":
          return await handleAdaptiveMacros(genAI, payload);

        case "meal-plan":
          return await handleMealPlan(genAI, payload);

        case "morning-briefing":
          return await handleMorningBriefing(genAI, payload);

        case "food-swap":
          return await handleFoodSwap(genAI, payload);

        case "recipe-import":
          return await handleRecipeImport(genAI, payload);

        case "meal-recommend":
          return await handleMealRecommend(genAI, payload);

        default:
          throw new Error("__UNKNOWN_TYPE__");
      }
    };

    // Register in inflight map if cacheable
    let aiPromise: Promise<Record<string, unknown>>;
    if (cacheKey) {
      aiPromise = aiCall();
      inflight.set(cacheKey, aiPromise);
      aiPromise.finally(() => inflight.delete(cacheKey!));
    } else {
      aiPromise = aiCall();
    }

    let result: Record<string, unknown>;
    try {
      result = await aiPromise;
    } catch (err) {
      if (err instanceof Error && err.message === "__UNKNOWN_TYPE__") {
        return new Response(
          JSON.stringify({ error: "Unknown request type" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      throw err;
    }

    // Fire-and-forget cache write for cacheable types
    if (cacheKey && ttl > 0 && serviceRoleKey) {
      cacheSet(supabaseUrl, serviceRoleKey, cacheKey, type, result, ttl);
    }

    // Fire-and-forget audit log for successful AI request
    if (supabaseService) {
      supabaseService.rpc("log_audit", {
        p_user_id: user.id,
        p_action: `ai_${type}`,
        p_resource_type: "ai_request",
        p_details: { type, cached: false, duration_ms: Date.now() - startTime },
      }).catch(() => {});
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json", "X-Cache": "miss" },
    });
  } catch (error) {
    console.error("[AI Brain] Error:", error);

    const errorMessage = error instanceof Error ? error.message : "An error occurred";

    // Don't expose internal errors to client
    const clientMessage = errorMessage.includes("API") || errorMessage.includes("key")
      ? "AI service temporarily unavailable. Please try again later."
      : errorMessage;

    return new Response(
      JSON.stringify({ error: clientMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

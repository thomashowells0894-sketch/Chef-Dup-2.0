/**
 * FatSecret Platform API Service
 *
 * The world's largest food and nutrition database (~13M+ foods).
 * Covers branded products, generic foods, and restaurant items
 * across 80+ countries.
 *
 * Auth: OAuth 2.0 Client Credentials flow
 * Free tier: 5,000 calls/day (attribution required)
 * Premier Free: Available for startups <$1M revenue
 *
 * API docs: https://platform.fatsecret.com/platform-api
 */

import type { ProductResult, SearchResult, MicronutrientData } from './openFoodFacts';

const TOKEN_URL = 'https://oauth.fatsecret.com/connect/token';
const API_URL = 'https://platform.fatsecret.com/rest/server.api';

// Env variables for FatSecret credentials
const CLIENT_ID = process.env.EXPO_PUBLIC_FATSECRET_CLIENT_ID || '';
const CLIENT_SECRET = process.env.EXPO_PUBLIC_FATSECRET_CLIENT_SECRET || '';

// Token cache
let cachedToken: string | null = null;
let tokenExpiry = 0;

// Search cache
const CACHE_MAX = 50;
const CACHE_TTL = 5 * 60 * 1000;

interface CacheEntry {
  data: SearchResult;
  timestamp: number;
}

const searchCache = new Map<string, CacheEntry>();

// FatSecret API response types
interface FSServing {
  serving_id: string;
  serving_description: string;
  metric_serving_amount?: string;
  metric_serving_unit?: string;
  calories?: string;
  protein?: string;
  carbohydrate?: string;
  fat?: string;
  fiber?: string;
  sugar?: string;
  sodium?: string;
  saturated_fat?: string;
  trans_fat?: string;
  cholesterol?: string;
  calcium?: string;
  iron?: string;
  potassium?: string;
  vitamin_a?: string;
  vitamin_c?: string;
  vitamin_d?: string;
}

interface FSFood {
  food_id: string;
  food_name: string;
  food_type: string; // 'Brand' or 'Generic'
  food_url: string;
  brand_name?: string;
  servings?: {
    serving: FSServing | FSServing[];
  };
}

interface FSSearchResponse {
  foods_search?: {
    max_results: string;
    total_results: string;
    page_number: string;
    results?: {
      food: FSFood | FSFood[];
    };
  };
}

/**
 * Check if FatSecret API credentials are configured.
 */
export function isFatSecretConfigured(): boolean {
  return Boolean(CLIENT_ID && CLIENT_SECRET);
}

/**
 * Get an OAuth 2.0 access token using client credentials flow.
 * Tokens are cached until expiry.
 */
async function getAccessToken(): Promise<string> {
  // Return cached token if still valid (with 60s buffer)
  if (cachedToken && Date.now() < tokenExpiry - 60000) {
    return cachedToken;
  }

  const credentials = btoa(`${CLIENT_ID}:${CLIENT_SECRET}`);

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials&scope=basic',
  });

  if (!response.ok) {
    throw new Error(`FatSecret auth failed: ${response.status}`);
  }

  const data = await response.json();
  cachedToken = data.access_token;
  // Token typically expires in 86400s (24h), cache with buffer
  tokenExpiry = Date.now() + (data.expires_in || 86400) * 1000;

  return cachedToken!;
}

/**
 * Convert a FatSecret food item to our unified ProductResult format.
 */
function fsFoodToProduct(food: FSFood): ProductResult | null {
  // Get the first/default serving
  const servingsData = food.servings?.serving;
  let serving: FSServing | undefined;

  if (Array.isArray(servingsData)) {
    serving = servingsData[0];
  } else {
    serving = servingsData;
  }

  if (!serving) return null;

  const calories = Math.round(parseFloat(serving.calories || '0'));
  const protein = Math.round(parseFloat(serving.protein || '0'));
  const carbs = Math.round(parseFloat(serving.carbohydrate || '0'));
  const fat = Math.round(parseFloat(serving.fat || '0'));

  // Skip items with no calorie data
  if (calories === 0 && protein === 0 && carbs === 0 && fat === 0) return null;

  const metricAmount = parseFloat(serving.metric_serving_amount || '100');
  const metricUnit = (serving.metric_serving_unit || 'g').toLowerCase();

  // Extract micronutrients from serving data
  const micro: MicronutrientData = {};
  const parseMicro = (val: string | undefined): number | undefined => {
    if (val === undefined || val === null) return undefined;
    const num = parseFloat(val);
    return isNaN(num) ? undefined : Math.round(num * 100) / 100;
  };

  const fiberVal = parseMicro(serving.fiber);
  if (fiberVal !== undefined) micro.fiber = fiberVal;

  const sugarVal = parseMicro(serving.sugar);
  if (sugarVal !== undefined) micro.sugar = sugarVal;

  const sodiumVal = parseMicro(serving.sodium);
  if (sodiumVal !== undefined) micro.sodium = sodiumVal;

  const satFatVal = parseMicro(serving.saturated_fat);
  if (satFatVal !== undefined) micro.saturated_fat = satFatVal;

  const transFatVal = parseMicro(serving.trans_fat);
  if (transFatVal !== undefined) micro.trans_fat = transFatVal;

  const cholesterolVal = parseMicro(serving.cholesterol);
  if (cholesterolVal !== undefined) micro.cholesterol = cholesterolVal;

  const calciumVal = parseMicro(serving.calcium);
  if (calciumVal !== undefined) micro.calcium = calciumVal;

  const ironVal = parseMicro(serving.iron);
  if (ironVal !== undefined) micro.iron = ironVal;

  const potassiumVal = parseMicro(serving.potassium);
  if (potassiumVal !== undefined) micro.potassium = potassiumVal;

  const vitAVal = parseMicro(serving.vitamin_a);
  if (vitAVal !== undefined) micro.vitaminA = vitAVal;

  const vitCVal = parseMicro(serving.vitamin_c);
  if (vitCVal !== undefined) micro.vitaminC = vitCVal;

  const vitDVal = parseMicro(serving.vitamin_d);
  if (vitDVal !== undefined) micro.vitaminD = vitDVal;

  return {
    barcode: `fs-${food.food_id}`,
    name: food.brand_name
      ? `${food.food_name} (${food.brand_name})`
      : food.food_name,
    brand: food.brand_name || null,
    image: null, // FatSecret images require Premier subscription
    calories: Math.max(0, Math.min(5000, calories)),
    protein: Math.max(0, Math.min(500, protein)),
    carbs: Math.max(0, Math.min(1000, carbs)),
    fat: Math.max(0, Math.min(500, fat)),
    serving: serving.serving_description || `${metricAmount}${metricUnit}`,
    servingSize: metricAmount || 100,
    servingUnit: metricUnit,
    micronutrients: Object.keys(micro).length > 0 ? micro : undefined,
  };
}

/**
 * Search FatSecret's food database.
 *
 * @param query - Search terms
 * @param pageSize - Max results (max 50)
 * @param timeoutMs - Timeout in milliseconds
 * @returns Search results in unified format
 */
export async function searchFatSecret(
  query: string,
  pageSize: number = 25,
  timeoutMs: number = 5000,
): Promise<SearchResult> {
  // Skip if not configured
  if (!isFatSecretConfigured()) {
    return { products: [], count: 0 };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const sanitizedQuery = (query || '').trim().slice(0, 200);
    if (!sanitizedQuery) {
      clearTimeout(timeoutId);
      return { products: [], count: 0 };
    }

    // Check cache
    const cacheKey = `fs|${sanitizedQuery}|${pageSize}`;
    const cached = searchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      clearTimeout(timeoutId);
      return cached.data;
    }

    // Get access token
    const token = await getAccessToken();

    // Build form data for the search request
    const params = new URLSearchParams({
      method: 'foods.search.v4',
      search_expression: sanitizedQuery,
      max_results: Math.min(pageSize, 50).toString(),
      page_number: '0',
      format: 'json',
      flag_default_serving: 'true',
    });

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      // If auth expired, clear cached token and retry once
      if (response.status === 401) {
        cachedToken = null;
        tokenExpiry = 0;
      }
      throw new Error(`FatSecret API error: ${response.status}`);
    }

    const data: FSSearchResponse = await response.json();

    const foodsData = data.foods_search?.results?.food;
    let foods: FSFood[] = [];

    if (Array.isArray(foodsData)) {
      foods = foodsData;
    } else if (foodsData) {
      foods = [foodsData];
    }

    const products: ProductResult[] = foods
      .map(fsFoodToProduct)
      .filter((p): p is ProductResult => p !== null);

    const totalResults = parseInt(data.foods_search?.total_results || '0', 10);

    const result: SearchResult = {
      products,
      count: totalResults,
    };

    // Update cache
    if (searchCache.size >= CACHE_MAX) {
      searchCache.delete(searchCache.keys().next().value as string);
    }
    searchCache.set(cacheKey, { data: result, timestamp: Date.now() });

    return result;
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    if ((error as Error).name === 'AbortError') {
      if (__DEV__) console.warn('FatSecret search timed out');
    }
    throw error;
  }
}

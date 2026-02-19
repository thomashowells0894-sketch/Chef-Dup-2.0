/**
 * Nutritionix API v2 Service
 *
 * ~900K foods including restaurant chains, grocery brands,
 * and common/generic foods with detailed nutrition data.
 *
 * Auth: x-app-id + x-app-key headers
 * Pricing: Enterprise only ($1,850+/mo), no free tier
 * Only active when API credentials are provided.
 *
 * API docs: https://developer.nutritionix.com/docs/v2
 */

import { createPinnedFetch } from '../lib/certPinning';
import type { ProductResult, SearchResult, MicronutrientData } from './openFoodFacts';

const API_BASE = 'https://trackapi.nutritionix.com/v2';

const APP_ID = process.env.EXPO_PUBLIC_NUTRITIONIX_APP_ID || '';
const APP_KEY = process.env.EXPO_PUBLIC_NUTRITIONIX_APP_KEY || '';

const pinnedFetch = createPinnedFetch(fetch);

// Search cache
const CACHE_MAX = 50;
const CACHE_TTL = 5 * 60 * 1000;

interface CacheEntry {
  data: SearchResult;
  timestamp: number;
}

const searchCache = new Map<string, CacheEntry>();

// Nutritionix API response types
interface NixCommonFood {
  food_name: string;
  serving_unit: string;
  serving_qty: number;
  photo?: { thumb?: string };
  tag_name?: string;
  tag_id?: string;
  locale?: string;
}

interface NixBrandedFood {
  food_name: string;
  brand_name: string;
  brand_name_item_name: string;
  nix_brand_id: string;
  nix_item_id: string;
  serving_unit: string;
  serving_qty: number;
  nf_calories?: number;
  photo?: { thumb?: string };
  region?: number;
  locale?: string;
}

interface NixInstantResponse {
  common: NixCommonFood[];
  branded: NixBrandedFood[];
}

// Full nutrient response from /natural/nutrients
interface NixNutrientFood {
  food_name: string;
  brand_name?: string;
  serving_qty: number;
  serving_unit: string;
  serving_weight_grams: number;
  nf_calories: number;
  nf_total_fat: number;
  nf_total_carbohydrate: number;
  nf_protein: number;
  nf_dietary_fiber?: number;
  nf_sugars?: number;
  nf_sodium?: number;
  nf_saturated_fat?: number;
  nf_cholesterol?: number;
  nf_potassium?: number;
  nf_calcium?: number;
  nf_iron?: number;
  nf_vitamin_a_dv?: number;
  nf_vitamin_c_dv?: number;
  nf_vitamin_d?: number;
  photo?: { thumb?: string; highres?: string };
  nix_item_id?: string;
  nix_brand_id?: string;
  full_nutrients?: Array<{ attr_id: number; value: number }>;
}

interface NixNutrientsResponse {
  foods: NixNutrientFood[];
}

/**
 * Check if Nutritionix API credentials are configured.
 */
export function isNutritionixConfigured(): boolean {
  return Boolean(APP_ID && APP_KEY);
}

/**
 * Build auth headers for Nutritionix API.
 */
function authHeaders(): Record<string, string> {
  return {
    'x-app-id': APP_ID,
    'x-app-key': APP_KEY,
    'Content-Type': 'application/json',
  };
}

/**
 * Convert a Nutritionix branded food to our unified ProductResult format.
 */
function brandedToProduct(food: NixBrandedFood): ProductResult {
  return {
    barcode: `nix-${food.nix_item_id}`,
    name: food.brand_name_item_name || food.food_name,
    brand: food.brand_name || null,
    image: food.photo?.thumb || null,
    calories: Math.round(food.nf_calories || 0),
    protein: 0, // Instant search doesn't return full macros for branded
    carbs: 0,
    fat: 0,
    serving: `${food.serving_qty} ${food.serving_unit}`,
    servingSize: food.serving_qty || 1,
    servingUnit: food.serving_unit || 'serving',
  };
}

/**
 * Extract a full_nutrients attr_id value, returning undefined if not found.
 */
function getNixAttr(fullNutrients: Array<{ attr_id: number; value: number }> | undefined, attrId: number): number | undefined {
  if (!fullNutrients) return undefined;
  const entry = fullNutrients.find((n) => n.attr_id === attrId);
  return entry ? Math.round(entry.value * 100) / 100 : undefined;
}

/**
 * Convert a full nutrient food to our unified ProductResult format.
 */
function nutrientFoodToProduct(food: NixNutrientFood): ProductResult {
  // Build micronutrients from direct fields and full_nutrients array
  const micro: MicronutrientData = {};
  const fn = food.full_nutrients;

  if (food.nf_dietary_fiber != null) micro.fiber = Math.round(food.nf_dietary_fiber * 100) / 100;
  if (food.nf_sugars != null) micro.sugar = Math.round(food.nf_sugars * 100) / 100;
  // Nutritionix returns sodium in mg
  if (food.nf_sodium != null) micro.sodium = Math.round(food.nf_sodium * 100) / 100;
  if (food.nf_saturated_fat != null) micro.saturated_fat = Math.round(food.nf_saturated_fat * 100) / 100;
  if (food.nf_cholesterol != null) micro.cholesterol = Math.round(food.nf_cholesterol * 100) / 100;
  if (food.nf_potassium != null) micro.potassium = Math.round(food.nf_potassium * 100) / 100;

  // Additional micros from full_nutrients array (Nutritionix attr_ids)
  // attr 301 = calcium, 303 = iron, 304 = magnesium, 305 = phosphorus
  // attr 309 = zinc, 312 = copper, 315 = manganese, 317 = selenium
  // attr 320 = vitamin A RAE, 401 = vitamin C, 324 = vitamin D, 323 = vitamin E, 430 = vitamin K
  // attr 404 = thiamine(B1), 405 = riboflavin(B2), 406 = niacin(B3), 410 = pantothenic(B5)
  // attr 415 = B6, 417 = folate, 418 = B12, 291 = fiber (backup), 269 = sugar (backup)
  // attr 605 = trans fat
  const calciumVal = food.nf_calcium ?? getNixAttr(fn, 301);
  if (calciumVal !== undefined) micro.calcium = Math.round(calciumVal * 100) / 100;

  const ironVal = food.nf_iron ?? getNixAttr(fn, 303);
  if (ironVal !== undefined) micro.iron = Math.round(ironVal * 100) / 100;

  const magnesium = getNixAttr(fn, 304);
  if (magnesium !== undefined) micro.magnesium = magnesium;

  const phosphorus = getNixAttr(fn, 305);
  if (phosphorus !== undefined) micro.phosphorus = phosphorus;

  const zinc = getNixAttr(fn, 309);
  if (zinc !== undefined) micro.zinc = zinc;

  const copper = getNixAttr(fn, 312);
  if (copper !== undefined) micro.copper = copper;

  const manganese = getNixAttr(fn, 315);
  if (manganese !== undefined) micro.manganese = manganese;

  const selenium = getNixAttr(fn, 317);
  if (selenium !== undefined) micro.selenium = selenium;

  const vitaminA = getNixAttr(fn, 320);
  if (vitaminA !== undefined) micro.vitaminA = vitaminA;

  const vitaminC = getNixAttr(fn, 401);
  if (vitaminC !== undefined) micro.vitaminC = vitaminC;

  const vitaminD = food.nf_vitamin_d ?? getNixAttr(fn, 324);
  if (vitaminD !== undefined) micro.vitaminD = Math.round((vitaminD as number) * 100) / 100;

  const vitaminE = getNixAttr(fn, 323);
  if (vitaminE !== undefined) micro.vitaminE = vitaminE;

  const vitaminK = getNixAttr(fn, 430);
  if (vitaminK !== undefined) micro.vitaminK = vitaminK;

  const vitaminB1 = getNixAttr(fn, 404);
  if (vitaminB1 !== undefined) micro.vitaminB1 = vitaminB1;

  const vitaminB2 = getNixAttr(fn, 405);
  if (vitaminB2 !== undefined) micro.vitaminB2 = vitaminB2;

  const vitaminB3 = getNixAttr(fn, 406);
  if (vitaminB3 !== undefined) micro.vitaminB3 = vitaminB3;

  const vitaminB5 = getNixAttr(fn, 410);
  if (vitaminB5 !== undefined) micro.vitaminB5 = vitaminB5;

  const vitaminB6 = getNixAttr(fn, 415);
  if (vitaminB6 !== undefined) micro.vitaminB6 = vitaminB6;

  const folate = getNixAttr(fn, 417);
  if (folate !== undefined) micro.folate = folate;

  const vitaminB12 = getNixAttr(fn, 418);
  if (vitaminB12 !== undefined) micro.vitaminB12 = vitaminB12;

  const transFat = getNixAttr(fn, 605);
  if (transFat !== undefined) micro.trans_fat = transFat;

  return {
    barcode: food.nix_item_id ? `nix-${food.nix_item_id}` : `nix-${food.food_name.replace(/\s+/g, '-').toLowerCase()}`,
    name: food.brand_name
      ? `${food.food_name} (${food.brand_name})`
      : food.food_name.charAt(0).toUpperCase() + food.food_name.slice(1),
    brand: food.brand_name || null,
    image: food.photo?.thumb || null,
    calories: Math.max(0, Math.min(5000, Math.round(food.nf_calories || 0))),
    protein: Math.max(0, Math.min(500, Math.round(food.nf_protein || 0))),
    carbs: Math.max(0, Math.min(1000, Math.round(food.nf_total_carbohydrate || 0))),
    fat: Math.max(0, Math.min(500, Math.round(food.nf_total_fat || 0))),
    serving: `${food.serving_qty} ${food.serving_unit} (${Math.round(food.serving_weight_grams)}g)`,
    servingSize: food.serving_weight_grams || 100,
    servingUnit: 'g',
    micronutrients: Object.keys(micro).length > 0 ? micro : undefined,
  };
}

/**
 * Search Nutritionix using the instant search endpoint.
 * Returns both common and branded results.
 *
 * For common foods, we make a follow-up call to /natural/nutrients
 * to get full macro data (the instant endpoint only returns names).
 *
 * @param query - Search terms
 * @param maxResults - Max results per category (common + branded)
 * @param timeoutMs - Timeout in milliseconds
 * @returns Search results in unified format
 */
export async function searchNutritionix(
  query: string,
  maxResults: number = 10,
  timeoutMs: number = 5000,
): Promise<SearchResult> {
  // Skip if not configured
  if (!isNutritionixConfigured()) {
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
    const cacheKey = `nix|${sanitizedQuery}|${maxResults}`;
    const cached = searchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      clearTimeout(timeoutId);
      return cached.data;
    }

    // Step 1: Instant search for autocomplete results
    const instantResponse = await pinnedFetch(
      `${API_BASE}/search/instant?query=${encodeURIComponent(sanitizedQuery)}`,
      {
        headers: authHeaders(),
        signal: controller.signal,
      },
    );

    if (!instantResponse.ok) {
      throw new Error(`Nutritionix API error: ${instantResponse.status}`);
    }

    const instantData: NixInstantResponse = await instantResponse.json();

    // Step 2: Get full nutrients for top common foods
    const commonNames = (instantData.common || [])
      .slice(0, maxResults)
      .map((f) => f.food_name);

    let commonProducts: ProductResult[] = [];

    if (commonNames.length > 0) {
      try {
        const nutrientsResponse = await pinnedFetch(`${API_BASE}/natural/nutrients`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ query: commonNames.join(', ') }),
          signal: controller.signal,
        });

        if (nutrientsResponse.ok) {
          const nutrientsData: NixNutrientsResponse = await nutrientsResponse.json();
          commonProducts = (nutrientsData.foods || []).map(nutrientFoodToProduct);
        }
      } catch {
        // If nutrients lookup fails, skip common foods (branded still available)
      }
    }

    // Step 3: Convert branded results (they already have calorie data)
    const brandedProducts = (instantData.branded || [])
      .slice(0, maxResults)
      .map(brandedToProduct)
      .filter((p) => p.calories > 0);

    clearTimeout(timeoutId);

    const allProducts = [...commonProducts, ...brandedProducts];

    const result: SearchResult = {
      products: allProducts,
      count: allProducts.length,
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
      if (__DEV__) console.warn('Nutritionix search timed out');
    }
    throw error;
  }
}

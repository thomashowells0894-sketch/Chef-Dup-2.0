/**
 * USDA FoodData Central API Service
 *
 * Free API providing ~400K foods including:
 * - SR Legacy (USDA Standard Reference — generic/unbranded foods)
 * - Foundation Foods (detailed nutrient profiles)
 * - Branded Foods (commercial products with UPC codes)
 * - Survey Foods (FNDDS — What We Eat in America)
 *
 * Combined with Open Food Facts (~3M), this gives the app
 * coverage comparable to MyFitnessPal's database.
 *
 * API docs: https://fdc.nal.usda.gov/api-guide
 */

import { createPinnedFetch } from '../lib/certPinning';
import type { ProductResult, SearchResult, MicronutrientData } from './openFoodFacts';

const USDA_API_BASE = 'https://api.nal.usda.gov/fdc/v1';

// DEMO_KEY works but is rate-limited (30 req/hr, 50 req/day per IP).
// Users should get a free key at https://fdc.nal.usda.gov/api-key-signup
const API_KEY = process.env.EXPO_PUBLIC_USDA_API_KEY || 'DEMO_KEY';

const pinnedFetch = createPinnedFetch(fetch);

// In-memory cache to avoid duplicate API calls
const CACHE_MAX = 50;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  data: SearchResult;
  timestamp: number;
}

const searchCache = new Map<string, CacheEntry>();

// USDA API response types
interface USDANutrient {
  nutrientId: number;
  nutrientName: string;
  nutrientNumber: string;
  unitName: string;
  value: number;
}

interface USDAFood {
  fdcId: number;
  description: string;
  dataType: string;
  brandOwner?: string;
  brandName?: string;
  gtinUpc?: string;
  ingredients?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  householdServingFullText?: string;
  foodNutrients: USDANutrient[];
  foodCategory?: string;
  score?: number;
}

interface USDASearchResponse {
  totalHits: number;
  currentPage: number;
  totalPages: number;
  foods: USDAFood[];
}

// USDA nutrient IDs
const NUTRIENT_IDS = {
  ENERGY: 1008,       // Energy (kcal)
  PROTEIN: 1003,      // Protein (g)
  FAT: 1004,          // Total lipid/fat (g)
  CARBS: 1005,        // Carbohydrate, by difference (g)
  FIBER: 1079,        // Fiber, total dietary (g)
  SUGAR: 2000,        // Sugars, total (g)
  SODIUM: 1093,       // Sodium (mg)
  SATURATED_FAT: 1258, // Saturated fat (g)
  TRANS_FAT: 1257,    // Trans fat (g)
  CHOLESTEROL: 1253,  // Cholesterol (mg)
  CALCIUM: 1087,      // Calcium (mg)
  IRON: 1089,         // Iron (mg)
  MAGNESIUM: 1090,    // Magnesium (mg)
  PHOSPHORUS: 1091,   // Phosphorus (mg)
  POTASSIUM: 1092,    // Potassium (mg)
  ZINC: 1095,         // Zinc (mg)
  COPPER: 1098,       // Copper (mg)
  MANGANESE: 1101,    // Manganese (mg)
  SELENIUM: 1103,     // Selenium (mcg)
  VITAMIN_A: 1106,    // Vitamin A, RAE (mcg)
  VITAMIN_C: 1162,    // Vitamin C (mg)
  VITAMIN_D: 1114,    // Vitamin D (mcg)
  VITAMIN_E: 1109,    // Vitamin E (mg)
  VITAMIN_K: 1185,    // Vitamin K (mcg)
  THIAMINE: 1165,     // Thiamine / B1 (mg)
  RIBOFLAVIN: 1166,   // Riboflavin / B2 (mg)
  NIACIN: 1167,       // Niacin / B3 (mg)
  PANTOTHENIC: 1170,  // Pantothenic acid / B5 (mg)
  VITAMIN_B6: 1175,   // Vitamin B6 (mg)
  FOLATE: 1177,       // Folate (mcg)
  VITAMIN_B12: 1178,  // Vitamin B12 (mcg)
};

/**
 * Extract a specific nutrient value from the USDA food nutrients array
 */
function getNutrientValue(nutrients: USDANutrient[], nutrientId: number): number {
  const nutrient = nutrients.find((n) => n.nutrientId === nutrientId);
  return nutrient ? Math.round(nutrient.value) : 0;
}

/**
 * Extract a precise nutrient value (2 decimal places) for micronutrients.
 * Returns undefined if nutrient not found.
 */
function getMicroValue(nutrients: USDANutrient[], nutrientId: number): number | undefined {
  const nutrient = nutrients.find((n) => n.nutrientId === nutrientId);
  if (!nutrient || nutrient.value === undefined || nutrient.value === null) return undefined;
  return Math.round(nutrient.value * 100) / 100;
}

/**
 * Extract micronutrient data from USDA food nutrients array
 */
function extractUSDAMicronutrients(nutrients: USDANutrient[]): MicronutrientData {
  const micro: MicronutrientData = {};

  const fiber = getMicroValue(nutrients, NUTRIENT_IDS.FIBER);
  if (fiber !== undefined) micro.fiber = fiber;

  const sugar = getMicroValue(nutrients, NUTRIENT_IDS.SUGAR);
  if (sugar !== undefined) micro.sugar = sugar;

  const sodium = getMicroValue(nutrients, NUTRIENT_IDS.SODIUM);
  if (sodium !== undefined) micro.sodium = sodium;

  const saturated_fat = getMicroValue(nutrients, NUTRIENT_IDS.SATURATED_FAT);
  if (saturated_fat !== undefined) micro.saturated_fat = saturated_fat;

  const trans_fat = getMicroValue(nutrients, NUTRIENT_IDS.TRANS_FAT);
  if (trans_fat !== undefined) micro.trans_fat = trans_fat;

  const cholesterol = getMicroValue(nutrients, NUTRIENT_IDS.CHOLESTEROL);
  if (cholesterol !== undefined) micro.cholesterol = cholesterol;

  const calcium = getMicroValue(nutrients, NUTRIENT_IDS.CALCIUM);
  if (calcium !== undefined) micro.calcium = calcium;

  const iron = getMicroValue(nutrients, NUTRIENT_IDS.IRON);
  if (iron !== undefined) micro.iron = iron;

  const magnesium = getMicroValue(nutrients, NUTRIENT_IDS.MAGNESIUM);
  if (magnesium !== undefined) micro.magnesium = magnesium;

  const phosphorus = getMicroValue(nutrients, NUTRIENT_IDS.PHOSPHORUS);
  if (phosphorus !== undefined) micro.phosphorus = phosphorus;

  const potassium = getMicroValue(nutrients, NUTRIENT_IDS.POTASSIUM);
  if (potassium !== undefined) micro.potassium = potassium;

  const zinc = getMicroValue(nutrients, NUTRIENT_IDS.ZINC);
  if (zinc !== undefined) micro.zinc = zinc;

  const copper = getMicroValue(nutrients, NUTRIENT_IDS.COPPER);
  if (copper !== undefined) micro.copper = copper;

  const manganese = getMicroValue(nutrients, NUTRIENT_IDS.MANGANESE);
  if (manganese !== undefined) micro.manganese = manganese;

  const selenium = getMicroValue(nutrients, NUTRIENT_IDS.SELENIUM);
  if (selenium !== undefined) micro.selenium = selenium;

  const vitaminA = getMicroValue(nutrients, NUTRIENT_IDS.VITAMIN_A);
  if (vitaminA !== undefined) micro.vitaminA = vitaminA;

  const vitaminC = getMicroValue(nutrients, NUTRIENT_IDS.VITAMIN_C);
  if (vitaminC !== undefined) micro.vitaminC = vitaminC;

  const vitaminD = getMicroValue(nutrients, NUTRIENT_IDS.VITAMIN_D);
  if (vitaminD !== undefined) micro.vitaminD = vitaminD;

  const vitaminE = getMicroValue(nutrients, NUTRIENT_IDS.VITAMIN_E);
  if (vitaminE !== undefined) micro.vitaminE = vitaminE;

  const vitaminK = getMicroValue(nutrients, NUTRIENT_IDS.VITAMIN_K);
  if (vitaminK !== undefined) micro.vitaminK = vitaminK;

  const vitaminB1 = getMicroValue(nutrients, NUTRIENT_IDS.THIAMINE);
  if (vitaminB1 !== undefined) micro.vitaminB1 = vitaminB1;

  const vitaminB2 = getMicroValue(nutrients, NUTRIENT_IDS.RIBOFLAVIN);
  if (vitaminB2 !== undefined) micro.vitaminB2 = vitaminB2;

  const vitaminB3 = getMicroValue(nutrients, NUTRIENT_IDS.NIACIN);
  if (vitaminB3 !== undefined) micro.vitaminB3 = vitaminB3;

  const vitaminB5 = getMicroValue(nutrients, NUTRIENT_IDS.PANTOTHENIC);
  if (vitaminB5 !== undefined) micro.vitaminB5 = vitaminB5;

  const vitaminB6 = getMicroValue(nutrients, NUTRIENT_IDS.VITAMIN_B6);
  if (vitaminB6 !== undefined) micro.vitaminB6 = vitaminB6;

  const folate = getMicroValue(nutrients, NUTRIENT_IDS.FOLATE);
  if (folate !== undefined) micro.folate = folate;

  const vitaminB12 = getMicroValue(nutrients, NUTRIENT_IDS.VITAMIN_B12);
  if (vitaminB12 !== undefined) micro.vitaminB12 = vitaminB12;

  return micro;
}

/**
 * Convert a USDA food item to our unified ProductResult format
 */
function usdaFoodToProduct(food: USDAFood): ProductResult {
  const calories = getNutrientValue(food.foodNutrients, NUTRIENT_IDS.ENERGY);
  const protein = getNutrientValue(food.foodNutrients, NUTRIENT_IDS.PROTEIN);
  const carbs = getNutrientValue(food.foodNutrients, NUTRIENT_IDS.CARBS);
  const fat = getNutrientValue(food.foodNutrients, NUTRIENT_IDS.FAT);

  const brand = food.brandOwner || food.brandName || null;
  const servingSize = food.servingSize || 100;
  const servingUnit = (food.servingSizeUnit || 'g').toLowerCase();
  const servingText = food.householdServingFullText
    ? `${food.householdServingFullText} (${servingSize}${servingUnit})`
    : `${servingSize}${servingUnit}`;

  // Format name: clean up USDA all-caps descriptions
  let name = food.description;
  // USDA SR Legacy uses ALL CAPS — convert to title case
  if (name === name.toUpperCase() && name.length > 3) {
    name = name
      .toLowerCase()
      .replace(/(?:^|\s|,\s)\w/g, (match) => match.toUpperCase());
  }

  // Append brand if not already in name
  if (brand && !name.toLowerCase().includes(brand.toLowerCase())) {
    const primaryBrand = brand.split(',')[0].trim();
    if (primaryBrand.length < 40) {
      name = `${name} (${primaryBrand})`;
    }
  }

  const micronutrients = extractUSDAMicronutrients(food.foodNutrients);

  return {
    barcode: food.gtinUpc || `usda-${food.fdcId}`,
    name,
    brand,
    image: null, // USDA doesn't provide images
    calories: Math.max(0, Math.min(5000, calories)),
    protein: Math.max(0, Math.min(500, protein)),
    carbs: Math.max(0, Math.min(1000, carbs)),
    fat: Math.max(0, Math.min(500, fat)),
    serving: servingText,
    servingSize,
    servingUnit,
    micronutrients: Object.keys(micronutrients).length > 0 ? micronutrients : undefined,
  };
}

/**
 * Search USDA FoodData Central for foods matching a query.
 *
 * Searches across all data types (SR Legacy, Foundation, Branded, Survey)
 * for maximum coverage of both generic and branded foods.
 *
 * @param query - Search terms
 * @param pageSize - Number of results (default 25, max 50)
 * @param timeoutMs - Timeout in milliseconds (default 4000)
 * @returns Search results in our unified format
 */
export async function searchUSDA(
  query: string,
  pageSize: number = 25,
  timeoutMs: number = 4000,
): Promise<SearchResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const sanitizedQuery = (query || '').trim().slice(0, 200);
    if (!sanitizedQuery) {
      clearTimeout(timeoutId);
      return { products: [], count: 0 };
    }

    // Check cache
    const cacheKey = `usda|${sanitizedQuery}|${pageSize}`;
    const cached = searchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      clearTimeout(timeoutId);
      return cached.data;
    }

    const response = await pinnedFetch(`${USDA_API_BASE}/foods/search?api_key=${API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: sanitizedQuery,
        pageSize,
        pageNumber: 1,
        sortBy: 'dataType.keyword',
        sortOrder: 'asc',
        // Search all data types for maximum coverage
        dataType: ['SR Legacy', 'Foundation', 'Branded', 'Survey (FNDDS)'],
        // Request macros + micronutrients
        nutrientNumbers: [
          '1008', '1003', '1004', '1005', // energy, protein, fat, carbs
          '1079', '2000', '1093',          // fiber, sugar, sodium
          '1258', '1257', '1253',          // saturated fat, trans fat, cholesterol
          '1087', '1089', '1090', '1091', '1092', // calcium, iron, magnesium, phosphorus, potassium
          '1095', '1098', '1101', '1103',  // zinc, copper, manganese, selenium
          '1106', '1162', '1114', '1109', '1185', // vitamin A, C, D, E, K
          '1165', '1166', '1167', '1170',  // B1, B2, B3, B5
          '1175', '1177', '1178',          // B6, folate, B12
        ],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`USDA API error: ${response.status}`);
    }

    const data: USDASearchResponse = await response.json();

    const products: ProductResult[] = (data.foods || [])
      .filter((food) => {
        // Must have a name and at least calorie data
        if (!food.description) return false;
        const cal = getNutrientValue(food.foodNutrients, NUTRIENT_IDS.ENERGY);
        return cal > 0;
      })
      .map(usdaFoodToProduct);

    const result: SearchResult = {
      products,
      count: data.totalHits || 0,
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
      if (__DEV__) console.warn('USDA search timed out');
    }
    throw error;
  }
}

/**
 * Look up a specific food by its USDA FDC ID.
 * Useful for getting detailed nutrient profiles.
 */
export async function fetchUSDAFood(fdcId: number): Promise<ProductResult | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  try {
    const response = await pinnedFetch(
      `${USDA_API_BASE}/food/${fdcId}?api_key=${API_KEY}&nutrients=1008,1003,1004,1005,1079,2000,1093,1258,1257,1253,1087,1089,1090,1091,1092,1095,1098,1101,1103,1106,1162,1114,1109,1185,1165,1166,1167,1170,1175,1177,1178`,
      { signal: controller.signal },
    );

    clearTimeout(timeoutId);

    if (!response.ok) return null;

    const food: USDAFood = await response.json();
    if (!food || !food.description) return null;

    return usdaFoodToProduct(food);
  } catch {
    clearTimeout(timeoutId);
    return null;
  }
}

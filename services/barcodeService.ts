/**
 * Enhanced Barcode Lookup Service
 *
 * Multi-source barcode lookup with local caching and user contribution flow.
 *
 * Lookup chain:
 * 1. Local cache (instant, for re-scans)
 * 2. Open Food Facts API (3M+ products)
 * 3. USDA FoodData Central (branded products with UPC)
 * 4. Not-found flow (prompt user to submit nutrition info)
 *
 * Features:
 * - Barcode history cache in AsyncStorage for instant re-scan
 * - Multi-source fallback chain
 * - Scan confidence/match quality indicators
 * - "Not found" flow with user contribution support
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createPinnedFetch } from '../lib/certPinning';
import { getCachedBarcode as getFastCachedBarcode, setCachedBarcode as setFastCachedBarcode } from '../lib/barcodeCache';

const OFP_API_BASE: string = 'https://world.openfoodfacts.org/api/v2/product';
const USDA_API_BASE: string = 'https://api.nal.usda.gov/fdc/v1';
const USDA_API_KEY: string = process.env.EXPO_PUBLIC_USDA_API_KEY || 'DEMO_KEY';

const TIMEOUT_MS: number = 4000;
const BARCODE_CACHE_KEY = '@fueliq_barcode_cache';
const MAX_CACHED_BARCODES = 200;

// Use pinned fetch for all external API calls
const pinnedFetch = createPinnedFetch(fetch);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BarcodeMicronutrients {
  fiber?: number;
  sugar?: number;
  sodium?: number;
  saturated_fat?: number;
  trans_fat?: number;
  cholesterol?: number;
  calcium?: number;
  iron?: number;
  magnesium?: number;
  potassium?: number;
  zinc?: number;
  vitaminA?: number;
  vitaminC?: number;
  vitaminD?: number;
  vitaminE?: number;
  vitaminK?: number;
  vitaminB12?: number;
  folate?: number;
}

interface BarcodeFoodData {
  name: string;
  brand: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sodium: number;
  sugar: number;
  serving: string;
  image: string | null;
  barcode: string;
  micronutrients?: BarcodeMicronutrients;
}

export type ScanConfidence = 'high' | 'medium' | 'low' | 'not_found';

export interface BarcodeLookupResult {
  found: boolean;
  food?: BarcodeFoodData;
  /** Where the result came from */
  source?: 'cache' | 'openfoodfacts' | 'usda' | 'user_submitted';
  /** Scan confidence based on data completeness */
  confidence?: ScanConfidence;
  /** Whether this barcode was previously scanned */
  wasCached?: boolean;
}

interface CachedBarcode {
  food: BarcodeFoodData;
  source: string;
  cachedAt: number;
  scanCount: number;
}

interface BarcodeNutriments {
  'energy-kcal_100g'?: number;
  'energy-kcal'?: number;
  proteins_100g?: number;
  proteins?: number;
  carbohydrates_100g?: number;
  carbohydrates?: number;
  fat_100g?: number;
  fat?: number;
  fiber_100g?: number;
  sodium_100g?: number;
  sugars_100g?: number;
  [key: string]: unknown;
}

interface BarcodeProduct {
  product_name?: string;
  product_name_en?: string;
  brands?: string;
  serving_size?: string;
  image_front_url?: string;
  image_url?: string;
  nutriments?: BarcodeNutriments;
  [key: string]: unknown;
}

interface BarcodeApiResponse {
  status?: number;
  product?: BarcodeProduct;
}

// USDA types for barcode lookup
interface USDABrandedFood {
  fdcId: number;
  description: string;
  brandOwner?: string;
  brandName?: string;
  gtinUpc?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  householdServingFullText?: string;
  foodNutrients: Array<{
    nutrientId: number;
    nutrientName: string;
    value: number;
    unitName: string;
  }>;
}

interface USDASearchResponse {
  totalHits: number;
  foods: USDABrandedFood[];
}

// ---------------------------------------------------------------------------
// Local Barcode Cache
// ---------------------------------------------------------------------------

let _barcodeCache: Map<string, CachedBarcode> | null = null;

/**
 * Load the barcode cache from AsyncStorage.
 */
async function loadBarcodeCache(): Promise<Map<string, CachedBarcode>> {
  if (_barcodeCache) return _barcodeCache;

  try {
    const stored = await AsyncStorage.getItem(BARCODE_CACHE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (typeof parsed === 'object' && parsed !== null) {
        _barcodeCache = new Map(Object.entries(parsed));
        return _barcodeCache;
      }
    }
  } catch {
    // Silent fail
  }

  _barcodeCache = new Map();
  return _barcodeCache;
}

/**
 * Save a barcode lookup result to local cache for instant re-scan.
 */
async function cacheBarcodeResult(
  barcode: string,
  food: BarcodeFoodData,
  source: string,
): Promise<void> {
  const cache = await loadBarcodeCache();

  const existing = cache.get(barcode);
  cache.set(barcode, {
    food,
    source,
    cachedAt: Date.now(),
    scanCount: (existing?.scanCount || 0) + 1,
  });

  // Enforce max size -- remove oldest entries
  if (cache.size > MAX_CACHED_BARCODES) {
    const entries = Array.from(cache.entries())
      .sort((a, b) => a[1].cachedAt - b[1].cachedAt);
    const toRemove = entries.slice(0, cache.size - MAX_CACHED_BARCODES);
    for (const [key] of toRemove) {
      cache.delete(key);
    }
  }

  try {
    await AsyncStorage.setItem(
      BARCODE_CACHE_KEY,
      JSON.stringify(Object.fromEntries(cache)),
    );
  } catch {
    // Silent fail
  }
}

/**
 * Look up a barcode in local cache.
 */
async function lookupCachedBarcode(barcode: string): Promise<CachedBarcode | null> {
  const cache = await loadBarcodeCache();
  return cache.get(barcode) || null;
}

/**
 * Get the barcode scan history (most recently scanned first).
 */
export async function getBarcodeScanHistory(limit: number = 20): Promise<BarcodeFoodData[]> {
  const cache = await loadBarcodeCache();
  return Array.from(cache.values())
    .sort((a, b) => b.cachedAt - a.cachedAt)
    .slice(0, limit)
    .map((entry) => entry.food);
}

/**
 * Clear the barcode cache.
 */
export async function clearBarcodeCache(): Promise<void> {
  _barcodeCache = new Map();
  try {
    await AsyncStorage.removeItem(BARCODE_CACHE_KEY);
  } catch {
    // Silent fail
  }
}

// ---------------------------------------------------------------------------
// Confidence Scoring
// ---------------------------------------------------------------------------

/**
 * Calculate scan confidence based on data completeness.
 */
function calculateConfidence(food: BarcodeFoodData): ScanConfidence {
  let score = 0;

  if (food.name && food.name.length > 2) score += 2;
  if (food.brand && food.brand.length > 0) score += 1;
  if (food.calories > 0) score += 2;
  if (food.protein > 0) score += 1;
  if (food.carbs > 0) score += 1;
  if (food.fat > 0) score += 1;
  if (food.image) score += 1;
  if (food.serving && food.serving !== '100g') score += 1;

  if (score >= 8) return 'high';
  if (score >= 5) return 'medium';
  return 'low';
}

// ---------------------------------------------------------------------------
// Open Food Facts Lookup
// ---------------------------------------------------------------------------

async function lookupOFP(barcode: string): Promise<BarcodeFoodData | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response: Response = await pinnedFetch(`${OFP_API_BASE}/${barcode}.json`, {
      signal: controller.signal,
      headers: { 'User-Agent': 'FuelIQ/1.0 (fitness-app)' },
    });

    clearTimeout(timeoutId);

    if (!response.ok) return null;

    const data: BarcodeApiResponse = await response.json();

    if (!data || data.status !== 1 || !data.product) return null;

    const product: BarcodeProduct = data.product;
    const nutriments: BarcodeNutriments = product.nutriments || {};

    const name = product.product_name || product.product_name_en || '';
    if (!name) return null;

    // Extract micronutrients
    const micro: BarcodeMicronutrients = {};
    const getOpt = (key: string): number | undefined => {
      const val = (nutriments as Record<string, unknown>)[key];
      if (val === undefined || val === null) return undefined;
      const num = roundNum(val);
      return num > 0 ? num : undefined;
    };

    const fiberVal = roundNum(nutriments.fiber_100g ?? 0);
    if (fiberVal > 0) micro.fiber = fiberVal;

    const sugarVal = roundNum(nutriments.sugars_100g ?? 0);
    if (sugarVal > 0) micro.sugar = sugarVal;

    const sodiumVal = roundNum(nutriments.sodium_100g ?? 0);
    if (sodiumVal > 0) micro.sodium = sodiumVal;

    const satFat = getOpt('saturated-fat_100g');
    if (satFat !== undefined) micro.saturated_fat = satFat;

    const transFat = getOpt('trans-fat_100g');
    if (transFat !== undefined) micro.trans_fat = transFat;

    const cholesterol = getOpt('cholesterol_100g');
    if (cholesterol !== undefined) micro.cholesterol = cholesterol;

    const calcium = getOpt('calcium_100g');
    if (calcium !== undefined) micro.calcium = calcium;

    const iron = getOpt('iron_100g');
    if (iron !== undefined) micro.iron = iron;

    const magnesium = getOpt('magnesium_100g');
    if (magnesium !== undefined) micro.magnesium = magnesium;

    const potassium = getOpt('potassium_100g');
    if (potassium !== undefined) micro.potassium = potassium;

    const zinc = getOpt('zinc_100g');
    if (zinc !== undefined) micro.zinc = zinc;

    const vitaminA = getOpt('vitamin-a_100g');
    if (vitaminA !== undefined) micro.vitaminA = vitaminA;

    const vitaminC = getOpt('vitamin-c_100g');
    if (vitaminC !== undefined) micro.vitaminC = vitaminC;

    const vitaminD = getOpt('vitamin-d_100g');
    if (vitaminD !== undefined) micro.vitaminD = vitaminD;

    const vitaminE = getOpt('vitamin-e_100g');
    if (vitaminE !== undefined) micro.vitaminE = vitaminE;

    const vitaminK = getOpt('vitamin-k_100g');
    if (vitaminK !== undefined) micro.vitaminK = vitaminK;

    const vitaminB12 = getOpt('vitamin-b12_100g');
    if (vitaminB12 !== undefined) micro.vitaminB12 = vitaminB12;

    const folate = getOpt('vitamin-b9_100g');
    if (folate !== undefined) micro.folate = folate;

    return {
      name,
      brand: product.brands || '',
      calories: roundNum(nutriments['energy-kcal_100g'] ?? nutriments['energy-kcal'] ?? 0),
      protein: roundNum(nutriments.proteins_100g ?? nutriments.proteins ?? 0),
      carbs: roundNum(nutriments.carbohydrates_100g ?? nutriments.carbohydrates ?? 0),
      fat: roundNum(nutriments.fat_100g ?? nutriments.fat ?? 0),
      fiber: roundNum(nutriments.fiber_100g ?? 0),
      sodium: roundNum(nutriments.sodium_100g ?? 0),
      sugar: roundNum(nutriments.sugars_100g ?? 0),
      serving: product.serving_size || '100g',
      image: product.image_front_url || product.image_url || null,
      barcode,
      micronutrients: Object.keys(micro).length > 0 ? micro : undefined,
    };
  } catch {
    clearTimeout(timeoutId);
    return null;
  }
}

// ---------------------------------------------------------------------------
// USDA UPC Lookup
// ---------------------------------------------------------------------------

async function lookupUSDA(barcode: string): Promise<BarcodeFoodData | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    // USDA search supports UPC codes
    const response = await pinnedFetch(
      `${USDA_API_BASE}/foods/search?api_key=${USDA_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: barcode,
          dataType: ['Branded'],
          pageSize: 3,
        }),
        signal: controller.signal,
      },
    );

    clearTimeout(timeoutId);

    if (!response.ok) return null;

    const data: USDASearchResponse = await response.json();

    if (!data.foods || data.foods.length === 0) return null;

    // Find exact UPC match
    const match = data.foods.find(
      (f) => f.gtinUpc === barcode || f.gtinUpc === barcode.replace(/^0+/, ''),
    ) || data.foods[0];

    const getNutrient = (id: number): number => {
      const n = match.foodNutrients.find((f) => f.nutrientId === id);
      return n ? Math.round(n.value * 10) / 10 : 0;
    };

    const brand = match.brandOwner || match.brandName || '';
    const servingSize = match.servingSize || 100;
    const servingUnit = (match.servingSizeUnit || 'g').toLowerCase();
    const servingText = match.householdServingFullText
      ? `${match.householdServingFullText} (${servingSize}${servingUnit})`
      : `${servingSize}${servingUnit}`;

    let name = match.description;
    // USDA uses ALL CAPS -- convert to title case
    if (name === name.toUpperCase() && name.length > 3) {
      name = name
        .toLowerCase()
        .replace(/(?:^|\s|,\s)\w/g, (m) => m.toUpperCase());
    }

    return {
      name,
      brand,
      calories: getNutrient(1008),
      protein: getNutrient(1003),
      carbs: getNutrient(1005),
      fat: getNutrient(1004),
      fiber: getNutrient(1079),
      sodium: getNutrient(1093),
      sugar: getNutrient(2000),
      serving: servingText,
      image: null, // USDA doesn't provide images
      barcode,
    };
  } catch {
    clearTimeout(timeoutId);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Main Lookup (Multi-Source Chain)
// ---------------------------------------------------------------------------

/**
 * Look up a barcode using multi-source fallback chain:
 * 1. Local cache (instant)
 * 2. Open Food Facts
 * 3. USDA FoodData Central
 *
 * Results are cached locally for instant re-scan.
 *
 * @param barcode - EAN-13, EAN-8, UPC-A, or UPC-E barcode string
 * @returns Result with food data, source, and confidence
 */
export async function lookupBarcode(barcode: string): Promise<BarcodeLookupResult> {
  if (!barcode || typeof barcode !== 'string') {
    return { found: false, confidence: 'not_found' };
  }

  const cleanBarcode = barcode.replace(/[^0-9]/g, '').trim();
  if (!cleanBarcode) {
    return { found: false, confidence: 'not_found' };
  }

  // Step 0: Check fast in-memory barcode cache (instant, no deserialization)
  const fastCached = await getFastCachedBarcode(cleanBarcode);
  if (fastCached) {
    const fastFood: BarcodeFoodData = {
      name: fastCached.name,
      brand: fastCached.brand || '',
      calories: fastCached.calories,
      protein: fastCached.protein,
      carbs: fastCached.carbs,
      fat: fastCached.fat,
      fiber: 0,
      sodium: 0,
      sugar: 0,
      serving: fastCached.serving,
      image: null,
      barcode: cleanBarcode,
    };
    return {
      found: true,
      food: fastFood,
      source: 'cache',
      confidence: calculateConfidence(fastFood),
      wasCached: true,
    };
  }

  // Step 1: Check local cache (instant)
  const cached = await lookupCachedBarcode(cleanBarcode);
  if (cached) {
    // Update scan count
    cacheBarcodeResult(cleanBarcode, cached.food, cached.source).catch(() => {});
    return {
      found: true,
      food: cached.food,
      source: 'cache',
      confidence: calculateConfidence(cached.food),
      wasCached: true,
    };
  }

  // Step 2: Try Open Food Facts (largest product database)
  const ofpResult = await lookupOFP(cleanBarcode);
  if (ofpResult) {
    // Cache for future re-scans (both layers)
    cacheBarcodeResult(cleanBarcode, ofpResult, 'openfoodfacts').catch(() => {});
    setFastCachedBarcode(cleanBarcode, {
      name: ofpResult.name, calories: ofpResult.calories,
      protein: ofpResult.protein, carbs: ofpResult.carbs,
      fat: ofpResult.fat, serving: ofpResult.serving, brand: ofpResult.brand,
    }).catch(() => {});
    return {
      found: true,
      food: ofpResult,
      source: 'openfoodfacts',
      confidence: calculateConfidence(ofpResult),
      wasCached: false,
    };
  }

  // Step 3: Try USDA (has UPC data for US branded products)
  const usdaResult = await lookupUSDA(cleanBarcode);
  if (usdaResult) {
    cacheBarcodeResult(cleanBarcode, usdaResult, 'usda').catch(() => {});
    setFastCachedBarcode(cleanBarcode, {
      name: usdaResult.name, calories: usdaResult.calories,
      protein: usdaResult.protein, carbs: usdaResult.carbs,
      fat: usdaResult.fat, serving: usdaResult.serving, brand: usdaResult.brand,
    }).catch(() => {});
    return {
      found: true,
      food: usdaResult,
      source: 'usda',
      confidence: calculateConfidence(usdaResult),
      wasCached: false,
    };
  }

  // Not found in any source
  return {
    found: false,
    confidence: 'not_found',
    wasCached: false,
  };
}

/**
 * Submit user-provided nutrition data for an unknown barcode.
 * Stores it locally so future scans find it instantly.
 */
export async function submitBarcodeData(
  barcode: string,
  food: BarcodeFoodData,
): Promise<void> {
  await cacheBarcodeResult(barcode, food, 'user_submitted');
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Round a numeric value to one decimal place. Returns 0 for non-numeric input.
 */
function roundNum(value: unknown): number {
  const num: number = parseFloat(value as string);
  if (isNaN(num)) return 0;
  return Math.round(num * 10) / 10;
}

import { createPinnedFetch } from '../lib/certPinning';

const API_BASE: string = 'https://world.openfoodfacts.org/api/v0/product';
const SEARCH_API: string = 'https://world.openfoodfacts.org/cgi/search.pl';

// Use pinned fetch for all external API calls
const pinnedFetch = createPinnedFetch(fetch);

const SEARCH_CACHE_MAX: number = 50;
const SEARCH_CACHE_TTL: number = 5 * 60 * 1000;

interface CacheEntry {
  data: SearchResult;
  timestamp: number;
}

const searchCache: Map<string, CacheEntry> = new Map();

interface Nutriments {
  'energy-kcal_serving'?: number;
  'energy-kcal_100g'?: number;
  'energy-kcal'?: number;
  energy_100g?: number;
  proteins_100g?: number;
  proteins_serving?: number;
  carbohydrates_100g?: number;
  carbohydrates_serving?: number;
  fat_100g?: number;
  fat_serving?: number;
  [key: string]: unknown;
}

interface RawProduct {
  code?: string;
  _id?: string;
  product_name?: string;
  product_name_en?: string;
  brands?: string;
  serving_size?: string;
  nutrition_data_per?: string;
  nutriments?: Nutriments;
  image_front_small_url?: string;
  image_front_thumb_url?: string;
  image_url?: string;
  countries?: string;
  categories?: string;
  ingredients_text?: string;
  allergens?: string;
  nutriscore_grade?: string;
  status?: number;
  product?: RawProduct;
  [key: string]: unknown;
}

interface NutritionData {
  serving: string;
  servingSize: number;
  servingUnit: string;
  isPerServing: boolean;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
}

export interface MicronutrientData {
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
  copper?: number;
  manganese?: number;
  selenium?: number;
  phosphorus?: number;
  vitaminA?: number;
  vitaminC?: number;
  vitaminD?: number;
  vitaminE?: number;
  vitaminK?: number;
  vitaminB1?: number;
  vitaminB2?: number;
  vitaminB3?: number;
  vitaminB5?: number;
  vitaminB6?: number;
  vitaminB12?: number;
  folate?: number;
  choline?: number;
  omega3?: number;
  omega6?: number;
}

export interface ProductResult {
  barcode: string;
  name: string;
  brand: string | null;
  image: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  serving: string;
  servingSize: number;
  servingUnit: string;
  isPerServing?: boolean;
  isUK?: boolean;
  countries?: string;
  categories?: string;
  micronutrients?: MicronutrientData;
  raw?: {
    categories: string | undefined;
    ingredients: string | undefined;
    allergens: string | undefined;
    nutriscore: string | undefined;
  };
}

export interface SearchResult {
  products: ProductResult[];
  count: number;
  page?: number;
  pageSize?: number;
}

export interface FoodFromProduct {
  id: string;
  name: string;
  serving: string;
  servingSize: number;
  servingUnit: string;
  isPerServing: boolean;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  category: string;
  barcode: string;
  micronutrients?: MicronutrientData;
}

/**
 * Parse serving size string to extract numeric value
 * @param servingStr - Serving size string like "100g" or "1 cup (240g)"
 * @returns Numeric grams value
 */
function parseServingSize(servingStr: string | undefined): number {
  if (!servingStr) return 100;

  // Try to extract number followed by 'g'
  const gramMatch = servingStr.match(/(\d+(?:\.\d+)?)\s*g/i);
  if (gramMatch) {
    return parseFloat(gramMatch[1]);
  }

  // Try to extract any number
  const numMatch = servingStr.match(/(\d+(?:\.\d+)?)/);
  if (numMatch) {
    return parseFloat(numMatch[1]);
  }

  return 100;
}

/**
 * Extract nutrition data from a product
 * @param product - Raw product from API
 * @returns Normalized nutrition data
 */
function extractNutrition(product: RawProduct): NutritionData {
  const nutriments: Nutriments = product.nutriments || {};
  const servingSize: string = product.serving_size || '100g';
  const useServing: boolean = product.nutrition_data_per === 'serving';
  const servingSizeGrams: number = parseServingSize(servingSize);

  // Get calorie value
  let calories: number | null = null;
  if (useServing && nutriments['energy-kcal_serving']) {
    calories = Math.round(nutriments['energy-kcal_serving']);
  } else if (nutriments['energy-kcal_100g']) {
    calories = Math.round(nutriments['energy-kcal_100g']);
  } else if (nutriments['energy-kcal']) {
    calories = Math.round(nutriments['energy-kcal']);
  } else if (nutriments.energy_100g) {
    // Convert kJ to kcal (1 kcal = 4.184 kJ)
    calories = Math.round(nutriments.energy_100g / 4.184);
  }

  // Get macros
  const getNumericValue = (key: string, servingKey: string): number | null => {
    if (useServing && (nutriments as Record<string, unknown>)[servingKey] !== undefined) {
      return Math.round((nutriments as Record<string, unknown>)[servingKey] as number);
    }
    if ((nutriments as Record<string, unknown>)[key] !== undefined) {
      return Math.round((nutriments as Record<string, unknown>)[key] as number);
    }
    return null;
  };

  return {
    serving: useServing ? servingSize : '100g',
    servingSize: useServing ? servingSizeGrams : 100,
    servingUnit: 'g',
    isPerServing: useServing,
    calories,
    protein: getNumericValue('proteins_100g', 'proteins_serving'),
    carbs: getNumericValue('carbohydrates_100g', 'carbohydrates_serving'),
    fat: getNumericValue('fat_100g', 'fat_serving'),
  };
}

/**
 * Extract micronutrient data from OFP nutriments object.
 * Returns only fields with valid numeric values.
 */
function extractMicronutrients(nutriments: Nutriments, useServing: boolean): MicronutrientData {
  const getVal = (key100g: string, keyServing?: string): number | undefined => {
    let val: unknown;
    if (useServing && keyServing && (nutriments as Record<string, unknown>)[keyServing] !== undefined) {
      val = (nutriments as Record<string, unknown>)[keyServing];
    } else {
      val = (nutriments as Record<string, unknown>)[key100g];
    }
    const num = typeof val === 'number' ? val : parseFloat(val as string);
    return !isNaN(num) && num >= 0 ? Math.round(num * 100) / 100 : undefined;
  };

  const micro: MicronutrientData = {};

  const fiber = getVal('fiber_100g', 'fiber_serving');
  if (fiber !== undefined) micro.fiber = fiber;

  const sugar = getVal('sugars_100g', 'sugars_serving');
  if (sugar !== undefined) micro.sugar = sugar;

  const sodium = getVal('sodium_100g', 'sodium_serving');
  if (sodium !== undefined) micro.sodium = sodium;

  const saturated_fat = getVal('saturated-fat_100g', 'saturated-fat_serving');
  if (saturated_fat !== undefined) micro.saturated_fat = saturated_fat;

  const trans_fat = getVal('trans-fat_100g', 'trans-fat_serving');
  if (trans_fat !== undefined) micro.trans_fat = trans_fat;

  const cholesterol = getVal('cholesterol_100g', 'cholesterol_serving');
  if (cholesterol !== undefined) micro.cholesterol = cholesterol;

  const calcium = getVal('calcium_100g', 'calcium_serving');
  if (calcium !== undefined) micro.calcium = calcium;

  const iron = getVal('iron_100g', 'iron_serving');
  if (iron !== undefined) micro.iron = iron;

  const magnesium = getVal('magnesium_100g', 'magnesium_serving');
  if (magnesium !== undefined) micro.magnesium = magnesium;

  const potassium = getVal('potassium_100g', 'potassium_serving');
  if (potassium !== undefined) micro.potassium = potassium;

  const zinc = getVal('zinc_100g', 'zinc_serving');
  if (zinc !== undefined) micro.zinc = zinc;

  const copper = getVal('copper_100g', 'copper_serving');
  if (copper !== undefined) micro.copper = copper;

  const manganese = getVal('manganese_100g', 'manganese_serving');
  if (manganese !== undefined) micro.manganese = manganese;

  const selenium = getVal('selenium_100g', 'selenium_serving');
  if (selenium !== undefined) micro.selenium = selenium;

  const phosphorus = getVal('phosphorus_100g', 'phosphorus_serving');
  if (phosphorus !== undefined) micro.phosphorus = phosphorus;

  const vitaminA = getVal('vitamin-a_100g', 'vitamin-a_serving');
  if (vitaminA !== undefined) micro.vitaminA = vitaminA;

  const vitaminC = getVal('vitamin-c_100g', 'vitamin-c_serving');
  if (vitaminC !== undefined) micro.vitaminC = vitaminC;

  const vitaminD = getVal('vitamin-d_100g', 'vitamin-d_serving');
  if (vitaminD !== undefined) micro.vitaminD = vitaminD;

  const vitaminE = getVal('vitamin-e_100g', 'vitamin-e_serving');
  if (vitaminE !== undefined) micro.vitaminE = vitaminE;

  const vitaminK = getVal('vitamin-k_100g', 'vitamin-k_serving');
  if (vitaminK !== undefined) micro.vitaminK = vitaminK;

  const vitaminB1 = getVal('vitamin-b1_100g', 'vitamin-b1_serving');
  if (vitaminB1 !== undefined) micro.vitaminB1 = vitaminB1;

  const vitaminB2 = getVal('vitamin-b2_100g', 'vitamin-b2_serving');
  if (vitaminB2 !== undefined) micro.vitaminB2 = vitaminB2;

  const vitaminB3 = getVal('vitamin-pp_100g', 'vitamin-pp_serving');
  if (vitaminB3 !== undefined) micro.vitaminB3 = vitaminB3;

  const vitaminB5 = getVal('pantothenic-acid_100g', 'pantothenic-acid_serving');
  if (vitaminB5 !== undefined) micro.vitaminB5 = vitaminB5;

  const vitaminB6 = getVal('vitamin-b6_100g', 'vitamin-b6_serving');
  if (vitaminB6 !== undefined) micro.vitaminB6 = vitaminB6;

  const vitaminB12 = getVal('vitamin-b12_100g', 'vitamin-b12_serving');
  if (vitaminB12 !== undefined) micro.vitaminB12 = vitaminB12;

  const folate = getVal('vitamin-b9_100g', 'vitamin-b9_serving');
  if (folate !== undefined) micro.folate = folate;

  const omega3 = getVal('omega-3-fat_100g', 'omega-3-fat_serving');
  if (omega3 !== undefined) micro.omega3 = omega3;

  const omega6 = getVal('omega-6-fat_100g', 'omega-6-fat_serving');
  if (omega6 !== undefined) micro.omega6 = omega6;

  // Only return if there's at least one value
  return Object.keys(micro).length > 0 ? micro : {};
}

/**
 * Format product name with brand (e.g., "Oats (Quaker)")
 * @param product - Raw product from API
 * @returns Formatted name
 */
function formatProductName(product: RawProduct): string {
  const name: string = product.product_name || product.product_name_en || 'Unknown Product';
  const brand: string | undefined = product.brands;

  // If brand exists and isn't already in the name, append it
  if (brand && !name.toLowerCase().includes(brand.toLowerCase())) {
    // Take first brand if multiple (comma-separated)
    const primaryBrand: string = brand.split(',')[0].trim();
    return `${name} (${primaryBrand})`;
  }

  return name;
}

/**
 * Search products by text query
 * @param query - Search terms
 * @param page - Page number (default 1)
 * @param pageSize - Results per page (default 20)
 * @returns Search results with products array
 */
export async function searchProducts(query: string, page: number = 1, pageSize: number = 20): Promise<SearchResult> {
  const controller = new AbortController();
  const timeoutId: ReturnType<typeof setTimeout> = setTimeout(() => controller.abort(), 3000);

  try {
    const sanitizedQuery: string = (query || '').trim().slice(0, 200);
    if (!sanitizedQuery) {
      clearTimeout(timeoutId);
      return { products: [], count: 0 };
    }

    const cacheKey: string = `${sanitizedQuery}|${page}|${pageSize}`;
    const cached: CacheEntry | undefined = searchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < SEARCH_CACHE_TTL) {
      clearTimeout(timeoutId);
      searchCache.delete(cacheKey);
      searchCache.set(cacheKey, cached);
      return cached.data;
    }

    // Search without restrictive filters to get more UK/international brands
    const params = new URLSearchParams({
      search_terms: sanitizedQuery,
      search_simple: '1',
      action: 'process',
      json: '1',
      page: page.toString(),
      page_size: pageSize.toString(),
      // Sort by popularity/scans for better results
      sort_by: 'unique_scans_n',
    });

    const response: Response = await pinnedFetch(`${SEARCH_API}?${params}`, {
      headers: {
        'User-Agent': 'FuelIQ/1.0.0 (https://fueliq.app)',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const data = await response.json();

    // Clamp nutrition value to sane range (prevents data poisoning from malformed API data)
    const clampNutrition = (value: number, max: number): number =>
      Math.max(0, Math.min(max, Math.round(value || 0)));

    // Filter and map products
    const products: ProductResult[] = (data.products || [])
      .filter((product: RawProduct) => {
        // Only include products with at least a name
        return product.product_name || product.product_name_en;
      })
      .map((product: RawProduct) => {
        const nutrition: NutritionData = extractNutrition(product);
        const nutriments: Nutriments = product.nutriments || {};

        const rawCalories = nutrition.calories ?? Math.round(nutriments['energy-kcal_100g'] || 0);
        const rawProtein = nutrition.protein ?? Math.round(nutriments.proteins_100g || 0);
        const rawCarbs = nutrition.carbs ?? Math.round(nutriments.carbohydrates_100g || 0);
        const rawFat = nutrition.fat ?? Math.round(nutriments.fat_100g || 0);

        const micronutrients = extractMicronutrients(nutriments, nutrition.isPerServing);

        return {
          barcode: product.code || product._id || '',
          name: formatProductName(product),
          brand: product.brands || null,
          image: product.image_front_small_url || product.image_front_thumb_url || null,
          // Clamp values to prevent absurd entries (max per-serving bounds)
          calories: clampNutrition(rawCalories, 5000),
          protein: clampNutrition(rawProtein, 500),
          carbs: clampNutrition(rawCarbs, 1000),
          fat: clampNutrition(rawFat, 500),
          serving: nutrition.serving,
          servingSize: nutrition.servingSize,
          servingUnit: nutrition.servingUnit,
          isPerServing: nutrition.isPerServing,
          // Micronutrients
          micronutrients: Object.keys(micronutrients).length > 0 ? micronutrients : undefined,
          // Additional metadata
          countries: product.countries,
          categories: product.categories,
        };
      });

    const result: SearchResult = {
      products,
      count: data.count || 0,
      page: data.page || 1,
      pageSize: data.page_size || pageSize,
    };

    if (searchCache.size >= SEARCH_CACHE_MAX) {
      searchCache.delete(searchCache.keys().next().value as string);
    }
    searchCache.set(cacheKey, { data: result, timestamp: Date.now() });

    return result;
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    if ((error as Error).name === 'AbortError') {
      throw new Error('Search timed out. Please try again.');
    }
    if (__DEV__) console.error('OpenFoodFacts search error:', error);
    throw error;
  }
}

/**
 * Search products globally (US + UK + EU)
 * Uses the world endpoint for maximum coverage
 * @param query - Search terms
 * @param pageSize - Results per page
 * @param timeoutMs - Timeout in milliseconds
 * @returns Search results
 */
export async function searchProductsGlobal(query: string, pageSize: number = 25, timeoutMs: number = 8000): Promise<SearchResult> {
  const controller = new AbortController();
  const timeoutId: ReturnType<typeof setTimeout> = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const params = new URLSearchParams({
      search_terms: query,
      search_simple: '1',
      action: 'process',
      json: '1',
      page_size: pageSize.toString(),
      sort_by: 'unique_scans_n', // Most popular first
    });

    const response: Response = await pinnedFetch(`${SEARCH_API}?${params}`, {
      headers: { 'User-Agent': 'FuelIQ/1.0.0 (https://fueliq.app)' },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const data = await response.json();

    const products: ProductResult[] = (data.products || [])
      .filter((p: RawProduct) => p.product_name || p.product_name_en)
      .map((product: RawProduct) => {
        const nutriments: Nutriments = product.nutriments || {};
        const nutrition: NutritionData = extractNutrition(product);

        const micronutrients = extractMicronutrients(nutriments, nutrition.isPerServing);

        return {
          barcode: product.code || product._id || '',
          name: formatProductName(product),
          brand: product.brands || null,
          image: product.image_front_small_url || product.image_front_thumb_url || null,
          // Map nutrients with safe defaults
          calories: nutrition.calories ?? Math.round(nutriments['energy-kcal_100g'] || 0),
          protein: nutrition.protein ?? Math.round(nutriments.proteins_100g || 0),
          carbs: nutrition.carbs ?? Math.round(nutriments.carbohydrates_100g || 0),
          fat: nutrition.fat ?? Math.round(nutriments.fat_100g || 0),
          // Include serving size string for US users (e.g., "1 cup (240ml)")
          serving: product.serving_size || nutrition.serving || '100g',
          servingSize: nutrition.servingSize,
          servingUnit: nutrition.servingUnit,
          // Micronutrients
          micronutrients: Object.keys(micronutrients).length > 0 ? micronutrients : undefined,
          // Additional metadata
          countries: product.countries,
        };
      });

    return { products, count: data.count || 0 };
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    if ((error as Error).name === 'AbortError') {
      if (__DEV__) console.warn('OpenFoodFacts search timed out');
    }
    throw error;
  }
}

/**
 * Search products with UK preference
 * Falls back to global search if UK search returns few results
 * @param query - Search terms
 * @param pageSize - Results per page
 * @returns Combined search results
 */
export async function searchProductsWithUKPreference(query: string, pageSize: number = 25): Promise<SearchResult> {
  try {
    // Try UK-specific search first
    const ukParams = new URLSearchParams({
      search_terms: query,
      search_simple: '1',
      action: 'process',
      json: '1',
      page_size: Math.ceil(pageSize / 2).toString(),
      tagtype_0: 'countries',
      tag_contains_0: 'contains',
      tag_0: 'united-kingdom',
      sort_by: 'unique_scans_n',
    });

    const globalParams = new URLSearchParams({
      search_terms: query,
      search_simple: '1',
      action: 'process',
      json: '1',
      page_size: pageSize.toString(),
      sort_by: 'unique_scans_n',
    });

    // Fetch both UK and global results in parallel
    const [ukResponse, globalResponse] = await Promise.all([
      fetch(`${SEARCH_API}?${ukParams}`, {
        headers: { 'User-Agent': 'FuelIQ/1.0.0 (https://fueliq.app)' },
      }).catch(() => null),
      fetch(`${SEARCH_API}?${globalParams}`, {
        headers: { 'User-Agent': 'FuelIQ/1.0.0 (https://fueliq.app)' },
      }),
    ]);

    let ukProducts: ProductResult[] = [];
    if (ukResponse && ukResponse.ok) {
      const ukData = await ukResponse.json();
      ukProducts = (ukData.products || [])
        .filter((p: RawProduct) => p.product_name || p.product_name_en)
        .map((product: RawProduct) => {
          const nutrition: NutritionData = extractNutrition(product);
          const nutriments: Nutriments = product.nutriments || {};
          const micronutrients = extractMicronutrients(nutriments, nutrition.isPerServing);
          return {
            barcode: product.code || product._id || '',
            name: formatProductName(product),
            brand: product.brands || null,
            image: product.image_front_small_url || null,
            calories: nutrition.calories ?? Math.round(nutriments['energy-kcal_100g'] || 0),
            protein: nutrition.protein ?? Math.round(nutriments.proteins_100g || 0),
            carbs: nutrition.carbs ?? Math.round(nutriments.carbohydrates_100g || 0),
            fat: nutrition.fat ?? Math.round(nutriments.fat_100g || 0),
            serving: nutrition.serving,
            servingSize: nutrition.servingSize,
            servingUnit: nutrition.servingUnit,
            isUK: true as const,
            micronutrients: Object.keys(micronutrients).length > 0 ? micronutrients : undefined,
          };
        });
    }

    let globalProducts: ProductResult[] = [];
    if (globalResponse.ok) {
      const globalData = await globalResponse.json();
      globalProducts = (globalData.products || [])
        .filter((p: RawProduct) => p.product_name || p.product_name_en)
        .map((product: RawProduct) => {
          const nutrition: NutritionData = extractNutrition(product);
          const nutriments: Nutriments = product.nutriments || {};
          const micronutrients = extractMicronutrients(nutriments, nutrition.isPerServing);
          return {
            barcode: product.code || product._id || '',
            name: formatProductName(product),
            brand: product.brands || null,
            image: product.image_front_small_url || null,
            calories: nutrition.calories ?? Math.round(nutriments['energy-kcal_100g'] || 0),
            protein: nutrition.protein ?? Math.round(nutriments.proteins_100g || 0),
            carbs: nutrition.carbs ?? Math.round(nutriments.carbohydrates_100g || 0),
            fat: nutrition.fat ?? Math.round(nutriments.fat_100g || 0),
            serving: nutrition.serving,
            servingSize: nutrition.servingSize,
            servingUnit: nutrition.servingUnit,
            micronutrients: Object.keys(micronutrients).length > 0 ? micronutrients : undefined,
          };
        });
    }

    // Combine: UK products first, then global (deduplicated by barcode)
    const seenBarcodes: Set<string> = new Set(ukProducts.map((p) => p.barcode));
    const combinedProducts: ProductResult[] = [
      ...ukProducts,
      ...globalProducts.filter((p) => !seenBarcodes.has(p.barcode)),
    ].slice(0, pageSize);

    return {
      products: combinedProducts,
      count: combinedProducts.length,
    };
  } catch (error: unknown) {
    if (__DEV__) console.error('OpenFoodFacts UK search error:', error);
    // Fallback to regular search on error
    return searchProducts(query, 1, pageSize);
  }
}

/**
 * Fetch product data from OpenFoodFacts API
 * @param barcode - The barcode to look up
 * @returns Product data or null if not found
 */
export async function fetchProductByBarcode(barcode: string): Promise<ProductResult | null> {
  const controller = new AbortController();
  const timeoutId: ReturnType<typeof setTimeout> = setTimeout(() => controller.abort(), 5000);

  try {
    const sanitizedBarcode: string = (barcode || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 30);
    if (!sanitizedBarcode) {
      clearTimeout(timeoutId);
      return null;
    }

    const response: Response = await pinnedFetch(`${API_BASE}/${sanitizedBarcode}.json`, {
      headers: {
        'User-Agent': 'FuelIQ/1.0.0 (https://fueliq.app)',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const data = await response.json();

    // Check if product was found
    if (data.status !== 1 || !data.product) {
      return null;
    }

    const product: RawProduct = data.product;
    const nutrition: NutritionData = extractNutrition(product);
    const nutriments: Nutriments = product.nutriments || {};
    const micronutrients = extractMicronutrients(nutriments, nutrition.isPerServing);

    // Build the product object
    return {
      barcode,
      name: product.product_name || product.product_name_en || 'Unknown Product',
      brand: product.brands || null,
      image: product.image_front_small_url || product.image_url || null,
      calories: nutrition.calories || 0,
      protein: nutrition.protein || 0,
      carbs: nutrition.carbs || 0,
      fat: nutrition.fat || 0,
      serving: nutrition.serving,
      servingSize: nutrition.servingSize,
      servingUnit: nutrition.servingUnit,
      isPerServing: nutrition.isPerServing,
      // Micronutrients
      micronutrients: Object.keys(micronutrients).length > 0 ? micronutrients : undefined,
      // Additional data for future use
      raw: {
        categories: product.categories,
        ingredients: product.ingredients_text,
        allergens: product.allergens,
        nutriscore: product.nutriscore_grade,
      },
    };
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    if ((error as Error).name === 'AbortError') {
      throw new Error('Barcode lookup timed out. Please try again.');
    }
    if (__DEV__) console.error('OpenFoodFacts API error:', error);
    throw error;
  }
}

/**
 * Convert OpenFoodFacts product to our food format
 * @param product - Product from OpenFoodFacts
 * @returns Food object compatible with our context
 */
export function productToFood(product: ProductResult): FoodFromProduct {
  return {
    id: `off-${product.barcode}-${Date.now()}`,
    name: product.name,
    serving: product.serving || '100g',
    servingSize: product.servingSize || 100,
    servingUnit: product.servingUnit || 'g',
    isPerServing: product.isPerServing || false,
    calories: product.calories || 0,
    protein: product.protein || 0,
    carbs: product.carbs || 0,
    fat: product.fat || 0,
    category: 'searched',
    barcode: product.barcode,
    micronutrients: product.micronutrients,
  };
}

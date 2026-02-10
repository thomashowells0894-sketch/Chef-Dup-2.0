const API_BASE = 'https://world.openfoodfacts.org/api/v0/product';
const SEARCH_API = 'https://world.openfoodfacts.org/cgi/search.pl';

const SEARCH_CACHE_MAX = 50;
const SEARCH_CACHE_TTL = 5 * 60 * 1000;
const searchCache = new Map();

/**
 * Parse serving size string to extract numeric value
 * @param {string} servingStr - Serving size string like "100g" or "1 cup (240g)"
 * @returns {number} - Numeric grams value
 */
function parseServingSize(servingStr) {
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
 * @param {object} product - Raw product from API
 * @returns {object} - Normalized nutrition data
 */
function extractNutrition(product) {
  const nutriments = product.nutriments || {};
  const servingSize = product.serving_size || '100g';
  const useServing = product.nutrition_data_per === 'serving';
  const servingSizeGrams = parseServingSize(servingSize);

  // Get calorie value
  let calories = null;
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
  const getNumericValue = (key, servingKey) => {
    if (useServing && nutriments[servingKey] !== undefined) {
      return Math.round(nutriments[servingKey]);
    }
    if (nutriments[key] !== undefined) {
      return Math.round(nutriments[key]);
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
 * Format product name with brand (e.g., "Oats (Quaker)")
 * @param {object} product - Raw product from API
 * @returns {string} - Formatted name
 */
function formatProductName(product) {
  const name = product.product_name || product.product_name_en || 'Unknown Product';
  const brand = product.brands;

  // If brand exists and isn't already in the name, append it
  if (brand && !name.toLowerCase().includes(brand.toLowerCase())) {
    // Take first brand if multiple (comma-separated)
    const primaryBrand = brand.split(',')[0].trim();
    return `${name} (${primaryBrand})`;
  }

  return name;
}

/**
 * Search products by text query
 * @param {string} query - Search terms
 * @param {number} page - Page number (default 1)
 * @param {number} pageSize - Results per page (default 20)
 * @returns {Promise<object>} - Search results with products array
 */
export async function searchProducts(query, page = 1, pageSize = 20) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const sanitizedQuery = (query || '').trim().slice(0, 200);
    if (!sanitizedQuery) {
      clearTimeout(timeoutId);
      return { products: [], count: 0 };
    }

    const cacheKey = `${sanitizedQuery}|${page}|${pageSize}`;
    const cached = searchCache.get(cacheKey);
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

    const response = await fetch(`${SEARCH_API}?${params}`, {
      headers: {
        'User-Agent': 'VibeFit/1.0.0 (https://vibefit.app)',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const data = await response.json();

    // Filter and map products
    const products = (data.products || [])
      .filter((product) => {
        // Only include products with at least a name
        return product.product_name || product.product_name_en;
      })
      .map((product) => {
        const nutrition = extractNutrition(product);
        const nutriments = product.nutriments || {};

        return {
          barcode: product.code || product._id,
          name: formatProductName(product),
          brand: product.brands || null,
          image: product.image_front_small_url || product.image_front_thumb_url || null,
          // Include raw nutriment values as fallback with defaults
          calories: nutrition.calories ?? Math.round(nutriments['energy-kcal_100g'] || 0),
          protein: nutrition.protein ?? Math.round(nutriments.proteins_100g || 0),
          carbs: nutrition.carbs ?? Math.round(nutriments.carbohydrates_100g || 0),
          fat: nutrition.fat ?? Math.round(nutriments.fat_100g || 0),
          serving: nutrition.serving,
          servingSize: nutrition.servingSize,
          servingUnit: nutrition.servingUnit,
          isPerServing: nutrition.isPerServing,
          // Additional metadata
          countries: product.countries,
          categories: product.categories,
        };
      });

    const result = {
      products,
      count: data.count || 0,
      page: data.page || 1,
      pageSize: data.page_size || pageSize,
    };

    if (searchCache.size >= SEARCH_CACHE_MAX) {
      searchCache.delete(searchCache.keys().next().value);
    }
    searchCache.set(cacheKey, { data: result, timestamp: Date.now() });

    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Search timed out. Please try again.');
    }
    if (__DEV__) console.error('OpenFoodFacts search error:', error);
    throw error;
  }
}

/**
 * Search products globally (US + UK + EU)
 * Uses the world endpoint for maximum coverage
 * @param {string} query - Search terms
 * @param {number} pageSize - Results per page
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {Promise<object>} - Search results
 */
export async function searchProductsGlobal(query, pageSize = 25, timeoutMs = 8000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const params = new URLSearchParams({
      search_terms: query,
      search_simple: '1',
      action: 'process',
      json: '1',
      page_size: pageSize.toString(),
      sort_by: 'unique_scans_n', // Most popular first
    });

    const response = await fetch(`${SEARCH_API}?${params}`, {
      headers: { 'User-Agent': 'VibeFit/1.0.0 (https://vibefit.app)' },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const data = await response.json();

    const products = (data.products || [])
      .filter((p) => p.product_name || p.product_name_en)
      .map((product) => {
        const nutriments = product.nutriments || {};
        const nutrition = extractNutrition(product);

        return {
          barcode: product.code || product._id,
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
          // Additional metadata
          countries: product.countries,
        };
      });

    return { products, count: data.count || 0 };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      if (__DEV__) console.warn('OpenFoodFacts search timed out');
    }
    throw error;
  }
}

/**
 * Search products with UK preference
 * Falls back to global search if UK search returns few results
 * @param {string} query - Search terms
 * @param {number} pageSize - Results per page
 * @returns {Promise<object>} - Combined search results
 */
export async function searchProductsWithUKPreference(query, pageSize = 25) {
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
        headers: { 'User-Agent': 'VibeFit/1.0.0 (https://vibefit.app)' },
      }).catch(() => null),
      fetch(`${SEARCH_API}?${globalParams}`, {
        headers: { 'User-Agent': 'VibeFit/1.0.0 (https://vibefit.app)' },
      }),
    ]);

    let ukProducts = [];
    if (ukResponse && ukResponse.ok) {
      const ukData = await ukResponse.json();
      ukProducts = (ukData.products || [])
        .filter((p) => p.product_name || p.product_name_en)
        .map((product) => {
          const nutrition = extractNutrition(product);
          const nutriments = product.nutriments || {};
          return {
            barcode: product.code || product._id,
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
            isUK: true,
          };
        });
    }

    let globalProducts = [];
    if (globalResponse.ok) {
      const globalData = await globalResponse.json();
      globalProducts = (globalData.products || [])
        .filter((p) => p.product_name || p.product_name_en)
        .map((product) => {
          const nutrition = extractNutrition(product);
          const nutriments = product.nutriments || {};
          return {
            barcode: product.code || product._id,
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
          };
        });
    }

    // Combine: UK products first, then global (deduplicated by barcode)
    const seenBarcodes = new Set(ukProducts.map((p) => p.barcode));
    const combinedProducts = [
      ...ukProducts,
      ...globalProducts.filter((p) => !seenBarcodes.has(p.barcode)),
    ].slice(0, pageSize);

    return {
      products: combinedProducts,
      count: combinedProducts.length,
    };
  } catch (error) {
    if (__DEV__) console.error('OpenFoodFacts UK search error:', error);
    // Fallback to regular search on error
    return searchProducts(query, 1, pageSize);
  }
}

/**
 * Fetch product data from OpenFoodFacts API
 * @param {string} barcode - The barcode to look up
 * @returns {Promise<object|null>} - Product data or null if not found
 */
export async function fetchProductByBarcode(barcode) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const sanitizedBarcode = (barcode || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 30);
    if (!sanitizedBarcode) {
      clearTimeout(timeoutId);
      return null;
    }

    const response = await fetch(`${API_BASE}/${sanitizedBarcode}.json`, {
      headers: {
        'User-Agent': 'VibeFit/1.0.0 (https://vibefit.app)',
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

    const product = data.product;
    const nutrition = extractNutrition(product);

    // Build the product object
    return {
      barcode,
      name: product.product_name || product.product_name_en || 'Unknown Product',
      brand: product.brands || null,
      image: product.image_front_small_url || product.image_url || null,
      ...nutrition,
      // Additional data for future use
      raw: {
        categories: product.categories,
        ingredients: product.ingredients_text,
        allergens: product.allergens,
        nutriscore: product.nutriscore_grade,
      },
    };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Barcode lookup timed out. Please try again.');
    }
    if (__DEV__) console.error('OpenFoodFacts API error:', error);
    throw error;
  }
}

/**
 * Convert OpenFoodFacts product to our food format
 * @param {object} product - Product from OpenFoodFacts
 * @returns {object} - Food object compatible with our context
 */
export function productToFood(product) {
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
  };
}

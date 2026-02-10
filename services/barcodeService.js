/**
 * Barcode Lookup Service
 *
 * Uses the Open Food Facts API to look up nutrition data by barcode.
 * Returns a normalized food object or a not-found response.
 */

const API_BASE = 'https://world.openfoodfacts.org/api/v2/product';
const TIMEOUT_MS = 8000;

/**
 * Look up a barcode in Open Food Facts and return normalized nutrition data.
 *
 * @param {string} barcode - EAN-13, EAN-8, UPC-A, or UPC-E barcode string
 * @returns {Promise<{ found: boolean, food?: object }>}
 */
export async function lookupBarcode(barcode) {
  if (!barcode || typeof barcode !== 'string') {
    return { found: false };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE}/${barcode}.json`, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'VibeFit/1.0 (fitness-app)',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return { found: false };
    }

    const data = await response.json();

    if (!data || data.status !== 1 || !data.product) {
      return { found: false };
    }

    const product = data.product;
    const nutriments = product.nutriments || {};

    const name = product.product_name || product.product_name_en || '';
    if (!name) {
      return { found: false };
    }

    const food = {
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
    };

    return { found: true, food };
  } catch (error) {
    clearTimeout(timeoutId);

    if (__DEV__) {
      console.warn('[barcodeService] lookup failed:', error.message);
    }

    return { found: false };
  }
}

/**
 * Round a numeric value to one decimal place. Returns 0 for non-numeric input.
 */
function roundNum(value) {
  const num = parseFloat(value);
  if (isNaN(num)) return 0;
  return Math.round(num * 10) / 10;
}

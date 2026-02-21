import AsyncStorage from '@react-native-async-storage/async-storage';

const BARCODE_CACHE_KEY = '@fueliq_barcode_cache';
const MAX_CACHED = 200;

interface CachedBarcode {
  barcode: string;
  food: {
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    serving: string;
    brand?: string;
  };
  cachedAt: number;
}

let _memoryCache: Map<string, CachedBarcode> | null = null;

async function loadCache(): Promise<Map<string, CachedBarcode>> {
  if (_memoryCache) return _memoryCache;

  try {
    const raw = await AsyncStorage.getItem(BARCODE_CACHE_KEY);
    if (raw) {
      const entries: CachedBarcode[] = JSON.parse(raw);
      _memoryCache = new Map(entries.map(e => [e.barcode, e]));
    } else {
      _memoryCache = new Map();
    }
  } catch {
    _memoryCache = new Map();
  }

  return _memoryCache;
}

export async function getCachedBarcode(barcode: string): Promise<CachedBarcode['food'] | null> {
  const cache = await loadCache();
  const entry = cache.get(barcode);
  if (!entry) return null;

  // Expire after 30 days
  if (Date.now() - entry.cachedAt > 30 * 24 * 60 * 60 * 1000) {
    cache.delete(barcode);
    return null;
  }

  return entry.food;
}

export async function setCachedBarcode(barcode: string, food: CachedBarcode['food']): Promise<void> {
  const cache = await loadCache();

  cache.set(barcode, { barcode, food, cachedAt: Date.now() });

  // Evict oldest entries if over limit
  if (cache.size > MAX_CACHED) {
    const entries = Array.from(cache.values()).sort((a, b) => a.cachedAt - b.cachedAt);
    const toRemove = entries.slice(0, cache.size - MAX_CACHED);
    for (const entry of toRemove) {
      cache.delete(entry.barcode);
    }
  }

  // Persist
  try {
    await AsyncStorage.setItem(
      BARCODE_CACHE_KEY,
      JSON.stringify(Array.from(cache.values()))
    );
  } catch {}
}

export async function clearBarcodeCache(): Promise<void> {
  _memoryCache = new Map();
  try {
    await AsyncStorage.removeItem(BARCODE_CACHE_KEY);
  } catch {}
}

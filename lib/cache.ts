/**
 * FuelIQ Advanced Cache System
 * High-performance caching with TTL, LRU eviction, and memory management.
 *
 * Uses Map insertion order for O(1) LRU tracking instead of
 * the previous O(n) array.filter() approach.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const DEFAULT_TTL: number = 5 * 60 * 1000; // 5 minutes
const MAX_MEMORY_ITEMS: number = 200;
const CACHE_PREFIX: string = '@fueliq_cache_';

interface CacheEntry<V = unknown> {
  value: V;
  expiresAt: number;
  createdAt: number;
}

interface CacheStats {
  total: number;
  expired: number;
  active: number;
  maxSize: number;
}

interface ImageCacheIndexEntry {
  uri: string;
  ts: number;
}

/**
 * O(1) LRU cache using Map insertion order.
 * Map.delete() + Map.set() moves a key to the end (most recent).
 * Iteration order = insertion order, so the first key is the LRU.
 */
class MemoryCache {
  maxSize: number;
  cache: Map<string, CacheEntry>;

  constructor(maxSize: number = MAX_MEMORY_ITEMS) {
    this.maxSize = maxSize;
    this.cache = new Map();
  }

  get(key: string): unknown | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    // Move to end (most recently used) — O(1)
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value;
  }

  getWithStale<T>(key: string): { value: T | null; isStale: boolean; found: boolean } {
    const entry = this.cache.get(key);
    if (!entry) return { value: null, isStale: false, found: false };
    const isStale = Date.now() > entry.expiresAt;
    // Move to end for LRU even if stale
    this.cache.delete(key);
    this.cache.set(key, entry);
    return { value: entry.value as T, isStale, found: true };
  }

  set(key: string, value: unknown, ttl: number = DEFAULT_TTL): void {
    // Delete first so re-insertion moves to end
    this.cache.delete(key);

    // Evict LRU entries if at capacity
    while (this.cache.size >= this.maxSize) {
      const lruKey = this.cache.keys().next().value as string;
      this.cache.delete(lruKey);
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttl,
      createdAt: Date.now(),
    });
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  invalidatePattern(pattern: string): number {
    const regex = new RegExp(pattern);
    let count = 0;
    for (const key of [...this.cache.keys()]) {
      if (regex.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }

  getStats(): CacheStats {
    let expired = 0;
    const now = Date.now();
    for (const entry of this.cache.values()) {
      if (now > entry.expiresAt) expired++;
    }
    return {
      total: this.cache.size,
      expired,
      active: this.cache.size - expired,
      maxSize: this.maxSize,
    };
  }
}

// Singleton instances
const memoryCache = new MemoryCache();
const queryCache = new MemoryCache(100);

// Persistent cache helpers
async function persistGet(key: string): Promise<unknown | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() > entry.expiresAt) {
      AsyncStorage.removeItem(CACHE_PREFIX + key).catch(() => {});
      return null;
    }
    return entry.value;
  } catch {
    return null;
  }
}

async function persistSet(key: string, value: unknown, ttl: number = 30 * 60 * 1000): Promise<void> {
  try {
    await AsyncStorage.setItem(
      CACHE_PREFIX + key,
      JSON.stringify({ value, expiresAt: Date.now() + ttl, createdAt: Date.now() })
    );
  } catch {
    // Silently fail on storage errors
  }
}

async function persistInvalidate(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(CACHE_PREFIX + key);
  } catch {
    // Silently fail
  }
}

// Query deduplication - prevents duplicate in-flight requests
const inflightRequests = new Map<string, Promise<unknown>>();

async function deduplicatedQuery<T>(key: string, queryFn: () => Promise<T>, ttl: number = DEFAULT_TTL): Promise<T> {
  // Check memory cache first
  const cached = queryCache.get(key);
  if (cached !== null) return cached as T;

  // Check if request is already in-flight
  if (inflightRequests.has(key)) {
    return inflightRequests.get(key) as Promise<T>;
  }

  // Execute query with deduplication
  const promise = queryFn()
    .then((result: T) => {
      queryCache.set(key, result, ttl);
      inflightRequests.delete(key);
      return result;
    })
    .catch((error: unknown) => {
      inflightRequests.delete(key);
      throw error;
    });

  inflightRequests.set(key, promise);
  return promise;
}

// Batch operations for reducing Supabase round-trips
interface BatchQueueEntry<T, R> {
  item: T;
  resolve: (value: R) => void;
  reject: (reason?: unknown) => void;
}

class BatchQueue<T, R> {
  executeFn: (items: T[]) => Promise<R[]>;
  delay: number;
  maxBatchSize: number;
  queue: BatchQueueEntry<T, R>[];
  timer: ReturnType<typeof setTimeout> | null;

  constructor(executeFn: (items: T[]) => Promise<R[]>, delay: number = 50, maxBatchSize: number = 25) {
    this.executeFn = executeFn;
    this.delay = delay;
    this.maxBatchSize = maxBatchSize;
    this.queue = [];
    this.timer = null;
  }

  add(item: T): Promise<R> {
    return new Promise<R>((resolve, reject) => {
      this.queue.push({ item, resolve, reject });
      if (this.queue.length >= this.maxBatchSize) {
        this._flush();
      } else if (!this.timer) {
        this.timer = setTimeout(() => this._flush(), this.delay);
      }
    });
  }

  async _flush(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.queue.length === 0) return;

    const batch = this.queue.splice(0, this.maxBatchSize);
    try {
      const results = await this.executeFn(batch.map((b: BatchQueueEntry<T, R>) => b.item));
      batch.forEach((entry: BatchQueueEntry<T, R>, i: number) => entry.resolve(results?.[i] ?? (results as unknown as R)));
    } catch (error: unknown) {
      batch.forEach((entry: BatchQueueEntry<T, R>) => entry.reject(error));
    }
  }
}

// ============================================================================
// IMAGE CACHE — Per-key storage instead of one giant JSON blob
// ============================================================================

const IMAGE_CACHE_PREFIX: string = '@fueliq_img_';
const IMAGE_CACHE_INDEX_KEY: string = '@fueliq_img_index';
const MAX_IMAGE_CACHE_SIZE: number = 50;

/**
 * Cache an image using per-key storage.
 * Each image gets its own AsyncStorage key, avoiding the problem of
 * serializing/deserializing the entire cache on every write.
 */
async function cacheImage(uri: string, base64: string): Promise<void> {
  try {
    if (!uri || !base64) return;
    const cacheKey = IMAGE_CACHE_PREFIX + encodeURIComponent(uri);

    // Store the image data under its own key (up to 50KB, not 5KB)
    await AsyncStorage.setItem(cacheKey, base64.substring(0, 50000));

    // Update the index for LRU eviction
    const indexRaw = await AsyncStorage.getItem(IMAGE_CACHE_INDEX_KEY);
    const index: ImageCacheIndexEntry[] = indexRaw ? JSON.parse(indexRaw) : [];

    // Remove existing entry if present and add to end
    const filtered = index.filter((e: ImageCacheIndexEntry) => e.uri !== uri);
    filtered.push({ uri, ts: Date.now() });

    // Evict oldest entries if over limit
    while (filtered.length > MAX_IMAGE_CACHE_SIZE) {
      const evicted = filtered.shift()!;
      AsyncStorage.removeItem(IMAGE_CACHE_PREFIX + encodeURIComponent(evicted.uri)).catch(() => {});
    }

    await AsyncStorage.setItem(IMAGE_CACHE_INDEX_KEY, JSON.stringify(filtered));
  } catch {
    // Silently fail
  }
}

async function getCachedImage(uri: string): Promise<string | null> {
  try {
    if (!uri) return null;
    const cacheKey = IMAGE_CACHE_PREFIX + encodeURIComponent(uri);
    return await AsyncStorage.getItem(cacheKey);
  } catch {
    return null;
  }
}

export {
  memoryCache,
  queryCache,
  deduplicatedQuery,
  persistGet,
  persistSet,
  persistInvalidate,
  BatchQueue,
  cacheImage,
  getCachedImage,
  MemoryCache,
};

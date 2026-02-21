/**
 * Performance utilities for FuelIQ
 */

declare const __DEV__: boolean;

// Debounce function for search inputs etc
export function debounce<T extends (...args: any[]) => void>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  return function executedFunction(...args: Parameters<T>): void {
    const later = (): void => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Throttle for scroll handlers etc
export function throttle<T extends (...args: any[]) => void>(func: T, limit: number): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return function executedFunction(...args: Parameters<T>): void {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => { inThrottle = false; }, limit);
    }
  };
}

/**
 * Memoize expensive computations.
 * Uses a cheap string key (primitives only — no deep object serialization).
 * For object args, falls through without caching.
 */
export function memoize<T extends (...args: any[]) => any>(fn: T, maxSize: number = 100): T {
  const cache = new Map<string, ReturnType<T>>();
  return function (this: unknown, ...args: Parameters<T>): ReturnType<T> {
    // Build a cheap key — only works reliably for primitive args
    let key = '';
    for (let i = 0; i < args.length; i++) {
      const a = args[i];
      if (a === null || a === undefined || typeof a === 'number' || typeof a === 'string' || typeof a === 'boolean') {
        key += String(a) + '|';
      } else {
        // Non-primitive arg — skip caching to avoid expensive serialization
        return fn.apply(this, args);
      }
    }
    if (cache.has(key)) return cache.get(key)!;
    const result = fn.apply(this, args);
    // Evict oldest when at capacity
    if (cache.size >= maxSize) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey as string);
    }
    cache.set(key, result);
    return result;
  } as T;
}

// Batch async storage operations
export class AsyncStorageBatcher {
  pending: Map<string, unknown>;
  timer: ReturnType<typeof setTimeout> | null;
  flushInterval: number;

  constructor(flushInterval: number = 1000) {
    this.pending = new Map();
    this.timer = null;
    this.flushInterval = flushInterval;
  }

  set(key: string, value: unknown): void {
    this.pending.set(key, value);
    if (!this.timer) {
      this.timer = setTimeout(() => this.flush(), this.flushInterval);
    }
  }

  async flush(): Promise<void> {
    if (this.pending.size === 0) return;
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const entries: [string, unknown][] = Array.from(this.pending.entries());
    this.pending.clear();
    this.timer = null;
    try {
      await AsyncStorage.multiSet(entries.map(([k, v]: [string, unknown]) => [k, JSON.stringify(v)]));
    } catch (e: unknown) {
      if (__DEV__) console.warn('AsyncStorageBatcher flush failed:', e);
    }
  }
}

// Format large lists for FlatList optimization
export const flatListOptimizations = {
  removeClippedSubviews: true,
  maxToRenderPerBatch: 10,
  updateCellsBatchingPeriod: 50,
  windowSize: 5,
  initialNumToRender: 8,
} as const;

// Image cache dimensions helper
export function getOptimalImageSize(width: number, pixelRatio: number = 2): { width: number; height: number } {
  return {
    width: Math.round(width * pixelRatio),
    height: Math.round(width * pixelRatio),
  };
}

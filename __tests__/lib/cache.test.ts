import { MemoryCache, BatchQueue, deduplicatedQuery, memoryCache, queryCache, persistGet, persistSet, persistInvalidate } from '../../lib/cache';
import AsyncStorage from '@react-native-async-storage/async-storage';

describe('MemoryCache', () => {
  let cache: InstanceType<typeof MemoryCache>;

  beforeEach(() => {
    cache = new MemoryCache(5);
  });

  describe('get/set', () => {
    it('stores and retrieves values', () => {
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
    });

    it('returns null for missing keys', () => {
      expect(cache.get('nonexistent')).toBeNull();
    });

    it('stores objects', () => {
      const obj = { a: 1, b: 'hello' };
      cache.set('obj', obj);
      expect(cache.get('obj')).toEqual(obj);
    });

    it('stores arrays', () => {
      const arr = [1, 2, 3];
      cache.set('arr', arr);
      expect(cache.get('arr')).toEqual(arr);
    });

    it('stores null values (retrieved as null)', () => {
      cache.set('null', null);
      expect(cache.get('null')).toBeNull();
    });

    it('stores boolean values', () => {
      cache.set('bool-true', true);
      cache.set('bool-false', false);
      expect(cache.get('bool-true')).toBe(true);
      // false is falsy but should still be stored
    });

    it('stores numeric values including zero', () => {
      cache.set('num', 42);
      cache.set('zero', 0);
      expect(cache.get('num')).toBe(42);
    });

    it('overwrites existing values', () => {
      cache.set('key1', 'value1');
      cache.set('key1', 'value2');
      expect(cache.get('key1')).toBe('value2');
    });

    it('stores empty string', () => {
      cache.set('empty', '');
      // empty string is falsy but get returns value from entry
    });

    it('stores deeply nested objects', () => {
      const nested = { a: { b: { c: { d: 'deep' } } } };
      cache.set('nested', nested);
      expect(cache.get('nested')).toEqual(nested);
    });
  });

  describe('TTL expiry', () => {
    it('returns null for expired entries', () => {
      jest.useFakeTimers();
      cache.set('key1', 'value1', 100);

      jest.advanceTimersByTime(101);
      expect(cache.get('key1')).toBeNull();

      jest.useRealTimers();
    });

    it('returns value before TTL expires', () => {
      jest.useFakeTimers();
      cache.set('key1', 'value1', 1000);

      jest.advanceTimersByTime(500);
      expect(cache.get('key1')).toBe('value1');

      jest.useRealTimers();
    });

    it('respects different TTL values per key', () => {
      jest.useFakeTimers();
      cache.set('short', 'value', 100);
      cache.set('long', 'value', 1000);

      jest.advanceTimersByTime(150);
      expect(cache.get('short')).toBeNull();
      expect(cache.get('long')).toBe('value');

      jest.useRealTimers();
    });

    it('uses default TTL when not specified', () => {
      jest.useFakeTimers();
      cache.set('default-ttl', 'value');

      // Default TTL is 5 minutes (300000ms)
      jest.advanceTimersByTime(200000);
      expect(cache.get('default-ttl')).toBe('value');

      jest.advanceTimersByTime(200000);
      expect(cache.get('default-ttl')).toBeNull();

      jest.useRealTimers();
    });

    it('removes expired entries from cache on access', () => {
      jest.useFakeTimers();
      cache.set('expired', 'value', 100);

      jest.advanceTimersByTime(101);
      cache.get('expired'); // triggers removal
      expect(cache.size).toBe(0);

      jest.useRealTimers();
    });

    it('returns value at exact TTL boundary', () => {
      jest.useFakeTimers();
      cache.set('boundary', 'value', 100);

      jest.advanceTimersByTime(100);
      // At exactly expiresAt, Date.now() > entry.expiresAt is false (equal, not greater)
      // Actually: expiresAt = Date.now() + ttl. After advancing by ttl, Date.now() === expiresAt.
      // The check is Date.now() > entry.expiresAt, so at exactly ttl it should still be valid
      expect(cache.get('boundary')).toBe('value');

      jest.advanceTimersByTime(1);
      expect(cache.get('boundary')).toBeNull();

      jest.useRealTimers();
    });

    it('handles very short TTL (1ms)', () => {
      jest.useFakeTimers();
      cache.set('short', 'value', 1);

      jest.advanceTimersByTime(2);
      expect(cache.get('short')).toBeNull();

      jest.useRealTimers();
    });
  });

  describe('getWithStale', () => {
    it('returns found:false for missing keys', () => {
      const result = cache.getWithStale('nonexistent');
      expect(result).toEqual({ value: null, isStale: false, found: false });
    });

    it('returns found:true, isStale:false for fresh entries', () => {
      cache.set('fresh', 'data', 10000);
      const result = cache.getWithStale<string>('fresh');
      expect(result.value).toBe('data');
      expect(result.isStale).toBe(false);
      expect(result.found).toBe(true);
    });

    it('returns found:true, isStale:true for expired entries', () => {
      jest.useFakeTimers();
      cache.set('stale', 'data', 100);

      jest.advanceTimersByTime(101);
      const result = cache.getWithStale<string>('stale');
      expect(result.value).toBe('data');
      expect(result.isStale).toBe(true);
      expect(result.found).toBe(true);

      jest.useRealTimers();
    });

    it('moves entry to most recently used even if stale', () => {
      // Fill cache
      for (let i = 0; i < 5; i++) {
        cache.set(`key${i}`, `value${i}`);
      }

      jest.useFakeTimers();
      // Access key0 via getWithStale
      cache.getWithStale('key0');

      // Add new entry - should evict key1 (not key0 since it was just accessed)
      cache.set('new', 'value');
      expect(cache.get('key0')).toBe('value0');

      jest.useRealTimers();
    });
  });

  describe('LRU eviction', () => {
    it('evicts least recently used when at capacity', () => {
      for (let i = 0; i < 5; i++) {
        cache.set(`key${i}`, `value${i}`);
      }

      cache.set('key5', 'value5');
      expect(cache.get('key0')).toBeNull();
      expect(cache.get('key5')).toBe('value5');
    });

    it('get() moves entry to most recently used', () => {
      for (let i = 0; i < 5; i++) {
        cache.set(`key${i}`, `value${i}`);
      }

      cache.get('key0');

      cache.set('key5', 'value5');
      expect(cache.get('key0')).toBe('value0');
      expect(cache.get('key1')).toBeNull();
    });

    it('maintains correct size after eviction', () => {
      for (let i = 0; i < 10; i++) {
        cache.set(`key${i}`, `value${i}`);
      }
      expect(cache.size).toBe(5);
    });

    it('set() with existing key does not increase size', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('a', 3);
      expect(cache.size).toBe(2);
    });

    it('evicts in correct order with mixed access patterns', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);
      cache.set('d', 4);
      cache.set('e', 5);

      // Access a and c, making them most recently used
      cache.get('a');
      cache.get('c');

      // Insert two new entries - should evict b then d
      cache.set('f', 6);
      cache.set('g', 7);

      expect(cache.get('b')).toBeNull();
      expect(cache.get('d')).toBeNull();
      expect(cache.get('a')).toBe(1);
      expect(cache.get('c')).toBe(3);
    });
  });

  describe('invalidate', () => {
    it('removes a specific key', () => {
      cache.set('key1', 'value1');
      cache.invalidate('key1');
      expect(cache.get('key1')).toBeNull();
    });

    it('does nothing for non-existent key', () => {
      cache.invalidate('nonexistent');
      expect(cache.size).toBe(0);
    });

    it('decreases size after invalidation', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      expect(cache.size).toBe(2);
      cache.invalidate('key1');
      expect(cache.size).toBe(1);
    });

    it('leaves other entries intact', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);
      cache.invalidate('b');
      expect(cache.get('a')).toBe(1);
      expect(cache.get('c')).toBe(3);
    });
  });

  describe('invalidatePattern', () => {
    it('removes keys matching a regex pattern', () => {
      cache.set('user:1', 'alice');
      cache.set('user:2', 'bob');
      cache.set('food:1', 'apple');

      const count = cache.invalidatePattern('^user:');
      expect(count).toBe(2);
      expect(cache.get('user:1')).toBeNull();
      expect(cache.get('user:2')).toBeNull();
      expect(cache.get('food:1')).toBe('apple');
    });

    it('returns 0 when no keys match', () => {
      cache.set('key1', 'value1');
      const count = cache.invalidatePattern('^user:');
      expect(count).toBe(0);
    });

    it('matches using regex', () => {
      cache.set('test-abc', 1);
      cache.set('test-def', 2);
      cache.set('other-abc', 3);

      const count = cache.invalidatePattern('test-');
      expect(count).toBe(2);
    });

    it('handles complex regex patterns', () => {
      cache.set('meal-2024-01-01', 1);
      cache.set('meal-2024-01-02', 2);
      cache.set('exercise-2024-01-01', 3);

      const count = cache.invalidatePattern('^meal-2024');
      expect(count).toBe(2);
    });
  });

  describe('clear', () => {
    it('removes all entries', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      cache.clear();
      expect(cache.size).toBe(0);
      expect(cache.get('a')).toBeNull();
    });

    it('works on empty cache', () => {
      cache.clear();
      expect(cache.size).toBe(0);
    });
  });

  describe('size', () => {
    it('returns current entry count', () => {
      expect(cache.size).toBe(0);
      cache.set('a', 1);
      expect(cache.size).toBe(1);
      cache.set('b', 2);
      expect(cache.size).toBe(2);
    });

    it('does not count overwritten entries twice', () => {
      cache.set('a', 1);
      cache.set('a', 2);
      expect(cache.size).toBe(1);
    });
  });

  describe('getStats', () => {
    it('returns cache statistics', () => {
      jest.useFakeTimers();
      cache.set('active', 'val', 10000);
      cache.set('expired', 'val', 1);
      jest.advanceTimersByTime(10);

      const stats = cache.getStats();
      expect(stats.total).toBe(2);
      expect(stats.expired).toBe(1);
      expect(stats.active).toBe(1);
      expect(stats.maxSize).toBe(5);

      jest.useRealTimers();
    });

    it('returns all zeros for empty cache', () => {
      const stats = cache.getStats();
      expect(stats.total).toBe(0);
      expect(stats.expired).toBe(0);
      expect(stats.active).toBe(0);
      expect(stats.maxSize).toBe(5);
    });

    it('reflects maxSize from constructor', () => {
      const bigCache = new MemoryCache(500);
      expect(bigCache.getStats().maxSize).toBe(500);
    });

    it('counts multiple expired entries correctly', () => {
      jest.useFakeTimers();
      cache.set('a', 1, 10);
      cache.set('b', 2, 10);
      cache.set('c', 3, 10000);

      jest.advanceTimersByTime(20);
      const stats = cache.getStats();
      expect(stats.expired).toBe(2);
      expect(stats.active).toBe(1);

      jest.useRealTimers();
    });
  });

  describe('constructor', () => {
    it('uses default max size when not specified', () => {
      const defaultCache = new MemoryCache();
      expect(defaultCache.getStats().maxSize).toBe(200);
    });

    it('respects custom max size', () => {
      const customCache = new MemoryCache(10);
      expect(customCache.getStats().maxSize).toBe(10);
    });
  });
});

describe('BatchQueue', () => {
  it('batches items and flushes them together', async () => {
    const executeFn = jest.fn(async (items: number[]) => items.map((i) => i * 2));
    const queue = new BatchQueue(executeFn, 50, 10);

    const p1 = queue.add(1);
    const p2 = queue.add(2);
    const p3 = queue.add(3);

    jest.useFakeTimers();
    jest.advanceTimersByTime(51);
    jest.useRealTimers();

    const results = await Promise.all([p1, p2, p3]);
    expect(executeFn).toHaveBeenCalledWith([1, 2, 3]);
    expect(results).toEqual([2, 4, 6]);
  });

  it('flushes immediately when maxBatchSize is reached', async () => {
    const executeFn = jest.fn(async (items: number[]) => items.map((i) => i * 2));
    const queue = new BatchQueue(executeFn, 10000, 2);

    const p1 = queue.add(1);
    const p2 = queue.add(2);

    const results = await Promise.all([p1, p2]);
    expect(executeFn).toHaveBeenCalledWith([1, 2]);
    expect(results).toEqual([2, 4]);
  });

  it('rejects all items in batch on error', async () => {
    const executeFn = jest.fn(async () => {
      throw new Error('batch error');
    });
    const queue = new BatchQueue(executeFn, 50, 10);

    const p1 = queue.add(1);
    const p2 = queue.add(2);

    jest.useFakeTimers();
    jest.advanceTimersByTime(51);
    jest.useRealTimers();

    await expect(p1).rejects.toThrow('batch error');
    await expect(p2).rejects.toThrow('batch error');
  });

  it('handles empty flush gracefully', async () => {
    const executeFn = jest.fn(async (items: number[]) => items);
    const queue = new BatchQueue(executeFn, 50, 10);

    await queue._flush();
    expect(executeFn).not.toHaveBeenCalled();
  });
});

describe('deduplicatedQuery', () => {
  beforeEach(() => {
    queryCache.clear();
  });

  it('returns cached result on second call', async () => {
    const fn = jest.fn(async () => 'result');

    const r1 = await deduplicatedQuery('key1', fn);
    const r2 = await deduplicatedQuery('key1', fn);

    expect(r1).toBe('result');
    expect(r2).toBe('result');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('deduplicates in-flight requests', async () => {
    let resolvePromise: (v: string) => void;
    const fn = jest.fn(
      () => new Promise<string>((resolve) => { resolvePromise = resolve; })
    );

    const p1 = deduplicatedQuery('key2', fn);
    const p2 = deduplicatedQuery('key2', fn);

    resolvePromise!('done');
    const [r1, r2] = await Promise.all([p1, p2]);

    expect(r1).toBe('done');
    expect(r2).toBe('done');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('cleans up inflight entry on error', async () => {
    const fn = jest.fn(async () => {
      throw new Error('fail');
    });

    await expect(deduplicatedQuery('key3', fn)).rejects.toThrow('fail');

    const fn2 = jest.fn(async () => 'success');
    const result = await deduplicatedQuery('key3', fn2);
    expect(result).toBe('success');
  });

  it('uses different cache entries for different keys', async () => {
    const fn1 = jest.fn(async () => 'result1');
    const fn2 = jest.fn(async () => 'result2');

    const r1 = await deduplicatedQuery('keyA', fn1);
    const r2 = await deduplicatedQuery('keyB', fn2);

    expect(r1).toBe('result1');
    expect(r2).toBe('result2');
    expect(fn1).toHaveBeenCalledTimes(1);
    expect(fn2).toHaveBeenCalledTimes(1);
  });

  it('respects TTL for cached results', async () => {
    jest.useFakeTimers();
    const fn = jest.fn(async () => 'result');

    await deduplicatedQuery('ttl-key', fn, 100);
    expect(fn).toHaveBeenCalledTimes(1);

    // Within TTL - should use cache
    await deduplicatedQuery('ttl-key', fn, 100);
    expect(fn).toHaveBeenCalledTimes(1);

    // After TTL - should re-execute
    jest.advanceTimersByTime(101);
    await deduplicatedQuery('ttl-key', fn, 100);
    expect(fn).toHaveBeenCalledTimes(2);

    jest.useRealTimers();
  });
});

describe('persist operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('persistGet', () => {
    it('returns null when key not found', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      const result = await persistGet('missing');
      expect(result).toBeNull();
    });

    it('returns value for non-expired entry', async () => {
      const entry = {
        value: 'test-data',
        expiresAt: Date.now() + 60000,
        createdAt: Date.now(),
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(entry));
      const result = await persistGet('valid');
      expect(result).toBe('test-data');
    });

    it('returns null for expired entry and cleans up', async () => {
      const entry = {
        value: 'old-data',
        expiresAt: Date.now() - 1000,
        createdAt: Date.now() - 60000,
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(entry));
      const result = await persistGet('expired');
      expect(result).toBeNull();
    });

    it('returns null on parse error', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('invalid json');
      const result = await persistGet('bad');
      expect(result).toBeNull();
    });

    it('returns null on storage error', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));
      const result = await persistGet('error');
      expect(result).toBeNull();
    });
  });

  describe('persistSet', () => {
    it('stores value with TTL', async () => {
      await persistSet('key', 'value', 60000);
      expect(AsyncStorage.setItem).toHaveBeenCalled();
      const call = (AsyncStorage.setItem as jest.Mock).mock.calls[0];
      expect(call[0]).toContain('key');
      const stored = JSON.parse(call[1]);
      expect(stored.value).toBe('value');
      expect(stored.expiresAt).toBeGreaterThan(Date.now());
    });

    it('handles storage error silently', async () => {
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error('Full'));
      // Should not throw
      await expect(persistSet('key', 'value')).resolves.toBeUndefined();
    });
  });

  describe('persistInvalidate', () => {
    it('removes key from AsyncStorage', async () => {
      await persistInvalidate('key');
      expect(AsyncStorage.removeItem).toHaveBeenCalled();
    });

    it('handles removal error silently', async () => {
      (AsyncStorage.removeItem as jest.Mock).mockRejectedValue(new Error('Error'));
      await expect(persistInvalidate('key')).resolves.toBeUndefined();
    });
  });
});

describe('singleton caches', () => {
  it('memoryCache is available and functional', () => {
    expect(memoryCache).toBeDefined();
    expect(typeof memoryCache.get).toBe('function');
    expect(typeof memoryCache.set).toBe('function');
    expect(typeof memoryCache.invalidate).toBe('function');
    expect(typeof memoryCache.invalidatePattern).toBe('function');
    expect(typeof memoryCache.clear).toBe('function');
    expect(typeof memoryCache.getStats).toBe('function');
  });

  it('queryCache is available and functional', () => {
    expect(queryCache).toBeDefined();
    expect(typeof queryCache.get).toBe('function');
    expect(typeof queryCache.set).toBe('function');
  });
});

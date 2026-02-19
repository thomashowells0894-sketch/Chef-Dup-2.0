import { debounce, throttle, memoize } from '../../lib/performanceUtils';

jest.useFakeTimers();

describe('debounce', () => {
  it('delays execution', () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 100);

    debounced();
    expect(fn).not.toHaveBeenCalled();

    jest.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('resets timer on subsequent calls', () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 100);

    debounced();
    jest.advanceTimersByTime(50);
    debounced();
    jest.advanceTimersByTime(50);
    expect(fn).not.toHaveBeenCalled();

    jest.advanceTimersByTime(50);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('passes arguments to the function', () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 100);

    debounced('hello', 42);
    jest.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledWith('hello', 42);
  });

  it('uses last arguments when called multiple times', () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 100);

    debounced('first');
    debounced('second');
    debounced('third');
    jest.advanceTimersByTime(100);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('third');
  });
});

describe('throttle', () => {
  it('executes immediately on first call', () => {
    const fn = jest.fn();
    const throttled = throttle(fn, 100);

    throttled();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('blocks subsequent calls within limit', () => {
    const fn = jest.fn();
    const throttled = throttle(fn, 100);

    throttled();
    throttled();
    throttled();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('allows calls after limit expires', () => {
    const fn = jest.fn();
    const throttled = throttle(fn, 100);

    throttled();
    expect(fn).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(100);
    throttled();
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('passes arguments to the function', () => {
    const fn = jest.fn();
    const throttled = throttle(fn, 100);

    throttled('hello', 42);
    expect(fn).toHaveBeenCalledWith('hello', 42);
  });
});

describe('memoize', () => {
  it('caches results for primitive arguments', () => {
    const fn = jest.fn((x: number) => x * 2);
    const memoized = memoize(fn);

    expect(memoized(5)).toBe(10);
    expect(memoized(5)).toBe(10);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('distinguishes different arguments', () => {
    const fn = jest.fn((x: number) => x * 2);
    const memoized = memoize(fn);

    expect(memoized(5)).toBe(10);
    expect(memoized(3)).toBe(6);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('handles multiple primitive arguments', () => {
    const fn = jest.fn((a: number, b: string) => `${a}-${b}`);
    const memoized = memoize(fn);

    expect(memoized(1, 'a')).toBe('1-a');
    expect(memoized(1, 'a')).toBe('1-a');
    expect(fn).toHaveBeenCalledTimes(1);

    expect(memoized(1, 'b')).toBe('1-b');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('falls through without caching for object arguments', () => {
    const fn = jest.fn((obj: { x: number }) => obj.x);
    const memoized = memoize(fn);

    memoized({ x: 1 });
    memoized({ x: 1 });
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('evicts oldest entries when at capacity', () => {
    const fn = jest.fn((x: number) => x * 2);
    const memoized = memoize(fn, 3);

    memoized(1); // cache: [1]
    memoized(2); // cache: [1, 2]
    memoized(3); // cache: [1, 2, 3]
    memoized(4); // cache: [2, 3, 4] — 1 evicted

    expect(fn).toHaveBeenCalledTimes(4);

    // 4 should be cached
    memoized(4);
    expect(fn).toHaveBeenCalledTimes(4);

    // 1 should have been evicted — re-computed
    memoized(1);
    expect(fn).toHaveBeenCalledTimes(5);
  });

  it('handles null and undefined arguments', () => {
    const fn = jest.fn((...args: unknown[]) => args.join('-'));
    const memoized = memoize(fn);

    memoized(null, undefined, true);
    memoized(null, undefined, true);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

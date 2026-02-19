/**
 * VibeFit Performance Monitor
 * Tracks render times, API latencies, memory usage, and frame drops.
 *
 * Uses a circular buffer for O(1) insertion without array resizing.
 */
import { InteractionManager } from 'react-native';
import { Sentry } from './sentry';

// ============================================================================
// TYPES
// ============================================================================

interface APICallEntry {
  endpoint: string;
  duration: number;
  success: boolean;
  timestamp: number;
}

interface RenderTimeEntry {
  component: string;
  duration: number;
  timestamp: number;
}

interface ErrorEntry {
  message: string;
  context: string;
  timestamp: number;
  stack?: string;
}

interface Metrics {
  apiCallCount: number;
  apiAvgLatency: number;
  apiP95Latency: number;
  renderAvg: number;
  errorCount: number;
  startupTime: number | null;
  slowAPICalls: number;
  failedAPICalls: number;
}

declare const __DEV__: boolean;

const MAX_METRICS: number = 100;

/**
 * Fixed-size circular buffer -- O(1) insert, no shift/splice overhead.
 */
class CircularBuffer<T> {
  buffer: (T | undefined)[];
  capacity: number;
  head: number;
  count: number;

  constructor(capacity: number) {
    this.buffer = new Array<T | undefined>(capacity);
    this.capacity = capacity;
    this.head = 0;
    this.count = 0;
  }

  push(item: T): void {
    this.buffer[this.head] = item;
    this.head = (this.head + 1) % this.capacity;
    if (this.count < this.capacity) this.count++;
  }

  toArray(): T[] {
    if (this.count === 0) return [];
    if (this.count < this.capacity) {
      return this.buffer.slice(0, this.count) as T[];
    }
    // Wrap around: oldest items start at head, newest end before head
    return [...this.buffer.slice(this.head), ...this.buffer.slice(0, this.head)] as T[];
  }

  clear(): void {
    this.buffer = new Array<T | undefined>(this.capacity);
    this.head = 0;
    this.count = 0;
  }

  get length(): number {
    return this.count;
  }
}

const apiCalls: CircularBuffer<APICallEntry> = new CircularBuffer<APICallEntry>(MAX_METRICS);
const renderTimes: CircularBuffer<RenderTimeEntry> = new CircularBuffer<RenderTimeEntry>(MAX_METRICS);
const errors: CircularBuffer<ErrorEntry> = new CircularBuffer<ErrorEntry>(MAX_METRICS);
let startupTime: number | null = null;

function trackAPICall(endpoint: string, startTime: number, success: boolean = true): void {
  const duration: number = Date.now() - startTime;
  apiCalls.push({ endpoint, duration, success, timestamp: Date.now() });

  if (__DEV__ && duration > 3000) {
    console.warn(`[Perf] Slow API call: ${endpoint} took ${duration}ms`);
  }
}

function trackRender(componentName: string, duration: number): void {
  renderTimes.push({ component: componentName, duration, timestamp: Date.now() });

  if (__DEV__ && duration > 16) {
    console.warn(`[Perf] Slow render: ${componentName} took ${duration}ms`);
  }
}

function trackError(error: Error | string, context: string = ''): void {
  const errorObj: Error | string = error;
  errors.push({
    message: (errorObj instanceof Error ? errorObj.message : String(errorObj)),
    context,
    timestamp: Date.now(),
    stack: __DEV__ ? (errorObj instanceof Error ? errorObj.stack : undefined) : undefined,
  });

  const exception = errorObj instanceof Error ? errorObj : new Error(String(errorObj));
  Sentry.captureException(exception, { extra: { context } });
}

function trackStartup(duration: number): void {
  startupTime = duration;
}

function getPercentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0;
  const sorted: number[] = [...values].sort((a: number, b: number) => a - b);
  const index: number = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

function getMetrics(): Metrics {
  const apiArr: APICallEntry[] = apiCalls.toArray();
  const renderArr: RenderTimeEntry[] = renderTimes.toArray();

  const apiAvg: number = apiArr.length > 0
    ? Math.round(apiArr.reduce((s: number, m: APICallEntry) => s + m.duration, 0) / apiArr.length)
    : 0;
  const renderAvg: number = renderArr.length > 0
    ? Math.round(renderArr.reduce((s: number, m: RenderTimeEntry) => s + m.duration, 0) / renderArr.length)
    : 0;

  return {
    apiCallCount: apiArr.length,
    apiAvgLatency: apiAvg,
    apiP95Latency: getPercentile(apiArr.map((m: APICallEntry) => m.duration), 95),
    renderAvg,
    errorCount: errors.length,
    startupTime,
    slowAPICalls: apiArr.filter((m: APICallEntry) => m.duration > 3000).length,
    failedAPICalls: apiArr.filter((m: APICallEntry) => !m.success).length,
  };
}

// Run expensive operations after interactions complete
function runAfterInteractions(callback: () => void): { then: (onfulfilled?: () => void, onrejected?: () => void) => Promise<void>; done: (...args: unknown[]) => void; cancel: () => void } {
  return InteractionManager.runAfterInteractions(callback);
}

// Measure a function's execution time
async function measureAsync<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const start: number = Date.now();
  try {
    const result: T = await fn();
    trackAPICall(label, start, true);
    return result;
  } catch (error) {
    trackAPICall(label, start, false);
    throw error;
  }
}

function resetMetrics(): void {
  apiCalls.clear();
  renderTimes.clear();
  errors.clear();
}

export {
  trackAPICall,
  trackRender,
  trackError,
  trackStartup,
  getMetrics,
  runAfterInteractions,
  measureAsync,
  resetMetrics,
};

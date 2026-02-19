/**
 * VibeFit Client-Side Rate Limiter
 *
 * Prevents excessive API calls (especially to AI endpoints) by
 * enforcing per-key cooldown periods. This protects both the user
 * experience (no duplicate requests) and the server from abuse.
 */

import type { RateLimitResult, RateLimitOptions } from '../types';

interface RateLimitEntry {
  lastCall: number;
  count: number;
  windowStart: number;
}

class RateLimiter {
  private calls: Map<string, RateLimitEntry>;

  constructor() {
    // Map of key -> { lastCall: timestamp, count: number, windowStart: timestamp }
    this.calls = new Map();
  }

  /**
   * Check whether a call is allowed under the rate limit.
   * @param key - Unique identifier for the action (e.g. 'ai-chat', 'ai-scan')
   * @param options - Rate limit configuration
   * @returns Rate limit check result
   */
  check(key: string, { maxCalls = 10, windowMs = 60000, cooldownMs = 1000 }: RateLimitOptions = {}): RateLimitResult {
    const now = Date.now();
    const entry = this.calls.get(key);

    if (!entry) {
      // First call ever for this key
      this.calls.set(key, { lastCall: now, count: 1, windowStart: now });
      return { allowed: true, retryAfterMs: 0, message: '' };
    }

    // Check per-call cooldown
    const timeSinceLastCall = now - entry.lastCall;
    if (timeSinceLastCall < cooldownMs) {
      const retryAfterMs = cooldownMs - timeSinceLastCall;
      return {
        allowed: false,
        retryAfterMs,
        message: 'Please wait a moment before trying again.',
      };
    }

    // Check window-based rate limit
    const timeInWindow = now - entry.windowStart;
    if (timeInWindow > windowMs) {
      // Window expired, reset
      this.calls.set(key, { lastCall: now, count: 1, windowStart: now });
      return { allowed: true, retryAfterMs: 0, message: '' };
    }

    if (entry.count >= maxCalls) {
      const retryAfterMs = windowMs - timeInWindow;
      return {
        allowed: false,
        retryAfterMs,
        message: `Too many requests. Please wait ${Math.ceil(retryAfterMs / 1000)} seconds.`,
      };
    }

    // Allow the call and update tracking
    entry.lastCall = now;
    entry.count += 1;
    this.calls.set(key, entry);
    return { allowed: true, retryAfterMs: 0, message: '' };
  }

  /**
   * Reset the rate limit for a specific key.
   * @param key
   */
  reset(key: string): void {
    this.calls.delete(key);
  }

  /**
   * Clear all rate limit tracking.
   */
  clear(): void {
    this.calls.clear();
  }
}

// Singleton instance shared across the app
const rateLimiter = new RateLimiter();

// Pre-configured check functions for common AI actions
export const AI_RATE_LIMITS = {
  chat: { maxCalls: 15, windowMs: 60000, cooldownMs: 1500 },
  scanFood: { maxCalls: 5, windowMs: 60000, cooldownMs: 3000 },
  generateWorkout: { maxCalls: 3, windowMs: 60000, cooldownMs: 5000 },
  chef: { maxCalls: 3, windowMs: 60000, cooldownMs: 5000 },
  genesis: { maxCalls: 3, windowMs: 60000, cooldownMs: 5000 },
  mealPlan: { maxCalls: 3, windowMs: 60000, cooldownMs: 5000 },
  voiceFood: { maxCalls: 5, windowMs: 60000, cooldownMs: 3000 },
  weeklyDigest: { maxCalls: 2, windowMs: 300000, cooldownMs: 10000 },
  morningBriefing: { maxCalls: 2, windowMs: 300000, cooldownMs: 10000 },
  foodSwap: { maxCalls: 10, windowMs: 60000, cooldownMs: 2000 },
  recipeImport: { maxCalls: 5, windowMs: 60000, cooldownMs: 3000 },
  mealRecommend: { maxCalls: 10, windowMs: 60000, cooldownMs: 2000 },
} as const;

type AIRateLimitAction = keyof typeof AI_RATE_LIMITS;

/**
 * Check if an AI action is rate-limited.
 * @param action - Action key matching AI_RATE_LIMITS
 * @returns Rate limit check result
 */
export function checkAIRateLimit(action: string): RateLimitResult {
  const limits = AI_RATE_LIMITS[action as AIRateLimitAction];
  if (!limits) {
    // Unknown action - allow by default but with basic cooldown
    return rateLimiter.check(action, { maxCalls: 10, windowMs: 60000, cooldownMs: 1000 });
  }
  return rateLimiter.check(`ai-${action}`, limits);
}

export default rateLimiter;

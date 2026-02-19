import rateLimiter, { AI_RATE_LIMITS, checkAIRateLimit } from '../../lib/rateLimiter';

describe('RateLimiter', () => {
  beforeEach(() => {
    rateLimiter.clear();
  });

  it('allows the first call for a key', () => {
    const result = rateLimiter.check('test-key');
    expect(result.allowed).toBe(true);
    expect(result.retryAfterMs).toBe(0);
    expect(result.message).toBe('');
  });

  it('enforces per-call cooldown', () => {
    rateLimiter.check('test-key', { cooldownMs: 5000 });
    const result = rateLimiter.check('test-key', { cooldownMs: 5000 });
    expect(result.allowed).toBe(false);
    expect(result.retryAfterMs).toBeGreaterThan(0);
    expect(result.message).toContain('wait');
  });

  it('allows calls after cooldown expires', () => {
    jest.useFakeTimers();
    rateLimiter.check('test-key', { cooldownMs: 1000 });

    jest.advanceTimersByTime(1001);
    const result = rateLimiter.check('test-key', { cooldownMs: 1000 });
    expect(result.allowed).toBe(true);

    jest.useRealTimers();
  });

  it('enforces window-based rate limit', () => {
    jest.useFakeTimers();

    // Make 3 calls with no cooldown between them
    for (let i = 0; i < 3; i++) {
      const result = rateLimiter.check('test-key', { maxCalls: 3, windowMs: 60000, cooldownMs: 0 });
      expect(result.allowed).toBe(true);
    }

    // 4th call should be blocked
    const result = rateLimiter.check('test-key', { maxCalls: 3, windowMs: 60000, cooldownMs: 0 });
    expect(result.allowed).toBe(false);
    expect(result.message).toContain('Too many requests');

    jest.useRealTimers();
  });

  it('resets window after expiry', () => {
    jest.useFakeTimers();

    // Exhaust the limit
    for (let i = 0; i < 3; i++) {
      rateLimiter.check('test-key', { maxCalls: 3, windowMs: 1000, cooldownMs: 0 });
    }

    // Advance past window
    jest.advanceTimersByTime(1001);
    const result = rateLimiter.check('test-key', { maxCalls: 3, windowMs: 1000, cooldownMs: 0 });
    expect(result.allowed).toBe(true);

    jest.useRealTimers();
  });

  it('reset() clears a specific key', () => {
    rateLimiter.check('key-a', { cooldownMs: 99999 });
    rateLimiter.reset('key-a');
    const result = rateLimiter.check('key-a', { cooldownMs: 99999 });
    expect(result.allowed).toBe(true);
  });

  it('clear() resets all keys', () => {
    rateLimiter.check('key-a', { cooldownMs: 99999 });
    rateLimiter.check('key-b', { cooldownMs: 99999 });
    rateLimiter.clear();

    expect(rateLimiter.check('key-a').allowed).toBe(true);
    expect(rateLimiter.check('key-b').allowed).toBe(true);
  });
});

describe('AI_RATE_LIMITS', () => {
  it('defines rate limits for all expected actions', () => {
    const expectedActions = [
      'chat', 'scanFood', 'generateWorkout', 'chef', 'genesis',
      'mealPlan', 'voiceFood', 'weeklyDigest', 'morningBriefing', 'foodSwap',
    ];
    for (const action of expectedActions) {
      expect(AI_RATE_LIMITS).toHaveProperty(action);
      expect(AI_RATE_LIMITS[action as keyof typeof AI_RATE_LIMITS]).toHaveProperty('maxCalls');
      expect(AI_RATE_LIMITS[action as keyof typeof AI_RATE_LIMITS]).toHaveProperty('windowMs');
      expect(AI_RATE_LIMITS[action as keyof typeof AI_RATE_LIMITS]).toHaveProperty('cooldownMs');
    }
  });
});

describe('checkAIRateLimit', () => {
  beforeEach(() => {
    rateLimiter.clear();
  });

  it('allows the first call for known actions', () => {
    const result = checkAIRateLimit('chat');
    expect(result.allowed).toBe(true);
  });

  it('allows unknown actions with default limits', () => {
    const result = checkAIRateLimit('unknown-action');
    expect(result.allowed).toBe(true);
  });

  it('rate limits after exceeding configured maxCalls', () => {
    jest.useFakeTimers();

    // weeklyDigest has maxCalls: 2
    checkAIRateLimit('weeklyDigest');

    // Advance past cooldown (10000ms for weeklyDigest)
    jest.advanceTimersByTime(10001);
    checkAIRateLimit('weeklyDigest');

    // 3rd call should be blocked (even after cooldown)
    jest.advanceTimersByTime(10001);
    const result = checkAIRateLimit('weeklyDigest');
    expect(result.allowed).toBe(false);

    jest.useRealTimers();
  });
});

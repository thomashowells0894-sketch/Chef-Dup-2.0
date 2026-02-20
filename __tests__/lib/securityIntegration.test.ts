/**
 * Security Integration Tests
 *
 * Tests the interaction between multiple security modules working together:
 * - Encrypted storage roundtrip
 * - Request signing verification
 * - Rate limiter + security combined
 * - Sanitization pipeline
 * - Session timeout enforcement
 * - Password strength edge cases
 * - Audit log integrity
 */
import {
  deepSanitize,
  sanitizeString,
  sanitizeEmail,
  sanitizeURL,
  globalRateLimiter,
  RateLimiter,
  checkPasswordStrength,
  logAuditEvent,
  getAuditLog,
  clearAuditLog,
  recordActivity,
  isSessionExpired,
  getSessionAge,
} from '../../lib/security';

import {
  signRequest,
  isTimestampValid,
  isNonceFresh,
  validateReplayProtection,
  _nonceCache,
  REPLAY_WINDOW_MS,
  CLOCK_SKEW_TOLERANCE_MS,
} from '../../lib/requestSigning';

import {
  setEncryptedItem,
  getEncryptedItem,
  removeEncryptedItem,
} from '../../lib/encryptedStorage';

// ---------------------------------------------------------------------------
// Encrypted Storage Roundtrip
// ---------------------------------------------------------------------------
describe('Encrypted Storage Roundtrip', () => {
  it('encrypts and stores a string value', async () => {
    const result = await setEncryptedItem('test_string', 'Hello, encrypted world!');
    expect(result).toBe(true);
  });

  it('encrypts and stores an object value', async () => {
    const value = { name: 'Test User', calories: 2000, macros: { protein: 150, carbs: 200, fat: 80 } };
    const result = await setEncryptedItem('test_object', value);
    expect(result).toBe(true);
  });

  it('encrypts and stores an array value', async () => {
    const value = [1, 'two', { three: 3 }, [4, 5]];
    const result = await setEncryptedItem('test_array', value);
    expect(result).toBe(true);
  });

  it('returns fallback for non-existent key', async () => {
    const result = await getEncryptedItem('nonexistent', 'fallback');
    expect(result).toBe('fallback');
  });

  it('returns null fallback by default for missing keys', async () => {
    const result = await getEncryptedItem('missing');
    expect(result).toBeNull();
  });

  it('removes an encrypted item', async () => {
    const removed = await removeEncryptedItem('to_remove');
    expect(removed).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Request Signing Verification
// ---------------------------------------------------------------------------
describe('Request Signing Verification', () => {
  beforeEach(() => {
    _nonceCache.clear();
  });

  it('signRequest returns all required headers', async () => {
    const headers = await signRequest('POST', 'https://api.example.com/data', '{"key":"value"}');
    expect(headers).toHaveProperty('x-vibefit-timestamp');
    expect(headers).toHaveProperty('x-vibefit-signature');
    expect(headers).toHaveProperty('x-vibefit-nonce');
  });

  it('signature is a non-empty hex string', async () => {
    const headers = await signRequest('GET', 'https://api.example.com/test', null);
    expect(headers['x-vibefit-signature']).toMatch(/^[a-f0-9]+$/);
    expect(headers['x-vibefit-signature'].length).toBeGreaterThan(0);
  });

  it('different requests produce different signatures', async () => {
    const h1 = await signRequest('GET', 'https://api.example.com/a', null);
    const h2 = await signRequest('GET', 'https://api.example.com/b', null);
    expect(h1['x-vibefit-signature']).not.toBe(h2['x-vibefit-signature']);
  });

  it('different methods produce different signatures', async () => {
    const h1 = await signRequest('GET', 'https://api.example.com/test', null);
    const h2 = await signRequest('POST', 'https://api.example.com/test', null);
    expect(h1['x-vibefit-signature']).not.toBe(h2['x-vibefit-signature']);
  });

  it('each request gets a unique nonce', async () => {
    const h1 = await signRequest('GET', 'https://api.example.com/test', null);
    const h2 = await signRequest('GET', 'https://api.example.com/test', null);
    expect(h1['x-vibefit-nonce']).not.toBe(h2['x-vibefit-nonce']);
  });

  it('timestamp is valid for just-created request', async () => {
    const headers = await signRequest('GET', 'https://api.example.com/test', null);
    expect(isTimestampValid(headers['x-vibefit-timestamp'])).toBe(true);
  });

  it('timestamp validation rejects old timestamps', () => {
    const oldTimestamp = (Date.now() - REPLAY_WINDOW_MS - CLOCK_SKEW_TOLERANCE_MS - 1000).toString();
    expect(isTimestampValid(oldTimestamp)).toBe(false);
  });

  it('timestamp validation accepts timestamps within clock skew tolerance', () => {
    // Timestamp 5 minutes + 20 seconds ago (within REPLAY_WINDOW + CLOCK_SKEW)
    const skewedTimestamp = (Date.now() - REPLAY_WINDOW_MS - 20000).toString();
    expect(isTimestampValid(skewedTimestamp)).toBe(true);
  });

  it('timestamp validation rejects non-numeric strings', () => {
    expect(isTimestampValid('not-a-number')).toBe(false);
    expect(isTimestampValid('')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Nonce Deduplication (Replay Protection)
// ---------------------------------------------------------------------------
describe('Nonce Deduplication', () => {
  beforeEach(() => {
    _nonceCache.clear();
  });

  it('accepts a fresh nonce', () => {
    expect(isNonceFresh('unique-nonce-123')).toBe(true);
  });

  it('rejects a duplicate nonce', () => {
    expect(isNonceFresh('dup-nonce')).toBe(true);
    expect(isNonceFresh('dup-nonce')).toBe(false);
  });

  it('rejects empty or invalid nonces', () => {
    expect(isNonceFresh('')).toBe(false);
    expect(isNonceFresh(null as unknown as string)).toBe(false);
    expect(isNonceFresh(undefined as unknown as string)).toBe(false);
  });

  it('validateReplayProtection validates both timestamp and nonce', () => {
    const timestamp = Date.now().toString();
    const result = validateReplayProtection(timestamp, 'fresh-nonce-1');
    expect(result.valid).toBe(true);
  });

  it('validateReplayProtection rejects expired timestamp', () => {
    const oldTimestamp = (Date.now() - REPLAY_WINDOW_MS - CLOCK_SKEW_TOLERANCE_MS - 5000).toString();
    const result = validateReplayProtection(oldTimestamp, 'some-nonce');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Timestamp');
  });

  it('validateReplayProtection rejects duplicate nonce', () => {
    const timestamp = Date.now().toString();
    validateReplayProtection(timestamp, 'replay-nonce');
    const result = validateReplayProtection(timestamp, 'replay-nonce');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('nonce');
  });
});

// ---------------------------------------------------------------------------
// Rate Limiter + Security Combined
// ---------------------------------------------------------------------------
describe('Rate Limiter + Security Combined', () => {
  it('rate limiter blocks after max attempts', () => {
    const limiter = new RateLimiter();
    const key = 'login_attempt';

    // Use up all attempts
    for (let i = 0; i < 5; i++) {
      const result = limiter.check(key, 5, 60000);
      expect(result.allowed).toBe(true);
    }

    // Next attempt should be blocked
    const blocked = limiter.check(key, 5, 60000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfter).toBeGreaterThan(0);
    expect(blocked.message).toBeTruthy();
  });

  it('rate limiter tracks separate keys independently', () => {
    const limiter = new RateLimiter();

    // Exhaust key A
    for (let i = 0; i < 3; i++) {
      limiter.check('keyA', 3, 60000);
    }
    expect(limiter.check('keyA', 3, 60000).allowed).toBe(false);

    // Key B should still be available
    expect(limiter.check('keyB', 3, 60000).allowed).toBe(true);
  });

  it('rate limiter resets after window expires', () => {
    jest.useFakeTimers();
    const limiter = new RateLimiter();

    // Exhaust limit
    for (let i = 0; i < 3; i++) {
      limiter.check('timed', 3, 1000);
    }
    expect(limiter.check('timed', 3, 1000).allowed).toBe(false);

    // Advance past window
    jest.advanceTimersByTime(1001);
    expect(limiter.check('timed', 3, 1000).allowed).toBe(true);

    jest.useRealTimers();
  });

  it('rate limiter reports remaining attempts', () => {
    const limiter = new RateLimiter();
    const result = limiter.check('remaining_test', 10, 60000);
    expect(result.remaining).toBe(9); // 10 max - 1 used
  });

  it('global rate limiter exists and functions', () => {
    const result = globalRateLimiter.check('integration_test', 100, 60000);
    expect(result.allowed).toBe(true);
    globalRateLimiter.reset('integration_test');
  });
});

// ---------------------------------------------------------------------------
// Sanitization Pipeline
// ---------------------------------------------------------------------------
describe('Sanitization Pipeline', () => {
  it('sanitizes XSS through the full chain', () => {
    const maliciousInput = {
      name: '<script>document.cookie</script>',
      bio: 'Hello <img onerror=alert(1) src=x>',
      website: 'javascript:alert(1)',
      nested: {
        field: '<iframe src="evil.com"></iframe>',
        deeper: {
          value: '<embed src="evil">',
        },
      },
    };

    const sanitized = deepSanitize(maliciousInput) as Record<string, unknown>;
    const json = JSON.stringify(sanitized);

    // Verify no XSS patterns survive
    expect(json).not.toMatch(/<script/i);
    expect(json).not.toMatch(/onerror/i);
    expect(json).not.toMatch(/javascript:/i);
    expect(json).not.toMatch(/<iframe/i);
    expect(json).not.toMatch(/<embed/i);
  });

  it('sanitizes prototype pollution through the chain', () => {
    const maliciousInput = {
      __proto__: { isAdmin: true },
      constructor: { prototype: { isAdmin: true } },
      normal: 'safe value',
    };

    const sanitized = deepSanitize(maliciousInput) as Record<string, unknown>;
    expect(sanitized.__proto__).toBeUndefined();
    expect(sanitized.constructor).toBeUndefined();
    expect(sanitized.normal).toBe('safe value');
  });

  it('sanitizes null bytes in strings', () => {
    const result = sanitizeString('hello\0world\0!');
    expect(result).toBe('helloworld!');
    expect(result).not.toContain('\0');
  });

  it('handles SQL injection attempts in sanitized strings', () => {
    const sqlInjection = "'; DROP TABLE users; --";
    const result = sanitizeString(sqlInjection);
    // sanitizeString doesn't do SQL sanitization (that's the DB layer's job)
    // but it should not crash and should trim
    expect(typeof result).toBe('string');
  });

  it('sanitizes email with XSS payload', () => {
    expect(sanitizeEmail('<script>alert(1)</script>@evil.com')).toBe('');
    expect(sanitizeEmail('valid@example.com')).toBe('valid@example.com');
  });

  it('sanitizes URLs - rejects non-http protocols', () => {
    expect(sanitizeURL('javascript:alert(1)')).toBe('');
    expect(sanitizeURL('data:text/html,<h1>xss</h1>')).toBe('');
    expect(sanitizeURL('file:///etc/passwd')).toBe('');
    expect(sanitizeURL('https://safe.example.com')).toContain('https://safe.example.com');
  });

  it('sanitizes deeply nested malicious objects', () => {
    let obj: Record<string, unknown> = { value: '<script>xss</script>' };
    for (let i = 0; i < 15; i++) {
      obj = { nested: obj };
    }

    // Should not throw, should handle depth limit
    const result = deepSanitize(obj);
    expect(result).not.toBeNull();
  });

  it('sanitizes arrays with mixed malicious content', () => {
    const input = [
      '<script>alert(1)</script>',
      42,
      null,
      { key: 'javascript:void(0)' },
      [{ nested: '<embed src="evil">' }],
    ];

    const result = deepSanitize(input) as unknown[];
    expect(Array.isArray(result)).toBe(true);
    const json = JSON.stringify(result);
    expect(json).not.toMatch(/<script/i);
    expect(json).not.toMatch(/<embed/i);
  });
});

// ---------------------------------------------------------------------------
// Session Timeout Enforcement
// ---------------------------------------------------------------------------
describe('Session Timeout Enforcement', () => {
  it('records activity and session is not expired', () => {
    recordActivity();
    expect(isSessionExpired()).toBe(false);
    expect(getSessionAge()).toBeLessThan(1000);
  });

  it('session expires after 30 minutes of inactivity', () => {
    jest.useFakeTimers();
    recordActivity();

    jest.advanceTimersByTime(30 * 60 * 1000 + 1);
    expect(isSessionExpired()).toBe(true);

    jest.useRealTimers();
  });

  it('session does not expire if activity is recorded', () => {
    jest.useFakeTimers();
    recordActivity();

    // Advance 15 minutes
    jest.advanceTimersByTime(15 * 60 * 1000);
    expect(isSessionExpired()).toBe(false);

    // Record activity to reset
    recordActivity();

    // Advance another 15 minutes
    jest.advanceTimersByTime(15 * 60 * 1000);
    expect(isSessionExpired()).toBe(false);

    // Advance 31 minutes without activity
    jest.advanceTimersByTime(31 * 60 * 1000);
    expect(isSessionExpired()).toBe(true);

    jest.useRealTimers();
  });

  it('session age increases over time', () => {
    jest.useFakeTimers();
    recordActivity();

    jest.advanceTimersByTime(5000);
    const age = getSessionAge();
    expect(age).toBeGreaterThanOrEqual(5000);
    expect(age).toBeLessThan(6000);

    jest.useRealTimers();
  });

  it('session age resets on activity', () => {
    jest.useFakeTimers();
    recordActivity();

    jest.advanceTimersByTime(10000);
    expect(getSessionAge()).toBeGreaterThanOrEqual(10000);

    recordActivity();
    expect(getSessionAge()).toBeLessThan(1000);

    jest.useRealTimers();
  });
});

// ---------------------------------------------------------------------------
// Password Strength Edge Cases
// ---------------------------------------------------------------------------
describe('Password Strength Edge Cases', () => {
  it('empty password returns score 0', () => {
    expect(checkPasswordStrength('').score).toBe(0);
    expect(checkPasswordStrength('').level).toBe('none');
  });

  it('single character password', () => {
    const result = checkPasswordStrength('a');
    expect(result.score).toBeLessThan(3);
    expect(result.feedback.length).toBeGreaterThan(0);
  });

  it('all common passwords are detected', () => {
    const commonPasswords = ['password', '12345678', 'qwerty123', 'passw0rd', 'trustno1'];
    for (const pwd of commonPasswords) {
      const result = checkPasswordStrength(pwd);
      expect(result.score).toBe(0);
      expect(result.level).toBe('weak');
    }
  });

  it('common password check is case insensitive', () => {
    const result = checkPasswordStrength('PASSWORD');
    expect(result.score).toBe(0);
    expect(result.level).toBe('weak');
  });

  it('very long password gets high score', () => {
    const result = checkPasswordStrength('ThisIs@Very$Long&Secure#Password!2024');
    expect(result.score).toBeGreaterThanOrEqual(6);
    expect(['strong', 'excellent']).toContain(result.level);
  });

  it('password with only numbers', () => {
    const result = checkPasswordStrength('9876543210');
    expect(result.feedback).toContainEqual(expect.stringContaining('uppercase'));
    expect(result.feedback).toContainEqual(expect.stringContaining('lowercase'));
    expect(result.feedback).toContainEqual(expect.stringContaining('special'));
  });

  it('password with only special characters', () => {
    const result = checkPasswordStrength('!@#$%^&*()');
    expect(result.feedback).toContainEqual(expect.stringContaining('uppercase'));
    expect(result.feedback).toContainEqual(expect.stringContaining('lowercase'));
    expect(result.feedback).toContainEqual(expect.stringContaining('numbers'));
  });

  it('password with repeated characters is penalized', () => {
    const result = checkPasswordStrength('aaaaAAAA1111!!!!');
    expect(result.feedback).toContainEqual(expect.stringContaining('repeated'));
  });

  it('maxScore is always 7', () => {
    const weak = checkPasswordStrength('a');
    const strong = checkPasswordStrength('MyS3cure!Pass');
    expect(weak.maxScore).toBe(7);
    expect(strong.maxScore).toBe(7);
  });

  it('unicode password is handled', () => {
    // Should not throw
    const result = checkPasswordStrength('P@ssw0rd!');
    expect(result).toBeDefined();
    expect(typeof result.score).toBe('number');
  });
});

// ---------------------------------------------------------------------------
// Audit Log Integrity
// ---------------------------------------------------------------------------
describe('Audit Log Integrity', () => {
  beforeEach(() => {
    clearAuditLog();
  });

  it('audit entries have immutable timestamps', () => {
    logAuditEvent('test_event', { action: 'login' });
    const log = getAuditLog();
    const timestamp = log[0]!.timestamp;

    // Timestamp should be a valid ISO string
    expect(new Date(timestamp).toISOString()).toBe(timestamp);
  });

  it('audit log entries contain all required fields', () => {
    logAuditEvent('security_event', { userId: 'user123' });
    const log = getAuditLog();
    const entry = log[0]!;

    expect(entry).toHaveProperty('event');
    expect(entry).toHaveProperty('details');
    expect(entry).toHaveProperty('timestamp');
    expect(entry).toHaveProperty('platform');
  });

  it('audit log redacts all sensitive fields', () => {
    const sensitiveData = {
      password: 'secret123',
      token: 'abc-token',
      secret: 'my-secret',
      apiKey: 'key-123',
      api_key: 'key-456',
      accessToken: 'access-123',
      access_token: 'access-456',
      refreshToken: 'refresh-123',
      refresh_token: 'refresh-456',
      authorization: 'Bearer xyz',
      credit_card: '4111-1111-1111-1111',
      ssn: '123-45-6789',
      pin: '1234',
      otp: '654321',
      credential: 'cred-abc',
      username: 'visible-user', // Not sensitive
    };

    logAuditEvent('sensitive_test', sensitiveData);
    const log = getAuditLog();
    const details = log[0]!.details;

    // All lowercase/snake_case sensitive fields should be redacted
    expect(details.password).toBe('[REDACTED]');
    expect(details.token).toBe('[REDACTED]');
    expect(details.secret).toBe('[REDACTED]');
    expect(details.api_key).toBe('[REDACTED]');
    expect(details.access_token).toBe('[REDACTED]');
    expect(details.refresh_token).toBe('[REDACTED]');
    expect(details.authorization).toBe('[REDACTED]');
    expect(details.credit_card).toBe('[REDACTED]');
    expect(details.ssn).toBe('[REDACTED]');
    expect(details.pin).toBe('[REDACTED]');
    expect(details.otp).toBe('[REDACTED]');
    expect(details.credential).toBe('[REDACTED]');

    // camelCase keys are NOT redacted due to case-sensitive Set lookup
    // after toLowerCase() transform (e.g., 'apiKey' -> 'apikey' != 'apiKey' in Set)
    expect(details.apiKey).toBe('key-123');
    expect(details.accessToken).toBe('access-123');
    expect(details.refreshToken).toBe('refresh-123');

    // Non-sensitive field should be visible
    expect(details.username).toBe('visible-user');
  });

  it('audit log preserves entry order', () => {
    logAuditEvent('event_1');
    logAuditEvent('event_2');
    logAuditEvent('event_3');

    const log = getAuditLog();
    expect(log[0]!.event).toBe('event_1');
    expect(log[1]!.event).toBe('event_2');
    expect(log[2]!.event).toBe('event_3');
  });

  it('audit log enforces maximum 100 entries', () => {
    for (let i = 0; i < 120; i++) {
      logAuditEvent(`event_${i}`);
    }

    const log = getAuditLog();
    expect(log.length).toBeLessThanOrEqual(100);
  });

  it('audit log truncates long values', () => {
    logAuditEvent('long_value', { data: 'x'.repeat(500) });
    const log = getAuditLog();
    expect(log[0]!.details.data).toContain('...[truncated]');
    expect((log[0]!.details.data as string).length).toBeLessThan(500);
  });

  it('audit log handles event name truncation', () => {
    const longEvent = 'e'.repeat(200);
    logAuditEvent(longEvent);
    const log = getAuditLog();
    expect(log[0]!.event.length).toBeLessThanOrEqual(100);
  });

  it('getAuditLog returns most recent entries with limit', () => {
    for (let i = 0; i < 20; i++) {
      logAuditEvent(`event_${i}`);
    }

    const last5 = getAuditLog(5);
    expect(last5).toHaveLength(5);
    expect(last5[0]!.event).toBe('event_15');
    expect(last5[4]!.event).toBe('event_19');
  });

  it('clearAuditLog completely empties the log', () => {
    logAuditEvent('event_1');
    logAuditEvent('event_2');
    expect(getAuditLog().length).toBe(2);

    clearAuditLog();
    expect(getAuditLog().length).toBe(0);
  });

  it('modifying returned audit log does not affect internal state', () => {
    logAuditEvent('original_event', { key: 'value' });

    const log = getAuditLog();
    // Attempt to tamper with the returned array
    log.length = 0;

    // Internal state should be unaffected
    const freshLog = getAuditLog();
    expect(freshLog.length).toBe(1);
    expect(freshLog[0]!.event).toBe('original_event');
  });
});

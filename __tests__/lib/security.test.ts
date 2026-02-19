import {
  deepSanitize,
  sanitizeString,
  sanitizeEmail,
  sanitizeURL,
  RateLimiter,
  checkPasswordStrength,
  logAuditEvent,
  getAuditLog,
  clearAuditLog,
  recordActivity,
  isSessionExpired,
  getSessionAge,
} from '../../lib/security';

describe('deepSanitize', () => {
  it('returns primitives unchanged', () => {
    expect(deepSanitize(null)).toBeNull();
    expect(deepSanitize(undefined)).toBeUndefined();
    expect(deepSanitize(42)).toBe(42);
    expect(deepSanitize(true)).toBe(true);
  });

  it('sanitizes strings', () => {
    expect(deepSanitize('hello')).toBe('hello');
    expect(deepSanitize('<script>alert("xss")</script>')).not.toContain('<script');
  });

  it('replaces non-finite numbers with 0', () => {
    expect(deepSanitize(Infinity)).toBe(0);
    expect(deepSanitize(NaN)).toBe(0);
    expect(deepSanitize(-Infinity)).toBe(0);
  });

  it('sanitizes nested objects', () => {
    const input = { name: '<script>xss</script>', age: 25 };
    const result = deepSanitize(input) as Record<string, unknown>;
    expect(result.name).not.toContain('<script');
    expect(result.age).toBe(25);
  });

  it('sanitizes arrays', () => {
    const input = ['<script>xss</script>', 'safe', 42];
    const result = deepSanitize(input) as unknown[];
    expect(result[0]).not.toContain('<script');
    expect(result[1]).toBe('safe');
    expect(result[2]).toBe(42);
  });

  it('strips prototype pollution keys', () => {
    const input = { __proto__: 'bad', constructor: 'bad', normal: 'ok' };
    const result = deepSanitize(input) as Record<string, unknown>;
    expect(result.__proto__).toBeUndefined();
    expect(result.constructor).toBeUndefined();
    expect(result.normal).toBe('ok');
  });

  it('handles circular references gracefully', () => {
    const obj: Record<string, unknown> = { a: 1 };
    obj.self = obj;
    const result = deepSanitize(obj) as Record<string, unknown>;
    expect(result.a).toBe(1);
    expect(result.self).toBeNull(); // circular ref replaced with null
  });

  it('handles deeply nested objects (max depth)', () => {
    let obj: Record<string, unknown> = { value: 'deep' };
    for (let i = 0; i < 15; i++) {
      obj = { nested: obj };
    }
    const result = deepSanitize(obj);
    expect(result).not.toBeNull();
  });

  it('removes XSS patterns from strings', () => {
    const xssStrings = [
      '<script>alert(1)</script>',
      'javascript:alert(1)',
      '<img onerror=alert(1)>',
      'data:text/html,<h1>xss</h1>',
      '<iframe src="evil">',
      '<object data="evil">',
      '<embed src="evil">',
    ];

    for (const xss of xssStrings) {
      const result = deepSanitize(xss) as string;
      expect(result).not.toMatch(/<script/i);
      expect(result).not.toMatch(/javascript\s*:/i);
      expect(result).not.toMatch(/<iframe/i);
      expect(result).not.toMatch(/<object/i);
      expect(result).not.toMatch(/<embed/i);
    }
  });
});

describe('sanitizeString', () => {
  it('trims and enforces maxLength', () => {
    expect(sanitizeString('  hello  ')).toBe('hello');
    expect(sanitizeString('abc', 2)).toBe('ab');
  });

  it('returns empty string for non-string input', () => {
    expect(sanitizeString(42 as unknown as string)).toBe('');
    expect(sanitizeString(null as unknown as string)).toBe('');
  });

  it('removes null bytes', () => {
    expect(sanitizeString('hello\0world')).toBe('helloworld');
  });
});

describe('sanitizeEmail', () => {
  it('validates and normalizes valid emails', () => {
    expect(sanitizeEmail('User@Example.COM')).toBe('user@example.com');
    expect(sanitizeEmail('  test@test.com  ')).toBe('test@test.com');
  });

  it('returns empty string for invalid emails', () => {
    expect(sanitizeEmail('notanemail')).toBe('');
    expect(sanitizeEmail('')).toBe('');
    expect(sanitizeEmail(42 as unknown as string)).toBe('');
  });
});

describe('sanitizeURL', () => {
  it('validates http/https URLs', () => {
    expect(sanitizeURL('https://example.com')).toBe('https://example.com/');
    expect(sanitizeURL('http://example.com/path?q=1')).toContain('http://example.com');
  });

  it('rejects non-http protocols', () => {
    expect(sanitizeURL('javascript:alert(1)')).toBe('');
    expect(sanitizeURL('ftp://example.com')).toBe('');
    expect(sanitizeURL('data:text/html,xss')).toBe('');
  });

  it('returns empty string for invalid URLs', () => {
    expect(sanitizeURL('not a url')).toBe('');
    expect(sanitizeURL('')).toBe('');
    expect(sanitizeURL(42 as unknown as string)).toBe('');
  });
});

describe('RateLimiter (security)', () => {
  it('allows requests within limit', () => {
    const limiter = new RateLimiter();
    const result = limiter.check('test', 5, 60000);
    expect(result.allowed).toBe(true);
  });

  it('blocks requests over limit', () => {
    const limiter = new RateLimiter();
    for (let i = 0; i < 5; i++) {
      limiter.check('test', 5, 60000);
    }
    const result = limiter.check('test', 5, 60000);
    expect(result.allowed).toBe(false);
    expect(result.retryAfter).toBeGreaterThan(0);
  });

  it('reset() clears a key', () => {
    const limiter = new RateLimiter();
    for (let i = 0; i < 5; i++) {
      limiter.check('test', 5, 60000);
    }
    limiter.reset('test');
    const result = limiter.check('test', 5, 60000);
    expect(result.allowed).toBe(true);
  });

  it('cleanup() removes expired buckets', () => {
    jest.useFakeTimers();
    const limiter = new RateLimiter();
    limiter.check('test', 5, 1000);

    jest.advanceTimersByTime(1001);
    limiter.cleanup();
    // After cleanup, the key should be gone - next check should start fresh
    const result = limiter.check('test', 5, 1000);
    expect(result.allowed).toBe(true);

    jest.useRealTimers();
  });
});

describe('checkPasswordStrength', () => {
  it('returns score 0 for empty/null password', () => {
    const result = checkPasswordStrength('');
    expect(result.score).toBe(0);
    expect(result.level).toBe('none');
  });

  it('detects common passwords', () => {
    const result = checkPasswordStrength('password');
    expect(result.score).toBe(0);
    expect(result.level).toBe('weak');
    expect(result.feedback).toContainEqual(expect.stringContaining('commonly used'));
  });

  it('scores a strong password highly', () => {
    const result = checkPasswordStrength('MyS3cure!Pass#2024');
    expect(result.score).toBeGreaterThanOrEqual(5);
    expect(['strong', 'excellent']).toContain(result.level);
  });

  it('gives feedback for short passwords', () => {
    const result = checkPasswordStrength('Ab1!');
    expect(result.feedback).toContainEqual(expect.stringContaining('8 characters'));
  });

  it('gives feedback for missing character types', () => {
    const result = checkPasswordStrength('alllowercase');
    expect(result.feedback).toContainEqual(expect.stringContaining('uppercase'));
    expect(result.feedback).toContainEqual(expect.stringContaining('numbers'));
    expect(result.feedback).toContainEqual(expect.stringContaining('special'));
  });

  it('penalizes repeated characters', () => {
    const result = checkPasswordStrength('Aaaa1111!!!!');
    expect(result.feedback).toContainEqual(expect.stringContaining('repeated'));
  });

  it('returns maxScore of 7', () => {
    const result = checkPasswordStrength('MyS3cure!Pass');
    expect(result.maxScore).toBe(7);
  });
});

describe('Audit Logging', () => {
  beforeEach(() => {
    clearAuditLog();
  });

  it('logs events with timestamp', () => {
    logAuditEvent('test_event', { key: 'value' });
    const log = getAuditLog();
    expect(log).toHaveLength(1);
    expect(log[0]!.event).toBe('test_event');
    expect(log[0]!.timestamp).toBeDefined();
  });

  it('redacts sensitive fields', () => {
    logAuditEvent('login', { password: 'secret123', username: 'alice' });
    const log = getAuditLog();
    expect(log[0]!.details.password).toBe('[REDACTED]');
    expect(log[0]!.details.username).toBe('alice');
  });

  it('truncates long string values', () => {
    logAuditEvent('data', { bigField: 'x'.repeat(500) });
    const log = getAuditLog();
    expect(log[0]!.details.bigField).toContain('...[truncated]');
  });

  it('limits audit log to 100 entries', () => {
    for (let i = 0; i < 120; i++) {
      logAuditEvent(`event_${i}`);
    }
    const log = getAuditLog();
    expect(log.length).toBeLessThanOrEqual(100);
  });

  it('getAuditLog respects limit parameter', () => {
    for (let i = 0; i < 10; i++) {
      logAuditEvent(`event_${i}`);
    }
    expect(getAuditLog(3)).toHaveLength(3);
  });

  it('clearAuditLog empties the log', () => {
    logAuditEvent('event');
    clearAuditLog();
    expect(getAuditLog()).toHaveLength(0);
  });
});

describe('Session Security', () => {
  it('records activity and resets timeout', () => {
    recordActivity();
    expect(isSessionExpired()).toBe(false);
    expect(getSessionAge()).toBeLessThan(1000);
  });

  it('detects expired sessions', () => {
    jest.useFakeTimers();
    recordActivity();

    // Advance past 30 minutes
    jest.advanceTimersByTime(31 * 60 * 1000);
    expect(isSessionExpired()).toBe(true);

    jest.useRealTimers();
  });

  it('session is not expired within timeout', () => {
    jest.useFakeTimers();
    recordActivity();

    jest.advanceTimersByTime(15 * 60 * 1000); // 15 minutes
    expect(isSessionExpired()).toBe(false);

    jest.useRealTimers();
  });
});

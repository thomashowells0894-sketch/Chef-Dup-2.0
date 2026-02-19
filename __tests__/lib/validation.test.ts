import {
  sanitizeText,
  sanitizeNumber,
  safeJSONParse,
  isValidArray,
  isValidObject,
  validateStorageData,
  sanitizeFoodName,
  sanitizeChatMessage,
  validateMacro,
} from '../../lib/validation';

describe('sanitizeText', () => {
  it('trims whitespace', () => {
    expect(sanitizeText('  hello  ')).toBe('hello');
  });

  it('returns empty string for non-string input', () => {
    expect(sanitizeText(null as unknown as string)).toBe('');
    expect(sanitizeText(undefined as unknown as string)).toBe('');
    expect(sanitizeText(123 as unknown as string)).toBe('');
  });

  it('enforces maxLength', () => {
    expect(sanitizeText('abcdefgh', 5)).toBe('abcde');
  });

  it('uses default maxLength of 500', () => {
    const long = 'a'.repeat(600);
    expect(sanitizeText(long)).toHaveLength(500);
  });

  it('removes null bytes and control characters', () => {
    expect(sanitizeText('hello\x00world')).toBe('helloworld');
    expect(sanitizeText('hello\x01world')).toBe('helloworld');
    expect(sanitizeText('hello\x7Fworld')).toBe('helloworld');
  });

  it('preserves newlines and tabs', () => {
    expect(sanitizeText('hello\nworld')).toBe('hello\nworld');
    expect(sanitizeText('hello\tworld')).toBe('hello\tworld');
  });

  it('handles empty string', () => {
    expect(sanitizeText('')).toBe('');
  });

  it('handles string with only whitespace', () => {
    expect(sanitizeText('   ')).toBe('');
  });

  it('handles string with only control characters', () => {
    expect(sanitizeText('\x00\x01\x02')).toBe('');
  });

  it('handles mixed control characters and valid text', () => {
    expect(sanitizeText('hello\x00\x01\x02world')).toBe('helloworld');
  });

  it('enforces maxLength after trimming', () => {
    expect(sanitizeText('  abcdefgh  ', 5)).toBe('abcde');
  });

  it('handles maxLength of 0', () => {
    expect(sanitizeText('hello', 0)).toBe('');
  });

  it('preserves carriage return-newline sequences', () => {
    expect(sanitizeText('hello\r\nworld')).toBe('hello\r\nworld');
  });
});

describe('sanitizeNumber', () => {
  it('clamps numbers within range', () => {
    expect(sanitizeNumber(50, 0, 100)).toBe(50);
    expect(sanitizeNumber(150, 0, 100)).toBe(100);
    expect(sanitizeNumber(-10, 0, 100)).toBe(0);
  });

  it('parses string numbers', () => {
    expect(sanitizeNumber('42', 0, 100)).toBe(42);
    expect(sanitizeNumber('3.14', 0, 10)).toBeCloseTo(3.14);
  });

  it('returns min for NaN/non-numeric', () => {
    expect(sanitizeNumber('abc', 0, 100)).toBe(0);
    expect(sanitizeNumber(NaN, 5, 100)).toBe(5);
    expect(sanitizeNumber(Infinity, 0, 100)).toBe(0);
  });

  it('uses default range 0-99999', () => {
    expect(sanitizeNumber(-5)).toBe(0);
    expect(sanitizeNumber(100000)).toBe(99999);
  });

  it('handles negative Infinity', () => {
    expect(sanitizeNumber(-Infinity, 0, 100)).toBe(0);
  });

  it('handles boolean input', () => {
    expect(sanitizeNumber(true, 0, 100)).toBe(1);
    expect(sanitizeNumber(false, 0, 100)).toBe(0);
  });

  it('handles null and undefined', () => {
    expect(sanitizeNumber(null, 0, 100)).toBe(0);
    expect(sanitizeNumber(undefined, 0, 100)).toBe(0);
  });

  it('handles exact boundary values', () => {
    expect(sanitizeNumber(0, 0, 100)).toBe(0);
    expect(sanitizeNumber(100, 0, 100)).toBe(100);
  });

  it('handles negative min', () => {
    expect(sanitizeNumber(-50, -100, 100)).toBe(-50);
    expect(sanitizeNumber(-150, -100, 100)).toBe(-100);
  });

  it('handles string with leading/trailing spaces', () => {
    expect(sanitizeNumber(' 42 ', 0, 100)).toBe(42);
  });

  it('handles empty string', () => {
    expect(sanitizeNumber('', 0, 100)).toBe(0);
  });
});

describe('safeJSONParse', () => {
  it('parses valid JSON', () => {
    expect(safeJSONParse('{"a":1}')).toEqual({ a: 1 });
    expect(safeJSONParse('[1,2,3]')).toEqual([1, 2, 3]);
    expect(safeJSONParse('"hello"')).toBe('hello');
  });

  it('returns fallback for invalid JSON', () => {
    expect(safeJSONParse('not json')).toBeNull();
    expect(safeJSONParse('{bad}', 'default')).toBe('default');
  });

  it('returns fallback for non-string input', () => {
    expect(safeJSONParse(null as unknown as string)).toBeNull();
    expect(safeJSONParse(123 as unknown as string, [])).toEqual([]);
  });

  it('returns fallback for empty string', () => {
    expect(safeJSONParse('', 'fallback')).toBe('fallback');
  });

  it('parses boolean values', () => {
    expect(safeJSONParse('true')).toBe(true);
    expect(safeJSONParse('false')).toBe(false);
  });

  it('parses null JSON', () => {
    expect(safeJSONParse('null')).toBeNull();
  });

  it('parses numeric JSON', () => {
    expect(safeJSONParse('42')).toBe(42);
    expect(safeJSONParse('3.14')).toBeCloseTo(3.14);
  });

  it('parses nested objects', () => {
    expect(safeJSONParse('{"a":{"b":{"c":1}}}')).toEqual({ a: { b: { c: 1 } } });
  });

  it('returns typed fallback', () => {
    const result = safeJSONParse<number[]>('invalid', [1, 2, 3]);
    expect(result).toEqual([1, 2, 3]);
  });
});

describe('isValidArray', () => {
  it('returns true for arrays', () => {
    expect(isValidArray([])).toBe(true);
    expect(isValidArray([1, 2, 3])).toBe(true);
  });

  it('returns false for non-arrays', () => {
    expect(isValidArray(null)).toBe(false);
    expect(isValidArray(undefined)).toBe(false);
    expect(isValidArray({})).toBe(false);
    expect(isValidArray('string')).toBe(false);
    expect(isValidArray(42)).toBe(false);
  });

  it('returns true for empty arrays', () => {
    expect(isValidArray([])).toBe(true);
  });

  it('returns true for arrays with mixed types', () => {
    expect(isValidArray([1, 'two', null, { three: 3 }])).toBe(true);
  });
});

describe('isValidObject', () => {
  it('returns true for plain objects', () => {
    expect(isValidObject({})).toBe(true);
    expect(isValidObject({ a: 1 })).toBe(true);
  });

  it('returns false for null, arrays, and primitives', () => {
    expect(isValidObject(null)).toBe(false);
    expect(isValidObject([])).toBe(false);
    expect(isValidObject('string')).toBe(false);
    expect(isValidObject(42)).toBe(false);
    expect(isValidObject(undefined)).toBe(false);
  });

  it('returns true for nested objects', () => {
    expect(isValidObject({ a: { b: 1 } })).toBe(true);
  });

  it('returns false for boolean values', () => {
    expect(isValidObject(true)).toBe(false);
    expect(isValidObject(false)).toBe(false);
  });
});

describe('validateStorageData', () => {
  it('returns data when valid object', () => {
    const data = { key: 'value' };
    expect(validateStorageData(data, {})).toBe(data);
  });

  it('returns data when valid array', () => {
    const data = [1, 2, 3];
    expect(validateStorageData(data, [])).toBe(data);
  });

  it('returns default for invalid data', () => {
    const defaultVal = { default: true };
    expect(validateStorageData(null, defaultVal)).toBe(defaultVal);
    expect(validateStorageData(undefined, defaultVal)).toBe(defaultVal);
    expect(validateStorageData('string', defaultVal)).toBe(defaultVal);
    expect(validateStorageData(42, defaultVal)).toBe(defaultVal);
  });

  it('returns empty array data as valid', () => {
    const data: unknown[] = [];
    expect(validateStorageData(data, [1])).toBe(data);
  });

  it('returns empty object data as valid', () => {
    const data = {};
    expect(validateStorageData(data, { fallback: true })).toBe(data);
  });
});

describe('sanitizeFoodName', () => {
  it('delegates to sanitizeText with maxLength 100', () => {
    expect(sanitizeFoodName('  Chicken Breast  ')).toBe('Chicken Breast');
    expect(sanitizeFoodName('a'.repeat(200))).toHaveLength(100);
  });

  it('accepts custom maxLength', () => {
    expect(sanitizeFoodName('abcdefgh', 5)).toBe('abcde');
  });

  it('removes control characters from food names', () => {
    expect(sanitizeFoodName('Chicken\x00Breast')).toBe('ChickenBreast');
  });

  it('handles empty food name', () => {
    expect(sanitizeFoodName('')).toBe('');
  });
});

describe('sanitizeChatMessage', () => {
  it('delegates to sanitizeText with maxLength 1000', () => {
    expect(sanitizeChatMessage('  Hello world  ')).toBe('Hello world');
    expect(sanitizeChatMessage('a'.repeat(1500))).toHaveLength(1000);
  });

  it('preserves newlines in messages', () => {
    expect(sanitizeChatMessage('line1\nline2')).toBe('line1\nline2');
  });

  it('handles empty message', () => {
    expect(sanitizeChatMessage('')).toBe('');
  });
});

describe('validateMacro', () => {
  it('clamps to 0-10000 range', () => {
    expect(validateMacro(500)).toBe(500);
    expect(validateMacro(-10)).toBe(0);
    expect(validateMacro(20000)).toBe(10000);
  });

  it('accepts custom max', () => {
    expect(validateMacro(500, 200)).toBe(200);
  });

  it('handles non-numeric values', () => {
    expect(validateMacro('abc')).toBe(0);
    expect(validateMacro(null)).toBe(0);
  });

  it('handles zero', () => {
    expect(validateMacro(0)).toBe(0);
  });

  it('handles exact boundary values', () => {
    expect(validateMacro(10000)).toBe(10000);
    expect(validateMacro(10001)).toBe(10000);
  });

  it('handles string numeric values', () => {
    expect(validateMacro('250')).toBe(250);
    expect(validateMacro('0.5')).toBeCloseTo(0.5);
  });

  it('handles undefined', () => {
    expect(validateMacro(undefined)).toBe(0);
  });
});

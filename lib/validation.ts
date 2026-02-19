/**
 * VibeFit Input Validation & Sanitization Utilities
 *
 * Provides helpers for sanitizing user input before sending to APIs,
 * validating data loaded from AsyncStorage, and safe JSON parsing.
 */

/**
 * Sanitize a text string: trim whitespace and enforce a maximum length.
 * Removes null bytes and other control characters (except newlines/tabs).
 * @param text - Raw user input
 * @param maxLength - Maximum allowed length (default 500)
 * @returns Sanitized text
 */
export function sanitizeText(text: string, maxLength: number = 500): string {
  if (typeof text !== 'string') return '';
  // Remove null bytes and control characters (keep \n and \t)
  const cleaned = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  return cleaned.trim().slice(0, maxLength);
}

/**
 * Sanitize and clamp a numeric value within a range.
 * @param value - Raw input (string or number)
 * @param min - Minimum allowed value (default 0)
 * @param max - Maximum allowed value (default 99999)
 * @returns Clamped number, or min if input is not a valid number
 */
export function sanitizeNumber(value: unknown, min: number = 0, max: number = 99999): number {
  const num = typeof value === 'string' ? parseFloat(value) : Number(value);
  if (isNaN(num) || !isFinite(num)) return min;
  return Math.min(max, Math.max(min, num));
}

/**
 * Safely parse a JSON string with validation.
 * Returns the parsed value on success, or the fallback value on failure.
 * @param str - JSON string to parse
 * @param fallback - Value to return on parse failure (default null)
 * @returns Parsed value or fallback
 */
export function safeJSONParse<T>(str: string, fallback: T = null as T): T {
  if (typeof str !== 'string' || str.length === 0) return fallback;
  try {
    return JSON.parse(str) as T;
  } catch {
    return fallback;
  }
}

/**
 * Validate that a value is a non-empty array.
 * @param value - Value to check
 * @returns Type predicate indicating value is an array
 */
export function isValidArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

/**
 * Validate that a value is a plain object (not null, not an array).
 * @param value - Value to check
 * @returns Type predicate indicating value is a record
 */
export function isValidObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Validate an AsyncStorage-loaded day data object matches expected schema.
 * Returns the validated object or a safe default.
 * @param data - Parsed data from storage
 * @param defaultValue - Default value to return if invalid
 * @returns Validated data or default
 */
export function validateStorageData<T>(data: unknown, defaultValue: T): T {
  if (!isValidObject(data) && !isValidArray(data)) {
    return defaultValue;
  }
  return data as T;
}

/**
 * Sanitize a food name string: trims, limits length, removes suspicious chars.
 * @param name - Raw food name
 * @param maxLength - Maximum allowed length (default 100)
 * @returns Sanitized name
 */
export function sanitizeFoodName(name: string, maxLength: number = 100): string {
  return sanitizeText(name, maxLength);
}

/**
 * Sanitize a chat message: trims, limits length.
 * @param message - Raw message text
 * @param maxLength - Maximum allowed length (default 1000)
 * @returns Sanitized message
 */
export function sanitizeChatMessage(message: string, maxLength: number = 1000): string {
  return sanitizeText(message, maxLength);
}

/**
 * Validate a macro value (protein, carbs, fat, calories).
 * Must be a non-negative finite number within reasonable bounds.
 * @param value - Raw macro value
 * @param max - Maximum allowed (default 10000)
 * @returns Validated value
 */
export function validateMacro(value: unknown, max: number = 10000): number {
  return sanitizeNumber(value, 0, max);
}

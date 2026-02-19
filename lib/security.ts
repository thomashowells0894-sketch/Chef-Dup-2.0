/**
 * VibeFit Enterprise Security Module
 * Comprehensive security utilities for data protection, privacy, and compliance.
 */
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';

// ============================================================================
// ENCRYPTION & SECURE STORAGE
// ============================================================================

const SECURE_PREFIX: string = 'vibefit_secure_';

/**
 * Store sensitive data in secure storage (Keychain/Keystore)
 */
async function secureStore(key: string, value: unknown): Promise<boolean> {
  try {
    const serialized: string = typeof value === 'string' ? value : JSON.stringify(value);
    await SecureStore.setItemAsync(SECURE_PREFIX + key, serialized, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
    return true;
  } catch (error: unknown) {
    // Secure store error — fail silently (never log keystore details)
    return false;
  }
}

/**
 * Retrieve sensitive data from secure storage
 */
async function secureRetrieve(key: string): Promise<unknown> {
  try {
    const value: string | null = await SecureStore.getItemAsync(SECURE_PREFIX + key);
    if (!value) return null;
    try { return JSON.parse(value); } catch { return value; }
  } catch (error: unknown) {
    // Secure retrieve error — fail silently (never log keystore details)
    return null;
  }
}

/**
 * Delete sensitive data from secure storage
 */
async function secureDelete(key: string): Promise<boolean> {
  try {
    await SecureStore.deleteItemAsync(SECURE_PREFIX + key);
    return true;
  } catch { return false; }
}

// ============================================================================
// BIOMETRIC AUTHENTICATION
// ============================================================================

interface BiometricAvailability {
  available: boolean;
  type: string;
  types?: number[];
}

/**
 * Check if device supports biometric authentication
 */
async function isBiometricAvailable(): Promise<BiometricAvailability> {
  try {
    const compatible: boolean = await LocalAuthentication.hasHardwareAsync();
    if (!compatible) return { available: false, type: 'none' };
    const enrolled: boolean = await LocalAuthentication.isEnrolledAsync();
    if (!enrolled) return { available: false, type: 'not_enrolled' };
    const types: number[] = await LocalAuthentication.supportedAuthenticationTypesAsync();
    const hasFace: boolean = types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
    const hasFingerprint: boolean = types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT);
    return { available: true, type: hasFace ? 'face' : hasFingerprint ? 'fingerprint' : 'biometric', types };
  } catch {
    return { available: false, type: 'error' };
  }
}

interface BiometricResult {
  success: boolean;
  error?: string;
}

/**
 * Authenticate user with biometrics
 */
async function authenticateWithBiometrics(reason: string = 'Verify your identity'): Promise<BiometricResult> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: reason,
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
      fallbackLabel: 'Use Passcode',
    });
    return { success: result.success, error: (result as any).error };
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message };
  }
}

// ============================================================================
// INPUT SANITIZATION (Enhanced)
// ============================================================================

const XSS_PATTERNS: RegExp[] = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript\s*:/gi,
  /on\w+\s*=/gi,
  /data\s*:\s*text\/html/gi,
  /<iframe/gi,
  /<object/gi,
  /<embed/gi,
  /expression\s*\(/gi,
  /url\s*\(/gi,
  /eval\s*\(/gi,
];

const DANGEROUS_KEYS: Set<string> = new Set(['__proto__', 'constructor', 'prototype']);
const MAX_SANITIZE_DEPTH: number = 10;

function deepSanitize(input: unknown, _seen: WeakSet<object> = new WeakSet(), _depth: number = 0): unknown {
  if (input === null || input === undefined) return input;
  if (typeof input === 'string') return sanitizeString(input);
  if (typeof input === 'number') return Number.isFinite(input) ? input : 0;
  if (typeof input === 'boolean') return input;

  // Prevent circular references and excessive nesting
  if (typeof input === 'object') {
    if (_depth > MAX_SANITIZE_DEPTH) return null;
    if (_seen.has(input as object)) return null;
    _seen.add(input as object);

    if (Array.isArray(input)) {
      return input.map((item: unknown) => deepSanitize(item, _seen, _depth + 1));
    }

    const cleaned: Record<string, unknown> = Object.create(null);
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      if (DANGEROUS_KEYS.has(key)) continue;
      const cleanKey: string = sanitizeString(key, 100);
      if (DANGEROUS_KEYS.has(cleanKey)) continue;
      cleaned[cleanKey] = deepSanitize(value, _seen, _depth + 1);
    }
    return cleaned;
  }
  return input;
}

function sanitizeString(str: string, maxLength: number = 10000): string {
  if (typeof str !== 'string') return '';
  let cleaned: string = str.slice(0, maxLength);
  for (const pattern of XSS_PATTERNS) {
    cleaned = cleaned.replace(pattern, '');
  }
  // Remove null bytes
  cleaned = cleaned.replace(/\0/g, '');
  return cleaned.trim();
}

function sanitizeEmail(email: string): string {
  if (typeof email !== 'string') return '';
  const cleaned: string = email.toLowerCase().trim().slice(0, 254);
  const emailRegex: RegExp = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(cleaned) ? cleaned : '';
}

function sanitizeURL(url: string): string {
  if (typeof url !== 'string') return '';
  const cleaned: string = url.trim().slice(0, 2048);
  try {
    const parsed: URL = new URL(cleaned);
    if (!['http:', 'https:'].includes(parsed.protocol)) return '';
    return parsed.href;
  } catch {
    return '';
  }
}

// ============================================================================
// RATE LIMITING (Enhanced)
// ============================================================================

interface RateLimitBucket {
  count: number;
  resetAt: number;
  firstAttempt: number;
}

interface RateLimitCheckResult {
  allowed: boolean;
  retryAfter?: number;
  message?: string;
  remaining?: number;
}

class RateLimiter {
  buckets: Map<string, RateLimitBucket>;

  constructor() {
    this.buckets = new Map();
  }

  check(key: string, maxAttempts: number, windowMs: number): RateLimitCheckResult {
    const now: number = Date.now();
    let bucket: RateLimitBucket | undefined = this.buckets.get(key);
    if (!bucket || now > bucket.resetAt) {
      bucket = { count: 0, resetAt: now + windowMs, firstAttempt: now };
      this.buckets.set(key, bucket);
    }
    bucket.count++;
    if (bucket.count > maxAttempts) {
      const retryAfter: number = Math.ceil((bucket.resetAt - now) / 1000);
      return { allowed: false, retryAfter, message: `Too many attempts. Try again in ${retryAfter}s.` };
    }
    return { allowed: true, remaining: maxAttempts - bucket.count };
  }

  reset(key: string): void {
    this.buckets.delete(key);
  }

  cleanup(): void {
    const now: number = Date.now();
    for (const [key, bucket] of this.buckets) {
      if (now > bucket.resetAt) this.buckets.delete(key);
    }
  }
}

const globalRateLimiter: RateLimiter = new RateLimiter();

// Cleanup every 5 minutes
setInterval(() => globalRateLimiter.cleanup(), 300000);

// ============================================================================
// DATA PRIVACY & GDPR
// ============================================================================

/**
 * Privacy settings management
 */
const PRIVACY_KEY: string = 'vibefit_privacy_settings';

interface PrivacySettings {
  analyticsEnabled: boolean;
  crashReportingEnabled: boolean;
  personalizedAdsEnabled: boolean;
  dataShareEnabled: boolean;
  locationTrackingEnabled: boolean;
  socialSharingEnabled: boolean;
  healthDataSyncEnabled: boolean;
  consentDate: string | null;
  consentVersion: string;
  lastModified?: string;
}

const DEFAULT_PRIVACY: PrivacySettings = {
  analyticsEnabled: true,
  crashReportingEnabled: true,
  personalizedAdsEnabled: false,
  dataShareEnabled: false,
  locationTrackingEnabled: false,
  socialSharingEnabled: true,
  healthDataSyncEnabled: true,
  consentDate: null,
  consentVersion: '1.0',
};

async function getPrivacySettings(): Promise<PrivacySettings> {
  try {
    const raw: string | null = await SecureStore.getItemAsync(PRIVACY_KEY);
    return raw ? { ...DEFAULT_PRIVACY, ...JSON.parse(raw) } : DEFAULT_PRIVACY;
  } catch {
    return DEFAULT_PRIVACY;
  }
}

async function updatePrivacySettings(updates: Partial<PrivacySettings>): Promise<PrivacySettings | null> {
  try {
    const current: PrivacySettings = await getPrivacySettings();
    const updated: PrivacySettings = { ...current, ...updates, lastModified: new Date().toISOString() };
    await SecureStore.setItemAsync(PRIVACY_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return null;
  }
}

interface SupabaseClient {
  from(table: string): {
    select(columns: string): { eq(column: string, value: string): Promise<{ data: unknown[] | null; error: unknown }> };
    delete(): { eq(column: string, value: string): Promise<{ error: unknown }> };
  };
}

interface ExportData {
  exportDate: string;
  userId: string;
  [table: string]: unknown;
}

/**
 * Export all user data (GDPR right to data portability)
 */
async function exportUserData(supabase: SupabaseClient, userId: string): Promise<ExportData> {
  if (!userId) throw new Error('User ID required for data export');

  const tables: string[] = [
    'profiles',
    'food_logs',
    'workouts',
    'weight_history',
    'social_posts',
    'social_comments',
    'social_likes',
    'challenge_participants',
    'friend_activity',
    'journal_entries',
    'active_sessions',
  ];
  const exportData: ExportData = { exportDate: new Date().toISOString(), userId };

  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*').eq('user_id', userId);
      exportData[table] = error ? [] : data;
    } catch {
      exportData[table] = [];
    }
  }

  // Export friendships (user could be requester or addressee)
  try {
    const { data: friendsOut } = await supabase.from('friendships').select('*').eq('requester_id', userId);
    const { data: friendsIn } = await supabase.from('friendships').select('*').eq('addressee_id', userId);
    exportData['friendships'] = [...(friendsOut || []), ...(friendsIn || [])];
  } catch {
    exportData['friendships'] = [];
  }

  return exportData;
}

interface DeletionResults {
  [key: string]: string;
}

/**
 * Delete all user data (GDPR right to be forgotten)
 * Covers all Supabase tables, AsyncStorage, and SecureStore.
 */
async function deleteAllUserData(supabase: SupabaseClient, userId: string): Promise<DeletionResults> {
  if (!userId) throw new Error('User ID required for data deletion');

  // All Supabase tables containing user data — order matters for FK constraints.
  // Delete child rows first, then parent rows.
  const tables: string[] = [
    'social_likes',
    'social_reactions',
    'social_comments',
    'social_posts',
    'challenge_participants',
    'friend_activity',
    'content_reports',
    'ai_response_cache',
    'rate_limits',
    'request_nonces',
    'friendships',
    'lesson_completions',
    'behavioral_checkins',
    'active_sessions',
    'journal_entries',
    'food_logs',
    'workouts',
    'weight_history',
    'user_public_profiles',
    'profiles',
  ];
  const results: DeletionResults = {};

  for (const table of tables) {
    try {
      // user_public_profiles uses 'id' not 'user_id'
      const col: string = table === 'user_public_profiles' ? 'id' : 'user_id';
      // friendships has requester_id and addressee_id, not user_id
      if (table === 'friendships') {
        const { error: e1 } = await supabase.from(table).delete().eq('requester_id', userId);
        const { error: e2 } = await supabase.from(table).delete().eq('addressee_id', userId);
        results[table] = (!e1 && !e2) ? 'deleted' : 'partial';
      } else {
        const { error } = await supabase.from(table).delete().eq(col, userId);
        results[table] = error ? 'failed' : 'deleted';
      }
    } catch {
      results[table] = 'failed';
    }
  }

  // Clear ALL local AsyncStorage keys
  try {
    const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
    const allKeys: readonly string[] = await AsyncStorage.getAllKeys();
    const vibefitKeys: string[] = allKeys.filter((k: string) => k.startsWith('@vibefit_'));
    if (vibefitKeys.length > 0) {
      await AsyncStorage.multiRemove(vibefitKeys);
    }
    results.asyncStorage = 'deleted';
  } catch {
    results.asyncStorage = 'failed';
  }

  // Clear SecureStore keys
  const secureKeys: string[] = [
    'vibefit_privacy_settings',
    'vibefit_secure_pin',
    'vibefit_secure_app_lock',
    'app_lock_settings',
    'vibefit_pin_hash',
    'vibefit_pin_salt',
    'vibefit_pin_lockout',
  ];
  for (const key of secureKeys) {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {}
  }
  results.secureStore = 'deleted';

  // Clear in-memory audit log
  clearAuditLog();

  return results;
}

// ============================================================================
// SESSION SECURITY
// ============================================================================

const SESSION_TIMEOUT: number = 30 * 60 * 1000; // 30 minutes
let lastActivity: number = Date.now();

function recordActivity(): void {
  lastActivity = Date.now();
}

function isSessionExpired(): boolean {
  return Date.now() - lastActivity > SESSION_TIMEOUT;
}

function getSessionAge(): number {
  return Date.now() - lastActivity;
}

// ============================================================================
// AUDIT LOGGING
// ============================================================================

interface AuditEntry {
  event: string;
  details: Record<string, unknown>;
  timestamp: string;
  platform: string;
}

const auditLog: AuditEntry[] = [];
const MAX_AUDIT_ENTRIES: number = 100;
const SENSITIVE_FIELDS: Set<string> = new Set([
  'password', 'token', 'secret', 'apiKey', 'api_key', 'accessToken',
  'access_token', 'refreshToken', 'refresh_token', 'authorization',
  'credit_card', 'ssn', 'pin', 'otp', 'credential',
]);

function redactSensitive(obj: unknown): Record<string, unknown> {
  if (!obj || typeof obj !== 'object') return obj as Record<string, unknown>;
  const redacted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (SENSITIVE_FIELDS.has(key.toLowerCase())) {
      redacted[key] = '[REDACTED]';
    } else if (typeof value === 'string' && value.length > 200) {
      redacted[key] = value.substring(0, 50) + '...[truncated]';
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}

function logAuditEvent(event: string, details: Record<string, unknown> = {}): void {
  const safeDetails: Record<string, unknown> = redactSensitive(details);
  const timestamp = new Date().toISOString();
  const safeEvent = typeof event === 'string' ? event.substring(0, 100) : 'unknown';

  auditLog.push({
    event: safeEvent,
    details: safeDetails,
    timestamp,
    platform: Platform.OS,
  });
  // Trim from front in bulk to avoid repeated O(n) shifts
  if (auditLog.length > MAX_AUDIT_ENTRIES) {
    auditLog.splice(0, auditLog.length - MAX_AUDIT_ENTRIES);
  }

  // Queue for async upload to Supabase
  try {
    const { queueAuditLog } = require('./auditSync');
    queueAuditLog({
      action: safeEvent,
      details: safeDetails,
      timestamp,
    });
  } catch {
    // auditSync module not available — local-only logging
  }
}

function getAuditLog(limit: number = 50): AuditEntry[] {
  return auditLog.slice(-Math.min(limit, MAX_AUDIT_ENTRIES));
}

function clearAuditLog(): void {
  auditLog.length = 0;
}

// ============================================================================
// PASSWORD STRENGTH
// ============================================================================

const COMMON_PASSWORDS: Set<string> = new Set([
  'password', '12345678', '123456789', '1234567890', 'qwerty123',
  'password1', 'iloveyou', 'sunshine1', 'princess1', 'football1',
  'charlie1', 'shadow12', 'master12', 'dragon12', 'michael1',
  'abc12345', 'password123', 'qwertyui', 'letmein1', 'welcome1',
  'monkey12', 'trustno1', 'baseball1', 'superman1', 'passw0rd',
]);

interface PasswordStrengthResult {
  score: number;
  level: string;
  feedback: string[];
  maxScore?: number;
}

function checkPasswordStrength(password: string): PasswordStrengthResult {
  if (!password) return { score: 0, level: 'none', feedback: [] };

  let score: number = 0;
  const feedback: string[] = [];

  // Check against common passwords
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    return { score: 0, level: 'weak', feedback: ['This is a commonly used password. Choose something unique.'], maxScore: 7 };
  }

  if (password.length >= 8) score += 1; else feedback.push('Use at least 8 characters');
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password)) score += 1; else feedback.push('Add uppercase letters');
  if (/[a-z]/.test(password)) score += 1; else feedback.push('Add lowercase letters');
  if (/[0-9]/.test(password)) score += 1; else feedback.push('Add numbers');
  if (/[^A-Za-z0-9]/.test(password)) score += 1; else feedback.push('Add special characters');
  if (!/(.)\1{2,}/.test(password)) score += 1; else feedback.push('Avoid repeated characters');

  const levels: string[] = ['none', 'weak', 'weak', 'fair', 'good', 'strong', 'strong', 'excellent'];
  return { score, level: levels[score] || 'excellent', feedback, maxScore: 7 };
}

export {
  secureStore,
  secureRetrieve,
  secureDelete,
  isBiometricAvailable,
  authenticateWithBiometrics,
  deepSanitize,
  sanitizeString,
  sanitizeEmail,
  sanitizeURL,
  globalRateLimiter,
  RateLimiter,
  getPrivacySettings,
  updatePrivacySettings,
  exportUserData,
  deleteAllUserData,
  recordActivity,
  isSessionExpired,
  getSessionAge,
  logAuditEvent,
  getAuditLog,
  clearAuditLog,
  checkPasswordStrength,
};

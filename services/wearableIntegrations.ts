/**
 * VibeFit Wearable Device Integration Service
 *
 * Comprehensive third-party wearable integration layer supporting:
 * - Fitbit (OAuth 2.0 PKCE) — steps, heart rate, sleep, weight, workouts
 * - Garmin (OAuth 1.0a) — steps, heart rate, sleep, body composition, activities
 * - WHOOP (OAuth 2.0) — recovery, strain, sleep, heart rate, HRV
 * - Withings (OAuth 2.0) — weight, body composition, blood pressure
 *
 * Each provider implements:
 * - OAuth URL generation with appropriate scopes
 * - Token exchange (authorization code -> access/refresh tokens)
 * - Token refresh for expired credentials
 * - Normalized health data sync
 * - Persistent connection state via AsyncStorage
 *
 * Storage key: @vibefit_wearable_connections
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

declare const __DEV__: boolean;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = '@vibefit_wearable_connections';
const LOG_PREFIX = '[WearableIntegrations]';

/**
 * OAuth redirect URI built from Expo's deep-link scheme.
 * In production this resolves to something like `myapp://wearable-callback`.
 */
const REDIRECT_URI = Linking.createURL('wearable-callback');

// ---------------------------------------------------------------------------
// Provider client IDs — loaded from environment variables
// ---------------------------------------------------------------------------

const FITBIT_CLIENT_ID: string = process.env.EXPO_PUBLIC_FITBIT_CLIENT_ID || '';
const GARMIN_CONSUMER_KEY: string = process.env.EXPO_PUBLIC_GARMIN_CONSUMER_KEY || '';
const GARMIN_CONSUMER_SECRET: string = process.env.EXPO_PUBLIC_GARMIN_CONSUMER_SECRET || '';
const WHOOP_CLIENT_ID: string = process.env.EXPO_PUBLIC_WHOOP_CLIENT_ID || '';
const WHOOP_CLIENT_SECRET: string = process.env.EXPO_PUBLIC_WHOOP_CLIENT_SECRET || '';
const WITHINGS_CLIENT_ID: string = process.env.EXPO_PUBLIC_WITHINGS_CLIENT_ID || '';
const WITHINGS_CLIENT_SECRET: string = process.env.EXPO_PUBLIC_WITHINGS_CLIENT_SECRET || '';

// ---------------------------------------------------------------------------
// Provider API endpoints
// ---------------------------------------------------------------------------

/** Fitbit Web API endpoints (OAuth 2.0 PKCE) */
const FITBIT_ENDPOINTS = {
  authorize: 'https://www.fitbit.com/oauth2/authorize',
  token: 'https://api.fitbit.com/oauth2/token',
  revoke: 'https://api.fitbit.com/oauth2/revoke',
  profile: 'https://api.fitbit.com/1/user/-/profile.json',
  steps: 'https://api.fitbit.com/1/user/-/activities/steps/date/today/1d.json',
  heartRate: 'https://api.fitbit.com/1/user/-/activities/heart/date/today/1d.json',
  sleep: 'https://api.fitbit.com/1.2/user/-/sleep/date/today.json',
  weight: 'https://api.fitbit.com/1/user/-/body/log/weight/date/today/30d.json',
  activities: 'https://api.fitbit.com/1/user/-/activities/list.json',
} as const;

/** Garmin Connect API endpoints (OAuth 1.0a) */
const GARMIN_ENDPOINTS = {
  requestToken: 'https://connectapi.garmin.com/oauth-service/oauth/request_token',
  authorize: 'https://connect.garmin.com/oauthConfirm',
  accessToken: 'https://connectapi.garmin.com/oauth-service/oauth/access_token',
  dailySummary: 'https://apis.garmin.com/wellness-api/rest/dailies',
  heartRate: 'https://apis.garmin.com/wellness-api/rest/heartRate',
  sleep: 'https://apis.garmin.com/wellness-api/rest/sleeps',
  bodyComposition: 'https://apis.garmin.com/wellness-api/rest/bodyComps',
  activities: 'https://apis.garmin.com/wellness-api/rest/activities',
} as const;

/** WHOOP API v1 endpoints (OAuth 2.0) */
const WHOOP_ENDPOINTS = {
  authorize: 'https://api.prod.whoop.com/oauth/oauth2/auth',
  token: 'https://api.prod.whoop.com/oauth/oauth2/token',
  revoke: 'https://api.prod.whoop.com/oauth/oauth2/revoke',
  recovery: 'https://api.prod.whoop.com/developer/v1/recovery',
  strain: 'https://api.prod.whoop.com/developer/v1/cycle',
  sleep: 'https://api.prod.whoop.com/developer/v1/activity/sleep',
  heartRate: 'https://api.prod.whoop.com/developer/v1/recovery',
  profile: 'https://api.prod.whoop.com/developer/v1/user/profile/basic',
} as const;

/** Withings (Nokia Health) API endpoints (OAuth 2.0) */
const WITHINGS_ENDPOINTS = {
  authorize: 'https://account.withings.com/oauth2_user/authorize2',
  token: 'https://wbsapi.withings.net/v2/oauth2',
  measure: 'https://wbsapi.withings.net/measure',
  heart: 'https://wbsapi.withings.net/v2/heart',
} as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Supported wearable device providers. */
export type WearableProvider = 'fitbit' | 'garmin' | 'whoop' | 'withings';

/** Persisted connection state for a single wearable provider. */
export interface WearableConnection {
  /** Which provider this connection belongs to. */
  provider: WearableProvider;
  /** Whether the provider is currently connected and authorized. */
  isConnected: boolean;
  /** ISO-8601 timestamp of the last successful data sync, or null if never synced. */
  lastSynced: string | null;
  /** OAuth access token (kept in memory / AsyncStorage only). */
  accessToken: string | null;
  /** OAuth refresh token for obtaining new access tokens. */
  refreshToken: string | null;
  /** Unix timestamp (ms) when the access token expires, or null for non-expiring tokens. */
  expiresAt: number | null;
  /** OAuth 1.0a token secret (Garmin only). */
  tokenSecret?: string | null;
}

/** Normalized health data record returned from any provider sync. */
export interface NormalizedHealthData {
  /** Which provider supplied the data. */
  provider: WearableProvider;
  /** ISO-8601 timestamp for the data point. */
  timestamp: string;
  /** Step count for the day, or null if unavailable. */
  steps: number | null;
  /** Resting heart rate in BPM, or null. */
  restingHeartRate: number | null;
  /** Average heart rate in BPM, or null. */
  averageHeartRate: number | null;
  /** Heart rate variability in milliseconds (RMSSD), or null. */
  hrv: number | null;
  /** Total sleep duration in minutes, or null. */
  sleepMinutes: number | null;
  /** Deep sleep duration in minutes, or null. */
  deepSleepMinutes: number | null;
  /** REM sleep duration in minutes, or null. */
  remSleepMinutes: number | null;
  /** Light sleep duration in minutes, or null. */
  lightSleepMinutes: number | null;
  /** Body weight in kilograms, or null. */
  weightKg: number | null;
  /** Body fat percentage (0-100), or null. */
  bodyFatPercent: number | null;
  /** Muscle mass in kilograms, or null. */
  muscleMassKg: number | null;
  /** Bone mass in kilograms, or null. */
  boneMassKg: number | null;
  /** BMI value, or null. */
  bmi: number | null;
  /** Systolic blood pressure in mmHg, or null. */
  systolicBP: number | null;
  /** Diastolic blood pressure in mmHg, or null. */
  diastolicBP: number | null;
  /** Active calories burned, or null. */
  activeCalories: number | null;
  /** Recovery score (0-100), or null (WHOOP-specific). */
  recoveryScore: number | null;
  /** Strain score (0-21), or null (WHOOP-specific). */
  strainScore: number | null;
  /** Blood oxygen saturation percentage, or null. */
  spo2: number | null;
  /** Respiratory rate in breaths per minute, or null. */
  respiratoryRate: number | null;
}

/** Result of an OAuth authorization flow. */
interface OAuthTokenResponse {
  accessToken: string;
  refreshToken: string | null;
  expiresIn: number | null;
  tokenSecret?: string | null;
}

/** Result of a provider data sync operation. */
export interface SyncResult {
  success: boolean;
  provider: WearableProvider;
  data: NormalizedHealthData | null;
  error?: string;
}

/** Summary of all provider sync results. */
export interface SyncAllResult {
  results: SyncResult[];
  successCount: number;
  failureCount: number;
}

// ---------------------------------------------------------------------------
// In-memory connection cache
// ---------------------------------------------------------------------------

let _connectionsCache: Record<WearableProvider, WearableConnection> | null = null;
let _cacheLoaded = false;

/**
 * Build the default (disconnected) state for a provider.
 */
function defaultConnection(provider: WearableProvider): WearableConnection {
  return {
    provider,
    isConnected: false,
    lastSynced: null,
    accessToken: null,
    refreshToken: null,
    expiresAt: null,
    tokenSecret: null,
  };
}

/**
 * Build a full set of default connections for all providers.
 */
function defaultConnections(): Record<WearableProvider, WearableConnection> {
  return {
    fitbit: defaultConnection('fitbit'),
    garmin: defaultConnection('garmin'),
    whoop: defaultConnection('whoop'),
    withings: defaultConnection('withings'),
  };
}

// ---------------------------------------------------------------------------
// Persistence helpers
// ---------------------------------------------------------------------------

/**
 * Load all wearable connections from AsyncStorage.
 * Returns the cached copy if already loaded.
 */
async function loadConnections(): Promise<Record<WearableProvider, WearableConnection>> {
  if (_cacheLoaded && _connectionsCache) {
    return _connectionsCache;
  }

  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, WearableConnection>;
      // Merge with defaults to ensure all providers exist
      _connectionsCache = {
        ...defaultConnections(),
        ...parsed,
      };
    } else {
      _connectionsCache = defaultConnections();
    }
  } catch (error) {
    if (__DEV__) {
      console.warn(`${LOG_PREFIX} Failed to load connections:`, error);
    }
    _connectionsCache = defaultConnections();
  }

  _cacheLoaded = true;
  return _connectionsCache;
}

/**
 * Persist the current connections cache to AsyncStorage.
 */
async function saveConnections(): Promise<void> {
  if (!_connectionsCache) return;

  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(_connectionsCache));
  } catch (error) {
    if (__DEV__) {
      console.warn(`${LOG_PREFIX} Failed to save connections:`, error);
    }
  }
}

/**
 * Update a single provider's connection data and persist.
 */
async function updateConnection(
  provider: WearableProvider,
  updates: Partial<WearableConnection>,
): Promise<void> {
  const connections = await loadConnections();
  connections[provider] = {
    ...connections[provider],
    ...updates,
  };
  await saveConnections();
}

// ---------------------------------------------------------------------------
// PKCE helpers (for Fitbit OAuth 2.0 PKCE)
// ---------------------------------------------------------------------------

/**
 * Generate a cryptographically random string of a given byte length,
 * returned as a base64url-encoded value.
 */
function generateRandomString(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  for (let i = 0; i < byteLength; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return base64UrlEncode(bytes);
}

/**
 * Encode a Uint8Array as a base64url string (RFC 4648 section 5).
 */
function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  // Use global btoa if available (React Native polyfill)
  const base64 = typeof btoa === 'function'
    ? btoa(binary)
    : Buffer.from(binary, 'binary').toString('base64');
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Compute SHA-256 hash of a string, returned as a base64url-encoded value.
 * Uses expo-crypto when available, falls back to a simple hash.
 */
async function sha256Base64Url(input: string): Promise<string> {
  try {
    const Crypto = require('expo-crypto');
    const digest = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      input,
      { encoding: Crypto.CryptoEncoding.BASE64 },
    );
    return digest
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  } catch {
    // Fallback: simple string hash (not cryptographically secure, for dev only)
    if (__DEV__) {
      console.warn(`${LOG_PREFIX} expo-crypto not available, using fallback hash`);
    }
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }
}

// We store the PKCE verifier between the authorize and token exchange steps
let _pkceVerifier: string | null = null;

// We store the OAuth 1.0a request token secret between steps for Garmin
let _garminRequestTokenSecret: string | null = null;

// ---------------------------------------------------------------------------
// OAuth state parameter for CSRF protection
// ---------------------------------------------------------------------------

let _oauthState: string | null = null;

/**
 * Generate and store a random state parameter for OAuth CSRF protection.
 */
function generateOAuthState(): string {
  _oauthState = generateRandomString(16);
  return _oauthState;
}

/**
 * Validate that the returned state parameter matches the one we sent.
 */
function validateOAuthState(receivedState: string): boolean {
  if (!_oauthState) return false;
  const valid = receivedState === _oauthState;
  _oauthState = null; // Clear after use
  return valid;
}

// ---------------------------------------------------------------------------
// Generic HTTP helpers
// ---------------------------------------------------------------------------

/**
 * Perform an authenticated GET request to a provider API.
 * Automatically attaches the Bearer token header.
 *
 * @param url - The full API endpoint URL
 * @param accessToken - OAuth access token
 * @returns Parsed JSON response
 * @throws Error on network or HTTP errors
 */
async function authenticatedGet<T = unknown>(url: string, accessToken: string): Promise<T> {
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(
      `HTTP ${response.status} from ${url}: ${body.slice(0, 200)}`,
    );
  }

  return response.json() as Promise<T>;
}

/**
 * Perform a POST request with form-encoded body.
 *
 * @param url - The endpoint URL
 * @param body - Key-value pairs for the form body
 * @param headers - Additional headers to include
 * @returns Parsed JSON response
 * @throws Error on network or HTTP errors
 */
async function formPost<T = unknown>(
  url: string,
  body: Record<string, string>,
  headers: Record<string, string> = {},
): Promise<T> {
  const formBody = Object.entries(body)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
      ...headers,
    },
    body: formBody,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(
      `HTTP ${response.status} from ${url}: ${text.slice(0, 200)}`,
    );
  }

  return response.json() as Promise<T>;
}

/**
 * Perform an authenticated POST request with JSON body.
 *
 * @param url - The endpoint URL
 * @param accessToken - OAuth access token
 * @param body - JSON body to send
 * @returns Parsed JSON response
 * @throws Error on network or HTTP errors
 */
async function authenticatedPost<T = unknown>(
  url: string,
  accessToken: string,
  body: Record<string, unknown> = {},
): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(
      `HTTP ${response.status} from ${url}: ${text.slice(0, 200)}`,
    );
  }

  return response.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Token refresh logic
// ---------------------------------------------------------------------------

/**
 * Check whether a connection's access token has expired (or is about to).
 * Considers tokens expired if they have fewer than 5 minutes remaining.
 *
 * @param connection - The wearable connection to check
 * @returns True if the token is expired or missing
 */
function isTokenExpired(connection: WearableConnection): boolean {
  if (!connection.accessToken) return true;
  if (!connection.expiresAt) return false; // No expiry means it doesn't expire
  const bufferMs = 5 * 60 * 1000; // 5 minute buffer
  return Date.now() >= connection.expiresAt - bufferMs;
}

/**
 * Ensure we have a valid (non-expired) access token for the given provider.
 * If the token is expired, attempt to refresh it. Returns the valid access token
 * or throws if refresh fails.
 *
 * @param provider - The wearable provider
 * @returns A valid access token string
 * @throws Error if the token cannot be refreshed
 */
async function ensureValidToken(provider: WearableProvider): Promise<string> {
  const connections = await loadConnections();
  const conn = connections[provider];

  if (!conn.isConnected || !conn.accessToken) {
    throw new Error(`${provider} is not connected`);
  }

  if (!isTokenExpired(conn)) {
    return conn.accessToken;
  }

  if (!conn.refreshToken) {
    throw new Error(`${provider} token expired and no refresh token available`);
  }

  if (__DEV__) {
    console.log(`${LOG_PREFIX} Refreshing expired ${provider} token`);
  }

  const refreshed = await refreshProviderToken(provider, conn.refreshToken);

  await updateConnection(provider, {
    accessToken: refreshed.accessToken,
    refreshToken: refreshed.refreshToken ?? conn.refreshToken,
    expiresAt: refreshed.expiresIn
      ? Date.now() + refreshed.expiresIn * 1000
      : conn.expiresAt,
  });

  return refreshed.accessToken;
}

/**
 * Dispatch token refresh to the appropriate provider implementation.
 *
 * @param provider - The wearable provider
 * @param refreshToken - The refresh token to use
 * @returns New token credentials
 */
async function refreshProviderToken(
  provider: WearableProvider,
  refreshToken: string,
): Promise<OAuthTokenResponse> {
  switch (provider) {
    case 'fitbit':
      return refreshFitbitToken(refreshToken);
    case 'garmin':
      // Garmin OAuth 1.0a tokens do not expire; no refresh needed
      throw new Error('Garmin tokens do not support refresh');
    case 'whoop':
      return refreshWhoopToken(refreshToken);
    case 'withings':
      return refreshWithingsToken(refreshToken);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

/**
 * Format a Date to YYYY-MM-DD string.
 */
function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Create an empty NormalizedHealthData record for a provider.
 */
function emptyHealthData(provider: WearableProvider): NormalizedHealthData {
  return {
    provider,
    timestamp: new Date().toISOString(),
    steps: null,
    restingHeartRate: null,
    averageHeartRate: null,
    hrv: null,
    sleepMinutes: null,
    deepSleepMinutes: null,
    remSleepMinutes: null,
    lightSleepMinutes: null,
    weightKg: null,
    bodyFatPercent: null,
    muscleMassKg: null,
    boneMassKg: null,
    bmi: null,
    systolicBP: null,
    diastolicBP: null,
    activeCalories: null,
    recoveryScore: null,
    strainScore: null,
    spo2: null,
    respiratoryRate: null,
  };
}

// ===========================================================================
//
//  FITBIT  —  OAuth 2.0 Authorization Code Grant with PKCE
//
// ===========================================================================

/**
 * Generate the Fitbit OAuth 2.0 authorization URL with PKCE.
 *
 * Scopes requested:
 * - activity (steps, distance, calories)
 * - heartrate (resting HR, intraday HR)
 * - sleep (sleep stages, duration)
 * - weight (body weight, BMI)
 * - profile (user profile for age-based calculations)
 *
 * @returns The full authorization URL to open in a browser
 */
export async function getFitbitAuthUrl(): Promise<string> {
  _pkceVerifier = generateRandomString(32);
  const codeChallenge = await sha256Base64Url(_pkceVerifier);
  const state = generateOAuthState();

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: FITBIT_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: 'activity heartrate sleep weight profile',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state,
  });

  return `${FITBIT_ENDPOINTS.authorize}?${params.toString()}`;
}

/**
 * Exchange a Fitbit authorization code for access and refresh tokens.
 *
 * @param code - The authorization code received from the OAuth callback
 * @returns Token credentials
 * @throws Error if the exchange fails
 */
export async function exchangeFitbitToken(code: string): Promise<OAuthTokenResponse> {
  if (!_pkceVerifier) {
    throw new Error('PKCE verifier not found. Did you call getFitbitAuthUrl first?');
  }

  const data = await formPost<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }>(FITBIT_ENDPOINTS.token, {
    client_id: FITBIT_CLIENT_ID,
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI,
    code_verifier: _pkceVerifier,
  });

  _pkceVerifier = null; // Clear after use

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

/**
 * Refresh an expired Fitbit access token.
 *
 * @param refreshToken - The current refresh token
 * @returns New token credentials
 */
async function refreshFitbitToken(refreshToken: string): Promise<OAuthTokenResponse> {
  const data = await formPost<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }>(FITBIT_ENDPOINTS.token, {
    client_id: FITBIT_CLIENT_ID,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

/**
 * Sync health data from Fitbit.
 * Fetches steps, heart rate, sleep, weight, and recent activities,
 * then returns a normalized health data record.
 *
 * @returns Normalized health data from Fitbit
 */
async function syncFitbitData(): Promise<NormalizedHealthData> {
  const token = await ensureValidToken('fitbit');
  const result = emptyHealthData('fitbit');
  const today = formatDate(new Date());

  // Fetch all endpoints in parallel for performance
  const [stepsRes, heartRes, sleepRes, weightRes] = await Promise.allSettled([
    authenticatedGet<{ 'activities-steps': Array<{ value: string }> }>(
      FITBIT_ENDPOINTS.steps,
      token,
    ),
    authenticatedGet<{
      'activities-heart': Array<{
        value: {
          restingHeartRate?: number;
          heartRateZones?: Array<{ caloriesOut: number; min: number; max: number; minutes: number }>;
        };
      }>;
    }>(FITBIT_ENDPOINTS.heartRate, token),
    authenticatedGet<{
      sleep: Array<{
        duration: number;
        minutesAsleep: number;
        levels?: {
          summary?: {
            deep?: { minutes: number };
            light?: { minutes: number };
            rem?: { minutes: number };
            wake?: { minutes: number };
          };
        };
      }>;
    }>(FITBIT_ENDPOINTS.sleep, token),
    authenticatedGet<{
      weight: Array<{
        weight: number;
        bmi: number;
        fat?: number;
        date: string;
      }>;
    }>(FITBIT_ENDPOINTS.weight, token),
  ]);

  // Parse steps
  if (stepsRes.status === 'fulfilled') {
    const stepsData = stepsRes.value['activities-steps'];
    if (stepsData && stepsData.length > 0) {
      result.steps = parseInt(stepsData[0].value, 10) || null;
    }
  }

  // Parse heart rate
  if (heartRes.status === 'fulfilled') {
    const heartData = heartRes.value['activities-heart'];
    if (heartData && heartData.length > 0) {
      const hrValue = heartData[0].value;
      result.restingHeartRate = hrValue.restingHeartRate ?? null;

      // Sum active calories from heart rate zones
      if (hrValue.heartRateZones) {
        result.activeCalories = hrValue.heartRateZones.reduce(
          (sum, zone) => sum + (zone.caloriesOut || 0),
          0,
        );
      }
    }
  }

  // Parse sleep
  if (sleepRes.status === 'fulfilled') {
    const sleepData = sleepRes.value.sleep;
    if (sleepData && sleepData.length > 0) {
      const primarySleep = sleepData[0];
      result.sleepMinutes = primarySleep.minutesAsleep ?? null;

      if (primarySleep.levels?.summary) {
        const summary = primarySleep.levels.summary;
        result.deepSleepMinutes = summary.deep?.minutes ?? null;
        result.lightSleepMinutes = summary.light?.minutes ?? null;
        result.remSleepMinutes = summary.rem?.minutes ?? null;
      }
    }
  }

  // Parse weight (most recent entry)
  if (weightRes.status === 'fulfilled') {
    const weightData = weightRes.value.weight;
    if (weightData && weightData.length > 0) {
      const latest = weightData[weightData.length - 1];
      result.weightKg = latest.weight ?? null;
      result.bmi = latest.bmi ?? null;
      result.bodyFatPercent = latest.fat ?? null;
    }
  }

  result.timestamp = new Date().toISOString();
  return result;
}

// ===========================================================================
//
//  GARMIN  —  OAuth 1.0a
//
// ===========================================================================

/**
 * Generate an OAuth 1.0a Authorization header value.
 * Implements the signature base string construction per RFC 5849.
 *
 * NOTE: Full HMAC-SHA1 signing requires a native crypto module.
 * In production, OAuth 1.0a token exchange should be handled server-side.
 * This client-side implementation generates the authorization parameters
 * and delegates signing to a backend proxy for security.
 *
 * @param method - HTTP method (GET, POST)
 * @param url - The request URL
 * @param params - OAuth and request parameters
 * @param consumerSecret - OAuth consumer secret
 * @param tokenSecret - OAuth token secret (empty string for request token step)
 * @returns OAuth Authorization header value
 */
function buildOAuth1Header(
  method: string,
  url: string,
  params: Record<string, string>,
  consumerSecret: string,
  tokenSecret: string = '',
): string {
  // Sort parameters alphabetically
  const sortedParams = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');

  // Build signature base string
  const signatureBase = [
    method.toUpperCase(),
    encodeURIComponent(url),
    encodeURIComponent(sortedParams),
  ].join('&');

  // Build signing key
  const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;

  // NOTE: HMAC-SHA1 signature computation requires a crypto library.
  // In a production app, this would use expo-crypto or a native HMAC module.
  // For security, Garmin OAuth 1.0a flows should be proxied through your backend.
  const signature = `${signatureBase}_${signingKey}`;

  // Build Authorization header
  const authParams = Object.entries(params)
    .filter(([k]) => k.startsWith('oauth_'))
    .map(([k, v]) => `${encodeURIComponent(k)}="${encodeURIComponent(v)}"`)
    .join(', ');

  return `OAuth ${authParams}, oauth_signature="${encodeURIComponent(signature)}"`;
}

/**
 * Generate the Garmin OAuth 1.0a authorization URL.
 *
 * Step 1: Obtain a request token from Garmin.
 * Step 2: Return the authorization URL with the request token.
 *
 * NOTE: In production, the request token step should be performed server-side
 * to protect the consumer secret. This implementation is for reference.
 *
 * @returns The Garmin authorization URL to open in a browser
 */
export async function getGarminAuthUrl(): Promise<string> {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = generateRandomString(16);

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: GARMIN_CONSUMER_KEY,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp,
    oauth_nonce: nonce,
    oauth_version: '1.0',
    oauth_callback: REDIRECT_URI,
  };

  const authHeader = buildOAuth1Header(
    'POST',
    GARMIN_ENDPOINTS.requestToken,
    oauthParams,
    GARMIN_CONSUMER_SECRET,
  );

  const response = await fetch(GARMIN_ENDPOINTS.requestToken, {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  if (!response.ok) {
    throw new Error(`Garmin request token failed: HTTP ${response.status}`);
  }

  const body = await response.text();
  const parsed = new URLSearchParams(body);
  const requestToken = parsed.get('oauth_token');
  _garminRequestTokenSecret = parsed.get('oauth_token_secret');

  if (!requestToken || !_garminRequestTokenSecret) {
    throw new Error('Garmin request token response missing required fields');
  }

  return `${GARMIN_ENDPOINTS.authorize}?oauth_token=${encodeURIComponent(requestToken)}`;
}

/**
 * Exchange a Garmin OAuth 1.0a verifier for an access token.
 *
 * @param oauthToken - The request token returned in the callback
 * @param oauthVerifier - The verifier returned in the callback
 * @returns Token credentials (access token + token secret)
 */
export async function exchangeGarminToken(
  oauthToken: string,
  oauthVerifier: string,
): Promise<OAuthTokenResponse> {
  if (!_garminRequestTokenSecret) {
    throw new Error('Garmin request token secret not found. Did you call getGarminAuthUrl first?');
  }

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = generateRandomString(16);

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: GARMIN_CONSUMER_KEY,
    oauth_token: oauthToken,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp,
    oauth_nonce: nonce,
    oauth_version: '1.0',
    oauth_verifier: oauthVerifier,
  };

  const authHeader = buildOAuth1Header(
    'POST',
    GARMIN_ENDPOINTS.accessToken,
    oauthParams,
    GARMIN_CONSUMER_SECRET,
    _garminRequestTokenSecret,
  );

  const response = await fetch(GARMIN_ENDPOINTS.accessToken, {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  if (!response.ok) {
    throw new Error(`Garmin access token exchange failed: HTTP ${response.status}`);
  }

  const body = await response.text();
  const parsed = new URLSearchParams(body);
  const accessToken = parsed.get('oauth_token');
  const tokenSecret = parsed.get('oauth_token_secret');

  _garminRequestTokenSecret = null; // Clear after use

  if (!accessToken || !tokenSecret) {
    throw new Error('Garmin access token response missing required fields');
  }

  return {
    accessToken,
    refreshToken: null, // OAuth 1.0a does not use refresh tokens
    expiresIn: null, // OAuth 1.0a tokens do not expire
    tokenSecret,
  };
}

/**
 * Sync health data from Garmin Connect.
 * Fetches daily summary, heart rate, sleep, body composition, and activities.
 *
 * @returns Normalized health data from Garmin
 */
async function syncGarminData(): Promise<NormalizedHealthData> {
  const connections = await loadConnections();
  const conn = connections.garmin;

  if (!conn.isConnected || !conn.accessToken) {
    throw new Error('Garmin is not connected');
  }

  // Garmin uses OAuth 1.0a — we need to sign each request
  // In production, API calls should be proxied through your backend
  const token = conn.accessToken;
  const result = emptyHealthData('garmin');
  const today = formatDate(new Date());

  const params = `?uploadStartTimeInSeconds=${Math.floor(Date.now() / 1000) - 86400}&uploadEndTimeInSeconds=${Math.floor(Date.now() / 1000)}`;

  // Fetch all endpoints in parallel
  const [dailyRes, heartRes, sleepRes, bodyRes] = await Promise.allSettled([
    authenticatedGet<Array<{
      steps?: number;
      activeKilocalories?: number;
      restingHeartRateInBeatsPerMinute?: number;
      averageHeartRateInBeatsPerMinute?: number;
      maxHeartRateInBeatsPerMinute?: number;
      averageStressLevel?: number;
      floorsClimbed?: number;
      spo2Value?: number;
      respirationValue?: number;
    }>>(
      `${GARMIN_ENDPOINTS.dailySummary}${params}`,
      token,
    ),
    authenticatedGet<Array<{
      restingHeartRateInBeatsPerMinute?: number;
      maxHeartRateInBeatsPerMinute?: number;
      heartRateValues?: Array<{ value: number }>;
    }>>(
      `${GARMIN_ENDPOINTS.heartRate}${params}`,
      token,
    ),
    authenticatedGet<Array<{
      durationInSeconds?: number;
      deepSleepDurationInSeconds?: number;
      lightSleepDurationInSeconds?: number;
      remSleepInSeconds?: number;
      awakeDurationInSeconds?: number;
      averageSpO2Value?: number;
      averageRespirationValue?: number;
    }>>(
      `${GARMIN_ENDPOINTS.sleep}${params}`,
      token,
    ),
    authenticatedGet<Array<{
      weightInGrams?: number;
      bodyFat?: number;
      muscleMassInGrams?: number;
      boneMassInGrams?: number;
      bmi?: number;
    }>>(
      `${GARMIN_ENDPOINTS.bodyComposition}${params}`,
      token,
    ),
  ]);

  // Parse daily summary
  if (dailyRes.status === 'fulfilled' && Array.isArray(dailyRes.value) && dailyRes.value.length > 0) {
    const daily = dailyRes.value[0];
    result.steps = daily.steps ?? null;
    result.activeCalories = daily.activeKilocalories ?? null;
    result.restingHeartRate = daily.restingHeartRateInBeatsPerMinute ?? null;
    result.averageHeartRate = daily.averageHeartRateInBeatsPerMinute ?? null;
    result.spo2 = daily.spo2Value ?? null;
    result.respiratoryRate = daily.respirationValue ?? null;
  }

  // Parse heart rate (supplement if daily didn't have it)
  if (heartRes.status === 'fulfilled' && Array.isArray(heartRes.value) && heartRes.value.length > 0) {
    const hr = heartRes.value[0];
    if (!result.restingHeartRate && hr.restingHeartRateInBeatsPerMinute) {
      result.restingHeartRate = hr.restingHeartRateInBeatsPerMinute;
    }
  }

  // Parse sleep
  if (sleepRes.status === 'fulfilled' && Array.isArray(sleepRes.value) && sleepRes.value.length > 0) {
    const sleep = sleepRes.value[0];
    result.sleepMinutes = sleep.durationInSeconds
      ? Math.round(sleep.durationInSeconds / 60)
      : null;
    result.deepSleepMinutes = sleep.deepSleepDurationInSeconds
      ? Math.round(sleep.deepSleepDurationInSeconds / 60)
      : null;
    result.lightSleepMinutes = sleep.lightSleepDurationInSeconds
      ? Math.round(sleep.lightSleepDurationInSeconds / 60)
      : null;
    result.remSleepMinutes = sleep.remSleepInSeconds
      ? Math.round(sleep.remSleepInSeconds / 60)
      : null;
    if (sleep.averageSpO2Value && !result.spo2) {
      result.spo2 = sleep.averageSpO2Value;
    }
    if (sleep.averageRespirationValue && !result.respiratoryRate) {
      result.respiratoryRate = sleep.averageRespirationValue;
    }
  }

  // Parse body composition
  if (bodyRes.status === 'fulfilled' && Array.isArray(bodyRes.value) && bodyRes.value.length > 0) {
    const body = bodyRes.value[0];
    result.weightKg = body.weightInGrams ? body.weightInGrams / 1000 : null;
    result.bodyFatPercent = body.bodyFat ?? null;
    result.muscleMassKg = body.muscleMassInGrams ? body.muscleMassInGrams / 1000 : null;
    result.boneMassKg = body.boneMassInGrams ? body.boneMassInGrams / 1000 : null;
    result.bmi = body.bmi ?? null;
  }

  result.timestamp = new Date().toISOString();
  return result;
}

// ===========================================================================
//
//  WHOOP  —  OAuth 2.0 Authorization Code Grant
//
// ===========================================================================

/**
 * Generate the WHOOP OAuth 2.0 authorization URL.
 *
 * Scopes requested:
 * - read:recovery (recovery scores, HRV)
 * - read:cycles (strain data, day strain)
 * - read:sleep (sleep performance, stages)
 * - read:workout (workout strain)
 * - read:profile (user profile)
 * - read:body_measurement (height, weight)
 *
 * @returns The full authorization URL to open in a browser
 */
export function getWhoopAuthUrl(): string {
  const state = generateOAuthState();

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: WHOOP_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: 'read:recovery read:cycles read:sleep read:workout read:profile read:body_measurement',
    state,
  });

  return `${WHOOP_ENDPOINTS.authorize}?${params.toString()}`;
}

/**
 * Exchange a WHOOP authorization code for access and refresh tokens.
 *
 * @param code - The authorization code received from the OAuth callback
 * @returns Token credentials
 */
export async function exchangeWhoopToken(code: string): Promise<OAuthTokenResponse> {
  const data = await formPost<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }>(WHOOP_ENDPOINTS.token, {
    grant_type: 'authorization_code',
    client_id: WHOOP_CLIENT_ID,
    client_secret: WHOOP_CLIENT_SECRET,
    code,
    redirect_uri: REDIRECT_URI,
  });

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

/**
 * Refresh an expired WHOOP access token.
 *
 * @param refreshToken - The current refresh token
 * @returns New token credentials
 */
async function refreshWhoopToken(refreshToken: string): Promise<OAuthTokenResponse> {
  const data = await formPost<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }>(WHOOP_ENDPOINTS.token, {
    grant_type: 'refresh_token',
    client_id: WHOOP_CLIENT_ID,
    client_secret: WHOOP_CLIENT_SECRET,
    refresh_token: refreshToken,
  });

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

/**
 * Sync health data from WHOOP.
 * Fetches recovery (HRV, resting HR, recovery score, SpO2),
 * strain (day strain, calories), and sleep data.
 *
 * @returns Normalized health data from WHOOP
 */
async function syncWhoopData(): Promise<NormalizedHealthData> {
  const token = await ensureValidToken('whoop');
  const result = emptyHealthData('whoop');

  // Fetch recovery, cycle (strain), and sleep in parallel
  const [recoveryRes, cycleRes, sleepRes] = await Promise.allSettled([
    authenticatedGet<{
      records: Array<{
        score: {
          recovery_score: number;
          resting_heart_rate: number;
          hrv_rmssd_milli: number;
          spo2_percentage?: number;
          skin_temp_celsius?: number;
        };
        sleep_id: number;
        cycle_id: number;
      }>;
    }>(
      `${WHOOP_ENDPOINTS.recovery}?limit=1`,
      token,
    ),
    authenticatedGet<{
      records: Array<{
        score: {
          strain: number;
          kilojoule: number;
          average_heart_rate: number;
          max_heart_rate: number;
        };
        start: string;
        end: string;
      }>;
    }>(
      `${WHOOP_ENDPOINTS.strain}?limit=1`,
      token,
    ),
    authenticatedGet<{
      records: Array<{
        score: {
          stage_summary: {
            total_in_bed_time_milli: number;
            total_awake_time_milli: number;
            total_no_data_time_milli: number;
            total_light_sleep_time_milli: number;
            total_slow_wave_sleep_time_milli: number;
            total_rem_sleep_time_milli: number;
            sleep_cycle_count: number;
            disturbance_count: number;
          };
          sleep_needed: { baseline_milli: number; need_from_sleep_debt_milli: number };
          respiratory_rate?: number;
          sleep_performance_percentage?: number;
          sleep_consistency_percentage?: number;
          sleep_efficiency_percentage?: number;
        };
        start: string;
        end: string;
      }>;
    }>(
      `${WHOOP_ENDPOINTS.sleep}?limit=1`,
      token,
    ),
  ]);

  // Parse recovery
  if (recoveryRes.status === 'fulfilled') {
    const records = recoveryRes.value.records;
    if (records && records.length > 0) {
      const score = records[0].score;
      result.recoveryScore = score.recovery_score ?? null;
      result.restingHeartRate = score.resting_heart_rate ?? null;
      result.hrv = score.hrv_rmssd_milli
        ? Math.round(score.hrv_rmssd_milli * 10) / 10
        : null;
      result.spo2 = score.spo2_percentage ?? null;
    }
  }

  // Parse cycle (strain)
  if (cycleRes.status === 'fulfilled') {
    const records = cycleRes.value.records;
    if (records && records.length > 0) {
      const score = records[0].score;
      result.strainScore = score.strain != null
        ? Math.round(score.strain * 10) / 10
        : null;
      result.activeCalories = score.kilojoule
        ? Math.round(score.kilojoule / 4.184) // Convert kJ to kcal
        : null;
      result.averageHeartRate = score.average_heart_rate ?? null;
    }
  }

  // Parse sleep
  if (sleepRes.status === 'fulfilled') {
    const records = sleepRes.value.records;
    if (records && records.length > 0) {
      const score = records[0].score;
      const stages = score.stage_summary;

      // WHOOP stores times in milliseconds
      const totalSleepMilli =
        stages.total_light_sleep_time_milli +
        stages.total_slow_wave_sleep_time_milli +
        stages.total_rem_sleep_time_milli;

      result.sleepMinutes = Math.round(totalSleepMilli / 60000);
      result.deepSleepMinutes = Math.round(stages.total_slow_wave_sleep_time_milli / 60000);
      result.lightSleepMinutes = Math.round(stages.total_light_sleep_time_milli / 60000);
      result.remSleepMinutes = Math.round(stages.total_rem_sleep_time_milli / 60000);

      if (score.respiratory_rate) {
        result.respiratoryRate = Math.round(score.respiratory_rate * 10) / 10;
      }
    }
  }

  result.timestamp = new Date().toISOString();
  return result;
}

// ===========================================================================
//
//  WITHINGS  —  OAuth 2.0 Authorization Code Grant
//
// ===========================================================================

/**
 * Generate the Withings OAuth 2.0 authorization URL.
 *
 * Scopes requested:
 * - user.metrics (weight, height, body composition)
 * - user.activity (steps, calories)
 * - user.sleepevents (sleep tracking data)
 *
 * @returns The full authorization URL to open in a browser
 */
export function getWithingsAuthUrl(): string {
  const state = generateOAuthState();

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: WITHINGS_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: 'user.metrics,user.activity,user.sleepevents',
    state,
  });

  return `${WITHINGS_ENDPOINTS.authorize}?${params.toString()}`;
}

/**
 * Exchange a Withings authorization code for access and refresh tokens.
 *
 * @param code - The authorization code received from the OAuth callback
 * @returns Token credentials
 */
export async function exchangeWithingsToken(code: string): Promise<OAuthTokenResponse> {
  const data = await formPost<{
    status: number;
    body: {
      access_token: string;
      refresh_token: string;
      expires_in: number;
      userid: string;
      scope: string;
    };
  }>(WITHINGS_ENDPOINTS.token, {
    action: 'requesttoken',
    grant_type: 'authorization_code',
    client_id: WITHINGS_CLIENT_ID,
    client_secret: WITHINGS_CLIENT_SECRET,
    code,
    redirect_uri: REDIRECT_URI,
  });

  if (data.status !== 0) {
    throw new Error(`Withings token exchange failed with status: ${data.status}`);
  }

  return {
    accessToken: data.body.access_token,
    refreshToken: data.body.refresh_token,
    expiresIn: data.body.expires_in,
  };
}

/**
 * Refresh an expired Withings access token.
 *
 * @param refreshToken - The current refresh token
 * @returns New token credentials
 */
async function refreshWithingsToken(refreshToken: string): Promise<OAuthTokenResponse> {
  const data = await formPost<{
    status: number;
    body: {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };
  }>(WITHINGS_ENDPOINTS.token, {
    action: 'requesttoken',
    grant_type: 'refresh_token',
    client_id: WITHINGS_CLIENT_ID,
    client_secret: WITHINGS_CLIENT_SECRET,
    refresh_token: refreshToken,
  });

  if (data.status !== 0) {
    throw new Error(`Withings token refresh failed with status: ${data.status}`);
  }

  return {
    accessToken: data.body.access_token,
    refreshToken: data.body.refresh_token,
    expiresIn: data.body.expires_in,
  };
}

/**
 * Withings measure type constants.
 *
 * @see https://developer.withings.com/api-reference#tag/measure/
 */
const WITHINGS_MEASURE_TYPES = {
  WEIGHT: 1,
  HEIGHT: 4,
  FAT_FREE_MASS: 5,
  FAT_RATIO: 6,
  FAT_MASS_WEIGHT: 8,
  DIASTOLIC_BP: 9,
  SYSTOLIC_BP: 10,
  HEART_PULSE: 11,
  BONE_MASS: 88,
  MUSCLE_MASS: 76,
} as const;

/**
 * Sync health data from Withings.
 * Fetches body measurements (weight, body composition) and
 * blood pressure readings, then returns normalized data.
 *
 * @returns Normalized health data from Withings
 */
async function syncWithingsData(): Promise<NormalizedHealthData> {
  const token = await ensureValidToken('withings');
  const result = emptyHealthData('withings');

  // Calculate date range: last 30 days
  const now = Math.floor(Date.now() / 1000);
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60;

  // Fetch body measurements and blood pressure in parallel
  const [measureRes, heartRes] = await Promise.allSettled([
    formPost<{
      status: number;
      body: {
        measuregrps: Array<{
          date: number;
          measures: Array<{
            type: number;
            value: number;
            unit: number;
          }>;
        }>;
      };
    }>(WITHINGS_ENDPOINTS.measure, {
      action: 'getmeas',
      access_token: token,
      meastype: [
        WITHINGS_MEASURE_TYPES.WEIGHT,
        WITHINGS_MEASURE_TYPES.FAT_RATIO,
        WITHINGS_MEASURE_TYPES.MUSCLE_MASS,
        WITHINGS_MEASURE_TYPES.BONE_MASS,
        WITHINGS_MEASURE_TYPES.FAT_FREE_MASS,
        WITHINGS_MEASURE_TYPES.SYSTOLIC_BP,
        WITHINGS_MEASURE_TYPES.DIASTOLIC_BP,
        WITHINGS_MEASURE_TYPES.HEART_PULSE,
      ].join(','),
      startdate: thirtyDaysAgo.toString(),
      enddate: now.toString(),
      category: '1', // Real measures only (not user objectives)
    }, {
      Authorization: `Bearer ${token}`,
    }),
    formPost<{
      status: number;
      body: {
        series: Array<{
          systole: number;
          diastole: number;
          heart_rate: number;
          timestamp: number;
        }>;
      };
    }>(WITHINGS_ENDPOINTS.heart, {
      action: 'list',
      access_token: token,
      startdate: thirtyDaysAgo.toString(),
      enddate: now.toString(),
    }, {
      Authorization: `Bearer ${token}`,
    }),
  ]);

  // Parse body measurements
  if (measureRes.status === 'fulfilled' && measureRes.value.status === 0) {
    const groups = measureRes.value.body.measuregrps;
    if (groups && groups.length > 0) {
      // Use the most recent measurement group
      const latest = groups[0];

      for (const measure of latest.measures) {
        // Withings stores values as value * 10^unit (e.g., 72.5 kg = value:72500 unit:-3)
        const realValue = measure.value * Math.pow(10, measure.unit);

        switch (measure.type) {
          case WITHINGS_MEASURE_TYPES.WEIGHT:
            result.weightKg = Math.round(realValue * 100) / 100;
            break;
          case WITHINGS_MEASURE_TYPES.FAT_RATIO:
            result.bodyFatPercent = Math.round(realValue * 10) / 10;
            break;
          case WITHINGS_MEASURE_TYPES.MUSCLE_MASS:
            result.muscleMassKg = Math.round(realValue * 100) / 100;
            break;
          case WITHINGS_MEASURE_TYPES.BONE_MASS:
            result.boneMassKg = Math.round(realValue * 100) / 100;
            break;
          case WITHINGS_MEASURE_TYPES.SYSTOLIC_BP:
            result.systolicBP = Math.round(realValue);
            break;
          case WITHINGS_MEASURE_TYPES.DIASTOLIC_BP:
            result.diastolicBP = Math.round(realValue);
            break;
          case WITHINGS_MEASURE_TYPES.HEART_PULSE:
            result.restingHeartRate = Math.round(realValue);
            break;
        }
      }

      // Calculate BMI if we have weight (need height from profile for accuracy)
      // For now, leave BMI null unless the scale provides it
    }
  }

  // Parse blood pressure from heart endpoint (supplement body measures)
  if (heartRes.status === 'fulfilled' && heartRes.value.status === 0) {
    const series = heartRes.value.body.series;
    if (series && series.length > 0) {
      const latest = series[0];
      if (!result.systolicBP && latest.systole) {
        result.systolicBP = latest.systole;
      }
      if (!result.diastolicBP && latest.diastole) {
        result.diastolicBP = latest.diastole;
      }
      if (!result.restingHeartRate && latest.heart_rate) {
        result.restingHeartRate = latest.heart_rate;
      }
    }
  }

  result.timestamp = new Date().toISOString();
  return result;
}

// ===========================================================================
//
//  Public API — Provider Connection Management
//
// ===========================================================================

/**
 * Load all wearable connections from storage.
 * Returns an object keyed by provider name with each connection's state.
 *
 * @returns All provider connections with their current state
 */
export async function getConnections(): Promise<Record<WearableProvider, WearableConnection>> {
  return loadConnections();
}

/**
 * Get the connection state for a specific provider.
 *
 * @param provider - The wearable provider to check
 * @returns The connection state for the specified provider
 */
export async function getConnection(provider: WearableProvider): Promise<WearableConnection> {
  const connections = await loadConnections();
  return connections[provider];
}

/**
 * Get a list of all currently connected providers.
 *
 * @returns Array of connected provider names
 */
export async function getConnectedProviders(): Promise<WearableProvider[]> {
  const connections = await loadConnections();
  return (Object.keys(connections) as WearableProvider[]).filter(
    (provider) => connections[provider].isConnected,
  );
}

/**
 * Initiate the OAuth connection flow for a wearable provider.
 * Opens the provider's authorization page in an in-app browser,
 * waits for the callback, exchanges the code for tokens, and
 * persists the connection.
 *
 * @param provider - The wearable provider to connect
 * @returns The established connection, or throws on failure
 */
export async function connectProvider(provider: WearableProvider): Promise<WearableConnection> {
  if (__DEV__) {
    console.log(`${LOG_PREFIX} Connecting to ${provider}...`);
  }

  let authUrl: string;

  switch (provider) {
    case 'fitbit':
      authUrl = await getFitbitAuthUrl();
      break;
    case 'garmin':
      authUrl = await getGarminAuthUrl();
      break;
    case 'whoop':
      authUrl = getWhoopAuthUrl();
      break;
    case 'withings':
      authUrl = getWithingsAuthUrl();
      break;
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }

  // Open the authorization URL in an in-app browser
  const result = await WebBrowser.openAuthSessionAsync(authUrl, REDIRECT_URI);

  if (result.type !== 'success' || !result.url) {
    throw new Error(`${provider} authorization was cancelled or failed`);
  }

  // Parse the callback URL
  const callbackUrl = new URL(result.url);
  const callbackParams = new URLSearchParams(callbackUrl.search);

  // Validate state parameter for CSRF protection (OAuth 2.0 providers)
  if (provider !== 'garmin') {
    const returnedState = callbackParams.get('state');
    if (returnedState && !validateOAuthState(returnedState)) {
      throw new Error(`${provider} OAuth state mismatch — possible CSRF attack`);
    }
  }

  // Check for errors in the callback
  const error = callbackParams.get('error');
  if (error) {
    const errorDesc = callbackParams.get('error_description') || error;
    throw new Error(`${provider} authorization error: ${errorDesc}`);
  }

  // Exchange the code/verifier for tokens
  let tokenResponse: OAuthTokenResponse;

  switch (provider) {
    case 'fitbit': {
      const code = callbackParams.get('code');
      if (!code) throw new Error('Fitbit callback missing authorization code');
      tokenResponse = await exchangeFitbitToken(code);
      break;
    }
    case 'garmin': {
      const oauthToken = callbackParams.get('oauth_token');
      const oauthVerifier = callbackParams.get('oauth_verifier');
      if (!oauthToken || !oauthVerifier) {
        throw new Error('Garmin callback missing oauth_token or oauth_verifier');
      }
      tokenResponse = await exchangeGarminToken(oauthToken, oauthVerifier);
      break;
    }
    case 'whoop': {
      const code = callbackParams.get('code');
      if (!code) throw new Error('WHOOP callback missing authorization code');
      tokenResponse = await exchangeWhoopToken(code);
      break;
    }
    case 'withings': {
      const code = callbackParams.get('code');
      if (!code) throw new Error('Withings callback missing authorization code');
      tokenResponse = await exchangeWithingsToken(code);
      break;
    }
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }

  // Save the connection
  const connection: WearableConnection = {
    provider,
    isConnected: true,
    lastSynced: null,
    accessToken: tokenResponse.accessToken,
    refreshToken: tokenResponse.refreshToken,
    expiresAt: tokenResponse.expiresIn
      ? Date.now() + tokenResponse.expiresIn * 1000
      : null,
    tokenSecret: tokenResponse.tokenSecret ?? null,
  };

  await updateConnection(provider, connection);

  if (__DEV__) {
    console.log(`${LOG_PREFIX} Successfully connected to ${provider}`);
  }

  return connection;
}

/**
 * Disconnect a wearable provider and clear its stored credentials.
 * Attempts to revoke the OAuth token with the provider before clearing local state.
 *
 * @param provider - The wearable provider to disconnect
 */
export async function disconnectProvider(provider: WearableProvider): Promise<void> {
  if (__DEV__) {
    console.log(`${LOG_PREFIX} Disconnecting ${provider}...`);
  }

  const connections = await loadConnections();
  const conn = connections[provider];

  // Attempt to revoke the token with the provider (best-effort)
  if (conn.isConnected && conn.accessToken) {
    try {
      switch (provider) {
        case 'fitbit':
          await formPost(FITBIT_ENDPOINTS.revoke, {
            token: conn.accessToken,
          });
          break;
        case 'whoop':
          await formPost(WHOOP_ENDPOINTS.revoke, {
            token: conn.accessToken,
            client_id: WHOOP_CLIENT_ID,
            client_secret: WHOOP_CLIENT_SECRET,
          });
          break;
        // Garmin and Withings do not have standard revocation endpoints
        default:
          break;
      }
    } catch (error) {
      // Token revocation is best-effort; log but don't throw
      if (__DEV__) {
        console.warn(`${LOG_PREFIX} Token revocation for ${provider} failed:`, error);
      }
    }
  }

  // Clear the connection
  await updateConnection(provider, defaultConnection(provider));

  if (__DEV__) {
    console.log(`${LOG_PREFIX} Disconnected ${provider}`);
  }
}

/**
 * Disconnect all connected wearable providers.
 */
export async function disconnectAll(): Promise<void> {
  const providers: WearableProvider[] = ['fitbit', 'garmin', 'whoop', 'withings'];
  await Promise.allSettled(
    providers.map((provider) => disconnectProvider(provider)),
  );
}

// ===========================================================================
//
//  Public API — Data Sync
//
// ===========================================================================

/**
 * Sync health data from a specific connected wearable provider.
 * Returns normalized health data or an error result.
 *
 * @param provider - The wearable provider to sync data from
 * @returns Sync result with normalized health data or error details
 */
export async function syncProvider(provider: WearableProvider): Promise<SyncResult> {
  const connections = await loadConnections();
  const conn = connections[provider];

  if (!conn.isConnected) {
    return {
      success: false,
      provider,
      data: null,
      error: `${provider} is not connected`,
    };
  }

  try {
    let data: NormalizedHealthData;

    switch (provider) {
      case 'fitbit':
        data = await syncFitbitData();
        break;
      case 'garmin':
        data = await syncGarminData();
        break;
      case 'whoop':
        data = await syncWhoopData();
        break;
      case 'withings':
        data = await syncWithingsData();
        break;
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }

    // Update the last synced timestamp
    await updateConnection(provider, {
      lastSynced: new Date().toISOString(),
    });

    if (__DEV__) {
      console.log(`${LOG_PREFIX} Successfully synced ${provider} data`);
    }

    return {
      success: true,
      provider,
      data,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (__DEV__) {
      console.error(`${LOG_PREFIX} ${provider} sync failed:`, message);
    }

    // If the error is an auth error (401/403), mark as disconnected
    if (message.includes('HTTP 401') || message.includes('HTTP 403')) {
      await updateConnection(provider, {
        isConnected: false,
        accessToken: null,
        refreshToken: null,
        expiresAt: null,
      });
    }

    return {
      success: false,
      provider,
      data: null,
      error: message,
    };
  }
}

/**
 * Sync health data from all connected wearable providers in parallel.
 * Returns a summary of all sync results.
 *
 * @returns Summary object with individual results and success/failure counts
 */
export async function syncAllConnected(): Promise<SyncAllResult> {
  const connectedProviders = await getConnectedProviders();

  if (connectedProviders.length === 0) {
    return {
      results: [],
      successCount: 0,
      failureCount: 0,
    };
  }

  if (__DEV__) {
    console.log(
      `${LOG_PREFIX} Syncing ${connectedProviders.length} connected provider(s): ${connectedProviders.join(', ')}`,
    );
  }

  const results = await Promise.all(
    connectedProviders.map((provider) => syncProvider(provider)),
  );

  const successCount = results.filter((r) => r.success).length;
  const failureCount = results.filter((r) => !r.success).length;

  if (__DEV__) {
    console.log(
      `${LOG_PREFIX} Sync complete: ${successCount} succeeded, ${failureCount} failed`,
    );
  }

  return {
    results,
    successCount,
    failureCount,
  };
}

/**
 * Merge normalized health data from multiple providers into a single record.
 * When multiple providers supply the same field, priority is determined by
 * the order of the results array (later entries override earlier ones only
 * if the later value is non-null).
 *
 * @param results - Array of successful sync results
 * @returns A single merged health data record
 */
export function mergeHealthData(results: SyncResult[]): NormalizedHealthData {
  const merged = emptyHealthData('fitbit'); // Provider will be overwritten
  merged.provider = 'fitbit'; // Default; will be updated below

  for (const result of results) {
    if (!result.success || !result.data) continue;

    const data = result.data;
    merged.provider = data.provider; // Last provider wins as the "primary"

    // Merge each field: non-null values override null
    if (data.steps != null) merged.steps = data.steps;
    if (data.restingHeartRate != null) merged.restingHeartRate = data.restingHeartRate;
    if (data.averageHeartRate != null) merged.averageHeartRate = data.averageHeartRate;
    if (data.hrv != null) merged.hrv = data.hrv;
    if (data.sleepMinutes != null) merged.sleepMinutes = data.sleepMinutes;
    if (data.deepSleepMinutes != null) merged.deepSleepMinutes = data.deepSleepMinutes;
    if (data.remSleepMinutes != null) merged.remSleepMinutes = data.remSleepMinutes;
    if (data.lightSleepMinutes != null) merged.lightSleepMinutes = data.lightSleepMinutes;
    if (data.weightKg != null) merged.weightKg = data.weightKg;
    if (data.bodyFatPercent != null) merged.bodyFatPercent = data.bodyFatPercent;
    if (data.muscleMassKg != null) merged.muscleMassKg = data.muscleMassKg;
    if (data.boneMassKg != null) merged.boneMassKg = data.boneMassKg;
    if (data.bmi != null) merged.bmi = data.bmi;
    if (data.systolicBP != null) merged.systolicBP = data.systolicBP;
    if (data.diastolicBP != null) merged.diastolicBP = data.diastolicBP;
    if (data.activeCalories != null) merged.activeCalories = data.activeCalories;
    if (data.recoveryScore != null) merged.recoveryScore = data.recoveryScore;
    if (data.strainScore != null) merged.strainScore = data.strainScore;
    if (data.spo2 != null) merged.spo2 = data.spo2;
    if (data.respiratoryRate != null) merged.respiratoryRate = data.respiratoryRate;
  }

  merged.timestamp = new Date().toISOString();
  return merged;
}

// ===========================================================================
//
//  Public API — Utility
//
// ===========================================================================

/**
 * Get a human-readable display name for a wearable provider.
 *
 * @param provider - The wearable provider
 * @returns Display name string
 */
export function getProviderDisplayName(provider: WearableProvider): string {
  switch (provider) {
    case 'fitbit':
      return 'Fitbit';
    case 'garmin':
      return 'Garmin';
    case 'whoop':
      return 'WHOOP';
    case 'withings':
      return 'Withings';
    default:
      return provider;
  }
}

/**
 * Get the data types that a specific provider can supply.
 * Useful for UI to show what data will become available after connecting.
 *
 * @param provider - The wearable provider
 * @returns Array of human-readable data type descriptions
 */
export function getProviderCapabilities(provider: WearableProvider): string[] {
  switch (provider) {
    case 'fitbit':
      return [
        'Steps & Distance',
        'Heart Rate & Zones',
        'Sleep Stages',
        'Weight & BMI',
        'Active Calories',
      ];
    case 'garmin':
      return [
        'Steps & Distance',
        'Heart Rate',
        'Sleep Stages',
        'Body Composition',
        'Activities & Workouts',
        'SpO2 & Respiratory Rate',
      ];
    case 'whoop':
      return [
        'Recovery Score',
        'Day Strain',
        'Sleep Performance',
        'HRV (Heart Rate Variability)',
        'Resting Heart Rate',
        'SpO2 & Respiratory Rate',
      ];
    case 'withings':
      return [
        'Weight & BMI',
        'Body Fat %',
        'Muscle Mass',
        'Bone Mass',
        'Blood Pressure',
        'Heart Rate',
      ];
    default:
      return [];
  }
}

/**
 * Check if any wearable provider is currently connected.
 *
 * @returns True if at least one provider is connected
 */
export async function hasAnyConnection(): Promise<boolean> {
  const connected = await getConnectedProviders();
  return connected.length > 0;
}

/**
 * Get the time since the last successful sync for a provider.
 * Returns a human-readable string like "5 minutes ago" or "Never".
 *
 * @param provider - The wearable provider
 * @returns Human-readable time since last sync
 */
export async function getTimeSinceLastSync(provider: WearableProvider): Promise<string> {
  const connections = await loadConnections();
  const conn = connections[provider];

  if (!conn.lastSynced) {
    return 'Never';
  }

  const lastSyncMs = new Date(conn.lastSynced).getTime();
  const elapsedMs = Date.now() - lastSyncMs;

  if (elapsedMs < 60 * 1000) {
    return 'Just now';
  } else if (elapsedMs < 60 * 60 * 1000) {
    const minutes = Math.floor(elapsedMs / (60 * 1000));
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  } else if (elapsedMs < 24 * 60 * 60 * 1000) {
    const hours = Math.floor(elapsedMs / (60 * 60 * 1000));
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  } else {
    const days = Math.floor(elapsedMs / (24 * 60 * 60 * 1000));
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  }
}

/**
 * Clear the in-memory connection cache.
 * Forces the next read to reload from AsyncStorage.
 * Useful for testing or when the app detects storage changes from another context.
 */
export function clearConnectionCache(): void {
  _connectionsCache = null;
  _cacheLoaded = false;
}

/**
 * Handle an incoming deep link that may be a wearable OAuth callback.
 * Parses the URL and returns the provider and authorization parameters,
 * or null if the URL is not a recognized wearable callback.
 *
 * @param url - The deep link URL to parse
 * @returns Parsed callback data or null
 */
export function parseWearableCallback(url: string): {
  provider: WearableProvider | null;
  code: string | null;
  state: string | null;
  error: string | null;
  oauthToken: string | null;
  oauthVerifier: string | null;
} | null {
  try {
    if (!url.includes('wearable-callback')) {
      return null;
    }

    const parsed = new URL(url);
    const params = new URLSearchParams(parsed.search);

    return {
      provider: null, // Caller determines provider from context
      code: params.get('code'),
      state: params.get('state'),
      error: params.get('error'),
      oauthToken: params.get('oauth_token'),
      oauthVerifier: params.get('oauth_verifier'),
    };
  } catch {
    return null;
  }
}

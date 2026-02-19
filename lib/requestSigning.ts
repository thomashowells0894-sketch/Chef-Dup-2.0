import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

const SIGNING_KEY_ALIAS = 'vibefit_signing_key';
const REPLAY_WINDOW_MS = 300 * 1000; // 5 minutes
const CLOCK_SKEW_TOLERANCE_MS = 30 * 1000; // ±30 seconds clock skew tolerance
const NONCE_CACHE_MAX_SIZE = 1000;

/**
 * In-memory nonce cache for replay protection.
 * Stores nonces seen within the replay window to prevent exact replays.
 */
interface NonceEntry {
  nonce: string;
  expiresAt: number;
}

class NonceCache {
  private cache: Map<string, number> = new Map();

  /**
   * Check if a nonce has been seen before and record it.
   * Returns true if the nonce is new (not a replay), false if already seen.
   */
  checkAndRecord(nonce: string): boolean {
    this.cleanup();

    if (this.cache.has(nonce)) {
      return false; // Replay detected
    }

    // Evict oldest entries if cache is full
    if (this.cache.size >= NONCE_CACHE_MAX_SIZE) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(nonce, Date.now() + REPLAY_WINDOW_MS + CLOCK_SKEW_TOLERANCE_MS);
    return true;
  }

  /**
   * Remove expired nonces from the cache.
   */
  cleanup(): void {
    const now = Date.now();
    for (const [nonce, expiresAt] of this.cache) {
      if (now > expiresAt) {
        this.cache.delete(nonce);
      }
    }
  }

  /**
   * Get the current cache size (for testing).
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Clear all cached nonces (for testing).
   */
  clear(): void {
    this.cache.clear();
  }
}

// Singleton nonce cache
const nonceCache = new NonceCache();

// Periodic cleanup every 60 seconds
setInterval(() => nonceCache.cleanup(), 60_000);

/**
 * Get or generate a device-specific signing key stored in SecureStore.
 */
async function getSigningKey(): Promise<string> {
  let key = await SecureStore.getItemAsync(SIGNING_KEY_ALIAS);
  if (!key) {
    key = Crypto.randomUUID() + '-' + Crypto.randomUUID();
    await SecureStore.setItemAsync(SIGNING_KEY_ALIAS, key);
  }
  return key;
}

/**
 * Generate a random nonce for replay protection.
 */
function generateNonce(): string {
  return Crypto.randomUUID();
}

/**
 * Derive a CryptoKey from the signing key string for use with HMAC.
 * Uses Web Crypto API (available via expo-crypto polyfill).
 */
async function deriveHMACKey(keyString: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(keyString);
  return crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
}

/**
 * Compute proper HMAC-SHA256 signature.
 * Falls back to SHA256(key:data) if Web Crypto is unavailable.
 */
async function hmacSHA256(key: string, data: string): Promise<string> {
  try {
    const cryptoKey = await deriveHMACKey(key);
    const encoder = new TextEncoder();
    const signatureBuffer = await crypto.subtle.sign(
      'HMAC',
      cryptoKey,
      encoder.encode(data)
    );
    // Convert ArrayBuffer to hex string
    const hashArray = Array.from(new Uint8Array(signatureBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    // Fallback: use expo-crypto SHA256 with key prefix (less secure but functional)
    return Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `${key}:${data}`
    );
  }
}

/**
 * Sign a request and return the signature headers.
 */
export async function signRequest(
  method: string,
  url: string,
  body?: string | null
): Promise<{
  'x-vibefit-timestamp': string;
  'x-vibefit-signature': string;
  'x-vibefit-nonce': string;
}> {
  const key = await getSigningKey();
  const timestamp = Date.now().toString();
  const nonce = generateNonce();

  // Hash the body (or empty string)
  const bodyHash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    body || ''
  );

  // Build canonical string: method|url|timestamp|nonce|bodyHash
  const canonical = `${method.toUpperCase()}|${url}|${timestamp}|${nonce}|${bodyHash}`;

  // Proper HMAC-SHA256 signature
  const signature = await hmacSHA256(key, canonical);

  return {
    'x-vibefit-timestamp': timestamp,
    'x-vibefit-signature': signature,
    'x-vibefit-nonce': nonce,
  };
}

/**
 * Validate a timestamp is within the replay window, accounting for clock skew.
 * The total acceptance window is REPLAY_WINDOW_MS + CLOCK_SKEW_TOLERANCE_MS.
 */
export function isTimestampValid(timestampStr: string): boolean {
  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp)) return false;
  const diff = Math.abs(Date.now() - timestamp);
  return diff <= REPLAY_WINDOW_MS + CLOCK_SKEW_TOLERANCE_MS;
}

/**
 * Check if a nonce has been used before (replay detection).
 * Returns true if the nonce is fresh (not a replay).
 * Returns false if the nonce was already seen within the replay window.
 */
export function isNonceFresh(nonce: string): boolean {
  if (!nonce || typeof nonce !== 'string') return false;
  return nonceCache.checkAndRecord(nonce);
}

/**
 * Validate both timestamp and nonce for full replay protection.
 * Use this on the server side to validate incoming signed requests.
 */
export function validateReplayProtection(timestampStr: string, nonce: string): {
  valid: boolean;
  reason?: string;
} {
  if (!isTimestampValid(timestampStr)) {
    return { valid: false, reason: 'Timestamp outside replay window' };
  }
  if (!isNonceFresh(nonce)) {
    return { valid: false, reason: 'Duplicate nonce — possible replay attack' };
  }
  return { valid: true };
}

/**
 * Create a drop-in fetch wrapper that signs all outgoing requests.
 * Falls back to unsigned requests on any signing error.
 */
export function createSignedFetch(originalFetch: typeof fetch): typeof fetch {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    try {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request).url;
      const method = init?.method || (typeof input === 'object' && 'method' in input ? (input as Request).method : 'GET');
      const body = init?.body ? String(init.body) : null;

      const sigHeaders = await signRequest(method, url, body);

      const headers = new Headers(init?.headers);
      headers.set('x-vibefit-timestamp', sigHeaders['x-vibefit-timestamp']);
      headers.set('x-vibefit-signature', sigHeaders['x-vibefit-signature']);
      headers.set('x-vibefit-nonce', sigHeaders['x-vibefit-nonce']);

      return originalFetch(input, { ...init, headers });
    } catch {
      // Graceful fallback: send unsigned request
      return originalFetch(input, init);
    }
  };
}

// Export for testing
export { nonceCache as _nonceCache, REPLAY_WINDOW_MS, CLOCK_SKEW_TOLERANCE_MS };

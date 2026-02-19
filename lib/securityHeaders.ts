/**
 * Security Headers for Web API Calls
 *
 * Provides standard security headers to attach to all outgoing HTTP requests
 * from the client. These headers help prevent content sniffing attacks,
 * clickjacking, and aid in request tracing and version tracking.
 */
import * as Crypto from 'expo-crypto';

/**
 * App version — pulled from package.json at build time.
 * Falls back to 'unknown' if unavailable.
 */
let _appVersion: string | null = null;
function getAppVersion(): string {
  if (_appVersion !== null) return _appVersion;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pkg = require('../package.json');
    _appVersion = pkg.version || 'unknown';
  } catch {
    _appVersion = 'unknown';
  }
  return _appVersion!;
}

/**
 * Generate a unique request ID for tracing.
 * Uses crypto.randomUUID() for a v4 UUID.
 */
function generateRequestId(): string {
  try {
    return Crypto.randomUUID();
  } catch {
    // Fallback: timestamp + random suffix
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

/**
 * Get standard security headers to include with outgoing API requests.
 *
 * Headers:
 * - X-Content-Type-Options: Prevents MIME-type sniffing
 * - X-Frame-Options: Prevents clickjacking via framing
 * - X-Request-ID: Unique ID for request tracing and debugging
 * - X-Client-Version: App version for server-side compatibility checks
 */
export function getSecurityHeaders(): Record<string, string> {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-Request-ID': generateRequestId(),
    'X-Client-Version': getAppVersion(),
  };
}

/**
 * Create a fetch wrapper that automatically attaches security headers
 * to all outgoing requests.
 */
export function createSecureHeadersFetch(originalFetch: typeof fetch): typeof fetch {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const securityHeaders = getSecurityHeaders();
    const headers = new Headers(init?.headers);

    for (const [key, value] of Object.entries(securityHeaders)) {
      // Don't overwrite headers that are already set
      if (!headers.has(key)) {
        headers.set(key, value);
      }
    }

    return originalFetch(input, { ...init, headers });
  };
}

/**
 * WebView URL allowlist for CSP-equivalent protection in React Native.
 *
 * Use this with any WebView component to restrict which URLs can be loaded.
 * Only origins in this list should be permitted.
 */
export const WEBVIEW_ALLOWED_ORIGINS: readonly string[] = [
  'https://*.supabase.co',
  'https://api.nal.usda.gov',
  'https://world.openfoodfacts.org',
  'https://world.openfoodfacts.net',
  'https://platform.fatsecret.com',
  'https://trackapi.nutritionix.com',
  'https://oauth.fatsecret.com',
] as const;

/**
 * Check if a URL is allowed for WebView navigation.
 * Validates against the WEBVIEW_ALLOWED_ORIGINS allowlist.
 *
 * @param url - The URL to validate
 * @returns true if the URL is allowed, false otherwise
 */
export function isWebViewUrlAllowed(url: string): boolean {
  if (!url || typeof url !== 'string') return false;

  try {
    const parsed = new URL(url);

    // Only HTTPS is allowed
    if (parsed.protocol !== 'https:') return false;

    for (const origin of WEBVIEW_ALLOWED_ORIGINS) {
      const originUrl = new URL(origin.replace('*', 'wildcard-placeholder'));
      const originHost = originUrl.hostname.replace('wildcard-placeholder', '');

      // Check for wildcard subdomain match
      if (origin.includes('*')) {
        // *.supabase.co matches anything.supabase.co
        if (parsed.hostname.endsWith(originHost) || parsed.hostname === originHost.slice(1)) {
          return true;
        }
      } else {
        // Exact host match
        if (parsed.hostname === originUrl.hostname) {
          return true;
        }
      }
    }
  } catch {
    return false;
  }

  return false;
}

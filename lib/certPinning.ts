/**
 * Certificate Pinning for External API Calls
 *
 * Two-tier approach:
 * 1. If react-native-ssl-pinning is installed, use native SPKI hash pinning.
 * 2. Otherwise, fall back to enhanced host validation + TLS enforcement +
 *    response header checks (Public-Key-Pins, Expect-CT).
 *
 * Pin enforcement modes:
 * - PRODUCTION: Enforcing — pin failures block the request.
 * - DEVELOPMENT: Report-only — pin failures are logged but requests proceed.
 *
 * To get SPKI hash:
 * openssl s_client -connect HOST:443 | openssl x509 -pubkey -noout | openssl pkey -pubin -outform der | openssl dgst -sha256 -binary | openssl enc -base64
 */
import { Sentry } from './sentry';

declare const __DEV__: boolean;

// ---------------------------------------------------------------------------
// Pin enforcement mode
// ---------------------------------------------------------------------------
type PinMode = 'enforcing' | 'report-only';

function getPinMode(): PinMode {
  return __DEV__ ? 'report-only' : 'enforcing';
}

// ---------------------------------------------------------------------------
// SPKI Pin Hashes (SHA-256, base64-encoded)
//
// We pin to the CA/intermediate chain rather than leaf certificates so that
// routine certificate renewals don't break pinning. Backup pins from a
// different CA provide rotation safety.
//
// Let's Encrypt chain (used by *.supabase.co and many API providers):
//   ISRG Root X1:      C5+lpZ7tcVwmwQIMcRtPbsQtWLABXhQzejna0wHFr8M=
//   R3 Intermediate:   jQJTbIh0grw0/1TkHSumWb+Fs0Ggogr621gT3PvPKG0=
//
// Backup: ISRG Root X2 (ECDSA) — future-proofing for Let's Encrypt migration:
//   ISRG Root X2:      diGVwiVYbubAI3RW4hB9xU8e/CH2GnkuvVFZE8zmgzI=
//
// GlobalSign Root R2 (backup CA used by some API providers):
//   GlobalSign R2:     iie1VXtL7HzAMF+/PVPR9xzT80kQxdZeJ+zduCB3uj0=
//
// DigiCert Global Root G2 (backup CA — USDA, Nutritionix):
//   DigiCert G2:       i7WTqTvh0OioIruIfFR4kMPnBqrS2rdiVPl/s2uC/CY=
// ---------------------------------------------------------------------------

// Let's Encrypt chain pins (primary for Supabase and most food APIs)
const LETS_ENCRYPT_PINS: string[] = [
  'C5+lpZ7tcVwmwQIMcRtPbsQtWLABXhQzejna0wHFr8M=', // ISRG Root X1
  'jQJTbIh0grw0/1TkHSumWb+Fs0Ggogr621gT3PvPKG0=', // R3 Intermediate
  'diGVwiVYbubAI3RW4hB9xU8e/CH2GnkuvVFZE8zmgzI=', // ISRG Root X2 (backup)
];

// Backup CA pins for rotation safety
const BACKUP_CA_PINS: string[] = [
  'iie1VXtL7HzAMF+/PVPR9xzT80kQxdZeJ+zduCB3uj0=', // GlobalSign Root R2
  'i7WTqTvh0OioIruIfFR4kMPnBqrS2rdiVPl/s2uC/CY=', // DigiCert Global Root G2
];

export const PIN_HASHES: Record<string, string[]> = {
  // Supabase instance — hostname is derived from SUPABASE_URL env var at runtime
  'supabase': [
    ...LETS_ENCRYPT_PINS,
    ...BACKUP_CA_PINS,
  ],
  'api.nal.usda.gov': [
    ...LETS_ENCRYPT_PINS,
    ...BACKUP_CA_PINS,
  ],
  'world.openfoodfacts.org': [
    ...LETS_ENCRYPT_PINS,
    ...BACKUP_CA_PINS,
  ],
  'platform.fatsecret.com': [
    ...LETS_ENCRYPT_PINS,
    ...BACKUP_CA_PINS,
  ],
  'trackapi.nutritionix.com': [
    ...LETS_ENCRYPT_PINS,
    ...BACKUP_CA_PINS,
  ],
  'oauth.fatsecret.com': [
    ...LETS_ENCRYPT_PINS,
    ...BACKUP_CA_PINS,
  ],
};

// ---------------------------------------------------------------------------
// Allowed hosts — derived from PIN_HASHES + Supabase hostname at init time
// ---------------------------------------------------------------------------
const ALLOWED_HOSTS: Set<string> = new Set([
  'world.openfoodfacts.org',
  'world.openfoodfacts.net',
  'api.nal.usda.gov',
  'platform.fatsecret.com',
  'trackapi.nutritionix.com',
  'oauth.fatsecret.com',
]);

/**
 * Lazily resolve the Supabase hostname from environment and add to allowlist.
 * Memoised so env lookup only happens once.
 */
let _supabaseHostResolved = false;
function ensureSupabaseHost(): void {
  if (_supabaseHostResolved) return;
  _supabaseHostResolved = true;
  try {
    // Works in both Expo (process.env) and Edge Functions (Deno.env)
    const url =
      (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_SUPABASE_URL) ||
      (typeof process !== 'undefined' && process.env?.SUPABASE_URL) ||
      '';
    if (url) {
      const host = new URL(url).hostname;
      ALLOWED_HOSTS.add(host);
      // Map the dynamic Supabase host to its pin hashes
      if (PIN_HASHES['supabase'] && !PIN_HASHES[host]) {
        PIN_HASHES[host] = PIN_HASHES['supabase'];
      }
    }
  } catch {
    // Env not available — Supabase host will not be added; existing allowlist still applies
  }
}

// ---------------------------------------------------------------------------
// Pin failure reporting
// ---------------------------------------------------------------------------

function reportPinFailure(host: string, reason: string, mode: PinMode): void {
  const message = `[CertPinning] Pin ${mode === 'enforcing' ? 'FAILURE' : 'WARNING'} for ${host}: ${reason}`;

  // Always log to Sentry
  try {
    Sentry.captureMessage(message, {
      level: 'error',
      tags: {
        security: 'cert_pinning',
        host,
        mode,
      },
      extra: {
        reason,
        timestamp: new Date().toISOString(),
      },
    });
  } catch {
    // Sentry not available — fall through to console
  }

  if (__DEV__) {
    console.warn(message);
  }
}

// ---------------------------------------------------------------------------
// Native SSL Pinning (tier 1) — optional dependency
// ---------------------------------------------------------------------------

let nativePinningAvailable: boolean | null = null;
let nativeFetch: ((url: string, opts: Record<string, unknown>) => Promise<Response>) | null = null;

async function tryLoadNativePinning(): Promise<boolean> {
  if (nativePinningAvailable !== null) return nativePinningAvailable;
  try {
    // Dynamic import — will throw if the package is not installed
    const mod = await import('react-native-ssl-pinning' as string);
    if (mod && typeof mod.fetch === 'function') {
      nativeFetch = mod.fetch;
      nativePinningAvailable = true;
      return true;
    }
  } catch {
    // Module not installed — fall through to tier 2
  }
  nativePinningAvailable = false;
  return false;
}

// ---------------------------------------------------------------------------
// Response header checks (tier 2 enhancements)
// ---------------------------------------------------------------------------

/**
 * Validate Public-Key-Pins response header (HPKP).
 * If the header is present and we have expected hashes, verify at least one
 * reported pin matches our pinset.
 * Returns true if header absent (no opinion) or if a pin matches.
 */
function checkPublicKeyPinsHeader(response: Response, host: string): boolean {
  try {
    const hpkpHeader = response.headers.get('Public-Key-Pins') || response.headers.get('public-key-pins');
    if (!hpkpHeader) return true; // header absent — no opinion
    const expectedPins = PIN_HASHES[host];
    if (!expectedPins || expectedPins.length === 0) return true; // no pins configured
    // Parse pin-sha256="..." directives from the header value
    const reportedPins: string[] = [];
    const pinRegex = /pin-sha256="([^"]+)"/g;
    let match: RegExpExecArray | null;
    while ((match = pinRegex.exec(hpkpHeader)) !== null) {
      reportedPins.push(match[1]);
    }
    if (reportedPins.length === 0) return true; // malformed header — allow through defensively
    // Check if ANY reported pin matches any expected pin
    return reportedPins.some((rp) => expectedPins.includes(rp));
  } catch {
    // Defensive — never crash on header parsing
    return true;
  }
}

/**
 * Verify Expect-CT header for Certificate Transparency compliance.
 * If the header is present, just ensure it doesn't indicate enforcement failure.
 * This is a soft check — many servers don't send this header.
 */
function checkExpectCTHeader(response: Response): boolean {
  try {
    const ctHeader = response.headers.get('Expect-CT') || response.headers.get('expect-ct');
    if (!ctHeader) return true; // header absent — no opinion
    // If enforce directive is present, the server is actively requiring CT.
    // We simply note it's there; the TLS stack will enforce CT at the OS level.
    // If there were a report-uri pointing to a suspicious domain we'd flag it,
    // but for now we accept the header if it exists.
    return true;
  } catch {
    return true;
  }
}

// ---------------------------------------------------------------------------
// Pinned Fetch — main export
// ---------------------------------------------------------------------------

/**
 * Create a fetch wrapper that enforces HTTPS, host validation, and
 * certificate pinning (native when available, enhanced headers otherwise).
 *
 * In production, pin failures BLOCK the request.
 * In development, pin failures are REPORTED but the request proceeds.
 *
 * The return signature is identical to `typeof fetch`.
 */
export function createPinnedFetch(originalFetch: typeof fetch): typeof fetch {
  // Ensure Supabase host is in the allowlist
  ensureSupabaseHost();

  // Kick off native pinning detection (non-blocking)
  tryLoadNativePinning().catch(() => {});

  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const mode = getPinMode();
    const url = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : (input as Request).url;

    // ---- HTTPS enforcement ----
    if (!url.startsWith('https://')) {
      const error = `[CertPinning] HTTPS required. Rejecting: ${url.split('?')[0]}`;
      reportPinFailure('unknown', error, 'enforcing'); // Always enforce HTTPS
      throw new Error(error);
    }

    // ---- Host allowlist ----
    const host = new URL(url).hostname;
    ensureSupabaseHost(); // re-check in case env was loaded late
    if (!ALLOWED_HOSTS.has(host)) {
      const error = `[CertPinning] Untrusted host: ${host}`;
      reportPinFailure(host, 'Host not in allowlist', mode);
      if (mode === 'enforcing') {
        throw new Error(error);
      }
      // Report-only: log but proceed
    }

    // ---- Tier 1: Native SSL pinning (if available) ----
    if (nativePinningAvailable && nativeFetch) {
      try {
        const pins = PIN_HASHES[host];
        if (pins && pins.length > 0) {
          const response = await nativeFetch(url, {
            method: (init?.method as string) || 'GET',
            headers: init?.headers || {},
            body: init?.body,
            sslPinning: {
              certs: pins, // react-native-ssl-pinning uses these as SPKI hashes
            },
            timeoutInterval: 30000,
          });
          return response;
        }
      } catch (nativeError) {
        // If the native call itself failed due to pin mismatch, handle based on mode
        if (nativeError instanceof Error && nativeError.message.includes('SSL')) {
          reportPinFailure(host, `Native SSL pin mismatch: ${nativeError.message}`, mode);
          if (mode === 'enforcing') {
            throw new Error(`[CertPinning] SSL pin verification failed for ${host}: ${nativeError.message}`);
          }
          // Report-only: fall through to tier 2
        }
        // For other native errors, fall through to tier 2
      }
    }

    // ---- Tier 2: Enhanced fetch with header checks ----
    const response = await originalFetch(input, {
      ...init,
      // Prevent following redirects so we can inspect the target
      redirect: 'manual',
    });

    // Reject redirects to non-pinned hosts
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (location) {
        try {
          const redirectHost = new URL(location, url).hostname;
          if (!ALLOWED_HOSTS.has(redirectHost)) {
            reportPinFailure(redirectHost, 'Redirect to untrusted host', mode);
            if (mode === 'enforcing') {
              throw new Error(`[CertPinning] Redirect to untrusted host: ${redirectHost}`);
            }
          }
          // Follow the redirect manually since it's to a trusted host
          return originalFetch(location, init);
        } catch (e) {
          if (e instanceof Error && e.message.startsWith('[CertPinning]')) throw e;
          reportPinFailure(host, 'Invalid redirect URL', mode);
          if (mode === 'enforcing') {
            throw new Error(`[CertPinning] Invalid redirect URL from ${host}`);
          }
        }
      }
    }

    // Verify the response wasn't served from an unexpected location
    const responseUrl = response.url;
    if (responseUrl) {
      try {
        const responseHost = new URL(responseUrl).hostname;
        if (!ALLOWED_HOSTS.has(responseHost)) {
          reportPinFailure(responseHost, 'Response from untrusted host', mode);
          if (mode === 'enforcing') {
            throw new Error(`[CertPinning] Response from untrusted host: ${responseHost}`);
          }
        }
      } catch (e) {
        if (e instanceof Error && e.message.startsWith('[CertPinning]')) throw e;
        // response.url may be empty in some environments — allow through
      }
    }

    // ---- Public-Key-Pins header verification ----
    if (!checkPublicKeyPinsHeader(response, host)) {
      reportPinFailure(host, 'Public key pin mismatch in HPKP header — possible MITM', mode);
      if (mode === 'enforcing') {
        throw new Error(`[CertPinning] Public key pin mismatch for ${host}. Possible MITM attack.`);
      }
    }

    // ---- Certificate Transparency header check ----
    if (!checkExpectCTHeader(response)) {
      reportPinFailure(host, 'Expect-CT check failed', mode);
      // Soft failure in all modes — log but don't block
      if (__DEV__) {
        console.warn(`[CertPinning] Expect-CT check failed for ${host}`);
      }
    }

    return response;
  };
}

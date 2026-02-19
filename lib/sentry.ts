import * as Sentry from '@sentry/react-native';

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN ?? '';

// Fields that must never leave the device
const SENSITIVE_FIELDS = [
  'password',
  'token',
  'email',
  'accessToken',
  'refreshToken',
  'authorization',
  'cookie',
  'secret',
  'creditCard',
  'ssn',
  'phoneNumber',
];

function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase();
  return SENSITIVE_FIELDS.some((field) => lower.includes(field.toLowerCase()));
}

/**
 * Recursively redact sensitive values from an object.
 * Returns a shallow-cloned structure with redacted strings.
 */
function redactSensitiveData<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => redactSensitiveData(item)) as unknown as T;
  }

  if (typeof obj === 'object') {
    const redacted: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (isSensitiveKey(key)) {
        redacted[key] = '[Redacted]';
      } else if (typeof value === 'object' && value !== null) {
        redacted[key] = redactSensitiveData(value);
      } else {
        redacted[key] = value;
      }
    }
    return redacted as T;
  }

  return obj;
}

/**
 * Determine the current environment string.
 */
function getEnvironment(): string {
  if (__DEV__) return 'development';
  if (process.env.EXPO_PUBLIC_APP_ENV === 'staging') return 'staging';
  return 'production';
}

/**
 * Get the app version for release tracking.
 * Format: fitness-app@<version> (matches sentry-cli release naming)
 */
function getRelease(): string {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { version } = require('../package.json');
  return `fitness-app@${version}`;
}

/**
 * Get the dist identifier for source map association.
 * Uses the EAS build number or a fallback for development.
 */
function getDist(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Constants = require('expo-constants').default;
    // EAS Build sets runtimeVersion or use the native build number
    return (
      Constants.expoConfig?.runtimeVersion ??
      Constants.nativeBuildVersion ??
      '1'
    );
  } catch {
    return '1';
  }
}

export function initSentry(): void {
  if (!DSN) {
    if (__DEV__) console.log('[Sentry] No DSN configured, skipping init');
    return;
  }

  const environment = getEnvironment();

  Sentry.init({
    dsn: DSN,
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,
    enableAutoSessionTracking: true,
    sessionTrackingIntervalMillis: 30_000,
    debug: __DEV__,
    enabled: !__DEV__,
    environment,
    release: getRelease(),
    dist: getDist(),

    // Send 100% of errors in dev, 50% in prod for cost management
    sampleRate: __DEV__ ? 1.0 : 0.5,

    beforeSend(event) {
      // Redact request data
      if (event.request?.data) {
        event.request.data = redactSensitiveData(event.request.data);
      }
      if (event.request?.headers) {
        event.request.headers = redactSensitiveData(event.request.headers);
      }
      if (event.request?.query_string) {
        event.request.query_string = redactSensitiveData(
          event.request.query_string,
        );
      }

      // Redact sensitive context values
      if (event.contexts) {
        event.contexts = redactSensitiveData(event.contexts);
      }

      // Redact extra data
      if (event.extra) {
        event.extra = redactSensitiveData(event.extra);
      }

      // Strip PII from user context — keep only id
      if (event.user) {
        event.user = { id: event.user.id };
      }

      return event;
    },

    beforeBreadcrumb(breadcrumb) {
      // Remove sensitive data from breadcrumbs
      if (breadcrumb.data) {
        breadcrumb.data = redactSensitiveData(breadcrumb.data);
      }

      // Strip request body/headers from HTTP breadcrumbs
      if (breadcrumb.category === 'http' && breadcrumb.data) {
        delete breadcrumb.data.request_body;
        delete breadcrumb.data.response_body;
        if (breadcrumb.data.url) {
          // Remove query parameters that might contain tokens
          try {
            const url = new URL(breadcrumb.data.url);
            for (const key of [...url.searchParams.keys()]) {
              if (isSensitiveKey(key)) {
                url.searchParams.set(key, '[Redacted]');
              }
            }
            breadcrumb.data.url = url.toString();
          } catch {
            // URL parsing failed — leave as-is
          }
        }
      }

      return breadcrumb;
    },
  });
}

/**
 * Set Sentry user context with only the user ID (no PII).
 */
export function setSentryUser(userId: string | null): void {
  if (userId) {
    Sentry.setUser({ id: userId });
  } else {
    Sentry.setUser(null);
  }
}

/**
 * Performance transaction names for key screens.
 * Use these with Sentry.startTransaction() for consistent naming.
 */
export const SCREEN_TRANSACTIONS = {
  DIARY: 'screen.diary',
  DASHBOARD: 'screen.dashboard',
  ADD_FOOD: 'screen.add_food',
  PROFILE: 'screen.profile',
  STATS: 'screen.stats',
  CHAT: 'screen.chat',
  WORKOUT: 'screen.workout',
  MEAL_PLAN: 'screen.meal_plan',
  SETTINGS: 'screen.settings',
  AI_COACHING: 'screen.ai_coaching',
} as const;

export { Sentry };

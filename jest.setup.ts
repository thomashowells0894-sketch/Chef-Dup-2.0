// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(() => Promise.resolve(null)),
    setItem: jest.fn(() => Promise.resolve()),
    removeItem: jest.fn(() => Promise.resolve()),
    multiSet: jest.fn(() => Promise.resolve()),
    multiRemove: jest.fn(() => Promise.resolve()),
    getAllKeys: jest.fn(() => Promise.resolve([])),
  },
}));

// Mock expo-secure-store
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
}));

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(() => Promise.resolve()),
  impactAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
}));

// Mock expo-local-authentication (virtual — package may not be installed)
jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn(() => Promise.resolve(true)),
  isEnrolledAsync: jest.fn(() => Promise.resolve(true)),
  supportedAuthenticationTypesAsync: jest.fn(() => Promise.resolve([1])),
  authenticateAsync: jest.fn(() => Promise.resolve({ success: true })),
  AuthenticationType: { FINGERPRINT: 1, FACIAL_RECOGNITION: 2, IRIS: 3 },
}), { virtual: true });

// Mock lib/supabase — avoid real Supabase client init that requires env vars
jest.mock('./lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
      getUser: jest.fn(() => Promise.resolve({ data: { user: null }, error: null })),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(() => Promise.resolve({ data: null, error: null })),
    })),
    functions: {
      invoke: jest.fn(() => Promise.resolve({ data: null, error: null })),
    },
  },
}));

// Mock @sentry/react-native
jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  setUser: jest.fn(),
  wrap: jest.fn((component: unknown) => component),
  ReactNavigationInstrumentation: jest.fn(),
  ReactNativeTracing: jest.fn(),
}));

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Mock expo-crypto
jest.mock('expo-crypto', () => {
  let counter = 0;
  return {
    randomUUID: jest.fn(() => `mock-uuid-${++counter}-${Date.now()}`),
    digestStringAsync: jest.fn((_algo: string, data: string) => {
      // Return a deterministic hex string based on input
      let hash = 0;
      for (let i = 0; i < data.length; i++) {
        const char = data.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0;
      }
      return Promise.resolve(Math.abs(hash).toString(16).padStart(64, '0'));
    }),
    CryptoDigestAlgorithm: {
      SHA256: 'SHA-256',
      SHA512: 'SHA-512',
    },
  };
});

// Mock SubscriptionContext
jest.mock('./context/SubscriptionContext', () => ({
  useSubscription: jest.fn(() => ({
    isInitialized: true,
    isPremium: false,
    isLoading: false,
    purchaseInProgress: false,
    offerings: null,
    packages: [],
    monthlyPackage: undefined,
    annualPackage: undefined,
    annualSavings: 0,
    customerInfo: null,
    subscriptionInfo: null,
    isTrialing: false,
    trialEndDate: null,
    hasExpiredTrial: false,
    subscriptionType: 'none',
    purchaseDate: null,
    checkFeature: jest.fn(() => false),
    purchasePackage: jest.fn(() => Promise.resolve({ success: false })),
    restorePurchases: jest.fn(() => Promise.resolve({ success: false })),
  })),
  useIsPremium: jest.fn(() => ({
    isPremium: false,
    isLoading: false,
  })),
  SubscriptionProvider: ({ children }: { children: React.ReactNode }) => children,
  PRODUCT_IDS: {
    MONTHLY: 'vibefit_premium_monthly',
    YEARLY: 'vibefit_premium_yearly',
  },
}));

// Set global __DEV__
(global as Record<string, unknown>).__DEV__ = true;

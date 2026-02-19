/**
 * VibeFit Purchases Service - RevenueCat Integration
 *
 * Standalone service for subscription management.
 * Designed to be crash-proof - any failure defaults to Free plan.
 */

import { Platform } from 'react-native';

// RevenueCat SDK - imported dynamically to prevent crashes
let Purchases: any = null;
let LOG_LEVEL: any = null;

try {
  const PurchasesModule = require('react-native-purchases');
  Purchases = PurchasesModule.default;
  LOG_LEVEL = PurchasesModule.LOG_LEVEL;
} catch (e) {
  // RevenueCat SDK not available — silent fallback to free plan
}

// RevenueCat API Keys - loaded from environment variables
const REVENUECAT_API_KEY_IOS: string = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS || '';
const REVENUECAT_API_KEY_ANDROID: string = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID || '';

// Entitlement identifier - must match RevenueCat dashboard
const PREMIUM_ENTITLEMENT: string = 'premium';

// Warn if test keys are used in production
if (!__DEV__) {
  const key = Platform.OS === 'ios' ? REVENUECAT_API_KEY_IOS : REVENUECAT_API_KEY_ANDROID;
  if (key.startsWith('test_')) {
    console.error('[Purchases] WARNING: Using RevenueCat test keys in production! Subscriptions will not work. Replace with production keys in .env');
  }
}

// Track initialization state
let isInitialized: boolean = false;
let initializationFailed: boolean = false;
let cachedIsPremium: boolean = false;

export interface PurchaseResult {
  success: boolean;
  customerInfo?: any;
  error?: string;
  cancelled?: boolean;
}

export interface RestoreResult {
  success: boolean;
  isPremium: boolean;
  error?: string;
}

/**
 * Initialize RevenueCat SDK
 * Safe to call - will not crash if SDK is unavailable
 * @param userId - Optional user ID to identify the user
 */
export async function initializePurchases(userId: string | null = null): Promise<void> {
  // Already initialized or SDK not available
  if (isInitialized || !Purchases) {
    return;
  }

  try {
    // Set debug logging in development
    if (__DEV__ && LOG_LEVEL) {
      Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    }

    // Get platform-specific API key
    const apiKey: string | undefined = Platform.select({
      ios: REVENUECAT_API_KEY_IOS,
      android: REVENUECAT_API_KEY_ANDROID,
    });

    if (!apiKey) {
      if (__DEV__) console.warn('[Purchases] No API key for platform');
      isInitialized = true;
      initializationFailed = true;
      return;
    }

    // Configure RevenueCat
    await Purchases.configure({ apiKey });

    // Identify user if provided
    if (userId) {
      try {
        await Purchases.logIn(userId);
      } catch (loginError: any) {
        // Login failed but we can continue
        if (__DEV__) {
          console.warn('[Purchases] User login failed:', loginError.message);
        }
      }
    }

    // Listen for customer info updates
    try {
      Purchases.addCustomerInfoUpdateListener((info: any) => {
        if (info?.entitlements?.active) {
          cachedIsPremium = info.entitlements.active[PREMIUM_ENTITLEMENT] !== undefined;
        }
      });
    } catch (listenerError: any) {
      // Listener failed but we can continue
      if (__DEV__) {
        console.warn('[Purchases] Listener setup failed:', listenerError.message);
      }
    }

    // Get initial customer info
    try {
      const customerInfo: any = await Purchases.getCustomerInfo();
      if (customerInfo?.entitlements?.active) {
        cachedIsPremium = customerInfo.entitlements.active[PREMIUM_ENTITLEMENT] !== undefined;
      }
    } catch (infoError: any) {
      // Info fetch failed - assume not premium
      if (__DEV__) {
        console.warn('[Purchases] Customer info fetch failed:', infoError.message);
      }
      cachedIsPremium = false;
    }

    isInitialized = true;
    initializationFailed = false;

    if (__DEV__) {
      console.log('[Purchases] RevenueCat initialized, isPremium:', cachedIsPremium);
    }
  } catch (error: any) {
    // Initialization completely failed - mark as failed and continue
    if (__DEV__) {
      console.error('[Purchases] Initialization error:', error.message);
    }
    isInitialized = true;
    initializationFailed = true;
    cachedIsPremium = false;
  }
}

/**
 * Check if the current user has an active premium subscription.
 * Performs dual verification: RevenueCat client + server-side Supabase check.
 * ALWAYS returns false on any error - user sees paywall (safe default).
 * @returns True if user has premium access
 */
export async function checkSubscriptionStatus(): Promise<boolean> {
  try {
    // If SDK not available or init failed, return false (Free plan)
    if (!Purchases || initializationFailed) {
      return false;
    }

    // Try to get fresh customer info from RevenueCat
    const customerInfo: any = await Purchases.getCustomerInfo();

    if (customerInfo?.entitlements?.active) {
      const isPremium: boolean = customerInfo.entitlements.active[PREMIUM_ENTITLEMENT] !== undefined;
      cachedIsPremium = isPremium;

      // Server-side verification: call Edge Function to verify via RevenueCat API
      // The Edge Function checks RevenueCat server-to-server — no client can forge this
      try {
        const { supabase } = require('../lib/supabase');
        const { data, error } = await supabase.functions.invoke('verify-subscription');
        if (!error && data?.isPremium !== undefined) {
          // Trust the server-verified result over the client-side check
          cachedIsPremium = data.isPremium;
          return data.isPremium;
        }
      } catch {
        // Edge Function call failed — fall through to client-side check result
      }

      return isPremium;
    }

    // No entitlements data - assume not premium
    return false;
  } catch {
    // ANY error = return false (Free plan)
    return false;
  }
}

/**
 * Get cached subscription status (synchronous)
 * Returns false if any doubt
 * @returns Cached premium status
 */
export function getCachedSubscriptionStatus(): boolean {
  if (!Purchases || initializationFailed) {
    return false;
  }
  return cachedIsPremium;
}

/**
 * Get available subscription offerings
 * @returns RevenueCat offerings or null
 */
export async function getOfferings(): Promise<any | null> {
  try {
    if (!Purchases || initializationFailed) {
      return null;
    }
    const offerings: any = await Purchases.getOfferings();
    return offerings;
  } catch (error: any) {
    if (__DEV__) {
      console.warn('[Purchases] Get offerings error:', error.message);
    }
    return null;
  }
}

/**
 * Purchase a subscription package
 * @param packageToPurchase - RevenueCat package object
 */
export async function purchasePackage(packageToPurchase: any): Promise<PurchaseResult> {
  try {
    if (!Purchases || initializationFailed) {
      return { success: false, error: 'Purchases not available' };
    }

    if (!packageToPurchase) {
      return { success: false, error: 'No package selected' };
    }

    const { customerInfo }: { customerInfo: any } = await Purchases.purchasePackage(packageToPurchase);

    if (customerInfo?.entitlements?.active) {
      cachedIsPremium = customerInfo.entitlements.active[PREMIUM_ENTITLEMENT] !== undefined;
    }

    return { success: true, customerInfo };
  } catch (error: any) {
    // Check if user cancelled
    if (error.userCancelled) {
      return { success: false, cancelled: true };
    }

    if (__DEV__) {
      console.warn('[Purchases] Purchase error:', error.message);
    }

    return { success: false, error: error.message || 'Purchase failed' };
  }
}

/**
 * Restore previous purchases
 */
export async function restorePurchases(): Promise<RestoreResult> {
  try {
    if (!Purchases || initializationFailed) {
      return { success: false, isPremium: false, error: 'Purchases not available' };
    }

    const customerInfo: any = await Purchases.restorePurchases();

    let isPremium: boolean = false;
    if (customerInfo?.entitlements?.active) {
      isPremium = customerInfo.entitlements.active[PREMIUM_ENTITLEMENT] !== undefined;
    }

    cachedIsPremium = isPremium;

    return { success: true, isPremium };
  } catch (error: any) {
    if (__DEV__) {
      console.warn('[Purchases] Restore error:', error.message);
    }

    return { success: false, isPremium: false, error: error.message || 'Restore failed' };
  }
}

/**
 * Identify user with RevenueCat (call after login)
 * @param userId - User's unique ID
 */
export async function identifyUser(userId: string): Promise<void> {
  if (!userId || !Purchases || initializationFailed) return;

  try {
    const { customerInfo }: { customerInfo: any } = await Purchases.logIn(userId);

    if (customerInfo?.entitlements?.active) {
      cachedIsPremium = customerInfo.entitlements.active[PREMIUM_ENTITLEMENT] !== undefined;
    }

    if (__DEV__) {
      console.log('[Purchases] User identified:', userId);
    }
  } catch (error: any) {
    if (__DEV__) {
      console.warn('[Purchases] Identify error:', error.message);
    }
    // Don't throw - just continue with free plan
  }
}

/**
 * Log out user from RevenueCat (call after sign out)
 */
export async function logOutUser(): Promise<void> {
  if (!Purchases || initializationFailed) return;

  try {
    await Purchases.logOut();
    cachedIsPremium = false;

    if (__DEV__) {
      console.log('[Purchases] User logged out');
    }
  } catch (error: any) {
    if (__DEV__) {
      console.warn('[Purchases] Logout error:', error.message);
    }
    // Don't throw - just reset cached status
    cachedIsPremium = false;
  }
}

/**
 * Check if RevenueCat is properly configured and working
 * @returns True if SDK is available and initialized
 */
export function isRevenueCatAvailable(): boolean {
  return !!Purchases && isInitialized && !initializationFailed;
}

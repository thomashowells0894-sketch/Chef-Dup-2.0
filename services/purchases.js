/**
 * VibeFit Purchases Service - RevenueCat Integration
 *
 * Standalone service for subscription management.
 * Designed to be crash-proof - any failure defaults to Free plan.
 */

import { Platform } from 'react-native';

// RevenueCat SDK - imported dynamically to prevent crashes
let Purchases = null;
let LOG_LEVEL = null;

try {
  const PurchasesModule = require('react-native-purchases');
  Purchases = PurchasesModule.default;
  LOG_LEVEL = PurchasesModule.LOG_LEVEL;
} catch (e) {
  if (__DEV__) console.warn('[Purchases] RevenueCat SDK not available');
}

// RevenueCat API Keys - loaded from environment variables
const REVENUECAT_API_KEY_IOS = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS || '';
const REVENUECAT_API_KEY_ANDROID = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID || '';

// Entitlement identifier - must match RevenueCat dashboard
const PREMIUM_ENTITLEMENT = 'premium';

// Track initialization state
let isInitialized = false;
let initializationFailed = false;
let cachedIsPremium = false;

/**
 * Initialize RevenueCat SDK
 * Safe to call - will not crash if SDK is unavailable
 * @param {string} userId - Optional user ID to identify the user
 */
export async function initializePurchases(userId = null) {
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
    const apiKey = Platform.select({
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
      } catch (loginError) {
        // Login failed but we can continue
        if (__DEV__) {
          console.warn('[Purchases] User login failed:', loginError.message);
        }
      }
    }

    // Listen for customer info updates
    try {
      Purchases.addCustomerInfoUpdateListener((info) => {
        if (info?.entitlements?.active) {
          cachedIsPremium = info.entitlements.active[PREMIUM_ENTITLEMENT] !== undefined;
        }
      });
    } catch (listenerError) {
      // Listener failed but we can continue
      if (__DEV__) {
        console.warn('[Purchases] Listener setup failed:', listenerError.message);
      }
    }

    // Get initial customer info
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      if (customerInfo?.entitlements?.active) {
        cachedIsPremium = customerInfo.entitlements.active[PREMIUM_ENTITLEMENT] !== undefined;
      }
    } catch (infoError) {
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
  } catch (error) {
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
 * Check if the current user has an active premium subscription
 * ALWAYS returns false on any error - user sees paywall (safe default)
 * @returns {Promise<boolean>} True if user has premium access
 */
export async function checkSubscriptionStatus() {
  try {
    // If SDK not available or init failed, return false (Free plan)
    if (!Purchases || initializationFailed) {
      return false;
    }

    // Try to get fresh customer info
    const customerInfo = await Purchases.getCustomerInfo();

    if (customerInfo?.entitlements?.active) {
      const isPremium = customerInfo.entitlements.active[PREMIUM_ENTITLEMENT] !== undefined;
      cachedIsPremium = isPremium;
      return isPremium;
    }

    // No entitlements data - assume not premium
    return false;
  } catch (error) {
    // ANY error = return false (Free plan)
    // This ensures paywall shows when RevenueCat has issues
    if (__DEV__) {
      console.warn('[Purchases] Status check failed:', error.message);
    }
    return false;
  }
}

/**
 * Get cached subscription status (synchronous)
 * Returns false if any doubt
 * @returns {boolean} Cached premium status
 */
export function getCachedSubscriptionStatus() {
  if (!Purchases || initializationFailed) {
    return false;
  }
  return cachedIsPremium;
}

/**
 * Get available subscription offerings
 * @returns {Promise<Object|null>} RevenueCat offerings or null
 */
export async function getOfferings() {
  try {
    if (!Purchases || initializationFailed) {
      return null;
    }
    const offerings = await Purchases.getOfferings();
    return offerings;
  } catch (error) {
    if (__DEV__) {
      console.warn('[Purchases] Get offerings error:', error.message);
    }
    return null;
  }
}

/**
 * Purchase a subscription package
 * @param {Object} packageToPurchase - RevenueCat package object
 * @returns {Promise<{success: boolean, customerInfo?: Object, error?: string, cancelled?: boolean}>}
 */
export async function purchasePackage(packageToPurchase) {
  try {
    if (!Purchases || initializationFailed) {
      return { success: false, error: 'Purchases not available' };
    }

    if (!packageToPurchase) {
      return { success: false, error: 'No package selected' };
    }

    const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);

    if (customerInfo?.entitlements?.active) {
      cachedIsPremium = customerInfo.entitlements.active[PREMIUM_ENTITLEMENT] !== undefined;
    }

    return { success: true, customerInfo };
  } catch (error) {
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
 * @returns {Promise<{success: boolean, isPremium: boolean, error?: string}>}
 */
export async function restorePurchases() {
  try {
    if (!Purchases || initializationFailed) {
      return { success: false, isPremium: false, error: 'Purchases not available' };
    }

    const customerInfo = await Purchases.restorePurchases();

    let isPremium = false;
    if (customerInfo?.entitlements?.active) {
      isPremium = customerInfo.entitlements.active[PREMIUM_ENTITLEMENT] !== undefined;
    }

    cachedIsPremium = isPremium;

    return { success: true, isPremium };
  } catch (error) {
    if (__DEV__) {
      console.warn('[Purchases] Restore error:', error.message);
    }

    return { success: false, isPremium: false, error: error.message || 'Restore failed' };
  }
}

/**
 * Identify user with RevenueCat (call after login)
 * @param {string} userId - User's unique ID
 */
export async function identifyUser(userId) {
  if (!userId || !Purchases || initializationFailed) return;

  try {
    const { customerInfo } = await Purchases.logIn(userId);

    if (customerInfo?.entitlements?.active) {
      cachedIsPremium = customerInfo.entitlements.active[PREMIUM_ENTITLEMENT] !== undefined;
    }

    if (__DEV__) {
      console.log('[Purchases] User identified:', userId);
    }
  } catch (error) {
    if (__DEV__) {
      console.warn('[Purchases] Identify error:', error.message);
    }
    // Don't throw - just continue with free plan
  }
}

/**
 * Log out user from RevenueCat (call after sign out)
 */
export async function logOutUser() {
  if (!Purchases || initializationFailed) return;

  try {
    await Purchases.logOut();
    cachedIsPremium = false;

    if (__DEV__) {
      console.log('[Purchases] User logged out');
    }
  } catch (error) {
    if (__DEV__) {
      console.warn('[Purchases] Logout error:', error.message);
    }
    // Don't throw - just reset cached status
    cachedIsPremium = false;
  }
}

/**
 * Check if RevenueCat is properly configured and working
 * @returns {boolean} True if SDK is available and initialized
 */
export function isRevenueCatAvailable() {
  return !!Purchases && isInitialized && !initializationFailed;
}

/**
 * SubscriptionContext - RevenueCat Integration
 *
 * Manages subscription state, purchases, and entitlements.
 * Provides hooks for checking premium access across the app.
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import { Platform, Alert } from 'react-native';
import { useAuth } from './AuthContext';

// RevenueCat SDK - imported dynamically to prevent crashes
let Purchases = null;
let LOG_LEVEL = null;

try {
  const PurchasesModule = require('react-native-purchases');
  Purchases = PurchasesModule.default;
  LOG_LEVEL = PurchasesModule.LOG_LEVEL;
} catch (e) {
  if (__DEV__) console.warn('[Subscriptions] RevenueCat SDK not available');
}

const SubscriptionContext = createContext(null);

// RevenueCat API Keys - loaded from environment variables
const REVENUECAT_API_KEY_IOS = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS || '';
const REVENUECAT_API_KEY_ANDROID = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID || '';

// Entitlement identifier - matches what you set up in RevenueCat dashboard
const PREMIUM_ENTITLEMENT = 'premium';

// Product identifiers
export const PRODUCT_IDS = {
  MONTHLY: 'vibefit_premium_monthly',
  YEARLY: 'vibefit_premium_yearly',
};

export function SubscriptionProvider({ children }) {
  const { user } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [offerings, setOfferings] = useState(null);
  const [customerInfo, setCustomerInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [purchaseInProgress, setPurchaseInProgress] = useState(false);

  // Initialize RevenueCat - crash-proof
  useEffect(() => {
    async function initRevenueCat() {
      try {
        // If SDK not available, skip initialization
        if (!Purchases) {
          if (__DEV__) {
            console.log('[Subscriptions] RevenueCat SDK not available - Free plan mode');
          }
          setIsInitialized(true);
          setIsPremium(false);
          setIsLoading(false);
          return;
        }

        // Set log level for debugging (remove in production)
        if (__DEV__ && LOG_LEVEL) {
          try {
            Purchases.setLogLevel(LOG_LEVEL.DEBUG);
          } catch (e) {
            // Ignore log level errors
          }
        }

        // Configure with platform-specific API key
        const apiKey = Platform.select({
          ios: REVENUECAT_API_KEY_IOS,
          android: REVENUECAT_API_KEY_ANDROID,
        });

        if (!apiKey) {
          if (__DEV__) {
            console.log('[Subscriptions] No API key - Free plan mode');
          }
          setIsInitialized(true);
          setIsPremium(false);
          setIsLoading(false);
          return;
        }

        await Purchases.configure({ apiKey });

        setIsInitialized(true);

        // Listen for customer info updates (wrapped in try-catch)
        try {
          Purchases.addCustomerInfoUpdateListener((info) => {
            setCustomerInfo(info);
            checkPremiumStatus(info);
          });
        } catch (listenerError) {
          if (__DEV__) {
            console.warn('[Subscriptions] Listener error:', listenerError.message);
          }
        }

        // Fetch initial customer info (wrapped in try-catch)
        try {
          const info = await Purchases.getCustomerInfo();
          setCustomerInfo(info);
          checkPremiumStatus(info);
        } catch (infoError) {
          if (__DEV__) {
            console.warn('[Subscriptions] Customer info error:', infoError.message);
          }
          // Default to not premium on error
          setIsPremium(false);
        }

        // Fetch offerings (wrapped in try-catch)
        try {
          const offers = await Purchases.getOfferings();
          setOfferings(offers);
        } catch (offerError) {
          if (__DEV__) {
            console.warn('[Subscriptions] Offerings error:', offerError.message);
          }
          // Continue without offerings
        }

        if (__DEV__) {
          console.log('[Subscriptions] RevenueCat initialized');
        }
      } catch (error) {
        // Complete failure - default to Free plan
        if (__DEV__) {
          console.error('[Subscriptions] Init error:', error.message);
        }
        setIsInitialized(true);
        setIsPremium(false);
      } finally {
        setIsLoading(false);
      }
    }

    initRevenueCat();
  }, []);

  // Identify user with RevenueCat when auth changes
  useEffect(() => {
    async function identifyUser() {
      // Skip if not ready or no user or SDK not available
      if (!isInitialized || !user || !Purchases) return;

      try {
        // Log in user to RevenueCat
        const { customerInfo } = await Purchases.logIn(user.id);
        setCustomerInfo(customerInfo);
        checkPremiumStatus(customerInfo);

        if (__DEV__) {
          console.log('[Subscriptions] User identified:', user.id);
        }
      } catch (error) {
        if (__DEV__) {
          console.warn('[Subscriptions] Identify error:', error.message);
        }
        // On error, assume not premium
        setIsPremium(false);
      }
    }

    identifyUser();
  }, [isInitialized, user]);

  // Check if user has premium entitlement - crash-proof
  const checkPremiumStatus = useCallback((info) => {
    try {
      if (!info || !info.entitlements || !info.entitlements.active) {
        setIsPremium(false);
        return;
      }

      const entitlements = info.entitlements.active;
      const hasPremium = entitlements[PREMIUM_ENTITLEMENT] !== undefined;
      setIsPremium(hasPremium);

      if (__DEV__) {
        console.log('[Subscriptions] Premium status:', hasPremium);
      }
    } catch (e) {
      // Any error = not premium
      setIsPremium(false);
    }
  }, []);

  // Purchase a package - crash-proof
  const purchasePackage = useCallback(async (packageToPurchase) => {
    if (purchaseInProgress) return { success: false, error: 'Purchase already in progress' };
    if (!Purchases) return { success: false, error: 'Purchases not available' };

    setPurchaseInProgress(true);

    try {
      const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
      setCustomerInfo(customerInfo);
      checkPremiumStatus(customerInfo);

      return { success: true, customerInfo };
    } catch (error) {
      // User cancelled - not an error
      if (error.userCancelled) {
        return { success: false, cancelled: true };
      }

      if (__DEV__) {
        console.warn('[Subscriptions] Purchase error:', error.message);
      }

      return { success: false, error: error.message || 'Purchase failed' };
    } finally {
      setPurchaseInProgress(false);
    }
  }, [purchaseInProgress, checkPremiumStatus]);

  // Restore purchases - crash-proof
  const restorePurchases = useCallback(async () => {
    if (purchaseInProgress) return { success: false, error: 'Operation in progress' };
    if (!Purchases) {
      Alert.alert('Not Available', 'Purchase restoration is not available at this time.');
      return { success: false, error: 'Purchases not available' };
    }

    setPurchaseInProgress(true);

    try {
      const customerInfo = await Purchases.restorePurchases();
      setCustomerInfo(customerInfo);
      checkPremiumStatus(customerInfo);

      const hasPremium = customerInfo?.entitlements?.active?.[PREMIUM_ENTITLEMENT] !== undefined;

      if (hasPremium) {
        Alert.alert('Success', 'Your purchases have been restored!');
      } else {
        Alert.alert('No Purchases Found', 'We couldn\'t find any previous purchases to restore.');
      }

      return { success: true, hasPremium, customerInfo };
    } catch (error) {
      if (__DEV__) {
        console.warn('[Subscriptions] Restore error:', error.message);
      }

      Alert.alert('Error', 'Failed to restore purchases. Please try again.');
      return { success: false, error: error.message };
    } finally {
      setPurchaseInProgress(false);
    }
  }, [purchaseInProgress, checkPremiumStatus]);

  // Get current offering packages
  const packages = useMemo(() => {
    if (!offerings?.current?.availablePackages) {
      return [];
    }
    return offerings.current.availablePackages;
  }, [offerings]);

  // Get monthly package
  const monthlyPackage = useMemo(() => {
    return packages.find(
      (pkg) => pkg.packageType === 'MONTHLY' || pkg.identifier === '$rc_monthly'
    );
  }, [packages]);

  // Get annual package
  const annualPackage = useMemo(() => {
    return packages.find(
      (pkg) => pkg.packageType === 'ANNUAL' || pkg.identifier === '$rc_annual'
    );
  }, [packages]);

  // Calculate savings percentage for annual
  const annualSavings = useMemo(() => {
    if (!monthlyPackage || !annualPackage) return 0;

    const monthlyPrice = monthlyPackage.product.price;
    const annualPrice = annualPackage.product.price;
    const monthlyTotal = monthlyPrice * 12;

    if (monthlyTotal <= 0) return 0;

    return Math.round(((monthlyTotal - annualPrice) / monthlyTotal) * 100);
  }, [monthlyPackage, annualPackage]);

  // Subscription info for display
  const subscriptionInfo = useMemo(() => {
    if (!customerInfo || !isPremium) return null;

    const entitlement = customerInfo.entitlements.active[PREMIUM_ENTITLEMENT];
    if (!entitlement) return null;

    return {
      productId: entitlement.productIdentifier,
      expirationDate: entitlement.expirationDate
        ? new Date(entitlement.expirationDate)
        : null,
      willRenew: entitlement.willRenew,
      periodType: entitlement.periodType,
    };
  }, [customerInfo, isPremium]);

  const value = useMemo(
    () => ({
      // State
      isInitialized,
      isPremium,
      isLoading,
      purchaseInProgress,
      offerings,
      packages,
      monthlyPackage,
      annualPackage,
      annualSavings,
      customerInfo,
      subscriptionInfo,

      // Actions
      purchasePackage,
      restorePurchases,
    }),
    [
      isInitialized,
      isPremium,
      isLoading,
      purchaseInProgress,
      offerings,
      packages,
      monthlyPackage,
      annualPackage,
      annualSavings,
      customerInfo,
      subscriptionInfo,
      purchasePackage,
      restorePurchases,
    ]
  );

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}

/**
 * Hook that returns true if user can access premium features
 * Always returns false on any error (safe default = show paywall)
 */
export function useIsPremium() {
  const { isPremium, isLoading, isInitialized } = useSubscription();

  // Until initialized, assume not premium (will show loading)
  // After initialized, use actual status (false = show paywall)
  return {
    isPremium: isInitialized ? isPremium : false,
    isLoading: isLoading || !isInitialized,
  };
}

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
import { setAIPremiumStatus } from '../services/ai';

// RevenueCat SDK - imported dynamically to prevent crashes
let Purchases: any = null;
let LOG_LEVEL: any = null;

try {
  const PurchasesModule = require('react-native-purchases');
  Purchases = PurchasesModule.default;
  LOG_LEVEL = PurchasesModule.LOG_LEVEL;
} catch {
  if (__DEV__) console.warn('[Subscriptions] RevenueCat SDK not available');
}

interface CustomerInfo {
  entitlements: {
    active: Record<string, {
      productIdentifier: string;
      expirationDate: string | null;
      willRenew: boolean;
      periodType: string;
    }>;
  };
  allPurchasedProductIdentifiers?: string[];
}

interface Package {
  packageType: string;
  identifier: string;
  product: {
    price: number;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

interface Offerings {
  current?: {
    availablePackages: Package[];
  };
}

interface SubscriptionInfo {
  productId: string;
  expirationDate: Date | null;
  willRenew: boolean;
  periodType: string;
}

interface PurchaseResult {
  success: boolean;
  error?: string;
  cancelled?: boolean;
  customerInfo?: CustomerInfo;
}

interface RestoreResult {
  success: boolean;
  error?: string;
  hasPremium?: boolean;
  customerInfo?: CustomerInfo;
}

interface SubscriptionContextValue {
  isInitialized: boolean;
  isPremium: boolean;
  isLoading: boolean;
  purchaseInProgress: boolean;
  offerings: Offerings | null;
  packages: Package[];
  monthlyPackage: Package | undefined;
  annualPackage: Package | undefined;
  annualSavings: number;
  customerInfo: CustomerInfo | null;
  subscriptionInfo: SubscriptionInfo | null;
  // Trial & monetization fields
  isTrialing: boolean;
  trialEndDate: string | null;
  hasExpiredTrial: boolean;
  subscriptionType: 'monthly' | 'annual' | 'none';
  purchaseDate: string | null;
  checkFeature: (feature: string) => boolean;
  purchasePackage: (packageToPurchase?: Package | null) => Promise<PurchaseResult>;
  restorePurchases: () => Promise<RestoreResult>;
}

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

// RevenueCat API Keys - loaded from environment variables
const REVENUECAT_API_KEY_IOS = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS || '';
const REVENUECAT_API_KEY_ANDROID = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID || '';

// Entitlement identifier - matches what you set up in RevenueCat dashboard
const PREMIUM_ENTITLEMENT = 'premium';

// Product identifiers
export const PRODUCT_IDS = {
  MONTHLY: 'fueliq_premium_monthly',
  YEARLY: 'fueliq_premium_yearly',
};

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [isPremium, setIsPremium] = useState<boolean>(false);
  const [offerings, setOfferings] = useState<Offerings | null>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [purchaseInProgress, setPurchaseInProgress] = useState<boolean>(false);
  const [isTrialing, setIsTrialing] = useState<boolean>(false);
  const [trialEndDate, setTrialEndDate] = useState<string | null>(null);
  const [hasExpiredTrial, setHasExpiredTrial] = useState<boolean>(false);

  const resetSubscriptionState = useCallback(() => {
    setCustomerInfo(null);
    setIsPremium(false);
    setIsTrialing(false);
    setTrialEndDate(null);
    setHasExpiredTrial(false);
  }, []);

  // Check if user has premium entitlement - crash-proof
  // Also extracts trial status for TrialExpirationBanner and win-back campaigns
  const checkPremiumStatus = useCallback((info: CustomerInfo | null) => {
    try {
      if (!info) {
        resetSubscriptionState();
        return;
      }

      const entitlements = info.entitlements?.active || {};
      const premiumEntitlement = entitlements[PREMIUM_ENTITLEMENT];
      const hasPremium = premiumEntitlement !== undefined;
      const hasPurchaseHistory = Array.isArray(info.allPurchasedProductIdentifiers)
        && info.allPurchasedProductIdentifiers.length > 0;

      setIsPremium(hasPremium);

      // Detect trial period
      if (hasPremium && premiumEntitlement) {
        const isTrial = premiumEntitlement.periodType === 'TRIAL' || premiumEntitlement.periodType === 'trial';
        setIsTrialing(isTrial);
        setTrialEndDate(premiumEntitlement.expirationDate || null);
        setHasExpiredTrial(false);
      } else {
        setIsTrialing(false);
        setTrialEndDate(null);
        setHasExpiredTrial(hasPurchaseHistory);
      }

      if (__DEV__) {
        console.log('[Subscriptions] Premium status:', hasPremium);
      }
    } catch {
      resetSubscriptionState();
    }
  }, [resetSubscriptionState]);

  // Initialize RevenueCat - crash-proof
  useEffect(() => {
    let cancelled = false;
    let customerInfoListener: ((info: CustomerInfo) => void) | null = null;

    async function initRevenueCat() {
      try {
        // If SDK not available, skip initialization
        if (!Purchases) {
          if (cancelled) return;
          if (__DEV__) {
            console.log('[Subscriptions] RevenueCat SDK not available - Free plan mode');
          }
          setIsInitialized(true);
          resetSubscriptionState();
          setIsLoading(false);
          return;
        }

        // Set log level for debugging (remove in production)
        if (__DEV__ && LOG_LEVEL) {
          try {
            Purchases.setLogLevel(LOG_LEVEL.DEBUG);
          } catch {
            // Ignore log level errors
          }
        }

        // Configure with platform-specific API key
        const apiKey = Platform.select({
          ios: REVENUECAT_API_KEY_IOS,
          android: REVENUECAT_API_KEY_ANDROID,
        });

        if (!apiKey) {
          if (cancelled) return;
          if (__DEV__) {
            console.log('[Subscriptions] No API key - Free plan mode');
          }
          setIsInitialized(true);
          resetSubscriptionState();
          setIsLoading(false);
          return;
        }

        await Purchases.configure({ apiKey });
        if (cancelled) return;

        setIsInitialized(true);

        // Listen for customer info updates (wrapped in try-catch)
        try {
          customerInfoListener = (info: CustomerInfo) => {
            if (cancelled) return;
            setCustomerInfo(info);
            checkPremiumStatus(info);
          };
          Purchases.addCustomerInfoUpdateListener(customerInfoListener);
        } catch (listenerError: any) {
          if (__DEV__) {
            console.warn('[Subscriptions] Listener error:', listenerError.message);
          }
        }

        // Fetch initial customer info (wrapped in try-catch)
        try {
          const info: CustomerInfo = await Purchases.getCustomerInfo();
          if (cancelled) return;
          setCustomerInfo(info);
          checkPremiumStatus(info);
        } catch (infoError: any) {
          if (cancelled) return;
          if (__DEV__) {
            console.warn('[Subscriptions] Customer info error:', infoError.message);
          }
          resetSubscriptionState();
        }

        // Fetch offerings (wrapped in try-catch)
        try {
          const offers: Offerings = await Purchases.getOfferings();
          if (cancelled) return;
          setOfferings(offers);
        } catch (offerError: any) {
          if (__DEV__) {
            console.warn('[Subscriptions] Offerings error:', offerError.message);
          }
          // Continue without offerings
        }

        if (__DEV__) {
          console.log('[Subscriptions] RevenueCat initialized');
        }
      } catch (error: any) {
        if (cancelled) return;
        // Complete failure - default to Free plan
        if (__DEV__) {
          console.error('[Subscriptions] Init error:', error.message);
        }
        setIsInitialized(true);
        resetSubscriptionState();
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    initRevenueCat();

    return () => {
      cancelled = true;

      if (Purchases && customerInfoListener && typeof Purchases.removeCustomerInfoUpdateListener === 'function') {
        try {
          Purchases.removeCustomerInfoUpdateListener(customerInfoListener);
        } catch (error: any) {
          if (__DEV__) {
            console.warn('[Subscriptions] Listener cleanup error:', error.message);
          }
        }
      }
    };
  }, [checkPremiumStatus, resetSubscriptionState]);

  // Identify user with RevenueCat when auth changes
  useEffect(() => {
    let cancelled = false;

    async function syncRevenueCatUser() {
      if (!isInitialized) return;

      if (!Purchases) {
        if (!user && !cancelled) {
          resetSubscriptionState();
        }
        return;
      }

      if (!user) {
        try {
          await Purchases.logOut();
        } catch (error: any) {
          if (__DEV__) {
            console.warn('[Subscriptions] Logout error:', error.message);
          }
        }

        if (!cancelled) {
          resetSubscriptionState();
        }
        return;
      }

      try {
        // Log in user to RevenueCat
        const { customerInfo }: { customerInfo: CustomerInfo } = await Purchases.logIn(user.id);
        if (cancelled) return;

        setCustomerInfo(customerInfo);
        checkPremiumStatus(customerInfo);

        if (__DEV__) {
          console.log('[Subscriptions] User identified:', user.id);
        }
      } catch (error: any) {
        if (__DEV__) {
          console.warn('[Subscriptions] Identify error:', error.message);
        }

        if (!cancelled) {
          resetSubscriptionState();
        }
      }
    }

    syncRevenueCatUser();

    return () => {
      cancelled = true;
    };
  }, [checkPremiumStatus, isInitialized, resetSubscriptionState, user]);

  // Sync premium status to the AI service module whenever it changes
  useEffect(() => {
    setAIPremiumStatus(isPremium);
  }, [isPremium]);

  // Purchase a package - crash-proof
  const purchasePackage = useCallback(async (packageToPurchase?: Package | null): Promise<PurchaseResult> => {
    if (purchaseInProgress) return { success: false, error: 'Purchase already in progress' };
    if (!isInitialized) return { success: false, error: 'Purchases are still loading. Please try again in a moment.' };
    if (!Purchases) return { success: false, error: 'Purchases not available' };
    if (!packageToPurchase) {
      return { success: false, error: 'The selected subscription plan is currently unavailable.' };
    }

    setPurchaseInProgress(true);

    try {
      const { customerInfo }: { customerInfo: CustomerInfo } = await Purchases.purchasePackage(packageToPurchase);
      setCustomerInfo(customerInfo);
      checkPremiumStatus(customerInfo);

      return { success: true, customerInfo };
    } catch (error: any) {
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
  }, [purchaseInProgress, isInitialized, checkPremiumStatus]);

  // Restore purchases - crash-proof
  const restorePurchases = useCallback(async (): Promise<RestoreResult> => {
    if (purchaseInProgress) return { success: false, error: 'Operation in progress' };
    if (!isInitialized) {
      Alert.alert('Please Wait', 'The store is still loading. Please try again in a moment.');
      return { success: false, error: 'Purchases are still loading' };
    }
    if (!Purchases) {
      Alert.alert('Not Available', 'Purchase restoration is not available at this time.');
      return { success: false, error: 'Purchases not available' };
    }

    setPurchaseInProgress(true);

    try {
      const customerInfo: CustomerInfo = await Purchases.restorePurchases();
      setCustomerInfo(customerInfo);
      checkPremiumStatus(customerInfo);

      const hasPremium = customerInfo?.entitlements?.active?.[PREMIUM_ENTITLEMENT] !== undefined;

      if (hasPremium) {
        Alert.alert('Success', 'Your purchases have been restored!');
      } else {
        Alert.alert('No Purchases Found', 'We couldn\'t find any previous purchases to restore.');
      }

      return { success: true, hasPremium, customerInfo };
    } catch (error: any) {
      if (__DEV__) {
        console.warn('[Subscriptions] Restore error:', error.message);
      }

      Alert.alert('Error', 'Failed to restore purchases. Please try again.');
      return { success: false, error: error.message };
    } finally {
      setPurchaseInProgress(false);
    }
  }, [purchaseInProgress, isInitialized, checkPremiumStatus]);

  // Get current offering packages
  const packages = useMemo<Package[]>(() => {
    if (!offerings?.current?.availablePackages) {
      return [];
    }
    return offerings.current.availablePackages;
  }, [offerings]);

  // Get monthly package
  const monthlyPackage = useMemo<Package | undefined>(() => {
    return packages.find(
      (pkg) => pkg.packageType === 'MONTHLY' || pkg.identifier === '$rc_monthly'
    );
  }, [packages]);

  // Get annual package
  const annualPackage = useMemo<Package | undefined>(() => {
    return packages.find(
      (pkg) => pkg.packageType === 'ANNUAL' || pkg.identifier === '$rc_annual'
    );
  }, [packages]);

  // Calculate savings percentage for annual
  const annualSavings = useMemo<number>(() => {
    if (!monthlyPackage || !annualPackage) return 0;

    const monthlyPrice = monthlyPackage.product.price;
    const annualPrice = annualPackage.product.price;
    const monthlyTotal = monthlyPrice * 12;

    if (monthlyTotal <= 0) return 0;

    return Math.round(((monthlyTotal - annualPrice) / monthlyTotal) * 100);
  }, [monthlyPackage, annualPackage]);

  // Subscription info for display
  const subscriptionInfo = useMemo<SubscriptionInfo | null>(() => {
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

  // Derive subscription type (monthly vs annual) from the active entitlement product ID
  const subscriptionType = useMemo<'monthly' | 'annual' | 'none'>(() => {
    if (!subscriptionInfo) return 'none';
    if (subscriptionInfo.productId.includes('yearly') || subscriptionInfo.productId.includes('annual')) {
      return 'annual';
    }
    return 'monthly';
  }, [subscriptionInfo]);

  // Derive the original purchase/subscription start date
  const purchaseDate = useMemo<string | null>(() => {
    if (!subscriptionInfo?.expirationDate) return null;
    // Approximate: for monthly, subtract 30 days from expiration; for annual, 365 days
    const exp = subscriptionInfo.expirationDate.getTime();
    const offset = subscriptionType === 'annual' ? 365 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
    return new Date(exp - offset).toISOString();
  }, [subscriptionInfo, subscriptionType]);

  // Feature access checker - returns true if the given feature is available
  const checkFeature = useCallback((feature: string): boolean => {
    // Premium users have access to all features
    if (isPremium) return true;
    // Free tier features that are always available
    const freeFeatures = ['basic_tracking', 'water_tracking', 'weight_log', 'basic_stats', 'manual_entry'];
    return freeFeatures.includes(feature);
  }, [isPremium]);

  const value = useMemo<SubscriptionContextValue>(
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
      // Trial & monetization fields
      isTrialing,
      trialEndDate,
      hasExpiredTrial,
      subscriptionType,
      purchaseDate,
      checkFeature,

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
      isTrialing,
      trialEndDate,
      hasExpiredTrial,
      subscriptionType,
      purchaseDate,
      checkFeature,
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

export function useSubscription(): SubscriptionContextValue {
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
export function useIsPremium(): { isPremium: boolean; isLoading: boolean } {
  const { isPremium, isLoading, isInitialized } = useSubscription();

  // Until initialized, assume not premium (will show loading)
  // After initialized, use actual status (false = show paywall)
  return {
    isPremium: isInitialized ? isPremium : false,
    isLoading: isLoading || !isInitialized,
  };
}

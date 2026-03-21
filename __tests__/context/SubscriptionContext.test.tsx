import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';

process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS = 'test-ios-key';
process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID = 'test-android-key';

const mockUseAuth = jest.fn();
const mockConfigure = jest.fn(() => Promise.resolve());
const mockGetCustomerInfo = jest.fn();
const mockGetOfferings = jest.fn(() => Promise.resolve({ current: { availablePackages: [] } }));
const mockAddCustomerInfoUpdateListener = jest.fn();
const mockLogIn = jest.fn();
const mockLogOut = jest.fn(() => Promise.resolve());
const mockSetLogLevel = jest.fn();
const mockPurchasePackage = jest.fn();
const mockRestorePurchases = jest.fn();

jest.unmock('../../context/SubscriptionContext');

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('../../services/ai', () => ({
  setAIPremiumStatus: jest.fn(),
}));

jest.mock('react-native-purchases', () => ({
  __esModule: true,
  default: {
    configure: (...args: unknown[]) => mockConfigure(...args),
    getCustomerInfo: (...args: unknown[]) => mockGetCustomerInfo(...args),
    getOfferings: (...args: unknown[]) => mockGetOfferings(...args),
    addCustomerInfoUpdateListener: (...args: unknown[]) => mockAddCustomerInfoUpdateListener(...args),
    logIn: (...args: unknown[]) => mockLogIn(...args),
    logOut: (...args: unknown[]) => mockLogOut(...args),
    purchasePackage: (...args: unknown[]) => mockPurchasePackage(...args),
    restorePurchases: (...args: unknown[]) => mockRestorePurchases(...args),
    setLogLevel: (...args: unknown[]) => mockSetLogLevel(...args),
  },
  LOG_LEVEL: { DEBUG: 'DEBUG' },
}), { virtual: true });

const {
  SubscriptionProvider,
  useSubscription,
} = require('../../context/SubscriptionContext');
let consoleLogSpy: jest.SpyInstance;
let consoleWarnSpy: jest.SpyInstance;

describe('SubscriptionContext', () => {
  const premiumInfo = {
    entitlements: {
      active: {
        premium: {
          productIdentifier: 'fueliq_premium_monthly',
          expirationDate: null,
          willRenew: true,
          periodType: 'normal',
        },
      },
    },
    allPurchasedProductIdentifiers: ['fueliq_premium_monthly'],
  };

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <SubscriptionProvider>{children}</SubscriptionProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockUseAuth.mockReturnValue({ user: { id: 'user-1' } });
    mockPurchasePackage.mockResolvedValue({ customerInfo: premiumInfo });
    mockRestorePurchases.mockResolvedValue({
      entitlements: { active: {} },
      allPurchasedProductIdentifiers: [],
    });
    mockGetCustomerInfo.mockResolvedValue({
      entitlements: { active: {} },
      allPurchasedProductIdentifiers: [],
    });
    mockLogIn.mockResolvedValue({ customerInfo: premiumInfo });
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  it('clears premium state when the signed-in user logs out', async () => {
    const { result, rerender } = renderHook(() => useSubscription(), { wrapper });

    await waitFor(() => {
      expect(result.current.isPremium).toBe(true);
    });

    mockUseAuth.mockReturnValue({ user: null });
    rerender();

    await waitFor(() => {
      expect(mockLogOut).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(result.current.isPremium).toBe(false);
      expect(result.current.customerInfo).toBeNull();
      expect(result.current.hasExpiredTrial).toBe(false);
    });
  });

  it('flags lapsed purchase history without granting premium access', async () => {
    mockLogIn.mockResolvedValue({
      customerInfo: {
        entitlements: { active: {} },
        allPurchasedProductIdentifiers: ['fueliq_premium_monthly'],
      },
    });

    const { result } = renderHook(() => useSubscription(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await waitFor(() => {
      expect(result.current.hasExpiredTrial).toBe(true);
    });

    expect(result.current.isPremium).toBe(false);
  });

  it('preserves cached premium state when identify fails during user sync', async () => {
    mockLogIn.mockRejectedValueOnce(new Error('network down'));
    mockGetCustomerInfo.mockResolvedValue(premiumInfo);

    const { result } = renderHook(() => useSubscription(), { wrapper });

    await waitFor(() => {
      expect(mockLogIn).toHaveBeenCalledTimes(1);
    });

    expect(result.current.isPremium).toBe(true);
    expect(result.current.customerInfo).toEqual(premiumInfo);
  });

  it('returns a clear error when a selected package is unavailable', async () => {
    const { result } = renderHook(() => useSubscription(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let purchaseResult;
    await act(async () => {
      purchaseResult = await result.current.purchasePackage(undefined);
    });

    expect(purchaseResult).toEqual({
      success: false,
      error: 'The selected subscription plan is currently unavailable.',
    });
    expect(mockPurchasePackage).not.toHaveBeenCalled();
  });
});

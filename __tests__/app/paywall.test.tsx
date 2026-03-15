import React from 'react';
import { Alert, Animated } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import PaywallScreen from '../../app/paywall';
import { useSubscription } from '../../context/SubscriptionContext';

const mockBack = jest.fn();
const mockTrackConversion = jest.fn();
const mockRecordViewed = jest.fn(() => Promise.resolve());

jest.setTimeout(20000);

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack }),
  useLocalSearchParams: () => ({}),
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('expo-blur', () => ({
  BlurView: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('../../lib/activationTracker', () => ({
  recordPaywallConverted: jest.fn(),
  recordPaywallDismissed: jest.fn(),
  recordPaywallViewed: (...args: unknown[]) => mockRecordViewed(...args),
}));

jest.mock('../../lib/conversionTracking', () => ({
  trackConversion: (...args: unknown[]) => mockTrackConversion(...args),
}));

jest.mock('../../lib/monetization', () => ({
  getABTestVariant: jest.fn((key: string) =>
    Promise.resolve(key === 'paywall_default_plan' ? 'yearly' : 'speed')),
}));

describe('PaywallScreen', () => {
  const mockedUseSubscription = useSubscription as jest.Mock;
  const restorePurchases = jest.fn();
  const animationHandle = {
    start: jest.fn((callback?: () => void) => callback?.()),
    stop: jest.fn(),
    reset: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseSubscription.mockReturnValue({
      monthlyPackage: undefined,
      annualPackage: undefined,
      annualSavings: 0,
      purchasePackage: jest.fn(),
      restorePurchases,
      purchaseInProgress: false,
      isPremium: false,
    });
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    jest.spyOn(Animated, 'timing').mockReturnValue(animationHandle as any);
    jest.spyOn(Animated, 'spring').mockReturnValue(animationHandle as any);
    jest.spyOn(Animated, 'sequence').mockReturnValue(animationHandle as any);
    jest.spyOn(Animated, 'parallel').mockReturnValue(animationHandle as any);
    jest.spyOn(Animated, 'loop').mockReturnValue(animationHandle as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('calls restore purchases from the restore CTA', async () => {
    const { getByTestId } = render(<PaywallScreen />);

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      fireEvent.press(getByTestId('paywall-restore-button'));
    });

    await waitFor(() => {
      expect(restorePurchases).toHaveBeenCalledTimes(1);
    });
  });

  it('shows an alert when subscription packages are unavailable', async () => {
    const { getByTestId } = render(<PaywallScreen />);

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      fireEvent.press(getByTestId('paywall-subscribe-button'));
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Purchases Unavailable',
        'Subscription plans could not be loaded. Please try again in a moment.',
      );
    });
    expect(mockTrackConversion).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'purchase_failed',
        metadata: expect.objectContaining({ reason: 'missing_package' }),
      }),
    );
  });
});

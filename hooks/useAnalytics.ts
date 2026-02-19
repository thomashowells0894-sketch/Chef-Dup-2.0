import { useCallback, useMemo } from 'react';
import {
  trackEvent,
  trackTiming,
  trackScreenView,
  type EventCategory,
} from '../lib/analytics';

interface TrackEventParams {
  label?: string;
  value?: number;
  metadata?: Record<string, unknown>;
}

interface UseAnalyticsReturn {
  /** Track any arbitrary event */
  trackEvent: (category: EventCategory, action: string, params?: TrackEventParams) => void;
  /** Track a timing measurement */
  trackTiming: (category: string, action: string, startTime: number) => void;
  /** Track a screen view */
  trackScreenView: (screenName: string) => void;
  /** Shorthand: track an engagement event (food logs, workout completions, streaks) */
  trackEngagement: (action: string, metadata?: Record<string, unknown>) => void;
  /** Shorthand: track a conversion event (paywall views, purchases, trial starts) */
  trackConversion: (action: string, metadata?: Record<string, unknown>) => void;
  /** Shorthand: track an error event (crashes, API failures, validation errors) */
  trackError: (action: string, metadata?: Record<string, unknown>) => void;
  /** Shorthand: track an AI event (AI requests, response quality) */
  trackAI: (action: string, metadata?: Record<string, unknown>) => void;
  /** Shorthand: track a health-related event (health sync, data imports) */
  trackHealth: (action: string, metadata?: Record<string, unknown>) => void;
  /** Shorthand: track a social event (shares, friend additions, challenges) */
  trackSocial: (action: string, metadata?: Record<string, unknown>) => void;
  /** Shorthand: track a retention event (feature usage, DAU) */
  trackRetention: (action: string, metadata?: Record<string, unknown>) => void;
}

/**
 * Hook that provides convenient analytics tracking methods for components.
 *
 * Usage:
 * ```ts
 * function MyComponent() {
 *   const analytics = useAnalytics();
 *
 *   const handleLogFood = () => {
 *     analytics.trackEngagement('food_logged', { calories: 350 });
 *   };
 *
 *   const handlePurchase = () => {
 *     analytics.trackConversion('purchase_completed', { plan: 'annual' });
 *   };
 * }
 * ```
 */
export function useAnalytics(): UseAnalyticsReturn {
  const trackEngagement = useCallback(
    (action: string, metadata?: Record<string, unknown>) => {
      trackEvent('engagement', action, { metadata });
    },
    []
  );

  const trackConversion = useCallback(
    (action: string, metadata?: Record<string, unknown>) => {
      trackEvent('conversion', action, { metadata });
    },
    []
  );

  const trackError = useCallback(
    (action: string, metadata?: Record<string, unknown>) => {
      trackEvent('error', action, { metadata });
    },
    []
  );

  const trackAI = useCallback(
    (action: string, metadata?: Record<string, unknown>) => {
      trackEvent('ai', action, { metadata });
    },
    []
  );

  const trackHealth = useCallback(
    (action: string, metadata?: Record<string, unknown>) => {
      trackEvent('health', action, { metadata });
    },
    []
  );

  const trackSocial = useCallback(
    (action: string, metadata?: Record<string, unknown>) => {
      trackEvent('social', action, { metadata });
    },
    []
  );

  const trackRetention = useCallback(
    (action: string, metadata?: Record<string, unknown>) => {
      trackEvent('retention', action, { metadata });
    },
    []
  );

  return useMemo(
    () => ({
      trackEvent,
      trackTiming,
      trackScreenView,
      trackEngagement,
      trackConversion,
      trackError,
      trackAI,
      trackHealth,
      trackSocial,
      trackRetention,
    }),
    [trackEngagement, trackConversion, trackError, trackAI, trackHealth, trackSocial, trackRetention]
  );
}

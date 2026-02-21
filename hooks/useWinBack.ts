import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSubscription } from '../context/SubscriptionContext';

const WINBACK_KEY = '@fueliq_winback';
const WINBACK_COOLDOWN = 7 * 24 * 60 * 60 * 1000; // 7 days

interface WinBackOffer {
  type: 'discount' | 'extended_trial' | 'feature_preview';
  headline: string;
  description: string;
  ctaText: string;
  discount?: number; // percentage
}

const OFFERS: WinBackOffer[] = [
  {
    type: 'discount',
    headline: 'We miss you!',
    description: 'Come back and get 40% off your first month of Pro',
    ctaText: 'Claim 40% Off',
    discount: 40,
  },
  {
    type: 'extended_trial',
    headline: 'Give us another chance',
    description: 'Try Pro free for 14 more days. No commitment.',
    ctaText: 'Start Free Trial',
  },
  {
    type: 'feature_preview',
    headline: "See what you're missing",
    description: 'AI meal plans, advanced analytics, and more are waiting for you',
    ctaText: 'Preview Pro Features',
  },
];

export function useWinBack() {
  const { isPremium, isTrialing, hasExpiredTrial } = useSubscription();
  const [offer, setOffer] = useState<WinBackOffer | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (isPremium || isTrialing || dismissed) return;

    (async () => {
      try {
        const raw = await AsyncStorage.getItem(WINBACK_KEY);
        if (raw) {
          const data = JSON.parse(raw);
          // Don't show if dismissed within cooldown
          if (data.dismissedAt && Date.now() - data.dismissedAt < WINBACK_COOLDOWN) {
            return;
          }
        }

        // Only show to users who had a trial or were previously subscribed
        if (hasExpiredTrial) {
          // Rotate offers
          const offerIndex = Math.floor(Math.random() * OFFERS.length);
          setOffer(OFFERS[offerIndex]);
        }
      } catch {}
    })();
  }, [isPremium, isTrialing, hasExpiredTrial, dismissed]);

  const dismissOffer = useCallback(async () => {
    setDismissed(true);
    setOffer(null);
    try {
      await AsyncStorage.setItem(WINBACK_KEY, JSON.stringify({
        dismissedAt: Date.now(),
      }));
    } catch {}
  }, []);

  return { offer, dismissOffer };
}

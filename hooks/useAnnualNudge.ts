import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSubscription } from '../context/SubscriptionContext';

const NUDGE_KEY = '@vibefit_annual_nudge';
const OPTIMAL_NUDGE_DAYS = [25, 27, 29]; // Days into monthly subscription

export function useAnnualNudge() {
  const { isPremium, subscriptionType, purchaseDate } = useSubscription();
  const [showNudge, setShowNudge] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!isPremium || subscriptionType === 'annual' || dismissed) return;

    (async () => {
      try {
        const raw = await AsyncStorage.getItem(NUDGE_KEY);
        if (raw) {
          const data = JSON.parse(raw);
          // Only show once per billing cycle
          if (data.lastShownCycle === getCurrentCycle(purchaseDate)) return;
        }

        // Check if we're in the optimal nudge window
        if (purchaseDate) {
          const daysSincePurchase = Math.floor(
            (Date.now() - new Date(purchaseDate).getTime()) / (1000 * 60 * 60 * 24)
          );
          const dayInCycle = daysSincePurchase % 30;

          if (OPTIMAL_NUDGE_DAYS.includes(dayInCycle)) {
            setShowNudge(true);
          }
        }
      } catch {}
    })();
  }, [isPremium, subscriptionType, purchaseDate, dismissed]);

  const dismissNudge = async () => {
    setShowNudge(false);
    setDismissed(true);
    try {
      await AsyncStorage.setItem(NUDGE_KEY, JSON.stringify({
        lastShownCycle: getCurrentCycle(purchaseDate),
        dismissedAt: Date.now(),
      }));
    } catch {}
  };

  const savingsPercent = 40; // Annual saves ~40% vs monthly

  return { showNudge, dismissNudge, savingsPercent };
}

function getCurrentCycle(purchaseDate?: string | null): number {
  if (!purchaseDate) return 0;
  const days = Math.floor(
    (Date.now() - new Date(purchaseDate).getTime()) / (1000 * 60 * 60 * 24)
  );
  return Math.floor(days / 30);
}

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DISCLOSURE_KEY = '@vibefit_feature_disclosure';

interface FeatureDisclosure {
  discoveredFeatures: string[];
  daysSinceSignup: number;
  foodsLogged: number;
  lastFeatureShown: string | null;
  lastShownDate: string | null;
}

const FEATURE_UNLOCK_ORDER = [
  { id: 'basic_logging', requiredFoods: 0, requiredDays: 0, title: 'Food Logging', description: 'Search, scan, or voice-log your meals' },
  { id: 'water_tracking', requiredFoods: 3, requiredDays: 1, title: 'Water Tracking', description: 'Track your daily hydration' },
  { id: 'streaks', requiredFoods: 5, requiredDays: 2, title: 'Streaks & XP', description: 'Build your streak and earn rewards' },
  { id: 'ai_recommendations', requiredFoods: 10, requiredDays: 3, title: 'AI Meal Suggestions', description: 'Get personalized meal recommendations' },
  { id: 'fasting', requiredFoods: 15, requiredDays: 4, title: 'Intermittent Fasting', description: 'Track your fasting windows' },
  { id: 'meal_plan', requiredFoods: 20, requiredDays: 5, title: 'AI Meal Plans', description: 'Generate weekly meal plans' },
  { id: 'insights', requiredFoods: 30, requiredDays: 7, title: 'Nutrition Insights', description: 'See patterns in your eating habits' },
  { id: 'social', requiredFoods: 40, requiredDays: 10, title: 'Social Features', description: 'Connect with friends and join challenges' },
  { id: 'advanced_analytics', requiredFoods: 60, requiredDays: 14, title: 'Advanced Analytics', description: 'Deep dive into your nutrition data' },
];

export function useFeatureDisclosure() {
  const [state, setState] = useState<FeatureDisclosure>({
    discoveredFeatures: [],
    daysSinceSignup: 0,
    foodsLogged: 0,
    lastFeatureShown: null,
    lastShownDate: null,
  });
  const [newFeature, setNewFeature] = useState<typeof FEATURE_UNLOCK_ORDER[0] | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(DISCLOSURE_KEY);
        if (raw) {
          setState(JSON.parse(raw));
        }
      } catch {}
    })();
  }, []);

  const checkForNewFeatures = useCallback((foodsLogged: number, daysSinceSignup: number) => {
    const today = new Date().toISOString().split('T')[0];

    // Don't show more than one new feature per day
    if (state.lastShownDate === today) return;

    const nextFeature = FEATURE_UNLOCK_ORDER.find(
      f => !state.discoveredFeatures.includes(f.id) &&
           foodsLogged >= f.requiredFoods &&
           daysSinceSignup >= f.requiredDays
    );

    if (nextFeature) {
      setNewFeature(nextFeature);
      const newState = {
        ...state,
        discoveredFeatures: [...state.discoveredFeatures, nextFeature.id],
        foodsLogged,
        daysSinceSignup,
        lastFeatureShown: nextFeature.id,
        lastShownDate: today,
      };
      setState(newState);
      AsyncStorage.setItem(DISCLOSURE_KEY, JSON.stringify(newState)).catch(() => {});
    }
  }, [state]);

  const dismissNewFeature = useCallback(() => {
    setNewFeature(null);
  }, []);

  const isFeatureUnlocked = useCallback((featureId: string) => {
    return state.discoveredFeatures.includes(featureId);
  }, [state.discoveredFeatures]);

  return {
    newFeature,
    dismissNewFeature,
    checkForNewFeatures,
    isFeatureUnlocked,
    discoveredCount: state.discoveredFeatures.length,
    totalFeatures: FEATURE_UNLOCK_ORDER.length,
  };
}

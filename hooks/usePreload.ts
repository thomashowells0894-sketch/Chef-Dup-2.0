import { useEffect, useRef } from 'react';
import { InteractionManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { queryCache } from '../lib/cache';
import { Sentry } from '../lib/sentry';
import { useAuth } from '../context/AuthContext';
import { buildMealCacheKey, getLegacyMealCacheKeys } from '../lib/profileState';
import { loadFrequentFoods } from '../lib/frequentFoodsStore';
import { loadRecentMealSnapshots } from '../lib/recentMeals';
import { loadRecentSearches, loadTrendingTerms } from '../services/foodSearch';

/**
 * Predictive pre-loader: fetches data for likely-next screens
 * after current screen interactions settle.
 *
 * Usage: usePreload('diary') in the diary tab to prefetch add-screen data.
 */
export function usePreload(currentScreen: string) {
  const hasPrefetched = useRef(false);
  const { user } = useAuth();

  useEffect(() => {
    if (hasPrefetched.current) return;

    const task = InteractionManager.runAfterInteractions(() => {
      hasPrefetched.current = true;

      // Screen-specific prefetch strategies
      switch (currentScreen) {
        case 'diary':
          // User likely navigates to add food next
          prefetchFoodSearch();
          break;
        case 'index':
          // User likely navigates to diary or stats
          prefetchDiaryData(user?.id);
          prefetchLoggingData(user?.id);
          break;
        case 'add':
          // User likely navigates back to diary
          break;
        case 'profile':
          // User likely navigates to settings
          prefetchSettings();
          break;
      }
    });

    return () => task.cancel();
  }, [currentScreen, user?.id]);
}

async function prefetchFoodSearch() {
  try {
    const cached = await AsyncStorage.getItem('@fueliq_recent_foods');
    if (cached) {
      queryCache.set('recent_foods', JSON.parse(cached));
    }
  } catch (e) { Sentry.captureException(e); }
}

async function prefetchDiaryData(userId?: string | null) {
  try {
    const today = new Date().toISOString().split('T')[0];

    for (const key of [buildMealCacheKey(userId, today), ...getLegacyMealCacheKeys(today)]) {
      const cached = await AsyncStorage.getItem(key);
      if (cached) {
        queryCache.set(`diary_${today}`, JSON.parse(cached));
        break;
      }
    }
  } catch (e) { Sentry.captureException(e); }
}

async function prefetchLoggingData(userId?: string | null) {
  try {
    const recentFoodsKey = userId ? `@fueliq_recent_foods:${userId}` : null;

    await Promise.all([
      loadFrequentFoods(),
      loadRecentMealSnapshots(),
      loadRecentSearches(),
      loadTrendingTerms(),
      recentFoodsKey
        ? AsyncStorage.getItem(recentFoodsKey).then((cached) => {
            if (!cached) {
              return;
            }
            queryCache.set(recentFoodsKey, JSON.parse(cached));
          })
        : Promise.resolve(),
    ]);
  } catch (e) {
    Sentry.captureException(e);
  }
}

async function prefetchSettings() {
  try {
    const settings = await AsyncStorage.getItem('@fueliq_notification_settings');
    if (settings) {
      queryCache.set('notification_settings', JSON.parse(settings));
    }
  } catch (e) { Sentry.captureException(e); }
}

// Simple in-memory cache for prefetched data
const prefetchCache = new Map<string, { data: unknown; timestamp: number }>();

export function getPrefetchedData<T>(key: string, maxAge: number = 30000): T | null {
  const entry = prefetchCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > maxAge) {
    prefetchCache.delete(key);
    return null;
  }
  return entry.data as T;
}

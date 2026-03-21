import { useEffect, useRef } from 'react';
import { InteractionManager } from 'react-native';
import { queryCache } from '../lib/cache';
import { Sentry } from '../lib/sentry';
import { useAuth } from '../context/AuthContext';
import { buildMealCacheKey, getLegacyMealCacheKeys } from '../lib/profileState';

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
    // Warm the food search cache with recent/frequent foods
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const cached = await AsyncStorage.getItem('@fueliq_recent_foods');
    if (cached) {
      queryCache.set('recent_foods', JSON.parse(cached));
    }
  } catch (e) { Sentry.captureException(e); }
}

async function prefetchDiaryData(userId?: string | null) {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
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

async function prefetchSettings() {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
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

/**
 * Widget Data Layer
 *
 * Prepares data snapshots for iOS (WidgetKit) and Android (AppWidget) home
 * screen widgets. The data is written to a shared App Group (iOS) or
 * SharedPreferences (Android) so the native widget can read it without
 * launching the full React Native runtime.
 *
 * Supported widgets:
 * - Daily Summary: calories remaining, macro rings, streak
 * - Quick Log: one-tap buttons for frequent foods
 * - Water Tracker: glasses filled today
 * - Streak Counter: current streak + tier visual
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DailySummaryWidget {
  caloriesTarget: number;
  caloriesConsumed: number;
  caloriesRemaining: number;
  proteinCurrent: number;
  proteinTarget: number;
  carbsCurrent: number;
  carbsTarget: number;
  fatCurrent: number;
  fatTarget: number;
  streakDays: number;
  streakTier: 'none' | 'warm' | 'blaze' | 'hellfire';
  waterGlasses: number;
  waterTarget: number;
  lastUpdated: string;
}

export interface QuickLogWidget {
  frequentFoods: Array<{
    name: string;
    emoji: string;
    calories: number;
    protein: number;
  }>;
  lastUpdated: string;
}

export interface WaterWidget {
  glasses: number;
  target: number;
  percentage: number;
  lastUpdated: string;
}

export interface StreakWidget {
  days: number;
  tier: 'none' | 'warm' | 'blaze' | 'hellfire';
  nextMilestone: number;
  lastUpdated: string;
}

export interface AllWidgetData {
  dailySummary: DailySummaryWidget;
  quickLog: QuickLogWidget;
  water: WaterWidget;
  streak: StreakWidget;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WIDGET_DATA_KEY = '@fueliq_widget_data';

/**
 * iOS App Group identifier for sharing data with WidgetKit extensions.
 * Must match the App Group configured in Xcode and app.json.
 */
export const IOS_APP_GROUP = 'group.com.fueliq.app';

/**
 * Android SharedPreferences file name for widget data.
 */
export const ANDROID_WIDGET_PREFS = 'com.fueliq.app.widget_data';

// ---------------------------------------------------------------------------
// Streak Tier Calculation
// ---------------------------------------------------------------------------

function getStreakTier(days: number): 'none' | 'warm' | 'blaze' | 'hellfire' {
  if (days >= 14) return 'hellfire';
  if (days >= 7) return 'blaze';
  if (days >= 3) return 'warm';
  return 'none';
}

function getNextMilestone(days: number): number {
  const milestones = [3, 7, 14, 21, 30, 60, 100, 200, 365];
  for (const m of milestones) {
    if (days < m) return m;
  }
  return days + 100;
}

// ---------------------------------------------------------------------------
// Data Preparation
// ---------------------------------------------------------------------------

/**
 * Build a complete widget data snapshot from current app state.
 * Call this after any state change that affects widget-visible data.
 */
export function buildWidgetData(params: {
  caloriesTarget: number;
  caloriesConsumed: number;
  proteinCurrent: number;
  proteinTarget: number;
  carbsCurrent: number;
  carbsTarget: number;
  fatCurrent: number;
  fatTarget: number;
  streakDays: number;
  waterGlasses: number;
  waterTarget: number;
  frequentFoods: Array<{ name: string; emoji: string; calories: number; protein: number }>;
}): AllWidgetData {
  const now = new Date().toISOString();
  const tier = getStreakTier(params.streakDays);

  return {
    dailySummary: {
      caloriesTarget: params.caloriesTarget,
      caloriesConsumed: params.caloriesConsumed,
      caloriesRemaining: Math.max(0, params.caloriesTarget - params.caloriesConsumed),
      proteinCurrent: params.proteinCurrent,
      proteinTarget: params.proteinTarget,
      carbsCurrent: params.carbsCurrent,
      carbsTarget: params.carbsTarget,
      fatCurrent: params.fatCurrent,
      fatTarget: params.fatTarget,
      streakDays: params.streakDays,
      streakTier: tier,
      waterGlasses: params.waterGlasses,
      waterTarget: params.waterTarget,
      lastUpdated: now,
    },
    quickLog: {
      frequentFoods: params.frequentFoods.slice(0, 6),
      lastUpdated: now,
    },
    water: {
      glasses: params.waterGlasses,
      target: params.waterTarget,
      percentage: params.waterTarget > 0
        ? Math.round((params.waterGlasses / params.waterTarget) * 100)
        : 0,
      lastUpdated: now,
    },
    streak: {
      days: params.streakDays,
      tier,
      nextMilestone: getNextMilestone(params.streakDays),
      lastUpdated: now,
    },
  };
}

// ---------------------------------------------------------------------------
// Persistence (writes to shared storage for native widgets)
// ---------------------------------------------------------------------------

/**
 * Save widget data to shared storage accessible by native widget extensions.
 *
 * On iOS, this writes to the App Group's UserDefaults so WidgetKit can read it.
 * On Android, this writes to SharedPreferences for AppWidgetProvider access.
 *
 * Falls back to AsyncStorage when native modules are unavailable (Expo Go).
 */
export async function saveWidgetData(data: AllWidgetData): Promise<void> {
  const json = JSON.stringify(data);

  try {
    if (Platform.OS === 'ios') {
      // In production builds with native modules, use App Group UserDefaults.
      // In Expo Go / dev builds, fall back to AsyncStorage.
      try {
        const SharedGroupPreferences = require('react-native-shared-group-preferences');
        await SharedGroupPreferences.default.setItem(
          'widgetData',
          json,
          IOS_APP_GROUP
        );
      } catch {
        // Native module not available — use AsyncStorage fallback
        await AsyncStorage.setItem(WIDGET_DATA_KEY, json);
      }
    } else if (Platform.OS === 'android') {
      // In production, use SharedPreferences via native bridge.
      // Fall back to AsyncStorage in dev.
      try {
        const SharedPreferences = require('react-native-shared-preferences');
        SharedPreferences.default.setItem('widgetData', json);
      } catch {
        await AsyncStorage.setItem(WIDGET_DATA_KEY, json);
      }
    } else {
      await AsyncStorage.setItem(WIDGET_DATA_KEY, json);
    }
  } catch {
    // Silent fail — widget data is non-critical
  }
}

/**
 * Load the last saved widget data snapshot.
 */
export async function loadWidgetData(): Promise<AllWidgetData | null> {
  try {
    const json = await AsyncStorage.getItem(WIDGET_DATA_KEY);
    if (json) return JSON.parse(json);
  } catch {
    // Silent fail
  }
  return null;
}

/**
 * Request iOS WidgetKit to reload all widget timelines.
 * No-op on Android (widgets auto-update via SharedPreferences observer).
 */
export function reloadWidgets(): void {
  if (Platform.OS === 'ios') {
    try {
      const { WidgetKit } = require('react-native-widgetkit');
      WidgetKit?.reloadAllTimelines?.();
    } catch {
      // Native module not available
    }
  }
}

/**
 * Convenience: build + save + reload in one call.
 * Call this from MealContext, GamificationContext, etc. after state updates.
 */
export async function updateWidgets(params: Parameters<typeof buildWidgetData>[0]): Promise<void> {
  const data = buildWidgetData(params);
  await saveWidgetData(data);
  reloadWidgets();
}

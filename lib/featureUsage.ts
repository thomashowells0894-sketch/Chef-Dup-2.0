import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { trackEvent } from './analytics';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TrackedFeature =
  | 'food_log'
  | 'barcode_scan'
  | 'ai_chat'
  | 'workout_generate'
  | 'meal_plan'
  | 'fasting'
  | 'water_tracking'
  | 'weight_log'
  | 'progress_photos'
  | 'social_feed'
  | 'challenges'
  | 'achievements'
  | 'shopping_list'
  | 'export_data';

interface FeatureStats {
  count: number;
  lastUsed: number;
}

type FeatureUsageMap = Record<string, FeatureStats>;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'feature_usage_stats';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function loadLocalStats(): Promise<FeatureUsageMap> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // Storage read failed
  }
  return {};
}

async function saveLocalStats(stats: FeatureUsageMap): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch {
    // Storage write failed — silently ignore
  }
}

/**
 * Upsert the feature usage into the Supabase `feature_usage` table.
 * Uses an upsert so the count is incremented server-side.
 */
async function syncToSupabase(feature: string): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Attempt upsert: insert or update on conflict
    const { error } = await supabase.rpc('increment_feature_usage', {
      p_user_id: user.id,
      p_feature: feature,
    }).maybeSingle();

    // If the RPC doesn't exist, fall back to manual upsert
    if (error) {
      await supabase
        .from('feature_usage')
        .upsert(
          {
            user_id: user.id,
            feature,
            use_count: 1,
            last_used_at: new Date().toISOString(),
          },
          {
            onConflict: 'user_id,feature',
          }
        );
    }
  } catch {
    // Network failure — local stats still updated
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Track that a feature was used. Increments local count, updates `lastUsed`,
 * and fires an analytics event + Supabase sync.
 */
export async function trackFeatureUsage(feature: string): Promise<void> {
  const stats = await loadLocalStats();
  const existing = stats[feature];
  const now = Date.now();

  stats[feature] = {
    count: existing ? existing.count + 1 : 1,
    lastUsed: now,
  };

  await saveLocalStats(stats);

  // Fire an analytics event for real-time tracking
  trackEvent('retention', 'feature_used', {
    label: feature,
    metadata: {
      featureName: feature,
      totalUses: stats[feature].count,
    },
  });

  // Sync to Supabase in the background (non-blocking)
  syncToSupabase(feature);
}

/**
 * Get the full feature usage stats from local storage.
 * Returns a map of feature name to { count, lastUsed }.
 */
export async function getFeatureUsageStats(): Promise<FeatureUsageMap> {
  return loadLocalStats();
}

/**
 * Get the most-used features, sorted by count descending.
 * @param limit - Maximum number of features to return (default: 10).
 */
export async function getMostUsedFeatures(
  limit: number = 10
): Promise<Array<{ feature: string; count: number }>> {
  const stats = await loadLocalStats();

  return Object.entries(stats)
    .map(([feature, data]) => ({
      feature,
      count: data.count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

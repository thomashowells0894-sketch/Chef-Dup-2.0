import AsyncStorage from '@react-native-async-storage/async-storage';

const SYNC_ANCHOR_KEY = '@vibefit_health_sync_anchor';

interface SyncAnchor {
  lastSyncTimestamp: number;
  lastHeartRateSync: number;
  lastSleepSync: number;
  lastStepsSync: number;
  lastWorkoutSync: number;
}

const DEFAULT_ANCHOR: SyncAnchor = {
  lastSyncTimestamp: 0,
  lastHeartRateSync: 0,
  lastSleepSync: 0,
  lastStepsSync: 0,
  lastWorkoutSync: 0,
};

export async function getSyncAnchor(): Promise<SyncAnchor> {
  try {
    const raw = await AsyncStorage.getItem(SYNC_ANCHOR_KEY);
    if (raw) return { ...DEFAULT_ANCHOR, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULT_ANCHOR };
}

export async function updateSyncAnchor(updates: Partial<SyncAnchor>): Promise<void> {
  try {
    const current = await getSyncAnchor();
    const updated = { ...current, ...updates, lastSyncTimestamp: Date.now() };
    await AsyncStorage.setItem(SYNC_ANCHOR_KEY, JSON.stringify(updated));
  } catch {}
}

/**
 * Calculate the optimal sync window based on data type.
 * Heart rate: last 1 hour (frequent updates)
 * Sleep: last 24 hours (once daily)
 * Steps: last 2 hours
 * Workouts: last 24 hours
 */
export function getSyncWindow(dataType: keyof Omit<SyncAnchor, 'lastSyncTimestamp'>, anchor: SyncAnchor): { startDate: Date; endDate: Date } {
  const now = new Date();
  const lastSync = anchor[dataType] || 0;

  // If we have a last sync time, use it (with 5 min overlap for safety)
  if (lastSync > 0) {
    const overlapMs = 5 * 60 * 1000;
    return {
      startDate: new Date(lastSync - overlapMs),
      endDate: now,
    };
  }

  // Default windows for first sync
  const defaults: Record<string, number> = {
    lastHeartRateSync: 1 * 60 * 60 * 1000,   // 1 hour
    lastSleepSync: 24 * 60 * 60 * 1000,       // 24 hours
    lastStepsSync: 2 * 60 * 60 * 1000,        // 2 hours
    lastWorkoutSync: 24 * 60 * 60 * 1000,     // 24 hours
  };

  return {
    startDate: new Date(now.getTime() - (defaults[dataType] || 24 * 60 * 60 * 1000)),
    endDate: now,
  };
}

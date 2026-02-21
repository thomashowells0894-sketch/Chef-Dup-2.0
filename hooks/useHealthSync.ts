/**
 * useHealthSync - Background health data sync coordinator
 *
 * Responsibilities:
 * - Polls for new data every 5 minutes when app is foregrounded
 * - Persists health data snapshots to Supabase for trend analysis
 * - Calculates rolling averages and baselines
 * - Detects anomalies (unusual HR, poor sleep, etc.)
 * - Coordinates with HealthKit background observers
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { supabase } from '../lib/supabase';
import {
  getFullHealthSnapshot,
  getHRVHistory,
  getVO2MaxHistory,
  getSpO2History,
  getSyncStatus,
  getDataSource,
  isNativeHealthAvailable,
  subscribeToDataChanges,
  calculateRecoveryScore,
  getActivityRings,
} from '../services/healthService';
import type {
  HealthSnapshot,
  DailyHealthEntry,
  RecoveryScoreResult,
  SyncStatus,
  ActivityRings,
  DataSource,
} from '../services/healthService';
import { getEncryptedItem, setEncryptedItem } from '../lib/encryptedStorage';

declare const __DEV__: boolean;

const POLL_INTERVAL = 5 * 60 * 1000; // 5 minutes
const BASELINE_DAYS = 14;
const BASELINE_STORAGE_KEY = '@fueliq_health_baselines';
const SNAPSHOT_CACHE_KEY = '@fueliq_health_snapshot_cache';

// ---------------------------------------------------------------------------
// Anomaly thresholds
// ---------------------------------------------------------------------------
const ANOMALY_THRESHOLDS = {
  restingHR: { high: 85, low: 40 },
  hrv: { lowPercent: -0.30 }, // 30% below baseline
  sleepMinutes: { low: 300 }, // Less than 5 hours
  spo2: { low: 92 },
  respiratoryRate: { high: 25, low: 8 },
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HealthAnomaly {
  type: 'warning' | 'critical' | 'info';
  metric: string;
  title: string;
  message: string;
  value: number;
  threshold: number;
  timestamp: string;
}

export interface HealthBaselines {
  restingHR: number | null;
  hrv: number | null;
  sleepMinutes: number | null;
  spo2: number | null;
  vo2Max: number | null;
  steps: number | null;
  activeCalories: number | null;
  updatedAt: string | null;
}

export interface UseHealthSyncReturn {
  /** Current health snapshot */
  snapshot: HealthSnapshot | null;
  /** Is currently fetching data */
  isLoading: boolean;
  /** Is a sync in progress */
  isSyncing: boolean;
  /** Last successful sync time */
  lastSyncTime: string | null;
  /** Current sync status */
  syncStatus: SyncStatus | null;
  /** Data source */
  dataSource: DataSource;
  /** Whether we are using simulated data */
  isSimulated: boolean;
  /** Calculated baselines from rolling averages */
  baselines: HealthBaselines;
  /** Recovery score result */
  recoveryScore: RecoveryScoreResult | null;
  /** Activity rings (Move, Exercise, Stand) */
  activityRings: ActivityRings | null;
  /** HRV trend data (7-day) */
  hrvTrend: DailyHealthEntry[];
  /** VO2 Max trend data (7-day) */
  vo2MaxTrend: DailyHealthEntry[];
  /** SpO2 trend data (7-day) */
  spo2Trend: DailyHealthEntry[];
  /** Detected anomalies */
  anomalies: HealthAnomaly[];
  /** Trigger a manual sync */
  syncNow: () => Promise<void>;
  /** Force refresh all data */
  forceRefresh: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Health value validation — reject out-of-range or malformed readings
// ---------------------------------------------------------------------------
function validateHealthValue(value: number | null | undefined, min: number, max: number): number | null {
  if (value === null || value === undefined || isNaN(value) || !isFinite(value)) return null;
  if (value < min || value > max) return null;
  return value;
}

const HEALTH_RANGES = {
  restingHR: { min: 20, max: 300 },
  steps: { min: 0, max: 200000 },
  sleepMinutes: { min: 0, max: 1440 },
  weight: { min: 10, max: 700 },
  activeCalories: { min: 0, max: 20000 },
  hrv: { min: 0, max: 500 },
  vo2Max: { min: 5, max: 100 },
  spo2: { min: 50, max: 100 },
  respiratoryRate: { min: 4, max: 60 },
  deepSleepMinutes: { min: 0, max: 1440 },
  remSleepMinutes: { min: 0, max: 1440 },
  lightSleepMinutes: { min: 0, max: 1440 },
} as const;

/**
 * Validate all health values in a snapshot row before persisting.
 * Returns a new object with invalid values set to null.
 */
function validateSnapshotRow(row: Record<string, unknown>): Record<string, unknown> {
  const validated = { ...row };

  const fieldMap: Record<string, keyof typeof HEALTH_RANGES> = {
    resting_hr: 'restingHR',
    steps: 'steps',
    sleep_minutes: 'sleepMinutes',
    active_calories: 'activeCalories',
    hrv_avg: 'hrv',
    vo2_max: 'vo2Max',
    spo2_avg: 'spo2',
    respiratory_rate: 'respiratoryRate',
    deep_sleep_minutes: 'deepSleepMinutes',
    rem_sleep_minutes: 'remSleepMinutes',
    light_sleep_minutes: 'lightSleepMinutes',
  };

  for (const [dbField, rangeKey] of Object.entries(fieldMap)) {
    const range = HEALTH_RANGES[rangeKey];
    validated[dbField] = validateHealthValue(
      validated[dbField] as number | null | undefined,
      range.min,
      range.max,
    );
  }

  return validated;
}

// ---------------------------------------------------------------------------
// Hook implementation
// ---------------------------------------------------------------------------

export function useHealthSync(): UseHealthSyncReturn {
  const [snapshot, setSnapshot] = useState<HealthSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [baselines, setBaselines] = useState<HealthBaselines>({
    restingHR: null,
    hrv: null,
    sleepMinutes: null,
    spo2: null,
    vo2Max: null,
    steps: null,
    activeCalories: null,
    updatedAt: null,
  });
  const [recoveryScore, setRecoveryScore] = useState<RecoveryScoreResult | null>(null);
  const [activityRings, setActivityRings] = useState<ActivityRings | null>(null);
  const [hrvTrend, setHrvTrend] = useState<DailyHealthEntry[]>([]);
  const [vo2MaxTrend, setVo2MaxTrend] = useState<DailyHealthEntry[]>([]);
  const [spo2Trend, setSpo2Trend] = useState<DailyHealthEntry[]>([]);
  const [anomalies, setAnomalies] = useState<HealthAnomaly[]>([]);

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef<boolean>(true);
  const appStateRef = useRef<AppStateStatus>('active');

  const dataSource = syncStatus?.dataSource ?? 'simulated';
  const isSimulated = !isNativeHealthAvailable();

  // ---------------------------------------------------------------------------
  // Load cached baselines on mount
  // ---------------------------------------------------------------------------
  useEffect(() => {
    async function loadBaselines(): Promise<void> {
      try {
        const saved = await getEncryptedItem(BASELINE_STORAGE_KEY, null);
        if (saved && typeof saved === 'object') {
          setBaselines(saved as HealthBaselines);
        }
      } catch {
        // Ignore
      }
    }
    loadBaselines();
  }, []);

  // ---------------------------------------------------------------------------
  // Detect anomalies
  // ---------------------------------------------------------------------------
  const detectAnomalies = useCallback((snap: HealthSnapshot, bl: HealthBaselines): HealthAnomaly[] => {
    const detected: HealthAnomaly[] = [];
    const now = new Date().toISOString();

    // Resting HR anomaly
    if (snap.restingHR !== null) {
      if (snap.restingHR > ANOMALY_THRESHOLDS.restingHR.high) {
        detected.push({
          type: 'warning',
          metric: 'restingHR',
          title: 'Elevated Resting Heart Rate',
          message: `Your resting HR of ${snap.restingHR} bpm is above normal. This may indicate stress, dehydration, or illness.`,
          value: snap.restingHR,
          threshold: ANOMALY_THRESHOLDS.restingHR.high,
          timestamp: now,
        });
      }
      if (snap.restingHR < ANOMALY_THRESHOLDS.restingHR.low) {
        detected.push({
          type: 'info',
          metric: 'restingHR',
          title: 'Unusually Low Resting HR',
          message: `Your resting HR of ${snap.restingHR} bpm is very low. If you are not a trained athlete, consider consulting a doctor.`,
          value: snap.restingHR,
          threshold: ANOMALY_THRESHOLDS.restingHR.low,
          timestamp: now,
        });
      }
    }

    // HRV anomaly (vs baseline)
    if (snap.hrv !== null && bl.hrv !== null && bl.hrv > 0) {
      const deviation = (snap.hrv - bl.hrv) / bl.hrv;
      if (deviation < ANOMALY_THRESHOLDS.hrv.lowPercent) {
        detected.push({
          type: 'warning',
          metric: 'hrv',
          title: 'HRV Below Baseline',
          message: `Your HRV of ${snap.hrv}ms is ${Math.round(Math.abs(deviation) * 100)}% below your baseline of ${Math.round(bl.hrv)}ms. Consider prioritizing recovery.`,
          value: snap.hrv,
          threshold: Math.round(bl.hrv * (1 + ANOMALY_THRESHOLDS.hrv.lowPercent)),
          timestamp: now,
        });
      }
    }

    // Sleep anomaly
    if (snap.sleepMinutes > 0 && snap.sleepMinutes < ANOMALY_THRESHOLDS.sleepMinutes.low) {
      detected.push({
        type: 'warning',
        metric: 'sleep',
        title: 'Insufficient Sleep',
        message: `Only ${Math.round(snap.sleepMinutes / 60 * 10) / 10} hours of sleep detected. Aim for 7-9 hours for optimal recovery.`,
        value: snap.sleepMinutes,
        threshold: ANOMALY_THRESHOLDS.sleepMinutes.low,
        timestamp: now,
      });
    }

    // SpO2 anomaly
    if (snap.spo2 !== null && snap.spo2 < ANOMALY_THRESHOLDS.spo2.low) {
      detected.push({
        type: 'critical',
        metric: 'spo2',
        title: 'Low Blood Oxygen',
        message: `Your SpO2 of ${snap.spo2}% is below normal range. If persistent, consult a healthcare provider.`,
        value: snap.spo2,
        threshold: ANOMALY_THRESHOLDS.spo2.low,
        timestamp: now,
      });
    }

    // Respiratory rate anomaly
    if (snap.respiratoryRate !== null) {
      if (snap.respiratoryRate > ANOMALY_THRESHOLDS.respiratoryRate.high) {
        detected.push({
          type: 'warning',
          metric: 'respiratoryRate',
          title: 'Elevated Respiratory Rate',
          message: `Your respiratory rate of ${snap.respiratoryRate} breaths/min is above normal (12-20 range).`,
          value: snap.respiratoryRate,
          threshold: ANOMALY_THRESHOLDS.respiratoryRate.high,
          timestamp: now,
        });
      }
    }

    return detected.sort((a, b) => {
      const priority = { critical: 0, warning: 1, info: 2 };
      return (priority[a.type] ?? 2) - (priority[b.type] ?? 2);
    });
  }, []);

  // ---------------------------------------------------------------------------
  // Calculate rolling baselines from Supabase history
  // ---------------------------------------------------------------------------
  const calculateBaselines = useCallback(async (currentSnapshot: HealthSnapshot): Promise<HealthBaselines> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        // If not logged in, use current snapshot as a single data point
        return {
          restingHR: currentSnapshot.restingHR,
          hrv: currentSnapshot.hrv,
          sleepMinutes: currentSnapshot.sleepMinutes > 0 ? currentSnapshot.sleepMinutes : null,
          spo2: currentSnapshot.spo2,
          vo2Max: currentSnapshot.vo2Max,
          steps: currentSnapshot.steps > 0 ? currentSnapshot.steps : null,
          activeCalories: currentSnapshot.activeCalories > 0 ? currentSnapshot.activeCalories : null,
          updatedAt: new Date().toISOString(),
        };
      }

      // Fetch last N days from Supabase
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - BASELINE_DAYS);
      const cutoffStr = cutoff.toISOString().split('T')[0];

      const { data: history } = await supabase
        .from('health_snapshots')
        .select('resting_hr, hrv_avg, sleep_minutes, spo2_avg, vo2_max, steps, active_calories')
        .eq('user_id', session.user.id)
        .gte('date', cutoffStr)
        .order('date', { ascending: false })
        .limit(BASELINE_DAYS);

      if (!history || history.length < 3) {
        // Not enough history, use fallback
        return {
          restingHR: currentSnapshot.restingHR,
          hrv: currentSnapshot.hrv,
          sleepMinutes: currentSnapshot.sleepMinutes > 0 ? currentSnapshot.sleepMinutes : null,
          spo2: currentSnapshot.spo2,
          vo2Max: currentSnapshot.vo2Max,
          steps: currentSnapshot.steps > 0 ? currentSnapshot.steps : null,
          activeCalories: currentSnapshot.activeCalories > 0 ? currentSnapshot.activeCalories : null,
          updatedAt: new Date().toISOString(),
        };
      }

      const avg = (values: (number | null)[]): number | null => {
        const valid = values.filter((v): v is number => v !== null && v > 0);
        if (valid.length === 0) return null;
        return Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 10) / 10;
      };

      return {
        restingHR: avg(history.map((h) => h.resting_hr)),
        hrv: avg(history.map((h) => h.hrv_avg)),
        sleepMinutes: avg(history.map((h) => h.sleep_minutes)),
        spo2: avg(history.map((h) => h.spo2_avg)),
        vo2Max: avg(history.map((h) => h.vo2_max)),
        steps: avg(history.map((h) => h.steps)),
        activeCalories: avg(history.map((h) => h.active_calories)),
        updatedAt: new Date().toISOString(),
      };
    } catch (err) {
      if (__DEV__) console.warn('[useHealthSync] Failed to calculate baselines:', err);
      return baselines;
    }
  }, [baselines]);

  // ---------------------------------------------------------------------------
  // Persist snapshot to Supabase
  // ---------------------------------------------------------------------------
  const persistToSupabase = useCallback(async (snap: HealthSnapshot, recovery: RecoveryScoreResult | null): Promise<void> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return;

      const rawRow = {
        user_id: session.user.id,
        date: snap.date,
        steps: snap.steps,
        active_calories: snap.activeCalories,
        resting_hr: snap.restingHR,
        hrv_avg: snap.hrv,
        sleep_minutes: snap.sleepMinutes,
        deep_sleep_minutes: snap.deepSleepMinutes,
        rem_sleep_minutes: snap.remSleepMinutes,
        light_sleep_minutes: snap.lightSleepMinutes,
        vo2_max: snap.vo2Max,
        spo2_avg: snap.spo2,
        respiratory_rate: snap.respiratoryRate,
        recovery_score: recovery?.score ?? null,
        strain_score: snap.strainScore,
        source: snap.source,
      };

      // Validate all health metric values before persisting
      const row = validateSnapshotRow(rawRow);

      await supabase
        .from('health_snapshots')
        .upsert(row, { onConflict: 'user_id,date' });
    } catch (err) {
      if (__DEV__) console.warn('[useHealthSync] Failed to persist to Supabase:', err);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Core sync function
  // ---------------------------------------------------------------------------
  const performSync = useCallback(async (): Promise<void> => {
    if (!isMountedRef.current) return;

    try {
      setIsSyncing(true);

      // Fetch all health data in parallel
      const [snap, status, hrvData, vo2Data, spo2Data, rings] = await Promise.all([
        getFullHealthSnapshot(),
        getSyncStatus(),
        getHRVHistory(7),
        getVO2MaxHistory(7),
        getSpO2History(7),
        getActivityRings(),
      ]);

      if (!isMountedRef.current) return;

      // Update state
      setSnapshot(snap);
      setSyncStatus(status);
      setHrvTrend(hrvData);
      setVo2MaxTrend(vo2Data);
      setSpo2Trend(spo2Data);
      setActivityRings(rings);
      setLastSyncTime(snap.syncedAt);

      // Calculate baselines
      const newBaselines = await calculateBaselines(snap);
      setBaselines(newBaselines);

      // Persist baselines locally
      await setEncryptedItem(BASELINE_STORAGE_KEY, newBaselines);

      // Calculate recovery score
      const recovery = calculateRecoveryScore(
        snap.hrv,
        newBaselines.hrv,
        snap.sleepMinutes > 0 ? {
          totalMinutes: snap.sleepMinutes,
          deepMinutes: snap.deepSleepMinutes,
          lightMinutes: snap.lightSleepMinutes,
          remMinutes: snap.remSleepMinutes,
          awakeMinutes: 0,
          inBedMinutes: snap.sleepMinutes,
          efficiency: snap.sleepMinutes > 0 ? 90 : 0,
          hasStages: snap.deepSleepMinutes > 0 || snap.remSleepMinutes > 0,
          sleepStart: null,
          sleepEnd: null,
          source: snap.source,
        } : null,
        snap.restingHR,
        newBaselines.restingHR,
      );
      setRecoveryScore(recovery);

      // Detect anomalies
      const detected = detectAnomalies(snap, newBaselines);
      setAnomalies(detected);

      // Persist to Supabase (fire and forget)
      persistToSupabase(snap, recovery).catch(() => {});

      // Cache snapshot locally
      await setEncryptedItem(SNAPSHOT_CACHE_KEY, snap);
    } catch (err) {
      if (__DEV__) console.warn('[useHealthSync] Sync failed:', err);
    } finally {
      if (isMountedRef.current) {
        setIsSyncing(false);
        setIsLoading(false);
      }
    }
  }, [calculateBaselines, detectAnomalies, persistToSupabase]);

  // ---------------------------------------------------------------------------
  // Public sync functions
  // ---------------------------------------------------------------------------
  const syncNow = useCallback(async (): Promise<void> => {
    await performSync();
  }, [performSync]);

  const forceRefresh = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    await performSync();
  }, [performSync]);

  // ---------------------------------------------------------------------------
  // Initial load — try cached data first, then sync
  // ---------------------------------------------------------------------------
  useEffect(() => {
    isMountedRef.current = true;

    async function initialLoad(): Promise<void> {
      try {
        // Load cached snapshot first for instant display
        const cached = await getEncryptedItem(SNAPSHOT_CACHE_KEY, null);
        if (cached && typeof cached === 'object' && isMountedRef.current) {
          setSnapshot(cached as HealthSnapshot);
          setIsLoading(false);
        }
      } catch {
        // Ignore cache errors
      }

      // Then perform a fresh sync
      await performSync();
    }

    initialLoad();

    return () => {
      isMountedRef.current = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------------------------------------------------------------------
  // Foreground polling — every 5 minutes when app is active
  // ---------------------------------------------------------------------------
  useEffect(() => {
    function startPolling(): void {
      if (pollIntervalRef.current) return;
      pollIntervalRef.current = setInterval(() => {
        if (appStateRef.current === 'active') {
          performSync();
        }
      }, POLL_INTERVAL);
    }

    function stopPolling(): void {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    }

    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      appStateRef.current = nextState;
      if (nextState === 'active') {
        // Sync immediately when foregrounded
        performSync();
        startPolling();
      } else {
        stopPolling();
      }
    });

    startPolling();

    return () => {
      stopPolling();
      subscription.remove();
    };
  }, [performSync]);

  // ---------------------------------------------------------------------------
  // Subscribe to background HealthKit data changes
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const unsubscribe = subscribeToDataChanges((_dataType: string) => {
      // New data arrived from HealthKit background observer
      if (__DEV__) console.log('[useHealthSync] Background data change detected, syncing...');
      performSync();
    });

    return unsubscribe;
  }, [performSync]);

  return {
    snapshot,
    isLoading,
    isSyncing,
    lastSyncTime,
    syncStatus,
    dataSource,
    isSimulated,
    baselines,
    recoveryScore,
    activityRings,
    hrvTrend,
    vo2MaxTrend,
    spo2Trend,
    anomalies,
    syncNow,
    forceRefresh,
  };
}

export default useHealthSync;

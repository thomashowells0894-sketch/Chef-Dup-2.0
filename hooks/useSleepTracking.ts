import { useState, useEffect, useCallback, useMemo } from 'react';
import { isValidArray } from '../lib/validation';
import { getEncryptedItem, setEncryptedItem } from '../lib/encryptedStorage';
import { getSleepAnalysis } from '../services/healthService';
import type { SleepEntry } from '../types';
import type { SleepAnalysisResult } from '../services/healthService';

const STORAGE_KEY = '@vibefit_sleep_history';
const MAX_ENTRIES = 365;

/**
 * Calculate duration in hours between bedtime and wake time.
 * Handles overnight spans (e.g. 11 PM to 7 AM).
 * Both times are stored as ISO strings.
 */
function calculateDuration(bedtime: string, wakeTime: string): number {
  const bed = new Date(bedtime);
  const wake = new Date(wakeTime);
  let diffMs = wake.getTime() - bed.getTime();

  // If negative, the wake time is on the next day
  if (diffMs < 0) {
    diffMs += 24 * 60 * 60 * 1000;
  }

  return Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
}

/** Sleep stage breakdown from HealthKit or mock data */
export interface SleepStages {
  deepMinutes: number;
  lightMinutes: number;
  remMinutes: number;
  awakeMinutes: number;
  totalMinutes: number;
  inBedMinutes: number;
  efficiency: number;
  hasStages: boolean;
  source: 'healthkit' | 'health-connect' | 'mock' | 'manual';
}

interface SleepConsistency {
  score: number;
  avgBedtimeMinutes: number;
  stdDevMinutes: number;
  label: 'Excellent' | 'Good' | 'Fair' | 'Poor';
}

interface SleepDebtAccumulated {
  totalHours: number;
  daysTracked: number;
  averageDeficit: number;
  severity: 'severe' | 'moderate' | 'mild' | 'none';
}

interface UseSleepTrackingReturn {
  entries: SleepEntry[];
  isLoading: boolean;
  addEntry: (bedtime: string, wakeTime: string, quality: number | string, notes?: string) => void;
  deleteEntry: (date: string) => void;
  getWeeklyAverage: () => number | null;
  getSleepDebt: (targetHours?: number) => number | null;
  getQualityTrend: () => number | null;
  /** Auto-detected sleep stages from HealthKit (last night) */
  autoSleepStages: SleepStages | null;
  /** Whether auto-detected sleep data is available */
  hasAutoSleep: boolean;
  /** Full sleep analysis result from healthService */
  sleepAnalysis: SleepAnalysisResult | null;
  /** Calculate sleep efficiency from a given entry */
  getSleepEfficiency: (entry: SleepEntry) => number;
  /** Get stage percentages for display */
  getStagePercentages: () => { deep: number; light: number; rem: number; awake: number } | null;
  /** Bedtime consistency score over last 7 days */
  sleepConsistency: SleepConsistency | null;
  /** Cumulative sleep debt over last 14 days */
  sleepDebtAccumulated: SleepDebtAccumulated;
}

export function useSleepTracking(): UseSleepTrackingReturn {
  const [entries, setEntries] = useState<SleepEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [sleepAnalysis, setSleepAnalysis] = useState<SleepAnalysisResult | null>(null);
  const [autoSleepStages, setAutoSleepStages] = useState<SleepStages | null>(null);

  // Load data from encrypted storage on mount
  useEffect(() => {
    async function load(): Promise<void> {
      try {
        const parsed = await getEncryptedItem(STORAGE_KEY, []);
        if (isValidArray(parsed)) {
          // Filter out malformed entries and sort newest-first
          const valid = (parsed as SleepEntry[]).filter((e: unknown) =>
            e && typeof e === 'object' && typeof (e as SleepEntry).date === 'string' && typeof (e as SleepEntry).duration === 'number'
          ) as SleepEntry[];
          const sorted = valid.sort((a: SleepEntry, b: SleepEntry) => b.date.localeCompare(a.date));
          setEntries(sorted);
        }
      } catch (error: any) {
        if (__DEV__) console.error('Failed to load sleep history:', error.message);
      } finally {
        setIsLoading(false);
      }
    }

    load();
  }, []);

  // Fetch auto-detected sleep data from HealthKit
  useEffect(() => {
    async function fetchAutoSleep(): Promise<void> {
      try {
        const analysis = await getSleepAnalysis();
        if (analysis && analysis.totalMinutes > 0) {
          setSleepAnalysis(analysis);
          setAutoSleepStages({
            deepMinutes: analysis.deepMinutes,
            lightMinutes: analysis.lightMinutes,
            remMinutes: analysis.remMinutes,
            awakeMinutes: analysis.awakeMinutes,
            totalMinutes: analysis.totalMinutes,
            inBedMinutes: analysis.inBedMinutes,
            efficiency: analysis.efficiency,
            hasStages: analysis.hasStages,
            source: analysis.source as 'manual' | 'healthkit' | 'health-connect' | 'mock',
          });
        }
      } catch (error: any) {
        if (__DEV__) console.error('Failed to fetch auto sleep data:', error.message);
      }
    }

    fetchAutoSleep();
  }, []);

  // Auto-save entries when they change (encrypted)
  useEffect(() => {
    if (isLoading) return;
    setEncryptedItem(STORAGE_KEY, entries).catch((error: any) => {
      if (__DEV__) console.error('Failed to save sleep history:', error.message);
    });
  }, [entries, isLoading]);

  // Add a new sleep entry
  const addEntry = useCallback((bedtime: string, wakeTime: string, quality: number | string, notes: string = ''): void => {
    const now = new Date();
    const date = now.toISOString();
    const duration = calculateDuration(bedtime, wakeTime);

    const newEntry: SleepEntry = {
      date,
      bedtime,
      wakeTime,
      duration,
      quality: Math.min(5, Math.max(1, parseInt(quality as string, 10) || 3)),
      notes: notes.trim(),
    };

    setEntries((prev: SleepEntry[]) => {
      // Replace if there's already an entry for today
      const todayStr = now.toISOString().split('T')[0];
      const filtered = prev.filter((e: SleepEntry) => {
        const entryDay = new Date(e.date).toISOString().split('T')[0];
        return entryDay !== todayStr;
      });

      const updated = [newEntry, ...filtered];
      // Sort newest-first and limit to MAX_ENTRIES
      return updated
        .sort((a: SleepEntry, b: SleepEntry) => b.date.localeCompare(a.date))
        .slice(0, MAX_ENTRIES);
    });
  }, []);

  // Delete an entry by date
  const deleteEntry = useCallback((date: string): void => {
    setEntries((prev: SleepEntry[]) => prev.filter((e: SleepEntry) => e.date !== date));
  }, []);

  // Get the average sleep duration over the last 7 days
  const getWeeklyAverage = useCallback((): number | null => {
    if (entries.length === 0) return null;

    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const weekEntries = entries.filter((e: SleepEntry) => new Date(e.date) >= sevenDaysAgo);
    if (weekEntries.length === 0) return null;

    const sum = weekEntries.reduce((acc: number, e: SleepEntry) => acc + e.duration, 0);
    return Math.round((sum / weekEntries.length) * 10) / 10;
  }, [entries]);

  // Calculate sleep debt based on a target number of hours
  const getSleepDebt = useCallback((targetHours: number = 8): number | null => {
    if (entries.length === 0) return null;

    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const weekEntries = entries.filter((e: SleepEntry) => new Date(e.date) >= sevenDaysAgo);
    if (weekEntries.length === 0) return null;

    const totalTarget = targetHours * weekEntries.length;
    const totalSlept = weekEntries.reduce((acc: number, e: SleepEntry) => acc + e.duration, 0);
    const debt = Math.round((totalTarget - totalSlept) * 10) / 10;

    return debt; // positive = deficit, negative = surplus
  }, [entries]);

  // Get average quality trend over the last 7 days
  const getQualityTrend = useCallback((): number | null => {
    if (entries.length === 0) return null;

    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const weekEntries = entries.filter((e: SleepEntry) => new Date(e.date) >= sevenDaysAgo);
    if (weekEntries.length === 0) return null;

    const sum = weekEntries.reduce((acc: number, e: SleepEntry) => acc + e.quality, 0);
    return Math.round((sum / weekEntries.length) * 10) / 10;
  }, [entries]);

  // Calculate sleep efficiency for a given entry (time asleep / time in bed)
  const getSleepEfficiency = useCallback((entry: SleepEntry): number => {
    if (!entry || !entry.bedtime || !entry.wakeTime) return 0;
    const bed = new Date(entry.bedtime);
    const wake = new Date(entry.wakeTime);
    let timeInBedMs = wake.getTime() - bed.getTime();
    if (timeInBedMs < 0) timeInBedMs += 24 * 60 * 60 * 1000;
    const timeInBedHrs = timeInBedMs / (1000 * 60 * 60);
    if (timeInBedHrs <= 0) return 0;
    // Assume actual sleep time is the duration (which subtracts falling asleep time)
    return Math.min(100, Math.round((entry.duration / timeInBedHrs) * 100));
  }, []);

  // Get sleep stage percentages from auto-detected data
  const getStagePercentages = useCallback((): { deep: number; light: number; rem: number; awake: number } | null => {
    if (!autoSleepStages || !autoSleepStages.hasStages) return null;
    const total = autoSleepStages.deepMinutes + autoSleepStages.lightMinutes +
      autoSleepStages.remMinutes + autoSleepStages.awakeMinutes;
    if (total <= 0) return null;
    return {
      deep: Math.round((autoSleepStages.deepMinutes / total) * 100),
      light: Math.round((autoSleepStages.lightMinutes / total) * 100),
      rem: Math.round((autoSleepStages.remMinutes / total) * 100),
      awake: Math.round((autoSleepStages.awakeMinutes / total) * 100),
    };
  }, [autoSleepStages]);

  // ---------------------------------------------------------------------------
  // Sleep consistency: how regular is bedtime over the past 7 days?
  // ---------------------------------------------------------------------------
  const sleepConsistency = useMemo((): SleepConsistency | null => {
    if (entries.length < 3) return null;

    const recent = entries.slice(0, 7);
    const bedtimes = recent.map(e => {
      const d = new Date(e.bedtime);
      return d.getHours() * 60 + d.getMinutes();
    }).filter(Boolean);

    if (bedtimes.length < 3) return null;

    const mean = bedtimes.reduce((a, b) => a + b, 0) / bedtimes.length;
    const variance = bedtimes.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / bedtimes.length;
    const stdDev = Math.sqrt(variance);

    // Convert stdDev to 0-100 score (lower deviation = higher score)
    // 0 min stdDev = 100, 60+ min stdDev = 0
    const score = Math.max(0, Math.min(100, Math.round(100 - (stdDev / 60) * 100)));

    return {
      score,
      avgBedtimeMinutes: Math.round(mean),
      stdDevMinutes: Math.round(stdDev),
      label: score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Poor',
    };
  }, [entries]);

  // ---------------------------------------------------------------------------
  // Accumulated sleep debt over the past 14 days
  // ---------------------------------------------------------------------------
  const sleepDebtAccumulated = useMemo((): SleepDebtAccumulated => {
    const TARGET_HOURS = 8;
    const recent = entries.slice(0, 14);

    let totalDebt = 0;
    for (const entry of recent) {
      const hours = (entry.duration || 0) / 60;
      const deficit = TARGET_HOURS - hours;
      if (deficit > 0) totalDebt += deficit;
    }

    return {
      totalHours: Math.round(totalDebt * 10) / 10,
      daysTracked: recent.length,
      averageDeficit: recent.length > 0 ? Math.round((totalDebt / recent.length) * 10) / 10 : 0,
      severity: totalDebt > 10 ? 'severe' : totalDebt > 5 ? 'moderate' : totalDebt > 2 ? 'mild' : 'none',
    };
  }, [entries]);

  const hasAutoSleep = useMemo(() => {
    return autoSleepStages !== null && autoSleepStages.totalMinutes > 0;
  }, [autoSleepStages]);

  return {
    entries,
    isLoading,
    addEntry,
    deleteEntry,
    getWeeklyAverage,
    getSleepDebt,
    getQualityTrend,
    autoSleepStages,
    hasAutoSleep,
    sleepAnalysis,
    getSleepEfficiency,
    getStagePercentages,
    sleepConsistency,
    sleepDebtAccumulated,
  };
}

import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format, subDays } from 'date-fns';
import { getEncryptedItem, setEncryptedItem } from '../lib/encryptedStorage';
import {
  getRestingHeartRate,
  getHRV,
  getSleepAnalysis,
  isNativeHealthAvailable,
} from '../services/healthService';

const STORAGE_KEY = '@vibefit_recovery';
const BIOMETRIC_HISTORY_KEY = '@vibefit_recovery_biometrics';
const MAX_ENTRIES = 365;
const BASELINE_DAYS = 30;

// Muscle groups for soreness tracking
const MUSCLE_GROUPS = ['chest', 'back', 'shoulders', 'arms', 'legs', 'core'];

// Soreness level labels: 0=None, 1=Mild, 2=Moderate, 3=Severe
const SORENESS_LEVELS = {
  0: 'None',
  1: 'Mild',
  2: 'Moderate',
  3: 'Severe',
};

/**
 * Biometric history entry persisted in encrypted AsyncStorage.
 * Shape: { date: string, restingHR: number|null, hrv: number|null, timestamp: string }
 */

/**
 * useRecovery - Recovery & Readiness Tracker Hook
 *
 * Recovery Score (0-100) formula when biometrics available:
 *   HRV trend vs 30-day baseline  (40%)
 *   + Resting HR trend             (20%)
 *   + Sleep quality + duration     (20%)
 *   + Muscle soreness              (10%)
 *   + Subjective energy            (10%)
 *
 * Falls back to existing manual-only formula when biometric data is unavailable.
 *
 * Entry shape:
 * {
 *   date: string (yyyy-MM-dd),
 *   readinessScore: number (1-10, raw input),
 *   soreness: { [muscleGroup]: level (0-3) },
 *   sleepQuality: number (1-5),
 *   energyLevel: number (1-5),
 *   stressLevel: number (1-5),
 *   notes: string,
 *   hrv: number | undefined,
 *   createdAt: string (ISO),
 * }
 */
export default function useRecovery() {
  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Biometric state — fetched from HealthKit
  const [currentHRV, setCurrentHRV] = useState(null);
  const [currentRestingHR, setCurrentRestingHR] = useState(null);
  const [currentSleepData, setCurrentSleepData] = useState(null);
  const [biometricHistory, setBiometricHistory] = useState([]);
  const [biometricsLoaded, setBiometricsLoaded] = useState(false);

  // Tracks whether recovery score incorporates biometric data
  const [dataSource, setDataSource] = useState('self-reported'); // 'biometric-enhanced' | 'self-reported'

  // -----------------------------------------------------------------------
  // Load recovery entries from AsyncStorage on mount
  // -----------------------------------------------------------------------
  useEffect(() => {
    async function load() {
      try {
        const json = await AsyncStorage.getItem(STORAGE_KEY);
        if (json) {
          const parsed = JSON.parse(json);
          const sorted = parsed.sort((a, b) => b.date.localeCompare(a.date));
          setEntries(sorted);
        }
      } catch (error) {
        if (__DEV__) console.error('Failed to load recovery data:', error.message);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  // -----------------------------------------------------------------------
  // Load persisted biometric history from encrypted storage
  // -----------------------------------------------------------------------
  useEffect(() => {
    async function loadBiometrics() {
      try {
        const history = await getEncryptedItem(BIOMETRIC_HISTORY_KEY, []);
        if (Array.isArray(history)) {
          setBiometricHistory(history);
        }
      } catch (error) {
        if (__DEV__) console.error('Failed to load biometric history:', error.message);
      } finally {
        setBiometricsLoaded(true);
      }
    }
    loadBiometrics();
  }, []);

  // -----------------------------------------------------------------------
  // Fetch current biometric data from HealthKit
  // -----------------------------------------------------------------------
  useEffect(() => {
    async function fetchBiometrics() {
      try {
        const [hrv, rhr, sleep] = await Promise.all([
          getHRV(),
          getRestingHeartRate(),
          getSleepAnalysis(),
        ]);

        if (hrv !== null) setCurrentHRV(hrv);
        if (rhr !== null) setCurrentRestingHR(rhr);
        if (sleep !== null) setCurrentSleepData(sleep);

        // Determine data source
        if (hrv !== null || rhr !== null) {
          setDataSource('biometric-enhanced');
        }

        // Persist today's biometric reading to history
        if (hrv !== null || rhr !== null) {
          const today = format(new Date(), 'yyyy-MM-dd');
          setBiometricHistory((prev) => {
            const filtered = prev.filter((e) => e.date !== today);
            const entry = {
              date: today,
              restingHR: rhr,
              hrv: hrv,
              timestamp: new Date().toISOString(),
            };
            const updated = [entry, ...filtered]
              .sort((a, b) => b.date.localeCompare(a.date))
              .slice(0, BASELINE_DAYS * 3); // Keep ~6 weeks of data
            return updated;
          });
        }
      } catch (error) {
        if (__DEV__) console.error('Failed to fetch biometrics:', error.message);
      }
    }

    fetchBiometrics();
  }, []);

  // -----------------------------------------------------------------------
  // Auto-save entries when they change
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (isLoading) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries)).catch((error) => {
      if (__DEV__) console.error('Failed to save recovery data:', error.message);
    });
  }, [entries, isLoading]);

  // -----------------------------------------------------------------------
  // Auto-save biometric history when it changes
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!biometricsLoaded) return;
    setEncryptedItem(BIOMETRIC_HISTORY_KEY, biometricHistory).catch((error) => {
      if (__DEV__) console.error('Failed to save biometric history:', error.message);
    });
  }, [biometricHistory, biometricsLoaded]);

  // -----------------------------------------------------------------------
  // 30-day baselines for HRV and resting HR
  // -----------------------------------------------------------------------
  const hrvBaseline = useMemo(() => {
    const relevant = biometricHistory
      .filter((e) => e.hrv !== null && e.hrv !== undefined)
      .slice(0, BASELINE_DAYS);
    if (relevant.length < 3) return null; // Need at least 3 days for a baseline
    const sum = relevant.reduce((acc, e) => acc + e.hrv, 0);
    return sum / relevant.length;
  }, [biometricHistory]);

  const rhrBaseline = useMemo(() => {
    const relevant = biometricHistory
      .filter((e) => e.restingHR !== null && e.restingHR !== undefined)
      .slice(0, BASELINE_DAYS);
    if (relevant.length < 3) return null;
    const sum = relevant.reduce((acc, e) => acc + e.restingHR, 0);
    return sum / relevant.length;
  }, [biometricHistory]);

  // -----------------------------------------------------------------------
  // Add or replace today's recovery entry
  // -----------------------------------------------------------------------
  const addEntry = useCallback((data) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const entry = {
      date: today,
      readinessScore: data.readinessScore || 5,
      soreness: data.soreness || {},
      sleepQuality: Math.min(5, Math.max(1, data.sleepQuality || 3)),
      energyLevel: Math.min(5, Math.max(1, data.energyLevel || 3)),
      stressLevel: Math.min(5, Math.max(1, data.stressLevel || 3)),
      notes: (data.notes || '').trim(),
      hrv: data.hrv || currentHRV || undefined,
      createdAt: new Date().toISOString(),
    };

    setEntries((prev) => {
      const filtered = prev.filter((e) => e.date !== today);
      const updated = [entry, ...filtered].sort((a, b) => b.date.localeCompare(a.date));
      return updated.slice(0, MAX_ENTRIES);
    });
  }, [currentHRV]);

  // Delete an entry by date
  const deleteEntry = useCallback((date) => {
    setEntries((prev) => prev.filter((e) => e.date !== date));
  }, []);

  // Get the latest entry (most recent by date)
  const getLatestEntry = useCallback(() => {
    if (entries.length === 0) return null;
    return entries[0];
  }, [entries]);

  // Get today's entry
  const getTodayEntry = useCallback(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return entries.find((e) => e.date === today) || null;
  }, [entries]);

  // -----------------------------------------------------------------------
  // Biometric-enhanced readiness score calculation
  // -----------------------------------------------------------------------

  /**
   * Calculate HRV component (0-100).
   * Higher HRV relative to baseline = better recovery.
   * If HRV is 20% above baseline: score 100
   * If HRV is at baseline: score 60
   * If HRV is 30% below baseline: score 0
   */
  const calculateHRVComponent = useCallback((hrv) => {
    if (hrv === null || hrv === undefined || hrvBaseline === null) return null;
    const deviation = (hrv - hrvBaseline) / hrvBaseline;
    // Map deviation from -0.3..+0.2 to 0..100
    const score = ((deviation + 0.3) / 0.5) * 100;
    return Math.max(0, Math.min(100, Math.round(score)));
  }, [hrvBaseline]);

  /**
   * Calculate resting HR component (0-100).
   * Lower resting HR relative to baseline = better recovery.
   * If RHR is 10% below baseline: score 100
   * If RHR is at baseline: score 60
   * If RHR is 15% above baseline: score 0
   */
  const calculateRHRComponent = useCallback((rhr) => {
    if (rhr === null || rhr === undefined || rhrBaseline === null) return null;
    const deviation = (rhr - rhrBaseline) / rhrBaseline;
    // Map deviation from +0.15..-0.10 to 0..100 (note: inverted — lower is better)
    const score = ((0.15 - deviation) / 0.25) * 100;
    return Math.max(0, Math.min(100, Math.round(score)));
  }, [rhrBaseline]);

  /**
   * Calculate sleep component (0-100) from HealthKit sleep analysis.
   * Uses both duration and stage quality if available.
   */
  const calculateSleepComponent = useCallback((sleepData, manualQuality) => {
    if (sleepData && sleepData.totalMinutes > 0) {
      const hours = sleepData.totalMinutes / 60;
      // Duration score: 8h = 100, 6h = 50, <5h = 10
      const durationScore = Math.max(10, Math.min(100, (hours / 8) * 100));

      if (sleepData.hasStages) {
        // Stage quality: ideal is ~20% deep, ~25% REM
        const totalSleepMin = sleepData.deepMinutes + sleepData.lightMinutes + sleepData.remMinutes;
        if (totalSleepMin > 0) {
          const deepPct = sleepData.deepMinutes / totalSleepMin;
          const remPct = sleepData.remMinutes / totalSleepMin;
          // Deep: 20% ideal, penalize below 10%
          const deepScore = Math.min(100, (deepPct / 0.20) * 100);
          // REM: 25% ideal, penalize below 15%
          const remScore = Math.min(100, (remPct / 0.25) * 100);
          const stageScore = (deepScore + remScore) / 2;
          // Blend duration and stage quality
          return Math.round(durationScore * 0.5 + stageScore * 0.5);
        }
      }

      // Efficiency bonus if available
      const efficiencyBonus = sleepData.efficiency > 85 ? 10 : 0;
      return Math.min(100, Math.round(durationScore + efficiencyBonus));
    }

    // Fall back to manual sleep quality (1-5 mapped to 0-100)
    if (manualQuality) {
      return Math.round(((manualQuality - 1) / 4) * 100);
    }
    return 50; // Default middle ground
  }, []);

  /**
   * Calculate soreness component (0-100).
   * No soreness = 100, all severe = 0.
   */
  const calculateSorenessComponent = useCallback((soreness) => {
    const values = Object.values(soreness || {});
    if (values.length === 0) return 100; // No soreness data = assume fine
    const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
    // avg: 0 (none) to 3 (severe) -> 100 to 0
    return Math.round(((3 - avg) / 3) * 100);
  }, []);

  /**
   * Calculate energy component (0-100).
   * Energy 1-5 mapped to 0-100.
   */
  const calculateEnergyComponent = useCallback((energy) => {
    if (!energy) return 50;
    return Math.round(((energy - 1) / 4) * 100);
  }, []);

  // -----------------------------------------------------------------------
  // Main readiness calculation with biometric enhancement
  // -----------------------------------------------------------------------

  /**
   * Calculate biometric-enhanced readiness from an entry.
   * Returns { score: number, dataSource: 'biometric-enhanced' | 'self-reported' }
   */
  const calculateBiometricReadiness = useCallback((entry) => {
    const hrvValue = entry?.hrv ?? currentHRV;
    const rhrValue = currentRestingHR;

    const hrvComponent = calculateHRVComponent(hrvValue);
    const rhrComponent = calculateRHRComponent(rhrValue);
    const sleepComponent = calculateSleepComponent(currentSleepData, entry?.sleepQuality);
    const sorenessComponent = calculateSorenessComponent(entry?.soreness);
    const energyComponent = calculateEnergyComponent(entry?.energyLevel);

    const hasBiometrics = hrvComponent !== null || rhrComponent !== null;

    if (hasBiometrics) {
      // Biometric-enhanced formula:
      // HRV trend (40%) + Resting HR trend (20%) + Sleep (20%) + Soreness (10%) + Energy (10%)
      let score = 0;
      let totalWeight = 0;

      if (hrvComponent !== null) {
        score += hrvComponent * 0.40;
        totalWeight += 0.40;
      }
      if (rhrComponent !== null) {
        score += rhrComponent * 0.20;
        totalWeight += 0.20;
      }

      score += sleepComponent * 0.20;
      totalWeight += 0.20;

      score += sorenessComponent * 0.10;
      totalWeight += 0.10;

      score += energyComponent * 0.10;
      totalWeight += 0.10;

      // If we didn't get all biometric components, redistribute their weight
      const normalized = totalWeight > 0 ? score / totalWeight : 50;

      return {
        score: Math.max(0, Math.min(100, Math.round(normalized))),
        dataSource: 'biometric-enhanced',
        components: {
          hrv: hrvComponent,
          rhr: rhrComponent,
          sleep: sleepComponent,
          soreness: sorenessComponent,
          energy: energyComponent,
        },
      };
    }

    // Self-reported fallback (original algorithm)
    return {
      score: calculateManualReadiness(entry),
      dataSource: 'self-reported',
      components: {
        hrv: null,
        rhr: null,
        sleep: sleepComponent,
        soreness: sorenessComponent,
        energy: energyComponent,
      },
    };
  }, [currentHRV, currentRestingHR, currentSleepData, calculateHRVComponent, calculateRHRComponent, calculateSleepComponent, calculateSorenessComponent, calculateEnergyComponent]);

  /**
   * Original manual-only readiness calculation (preserved as fallback).
   */
  const calculateManualReadiness = useCallback((entry) => {
    if (!entry) return 0;

    const sorenessValues = Object.values(entry.soreness || {});
    const avgSoreness = sorenessValues.length > 0
      ? sorenessValues.reduce((sum, v) => sum + v, 0) / sorenessValues.length
      : 0;

    const sleepQ = entry.sleepQuality || 3;
    const energyL = entry.energyLevel || 3;
    const stressL = entry.stressLevel || 3;

    const sorenessComponent = 10 - avgSoreness * 2.5;
    const sleepComponent = sleepQ * 2;
    const energyComponent = energyL * 2;
    const stressComponent = stressL;

    const rawScore = sorenessComponent + sleepComponent + energyComponent - stressComponent;

    const minRaw = 1.5;
    const maxRaw = 29;
    const normalized = Math.round(((rawScore - minRaw) / (maxRaw - minRaw)) * 100);

    return Math.max(0, Math.min(100, normalized));
  }, []);

  // Keep the old function name for backward compatibility
  const calculateReadinessFromEntry = useCallback((entry) => {
    const result = calculateBiometricReadiness(entry);
    return result.score;
  }, [calculateBiometricReadiness]);

  /**
   * Get overall readiness score (0-100) for the latest entry.
   */
  const getReadinessScore = useCallback(() => {
    const latest = entries.length > 0 ? entries[0] : null;
    if (!latest) return 0;
    return calculateReadinessFromEntry(latest);
  }, [entries, calculateReadinessFromEntry]);

  /**
   * Get detailed readiness result with dataSource and component breakdown.
   */
  const getDetailedReadiness = useCallback(() => {
    const latest = entries.length > 0 ? entries[0] : null;
    if (!latest) {
      return {
        score: 0,
        dataSource: 'self-reported',
        components: { hrv: null, rhr: null, sleep: null, soreness: null, energy: null },
      };
    }
    return calculateBiometricReadiness(latest);
  }, [entries, calculateBiometricReadiness]);

  // Last 7 days readiness scores
  const getRecoveryTrend = useCallback(() => {
    const trend = [];
    for (let i = 6; i >= 0; i--) {
      const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
      const dayLabel = format(subDays(new Date(), i), 'EEE');
      const entry = entries.find((e) => e.date === date);
      trend.push({
        date,
        day: dayLabel,
        score: entry ? calculateReadinessFromEntry(entry) : 0,
        hasData: !!entry,
      });
    }
    return trend;
  }, [entries, calculateReadinessFromEntry]);

  // Current soreness map from latest entry
  const getMuscleRecovery = useCallback(() => {
    const latest = entries.length > 0 ? entries[0] : null;
    if (!latest || !latest.soreness) return {};
    return latest.soreness;
  }, [entries]);

  // Should rest today: true if readiness < 40 or average soreness > 2
  const getShouldRestToday = useCallback(() => {
    const latest = entries.length > 0 ? entries[0] : null;
    if (!latest) return false;

    const readiness = calculateReadinessFromEntry(latest);
    const sorenessValues = Object.values(latest.soreness || {});
    const avgSoreness = sorenessValues.length > 0
      ? sorenessValues.reduce((sum, v) => sum + v, 0) / sorenessValues.length
      : 0;

    return readiness < 40 || avgSoreness > 2;
  }, [entries, calculateReadinessFromEntry]);

  // Workout recommendation based on readiness
  const getRecommendation = useCallback(() => {
    const latest = entries.length > 0 ? entries[0] : null;
    if (!latest) return 'Log your recovery to get a recommendation';

    const readiness = calculateReadinessFromEntry(latest);

    if (readiness >= 80) return 'Full send! You\'re ready for heavy training';
    if (readiness >= 60) return 'Good to go for moderate intensity training';
    if (readiness >= 40) return 'Light activity recommended';
    return 'Rest day suggested';
  }, [entries, calculateReadinessFromEntry]);

  // Readiness label info (color, label, emoji)
  const getReadinessLabel = useCallback((score) => {
    if (score >= 80) return { label: 'Peak', color: '#00E676', emoji: '\uD83D\uDCAA', recommendation: 'Full send! You\'re ready for heavy training' };
    if (score >= 60) return { label: 'Good', color: '#FFB300', emoji: '\uD83D\uDD25', recommendation: 'Good to go for moderate intensity training' };
    if (score >= 40) return { label: 'Fair', color: '#FF9800', emoji: '\uD83D\uDE10', recommendation: 'Light activity recommended' };
    return { label: 'Rest', color: '#FF5252', emoji: '\uD83D\uDE34', recommendation: 'Rest day suggested' };
  }, []);

  // Average readiness over last 7 entries
  const getAverageReadiness = useCallback(() => {
    const recent = entries.slice(0, 7);
    if (recent.length === 0) return 0;
    const sum = recent.reduce((acc, e) => acc + calculateReadinessFromEntry(e), 0);
    return Math.round(sum / recent.length);
  }, [entries, calculateReadinessFromEntry]);

  // Current soreness from today's entry
  const getCurrentSoreness = useCallback(() => {
    const today = getTodayEntry();
    if (!today || !today.soreness) return {};
    return today.soreness;
  }, [getTodayEntry]);

  // -----------------------------------------------------------------------
  // Strain tracking
  // -----------------------------------------------------------------------
  const [dailyStrain, setDailyStrain] = useState(0);

  // Calculate daily strain from workout data
  const calculateDailyStrain = useCallback((workouts) => {
    if (!workouts || workouts.length === 0) return 0;

    const INTENSITY_MAP = {
      'strength': 7,
      'hiit': 9,
      'cardio': 6,
      'yoga': 3,
      'flexibility': 2,
      'endurance': 7,
      'hypertrophy': 6,
    };

    let totalStrain = 0;
    for (const w of workouts) {
      const baseIntensity = INTENSITY_MAP[w.type?.toLowerCase()] || 5;
      const durationFactor = Math.min((w.duration || 30) / 60, 2); // cap at 2 hours
      const strain = baseIntensity * durationFactor;
      totalStrain += strain;
    }

    // Normalize to 0-21 scale (Whoop-style)
    return Math.min(21, Math.round(totalStrain * 10) / 10);
  }, []);

  // Strain:Recovery ratio
  const recoveryScore = useMemo(() => getReadinessScore(), [getReadinessScore]);

  const strainRecoveryRatio = useMemo(() => {
    if (recoveryScore === 0 || dailyStrain === 0) return null;
    return Math.round((dailyStrain / (recoveryScore / 100)) * 10) / 10;
  }, [dailyStrain, recoveryScore]);

  return {
    entries,
    isLoading,
    addEntry,
    deleteEntry,
    getLatestEntry,
    getTodayEntry,
    getReadinessScore,
    calculateReadinessFromEntry,
    getRecoveryTrend,
    getMuscleRecovery,
    getShouldRestToday,
    getRecommendation,
    getReadinessLabel,
    getAverageReadiness,
    getCurrentSoreness,
    MUSCLE_GROUPS,
    SORENESS_LEVELS,

    // New biometric-enhanced exports
    dataSource,
    getDetailedReadiness,
    currentHRV,
    currentRestingHR,
    currentSleepData,
    hrvBaseline,
    rhrBaseline,
    biometricHistory,

    // Strain tracking
    dailyStrain,
    setDailyStrain,
    calculateDailyStrain,
    strainRecoveryRatio,
  };
}

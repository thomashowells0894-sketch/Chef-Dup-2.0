/**
 * useBiometricDashboard - Real-time biometric dashboard hook
 * Aggregates data from HealthKit, wearables, and manual entries.
 *
 * Updated to:
 * - Call real HealthKit functions from healthService.ts
 * - Persist resting HR with timestamps in encrypted AsyncStorage
 * - Build a 14-day baseline for HR and HRV
 * - Calculate real HR zones using actual heart rate data
 * - Calculate real VO2 Max using persisted resting HR (not default 60)
 * - Calculate real TRIMP from workout HR data
 */
import { useState, useCallback, useMemo, useEffect } from 'react';
import { useHealthKit } from './useHealthKit';
import { useProfile } from '../context/ProfileContext';
import { getEncryptedItem, setEncryptedItem } from '../lib/encryptedStorage';
import {
  getRestingHeartRate,
  getHeartRateData,
  getHRV,
  getSleepAnalysis,
  getRespiratoryRate,
} from '../services/healthService';
import {
  calculateHRZones,
  getCurrentHRZone,
  estimateVO2Max,
  getVO2MaxLevel,
  calculateTRIMP,
  generateBiometricAlerts,
} from '../lib/biometrics';

const BIOMETRIC_HR_KEY = '@fueliq_biometric_hr_history';
const BIOMETRIC_HRV_KEY = '@fueliq_biometric_hrv_history';
const BASELINE_DAYS = 14;

export function useBiometricDashboard() {
  const { isConnected, steps, activeCalories, weight: healthWeight, lastSynced } = useHealthKit();
  const { profile } = useProfile();

  // Real-time biometric state fetched from HealthKit
  const [heartRate, setHeartRate] = useState(null);
  const [restingHR, setRestingHR] = useState(null);
  const [hrv, setHrv] = useState(null);
  const [sleepData, setSleepData] = useState(null);
  const [respiratoryRate, setRespiratoryRate] = useState(null);
  const [hrSamples, setHrSamples] = useState([]);
  const [manualBiometrics, setManualBiometrics] = useState({});

  // Persisted history for baselines
  const [hrHistory, setHrHistory] = useState([]);
  const [hrvHistory, setHrvHistory] = useState([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  const age = profile.age || 30;
  const gender = profile.gender || 'male';
  const currentWeight = healthWeight || profile.weight;

  // ---------------------------------------------------------------------------
  // Load persisted HR and HRV history on mount
  // ---------------------------------------------------------------------------
  useEffect(() => {
    async function loadHistory() {
      try {
        const [savedHR, savedHRV] = await Promise.all([
          getEncryptedItem(BIOMETRIC_HR_KEY, []),
          getEncryptedItem(BIOMETRIC_HRV_KEY, []),
        ]);
        if (Array.isArray(savedHR)) setHrHistory(savedHR);
        if (Array.isArray(savedHRV)) setHrvHistory(savedHRV);
      } catch (err) {
        if (__DEV__) console.warn('[BiometricDashboard] Failed to load history:', err);
      } finally {
        setHistoryLoaded(true);
      }
    }
    loadHistory();
  }, []);

  // ---------------------------------------------------------------------------
  // Fetch real biometric data from HealthKit on mount & when connected
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!isConnected) return;

    async function fetchBiometrics() {
      try {
        const [rhr, hrvVal, sleep, rr, hrData] = await Promise.all([
          getRestingHeartRate(),
          getHRV(),
          getSleepAnalysis(),
          getRespiratoryRate(),
          getHeartRateData(24),
        ]);

        if (rhr !== null) setRestingHR(rhr);
        if (hrvVal !== null) setHrv(hrvVal);
        if (sleep !== null) setSleepData(sleep);
        if (rr !== null) setRespiratoryRate(rr);

        if (hrData && hrData.length > 0) {
          setHrSamples(hrData);
          // Use most recent HR sample as current heart rate
          setHeartRate(hrData[hrData.length - 1].value);
        }

        // Persist today's readings to history
        const today = new Date().toISOString().split('T')[0];
        const timestamp = new Date().toISOString();

        if (rhr !== null) {
          setHrHistory((prev) => {
            const filtered = prev.filter((e) => e.date !== today);
            const updated = [{ date: today, value: rhr, timestamp }, ...filtered]
              .sort((a, b) => b.date.localeCompare(a.date))
              .slice(0, BASELINE_DAYS * 3);
            return updated;
          });
        }

        if (hrvVal !== null) {
          setHrvHistory((prev) => {
            const filtered = prev.filter((e) => e.date !== today);
            const updated = [{ date: today, value: hrvVal, timestamp }, ...filtered]
              .sort((a, b) => b.date.localeCompare(a.date))
              .slice(0, BASELINE_DAYS * 3);
            return updated;
          });
        }
      } catch (err) {
        if (__DEV__) console.warn('[BiometricDashboard] Failed to fetch biometrics:', err);
      }
    }

    fetchBiometrics();
  }, [isConnected]);

  // ---------------------------------------------------------------------------
  // Continuous biometric polling (every 30 minutes while app is active)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!isConnected) return;

    const POLL_INTERVAL = 30 * 60 * 1000; // 30 minutes

    const poll = async () => {
      try {
        const [rhr, hrvVal, sleep, rr, hrData] = await Promise.all([
          getRestingHeartRate(),
          getHRV(),
          getSleepAnalysis(),
          getRespiratoryRate(),
          getHeartRateData(24),
        ]);

        if (rhr !== null) setRestingHR(rhr);
        if (hrvVal !== null) setHrv(hrvVal);
        if (sleep !== null) setSleepData(sleep);
        if (rr !== null) setRespiratoryRate(rr);

        if (hrData && hrData.length > 0) {
          setHrSamples(hrData);
          setHeartRate(hrData[hrData.length - 1].value);
        }
      } catch (e) {
        if (__DEV__) console.warn('Biometric poll failed:', e);
      }
    };

    const interval = setInterval(poll, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [isConnected]);

  // ---------------------------------------------------------------------------
  // Auto-save history when it changes
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!historyLoaded) return;
    setEncryptedItem(BIOMETRIC_HR_KEY, hrHistory).catch(() => {});
  }, [hrHistory, historyLoaded]);

  useEffect(() => {
    if (!historyLoaded) return;
    setEncryptedItem(BIOMETRIC_HRV_KEY, hrvHistory).catch(() => {});
  }, [hrvHistory, historyLoaded]);

  // ---------------------------------------------------------------------------
  // 14-day baselines
  // ---------------------------------------------------------------------------
  const rhrBaseline = useMemo(() => {
    const relevant = hrHistory.filter((e) => e.value > 0).slice(0, BASELINE_DAYS);
    if (relevant.length < 3) return null;
    return Math.round(relevant.reduce((sum, e) => sum + e.value, 0) / relevant.length);
  }, [hrHistory]);

  const hrvBaseline = useMemo(() => {
    const relevant = hrvHistory.filter((e) => e.value > 0).slice(0, BASELINE_DAYS);
    if (relevant.length < 3) return null;
    return Math.round(relevant.reduce((sum, e) => sum + e.value, 0) / relevant.length * 10) / 10;
  }, [hrvHistory]);

  // ---------------------------------------------------------------------------
  // Heart rate zones — use actual persisted resting HR, not default 60
  // ---------------------------------------------------------------------------
  const effectiveRestingHR = restingHR || rhrBaseline || 60;

  const hrZones = useMemo(() => {
    return calculateHRZones(age, effectiveRestingHR);
  }, [age, effectiveRestingHR]);

  // Current HR zone
  const currentZone = useMemo(() => {
    if (!heartRate) return null;
    return getCurrentHRZone(heartRate, age, effectiveRestingHR);
  }, [heartRate, age, effectiveRestingHR]);

  // ---------------------------------------------------------------------------
  // VO2 Max estimation using real persisted resting HR
  // ---------------------------------------------------------------------------
  const vo2max = useMemo(() => {
    const maxHR = 220 - age;
    const rhr = effectiveRestingHR;
    const estimate = estimateVO2Max(maxHR, rhr);
    if (!estimate) return null;
    return { ...getVO2MaxLevel(estimate, age, gender), value: estimate };
  }, [age, effectiveRestingHR, gender]);

  // ---------------------------------------------------------------------------
  // HR zone time distribution from actual HR samples
  // ---------------------------------------------------------------------------
  const hrZoneDistribution = useMemo(() => {
    if (!hrSamples || hrSamples.length < 2) return null;

    const zones = calculateHRZones(age, effectiveRestingHR);
    const distribution = zones.map((z) => ({ ...z, minutes: 0 }));

    for (let i = 1; i < hrSamples.length; i++) {
      const sample = hrSamples[i];
      const prevSample = hrSamples[i - 1];
      const hr = sample.value;

      // Estimate minutes between samples
      const t1 = new Date(prevSample.timestamp).getTime();
      const t2 = new Date(sample.timestamp).getTime();
      const minutesBetween = Math.min(30, (t2 - t1) / (1000 * 60)); // Cap at 30 min gap

      // Find which zone this HR falls in
      const zone = getCurrentHRZone(hr, age, effectiveRestingHR);
      const distEntry = distribution.find((d) => d.zone === zone.zone);
      if (distEntry) {
        distEntry.minutes += minutesBetween;
      }
    }

    return distribution.map((d) => ({
      zone: d.zone,
      name: d.name,
      color: d.color,
      minutes: Math.round(d.minutes),
    }));
  }, [hrSamples, age, effectiveRestingHR]);

  // ---------------------------------------------------------------------------
  // TRIMP calculation from actual workout HR data
  // ---------------------------------------------------------------------------
  const calculateWorkoutTRIMP = useCallback((avgWorkoutHR, durationMinutes) => {
    if (!avgWorkoutHR || !durationMinutes) return 0;
    const maxHR = 220 - age;
    return calculateTRIMP(avgWorkoutHR, durationMinutes, effectiveRestingHR, maxHR, gender);
  }, [age, effectiveRestingHR, gender]);

  // ---------------------------------------------------------------------------
  // Biometric alerts
  // ---------------------------------------------------------------------------
  const alerts = useMemo(() => {
    return generateBiometricAlerts({
      heartRate,
      restingHR: effectiveRestingHR,
      steps,
      sleepHours: sleepData?.totalMinutes ? sleepData.totalMinutes / 60 : undefined,
      weight: currentWeight,
      previousWeight: manualBiometrics.previousWeight,
      hydrationPercent: manualBiometrics.hydrationPercent,
    });
  }, [heartRate, effectiveRestingHR, steps, sleepData, currentWeight, manualBiometrics]);

  // ---------------------------------------------------------------------------
  // Dashboard summary
  // ---------------------------------------------------------------------------
  const summary = useMemo(() => {
    const stepsGoal = 10000;
    return {
      steps: {
        current: steps || 0,
        goal: stepsGoal,
        percent: Math.min(100, Math.round(((steps || 0) / stepsGoal) * 100)),
      },
      activeCalories: { current: activeCalories || 0, goal: 500 },
      heartRate: {
        current: heartRate,
        resting: restingHR || rhrBaseline,
        zone: currentZone,
        samples: hrSamples,
      },
      hrv: {
        current: hrv,
        baseline: hrvBaseline,
      },
      sleep: sleepData ? {
        hours: Math.round((sleepData.totalMinutes || 0) / 60 * 10) / 10,
        quality: sleepData.efficiency || null,
        stages: sleepData.hasStages ? {
          deep: sleepData.deepMinutes,
          light: sleepData.lightMinutes,
          rem: sleepData.remMinutes,
          awake: sleepData.awakeMinutes,
        } : null,
        efficiency: sleepData.efficiency,
      } : null,
      weight: currentWeight ? { current: currentWeight, unit: profile.weightUnit || 'lbs' } : null,
      respiratoryRate,
      vo2max,
      isConnected,
      lastSynced,
      rhrBaseline,
      hrvBaseline,
    };
  }, [steps, activeCalories, heartRate, restingHR, rhrBaseline, currentZone, hrSamples, hrv, hrvBaseline, sleepData, currentWeight, respiratoryRate, vo2max, isConnected, lastSynced, profile.weightUnit]);

  const updateManualBiometrics = useCallback((updates) => {
    setManualBiometrics((prev) => ({ ...prev, ...updates }));
  }, []);

  return {
    summary,
    hrZones,
    currentZone,
    vo2max,
    alerts,
    heartRate,
    setHeartRate,
    restingHR,
    setRestingHR,
    sleepData,
    setSleepData,
    updateManualBiometrics,
    isConnected,

    // New exports
    hrv,
    hrvBaseline,
    rhrBaseline,
    hrSamples,
    hrZoneDistribution,
    calculateWorkoutTRIMP,
    respiratoryRate,
    hrHistory,
    hrvHistory,
  };
}

export default useBiometricDashboard;

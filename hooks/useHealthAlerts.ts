import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ALERT_KEY = '@fueliq_health_alerts';

interface HealthData {
  heartRate?: number;
  restingHeartRate?: number;
  hrv?: number;
  spo2?: number;
  sleepHours?: number;
  baselineRHR?: number;
  baselineHRV?: number;
}

const THRESHOLDS = {
  spo2Low: 92,
  rhrElevated: 1.15, // 15% above baseline
  hrvLow: 0.7, // 30% below baseline
  sleepLow: 5.5, // hours
};

export function useHealthAlerts(healthData: HealthData | null) {
  const lastAlertRef = useRef<Record<string, number>>({});

  useEffect(() => {
    if (!healthData) return;

    (async () => {
      // Load last alert times
      try {
        const raw = await AsyncStorage.getItem(ALERT_KEY);
        if (raw) lastAlertRef.current = JSON.parse(raw);
      } catch {}

      const now = Date.now();
      const cooldown = 12 * 60 * 60 * 1000; // 12 hours between same alert type
      const alerts: Array<{ type: string; title: string; body: string }> = [];

      // SpO2 alert
      if (healthData.spo2 && healthData.spo2 < THRESHOLDS.spo2Low) {
        if (!lastAlertRef.current.spo2 || now - lastAlertRef.current.spo2 > cooldown) {
          alerts.push({
            type: 'spo2',
            title: 'Low Blood Oxygen',
            body: `Your SpO2 reading (${healthData.spo2}%) is below normal. If this persists, consult your doctor.`,
          });
        }
      }

      // Elevated RHR
      if (healthData.restingHeartRate && healthData.baselineRHR) {
        const ratio = healthData.restingHeartRate / healthData.baselineRHR;
        if (ratio > THRESHOLDS.rhrElevated) {
          if (!lastAlertRef.current.rhr || now - lastAlertRef.current.rhr > cooldown) {
            alerts.push({
              type: 'rhr',
              title: 'Elevated Resting Heart Rate',
              body: `Your RHR (${healthData.restingHeartRate} bpm) is higher than usual. Consider rest or recovery today.`,
            });
          }
        }
      }

      // Low HRV
      if (healthData.hrv && healthData.baselineHRV) {
        const ratio = healthData.hrv / healthData.baselineHRV;
        if (ratio < THRESHOLDS.hrvLow) {
          if (!lastAlertRef.current.hrv || now - lastAlertRef.current.hrv > cooldown) {
            alerts.push({
              type: 'hrv',
              title: 'Low HRV Detected',
              body: `Your HRV (${healthData.hrv}ms) is significantly below baseline. Your body may need extra recovery.`,
            });
          }
        }
      }

      // Poor sleep
      if (healthData.sleepHours && healthData.sleepHours < THRESHOLDS.sleepLow) {
        if (!lastAlertRef.current.sleep || now - lastAlertRef.current.sleep > cooldown) {
          alerts.push({
            type: 'sleep',
            title: 'Low Sleep Detected',
            body: `You only got ${healthData.sleepHours.toFixed(1)}h of sleep. Consider adjusting your nutrition for recovery.`,
          });
        }
      }

      // Send alerts
      for (const alert of alerts) {
        try {
          await Notifications.scheduleNotificationAsync({
            identifier: `health-${alert.type}-${now}`,
            content: {
              title: alert.title,
              body: alert.body,
              data: { type: 'health-alert', alertType: alert.type },
            },
            trigger: null,
          });
          lastAlertRef.current[alert.type] = now;
        } catch {}
      }

      // Persist alert times
      if (alerts.length > 0) {
        await AsyncStorage.setItem(ALERT_KEY, JSON.stringify(lastAlertRef.current));
      }
    })();
  }, [healthData]);
}

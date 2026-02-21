import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CYCLE_KEY = '@fueliq_cycle_data';

interface CyclePhase {
  name: 'menstrual' | 'follicular' | 'ovulatory' | 'luteal';
  day: number;
  totalDays: number;
  nutritionAdvice: string[];
  exerciseAdvice: string;
  calorieAdjustment: number; // percentage
}

interface CycleData {
  lastPeriodStart: string;
  averageCycleLength: number;
  averagePeriodLength: number;
  trackingEnabled: boolean;
}

const DEFAULT_CYCLE: CycleData = {
  lastPeriodStart: '',
  averageCycleLength: 28,
  averagePeriodLength: 5,
  trackingEnabled: false,
};

export function useCycleTracking() {
  const [cycleData, setCycleData] = useState<CycleData>(DEFAULT_CYCLE);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(CYCLE_KEY);
        if (raw) setCycleData(JSON.parse(raw));
      } catch {}
    })();
  }, []);

  const getCurrentPhase = useCallback((): CyclePhase | null => {
    if (!cycleData.trackingEnabled || !cycleData.lastPeriodStart) return null;

    const lastStart = new Date(cycleData.lastPeriodStart);
    const today = new Date();
    const daysSinceStart = Math.floor((today.getTime() - lastStart.getTime()) / (1000 * 60 * 60 * 24));
    const cycleDay = (daysSinceStart % cycleData.averageCycleLength) + 1;

    const { averagePeriodLength: pl, averageCycleLength: cl } = cycleData;

    if (cycleDay <= pl) {
      return {
        name: 'menstrual',
        day: cycleDay,
        totalDays: pl,
        nutritionAdvice: [
          'Increase iron-rich foods (red meat, spinach, lentils)',
          'Anti-inflammatory foods can help (berries, omega-3)',
          'Stay hydrated - aim for extra water today',
          'Magnesium-rich foods may reduce cramps (dark chocolate, nuts)',
        ],
        exerciseAdvice: 'Light to moderate exercise. Walking, yoga, and stretching recommended.',
        calorieAdjustment: 0,
      };
    }

    if (cycleDay <= pl + 8) {
      return {
        name: 'follicular',
        day: cycleDay - pl,
        totalDays: 8,
        nutritionAdvice: [
          'Energy is rising - great time for building lean muscle',
          'Prioritize protein for muscle recovery',
          'Complex carbs to fuel higher-intensity workouts',
        ],
        exerciseAdvice: 'Energy is high! Great time for HIIT, heavy lifting, and challenging workouts.',
        calorieAdjustment: 0,
      };
    }

    if (cycleDay <= pl + 12) {
      return {
        name: 'ovulatory',
        day: cycleDay - pl - 8,
        totalDays: 4,
        nutritionAdvice: [
          'Peak energy - optimize performance nutrition',
          'Support with antioxidant-rich foods',
          'Fiber helps with estrogen metabolism',
        ],
        exerciseAdvice: 'Peak performance window! Go for PRs and intense sessions.',
        calorieAdjustment: 0,
      };
    }

    return {
      name: 'luteal',
      day: cycleDay - pl - 12,
      totalDays: cl - pl - 12,
      nutritionAdvice: [
        'Metabolism increases - you may need 100-300 extra calories',
        'Cravings are normal - choose nutrient-dense options',
        'B6-rich foods help with PMS (bananas, salmon, chickpeas)',
        'Calcium and vitamin D may reduce PMS symptoms',
      ],
      exerciseAdvice: 'Moderate intensity. Focus on steady-state cardio and moderate strength.',
      calorieAdjustment: 5, // 5% increase
    };
  }, [cycleData]);

  const updateCycleData = useCallback(async (updates: Partial<CycleData>) => {
    const updated = { ...cycleData, ...updates };
    setCycleData(updated);
    await AsyncStorage.setItem(CYCLE_KEY, JSON.stringify(updated));
  }, [cycleData]);

  const logPeriodStart = useCallback(async (date: string) => {
    await updateCycleData({ lastPeriodStart: date, trackingEnabled: true });
  }, [updateCycleData]);

  return {
    cycleData,
    currentPhase: getCurrentPhase(),
    updateCycleData,
    logPeriodStart,
    isEnabled: cycleData.trackingEnabled,
  };
}

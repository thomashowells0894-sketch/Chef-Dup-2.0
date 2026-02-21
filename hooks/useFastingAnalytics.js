import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format, subDays } from 'date-fns';

const STORAGE_KEY = '@fueliq_fasting_history';

export default function useFastingAnalytics() {
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load history
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) setHistory(JSON.parse(saved));
      } catch (e) {}
      setIsLoading(false);
    })();
  }, []);

  // Persist
  useEffect(() => {
    if (isLoading) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(history)).catch(() => {});
  }, [history, isLoading]);

  // Add completed fast: { date, durationHours, targetHours, completed (bool) }
  const addFast = useCallback((durationHours, targetHours) => {
    const entry = {
      date: new Date().toISOString(),
      durationHours: Math.round(durationHours * 10) / 10,
      targetHours,
      completed: durationHours >= targetHours,
    };
    setHistory(prev => {
      const updated = [entry, ...prev].slice(0, 365);
      return updated;
    });
  }, []);

  const totalFasts = history.length;

  const averageDuration = useMemo(() => {
    if (!history.length) return 0;
    return Math.round((history.reduce((sum, h) => sum + h.durationHours, 0) / history.length) * 10) / 10;
  }, [history]);

  const longestFast = useMemo(() => {
    if (!history.length) return 0;
    return Math.max(...history.map(h => h.durationHours));
  }, [history]);

  const completionRate = useMemo(() => {
    if (!history.length) return 0;
    return Math.round((history.filter(h => h.completed).length / history.length) * 100);
  }, [history]);

  const totalHoursFasted = useMemo(() => {
    return Math.round(history.reduce((sum, h) => sum + h.durationHours, 0));
  }, [history]);

  const currentStreak = useMemo(() => {
    let streak = 0;
    const today = format(new Date(), 'yyyy-MM-dd');
    for (let i = 0; i < 365; i++) {
      const day = format(subDays(new Date(), i), 'yyyy-MM-dd');
      const hasFast = history.some(h => format(new Date(h.date), 'yyyy-MM-dd') === day && h.completed);
      if (hasFast) streak++;
      else if (i > 0) break; // skip today if not done yet
    }
    return streak;
  }, [history]);

  const bestStreak = useMemo(() => {
    if (!history.length) return 0;
    const sortedDays = [...new Set(history.filter(h => h.completed).map(h => format(new Date(h.date), 'yyyy-MM-dd')))].sort();
    let best = 0, current = 1;
    for (let i = 1; i < sortedDays.length; i++) {
      const prev = new Date(sortedDays[i - 1]);
      const curr = new Date(sortedDays[i]);
      const diff = (curr - prev) / (1000 * 60 * 60 * 24);
      if (diff === 1) { current++; best = Math.max(best, current); }
      else current = 1;
    }
    return Math.max(best, current, sortedDays.length > 0 ? 1 : 0);
  }, [history]);

  const weeklyData = useMemo(() => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const day = subDays(new Date(), i);
      const dayStr = format(day, 'yyyy-MM-dd');
      const dayLabel = format(day, 'EEE');
      const fast = history.find(h => format(new Date(h.date), 'yyyy-MM-dd') === dayStr);
      data.push({
        dayLabel,
        hours: fast ? fast.durationHours : 0,
        completed: fast ? fast.completed : false,
        target: fast ? fast.targetHours : 16,
      });
    }
    return data;
  }, [history]);

  // Fasting zones distribution from all fasts
  const fastingZones = useMemo(() => {
    const zones = [
      { name: 'Fed State', range: '0-12h', min: 0, max: 12, hours: 0, color: '#64748B', benefit: 'Normal metabolism' },
      { name: 'Fat Burning', range: '12-14h', min: 12, max: 14, hours: 0, color: '#00D4FF', benefit: 'Body switches to fat for fuel' },
      { name: 'Autophagy', range: '14-16h', min: 14, max: 16, hours: 0, color: '#A78BFA', benefit: 'Cellular cleanup begins' },
      { name: 'Growth Hormone', range: '16-20h', min: 16, max: 20, hours: 0, color: '#00E676', benefit: 'HGH increases up to 5x' },
      { name: 'Deep Autophagy', range: '20-24h', min: 20, max: 24, hours: 0, color: '#FFB300', benefit: 'Peak cellular repair' },
      { name: 'Extended', range: '24h+', min: 24, max: 48, hours: 0, color: '#FF6B35', benefit: 'Deep regeneration' },
    ];
    history.forEach(h => {
      const dur = h.durationHours;
      zones.forEach(z => {
        if (dur > z.min) {
          z.hours += Math.min(dur, z.max) - z.min;
        }
      });
    });
    const totalZoneHours = zones.reduce((s, z) => s + z.hours, 0) || 1;
    zones.forEach(z => { z.percentage = Math.round((z.hours / totalZoneHours) * 100); });
    return zones;
  }, [history]);

  const preferredSchedule = useMemo(() => {
    if (!history.length) return null;
    const counts = {};
    history.forEach(h => {
      const key = `${h.targetHours}:${24 - h.targetHours}`;
      counts[key] = (counts[key] || 0) + 1;
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return sorted[0] ? sorted[0][0] : null;
  }, [history]);

  return {
    history, isLoading, addFast,
    totalFasts, averageDuration, longestFast, completionRate,
    totalHoursFasted, currentStreak, bestStreak,
    weeklyData, fastingZones, preferredSchedule,
  };
}

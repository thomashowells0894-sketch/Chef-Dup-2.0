import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format, subDays, parseISO } from 'date-fns';

const STORAGE_KEY = '@vibefit_meal_timing';

export default function useMealTiming() {
  const [mealTimes, setMealTimes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) setMealTimes(JSON.parse(saved));
      } catch (e) {}
      setIsLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (isLoading) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(mealTimes)).catch(() => {});
  }, [mealTimes, isLoading]);

  // Record: { date, mealType, time (ISO), calories, protein }
  const recordMealTime = useCallback((mealType, calories, protein) => {
    const entry = {
      date: format(new Date(), 'yyyy-MM-dd'),
      mealType,
      time: new Date().toISOString(),
      hour: new Date().getHours(),
      minute: new Date().getMinutes(),
      calories: calories || 0,
      protein: protein || 0,
    };
    setMealTimes(prev => [...prev, entry].slice(-500));
  }, []);

  // Average meal times per meal type
  const getAverageMealTimes = useCallback(() => {
    const types = ['breakfast', 'lunch', 'dinner', 'snack'];
    const result = {};
    types.forEach(type => {
      const meals = mealTimes.filter(m => m.mealType === type);
      if (meals.length === 0) { result[type] = null; return; }
      const avgHour = Math.round(meals.reduce((s, m) => s + m.hour + m.minute / 60, 0) / meals.length * 10) / 10;
      const h = Math.floor(avgHour);
      const m = Math.round((avgHour - h) * 60);
      result[type] = { avgHour, formatted: `${h > 12 ? h - 12 : h}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`, count: meals.length };
    });
    return result;
  }, [mealTimes]);

  // Eating window (first to last meal each day)
  const getEatingWindow = useCallback(() => {
    const last7 = [];
    for (let i = 6; i >= 0; i--) {
      const day = format(subDays(new Date(), i), 'yyyy-MM-dd');
      const dayMeals = mealTimes.filter(m => m.date === day).sort((a, b) => new Date(a.time) - new Date(b.time));
      if (dayMeals.length >= 2) {
        const first = dayMeals[0];
        const last = dayMeals[dayMeals.length - 1];
        const windowHours = Math.round(((new Date(last.time) - new Date(first.time)) / 3600000) * 10) / 10;
        last7.push({ day: format(subDays(new Date(), i), 'EEE'), date: day, windowHours, firstMeal: first.hour, lastMeal: last.hour + last.minute / 60 });
      } else {
        last7.push({ day: format(subDays(new Date(), i), 'EEE'), date: day, windowHours: 0, firstMeal: 0, lastMeal: 0 });
      }
    }
    return last7;
  }, [mealTimes]);

  // Calorie distribution by hour (for a heatmap/chart)
  const getHourlyDistribution = useCallback(() => {
    const hours = Array.from({ length: 24 }, (_, i) => ({ hour: i, calories: 0, count: 0 }));
    mealTimes.slice(-100).forEach(m => {
      hours[m.hour].calories += m.calories;
      hours[m.hour].count++;
    });
    // Normalize to averages
    const days = new Set(mealTimes.slice(-100).map(m => m.date)).size || 1;
    hours.forEach(h => { h.avgCalories = Math.round(h.calories / days); });
    return hours.filter(h => h.count > 0);
  }, [mealTimes]);

  // Consistency score: how regular are meal times
  const getConsistencyScore = useCallback(() => {
    const types = ['breakfast', 'lunch', 'dinner'];
    let totalVariance = 0;
    let count = 0;
    types.forEach(type => {
      const meals = mealTimes.filter(m => m.mealType === type);
      if (meals.length < 3) return;
      const hours = meals.map(m => m.hour + m.minute / 60);
      const avg = hours.reduce((s, h) => s + h, 0) / hours.length;
      const variance = hours.reduce((s, h) => s + Math.pow(h - avg, 2), 0) / hours.length;
      totalVariance += Math.sqrt(variance);
      count++;
    });
    if (count === 0) return 0;
    const avgStdDev = totalVariance / count;
    // Convert to 0-100 score (0 stddev = 100, 3+ stddev = 0)
    return Math.max(0, Math.round(100 - (avgStdDev * 33)));
  }, [mealTimes]);

  const getInsights = useCallback(() => {
    const insights = [];
    const avgTimes = getAverageMealTimes();
    const window = getEatingWindow();
    const consistency = getConsistencyScore();

    if (avgTimes.breakfast?.avgHour > 10) insights.push({ type: 'late_breakfast', text: 'Your breakfast tends to be late. Earlier meals may boost metabolism.', emoji: '🌅' });
    if (avgTimes.dinner?.avgHour > 21) insights.push({ type: 'late_dinner', text: 'Late dinners detected. Try eating before 8 PM for better sleep.', emoji: '🌙' });

    const avgWindow = window.filter(w => w.windowHours > 0);
    if (avgWindow.length > 0) {
      const meanWindow = avgWindow.reduce((s, w) => s + w.windowHours, 0) / avgWindow.length;
      if (meanWindow > 14) insights.push({ type: 'wide_window', text: `Your eating window averages ${Math.round(meanWindow)}h. Consider narrowing for better fasting benefits.`, emoji: '⏰' });
      if (meanWindow < 8) insights.push({ type: 'narrow_window', text: `Great fasting discipline! Your eating window is ${Math.round(meanWindow)}h.`, emoji: '⭐' });
    }

    if (consistency >= 80) insights.push({ type: 'consistent', text: 'Excellent meal timing consistency! This helps regulate your metabolism.', emoji: '🎯' });
    else if (consistency < 50) insights.push({ type: 'inconsistent', text: 'Try to eat at more regular times for better metabolic health.', emoji: '📊' });

    return insights;
  }, [getAverageMealTimes, getEatingWindow, getConsistencyScore]);

  return {
    mealTimes, isLoading, recordMealTime,
    getAverageMealTimes, getEatingWindow, getHourlyDistribution,
    getConsistencyScore, getInsights,
  };
}

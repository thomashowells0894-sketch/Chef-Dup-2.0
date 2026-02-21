import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@fueliq_breathing_history';
const MAX_SESSIONS = 365;

export function useBreathing() {
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load data from AsyncStorage on mount
  useEffect(() => {
    async function load() {
      try {
        const json = await AsyncStorage.getItem(STORAGE_KEY);
        if (json) {
          const parsed = JSON.parse(json);
          const sorted = parsed.sort((a, b) => b.completedAt.localeCompare(a.completedAt));
          setSessions(sorted);
        }
      } catch (error) {
        if (__DEV__) console.error('Failed to load breathing history:', error.message);
      } finally {
        setIsLoading(false);
      }
    }

    load();
  }, []);

  // Auto-save sessions when they change
  useEffect(() => {
    if (isLoading) return;

    async function save() {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
      } catch (error) {
        if (__DEV__) console.error('Failed to save breathing history:', error.message);
      }
    }

    save();
  }, [sessions, isLoading]);

  // Add a completed session
  const addSession = useCallback((technique, durationSeconds) => {
    const now = new Date();
    const newSession = {
      date: now.toISOString().split('T')[0],
      technique,
      durationSeconds,
      completedAt: now.toISOString(),
    };

    setSessions((prev) => {
      const updated = [newSession, ...prev];
      return updated
        .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
        .slice(0, MAX_SESSIONS);
    });
  }, []);

  // Get sessions from today
  const getTodaySessions = useCallback(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return sessions.filter((s) => s.date === todayStr);
  }, [sessions]);

  // Get total minutes across all sessions
  const getTotalMinutes = useCallback(() => {
    const totalSeconds = sessions.reduce((acc, s) => acc + s.durationSeconds, 0);
    return Math.round(totalSeconds / 60);
  }, [sessions]);

  // Get consecutive days with at least one session (streak)
  const getStreak = useCallback(() => {
    if (sessions.length === 0) return 0;

    // Get unique dates sorted newest-first
    const uniqueDates = [...new Set(sessions.map((s) => s.date))].sort((a, b) => b.localeCompare(a));

    if (uniqueDates.length === 0) return 0;

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const yesterdayDate = new Date(today);
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = yesterdayDate.toISOString().split('T')[0];

    // Streak must start from today or yesterday
    if (uniqueDates[0] !== todayStr && uniqueDates[0] !== yesterdayStr) {
      return 0;
    }

    let streak = 1;
    for (let i = 1; i < uniqueDates.length; i++) {
      const prevDate = new Date(uniqueDates[i - 1]);
      const currDate = new Date(uniqueDates[i]);
      const diffDays = Math.round((prevDate - currDate) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }, [sessions]);

  // Get minutes per day for last 7 days
  const getWeeklyMinutes = useCallback(() => {
    const now = new Date();
    const days = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dayStr = d.toISOString().split('T')[0];
      const dayLabel = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];

      const daySessions = sessions.filter((s) => s.date === dayStr);
      const totalSeconds = daySessions.reduce((acc, s) => acc + s.durationSeconds, 0);
      const minutes = Math.round(totalSeconds / 60);

      days.push({
        date: dayStr,
        label: dayLabel,
        minutes,
      });
    }

    return days;
  }, [sessions]);

  return {
    sessions,
    isLoading,
    addSession,
    getTodaySessions,
    getTotalMinutes,
    getStreak,
    getWeeklyMinutes,
  };
}

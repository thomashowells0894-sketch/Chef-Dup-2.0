import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format, subDays } from 'date-fns';
import { safeJSONParse, isValidArray, isValidObject } from '../lib/validation';

const STORAGE_KEY = '@vibefit_habits';
const LOG_KEY = '@vibefit_habits_log';

interface Habit {
  id: string;
  name: string;
  emoji: string;
  color: string;
  frequency: string;
  customDays: number[];
  targetPerDay: number;
  createdAt: string;
  archived: boolean;
}

interface HabitInput {
  name: string;
  emoji?: string;
  color?: string;
  frequency?: string;
  customDays?: number[];
  targetPerDay?: number;
}

interface HabitCompletions {
  [habitId: string]: {
    [dateStr: string]: number;
  };
}

interface TodayProgress {
  completed: number;
  total: number;
  percentage: number;
}

interface WeeklyGridEntry {
  date: string;
  dayLabel: string;
  completed: number;
  target: number;
}

interface UseHabitsReturn {
  habits: Habit[];
  isLoading: boolean;
  addHabit: (data: HabitInput) => boolean;
  editHabit: (id: string, data: Partial<Habit>) => void;
  deleteHabit: (id: string) => void;
  archiveHabit: (id: string) => void;
  toggleCompletion: (habitId: string, date?: string) => void;
  getCompletionForDate: (habitId: string, date?: string) => number;
  getStreak: (habitId: string) => number;
  getBestStreak: (habitId: string) => number;
  getActiveHabitsForDay: (date?: string) => Habit[];
  getTodayProgress: () => TodayProgress;
  getWeeklyGrid: (habitId: string) => WeeklyGridEntry[];
}

export default function useHabits(): UseHabitsReturn {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [completions, setCompletions] = useState<HabitCompletions>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    (async () => {
      try {
        const [savedHabits, savedLog] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY),
          AsyncStorage.getItem(LOG_KEY),
        ]);
        const parsedHabits = safeJSONParse(savedHabits ?? '', []);
        if (isValidArray(parsedHabits)) setHabits(parsedHabits as Habit[]);
        const parsedLog = safeJSONParse(savedLog ?? '', {});
        if (isValidObject(parsedLog)) setCompletions(parsedLog as HabitCompletions);
      } catch (e) {}
      setIsLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (isLoading) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(habits)).catch(() => {});
  }, [habits, isLoading]);

  useEffect(() => {
    if (isLoading) return;
    AsyncStorage.setItem(LOG_KEY, JSON.stringify(completions)).catch(() => {});
  }, [completions, isLoading]);

  const addHabit = useCallback((data: HabitInput): boolean => {
    if (habits.length >= 20) return false;
    const habit: Habit = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: data.name,
      emoji: data.emoji || '\u2705',
      color: data.color || '#00D4FF',
      frequency: data.frequency || 'daily',
      customDays: data.customDays || [],
      targetPerDay: data.targetPerDay || 1,
      createdAt: new Date().toISOString(),
      archived: false,
    };
    setHabits((prev: Habit[]) => [...prev, habit]);
    return true;
  }, [habits.length]);

  const editHabit = useCallback((id: string, data: Partial<Habit>): void => {
    setHabits((prev: Habit[]) => prev.map((h: Habit) => h.id === id ? { ...h, ...data } : h));
  }, []);

  const deleteHabit = useCallback((id: string): void => {
    setHabits((prev: Habit[]) => prev.filter((h: Habit) => h.id !== id));
    setCompletions((prev: HabitCompletions) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const archiveHabit = useCallback((id: string): void => {
    setHabits((prev: Habit[]) => prev.map((h: Habit) => h.id === id ? { ...h, archived: !h.archived } : h));
  }, []);

  const toggleCompletion = useCallback((habitId: string, date?: string): void => {
    const dateStr = date || format(new Date(), 'yyyy-MM-dd');
    const habit = habits.find((h: Habit) => h.id === habitId);
    if (!habit) return;

    setCompletions((prev: HabitCompletions) => {
      const habitLog = prev[habitId] || {};
      const current = habitLog[dateStr] || 0;
      const next = current >= habit.targetPerDay ? 0 : current + 1;
      return { ...prev, [habitId]: { ...habitLog, [dateStr]: next } };
    });
  }, [habits]);

  const getCompletionForDate = useCallback((habitId: string, date?: string): number => {
    const dateStr = date || format(new Date(), 'yyyy-MM-dd');
    return completions[habitId]?.[dateStr] || 0;
  }, [completions]);

  const getStreak = useCallback((habitId: string): number => {
    const habit = habits.find((h: Habit) => h.id === habitId);
    if (!habit) return 0;
    let streak = 0;
    for (let i = 0; i < 365; i++) {
      const day = format(subDays(new Date(), i), 'yyyy-MM-dd');
      const count = completions[habitId]?.[day] || 0;
      if (count >= habit.targetPerDay) streak++;
      else if (i > 0) break;
    }
    return streak;
  }, [habits, completions]);

  const getBestStreak = useCallback((habitId: string): number => {
    const habit = habits.find((h: Habit) => h.id === habitId);
    if (!habit) return 0;
    let best = 0, current = 0;
    for (let i = 365; i >= 0; i--) {
      const day = format(subDays(new Date(), i), 'yyyy-MM-dd');
      const count = completions[habitId]?.[day] || 0;
      if (count >= habit.targetPerDay) { current++; best = Math.max(best, current); }
      else current = 0;
    }
    return best;
  }, [habits, completions]);

  const getActiveHabitsForDay = useCallback((date?: string): Habit[] => {
    const d = date ? new Date(date) : new Date();
    const dayOfWeek = d.getDay(); // 0=Sun, 6=Sat
    return habits.filter((h: Habit) => {
      if (h.archived) return false;
      if (h.frequency === 'daily') return true;
      if (h.frequency === 'weekdays') return dayOfWeek >= 1 && dayOfWeek <= 5;
      if (h.frequency === 'weekends') return dayOfWeek === 0 || dayOfWeek === 6;
      if (h.frequency === 'custom') return h.customDays.includes(dayOfWeek);
      return true;
    });
  }, [habits]);

  const getTodayProgress = useCallback((): TodayProgress => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const active = getActiveHabitsForDay();
    if (!active.length) return { completed: 0, total: 0, percentage: 0 };
    const completed = active.filter((h: Habit) => (completions[h.id]?.[today] || 0) >= h.targetPerDay).length;
    return { completed, total: active.length, percentage: Math.round((completed / active.length) * 100) };
  }, [getActiveHabitsForDay, completions]);

  const getWeeklyGrid = useCallback((habitId: string): WeeklyGridEntry[] => {
    const data: WeeklyGridEntry[] = [];
    for (let i = 6; i >= 0; i--) {
      const day = subDays(new Date(), i);
      const dateStr = format(day, 'yyyy-MM-dd');
      const habit = habits.find((h: Habit) => h.id === habitId);
      const count = completions[habitId]?.[dateStr] || 0;
      data.push({
        date: dateStr,
        dayLabel: format(day, 'EEE'),
        completed: count,
        target: habit?.targetPerDay || 1,
      });
    }
    return data;
  }, [habits, completions]);

  return {
    habits, isLoading, addHabit, editHabit, deleteHabit, archiveHabit,
    toggleCompletion, getCompletionForDate, getStreak, getBestStreak,
    getActiveHabitsForDay, getTodayProgress, getWeeklyGrid,
  };
}

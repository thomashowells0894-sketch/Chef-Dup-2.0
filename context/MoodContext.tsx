import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { hapticSuccess, hapticLight } from '../lib/haptics';

interface MoodLog {
  id: string;
  timestamp: number;
  date: string;
  energyLevel: number;
  focusLevel: number;
  digestionStatus: string;
  notes: string;
  quickMood: string | null;
}

interface DigestionOption {
  label: string;
  emoji: string;
  color: string;
}

interface QuickMoodOption {
  label: string;
  emoji: string;
  energyLevel: number;
  focusLevel: number;
}

interface TodaysAverage {
  energy: number;
  focus: number;
  logCount: number;
}

interface DailyAverage {
  date: string;
  energy: number;
  focus: number;
}

interface WeeklyTrend {
  avgEnergy: number;
  avgFocus: number;
  totalLogs: number;
  dailyAverages: DailyAverage[];
}

interface AddLogParams {
  energyLevel: number;
  focusLevel: number;
  digestionStatus?: string;
  notes?: string;
  quickMood?: string | null;
}

interface MoodContextValue {
  logs: MoodLog[];
  isLoading: boolean;
  lastLog: MoodLog | null;
  lastLogRelativeTime: string | null;
  todaysLogs: MoodLog[];
  todaysAverage: TodaysAverage | null;
  weeklyTrend: WeeklyTrend | null;
  addLog: (params: AddLogParams) => Promise<MoodLog>;
  quickLog: (moodType: string) => Promise<MoodLog | null>;
  deleteLog: (logId: string) => Promise<void>;
  digestionOptions: Record<string, DigestionOption>;
  quickMoods: Record<string, QuickMoodOption>;
}

const MoodContext = createContext<MoodContextValue | null>(null);

const STORAGE_KEY = '@fueliq_mood_logs';
const MAX_LOGS = 100; // Keep last 100 logs

// Digestion status options
export const DIGESTION_STATUS: Record<string, DigestionOption> = {
  good: { label: 'Good', emoji: '✅', color: '#4CAF50' },
  bloated: { label: 'Bloated', emoji: '🫃', color: '#FF9800' },
  hungry: { label: 'Hungry', emoji: '🍽️', color: '#2196F3' },
  upset: { label: 'Upset', emoji: '😣', color: '#F44336' },
};

// Quick mood options for the card
export const QUICK_MOODS: Record<string, QuickMoodOption> = {
  high: { label: 'High Energy', emoji: '⚡', energyLevel: 8, focusLevel: 7 },
  neutral: { label: 'Neutral', emoji: '😐', energyLevel: 5, focusLevel: 5 },
  tired: { label: 'Tired', emoji: '😴', energyLevel: 3, focusLevel: 3 },
};

/**
 * Format relative time (e.g., "2 mins ago", "1 hour ago")
 */
function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) return 'Just now';
  if (minutes === 1) return '1 min ago';
  if (minutes < 60) return `${minutes} mins ago`;
  if (hours === 1) return '1 hour ago';
  if (hours < 24) return `${hours} hours ago`;
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}

/**
 * Get today's date string
 */
function getTodayString(): string {
  return new Date().toISOString().split('T')[0]!;
}

export function MoodProvider({ children }: { children: React.ReactNode }) {
  const [logs, setLogs] = useState<MoodLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isHydrated, setIsHydrated] = useState<boolean>(false);

  // Load saved logs on mount
  useEffect(() => {
    async function loadLogs() {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          setLogs(parsed || []);
        }
      } catch (error) {
        if (__DEV__) console.error('Failed to load mood logs:', error);
      } finally {
        setIsLoading(false);
        setIsHydrated(true);
      }
    }
    loadLogs();
  }, []);

  // Auto-save logs when they change
  useEffect(() => {
    if (!isHydrated) return;

    async function saveLogs() {
      try {
        // Keep only the last MAX_LOGS entries
        const logsToSave = logs.slice(-MAX_LOGS);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(logsToSave));
      } catch (error) {
        if (__DEV__) console.error('Failed to save mood logs:', error);
      }
    }
    saveLogs();
  }, [logs, isHydrated]);

  // Add a new mood log
  const addLog = useCallback(async ({
    energyLevel,
    focusLevel,
    digestionStatus,
    notes = '',
    quickMood = null,
  }: AddLogParams): Promise<MoodLog> => {
    const newLog: MoodLog = {
      id: `mood-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      date: getTodayString(),
      energyLevel: Math.max(1, Math.min(10, energyLevel)),
      focusLevel: Math.max(1, Math.min(10, focusLevel)),
      digestionStatus: digestionStatus || 'good',
      notes: notes.trim(),
      quickMood, // Track if this was a quick log
    };

    setLogs((prev) => [...prev, newLog]);

    await hapticSuccess();

    return newLog;
  }, []);

  // Quick log with preset values
  const quickLog = useCallback(async (moodType: string): Promise<MoodLog | null> => {
    const preset = QUICK_MOODS[moodType];
    if (!preset) return null;

    return addLog({
      energyLevel: preset.energyLevel,
      focusLevel: preset.focusLevel,
      digestionStatus: 'good',
      notes: '',
      quickMood: moodType,
    });
  }, [addLog]);

  // Delete a log
  const deleteLog = useCallback(async (logId: string) => {
    setLogs((prev) => prev.filter((log) => log.id !== logId));
    await hapticLight();
  }, []);

  // Get today's logs
  const todaysLogs = useMemo<MoodLog[]>(() => {
    const today = getTodayString();
    return logs.filter((log) => log.date === today);
  }, [logs]);

  // Get the most recent log
  const lastLog = useMemo<MoodLog | null>(() => {
    if (logs.length === 0) return null;
    return logs[logs.length - 1] ?? null;
  }, [logs]);

  // Get formatted time since last log
  const lastLogRelativeTime = useMemo<string | null>(() => {
    if (!lastLog) return null;
    return formatRelativeTime(lastLog.timestamp);
  }, [lastLog]);

  // Calculate today's average mood
  const todaysAverage = useMemo<TodaysAverage | null>(() => {
    if (todaysLogs.length === 0) return null;

    const avgEnergy = todaysLogs.reduce((sum, log) => sum + log.energyLevel, 0) / todaysLogs.length;
    const avgFocus = todaysLogs.reduce((sum, log) => sum + log.focusLevel, 0) / todaysLogs.length;

    return {
      energy: Math.round(avgEnergy * 10) / 10,
      focus: Math.round(avgFocus * 10) / 10,
      logCount: todaysLogs.length,
    };
  }, [todaysLogs]);

  // Get weekly mood trend
  const weeklyTrend = useMemo<WeeklyTrend | null>(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const weekLogs = logs.filter((log) => log.timestamp >= weekAgo);

    if (weekLogs.length === 0) return null;

    const avgEnergy = weekLogs.reduce((sum, log) => sum + log.energyLevel, 0) / weekLogs.length;
    const avgFocus = weekLogs.reduce((sum, log) => sum + log.focusLevel, 0) / weekLogs.length;

    // Group by day for trend
    const byDay: Record<string, { energy: number[]; focus: number[] }> = {};
    weekLogs.forEach((log) => {
      if (!byDay[log.date]) {
        byDay[log.date] = { energy: [], focus: [] };
      }
      byDay[log.date]!.energy.push(log.energyLevel);
      byDay[log.date]!.focus.push(log.focusLevel);
    });

    const dailyAverages: DailyAverage[] = Object.entries(byDay).map(([date, data]) => ({
      date,
      energy: data.energy.reduce((a, b) => a + b, 0) / data.energy.length,
      focus: data.focus.reduce((a, b) => a + b, 0) / data.focus.length,
    }));

    return {
      avgEnergy: Math.round(avgEnergy * 10) / 10,
      avgFocus: Math.round(avgFocus * 10) / 10,
      totalLogs: weekLogs.length,
      dailyAverages,
    };
  }, [logs]);

  const value = useMemo<MoodContextValue>(
    () => ({
      // State
      logs,
      isLoading,
      // Latest data
      lastLog,
      lastLogRelativeTime,
      todaysLogs,
      todaysAverage,
      weeklyTrend,
      // Actions
      addLog,
      quickLog,
      deleteLog,
      // Constants
      digestionOptions: DIGESTION_STATUS,
      quickMoods: QUICK_MOODS,
    }),
    [
      logs,
      isLoading,
      lastLog,
      lastLogRelativeTime,
      todaysLogs,
      todaysAverage,
      weeklyTrend,
      addLog,
      quickLog,
      deleteLog,
    ]
  );

  return <MoodContext.Provider value={value}>{children}</MoodContext.Provider>;
}

export function useMood(): MoodContextValue {
  const context = useContext(MoodContext);
  if (!context) {
    throw new Error('useMood must be used within a MoodProvider');
  }
  return context;
}

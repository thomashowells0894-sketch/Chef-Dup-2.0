import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { hapticSuccess } from '../lib/haptics';
import { getEncryptedItem, setEncryptedItem } from '../lib/encryptedStorage';
import { useGamification } from './GamificationContext';
import { useNotifications } from './NotificationContext';
import type {
  FastingProgress,
  FastingPrompt,
  FastingProtocol,
  EatingWindowInfo,
  FastingContextValue,
  MealType,
} from '../types';

const FastingContext = createContext<FastingContextValue | null>(null);

const STORAGE_KEY = '@vibefit_fasting';

// Default fasting duration in hours
const DEFAULT_FAST_DURATION = 16;

// Fasting states
export const FASTING_STATES: Record<string, string> = {
  EATING: 'EATING',
  FASTING: 'FASTING',
};

// Common fasting protocols (hours)
export const FASTING_PROTOCOLS: Record<string, FastingProtocol> = {
  '16:8': { fastHours: 16, eatHours: 8, label: '16:8 (Leangains)' },
  '18:6': { fastHours: 18, eatHours: 6, label: '18:6' },
  '20:4': { fastHours: 20, eatHours: 4, label: '20:4 (Warrior)' },
  '14:10': { fastHours: 14, eatHours: 10, label: '14:10 (Beginner)' },
};

interface FastingStoredState {
  isFasting: boolean;
  fastStartTime: number | null;
  fastDuration: number;
  lastMealTime: number | null;
  lastMealType: MealType | null;
}

/**
 * Calculate fasting progress and times
 * @param startTime - Timestamp when fast started
 * @param durationHours - Target duration in hours
 * @returns { elapsed, remaining, progress, isComplete }
 */
export function calculateFastingProgress(startTime: number | null, durationHours: number): FastingProgress {
  if (!startTime) {
    return {
      elapsedMs: 0,
      remainingMs: durationHours * 60 * 60 * 1000,
      elapsedHours: 0,
      elapsedMinutes: 0,
      remainingHours: durationHours,
      remainingMinutes: 0,
      progress: 0,
      isComplete: false,
    };
  }

  const now = Date.now();
  const durationMs = durationHours * 60 * 60 * 1000;
  const elapsedMs = now - startTime;
  const remainingMs = Math.max(durationMs - elapsedMs, 0);
  const progress = Math.min(elapsedMs / durationMs, 1);
  const isComplete = elapsedMs >= durationMs;

  // Convert to hours and minutes
  const elapsedTotalMinutes = Math.floor(elapsedMs / (1000 * 60));
  const elapsedHours = Math.floor(elapsedTotalMinutes / 60);
  const elapsedMinutes = elapsedTotalMinutes % 60;

  const remainingTotalMinutes = Math.floor(remainingMs / (1000 * 60));
  const remainingHours = Math.floor(remainingTotalMinutes / 60);
  const remainingMinutes = remainingTotalMinutes % 60;

  return {
    elapsedMs,
    remainingMs,
    elapsedHours,
    elapsedMinutes,
    remainingHours,
    remainingMinutes,
    progress,
    isComplete,
  };
}

/**
 * Format time as "Xh Ym"
 */
export function formatTime(hours: number, minutes: number): string {
  if (hours === 0 && minutes === 0) return '0m';
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

export function FastingProvider({ children }: { children: React.ReactNode }) {
  const [isFasting, setIsFasting] = useState<boolean>(false);
  const [fastStartTime, setFastStartTime] = useState<number | null>(null);
  const [fastDuration, setFastDuration] = useState<number>(DEFAULT_FAST_DURATION);
  const [lastMealTime, setLastMealTime] = useState<number | null>(null);
  const [lastMealType, setLastMealType] = useState<MealType | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isHydrated, setIsHydrated] = useState<boolean>(false);

  // Prompt state for auto-start/end fasting
  const [pendingPrompt, setPendingPrompt] = useState<FastingPrompt | null>(null);

  // Ref for live timer - doesn't trigger context re-renders
  // Consumers that need live progress (FastingCard) should use their own timer
  const currentTimeRef = useRef<number>(Date.now());

  // Get gamification context for XP awards
  const { awardXP } = useGamification();

  // Get notification context for fasting alerts
  const { scheduleFastingAlert, cancelNotification, settings: notifSettings } = useNotifications();

  // Load saved fasting state on mount (encrypted)
  useEffect(() => {
    async function loadFastingState() {
      try {
        const parsed = await getEncryptedItem(STORAGE_KEY, null) as FastingStoredState | null;
        if (parsed && typeof parsed === 'object') {
          setIsFasting(parsed.isFasting || false);
          setFastStartTime(parsed.fastStartTime || null);
          setFastDuration(parsed.fastDuration || DEFAULT_FAST_DURATION);
          setLastMealTime(parsed.lastMealTime || null);
          setLastMealType(parsed.lastMealType || null);
        }
      } catch (error) {
        if (__DEV__) console.error('Failed to load fasting state:', error);
      } finally {
        setIsLoading(false);
        setIsHydrated(true);
      }
    }
    loadFastingState();
  }, []);

  // Auto-save fasting state when it changes (debounced by 500ms, encrypted)
  useEffect(() => {
    if (!isHydrated) return;

    const timeoutId = setTimeout(() => {
      setEncryptedItem(STORAGE_KEY, {
        isFasting,
        fastStartTime,
        fastDuration,
        lastMealTime,
        lastMealType,
      }).catch((error: unknown) => {
        if (__DEV__) console.error('Failed to save fasting state:', error);
      });
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [isFasting, fastStartTime, fastDuration, lastMealTime, lastMealType, isHydrated]);

  // Re-schedule fasting alert on hydration if a fast is active
  useEffect(() => {
    if (!isHydrated || !isFasting || !fastStartTime) return;
    if (!notifSettings?.fastingAlerts) return;

    const endTime = new Date(fastStartTime + fastDuration * 60 * 60 * 1000);
    if (endTime > new Date()) {
      scheduleFastingAlert(endTime);
    }
  }, [isHydrated]); // Only run once after hydration

  // Keep ref updated for computed values at snapshot time (no re-renders)
  useEffect(() => {
    if (!isFasting) return;
    currentTimeRef.current = Date.now();
    const interval = setInterval(() => {
      currentTimeRef.current = Date.now();
    }, 60000);
    return () => clearInterval(interval);
  }, [isFasting]);

  // Start a new fast
  const startFast = useCallback(async (durationHours: number | null = null) => {
    const duration = durationHours || fastDuration;
    const now = Date.now();
    setFastStartTime(now);
    setIsFasting(true);
    if (durationHours) {
      setFastDuration(durationHours);
    }
    currentTimeRef.current = now;

    // Schedule a notification for when the fast completes
    if (notifSettings?.fastingAlerts) {
      const endTime = new Date(now + duration * 60 * 60 * 1000);
      scheduleFastingAlert(endTime);
    }

    await hapticSuccess();
  }, [fastDuration, scheduleFastingAlert, notifSettings]);

  // End the current fast
  const endFast = useCallback(async (): Promise<FastingProgress> => {
    const progress = calculateFastingProgress(fastStartTime, fastDuration);

    setIsFasting(false);
    setFastStartTime(null);

    // Cancel the fasting completion notification
    cancelNotification('fasting-complete');

    // Award XP if fast was completed (reached goal)
    if (progress.isComplete) {
      awardXP('COMPLETE_FAST');
    }

    // Record to fasting history for analytics (encrypted)
    try {
      const durationHours = Math.round((progress.elapsedHours + progress.elapsedMinutes / 60) * 10) / 10;
      const historyArr = await getEncryptedItem('@vibefit_fasting_history', []) as any[];
      const updatedHistory = Array.isArray(historyArr) ? historyArr : [];
      updatedHistory.unshift({
        date: new Date().toISOString(),
        durationHours,
        targetHours: fastDuration,
        completed: progress.isComplete,
      });
      await setEncryptedItem('@vibefit_fasting_history', updatedHistory.slice(0, 365));
    } catch (e) {}

    return progress; // Return final progress for stats
  }, [fastStartTime, fastDuration, awardXP, cancelNotification]);

  // Update fasting duration
  const updateDuration = useCallback((hours: number) => {
    setFastDuration(hours);
  }, []);

  // Record when a meal is logged (for smart prompts)
  const recordMealLogged = useCallback((mealType: MealType) => {
    const now = Date.now();
    setLastMealTime(now);
    setLastMealType(mealType);

    // Smart prompts based on meal type and current state
    if (isFasting && (mealType === 'breakfast' || mealType === 'lunch')) {
      // User is fasting but logged breakfast/lunch - suggest ending fast
      setPendingPrompt({
        type: 'END_FAST',
        mealType,
        message: 'End your fast?',
        description: `You logged ${mealType}. Would you like to end your fasting timer?`,
      });
    } else if (!isFasting && mealType === 'dinner') {
      // User logged dinner - suggest starting fast
      setPendingPrompt({
        type: 'START_FAST',
        mealType,
        message: 'Start Fasting Timer?',
        description: `You logged dinner. Ready to begin your ${fastDuration}:${24 - fastDuration} fast?`,
      });
    }
  }, [isFasting, fastDuration]);

  // Dismiss prompt
  const dismissPrompt = useCallback(() => {
    setPendingPrompt(null);
  }, []);

  // Accept prompt action
  const acceptPrompt = useCallback(async () => {
    if (!pendingPrompt) return;

    if (pendingPrompt.type === 'START_FAST') {
      await startFast();
    } else if (pendingPrompt.type === 'END_FAST') {
      await endFast();
    }

    setPendingPrompt(null);
  }, [pendingPrompt, startFast, endFast]);

  // Get current fasting state label
  const fastingState = useMemo<string>(() => {
    return isFasting ? 'FASTING' : 'EATING';
  }, [isFasting]);

  // Calculate eating window info (when not fasting)
  const eatingWindowInfo = useMemo<EatingWindowInfo | null>(() => {
    if (isFasting || !lastMealTime) {
      return null;
    }

    const eatingWindowHours = 24 - fastDuration;
    const now = Date.now();
    const timeSinceLastMeal = now - lastMealTime;
    const hoursEating = timeSinceLastMeal / (1000 * 60 * 60);
    const hoursRemaining = Math.max(eatingWindowHours - hoursEating, 0);

    return {
      totalHours: eatingWindowHours,
      hoursUsed: Math.min(hoursEating, eatingWindowHours),
      hoursRemaining,
      progress: Math.min(hoursEating / eatingWindowHours, 1),
    };
  }, [isFasting, lastMealTime, fastDuration]);

  // Snapshot progress (won't live-update — FastingCard handles its own timer)
  const fastingProgress = useMemo<FastingProgress>(() => {
    return calculateFastingProgress(fastStartTime, fastDuration);
  }, [fastStartTime, fastDuration]);

  // Formatted times
  const formattedElapsed = useMemo<string>(() => {
    return formatTime(fastingProgress.elapsedHours, fastingProgress.elapsedMinutes);
  }, [fastingProgress.elapsedHours, fastingProgress.elapsedMinutes]);

  const formattedRemaining = useMemo<string>(() => {
    return formatTime(fastingProgress.remainingHours, fastingProgress.remainingMinutes);
  }, [fastingProgress.remainingHours, fastingProgress.remainingMinutes]);

  const value = useMemo<FastingContextValue>(
    () => ({
      // State
      isFasting,
      fastingState,
      fastStartTime,
      fastDuration,
      lastMealTime,
      lastMealType,
      isLoading,
      // Prompt state
      pendingPrompt,
      // Actions
      startFast,
      endFast,
      updateDuration,
      recordMealLogged,
      acceptPrompt,
      dismissPrompt,
      // Computed
      fastingProgress,
      eatingWindowInfo,
      formattedElapsed,
      formattedRemaining,
      // Constants
      protocols: FASTING_PROTOCOLS,
      states: FASTING_STATES,
    }),
    [
      isFasting,
      fastingState,
      fastStartTime,
      fastDuration,
      lastMealTime,
      lastMealType,
      isLoading,
      pendingPrompt,
      startFast,
      endFast,
      updateDuration,
      recordMealLogged,
      acceptPrompt,
      dismissPrompt,
      fastingProgress,
      eatingWindowInfo,
      formattedElapsed,
      formattedRemaining,
    ]
  );

  return <FastingContext.Provider value={value}>{children}</FastingContext.Provider>;
}

export function useFasting(): FastingContextValue {
  const context = useContext(FastingContext);
  if (!context) {
    throw new Error('useFasting must be used within a FastingProvider');
  }
  return context;
}

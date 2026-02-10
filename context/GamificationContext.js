import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { hapticSuccess } from '../lib/haptics';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

const GamificationContext = createContext(null);
const ToastContext = createContext(null);

const STORAGE_KEY = '@vibefit_gamification';

// XP rewards for actions
export const XP_REWARDS = {
  LOG_FOOD: 10,
  LOG_WATER: 5,
  LOG_EXERCISE: 50,
  COMPLETE_FAST: 30,
  DAILY_LOGIN: 5,
  STREAK_BONUS: 10, // Per day of streak
};

// Level definitions
export const LEVELS = [
  { level: 1, name: 'Beginner', minXP: 0, maxXP: 500 },
  { level: 2, name: 'Starter', minXP: 500, maxXP: 1200 },
  { level: 3, name: 'Vibe Warrior', minXP: 1200, maxXP: 2500 },
  { level: 4, name: 'Health Hero', minXP: 2500, maxXP: 4500 },
  { level: 5, name: 'Fitness Fighter', minXP: 4500, maxXP: 7500 },
  { level: 6, name: 'Wellness Master', minXP: 7500, maxXP: 12000 },
  { level: 7, name: 'Vibe Champion', minXP: 12000, maxXP: 18000 },
  { level: 8, name: 'Elite Performer', minXP: 18000, maxXP: 26000 },
  { level: 9, name: 'Legendary', minXP: 26000, maxXP: 40000 },
  { level: 10, name: 'Vibe God', minXP: 40000, maxXP: Infinity },
];

// Get today's date string (local timezone)
function getTodayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Get yesterday's date string (local timezone)
function getYesterdayString() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Calculate level from XP
function calculateLevel(xp) {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].minXP) {
      return LEVELS[i];
    }
  }
  return LEVELS[0];
}

// Calculate progress to next level
function calculateLevelProgress(xp) {
  const currentLevel = calculateLevel(xp);
  const nextLevelIndex = LEVELS.findIndex(l => l.level === currentLevel.level) + 1;

  if (nextLevelIndex >= LEVELS.length || currentLevel.maxXP === Infinity) {
    return { progress: 1, xpToNext: 0, xpInLevel: 0, levelXpRange: 0 };
  }

  const xpInLevel = xp - currentLevel.minXP;
  const levelXpRange = currentLevel.maxXP - currentLevel.minXP;
  const progress = xpInLevel / levelXpRange;
  const xpToNext = currentLevel.maxXP - xp;

  return { progress, xpToNext, xpInLevel, levelXpRange };
}

export function GamificationProvider({ children }) {
  const { user } = useAuth();
  const [totalXP, setTotalXP] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [lastActiveDate, setLastActiveDate] = useState(null);
  const [activeDates, setActiveDates] = useState([]); // Dates with activity
  const [isLoading, setIsLoading] = useState(true);
  const [isHydrated, setIsHydrated] = useState(false);

  // Streak repair state
  const [brokenStreak, setBrokenStreak] = useState(null); // { previousStreak, brokenDate }
  const [canRepairStreak, setCanRepairStreak] = useState(false);

  // Toast state
  const [toastQueue, setToastQueue] = useState([]);
  const toastIdRef = useRef(0);

  // Calculate streak from Supabase food_logs
  const calculateStreakFromSupabase = useCallback(async () => {
    if (!user) return { streak: 0, activeDates: [], brokenStreak: null };

    try {
      // Get distinct dates with food logs (excluding water-only entries)
      const { data: logs, error } = await supabase
        .from('food_logs')
        .select('date')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(90);

      if (error) {
        if (__DEV__) console.error('Error fetching logs for streak:', error.code, error.message, error.details);
        return { streak: 0, activeDates: [], brokenStreak: null };
      }

      // Get unique dates
      const uniqueDates = [...new Set(logs.map(l => l.date))].sort().reverse();

      if (uniqueDates.length === 0) {
        return { streak: 0, activeDates: [], brokenStreak: null };
      }

      const today = getTodayString();
      const yesterday = getYesterdayString();

      // Calculate current streak
      let streak = 0;
      let currentDate = today;
      let foundToday = uniqueDates.includes(today);
      let foundYesterday = uniqueDates.includes(yesterday);

      // Start counting from today or yesterday
      if (foundToday) {
        currentDate = today;
      } else if (foundYesterday) {
        currentDate = yesterday;
      } else {
        // Streak is broken - check if we can repair
        const lastActiveDate = uniqueDates[0];
        const daysSinceLast = Math.floor(
          (new Date(today) - new Date(lastActiveDate)) / (1000 * 60 * 60 * 24)
        );

        if (daysSinceLast <= 2) {
          // Can repair if missed only yesterday
          // Calculate what the streak was before it broke
          let previousStreak = 0;
          let checkDate = lastActiveDate;
          for (const date of uniqueDates) {
            if (date === checkDate) {
              previousStreak++;
              const prevDate = new Date(checkDate);
              prevDate.setDate(prevDate.getDate() - 1);
              checkDate = prevDate.toISOString().split('T')[0];
            } else {
              break;
            }
          }

          return {
            streak: 0,
            activeDates: uniqueDates.slice(0, 90),
            brokenStreak: {
              previousStreak,
              brokenDate: yesterday,
              lastActiveDate,
            },
          };
        }

        return { streak: 0, activeDates: uniqueDates.slice(0, 90), brokenStreak: null };
      }

      // Count consecutive days
      for (const date of uniqueDates) {
        if (date === currentDate) {
          streak++;
          const prevDate = new Date(currentDate);
          prevDate.setDate(prevDate.getDate() - 1);
          currentDate = prevDate.toISOString().split('T')[0];
        } else if (date < currentDate) {
          break; // Gap found, streak ends
        }
      }

      return {
        streak,
        activeDates: uniqueDates.slice(0, 90),
        brokenStreak: null,
      };
    } catch (error) {
      if (__DEV__) console.error('Error calculating streak:', error.message);
      return { streak: 0, activeDates: [], brokenStreak: null };
    }
  }, [user]);

  // Load saved state and calculate streak from Supabase
  useEffect(() => {
    async function loadState() {
      try {
        // Load local XP data
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          setTotalXP(parsed.totalXP || 0);
        }

        // Calculate streak from Supabase
        if (user) {
          const { streak, activeDates: dates, brokenStreak: broken } = await calculateStreakFromSupabase();
          setCurrentStreak(streak);
          setActiveDates(dates);
          setLastActiveDate(dates[0] || null);

          if (broken) {
            setBrokenStreak(broken);
            setCanRepairStreak(true);
          } else {
            setBrokenStreak(null);
            setCanRepairStreak(false);
          }
        }
      } catch (error) {
        if (__DEV__) console.error('Failed to load gamification state:', error.message);
      } finally {
        setIsLoading(false);
        setIsHydrated(true);
      }
    }
    loadState();
  }, [user, calculateStreakFromSupabase]);

  // Refresh streak when user changes or periodically
  useEffect(() => {
    if (!user || !isHydrated) return;

    const refreshStreak = async () => {
      const { streak, activeDates: dates, brokenStreak: broken } = await calculateStreakFromSupabase();
      setCurrentStreak(streak);
      setActiveDates(dates);
      setLastActiveDate(dates[0] || null);

      if (broken) {
        setBrokenStreak(broken);
        setCanRepairStreak(true);
      } else {
        setBrokenStreak(null);
        setCanRepairStreak(false);
      }
    };

    // Refresh every 5 minutes when app is active
    const interval = setInterval(refreshStreak, 300000);
    return () => clearInterval(interval);
  }, [user, isHydrated, calculateStreakFromSupabase]);

  // Auto-save state when it changes (debounced by 1 second)
  useEffect(() => {
    if (!isHydrated) return;

    const timeoutId = setTimeout(() => {
      async function saveState() {
        try {
          await AsyncStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
              totalXP,
              currentStreak,
              lastActiveDate,
              activeDates,
            })
          );
        } catch (error) {
          if (__DEV__) console.error('Failed to save gamification state:', error.message);
        }
      }
      saveState();
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [totalXP, currentStreak, lastActiveDate, activeDates, isHydrated]);

  // Show toast notification
  const showToast = useCallback((message, xp) => {
    const id = ++toastIdRef.current;
    setToastQueue(prev => [...prev, { id, message, xp }]);

    // Auto-remove after 2 seconds
    setTimeout(() => {
      setToastQueue(prev => prev.filter(t => t.id !== id));
    }, 2000);
  }, []);

  // Remove toast
  const dismissToast = useCallback((id) => {
    setToastQueue(prev => prev.filter(t => t.id !== id));
  }, []);

  // Record activity and update streak
  const recordActivity = useCallback(() => {
    const today = getTodayString();
    const yesterday = getYesterdayString();

    setActiveDates(prev => {
      if (prev.includes(today)) return prev;
      // Keep last 90 days
      const updated = [...prev, today].slice(-90);
      return updated;
    });

    // Update streak
    if (lastActiveDate === yesterday) {
      // Continuing streak
      setCurrentStreak(prev => prev + 1);
    } else if (lastActiveDate !== today) {
      // Starting new streak
      setCurrentStreak(1);
    }

    setLastActiveDate(today);
  }, [lastActiveDate]);

  // Award XP for an action
  const awardXP = useCallback(async (action, customMessage = null) => {
    const xpAmount = XP_REWARDS[action] || 0;
    if (xpAmount === 0) return;

    // Record activity for streak
    recordActivity();

    // Add XP
    setTotalXP(prev => prev + xpAmount);

    // Show toast
    const messages = {
      LOG_FOOD: 'Food logged!',
      LOG_WATER: 'Stay hydrated!',
      LOG_EXERCISE: 'Great workout!',
      COMPLETE_FAST: 'Fast complete!',
      DAILY_LOGIN: 'Welcome back!',
    };
    showToast(customMessage || messages[action] || 'Action complete!', xpAmount);

    // Haptic feedback
    await hapticSuccess();

    return xpAmount;
  }, [recordActivity, showToast]);

  // Check if there's activity today (for streak display)
  const hasActivityToday = useMemo(() => {
    const today = getTodayString();
    return activeDates.includes(today);
  }, [activeDates]);

  // Repair broken streak by logging food for the missed day
  const repairStreak = useCallback(async () => {
    if (!canRepairStreak || !brokenStreak || !user) return false;

    try {
      // Insert a placeholder food log for the broken date to repair the streak
      const { error } = await supabase
        .from('food_logs')
        .insert({
          user_id: user.id,
          date: brokenStreak.brokenDate,
          name: 'Streak Repair',
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
        })
        .select();

      if (error) {
        if (__DEV__) console.error('Error repairing streak:', error);
        return false;
      }

      // Recalculate streak
      const { streak, activeDates: dates } = await calculateStreakFromSupabase();
      setCurrentStreak(streak);
      setActiveDates(dates);
      setBrokenStreak(null);
      setCanRepairStreak(false);

      // Award XP for repairing streak
      showToast('Streak Repaired!', 50);
      setTotalXP(prev => prev + 50);

      await hapticSuccess();
      return true;
    } catch (error) {
      if (__DEV__) console.error('Failed to repair streak:', error);
      return false;
    }
  }, [canRepairStreak, brokenStreak, user, calculateStreakFromSupabase, showToast]);

  // Current level info
  const levelInfo = useMemo(() => {
    const level = calculateLevel(totalXP);
    const progress = calculateLevelProgress(totalXP);
    return {
      ...level,
      ...progress,
    };
  }, [totalXP]);

  const value = useMemo(
    () => ({
      // State
      totalXP,
      currentStreak,
      isLoading,
      hasActivityToday,
      activeDates,
      // Streak repair
      brokenStreak,
      canRepairStreak,
      repairStreak,
      // Level info
      levelInfo,
      levels: LEVELS,
      // Actions
      awardXP,
      recordActivity,
      // Toast actions (no toastQueue — use useToastQueue() separately)
      showToast,
      dismissToast,
      // Constants
      xpRewards: XP_REWARDS,
    }),
    [
      totalXP,
      currentStreak,
      isLoading,
      hasActivityToday,
      activeDates,
      brokenStreak,
      canRepairStreak,
      repairStreak,
      levelInfo,
      awardXP,
      recordActivity,
      showToast,
      dismissToast,
    ]
  );

  const toastValue = useMemo(() => ({
    toastQueue,
    dismissToast,
  }), [toastQueue, dismissToast]);

  return (
    <GamificationContext.Provider value={value}>
      <ToastContext.Provider value={toastValue}>
        {children}
      </ToastContext.Provider>
    </GamificationContext.Provider>
  );
}

export function useGamification() {
  const context = useContext(GamificationContext);
  if (!context) {
    throw new Error('useGamification must be used within a GamificationProvider');
  }
  return context;
}

export function useToastQueue() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToastQueue must be used within a GamificationProvider');
  }
  return context;
}

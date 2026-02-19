import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMeals } from '../context/MealContext';
import { useProfile } from '../context/ProfileContext';
import { useGamification } from '../context/GamificationContext';
import { useMood } from '../context/MoodContext';
import { useIsPremium } from '../context/SubscriptionContext';
import { generateWeeklyDigest } from '../services/ai';

const STORAGE_KEY = '@vibefit_weekly_digest';

/**
 * Get the ISO week number for a given date.
 */
function getISOWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  return (
    1 +
    Math.round(
      ((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7
    )
  );
}

/**
 * Check if a timestamp falls in the current ISO week.
 */
function isCurrentWeek(timestamp) {
  if (!timestamp) return false;
  const now = new Date();
  const then = new Date(timestamp);
  return (
    getISOWeek(now) === getISOWeek(then) &&
    now.getFullYear() === then.getFullYear()
  );
}

/**
 * Returns true if right now is past Monday 8:00 AM local time.
 */
function isPastMondayMorning() {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 1=Mon
  if (day === 0) return false; // Sunday - not yet
  if (day === 1) return now.getHours() >= 8; // Monday, check hour
  return true; // Tue-Sat
}

// ============================================================================
// Loss Aversion Framing (#17)
// ============================================================================

/**
 * Generate loss-framed messaging when the user is slipping.
 * Returns null when the user is doing well (>80% adherence) to avoid
 * unnecessary negativity.
 *
 * @param weekData - The aggregated week data from buildWeekData()
 * @returns Loss-framed headline and subtext, or null if not applicable
 */
function getLossAversionFrame(weekData) {
  if (!weekData) return null;

  const { daysLogged, totalDays, avgProtein, proteinGoal } = weekData;

  // Calculate adherence percentage
  const adherencePercent = totalDays > 0 ? (daysLogged / totalDays) * 100 : 0;

  // Calculate how many days protein target was approximately hit
  // Using avgProtein vs proteinGoal as a proxy
  const proteinHitRatio = proteinGoal > 0 ? avgProtein / proteinGoal : 0;
  const proteinHitDays = Math.round(proteinHitRatio * totalDays);

  // Only show loss framing when user is slipping
  if (adherencePercent > 80) return null;

  if (adherencePercent < 50) {
    return {
      headline: 'Your progress is at risk',
      subtext: `You only logged ${Math.round(adherencePercent)}% of days this week. Users who log < 50% are 3x more likely to abandon their goals.`,
    };
  }

  if (proteinHitDays < 3) {
    return {
      headline: 'Protein gap detected',
      subtext: `You hit your protein target only ${proteinHitDays}/7 days. This could mean losing muscle instead of fat.`,
    };
  }

  return {
    headline: 'Room to improve',
    subtext: `${Math.round(adherencePercent)}% adherence is good, but 80%+ is where real results happen.`,
  };
}

export function useWeeklyDigest() {
  const { isPremium } = useIsPremium();
  const [digest, setDigest] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastGenerated, setLastGenerated] = useState(null);
  const hasChecked = useRef(false);

  const { totals, goals, meals } = useMeals();
  const { profile, weightStats } = useProfile();
  const { currentStreak } = useGamification();
  const { todaysAverage, weeklyTrend } = useMood();

  // Load cached digest on mount
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const cached = JSON.parse(raw);
          if (cached && cached.generatedAt) {
            setDigest(cached);
            setLastGenerated(cached.generatedAt);
          }
        }
      } catch {
        // Ignore storage read errors
      }
    })();
  }, []);

  // Aggregate current data into weekData shape
  const buildWeekData = useCallback(() => {
    // Gather top food names from today's meals as a proxy
    const allFoods = [];
    if (meals) {
      ['breakfast', 'lunch', 'dinner', 'snacks'].forEach((type) => {
        (meals[type] || []).forEach((item) => {
          if (item.name) allFoods.push(item.name);
        });
      });
    }
    // Deduplicate and take top 5
    const topFoods = [...new Set(allFoods)].slice(0, 5);

    return {
      avgCalories: totals?.calories || 0,
      calorieGoal: goals?.calories || 2000,
      avgProtein: totals?.protein || 0,
      proteinGoal: goals?.protein || 150,
      daysLogged: totals?.calories > 0 ? 1 : 0, // proxy: did they log today
      totalDays: 7,
      weightStart: weightStats?.startWeight || profile?.weight || 0,
      weightCurrent: weightStats?.currentWeight || profile?.weight || 0,
      currentStreak: currentStreak || 0,
      bestStreak: currentStreak || 0, // best not separately tracked; use current
      avgEnergy: todaysAverage?.energy || weeklyTrend?.avgEnergy || 0,
      topFoods,
    };
  }, [totals, goals, meals, profile, weightStats, currentStreak, todaysAverage, weeklyTrend]);

  // Compute loss aversion frame from current week data (#17)
  const lossAversionFrame = useMemo(() => {
    const weekData = buildWeekData();
    return getLossAversionFrame(weekData);
  }, [buildWeekData]);

  // Generate a new digest (premium only)
  const generateDigest = useCallback(async () => {
    if (!isPremium) return;
    if (isGenerating) return;
    setIsGenerating(true);
    try {
      const weekData = buildWeekData();
      const result = await generateWeeklyDigest(weekData);

      // Attach loss aversion frame to the digest result (#17)
      const lossFrame = getLossAversionFrame(weekData);
      const enrichedResult = {
        ...result,
        lossAversionFrame: lossFrame,
      };

      setDigest(enrichedResult);
      setLastGenerated(enrichedResult.generatedAt);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(enrichedResult));
    } catch (error) {
      if (__DEV__) {
        console.error('[WeeklyDigest] Generation failed:', error.message);
      }
    } finally {
      setIsGenerating(false);
    }
  }, [buildWeekData, isGenerating]);

  // Auto-generate if stale (premium only)
  useEffect(() => {
    if (!isPremium) return;
    if (hasChecked.current) return;
    hasChecked.current = true;

    const isStale = !digest || !isCurrentWeek(digest.generatedAt);
    if (isStale && isPastMondayMorning()) {
      generateDigest();
    }
  }, [digest, generateDigest]);

  return { digest, isGenerating, generateDigest, lastGenerated, lossAversionFrame };
}

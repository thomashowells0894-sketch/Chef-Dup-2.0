import { useState, useEffect, useCallback, useRef } from 'react';
import { useMeals, useWaterProgress } from '../context/MealContext';
import { useGamification } from '../context/GamificationContext';
import { useFasting } from '../context/FastingContext';
import { getSmartNudge } from '../lib/smartNudges';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ProactiveMessage {
  id: string;
  message: string;
  /** Route or action key the FAB should trigger on tap */
  action?: 'chat' | 'quicklog' | 'logFood' | 'logWater' | 'viewInsights' | 'viewStats';
  priority: 'low' | 'medium' | 'high' | 'critical';
  /** Short label for the FAB badge preview bubble */
  preview?: string;
}

export interface ProactiveCoachOptions {
  friendStreakLoss?: { name: string; previousStreak: number } | null;
  healthData?: {
    steps: number;
    activeCalories: number;
    sleepMinutes: number;
    recoveryScore: number | null;
    anomalies: Array<{ type: string; title: string; message: string }>;
  } | null;
}

const PROACTIVE_KEY = '@fueliq_proactive_dismissed';
const EVAL_INTERVAL_MS = 60_000; // Re-evaluate every 60s, not every render

/**
 * useProactiveCoach - Central proactive intelligence hub.
 *
 * Aggregates signals from nutrition, hydration, fasting, gamification, and
 * the smartNudges engine to surface the single highest-priority message via
 * the AI FAB — on EVERY screen, not just the home screen.
 *
 * Evaluates on a 60-second interval to avoid unnecessary re-renders while
 * still catching time-window transitions (e.g. crossing from morning to afternoon).
 */
export function useProactiveCoach(options?: ProactiveCoachOptions) {
  const { friendStreakLoss, healthData } = options ?? {};
  const { totals, goals, remaining, mealCalories, exerciseMinutes, caloriesBurned } = useMeals() as any;
  const { waterProgress } = useWaterProgress();
  const { currentStreak, brokenStreak, canRepairStreak, streakRepairCost } = useGamification();
  const { isFasting, fastingProgress } = useFasting();
  const [message, setMessage] = useState<ProactiveMessage | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load today's dismissed message IDs from storage
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(PROACTIVE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          const today = new Date().toISOString().split('T')[0];
          if (parsed.date === today) {
            setDismissed(new Set(parsed.ids || []));
          }
        }
      } catch {
        // Ignore storage errors
      }
    })();
  }, []);

  const evaluate = useCallback(() => {
    if (!totals || !goals) return;

    const hour = new Date().getHours();
    const messages: ProactiveMessage[] = [];

    // ── CRITICAL: Broken streak repair ─────────────────────────────
    // This is the highest-value monetization and retention moment.
    // Surface it aggressively.
    if (canRepairStreak && brokenStreak) {
      const prev = (brokenStreak as { previousStreak: number }).previousStreak;
      messages.push({
        id: 'streak_repair',
        message: prev >= 14
          ? `${prev} days of progress at risk. Repair now for ${streakRepairCost} XP before it's gone.`
          : `Your ${prev}-day streak broke. Repair it for ${streakRepairCost} XP — don't start over.`,
        action: 'viewStats',
        priority: 'critical',
        preview: `Streak broke — fix it`,
      });
    }

    // ── FRIEND STREAK LOSS — social comparison ──────────────────
    if (friendStreakLoss) {
      messages.push({
        id: 'friend_streak_loss',
        message: `${friendStreakLoss.name} just lost their ${friendStreakLoss.previousStreak}-day streak. Stay consistent — don't let the same happen to you.`,
        action: 'viewStats',
        priority: 'medium',
        preview: `${friendStreakLoss.name} lost streak`,
      });
    }

    // ── FASTING-AWARE NUDGES ───────────────────────────────────────
    if (isFasting && fastingProgress) {
      const remainingHours = fastingProgress.remainingHours ?? 0;
      const elapsedHours = fastingProgress.elapsedHours ?? 0;

      if (fastingProgress.isComplete) {
        messages.push({
          id: 'fast_complete',
          message: `Fast complete! You held for ${Math.round(elapsedHours)}h. Break it with a high-protein meal to maximize muscle protein synthesis.`,
          action: 'logFood',
          priority: 'high',
          preview: `Fast done — eat now`,
        });
      } else if (remainingHours <= 2 && remainingHours > 0) {
        messages.push({
          id: 'fast_almost',
          message: `${Math.round(remainingHours * 60)}min left on your fast. You're in peak fat oxidation. Hold the line.`,
          priority: 'medium',
          preview: `${Math.round(remainingHours * 60)}min left`,
        });
      } else if (hour >= 6 && hour < 12 && elapsedHours >= 2) {
        messages.push({
          id: 'fast_morning',
          message: `${Math.round(elapsedHours)}h into your fast. Your body is in fat-burning mode. Don't break early.`,
          priority: 'low',
        });
      }
    }

    // ── HYDRATION ──────────────────────────────────────────────────
    if (waterProgress) {
      const waterPct = waterProgress.percentage ?? 0;
      if (hour >= 14 && hour < 20 && waterPct < 40) {
        messages.push({
          id: 'water_low',
          message: `Only ${Math.round(waterPct)}% hydrated. Dehydration tanks metabolism and focus. Drink a full glass now.`,
          action: 'logWater',
          priority: 'high',
          preview: `${Math.round(waterPct)}% hydrated`,
        });
      } else if (hour >= 11 && hour < 14 && waterPct < 25) {
        messages.push({
          id: 'water_critical',
          message: `Almost noon and you've barely hydrated. ${waterProgress.remaining}ml to go. Your body needs this.`,
          action: 'logWater',
          priority: 'high',
          preview: `Drink water now`,
        });
      }
    }

    // ── SMART NUDGE ENGINE ─────────────────────────────────────────
    // Bridge the full smartNudges system into the proactive FAB.
    const nudge = getSmartNudge({
      todayCalories: totals.calories ?? 0,
      calorieGoal: goals.calories ?? 2000,
      todayProtein: totals.protein ?? 0,
      proteinGoal: goals.protein ?? 150,
      isFasting: !!isFasting,
      currentStreak: currentStreak ?? 0,
      waterPercentage: waterProgress?.percentage ?? 0,
    });

    if (nudge) {
      // Map smartNudge type to priority
      const nudgePriority: ProactiveMessage['priority'] =
        nudge.type === 'warning' ? 'high'
        : nudge.type === 'action' ? 'high'
        : nudge.type === 'celebration' ? 'low'
        : 'medium';

      // Map smartNudge action to FAB action
      const nudgeAction: ProactiveMessage['action'] =
        nudge.action === 'logFood' ? 'logFood'
        : nudge.action === 'logWater' ? 'logWater'
        : nudge.action === 'viewInsights' ? 'viewInsights'
        : nudge.action ? 'chat'
        : undefined;

      messages.push({
        id: `nudge_${nudge.title.slice(0, 20).replace(/\s/g, '_')}`,
        message: `${nudge.title}. ${nudge.body}`,
        action: nudgeAction,
        priority: nudgePriority,
        preview: nudge.title,
      });
    }

    // ── WORKOUT + POST-WORKOUT NUTRITION ─────────────────────────────
    const todayExerciseMin = exerciseMinutes ?? 0;
    const todayCalBurned = caloriesBurned ?? 0;

    if (todayCalBurned > 0 && totals.calories > 0) {
      // Post-workout nutrition window: if exercise logged, suggest protein
      const proteinPct = goals.protein > 0 ? (totals.protein / goals.protein) * 100 : 100;
      if (proteinPct < 70) {
        const proteinNeeded = Math.round(Math.max(0, goals.protein - totals.protein));
        messages.push({
          id: 'post_workout_protein',
          message: `You burned ${todayCalBurned} cal. Eat within 60 min — a 30g protein meal maximizes recovery. You still need ${proteinNeeded}g today.`,
          action: 'logFood',
          priority: 'high',
          preview: 'Post-workout fuel',
        });
      }
    } else if (hour >= 9 && hour < 20 && totals.calories > 0 && todayExerciseMin === 0) {
      // No exercise logged yet
      messages.push({
        id: 'workout_reminder',
        message: hour < 14
          ? "You've logged food but no movement. Even 20 minutes changes your TDEE calculation."
          : 'No exercise logged today. A short workout now improves sleep quality tonight.',
        action: 'chat',
        priority: 'low',
        preview: 'Log a workout',
      });
    }

    // ── HEALTH DATA NUDGES (Apple Health / Google Fit) ─────────────
    // Low step count — afternoon nudge
    if (healthData && hour >= 14 && hour < 20 && healthData.steps < 3000 && healthData.steps > 0) {
      messages.push({
        id: 'steps_low',
        message: `Only ${healthData.steps.toLocaleString()} steps today. A 15-minute walk adds ~2,000 steps and burns ~100 cal. Move now.`,
        action: 'chat',
        priority: 'medium',
        preview: `${healthData.steps.toLocaleString()} steps`,
      });
    }

    // Poor sleep recovery — morning nudge
    if (healthData && hour >= 6 && hour < 12 && healthData.sleepMinutes > 0 && healthData.sleepMinutes < 300) {
      const sleepHours = Math.round(healthData.sleepMinutes / 60 * 10) / 10;
      messages.push({
        id: 'sleep_low',
        message: `${sleepHours}h sleep last night. Your recovery is compromised — reduce workout intensity today and prioritize protein.`,
        action: 'chat',
        priority: 'high',
        preview: `${sleepHours}h sleep`,
      });
    }

    // Low recovery score
    if (healthData?.recoveryScore !== null && healthData?.recoveryScore !== undefined && healthData.recoveryScore < 40) {
      messages.push({
        id: 'recovery_low',
        message: `Recovery score: ${healthData.recoveryScore}%. Your body needs rest. Light activity only — skip heavy lifting today.`,
        action: 'chat',
        priority: 'high',
        preview: `${healthData.recoveryScore}% recovered`,
      });
    }

    // Health anomaly surfacing (critical/warning from useHealthSync)
    if (healthData?.anomalies?.length > 0) {
      const topAnomaly = healthData.anomalies[0]; // Already sorted by severity
      messages.push({
        id: `anomaly_${topAnomaly.type}`,
        message: topAnomaly.message,
        action: 'chat',
        priority: topAnomaly.type === 'critical' ? 'critical' : 'high',
        preview: topAnomaly.title,
      });
    }

    // Step goal celebration (>= 10,000 steps)
    if (healthData && healthData.steps >= 10000) {
      messages.push({
        id: 'steps_goal',
        message: `${healthData.steps.toLocaleString()} steps — you hit the gold standard. This level of NEAT burns 300-500 extra calories daily.`,
        priority: 'low',
        preview: '10K steps',
      });
    }

    // ── EVENING WRAP-UP ────────────────────────────────────────────
    if (hour >= 20 && hour < 23 && totals.calories > 0) {
      const calPct = goals.calories > 0 ? (totals.calories / goals.calories) * 100 : 0;
      const protPct = goals.protein > 0 ? (totals.protein / goals.protein) * 100 : 0;

      if (calPct >= 90 && calPct <= 110 && protPct >= 80) {
        messages.push({
          id: 'day_nailed',
          message: `Today was a win. ${Math.round(calPct)}% calories, ${Math.round(protPct)}% protein. Consistency like this compounds.`,
          priority: 'low',
          preview: 'Great day',
        });
      } else if (calPct < 70) {
        messages.push({
          id: 'day_undereat',
          message: `Only ${Math.round(calPct)}% of your calories logged. Under-eating slows metabolism. Late snack or shake?`,
          action: 'logFood',
          priority: 'medium',
          preview: `${Math.round(calPct)}% logged`,
        });
      }
    }

    // ── STREAK MILESTONES ──────────────────────────────────────────
    if (currentStreak === 3) {
      messages.push({
        id: 'streak_3',
        message: '3 days in a row. Most people quit by now. You didn\'t. Keep going.',
        priority: 'low',
        preview: '3-day streak',
      });
    } else if (currentStreak === 7) {
      messages.push({
        id: 'streak_7',
        message: '7-day streak. 92% of users quit before this. You\'re building a habit.',
        priority: 'low',
        preview: '1-week streak',
      });
    } else if (currentStreak === 14) {
      messages.push({
        id: 'streak_14',
        message: '14 days. This is no longer motivation — it\'s discipline. Hellfire mode.',
        priority: 'low',
        preview: '2-week streak',
      });
    } else if (currentStreak === 30) {
      messages.push({
        id: 'streak_30',
        message: '30 days. Top 1% consistency. You\'ve rewired your behavior. Elite.',
        priority: 'low',
        preview: '30-day streak',
      });
    } else if (currentStreak > 0 && currentStreak % 50 === 0) {
      messages.push({
        id: `streak_${currentStreak}`,
        message: `${currentStreak}-day streak. Legendary. This level of consistency changes lives.`,
        priority: 'low',
        preview: `${currentStreak}-day streak`,
      });
    }

    // ── PRIORITY RESOLUTION ────────────────────────────────────────
    // Filter dismissed, sort by priority, pick the winner.
    const undismissed = messages.filter(m => !dismissed.has(m.id));
    if (undismissed.length > 0) {
      const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
      undismissed.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
      setMessage(undismissed[0]);
    } else {
      setMessage(null);
    }
  }, [totals, goals, remaining, mealCalories, exerciseMinutes, caloriesBurned, currentStreak, dismissed, isFasting, fastingProgress, waterProgress, canRepairStreak, brokenStreak, streakRepairCost, friendStreakLoss, healthData]);

  // Evaluate immediately on data change + on a 60s interval for time-window transitions
  useEffect(() => {
    evaluate();

    intervalRef.current = setInterval(evaluate, EVAL_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [evaluate]);

  const dismiss = useCallback(async (id: string) => {
    const newDismissed = new Set(dismissed);
    newDismissed.add(id);
    setDismissed(newDismissed);
    setMessage(null);
    try {
      await AsyncStorage.setItem(PROACTIVE_KEY, JSON.stringify({
        date: new Date().toISOString().split('T')[0],
        ids: Array.from(newDismissed),
      }));
    } catch {
      // Ignore storage errors
    }
  }, [dismissed]);

  return { message, dismiss };
}

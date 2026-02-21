import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AchievementDefinition, AchievementContext, Achievement, UnlockedAchievement } from '../types';

const STORAGE_KEY = '@fueliq_achievements';

// Achievement definitions
const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  // Streak Achievements
  {
    id: 'first_streak_3',
    title: 'Hot Start',
    description: '3-day logging streak',
    emoji: '\uD83D\uDD25',
    category: 'streaks',
    check: (ctx: AchievementContext) => (ctx.streak || 0) >= 3,
    getProgress: (ctx: AchievementContext) => ({ current: Math.min(ctx.streak || 0, 3), target: 3 }),
  },
  {
    id: 'streak_7',
    title: 'Week Warrior',
    description: '7-day streak',
    emoji: '\uD83D\uDCC6',
    category: 'streaks',
    check: (ctx: AchievementContext) => (ctx.streak || 0) >= 7,
    getProgress: (ctx: AchievementContext) => ({ current: Math.min(ctx.streak || 0, 7), target: 7 }),
  },
  {
    id: 'streak_30',
    title: 'Monthly Master',
    description: '30-day streak',
    emoji: '\uD83D\uDC51',
    category: 'streaks',
    check: (ctx: AchievementContext) => (ctx.streak || 0) >= 30,
    getProgress: (ctx: AchievementContext) => ({ current: Math.min(ctx.streak || 0, 30), target: 30 }),
  },
  {
    id: 'streak_100',
    title: 'Centurion',
    description: '100-day streak',
    emoji: '\uD83D\uDCAF',
    category: 'streaks',
    check: (ctx: AchievementContext) => (ctx.streak || 0) >= 100,
    getProgress: (ctx: AchievementContext) => ({ current: Math.min(ctx.streak || 0, 100), target: 100 }),
  },

  // Logging Achievements
  {
    id: 'first_food',
    title: 'First Bite',
    description: 'Log your first food',
    emoji: '\uD83C\uDF4E',
    category: 'logging',
    check: (ctx: AchievementContext) => (ctx.totalFoodsLogged || 0) >= 1,
    getProgress: (ctx: AchievementContext) => ({ current: Math.min(ctx.totalFoodsLogged || 0, 1), target: 1 }),
  },
  {
    id: 'foods_100',
    title: 'Foodie',
    description: 'Log 100 foods',
    emoji: '\uD83D\uDCDD',
    category: 'logging',
    check: (ctx: AchievementContext) => (ctx.totalFoodsLogged || 0) >= 100,
    getProgress: (ctx: AchievementContext) => ({ current: Math.min(ctx.totalFoodsLogged || 0, 100), target: 100 }),
  },
  {
    id: 'foods_500',
    title: 'Nutrition Nerd',
    description: 'Log 500 foods',
    emoji: '\uD83E\uDDE0',
    category: 'logging',
    check: (ctx: AchievementContext) => (ctx.totalFoodsLogged || 0) >= 500,
    getProgress: (ctx: AchievementContext) => ({ current: Math.min(ctx.totalFoodsLogged || 0, 500), target: 500 }),
  },
  {
    id: 'all_meals_logged',
    title: 'Full Day',
    description: 'Log breakfast, lunch, and dinner in one day',
    emoji: '\u2705',
    category: 'logging',
    check: (ctx: AchievementContext) => !!ctx.allMealsLoggedInDay,
    getProgress: (ctx: AchievementContext) => ({ current: ctx.allMealsLoggedInDay ? 1 : 0, target: 1 }),
  },

  // Fitness Achievements
  {
    id: 'first_workout',
    title: "Let's Go",
    description: 'Complete first workout',
    emoji: '\uD83D\uDCAA',
    category: 'fitness',
    check: (ctx: AchievementContext) => (ctx.totalWorkouts || 0) >= 1,
    getProgress: (ctx: AchievementContext) => ({ current: Math.min(ctx.totalWorkouts || 0, 1), target: 1 }),
  },
  {
    id: 'workouts_10',
    title: 'Gym Rat',
    description: 'Complete 10 workouts',
    emoji: '\uD83C\uDFCB\uFE0F',
    category: 'fitness',
    check: (ctx: AchievementContext) => (ctx.totalWorkouts || 0) >= 10,
    getProgress: (ctx: AchievementContext) => ({ current: Math.min(ctx.totalWorkouts || 0, 10), target: 10 }),
  },
  {
    id: 'first_pr',
    title: 'Record Breaker',
    description: 'Set a personal record',
    emoji: '\uD83C\uDFC6',
    category: 'fitness',
    check: (ctx: AchievementContext) => !!ctx.hasSetPR,
    getProgress: (ctx: AchievementContext) => ({ current: ctx.hasSetPR ? 1 : 0, target: 1 }),
  },
  {
    id: 'first_fast',
    title: 'Fasting Rookie',
    description: 'Complete first fast',
    emoji: '\u23F1\uFE0F',
    category: 'fitness',
    check: (ctx: AchievementContext) => !!ctx.hasCompletedFast,
    getProgress: (ctx: AchievementContext) => ({ current: ctx.hasCompletedFast ? 1 : 0, target: 1 }),
  },

  // Health Achievements
  {
    id: 'water_goal_hit',
    title: 'Hydrated',
    description: 'Hit water goal for first time',
    emoji: '\uD83D\uDCA7',
    category: 'health',
    check: (ctx: AchievementContext) => !!ctx.hasHitWaterGoal,
    getProgress: (ctx: AchievementContext) => ({ current: ctx.hasHitWaterGoal ? 1 : 0, target: 1 }),
  },
  {
    id: 'water_7_days',
    title: 'Water Streak',
    description: 'Hit water goal 7 days in a row',
    emoji: '\uD83C\uDF0A',
    category: 'health',
    check: (ctx: AchievementContext) => (ctx.waterGoalStreak || 0) >= 7,
    getProgress: (ctx: AchievementContext) => ({ current: Math.min(ctx.waterGoalStreak || 0, 7), target: 7 }),
  },
  {
    id: 'protein_goal_hit',
    title: 'Protein Power',
    description: 'Hit protein goal',
    emoji: '\uD83D\uDCAA',
    category: 'health',
    check: (ctx: AchievementContext) => !!ctx.hasHitProteinGoal,
    getProgress: (ctx: AchievementContext) => ({ current: ctx.hasHitProteinGoal ? 1 : 0, target: 1 }),
  },
  {
    id: 'calorie_target_3',
    title: 'On Target',
    description: 'Stay within calorie target 3 days in a row',
    emoji: '\uD83C\uDFAF',
    category: 'health',
    check: (ctx: AchievementContext) => (ctx.calorieTargetStreak || 0) >= 3,
    getProgress: (ctx: AchievementContext) => ({ current: Math.min(ctx.calorieTargetStreak || 0, 3), target: 3 }),
  },

  // AI Achievements
  {
    id: 'first_scan',
    title: 'AI Eyes',
    description: 'Scan first food with AI',
    emoji: '\uD83D\uDCF8',
    category: 'ai',
    check: (ctx: AchievementContext) => !!ctx.hasScannedFood,
    getProgress: (ctx: AchievementContext) => ({ current: ctx.hasScannedFood ? 1 : 0, target: 1 }),
  },
  {
    id: 'first_chat',
    title: 'AI Friend',
    description: 'Chat with AI nutritionist',
    emoji: '\uD83E\uDD16',
    category: 'ai',
    check: (ctx: AchievementContext) => !!ctx.hasChatted,
    getProgress: (ctx: AchievementContext) => ({ current: ctx.hasChatted ? 1 : 0, target: 1 }),
  },
  {
    id: 'first_meal_plan',
    title: 'Plan Ahead',
    description: 'Generate first meal plan',
    emoji: '\uD83D\uDCCB',
    category: 'ai',
    check: (ctx: AchievementContext) => !!ctx.hasGeneratedMealPlan,
    getProgress: (ctx: AchievementContext) => ({ current: ctx.hasGeneratedMealPlan ? 1 : 0, target: 1 }),
  },
  {
    id: 'first_voice_log',
    title: 'Voice Logger',
    description: 'Log food by voice',
    emoji: '\uD83C\uDFA4',
    category: 'ai',
    check: (ctx: AchievementContext) => !!ctx.hasUsedVoiceLog,
    getProgress: (ctx: AchievementContext) => ({ current: ctx.hasUsedVoiceLog ? 1 : 0, target: 1 }),
  },

  // Milestone Achievements
  {
    id: 'xp_1000',
    title: 'Rising Star',
    description: 'Earn 1,000 XP',
    emoji: '\u2B50',
    category: 'milestones',
    check: (ctx: AchievementContext) => (ctx.totalXP || 0) >= 1000,
    getProgress: (ctx: AchievementContext) => ({ current: Math.min(ctx.totalXP || 0, 1000), target: 1000 }),
  },
  {
    id: 'xp_5000',
    title: 'Fitness Pro',
    description: 'Earn 5,000 XP',
    emoji: '\uD83C\uDF1F',
    category: 'milestones',
    check: (ctx: AchievementContext) => (ctx.totalXP || 0) >= 5000,
    getProgress: (ctx: AchievementContext) => ({ current: Math.min(ctx.totalXP || 0, 5000), target: 5000 }),
  },
  {
    id: 'progress_photo',
    title: 'Selfie Time',
    description: 'Take first progress photo',
    emoji: '\uD83D\uDCF7',
    category: 'milestones',
    check: (ctx: AchievementContext) => !!ctx.hasTakenProgressPhoto,
    getProgress: (ctx: AchievementContext) => ({ current: ctx.hasTakenProgressPhoto ? 1 : 0, target: 1 }),
  },
  {
    id: 'weight_goal_reached',
    title: 'Goal Crusher',
    description: 'Reach target weight',
    emoji: '\uD83C\uDF89',
    category: 'milestones',
    check: (ctx: AchievementContext) => !!ctx.hasReachedWeightGoal,
    getProgress: (ctx: AchievementContext) => ({ current: ctx.hasReachedWeightGoal ? 1 : 0, target: 1 }),
  },
];

interface CategoryEntry {
  key: string;
  label: string;
}

export const CATEGORIES: CategoryEntry[] = [
  { key: 'all', label: 'All' },
  { key: 'streaks', label: 'Streaks' },
  { key: 'logging', label: 'Logging' },
  { key: 'fitness', label: 'Fitness' },
  { key: 'health', label: 'Health' },
  { key: 'ai', label: 'AI' },
  { key: 'milestones', label: 'Milestones' },
];

interface AchievementProgress {
  current: number;
  target: number;
  percent: number;
  label: string;
}

interface NewlyUnlockedAchievement {
  id: string;
  title: string;
  description: string;
  emoji: string;
  category: string;
}

interface UseAchievementsReturn {
  achievements: Achievement[];
  unlockedCount: number;
  totalCount: number;
  newUnlocked: number;
  isLoaded: boolean;
  checkAchievements: (context: AchievementContext) => Promise<NewlyUnlockedAchievement[]>;
  getUnlocked: () => Achievement[];
  getLocked: () => Achievement[];
  markSeen: (id: string) => Promise<void>;
  markAllSeen: () => Promise<void>;
  getProgress: (id: string, context?: AchievementContext) => AchievementProgress | null;
}

export default function useAchievements(): UseAchievementsReturn {
  const [unlockedMap, setUnlockedMap] = useState<Record<string, UnlockedAchievement>>({}); // { [id]: { unlockedAt, isNew } }
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  // Load from AsyncStorage on mount
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          setUnlockedMap(JSON.parse(stored) as Record<string, UnlockedAchievement>);
        }
      } catch {
        // Start fresh on error
      } finally {
        setIsLoaded(true);
      }
    })();
  }, []);

  // Persist helper
  const persist = useCallback(async (updated: Record<string, UnlockedAchievement>): Promise<void> => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Storage write failed - data still in memory
    }
  }, []);

  // Build the full achievements list with unlocked state
  const achievements = useMemo((): Achievement[] => {
    return ACHIEVEMENT_DEFINITIONS.map((def: AchievementDefinition): Achievement => {
      const unlocked = unlockedMap[def.id];
      return {
        id: def.id,
        title: def.title,
        description: def.description,
        emoji: def.emoji,
        category: def.category,
        unlockedAt: unlocked ? unlocked.unlockedAt : null,
        isNew: unlocked ? unlocked.isNew : false,
        isUnlocked: !!unlocked,
      };
    });
  }, [unlockedMap]);

  const unlockedCount = useMemo((): number => {
    return achievements.filter((a: Achievement) => a.isUnlocked).length;
  }, [achievements]);

  const totalCount: number = ACHIEVEMENT_DEFINITIONS.length;

  // Count of newly unlocked (unseen) achievements
  const newUnlocked = useMemo((): number => {
    return achievements.filter((a: Achievement) => a.isNew).length;
  }, [achievements]);

  // Check achievements against current context and return newly unlocked ones
  const checkAchievements = useCallback(
    async (context: AchievementContext): Promise<NewlyUnlockedAchievement[]> => {
      if (!isLoaded) return [];

      const newlyUnlocked: NewlyUnlockedAchievement[] = [];
      const updated: Record<string, UnlockedAchievement> = { ...unlockedMap };
      let changed = false;

      for (const def of ACHIEVEMENT_DEFINITIONS) {
        // Skip already unlocked
        if (updated[def.id]) continue;

        // Check if the achievement condition is met
        if (def.check(context)) {
          updated[def.id] = {
            unlockedAt: new Date().toISOString(),
            isNew: true,
          };
          newlyUnlocked.push({
            id: def.id,
            title: def.title,
            description: def.description,
            emoji: def.emoji,
            category: def.category,
          });
          changed = true;
        }
      }

      if (changed) {
        setUnlockedMap(updated);
        await persist(updated);
      }

      return newlyUnlocked;
    },
    [isLoaded, unlockedMap, persist]
  );

  // Get unlocked achievements
  const getUnlocked = useCallback((): Achievement[] => {
    return achievements.filter((a: Achievement) => a.isUnlocked);
  }, [achievements]);

  // Get locked achievements with progress hints
  const getLocked = useCallback((): Achievement[] => {
    return achievements.filter((a: Achievement) => !a.isUnlocked);
  }, [achievements]);

  // Mark achievement as seen (clear "new" badge)
  const markSeen = useCallback(
    async (id: string): Promise<void> => {
      if (!unlockedMap[id]) return;

      const updated: Record<string, UnlockedAchievement> = {
        ...unlockedMap,
        [id]: { ...unlockedMap[id], isNew: false },
      };
      setUnlockedMap(updated);
      await persist(updated);
    },
    [unlockedMap, persist]
  );

  // Mark all achievements as seen
  const markAllSeen = useCallback(async (): Promise<void> => {
    const updated: Record<string, UnlockedAchievement> = { ...unlockedMap };
    let changed = false;
    for (const id of Object.keys(updated)) {
      if (updated[id].isNew) {
        updated[id] = { ...updated[id], isNew: false };
        changed = true;
      }
    }
    if (changed) {
      setUnlockedMap(updated);
      await persist(updated);
    }
  }, [unlockedMap, persist]);

  // Get progress toward a specific achievement
  const getProgress = useCallback(
    (id: string, context?: AchievementContext): AchievementProgress | null => {
      const def = ACHIEVEMENT_DEFINITIONS.find((d: AchievementDefinition) => d.id === id);
      if (!def) return null;

      const { current, target } = def.getProgress(context || {} as AchievementContext);
      return {
        current,
        target,
        percent: target > 0 ? Math.min(current / target, 1) : 0,
        label: `${current}/${target}`,
      };
    },
    []
  );

  return {
    achievements,
    unlockedCount,
    totalCount,
    newUnlocked,
    isLoaded,
    checkAchievements,
    getUnlocked,
    getLocked,
    markSeen,
    markAllSeen,
    getProgress,
  };
}

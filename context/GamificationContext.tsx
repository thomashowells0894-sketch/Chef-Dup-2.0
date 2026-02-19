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
import { hapticSuccess, hapticHeavy } from '../lib/haptics';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

// ============================================================================
// TYPES
// ============================================================================

interface ToastItem {
  id: number;
  message: string;
  xp: number;
}

interface LevelDefinition {
  level: number;
  name: string;
  title: string;
  minXP: number;
  maxXP: number;
}

interface LevelProgress {
  progress: number;
  xpToNext: number;
  xpInLevel: number;
  levelXpRange: number;
}

interface LevelInfo extends LevelDefinition, LevelProgress {}

interface BrokenStreak {
  previousStreak: number;
  brokenDate: string;
  lastActiveDate: string;
}

// ============================================================================
// CELEBRATION EVENT SYSTEM
// ============================================================================

export type CelebrationEventType =
  | 'level_up'
  | 'streak_milestone'
  | 'streak_tier_upgrade'
  | 'bonus_drop'
  | 'goal_hit'
  | 'streak_repaired'
  | 'first_log_today'
  | 'achievement_unlocked'
  | 'weekly_challenge_complete';

export interface CelebrationEvent {
  type: CelebrationEventType;
  intensity: 'small' | 'medium' | 'large' | 'epic';
  title: string;
  subtitle: string;
  data?: {
    previousLevel?: number;
    newLevel?: number;
    levelName?: string;
    levelTitle?: string;
    streakDays?: number;
    tierName?: string;
    tierColors?: [string, string];
    multiplier?: number;
    xpAwarded?: number;
    achievementId?: string;
    achievementName?: string;
    achievementIcon?: string;
    achievementRarity?: string;
    achievementXpReward?: number;
  };
}

// Streak intensity tiers
export type StreakTier = 'none' | 'warm' | 'blaze' | 'hellfire';

export interface StreakTierInfo {
  tier: StreakTier;
  label: string;
  colors: [string, string];
  glowColor: string;
  minDays: number;
}

export const STREAK_TIERS: Record<StreakTier, StreakTierInfo> = {
  none:     { tier: 'none',     label: 'No Streak',   colors: ['#6B6B73', '#4A4A52'], glowColor: 'transparent', minDays: 0 },
  warm:     { tier: 'warm',     label: 'Warming Up',   colors: ['#FFB300', '#FF8F00'], glowColor: 'rgba(255, 179, 0, 0.3)', minDays: 3 },
  blaze:    { tier: 'blaze',    label: 'On Fire',      colors: ['#FF6B35', '#FF453A'], glowColor: 'rgba(255, 107, 53, 0.4)', minDays: 7 },
  hellfire: { tier: 'hellfire', label: 'Unstoppable',  colors: ['#FF453A', '#D50000'], glowColor: 'rgba(255, 69, 58, 0.5)', minDays: 14 },
};

function getStreakTier(streak: number): StreakTierInfo {
  if (streak >= 14) return STREAK_TIERS.hellfire;
  if (streak >= 7) return STREAK_TIERS.blaze;
  if (streak >= 3) return STREAK_TIERS.warm;
  return STREAK_TIERS.none;
}

// Streak milestone days that trigger celebration events
const STREAK_MILESTONES = [3, 7, 14, 21, 30, 60, 100, 200, 365];

function getStreakMilestoneIntensity(days: number): CelebrationEvent['intensity'] {
  if (days >= 100) return 'epic';
  if (days >= 30) return 'large';
  if (days >= 14) return 'medium';
  return 'small';
}

// ============================================================================
// STREAK MULTIPLIER SYSTEM
// Day 1-7 = 1x, Day 8-14 = 1.5x, Day 15-30 = 2x, Day 30+ = 3x
// ============================================================================

export function getStreakMultiplier(streak: number): number {
  if (streak > 30) return 3;
  if (streak >= 15) return 2;
  if (streak >= 8) return 1.5;
  return 1;
}

export function getStreakMultiplierLabel(streak: number): string {
  const mult = getStreakMultiplier(streak);
  if (mult === 1) return '';
  return `${mult}x`;
}

// ============================================================================
// DAILY XP CAP — 500 XP/day to prevent gaming
// ============================================================================

const DAILY_XP_CAP = 500;

// ============================================================================
// XP REWARDS — explicit values for each action
// ============================================================================

export const XP_REWARDS: Record<string, number> = {
  LOG_FOOD: 10,
  LOG_WATER: 5,
  LOG_EXERCISE: 50,
  COMPLETE_FAST: 30,
  DAILY_LOGIN: 5,
  STREAK_BONUS: 10, // base, multiplied by streak multiplier
  HIT_PROTEIN_TARGET: 25,
  HIT_CALORIE_TARGET: 25,
  COMPLETE_CHALLENGE: 25,
  COMPLETE_ALL_CHALLENGES: 50,
  COMPLETE_WEEKLY_CHALLENGE: 75,
};

// ============================================================================
// LEVEL SYSTEM — with diminishing returns
// Level 1: 0, Level 5: 500, Level 10: 2000, Level 25: 15000,
// Level 50: 75000, Level 100: 500000
// ============================================================================

export type UserRank = 'Beginner' | 'Committed' | 'Dedicated' | 'Elite' | 'Master' | 'Legend';

export function getRankForLevel(level: number): UserRank {
  if (level >= 50) return 'Legend';
  if (level >= 35) return 'Master';
  if (level >= 20) return 'Elite';
  if (level >= 10) return 'Dedicated';
  if (level >= 5) return 'Committed';
  return 'Beginner';
}

export const RANK_COLORS: Record<UserRank, string> = {
  Beginner:  '#8E8E93',
  Committed: '#00E676',
  Dedicated: '#448AFF',
  Elite:     '#BF5AF2',
  Master:    '#FF6B35',
  Legend:    '#FFD700',
};

// Generate levels with diminishing returns using a curve
function generateLevels(): LevelDefinition[] {
  // Key XP thresholds: L1=0, L5=500, L10=2000, L25=15000, L50=75000, L100=500000
  // Polynomial interpolation: XP = a * level^2.3 approximately
  const keyPoints: Record<number, number> = {
    1: 0, 2: 50, 3: 120, 4: 220, 5: 500,
    6: 700, 7: 950, 8: 1250, 9: 1600, 10: 2000,
    11: 2500, 12: 3100, 13: 3800, 14: 4600, 15: 5500,
    16: 6500, 17: 7600, 18: 8800, 19: 10100, 20: 11500,
    21: 12200, 22: 12900, 23: 13700, 24: 14400, 25: 15000,
  };

  const levels: LevelDefinition[] = [];

  for (let i = 1; i <= 100; i++) {
    let minXP: number;
    if (keyPoints[i] !== undefined) {
      minXP = keyPoints[i]!;
    } else if (i <= 50) {
      // Interpolate between L25 (15000) and L50 (75000)
      const t = (i - 25) / (50 - 25);
      minXP = Math.round(15000 + t * t * (75000 - 15000));
    } else {
      // Interpolate between L50 (75000) and L100 (500000)
      const t = (i - 50) / (100 - 50);
      minXP = Math.round(75000 + t * t * (500000 - 75000));
    }

    const rank = getRankForLevel(i);
    const title = rank;

    // Name is a display name for the level
    const levelNames: Record<number, string> = {
      1: 'Beginner', 2: 'Starter', 3: 'Apprentice', 4: 'Tracker',
      5: 'Committed', 6: 'Achiever', 7: 'Focused', 8: 'Driven',
      9: 'Disciplined', 10: 'Dedicated', 11: 'Consistent', 12: 'Strong',
      13: 'Resilient', 14: 'Determined', 15: 'Warrior', 16: 'Fighter',
      17: 'Champion', 18: 'Contender', 19: 'Powerhouse', 20: 'Elite',
      25: 'Specialist', 30: 'Expert', 35: 'Master', 40: 'Grandmaster',
      45: 'Titan', 50: 'Legend', 60: 'Mythic', 70: 'Immortal',
      80: 'Ascended', 90: 'Transcendent', 100: 'Vibe God',
    };

    const name = levelNames[i] || `Level ${i}`;

    levels.push({
      level: i,
      name,
      title,
      minXP,
      maxXP: Infinity, // Will be set below
    });
  }

  // Set maxXP for each level
  for (let i = 0; i < levels.length - 1; i++) {
    levels[i]!.maxXP = levels[i + 1]!.minXP;
  }
  // Last level has infinite max
  levels[levels.length - 1]!.maxXP = Infinity;

  return levels;
}

export const LEVELS: LevelDefinition[] = generateLevels();

// ============================================================================
// WEEKLY CHALLENGES
// ============================================================================

export interface WeeklyChallenge {
  id: string;
  title: string;
  description: string;
  emoji: string;
  xpReward: number;
  target: number;
  current: number;
  isCompleted: boolean;
  completedAt: string | null;
  weekStart: string; // Monday of the week
  type: string;
}

const WEEKLY_CHALLENGE_TEMPLATES = [
  {
    type: 'PROTEIN_MEALS',
    title: 'Protein Powerhouse',
    description: 'Log 5 meals with 30g+ protein this week',
    emoji: '\uD83E\uDD69',
    target: 5,
    xpReward: 75,
  },
  {
    type: 'WATER_DAYS',
    title: 'Hydration Week',
    description: 'Hit your water goal 5 days this week',
    emoji: '\uD83D\uDCA7',
    target: 5,
    xpReward: 75,
  },
  {
    type: 'WORKOUT_DAYS',
    title: 'Active Week',
    description: 'Complete 4 workouts this week',
    emoji: '\uD83D\uDCAA',
    target: 4,
    xpReward: 100,
  },
  {
    type: 'CALORIE_ACCURACY',
    title: 'Precision Week',
    description: 'Stay within 100 cal of target 5 days',
    emoji: '\uD83C\uDFAF',
    target: 5,
    xpReward: 100,
  },
  {
    type: 'FULL_LOG_DAYS',
    title: 'Complete Logger',
    description: 'Log all 3 meals for 5 days this week',
    emoji: '\uD83D\uDCDD',
    target: 5,
    xpReward: 75,
  },
  {
    type: 'STEP_DAYS',
    title: 'Step Champion',
    description: 'Hit 10,000 steps 5 days this week',
    emoji: '\uD83D\uDC5F',
    target: 5,
    xpReward: 100,
  },
  {
    type: 'VEGGIE_DAYS',
    title: 'Green Week',
    description: 'Log vegetables every day this week',
    emoji: '\uD83E\uDD66',
    target: 7,
    xpReward: 100,
  },
  {
    type: 'EARLY_WORKOUTS',
    title: 'Early Riser',
    description: 'Log 2 workouts before 8 AM this week',
    emoji: '\uD83C\uDF05',
    target: 2,
    xpReward: 75,
  },
];

function getWeekStartString(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  const monday = new Date(d.setDate(diff));
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
}

function generateWeeklyChallenges(userLevel: number): WeeklyChallenge[] {
  const weekStart = getWeekStartString();
  // Pick 2 random templates, scale target with level
  const shuffled = [...WEEKLY_CHALLENGE_TEMPLATES].sort(() => Math.random() - 0.5);
  const picked = shuffled.slice(0, 2);

  return picked.map((template, i) => {
    // Scale difficulty slightly with level
    const levelScale = userLevel >= 20 ? 1.3 : userLevel >= 10 ? 1.15 : 1;
    const scaledTarget = Math.round(template.target * levelScale);
    const scaledReward = Math.round(template.xpReward * levelScale);

    return {
      id: `${weekStart}_${template.type}_${i}`,
      title: template.title,
      description: template.description,
      emoji: template.emoji,
      xpReward: scaledReward,
      target: scaledTarget,
      current: 0,
      isCompleted: false,
      completedAt: null,
      weekStart,
      type: template.type,
    };
  });
}

// ============================================================================
// STREAK INSURANCE — free freeze every 30 days for active users
// ============================================================================

const STREAK_FREEZE_COST = 200;
const FREE_FREEZE_INTERVAL_DAYS = 30;

// ============================================================================
// BONUS XP DROP
// ============================================================================

export interface BonusDrop {
  multiplier: number;
  message: string;
  baseXP: number;
  totalXP: number;
}

function rollBonusDrop(baseXP: number): BonusDrop | null {
  if (Math.random() > 0.20) return null;
  const multipliers = [2, 2, 3, 3, 5] as const;
  const multiplier = multipliers[Math.floor(Math.random() * 5)] ?? 2;
  const messages = [
    'Bonus XP!',
    'Lucky drop!',
    'XP Surge!',
    'Double down!',
    'Jackpot!',
  ];
  return {
    multiplier,
    message: messages[Math.floor(Math.random() * messages.length)] ?? 'Bonus XP!',
    baseXP,
    totalXP: baseXP * multiplier,
  };
}

// Streak repair cost
const STREAK_REPAIR_BASE_COST = 100;

function getStreakRepairCost(previousStreak: number, isPremium: boolean): number {
  const scaledCost = STREAK_REPAIR_BASE_COST + (previousStreak * 10);
  return isPremium ? Math.floor(scaledCost * 0.5) : scaledCost;
}

// ============================================================================
// CONTEXT INTERFACES
// ============================================================================

interface GamificationContextValue {
  totalXP: number;
  dailyXPEarned: number;
  dailyXPCap: number;
  currentStreak: number;
  streakTier: StreakTierInfo;
  streakMultiplier: number;
  isLoading: boolean;
  hasActivityToday: boolean;
  activeDates: string[];
  brokenStreak: BrokenStreak | null;
  canRepairStreak: boolean;
  streakRepairCost: number;
  repairStreak: () => Promise<boolean>;
  hasStreakFreeze: boolean;
  buyStreakFreeze: () => boolean;
  freeStreakFreezeAvailable: boolean;
  claimFreeStreakFreeze: () => boolean;
  lastBonusDrop: BonusDrop | null;
  levelInfo: LevelInfo;
  levels: LevelDefinition[];
  userRank: UserRank;
  rankColor: string;
  weeklyChallenges: WeeklyChallenge[];
  updateWeeklyChallengeProgress: (type: string, increment?: number) => void;
  pendingCelebration: CelebrationEvent | null;
  dismissCelebration: () => void;
  awardXP: (action: string, customMessage?: string | null) => Promise<number | undefined>;
  recordActivity: () => void;
  showToast: (message: string, xp: number) => void;
  dismissToast: (id: number) => void;
  xpRewards: Record<string, number>;
}

interface ToastContextValue {
  toastQueue: ToastItem[];
  dismissToast: (id: number) => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const GamificationContext = createContext<GamificationContextValue | null>(null);
const ToastContext = createContext<ToastContextValue | null>(null);

const STORAGE_KEY = '@vibefit_gamification';
const WEEKLY_CHALLENGE_KEY = '@vibefit_weekly_challenges';

// ============================================================================
// HELPERS
// ============================================================================

function getTodayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getYesterdayString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function calculateLevel(xp: number): LevelDefinition {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    const level = LEVELS[i];
    if (level && xp >= level.minXP) {
      return level;
    }
  }
  return LEVELS[0]!;
}

function calculateLevelProgress(xp: number): LevelProgress {
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

// ============================================================================
// PROVIDER
// ============================================================================

export function GamificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [totalXP, setTotalXP] = useState<number>(0);
  const [dailyXPEarned, setDailyXPEarned] = useState<number>(0);
  const [dailyXPDate, setDailyXPDate] = useState<string>('');
  const [currentStreak, setCurrentStreak] = useState<number>(0);
  const [lastActiveDate, setLastActiveDate] = useState<string | null>(null);
  const [activeDates, setActiveDates] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isHydrated, setIsHydrated] = useState<boolean>(false);

  // Streak repair state
  const [brokenStreak, setBrokenStreak] = useState<BrokenStreak | null>(null);
  const [canRepairStreak, setCanRepairStreak] = useState<boolean>(false);

  // Streak freeze insurance
  const [hasStreakFreeze, setHasStreakFreeze] = useState<boolean>(false);
  const [lastFreeFreezeDate, setLastFreeFreezeDate] = useState<string | null>(null);

  // Bonus drop state
  const [lastBonusDrop, setLastBonusDrop] = useState<BonusDrop | null>(null);

  // Weekly challenges
  const [weeklyChallenges, setWeeklyChallenges] = useState<WeeklyChallenge[]>([]);

  // Toast state
  const [toastQueue, setToastQueue] = useState<ToastItem[]>([]);
  const toastIdRef = useRef<number>(0);

  // Celebration event queue
  const [pendingCelebration, setPendingCelebration] = useState<CelebrationEvent | null>(null);
  const celebrationQueueRef = useRef<CelebrationEvent[]>([]);

  // Level tracking for level-up detection
  const previousLevelRef = useRef<number>(1);

  // Streak tracking for milestone detection
  const previousStreakRef = useRef<number>(0);
  const previousStreakTierRef = useRef<StreakTier>('none');

  // Track whether first log today already celebrated
  const firstLogTodayCelebratedRef = useRef<string | null>(null);

  // ---- Celebration event system ----

  const fireCelebration = useCallback((event: CelebrationEvent) => {
    celebrationQueueRef.current.push(event);
    if (!pendingCelebration) {
      setPendingCelebration(celebrationQueueRef.current.shift() || null);
    }
  }, [pendingCelebration]);

  const dismissCelebration = useCallback(() => {
    const next = celebrationQueueRef.current.shift() || null;
    setPendingCelebration(next);
  }, []);

  // ---- Supabase streak calculation ----

  const calculateStreakFromSupabase = useCallback(async (): Promise<{
    streak: number;
    activeDates: string[];
    brokenStreak: BrokenStreak | null;
  }> => {
    if (!user) return { streak: 0, activeDates: [], brokenStreak: null };

    try {
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

      const uniqueDates = [...new Set(logs.map((l: any) => l.date))].sort().reverse() as string[];

      if (uniqueDates.length === 0) {
        return { streak: 0, activeDates: [], brokenStreak: null };
      }

      const today = getTodayString();
      const yesterday = getYesterdayString();

      let streak = 0;
      let currentDate = today;
      const foundToday = uniqueDates.includes(today);
      const foundYesterday = uniqueDates.includes(yesterday);

      if (foundToday) {
        currentDate = today;
      } else if (foundYesterday) {
        currentDate = yesterday;
      } else {
        const lastActive = uniqueDates[0]!;
        const daysSinceLast = Math.floor(
          (new Date(today).getTime() - new Date(lastActive).getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysSinceLast <= 2) {
          let previousStreakCount = 0;
          let checkDate = lastActive;
          for (const date of uniqueDates) {
            if (date === checkDate) {
              previousStreakCount++;
              const prevDate = new Date(checkDate);
              prevDate.setDate(prevDate.getDate() - 1);
              checkDate = prevDate.toISOString().split('T')[0]!;
            } else {
              break;
            }
          }

          return {
            streak: 0,
            activeDates: uniqueDates.slice(0, 90),
            brokenStreak: {
              previousStreak: previousStreakCount,
              brokenDate: yesterday,
              lastActiveDate: lastActive,
            },
          };
        }

        return { streak: 0, activeDates: uniqueDates.slice(0, 90), brokenStreak: null };
      }

      for (const date of uniqueDates) {
        if (date === currentDate) {
          streak++;
          const prevDate = new Date(currentDate);
          prevDate.setDate(prevDate.getDate() - 1);
          currentDate = prevDate.toISOString().split('T')[0]!;
        } else if (date < currentDate) {
          break;
        }
      }

      return {
        streak,
        activeDates: uniqueDates.slice(0, 90),
        brokenStreak: null,
      };
    } catch (error: any) {
      if (__DEV__) console.error('Error calculating streak:', error.message);
      return { streak: 0, activeDates: [], brokenStreak: null };
    }
  }, [user]);

  // ---- Load saved state ----

  useEffect(() => {
    async function loadState() {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          setTotalXP(parsed.totalXP || 0);
          setHasStreakFreeze(parsed.hasStreakFreeze || false);
          setLastFreeFreezeDate(parsed.lastFreeFreezeDate || null);
          previousLevelRef.current = calculateLevel(parsed.totalXP || 0).level;

          // Load daily XP tracking
          const today = getTodayString();
          if (parsed.dailyXPDate === today) {
            setDailyXPEarned(parsed.dailyXPEarned || 0);
            setDailyXPDate(today);
          } else {
            setDailyXPEarned(0);
            setDailyXPDate(today);
          }
        } else {
          setDailyXPDate(getTodayString());
        }

        // Load weekly challenges
        const savedWeekly = await AsyncStorage.getItem(WEEKLY_CHALLENGE_KEY);
        if (savedWeekly) {
          const parsedWeekly = JSON.parse(savedWeekly);
          const currentWeekStart = getWeekStartString();
          if (parsedWeekly.weekStart === currentWeekStart && Array.isArray(parsedWeekly.challenges)) {
            setWeeklyChallenges(parsedWeekly.challenges);
          } else {
            const levelNum = calculateLevel(totalXP).level;
            const newWeekly = generateWeeklyChallenges(levelNum);
            setWeeklyChallenges(newWeekly);
            await AsyncStorage.setItem(WEEKLY_CHALLENGE_KEY, JSON.stringify({
              weekStart: currentWeekStart,
              challenges: newWeekly,
            }));
          }
        } else {
          const levelNum = calculateLevel(totalXP).level;
          const newWeekly = generateWeeklyChallenges(levelNum);
          setWeeklyChallenges(newWeekly);
        }

        if (user) {
          const { streak, activeDates: dates, brokenStreak: broken } = await calculateStreakFromSupabase();
          setCurrentStreak(streak);
          setActiveDates(dates);
          setLastActiveDate(dates[0] || null);
          previousStreakRef.current = streak;
          previousStreakTierRef.current = getStreakTier(streak).tier;

          if (broken) {
            const savedRaw = await AsyncStorage.getItem(STORAGE_KEY);
            const savedData = savedRaw ? JSON.parse(savedRaw) : {};
            if (savedData.hasStreakFreeze) {
              const { error } = await supabase
                .from('food_logs')
                .insert({
                  user_id: user.id,
                  date: broken.brokenDate,
                  name: 'Streak Freeze',
                  calories: 0,
                  protein: 0,
                  carbs: 0,
                  fat: 0,
                })
                .select();

              if (!error) {
                const recalc = await calculateStreakFromSupabase();
                setCurrentStreak(recalc.streak);
                setActiveDates(recalc.activeDates);
                previousStreakRef.current = recalc.streak;
                setHasStreakFreeze(false);
                setBrokenStreak(null);
                setCanRepairStreak(false);
                fireCelebration({
                  type: 'streak_repaired',
                  intensity: 'medium',
                  title: 'Streak Freeze Activated!',
                  subtitle: `Your ${broken.previousStreak}-day streak was saved automatically.`,
                  data: { streakDays: broken.previousStreak },
                });
              } else {
                setBrokenStreak(broken);
                setCanRepairStreak(true);
              }
            } else {
              setBrokenStreak(broken);
              setCanRepairStreak(true);
            }
          } else {
            setBrokenStreak(null);
            setCanRepairStreak(false);
          }
        }
      } catch (error: any) {
        if (__DEV__) console.error('Failed to load gamification state:', error.message);
      } finally {
        setIsLoading(false);
        setIsHydrated(true);
      }
    }
    loadState();
  }, [user, calculateStreakFromSupabase, fireCelebration]);

  // ---- Periodic streak refresh ----

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

    const interval = setInterval(refreshStreak, 300000);
    return () => clearInterval(interval);
  }, [user, isHydrated, calculateStreakFromSupabase]);

  // ---- Streak milestone & tier upgrade detection ----

  useEffect(() => {
    if (!isHydrated || currentStreak === 0) return;

    const prevStreak = previousStreakRef.current;
    const prevTier = previousStreakTierRef.current;
    const newTier = getStreakTier(currentStreak);

    if (currentStreak > prevStreak && STREAK_MILESTONES.includes(currentStreak)) {
      fireCelebration({
        type: 'streak_milestone',
        intensity: getStreakMilestoneIntensity(currentStreak),
        title: currentStreak >= 100
          ? `${currentStreak} DAYS. LEGENDARY.`
          : currentStreak >= 30
          ? `${currentStreak}-Day Streak!`
          : `${currentStreak} Days Strong!`,
        subtitle: currentStreak >= 100
          ? 'Less than 0.1% of users reach this. You are elite.'
          : currentStreak >= 30
          ? 'Top 5% of all users. This is what discipline looks like.'
          : currentStreak >= 14
          ? 'Two weeks of relentless consistency. The habit is forming.'
          : currentStreak >= 7
          ? '92% of users quit before day 7. You didn\'t.'
          : 'The fire is lit. Keep building momentum.',
        data: { streakDays: currentStreak },
      });
    }

    if (newTier.tier !== prevTier && newTier.tier !== 'none') {
      fireCelebration({
        type: 'streak_tier_upgrade',
        intensity: newTier.tier === 'hellfire' ? 'epic' : 'large',
        title: `${newTier.label}`,
        subtitle: newTier.tier === 'hellfire'
          ? 'HELLFIRE MODE ACTIVATED. Nothing can stop you.'
          : newTier.tier === 'blaze'
          ? 'You\'re ON FIRE. The streak is blazing.'
          : 'Warming up. Keep the momentum going.',
        data: {
          tierName: newTier.label,
          tierColors: newTier.colors,
          streakDays: currentStreak,
        },
      });
    }

    previousStreakRef.current = currentStreak;
    previousStreakTierRef.current = newTier.tier;
  }, [currentStreak, isHydrated, fireCelebration]);

  // ---- Auto-save ----

  useEffect(() => {
    if (!isHydrated) return;

    const timeoutId = setTimeout(() => {
      AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          totalXP,
          currentStreak,
          lastActiveDate,
          activeDates,
          hasStreakFreeze,
          lastFreeFreezeDate,
          dailyXPEarned,
          dailyXPDate,
        })
      ).catch((error: any) => {
        if (__DEV__) console.error('Failed to save gamification state:', error.message);
      });
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [totalXP, currentStreak, lastActiveDate, activeDates, hasStreakFreeze, lastFreeFreezeDate, dailyXPEarned, dailyXPDate, isHydrated]);

  // ---- Save weekly challenges ----

  useEffect(() => {
    if (!isHydrated || weeklyChallenges.length === 0) return;

    const timeoutId = setTimeout(() => {
      AsyncStorage.setItem(
        WEEKLY_CHALLENGE_KEY,
        JSON.stringify({
          weekStart: getWeekStartString(),
          challenges: weeklyChallenges,
        })
      ).catch((error: any) => {
        if (__DEV__) console.error('Failed to save weekly challenges:', error.message);
      });
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [weeklyChallenges, isHydrated]);

  // ---- Toast ----

  const showToast = useCallback((message: string, xp: number) => {
    const id = ++toastIdRef.current;
    setToastQueue(prev => [...prev, { id, message, xp }]);
    setTimeout(() => {
      setToastQueue(prev => prev.filter(t => t.id !== id));
    }, 2000);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToastQueue(prev => prev.filter(t => t.id !== id));
  }, []);

  // ---- Record activity ----

  const recordActivity = useCallback(() => {
    const today = getTodayString();
    const yesterday = getYesterdayString();

    setActiveDates(prev => {
      if (prev.includes(today)) return prev;
      const updated = [...prev, today].slice(-90);
      return updated;
    });

    if (lastActiveDate === yesterday) {
      setCurrentStreak(prev => prev + 1);
    } else if (lastActiveDate !== today) {
      setCurrentStreak(1);
    }

    setLastActiveDate(today);
  }, [lastActiveDate]);

  // ---- Award XP (with level-up detection, streak multiplier, daily cap) ----

  const awardXP = useCallback(async (action: string, customMessage: string | null = null): Promise<number | undefined> => {
    const baseXP = XP_REWARDS[action] || 0;
    if (baseXP === 0) return;

    // Check daily XP cap
    const today = getTodayString();
    let currentDailyXP = dailyXPDate === today ? dailyXPEarned : 0;

    if (currentDailyXP >= DAILY_XP_CAP) {
      showToast('Daily XP cap reached (500/day)', 0);
      // Still record activity for streak
      recordActivity();
      return 0;
    }

    // Record activity for streak
    recordActivity();

    // Apply streak multiplier to streak bonus
    let xpAmount = baseXP;
    if (action === 'STREAK_BONUS') {
      xpAmount = Math.round(baseXP * getStreakMultiplier(currentStreak));
    }

    // Detect "first log of the day" for celebration
    if (action === 'LOG_FOOD' && firstLogTodayCelebratedRef.current !== today) {
      firstLogTodayCelebratedRef.current = today;
      fireCelebration({
        type: 'first_log_today',
        intensity: 'small',
        title: 'Day Started!',
        subtitle: `First entry logged. ${getStreakMultiplier(currentStreak) > 1 ? `${getStreakMultiplier(currentStreak)}x streak multiplier active!` : 'Keep the momentum going.'}`,
      });
    }

    // Roll for bonus XP drop
    const canDrop = action === 'LOG_FOOD' || action === 'LOG_EXERCISE';
    const drop = canDrop ? rollBonusDrop(xpAmount) : null;
    let finalXP = drop ? drop.totalXP : xpAmount;

    // Enforce daily XP cap
    const remainingCap = DAILY_XP_CAP - currentDailyXP;
    if (finalXP > remainingCap) {
      finalXP = remainingCap;
    }

    if (finalXP <= 0) {
      showToast('Daily XP cap reached (500/day)', 0);
      return 0;
    }

    // Update daily XP tracking
    if (dailyXPDate !== today) {
      setDailyXPDate(today);
      setDailyXPEarned(finalXP);
    } else {
      setDailyXPEarned(prev => prev + finalXP);
    }

    // Capture level BEFORE XP is added
    const levelBefore = calculateLevel(totalXP);

    // Add XP
    setTotalXP(prev => {
      const newTotal = prev + finalXP;

      // Level-up detection
      const levelAfter = calculateLevel(newTotal);
      if (levelAfter.level > levelBefore.level) {
        setTimeout(() => {
          const newRank = getRankForLevel(levelAfter.level);
          const oldRank = getRankForLevel(levelBefore.level);
          fireCelebration({
            type: 'level_up',
            intensity: levelAfter.level >= 50 ? 'epic' : levelAfter.level >= 20 ? 'large' : 'medium',
            title: `Level ${levelAfter.level}!`,
            subtitle: `You are now ${levelAfter.name}`,
            data: {
              previousLevel: levelBefore.level,
              newLevel: levelAfter.level,
              levelName: levelAfter.name,
              levelTitle: newRank !== oldRank ? newRank : undefined,
              xpAwarded: finalXP,
            },
          });
          hapticHeavy();
        }, 0);
      }

      previousLevelRef.current = levelAfter.level;
      return newTotal;
    });

    if (drop) {
      setLastBonusDrop(drop);
      showToast(`${drop.message} ${drop.multiplier}x XP!`, drop.totalXP);
      fireCelebration({
        type: 'bonus_drop',
        intensity: drop.multiplier >= 5 ? 'large' : 'medium',
        title: `${drop.multiplier}x XP!`,
        subtitle: drop.message,
        data: { multiplier: drop.multiplier, xpAwarded: drop.totalXP },
      });
    } else {
      const messages: Record<string, string> = {
        LOG_FOOD: 'Food logged!',
        LOG_WATER: 'Stay hydrated!',
        LOG_EXERCISE: 'Great workout!',
        COMPLETE_FAST: 'Fast complete!',
        DAILY_LOGIN: 'Welcome back!',
        HIT_PROTEIN_TARGET: 'Protein target hit!',
        HIT_CALORIE_TARGET: 'Calorie target hit!',
        COMPLETE_CHALLENGE: 'Challenge complete!',
        COMPLETE_WEEKLY_CHALLENGE: 'Weekly challenge done!',
      };
      showToast(customMessage || messages[action] || 'Action complete!', finalXP);
    }

    await hapticSuccess();
    return finalXP;
  }, [recordActivity, showToast, fireCelebration, totalXP, currentStreak, dailyXPEarned, dailyXPDate]);

  // ---- Activity today check ----

  const hasActivityToday = useMemo<boolean>(() => {
    const today = getTodayString();
    return activeDates.includes(today);
  }, [activeDates]);

  // ---- Streak repair ----

  const streakRepairCost = useMemo<number>(() => {
    if (!brokenStreak) return 0;
    return getStreakRepairCost(brokenStreak.previousStreak, false);
  }, [brokenStreak]);

  const repairStreak = useCallback(async (): Promise<boolean> => {
    if (!canRepairStreak || !brokenStreak || !user) return false;

    const cost = streakRepairCost;
    if (totalXP < cost) {
      showToast(`Need ${cost} XP to repair (you have ${totalXP})`, 0);
      return false;
    }

    try {
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

      setTotalXP(prev => prev - cost);

      const { streak, activeDates: dates } = await calculateStreakFromSupabase();
      setCurrentStreak(streak);
      setActiveDates(dates);
      previousStreakRef.current = streak;
      setBrokenStreak(null);
      setCanRepairStreak(false);

      showToast(`Streak Repaired! (-${cost} XP)`, 0);

      fireCelebration({
        type: 'streak_repaired',
        intensity: brokenStreak.previousStreak >= 14 ? 'large' : 'medium',
        title: 'Streak Saved!',
        subtitle: `Your ${brokenStreak.previousStreak}-day streak lives on.`,
        data: { streakDays: brokenStreak.previousStreak },
      });

      await hapticSuccess();
      return true;
    } catch (error) {
      if (__DEV__) console.error('Failed to repair streak:', error);
      return false;
    }
  }, [canRepairStreak, brokenStreak, user, totalXP, streakRepairCost, calculateStreakFromSupabase, showToast, fireCelebration]);

  // ---- Streak freeze insurance ----

  const buyStreakFreeze = useCallback((): boolean => {
    if (hasStreakFreeze) {
      showToast('You already have a Streak Freeze active', 0);
      return false;
    }
    if (totalXP < STREAK_FREEZE_COST) {
      showToast(`Need ${STREAK_FREEZE_COST} XP (you have ${totalXP})`, 0);
      return false;
    }
    setTotalXP(prev => prev - STREAK_FREEZE_COST);
    setHasStreakFreeze(true);
    showToast(`Streak Freeze activated! (-${STREAK_FREEZE_COST} XP)`, 0);
    hapticSuccess();
    return true;
  }, [hasStreakFreeze, totalXP, showToast]);

  // ---- Free streak freeze every 30 days ----

  const freeStreakFreezeAvailable = useMemo<boolean>(() => {
    if (hasStreakFreeze) return false;
    if (currentStreak < 7) return false; // Only for active users with streaks
    if (!lastFreeFreezeDate) return true;

    const lastDate = new Date(lastFreeFreezeDate);
    const now = new Date();
    const daysSince = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
    return daysSince >= FREE_FREEZE_INTERVAL_DAYS;
  }, [hasStreakFreeze, currentStreak, lastFreeFreezeDate]);

  const claimFreeStreakFreeze = useCallback((): boolean => {
    if (!freeStreakFreezeAvailable) {
      showToast('Free freeze not available yet', 0);
      return false;
    }
    setHasStreakFreeze(true);
    setLastFreeFreezeDate(getTodayString());
    showToast('Free Streak Freeze claimed!', 0);
    hapticSuccess();
    return true;
  }, [freeStreakFreezeAvailable, showToast]);

  // ---- Weekly challenge progress ----

  const updateWeeklyChallengeProgress = useCallback((type: string, increment: number = 1) => {
    setWeeklyChallenges(prev => {
      let changed = false;
      const updated = prev.map(challenge => {
        if (challenge.type === type && !challenge.isCompleted) {
          const newCurrent = Math.min(challenge.current + increment, challenge.target);
          const isNowComplete = newCurrent >= challenge.target;
          changed = true;

          if (isNowComplete) {
            setTimeout(() => {
              fireCelebration({
                type: 'weekly_challenge_complete',
                intensity: 'medium',
                title: 'Weekly Challenge Complete!',
                subtitle: challenge.title,
                data: { xpAwarded: challenge.xpReward },
              });
            }, 0);
          }

          return {
            ...challenge,
            current: newCurrent,
            isCompleted: isNowComplete,
            completedAt: isNowComplete ? new Date().toISOString() : null,
          };
        }
        return challenge;
      });

      return changed ? updated : prev;
    });
  }, [fireCelebration]);

  // ---- Computed values ----

  const levelInfo = useMemo<LevelInfo>(() => {
    const level = calculateLevel(totalXP);
    const progress = calculateLevelProgress(totalXP);
    return { ...level, ...progress };
  }, [totalXP]);

  const streakTier = useMemo<StreakTierInfo>(() => getStreakTier(currentStreak), [currentStreak]);

  const streakMultiplier = useMemo<number>(() => getStreakMultiplier(currentStreak), [currentStreak]);

  const userRank = useMemo<UserRank>(() => getRankForLevel(levelInfo.level), [levelInfo.level]);

  const rankColor = useMemo<string>(() => RANK_COLORS[userRank], [userRank]);

  // ---- Context values ----

  const value = useMemo<GamificationContextValue>(
    () => ({
      totalXP,
      dailyXPEarned,
      dailyXPCap: DAILY_XP_CAP,
      currentStreak,
      streakTier,
      streakMultiplier,
      isLoading,
      hasActivityToday,
      activeDates,
      brokenStreak,
      canRepairStreak,
      streakRepairCost,
      repairStreak,
      hasStreakFreeze,
      buyStreakFreeze,
      freeStreakFreezeAvailable,
      claimFreeStreakFreeze,
      lastBonusDrop,
      levelInfo,
      levels: LEVELS,
      userRank,
      rankColor,
      weeklyChallenges,
      updateWeeklyChallengeProgress,
      pendingCelebration,
      dismissCelebration,
      awardXP,
      recordActivity,
      showToast,
      dismissToast,
      xpRewards: XP_REWARDS,
    }),
    [
      totalXP,
      dailyXPEarned,
      currentStreak,
      streakTier,
      streakMultiplier,
      isLoading,
      hasActivityToday,
      activeDates,
      brokenStreak,
      canRepairStreak,
      streakRepairCost,
      repairStreak,
      hasStreakFreeze,
      buyStreakFreeze,
      freeStreakFreezeAvailable,
      claimFreeStreakFreeze,
      lastBonusDrop,
      levelInfo,
      userRank,
      rankColor,
      weeklyChallenges,
      updateWeeklyChallengeProgress,
      pendingCelebration,
      dismissCelebration,
      awardXP,
      recordActivity,
      showToast,
      dismissToast,
    ]
  );

  const toastValue = useMemo<ToastContextValue>(() => ({
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

// ============================================================================
// HOOKS
// ============================================================================

export function useGamification(): GamificationContextValue {
  const context = useContext(GamificationContext);
  if (!context) {
    throw new Error('useGamification must be used within a GamificationProvider');
  }
  return context;
}

export function useToastQueue(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToastQueue must be used within a GamificationProvider');
  }
  return context;
}

export function useCelebration() {
  const { pendingCelebration, dismissCelebration } = useGamification();
  return {
    celebration: pendingCelebration,
    dismiss: dismissCelebration,
  };
}

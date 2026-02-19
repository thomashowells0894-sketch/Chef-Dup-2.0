/**
 * useDailyChallenges Hook
 *
 * Generates and tracks daily challenges that refresh at midnight.
 * - Personalized based on user history (challenge weak areas)
 * - 3 daily challenges, refreshed at midnight
 * - Difficulty scaling based on user level
 * - Bonus challenge on weekends
 * - XP rewards scale with difficulty
 * - Timer showing time remaining to complete
 *
 * AsyncStorage key: @vibefit_daily_challenges
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMeals } from '../context/MealContext';
import { useFasting } from '../context/FastingContext';
import { useHealthKit } from './useHealthKit';
import { useGamification } from '../context/GamificationContext';

const STORAGE_KEY = '@vibefit_daily_challenges';
const BASE_CHALLENGES_PER_DAY = 3;
const BASE_XP_PER_CHALLENGE = 25;
const BONUS_ALL_COMPLETE_XP = 50;

// ---------------------------------------------------------------------------
// Challenge type definitions with difficulty tiers
// ---------------------------------------------------------------------------
const CHALLENGE_TYPES = {
  PROTEIN_GOAL: {
    type: 'PROTEIN_GOAL',
    title: 'Hit your protein goal today',
    description: 'Reach 100% of your daily protein target',
    emoji: '\uD83E\uDD69',
    category: 'nutrition',
    baseDifficulty: 1,
  },
  WATER_GOAL: {
    type: 'WATER_GOAL',
    title: 'Drink 8 glasses of water',
    description: 'Stay hydrated throughout the day',
    emoji: '\uD83D\uDCA7',
    category: 'nutrition',
    baseDifficulty: 0.8,
  },
  LOG_ALL_MEALS: {
    type: 'LOG_ALL_MEALS',
    title: 'Log all 3 meals today',
    description: 'Track breakfast, lunch, and dinner',
    emoji: '\uD83C\uDF7D\uFE0F',
    category: 'logging',
    baseDifficulty: 0.9,
  },
  STEP_GOAL: {
    type: 'STEP_GOAL',
    title: 'Walk 10,000 steps',
    description: 'Get moving and hit the step target',
    emoji: '\uD83D\uDC5F',
    category: 'fitness',
    baseDifficulty: 1.2,
  },
  CALORIE_TARGET: {
    type: 'CALORIE_TARGET',
    title: 'Stay within 100 cal of target',
    description: 'Hit your calorie goal precisely',
    emoji: '\uD83C\uDFAF',
    category: 'nutrition',
    baseDifficulty: 1.3,
  },
  FAST_COMPLETE: {
    type: 'FAST_COMPLETE',
    title: 'Complete your fasting window',
    description: 'Finish your intermittent fast',
    emoji: '\u23F3',
    category: 'fitness',
    baseDifficulty: 1.1,
  },
  LOG_STREAK: {
    type: 'LOG_STREAK',
    title: 'Keep your logging streak alive',
    description: 'Log at least one food item today',
    emoji: '\uD83D\uDD25',
    category: 'logging',
    baseDifficulty: 0.5,
  },
  VEGGIE_BOOST: {
    type: 'VEGGIE_BOOST',
    title: 'Include vegetables in every meal',
    description: 'Boost your nutrition with greens',
    emoji: '\uD83E\uDD66',
    category: 'nutrition',
    baseDifficulty: 1.0,
  },
  HIGH_PROTEIN_MEAL: {
    type: 'HIGH_PROTEIN_MEAL',
    title: 'Log a meal with 30g+ protein',
    description: 'Make protein a priority in at least one meal',
    emoji: '\uD83C\uDF57',
    category: 'nutrition',
    baseDifficulty: 0.9,
  },
  WORKOUT_LOG: {
    type: 'WORKOUT_LOG',
    title: 'Log a workout today',
    description: 'Record any physical activity',
    emoji: '\uD83D\uDCAA',
    category: 'fitness',
    baseDifficulty: 1.0,
  },
  WATER_HALF: {
    type: 'WATER_HALF',
    title: 'Drink half your water by noon',
    description: 'Start hydrating early',
    emoji: '\uD83E\uDDCA',
    category: 'nutrition',
    baseDifficulty: 0.7,
  },
  LOG_SNACKS: {
    type: 'LOG_SNACKS',
    title: 'Track all snacks today',
    description: 'Don\'t let snacking go untracked',
    emoji: '\uD83C\uDF6A',
    category: 'logging',
    baseDifficulty: 0.8,
  },
};

// Weekend bonus challenges
const WEEKEND_BONUS_CHALLENGES = {
  WEEKEND_WARRIOR: {
    type: 'WEEKEND_WARRIOR',
    title: 'Weekend Warrior',
    description: 'Complete a workout on the weekend',
    emoji: '\uD83C\uDFC6',
    category: 'fitness',
    baseDifficulty: 1.0,
  },
  MEAL_PREP: {
    type: 'MEAL_PREP',
    title: 'Meal Prep Sunday',
    description: 'Log your meal prep for the week ahead',
    emoji: '\uD83D\uDCCB',
    category: 'logging',
    baseDifficulty: 1.2,
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getTodayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function isWeekend() {
  const day = new Date().getDay();
  return day === 0 || day === 6;
}

/**
 * Calculate time remaining until midnight (next refresh).
 * Returns { hours, minutes, seconds, totalSeconds }.
 */
function getTimeUntilMidnight() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const totalSeconds = Math.max(0, Math.floor((midnight.getTime() - now.getTime()) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { hours, minutes, seconds, totalSeconds };
}

/**
 * Calculate difficulty multiplier based on user level.
 * Higher levels get slightly harder challenges with better rewards.
 */
function getDifficultyScale(userLevel) {
  if (userLevel >= 50) return 1.8;
  if (userLevel >= 35) return 1.5;
  if (userLevel >= 20) return 1.3;
  if (userLevel >= 10) return 1.15;
  if (userLevel >= 5) return 1.05;
  return 1.0;
}

/**
 * Weighted random selection of N challenge types.
 * weakAreas is a Set of type keys that should receive higher weight.
 * avoidRecent is a Set of type keys recently completed to add variety.
 */
function pickChallenges(count, weakAreas = new Set(), avoidRecent = new Set()) {
  const allTypes = Object.keys(CHALLENGE_TYPES);
  const weighted = allTypes.map((type) => {
    let weight = 1;
    // Weak areas get 3x weight
    if (weakAreas.has(type)) weight = 3;
    // Recently completed get 0.3x weight (less likely to repeat)
    if (avoidRecent.has(type)) weight *= 0.3;
    return { type, weight };
  });

  const selected = [];
  const remaining = [...weighted];

  for (let i = 0; i < count && remaining.length > 0; i++) {
    let currentTotal = remaining.reduce((sum, w) => sum + w.weight, 0);
    let rand = Math.random() * currentTotal;
    let chosenIndex = 0;

    for (let j = 0; j < remaining.length; j++) {
      rand -= remaining[j].weight;
      if (rand <= 0) {
        chosenIndex = j;
        break;
      }
    }

    selected.push(remaining[chosenIndex].type);
    remaining.splice(chosenIndex, 1);
  }

  return selected;
}

/**
 * Build a full challenge object from a type key.
 */
function buildChallenge(typeKey, index, difficultyScale = 1.0) {
  const allChallenges = { ...CHALLENGE_TYPES, ...WEEKEND_BONUS_CHALLENGES };
  const def = allChallenges[typeKey];
  if (!def) return null;

  const adjustedDifficulty = def.baseDifficulty * difficultyScale;
  const xpReward = Math.round(BASE_XP_PER_CHALLENGE * adjustedDifficulty);

  return {
    id: `${getTodayString()}_${typeKey}_${index}`,
    type: def.type,
    title: def.title,
    description: def.description,
    emoji: def.emoji,
    category: def.category || 'general',
    xpReward,
    difficulty: adjustedDifficulty,
    isCompleted: false,
    completedAt: null,
    isBonus: !!WEEKEND_BONUS_CHALLENGES[typeKey],
  };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useDailyChallenges() {
  const [challenges, setChallenges] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState(getTimeUntilMidnight());
  const bonusAwardedRef = useRef(false);

  // Context hooks
  const { totals, goals, meals, waterProgress } = useMeals();
  const { fastingProgress, isFasting } = useFasting();
  const { steps: healthSteps } = useHealthKit();
  const { awardXP, showToast, totalXP, levelInfo, currentStreak } = useGamification();

  const userLevel = levelInfo?.level || 1;
  const difficultyScale = useMemo(() => getDifficultyScale(userLevel), [userLevel]);

  // ------------------------------------------------------------------
  // Timer countdown to midnight (challenge refresh)
  // ------------------------------------------------------------------
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining(getTimeUntilMidnight());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  // ------------------------------------------------------------------
  // Determine weak areas for weighted picking (heuristic)
  // ------------------------------------------------------------------
  const weakAreas = useMemo(() => {
    const areas = new Set();
    // If protein is typically low, weight protein challenge higher
    if (totals.protein < goals.protein * 0.5) {
      areas.add('PROTEIN_GOAL');
      areas.add('HIGH_PROTEIN_MEAL');
    }
    // If water is low, weight water challenge
    if ((waterProgress?.percentage || 0) < 30) {
      areas.add('WATER_GOAL');
      areas.add('WATER_HALF');
    }
    // If not all meals logged, weight meal logging
    const mealsLogged = [meals.breakfast, meals.lunch, meals.dinner].filter(
      (m) => m && m.length > 0
    ).length;
    if (mealsLogged < 2) {
      areas.add('LOG_ALL_MEALS');
      areas.add('LOG_SNACKS');
    }
    // If steps are low, weight step goal
    if (healthSteps < 3000) areas.add('STEP_GOAL');
    // If no workout today, weight workout
    areas.add('WORKOUT_LOG');
    // If calorie tracking is off, weight calorie accuracy
    if (totals.calories > 0 && Math.abs(totals.calories - goals.calories) > 200) {
      areas.add('CALORIE_TARGET');
    }
    return areas;
  }, [totals.protein, totals.calories, goals.protein, goals.calories, waterProgress?.percentage, meals.breakfast, meals.lunch, meals.dinner, healthSteps]);

  // ------------------------------------------------------------------
  // Load or generate today's challenges
  // ------------------------------------------------------------------
  useEffect(() => {
    async function loadChallenges() {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        let recentTypes = new Set();

        if (saved) {
          const parsed = JSON.parse(saved);
          const today = getTodayString();

          if (parsed.date === today && Array.isArray(parsed.challenges)) {
            setChallenges(parsed.challenges);
            bonusAwardedRef.current = parsed.bonusAwarded || false;
            setIsLoading(false);
            return;
          }

          // Track recently completed challenge types for variety
          if (Array.isArray(parsed.challenges)) {
            parsed.challenges
              .filter((c) => c.isCompleted)
              .forEach((c) => recentTypes.add(c.type));
          }
        }

        // Generate new challenges for today
        const challengeCount = BASE_CHALLENGES_PER_DAY;
        const types = pickChallenges(challengeCount, weakAreas, recentTypes);
        const newChallenges = types
          .map((type, i) => buildChallenge(type, i, difficultyScale))
          .filter(Boolean);

        // Add bonus challenge on weekends
        if (isWeekend()) {
          const bonusKeys = Object.keys(WEEKEND_BONUS_CHALLENGES);
          const bonusKey = bonusKeys[Math.floor(Math.random() * bonusKeys.length)];
          const bonusChallenge = buildChallenge(bonusKey, challengeCount, difficultyScale);
          if (bonusChallenge) {
            newChallenges.push(bonusChallenge);
          }
        }

        setChallenges(newChallenges);
        bonusAwardedRef.current = false;

        await AsyncStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            date: getTodayString(),
            challenges: newChallenges,
            bonusAwarded: false,
          })
        );
      } catch (error) {
        if (__DEV__) console.error('Failed to load daily challenges:', error.message);
        const types = pickChallenges(BASE_CHALLENGES_PER_DAY, weakAreas);
        setChallenges(types.map((type, i) => buildChallenge(type, i, difficultyScale)).filter(Boolean));
      } finally {
        setIsLoading(false);
      }
    }

    loadChallenges();
  }, []); // Only run on mount

  // ------------------------------------------------------------------
  // Persist challenges whenever they change
  // ------------------------------------------------------------------
  useEffect(() => {
    if (isLoading || challenges.length === 0) return;

    const timeoutId = setTimeout(async () => {
      try {
        await AsyncStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            date: getTodayString(),
            challenges,
            bonusAwarded: bonusAwardedRef.current,
          })
        );
      } catch (error) {
        if (__DEV__) console.error('Failed to save daily challenges:', error.message);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [challenges, isLoading]);

  // ------------------------------------------------------------------
  // Check challenge progress against live context data
  // ------------------------------------------------------------------
  const checkProgress = useCallback(() => {
    setChallenges((prev) => {
      let changed = false;
      const updated = prev.map((challenge) => {
        if (challenge.isCompleted) return challenge;

        let met = false;

        switch (challenge.type) {
          case 'PROTEIN_GOAL':
            met = totals.protein >= goals.protein;
            break;

          case 'WATER_GOAL':
            met = (waterProgress?.percentage || 0) >= 100;
            break;

          case 'WATER_HALF':
            met = (waterProgress?.percentage || 0) >= 50 && new Date().getHours() <= 12;
            break;

          case 'LOG_ALL_MEALS': {
            const hasBreakfast = meals.breakfast && meals.breakfast.length > 0;
            const hasLunch = meals.lunch && meals.lunch.length > 0;
            const hasDinner = meals.dinner && meals.dinner.length > 0;
            met = hasBreakfast && hasLunch && hasDinner;
            break;
          }

          case 'STEP_GOAL':
            met = healthSteps >= 10000;
            break;

          case 'CALORIE_TARGET':
            met = totals.calories > 0 && Math.abs(totals.calories - goals.calories) <= 100;
            break;

          case 'FAST_COMPLETE':
            met = fastingProgress?.isComplete === true;
            break;

          case 'LOG_STREAK':
            met = totals.calories > 0;
            break;

          case 'HIGH_PROTEIN_MEAL': {
            // Check if any single meal has 30g+ protein
            const mealArrays = [meals.breakfast, meals.lunch, meals.dinner, meals.snacks].filter(Boolean);
            for (const mealItems of mealArrays) {
              if (Array.isArray(mealItems)) {
                const mealProtein = mealItems.reduce((sum, item) => sum + (item.protein || 0), 0);
                if (mealProtein >= 30) {
                  met = true;
                  break;
                }
              }
            }
            break;
          }

          case 'WORKOUT_LOG':
            // Will be true if any exercise was logged today
            met = totals.exerciseMinutes > 0 || totals.caloriesBurned > 0;
            break;

          case 'LOG_SNACKS': {
            // Check if snacks array has items (user tracked their snacking)
            met = meals.snacks && meals.snacks.length > 0;
            break;
          }

          case 'WEEKEND_WARRIOR':
            met = (totals.exerciseMinutes > 0 || totals.caloriesBurned > 0) && isWeekend();
            break;

          case 'MEAL_PREP':
            met = false; // Manual completion
            break;

          case 'VEGGIE_BOOST':
            met = false; // Manual completion
            break;

          default:
            break;
        }

        if (met) {
          changed = true;
          return { ...challenge, isCompleted: true, completedAt: new Date().toISOString() };
        }
        return challenge;
      });

      return changed ? updated : prev;
    });
  }, [totals, goals, meals, waterProgress, healthSteps, fastingProgress]);

  // ------------------------------------------------------------------
  // Manually complete a challenge (for manual-only challenges)
  // ------------------------------------------------------------------
  const completeChallenge = useCallback(
    async (challengeId) => {
      let xpAwarded = 0;

      setChallenges((prev) => {
        return prev.map((c) => {
          if (c.id === challengeId && !c.isCompleted) {
            xpAwarded = c.xpReward;
            return { ...c, isCompleted: true, completedAt: new Date().toISOString() };
          }
          return c;
        });
      });

      if (xpAwarded > 0) {
        await awardXP('COMPLETE_CHALLENGE', 'Challenge Complete!');
      }
    },
    [awardXP]
  );

  // ------------------------------------------------------------------
  // Derived state
  // ------------------------------------------------------------------
  const completedCount = useMemo(
    () => challenges.filter((c) => c.isCompleted).length,
    [challenges]
  );

  const totalCount = challenges.length;

  const allComplete = completedCount === totalCount && totalCount > 0;

  // Only count non-bonus challenges for the "all complete" bonus
  const coreComplete = useMemo(() => {
    const core = challenges.filter((c) => !c.isBonus);
    return core.length > 0 && core.every((c) => c.isCompleted);
  }, [challenges]);

  // Award bonus XP when all core challenges are completed
  useEffect(() => {
    if (coreComplete && !bonusAwardedRef.current) {
      bonusAwardedRef.current = true;
      awardXP('COMPLETE_ALL_CHALLENGES', 'All Challenges Complete! Bonus!');
    }
  }, [coreComplete, awardXP]);

  // Format time remaining as string
  const timeRemainingFormatted = useMemo(() => {
    const { hours, minutes } = timeRemaining;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }, [timeRemaining]);

  return {
    challenges,
    isLoading,
    checkProgress,
    completeChallenge,
    completedCount,
    totalCount,
    allComplete,
    coreComplete,
    timeRemaining,
    timeRemainingFormatted,
    isWeekend: isWeekend(),
    difficultyScale,
  };
}

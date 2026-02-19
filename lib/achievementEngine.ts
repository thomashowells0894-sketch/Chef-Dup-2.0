/**
 * Achievement Engine
 *
 * Comprehensive achievement system with 50+ achievements across categories.
 * Each achievement has an id, name, description, icon (emoji), category,
 * requirement check, xpReward, and rarity.
 *
 * Rarity tiers:
 *   common     - gray border   - most users will unlock
 *   uncommon   - green border  - requires moderate effort
 *   rare       - blue border   - requires sustained commitment
 *   epic       - purple border - top 10% of users
 *   legendary  - gold border   - top 1% of users
 */

// ============================================================================
// TYPES
// ============================================================================

export type AchievementRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export type AchievementCategory =
  | 'nutrition'
  | 'fitness'
  | 'progress'
  | 'social'
  | 'streaks'
  | 'milestones';

export interface AchievementEngineContext {
  // Streaks
  streak?: number;
  longestStreak?: number;
  streakRebuilt?: boolean; // rebuilt a 7+ day streak after losing one

  // Nutrition / Logging
  totalFoodsLogged?: number;
  totalDaysLogged?: number;
  allMealsLoggedInDay?: boolean;
  daysWithAllMealsLogged?: number; // total days with breakfast+lunch+dinner
  proteinTargetStreak?: number; // consecutive days hitting protein target
  macroTargetStreak?: number; // consecutive days with all macros within 5%
  calorieTargetStreak?: number; // consecutive days within 100 cal of target
  veggieStreak?: number; // consecutive days logging vegetables
  waterGoalStreak?: number; // consecutive days hitting water goal
  mealPrepWeeks?: number; // weeks with all meals logged by Sunday

  // Fitness
  totalWorkouts?: number;
  totalCardioSessions?: number;
  personalRecords?: number;
  totalVolumeKg?: number; // lifetime total volume
  earlyBirdWorkouts?: number; // workouts logged before 6 AM
  consistentWorkoutWeeks?: number; // 4+ workouts/week for N consecutive weeks
  hasCompletedFast?: boolean;

  // Progress
  weightLostKg?: number;
  hasReachedGoalWeight?: boolean;
  bodyRecomposition?: boolean; // lost fat + gained muscle
  benchPressMax?: number;
  squatMax?: number;
  deadliftMax?: number;
  longestRunKm?: number;
  mostSteps?: number;

  // Social
  friendCount?: number;
  challengesAccepted?: number;
  challengesWon?: number;
  recipesShared?: number;
  postLikes?: number;

  // XP / Level
  totalXP?: number;
  currentLevel?: number;

  // Photos
  hasTakenProgressPhoto?: boolean;

  // AI features
  hasScannedFood?: boolean;
  hasChatted?: boolean;
  hasGeneratedMealPlan?: boolean;
  hasUsedVoiceLog?: boolean;

  // Perfect week: logged food + workout every day for 7 days
  perfectWeeks?: number;
}

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  icon: string; // emoji
  category: AchievementCategory;
  xpReward: number;
  rarity: AchievementRarity;
  check: (ctx: AchievementEngineContext) => boolean;
  getProgress: (ctx: AchievementEngineContext) => { current: number; target: number };
}

export interface UnlockedAchievementRecord {
  unlockedAt: string;
  isNew: boolean;
}

// ============================================================================
// RARITY COLORS — used for border styling
// ============================================================================

export const RARITY_COLORS: Record<AchievementRarity, { border: string; glow: string; bg: string; label: string }> = {
  common:    { border: '#8E8E93', glow: 'rgba(142, 142, 147, 0.2)', bg: 'rgba(142, 142, 147, 0.08)', label: 'Common' },
  uncommon:  { border: '#00E676', glow: 'rgba(0, 230, 118, 0.3)',   bg: 'rgba(0, 230, 118, 0.08)',   label: 'Uncommon' },
  rare:      { border: '#448AFF', glow: 'rgba(68, 138, 255, 0.3)',  bg: 'rgba(68, 138, 255, 0.08)',  label: 'Rare' },
  epic:      { border: '#BF5AF2', glow: 'rgba(191, 90, 242, 0.3)', bg: 'rgba(191, 90, 242, 0.08)', label: 'Epic' },
  legendary: { border: '#FFD700', glow: 'rgba(255, 215, 0, 0.4)',  bg: 'rgba(255, 215, 0, 0.10)',  label: 'Legendary' },
};

// ============================================================================
// ACHIEVEMENT DEFINITIONS (50+)
// ============================================================================

export const ACHIEVEMENTS: AchievementDef[] = [
  // ---------------------------------------------------------------------------
  // NUTRITION ACHIEVEMENTS
  // ---------------------------------------------------------------------------
  {
    id: 'first_meal_logged',
    name: 'First Bite',
    description: 'Log your first meal',
    icon: '\uD83C\uDF4E',
    category: 'nutrition',
    xpReward: 10,
    rarity: 'common',
    check: (ctx) => (ctx.totalFoodsLogged || 0) >= 1,
    getProgress: (ctx) => ({ current: Math.min(ctx.totalFoodsLogged || 0, 1), target: 1 }),
  },
  {
    id: '7_day_logger',
    name: '7-Day Logger',
    description: 'Log food for 7 days',
    icon: '\uD83D\uDCC5',
    category: 'nutrition',
    xpReward: 25,
    rarity: 'common',
    check: (ctx) => (ctx.totalDaysLogged || 0) >= 7,
    getProgress: (ctx) => ({ current: Math.min(ctx.totalDaysLogged || 0, 7), target: 7 }),
  },
  {
    id: '30_day_logger',
    name: '30-Day Logger',
    description: 'Log food for 30 days',
    icon: '\uD83D\uDCC6',
    category: 'nutrition',
    xpReward: 100,
    rarity: 'uncommon',
    check: (ctx) => (ctx.totalDaysLogged || 0) >= 30,
    getProgress: (ctx) => ({ current: Math.min(ctx.totalDaysLogged || 0, 30), target: 30 }),
  },
  {
    id: '365_day_logger',
    name: '365-Day Logger',
    description: 'Log food for a full year',
    icon: '\uD83C\uDF1F',
    category: 'nutrition',
    xpReward: 500,
    rarity: 'legendary',
    check: (ctx) => (ctx.totalDaysLogged || 0) >= 365,
    getProgress: (ctx) => ({ current: Math.min(ctx.totalDaysLogged || 0, 365), target: 365 }),
  },
  {
    id: 'protein_champion',
    name: 'Protein Champion',
    description: 'Hit protein target 7 days straight',
    icon: '\uD83E\uDD69',
    category: 'nutrition',
    xpReward: 75,
    rarity: 'uncommon',
    check: (ctx) => (ctx.proteinTargetStreak || 0) >= 7,
    getProgress: (ctx) => ({ current: Math.min(ctx.proteinTargetStreak || 0, 7), target: 7 }),
  },
  {
    id: 'macro_master',
    name: 'Macro Master',
    description: 'All macros within 5% of target for 3 days',
    icon: '\uD83E\uDDEE',
    category: 'nutrition',
    xpReward: 100,
    rarity: 'rare',
    check: (ctx) => (ctx.macroTargetStreak || 0) >= 3,
    getProgress: (ctx) => ({ current: Math.min(ctx.macroTargetStreak || 0, 3), target: 3 }),
  },
  {
    id: 'calorie_consistency',
    name: 'Calorie Consistency',
    description: 'Within 100 cal of target for 7 days',
    icon: '\uD83C\uDFAF',
    category: 'nutrition',
    xpReward: 75,
    rarity: 'uncommon',
    check: (ctx) => (ctx.calorieTargetStreak || 0) >= 7,
    getProgress: (ctx) => ({ current: Math.min(ctx.calorieTargetStreak || 0, 7), target: 7 }),
  },
  {
    id: 'vegetable_victory',
    name: 'Vegetable Victory',
    description: 'Log vegetables 5 days in a row',
    icon: '\uD83E\uDD66',
    category: 'nutrition',
    xpReward: 50,
    rarity: 'uncommon',
    check: (ctx) => (ctx.veggieStreak || 0) >= 5,
    getProgress: (ctx) => ({ current: Math.min(ctx.veggieStreak || 0, 5), target: 5 }),
  },
  {
    id: 'hydration_hero',
    name: 'Hydration Hero',
    description: 'Hit water goal 7 days in a row',
    icon: '\uD83D\uDCA7',
    category: 'nutrition',
    xpReward: 75,
    rarity: 'uncommon',
    check: (ctx) => (ctx.waterGoalStreak || 0) >= 7,
    getProgress: (ctx) => ({ current: Math.min(ctx.waterGoalStreak || 0, 7), target: 7 }),
  },
  {
    id: 'meal_prep_master',
    name: 'Meal Prep Master',
    description: 'Log meals for a full week by Sunday',
    icon: '\uD83D\uDCCB',
    category: 'nutrition',
    xpReward: 100,
    rarity: 'rare',
    check: (ctx) => (ctx.mealPrepWeeks || 0) >= 1,
    getProgress: (ctx) => ({ current: Math.min(ctx.mealPrepWeeks || 0, 1), target: 1 }),
  },
  {
    id: 'full_day_logger',
    name: 'Full Day',
    description: 'Log breakfast, lunch, and dinner in one day',
    icon: '\u2705',
    category: 'nutrition',
    xpReward: 25,
    rarity: 'common',
    check: (ctx) => !!ctx.allMealsLoggedInDay,
    getProgress: (ctx) => ({ current: ctx.allMealsLoggedInDay ? 1 : 0, target: 1 }),
  },
  {
    id: 'foods_100',
    name: 'Foodie',
    description: 'Log 100 food items',
    icon: '\uD83D\uDCDD',
    category: 'nutrition',
    xpReward: 50,
    rarity: 'common',
    check: (ctx) => (ctx.totalFoodsLogged || 0) >= 100,
    getProgress: (ctx) => ({ current: Math.min(ctx.totalFoodsLogged || 0, 100), target: 100 }),
  },
  {
    id: 'foods_500',
    name: 'Nutrition Nerd',
    description: 'Log 500 food items',
    icon: '\uD83E\uDDE0',
    category: 'nutrition',
    xpReward: 150,
    rarity: 'rare',
    check: (ctx) => (ctx.totalFoodsLogged || 0) >= 500,
    getProgress: (ctx) => ({ current: Math.min(ctx.totalFoodsLogged || 0, 500), target: 500 }),
  },
  {
    id: 'foods_1000',
    name: 'Calorie Counter',
    description: 'Log 1,000 food items',
    icon: '\uD83E\uDDD1\u200D\uD83C\uDF73',
    category: 'nutrition',
    xpReward: 300,
    rarity: 'epic',
    check: (ctx) => (ctx.totalFoodsLogged || 0) >= 1000,
    getProgress: (ctx) => ({ current: Math.min(ctx.totalFoodsLogged || 0, 1000), target: 1000 }),
  },

  // ---------------------------------------------------------------------------
  // FITNESS ACHIEVEMENTS
  // ---------------------------------------------------------------------------
  {
    id: 'first_workout',
    name: "Let's Go",
    description: 'Complete your first workout',
    icon: '\uD83D\uDCAA',
    category: 'fitness',
    xpReward: 15,
    rarity: 'common',
    check: (ctx) => (ctx.totalWorkouts || 0) >= 1,
    getProgress: (ctx) => ({ current: Math.min(ctx.totalWorkouts || 0, 1), target: 1 }),
  },
  {
    id: 'workout_warrior',
    name: 'Workout Warrior',
    description: 'Complete 10 workouts',
    icon: '\uD83C\uDFCB\uFE0F',
    category: 'fitness',
    xpReward: 50,
    rarity: 'common',
    check: (ctx) => (ctx.totalWorkouts || 0) >= 10,
    getProgress: (ctx) => ({ current: Math.min(ctx.totalWorkouts || 0, 10), target: 10 }),
  },
  {
    id: 'iron_addict',
    name: 'Iron Addict',
    description: 'Complete 50 workouts',
    icon: '\uD83D\uDE24',
    category: 'fitness',
    xpReward: 150,
    rarity: 'rare',
    check: (ctx) => (ctx.totalWorkouts || 0) >= 50,
    getProgress: (ctx) => ({ current: Math.min(ctx.totalWorkouts || 0, 50), target: 50 }),
  },
  {
    id: 'gym_rat',
    name: 'Gym Rat',
    description: 'Complete 100 workouts',
    icon: '\uD83D\uDC00',
    category: 'fitness',
    xpReward: 300,
    rarity: 'epic',
    check: (ctx) => (ctx.totalWorkouts || 0) >= 100,
    getProgress: (ctx) => ({ current: Math.min(ctx.totalWorkouts || 0, 100), target: 100 }),
  },
  {
    id: 'pr_crusher',
    name: 'PR Crusher',
    description: 'Set 5 personal records',
    icon: '\uD83C\uDFC6',
    category: 'fitness',
    xpReward: 100,
    rarity: 'uncommon',
    check: (ctx) => (ctx.personalRecords || 0) >= 5,
    getProgress: (ctx) => ({ current: Math.min(ctx.personalRecords || 0, 5), target: 5 }),
  },
  {
    id: 'volume_king',
    name: 'Volume King',
    description: 'Lift 1,000,000 kg total volume',
    icon: '\uD83D\uDC51',
    category: 'fitness',
    xpReward: 500,
    rarity: 'legendary',
    check: (ctx) => (ctx.totalVolumeKg || 0) >= 1000000,
    getProgress: (ctx) => ({ current: Math.min(ctx.totalVolumeKg || 0, 1000000), target: 1000000 }),
  },
  {
    id: 'cardio_king',
    name: 'Cardio King',
    description: 'Complete 100 cardio sessions',
    icon: '\uD83C\uDFC3',
    category: 'fitness',
    xpReward: 200,
    rarity: 'epic',
    check: (ctx) => (ctx.totalCardioSessions || 0) >= 100,
    getProgress: (ctx) => ({ current: Math.min(ctx.totalCardioSessions || 0, 100), target: 100 }),
  },
  {
    id: 'early_bird',
    name: 'Early Bird',
    description: 'Log 3 workouts before 6 AM',
    icon: '\uD83C\uDF05',
    category: 'fitness',
    xpReward: 75,
    rarity: 'uncommon',
    check: (ctx) => (ctx.earlyBirdWorkouts || 0) >= 3,
    getProgress: (ctx) => ({ current: Math.min(ctx.earlyBirdWorkouts || 0, 3), target: 3 }),
  },
  {
    id: 'consistency_crown',
    name: 'Consistency Crown',
    description: '4 workouts/week for 4 weeks straight',
    icon: '\uD83D\uDC51',
    category: 'fitness',
    xpReward: 200,
    rarity: 'epic',
    check: (ctx) => (ctx.consistentWorkoutWeeks || 0) >= 4,
    getProgress: (ctx) => ({ current: Math.min(ctx.consistentWorkoutWeeks || 0, 4), target: 4 }),
  },
  {
    id: 'fasting_rookie',
    name: 'Fasting Rookie',
    description: 'Complete your first fast',
    icon: '\u23F1\uFE0F',
    category: 'fitness',
    xpReward: 20,
    rarity: 'common',
    check: (ctx) => !!ctx.hasCompletedFast,
    getProgress: (ctx) => ({ current: ctx.hasCompletedFast ? 1 : 0, target: 1 }),
  },

  // ---------------------------------------------------------------------------
  // PROGRESS ACHIEVEMENTS
  // ---------------------------------------------------------------------------
  {
    id: 'first_pound_down',
    name: 'First Pound Down',
    description: 'Lose your first 0.5 kg',
    icon: '\u2B07\uFE0F',
    category: 'progress',
    xpReward: 25,
    rarity: 'common',
    check: (ctx) => (ctx.weightLostKg || 0) >= 0.5,
    getProgress: (ctx) => ({ current: Math.min(ctx.weightLostKg || 0, 0.5), target: 0.5 }),
  },
  {
    id: '5kg_lost',
    name: '5kg Lost',
    description: 'Lose 5 kg total',
    icon: '\uD83D\uDD25',
    category: 'progress',
    xpReward: 100,
    rarity: 'uncommon',
    check: (ctx) => (ctx.weightLostKg || 0) >= 5,
    getProgress: (ctx) => ({ current: Math.min(ctx.weightLostKg || 0, 5), target: 5 }),
  },
  {
    id: '10kg_lost',
    name: '10kg Lost',
    description: 'Lose 10 kg total',
    icon: '\uD83C\uDFC6',
    category: 'progress',
    xpReward: 250,
    rarity: 'rare',
    check: (ctx) => (ctx.weightLostKg || 0) >= 10,
    getProgress: (ctx) => ({ current: Math.min(ctx.weightLostKg || 0, 10), target: 10 }),
  },
  {
    id: 'goal_weight_reached',
    name: 'Goal Weight Reached',
    description: 'Reach your target weight',
    icon: '\uD83C\uDF89',
    category: 'progress',
    xpReward: 500,
    rarity: 'legendary',
    check: (ctx) => !!ctx.hasReachedGoalWeight,
    getProgress: (ctx) => ({ current: ctx.hasReachedGoalWeight ? 1 : 0, target: 1 }),
  },
  {
    id: 'body_recomposition',
    name: 'Body Recomposition',
    description: 'Lost fat and gained muscle simultaneously',
    icon: '\uD83D\uDCAA',
    category: 'progress',
    xpReward: 300,
    rarity: 'epic',
    check: (ctx) => !!ctx.bodyRecomposition,
    getProgress: (ctx) => ({ current: ctx.bodyRecomposition ? 1 : 0, target: 1 }),
  },
  {
    id: 'bench_100',
    name: 'Bench Press 100',
    description: 'Bench press 100 kg',
    icon: '\uD83C\uDFCB\uFE0F\u200D\u2642\uFE0F',
    category: 'progress',
    xpReward: 200,
    rarity: 'epic',
    check: (ctx) => (ctx.benchPressMax || 0) >= 100,
    getProgress: (ctx) => ({ current: Math.min(ctx.benchPressMax || 0, 100), target: 100 }),
  },
  {
    id: 'squat_140',
    name: 'Squat 140',
    description: 'Squat 140 kg',
    icon: '\uD83E\uDDBF',
    category: 'progress',
    xpReward: 200,
    rarity: 'epic',
    check: (ctx) => (ctx.squatMax || 0) >= 140,
    getProgress: (ctx) => ({ current: Math.min(ctx.squatMax || 0, 140), target: 140 }),
  },
  {
    id: 'deadlift_180',
    name: 'Deadlift 180',
    description: 'Deadlift 180 kg',
    icon: '\uD83E\uDDBE',
    category: 'progress',
    xpReward: 200,
    rarity: 'epic',
    check: (ctx) => (ctx.deadliftMax || 0) >= 180,
    getProgress: (ctx) => ({ current: Math.min(ctx.deadliftMax || 0, 180), target: 180 }),
  },
  {
    id: 'longest_run_5k',
    name: '5K Runner',
    description: 'Run 5 km in a single session',
    icon: '\uD83C\uDFC3\u200D\u2642\uFE0F',
    category: 'progress',
    xpReward: 75,
    rarity: 'uncommon',
    check: (ctx) => (ctx.longestRunKm || 0) >= 5,
    getProgress: (ctx) => ({ current: Math.min(ctx.longestRunKm || 0, 5), target: 5 }),
  },
  {
    id: 'longest_run_10k',
    name: '10K Runner',
    description: 'Run 10 km in a single session',
    icon: '\uD83C\uDFC5',
    category: 'progress',
    xpReward: 150,
    rarity: 'rare',
    check: (ctx) => (ctx.longestRunKm || 0) >= 10,
    getProgress: (ctx) => ({ current: Math.min(ctx.longestRunKm || 0, 10), target: 10 }),
  },
  {
    id: 'step_master',
    name: 'Step Master',
    description: 'Walk 20,000 steps in a single day',
    icon: '\uD83D\uDC5F',
    category: 'progress',
    xpReward: 75,
    rarity: 'uncommon',
    check: (ctx) => (ctx.mostSteps || 0) >= 20000,
    getProgress: (ctx) => ({ current: Math.min(ctx.mostSteps || 0, 20000), target: 20000 }),
  },
  {
    id: 'selfie_time',
    name: 'Selfie Time',
    description: 'Take your first progress photo',
    icon: '\uD83D\uDCF7',
    category: 'progress',
    xpReward: 15,
    rarity: 'common',
    check: (ctx) => !!ctx.hasTakenProgressPhoto,
    getProgress: (ctx) => ({ current: ctx.hasTakenProgressPhoto ? 1 : 0, target: 1 }),
  },

  // ---------------------------------------------------------------------------
  // SOCIAL ACHIEVEMENTS
  // ---------------------------------------------------------------------------
  {
    id: 'first_friend',
    name: 'First Friend',
    description: 'Add your first friend',
    icon: '\uD83E\uDD1D',
    category: 'social',
    xpReward: 15,
    rarity: 'common',
    check: (ctx) => (ctx.friendCount || 0) >= 1,
    getProgress: (ctx) => ({ current: Math.min(ctx.friendCount || 0, 1), target: 1 }),
  },
  {
    id: 'social_butterfly',
    name: 'Social Butterfly',
    description: 'Have 10 friends',
    icon: '\uD83E\uDD8B',
    category: 'social',
    xpReward: 75,
    rarity: 'uncommon',
    check: (ctx) => (ctx.friendCount || 0) >= 10,
    getProgress: (ctx) => ({ current: Math.min(ctx.friendCount || 0, 10), target: 10 }),
  },
  {
    id: 'challenge_accepted',
    name: 'Challenge Accepted',
    description: 'Accept your first challenge',
    icon: '\u2694\uFE0F',
    category: 'social',
    xpReward: 20,
    rarity: 'common',
    check: (ctx) => (ctx.challengesAccepted || 0) >= 1,
    getProgress: (ctx) => ({ current: Math.min(ctx.challengesAccepted || 0, 1), target: 1 }),
  },
  {
    id: 'challenge_winner',
    name: 'Challenge Winner',
    description: 'Win 3 challenges',
    icon: '\uD83E\uDD47',
    category: 'social',
    xpReward: 100,
    rarity: 'uncommon',
    check: (ctx) => (ctx.challengesWon || 0) >= 3,
    getProgress: (ctx) => ({ current: Math.min(ctx.challengesWon || 0, 3), target: 3 }),
  },
  {
    id: 'helpful',
    name: 'Helpful',
    description: 'Share 5 recipes',
    icon: '\uD83D\uDC68\u200D\uD83C\uDF73',
    category: 'social',
    xpReward: 50,
    rarity: 'uncommon',
    check: (ctx) => (ctx.recipesShared || 0) >= 5,
    getProgress: (ctx) => ({ current: Math.min(ctx.recipesShared || 0, 5), target: 5 }),
  },
  {
    id: 'inspiration',
    name: 'Inspiration',
    description: 'Get 5 likes on your posts',
    icon: '\u2764\uFE0F',
    category: 'social',
    xpReward: 50,
    rarity: 'uncommon',
    check: (ctx) => (ctx.postLikes || 0) >= 5,
    getProgress: (ctx) => ({ current: Math.min(ctx.postLikes || 0, 5), target: 5 }),
  },

  // ---------------------------------------------------------------------------
  // STREAK ACHIEVEMENTS
  // ---------------------------------------------------------------------------
  {
    id: 'streak_7',
    name: 'Week Warrior',
    description: '7-day streak',
    icon: '\uD83D\uDD25',
    category: 'streaks',
    xpReward: 25,
    rarity: 'common',
    check: (ctx) => (ctx.streak || 0) >= 7,
    getProgress: (ctx) => ({ current: Math.min(ctx.streak || 0, 7), target: 7 }),
  },
  {
    id: 'streak_30',
    name: 'Monthly Master',
    description: '30-day streak',
    icon: '\uD83D\uDC51',
    category: 'streaks',
    xpReward: 100,
    rarity: 'rare',
    check: (ctx) => (ctx.streak || 0) >= 30,
    getProgress: (ctx) => ({ current: Math.min(ctx.streak || 0, 30), target: 30 }),
  },
  {
    id: 'streak_100',
    name: 'Centurion',
    description: '100-day streak',
    icon: '\uD83D\uDCAF',
    category: 'streaks',
    xpReward: 300,
    rarity: 'epic',
    check: (ctx) => (ctx.streak || 0) >= 100,
    getProgress: (ctx) => ({ current: Math.min(ctx.streak || 0, 100), target: 100 }),
  },
  {
    id: 'streak_365',
    name: 'Year of Iron',
    description: '365-day streak',
    icon: '\uD83C\uDFC6',
    category: 'streaks',
    xpReward: 1000,
    rarity: 'legendary',
    check: (ctx) => (ctx.streak || 0) >= 365,
    getProgress: (ctx) => ({ current: Math.min(ctx.streak || 0, 365), target: 365 }),
  },
  {
    id: 'comeback_kid',
    name: 'Comeback Kid',
    description: 'Rebuild a 7-day streak after losing one',
    icon: '\uD83D\uDD04',
    category: 'streaks',
    xpReward: 75,
    rarity: 'uncommon',
    check: (ctx) => !!ctx.streakRebuilt,
    getProgress: (ctx) => ({ current: ctx.streakRebuilt ? 1 : 0, target: 1 }),
  },
  {
    id: 'perfect_week',
    name: 'Perfect Week',
    description: 'Log food + workout every day for 7 days',
    icon: '\u2B50',
    category: 'streaks',
    xpReward: 150,
    rarity: 'rare',
    check: (ctx) => (ctx.perfectWeeks || 0) >= 1,
    getProgress: (ctx) => ({ current: Math.min(ctx.perfectWeeks || 0, 1), target: 1 }),
  },

  // ---------------------------------------------------------------------------
  // MILESTONE / XP ACHIEVEMENTS
  // ---------------------------------------------------------------------------
  {
    id: 'xp_1000',
    name: 'Rising Star',
    description: 'Earn 1,000 XP',
    icon: '\u2B50',
    category: 'milestones',
    xpReward: 25,
    rarity: 'common',
    check: (ctx) => (ctx.totalXP || 0) >= 1000,
    getProgress: (ctx) => ({ current: Math.min(ctx.totalXP || 0, 1000), target: 1000 }),
  },
  {
    id: 'xp_5000',
    name: 'Fitness Pro',
    description: 'Earn 5,000 XP',
    icon: '\uD83C\uDF1F',
    category: 'milestones',
    xpReward: 50,
    rarity: 'uncommon',
    check: (ctx) => (ctx.totalXP || 0) >= 5000,
    getProgress: (ctx) => ({ current: Math.min(ctx.totalXP || 0, 5000), target: 5000 }),
  },
  {
    id: 'xp_25000',
    name: 'XP Hoarder',
    description: 'Earn 25,000 XP',
    icon: '\uD83D\uDCB0',
    category: 'milestones',
    xpReward: 150,
    rarity: 'rare',
    check: (ctx) => (ctx.totalXP || 0) >= 25000,
    getProgress: (ctx) => ({ current: Math.min(ctx.totalXP || 0, 25000), target: 25000 }),
  },
  {
    id: 'xp_100000',
    name: 'XP Legend',
    description: 'Earn 100,000 XP',
    icon: '\uD83D\uDC8E',
    category: 'milestones',
    xpReward: 500,
    rarity: 'legendary',
    check: (ctx) => (ctx.totalXP || 0) >= 100000,
    getProgress: (ctx) => ({ current: Math.min(ctx.totalXP || 0, 100000), target: 100000 }),
  },
  {
    id: 'level_10',
    name: 'Double Digits',
    description: 'Reach Level 10',
    icon: '\uD83C\uDF1F',
    category: 'milestones',
    xpReward: 75,
    rarity: 'uncommon',
    check: (ctx) => (ctx.currentLevel || 0) >= 10,
    getProgress: (ctx) => ({ current: Math.min(ctx.currentLevel || 0, 10), target: 10 }),
  },
  {
    id: 'level_25',
    name: 'Quarter Century',
    description: 'Reach Level 25',
    icon: '\uD83D\uDE80',
    category: 'milestones',
    xpReward: 200,
    rarity: 'rare',
    check: (ctx) => (ctx.currentLevel || 0) >= 25,
    getProgress: (ctx) => ({ current: Math.min(ctx.currentLevel || 0, 25), target: 25 }),
  },
  {
    id: 'level_50',
    name: 'Half Century',
    description: 'Reach Level 50',
    icon: '\uD83D\uDC8E',
    category: 'milestones',
    xpReward: 500,
    rarity: 'epic',
    check: (ctx) => (ctx.currentLevel || 0) >= 50,
    getProgress: (ctx) => ({ current: Math.min(ctx.currentLevel || 0, 50), target: 50 }),
  },
  {
    id: 'ai_eyes',
    name: 'AI Eyes',
    description: 'Scan food with AI for the first time',
    icon: '\uD83D\uDCF8',
    category: 'milestones',
    xpReward: 15,
    rarity: 'common',
    check: (ctx) => !!ctx.hasScannedFood,
    getProgress: (ctx) => ({ current: ctx.hasScannedFood ? 1 : 0, target: 1 }),
  },
  {
    id: 'ai_friend',
    name: 'AI Friend',
    description: 'Chat with AI nutritionist',
    icon: '\uD83E\uDD16',
    category: 'milestones',
    xpReward: 15,
    rarity: 'common',
    check: (ctx) => !!ctx.hasChatted,
    getProgress: (ctx) => ({ current: ctx.hasChatted ? 1 : 0, target: 1 }),
  },
  {
    id: 'plan_ahead',
    name: 'Plan Ahead',
    description: 'Generate your first meal plan',
    icon: '\uD83D\uDCCB',
    category: 'milestones',
    xpReward: 20,
    rarity: 'common',
    check: (ctx) => !!ctx.hasGeneratedMealPlan,
    getProgress: (ctx) => ({ current: ctx.hasGeneratedMealPlan ? 1 : 0, target: 1 }),
  },
  {
    id: 'voice_logger',
    name: 'Voice Logger',
    description: 'Log food by voice',
    icon: '\uD83C\uDFA4',
    category: 'milestones',
    xpReward: 15,
    rarity: 'common',
    check: (ctx) => !!ctx.hasUsedVoiceLog,
    getProgress: (ctx) => ({ current: ctx.hasUsedVoiceLog ? 1 : 0, target: 1 }),
  },
];

// ============================================================================
// CATEGORY DEFINITIONS
// ============================================================================

export interface AchievementCategoryDef {
  key: AchievementCategory | 'all';
  label: string;
  icon: string;
}

export const ACHIEVEMENT_CATEGORIES: AchievementCategoryDef[] = [
  { key: 'all', label: 'All', icon: '\uD83C\uDFC6' },
  { key: 'nutrition', label: 'Nutrition', icon: '\uD83C\uDF4E' },
  { key: 'fitness', label: 'Fitness', icon: '\uD83D\uDCAA' },
  { key: 'progress', label: 'Progress', icon: '\uD83D\uDCC8' },
  { key: 'social', label: 'Social', icon: '\uD83E\uDD1D' },
  { key: 'streaks', label: 'Streaks', icon: '\uD83D\uDD25' },
  { key: 'milestones', label: 'Milestones', icon: '\u2B50' },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get achievements sorted by proximity to unlock (most progress first).
 * Returns only locked achievements.
 */
export function getNextUpAchievements(
  ctx: AchievementEngineContext,
  unlockedIds: Set<string>,
  limit: number = 3
): AchievementDef[] {
  return ACHIEVEMENTS
    .filter((a) => !unlockedIds.has(a.id))
    .map((a) => {
      const { current, target } = a.getProgress(ctx);
      const percent = target > 0 ? current / target : 0;
      return { ...a, _percent: percent };
    })
    .filter((a) => a._percent > 0 && a._percent < 1)
    .sort((a, b) => b._percent - a._percent)
    .slice(0, limit);
}

/**
 * Get overall completion stats.
 */
export function getCompletionStats(unlockedIds: Set<string>) {
  const total = ACHIEVEMENTS.length;
  const unlocked = [...unlockedIds].filter((id) =>
    ACHIEVEMENTS.some((a) => a.id === id)
  ).length;
  const percent = total > 0 ? Math.round((unlocked / total) * 100) : 0;

  return { total, unlocked, percent };
}

/**
 * Get count by rarity.
 */
export function getRarityBreakdown(unlockedIds: Set<string>) {
  const result: Record<AchievementRarity, { total: number; unlocked: number }> = {
    common: { total: 0, unlocked: 0 },
    uncommon: { total: 0, unlocked: 0 },
    rare: { total: 0, unlocked: 0 },
    epic: { total: 0, unlocked: 0 },
    legendary: { total: 0, unlocked: 0 },
  };

  for (const a of ACHIEVEMENTS) {
    result[a.rarity].total++;
    if (unlockedIds.has(a.id)) {
      result[a.rarity].unlocked++;
    }
  }

  return result;
}

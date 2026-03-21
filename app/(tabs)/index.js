/**
 * FuelIQ Dashboard - Premium Dark Mode
 *
 * Features:
 * - Deep black background with Electric Blue accents
 * - Glassmorphism stat cards
 * - Large gradient action cards
 * - Cinematic animations
 */

import React, { useState, useEffect, useCallback, useRef, memo, useMemo } from 'react';
import { Sentry } from '../../lib/sentry';
import ScreenErrorBoundary from '../../components/ScreenErrorBoundary';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Platform,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import ReAnimated, {
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import ScreenWrapper from '../../components/ScreenWrapper';
import {
  Flame,
  Zap,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  RotateCcw,
  ChefHat,
  Dumbbell,
  Target,
  Pill,
  Award,
  ScanBarcode,
} from 'lucide-react-native';
import { format } from 'date-fns';
import { hapticImpact, hapticLight, hapticSuccess, hapticWarning } from '../../lib/haptics';
import DateNavigator from '../../components/DateNavigator';
import DaySummary from '../../components/DaySummary';
import MealSection from '../../components/MealSection';
import QuickLog from '../../components/QuickLog';
import WaterCard from '../../components/WaterCard';
import BioFeedbackCard from '../../components/BioFeedbackCard';
import MacrosModal from '../../components/MacrosModal';
import CaloriesModal from '../../components/CaloriesModal';
import ExerciseModal from '../../components/ExerciseModal';
import SmartCoachModal from '../../components/SmartCoachModal';
import FoodDetailModal from '../../components/FoodDetailModal';
import ContextualCards from '../../components/ContextualCards';
import StreakRepairCard from '../../components/StreakRepairCard';
import SmartNudge from '../../components/SmartNudge';
import { getSmartNudge } from '../../lib/smartNudges';
import DigestCard from '../../components/DigestCard';
import { useWeeklyDigest } from '../../hooks/useWeeklyDigest';
import MacroAdaptCard from '../../components/MacroAdaptCard';
import { useAdaptiveMacros } from '../../hooks/useAdaptiveMacros';
import HealthCard from '../../components/HealthCard';
import DailyChallengeCard from '../../components/DailyChallengeCard';
import { useDailyChallenges } from '../../hooks/useDailyChallenges';
import { useHealthKit } from '../../hooks/useHealthKit';
import GlassCard from '../../components/ui/GlassCard';
import ShareCardModal from '../../components/ShareCardModal';
import {
  Colors,
  Spacing,
  FontSize,
  FontWeight,
  BorderRadius,
} from '../../constants/theme';
import { useMeals } from '../../context/MealContext';
import { useProfile } from '../../context/ProfileContext';
import { useGamification } from '../../context/GamificationContext';
import { useFasting } from '../../context/FastingContext';
import useSupplements from '../../hooks/useSupplements';
import useNutritionScore from '../../hooks/useNutritionScore';
import useTour from '../../hooks/useTour';
import usePredictiveAnalyticsHook from '../../hooks/usePredictiveAnalytics';
import AnimatedProgressRing from '../../components/AnimatedProgressRing';
import ActionCard from '../../components/ActionCard';
import AIFab from '../../components/AIFab';
import ActivationCard from '../../components/ActivationCard';
import TodayFocusCard from '../../components/TodayFocusCard';
import UpgradeMomentumCard from '../../components/UpgradeMomentumCard';
import MyFitnessPalImportCard from '../../components/MyFitnessPalImportCard';
import { calculateWellnessScore } from '../../lib/wellnessEngine';
import { useMood } from '../../context/MoodContext';
import { usePreload } from '../../hooks/usePreload';
import { useIsPremium } from '../../context/SubscriptionContext';
import { useNotifications } from '../../context/NotificationContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  recordQuickAddUsed,
  recordRepeatLogUsed,
  recordTodayOpened,
} from '../../lib/activationTracker';
import { useFriends } from '../../hooks/useFriends';
import useActivationTrackerHook from '../../hooks/useActivationTracker';
import { useProactiveCoach } from '../../hooks/useProactiveCoach';
import { useHealthSync } from '../../hooks/useHealthSync';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import {
  buildRepeatMealSuggestions,
  useRecentMealSnapshots,
} from '../../lib/recentMeals';
import { trackEvent } from '../../lib/analytics';
import { recordAppInteractive } from '../../lib/startupTrace';

// Premium accent colors
const ACCENT = Colors.primary; // Electric Blue
const ACCENT_DIM = Colors.primaryDim;

// Streak milestones that trigger shareable screenshot cards
const STREAK_MILESTONES = [7, 30, 100, 365];

// Ambient gradient orbs — living background à la Apple Fitness+
const AmbientOrbs = memo(function AmbientOrbs() {
  const orb1 = useSharedValue(0.12);
  const orb2 = useSharedValue(0.08);

  useEffect(() => {
    orb1.value = withRepeat(
      withSequence(
        withTiming(0.22, { duration: 4000 }),
        withTiming(0.12, { duration: 4000 }),
      ), -1
    );
    orb2.value = withRepeat(
      withSequence(
        withTiming(0.15, { duration: 5000 }),
        withTiming(0.06, { duration: 5000 }),
      ), -1
    );
  }, [orb1, orb2]);

  const orb1Style = useAnimatedStyle(() => ({ opacity: orb1.value }));
  const orb2Style = useAnimatedStyle(() => ({ opacity: orb2.value }));

  return (
    <View style={ambientStyles.container} pointerEvents="none">
      <ReAnimated.View style={[ambientStyles.orb1, orb1Style]}>
        <LinearGradient
          colors={['#00D4FF', '#7B61FF', 'transparent']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={ambientStyles.orbGradient}
        />
      </ReAnimated.View>
      <ReAnimated.View style={[ambientStyles.orb2, orb2Style]}>
        <LinearGradient
          colors={['#FF6B35', '#BF5AF2', 'transparent']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={ambientStyles.orbGradient}
        />
      </ReAnimated.View>
    </View>
  );
});

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function getFormattedDate(date) {
  return format(date, 'EEEE, MMM d');
}

const MEAL_LABELS = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snacks: 'Snack',
};

function formatRepeatSourceLabel(daysSinceSource, dateKey) {
  if (daysSinceSource === 1) {
    return 'Yesterday';
  }

  if (daysSinceSource > 1 && daysSinceSource < 7) {
    return `${daysSinceSource}d ago`;
  }

  const parsed = new Date(`${dateKey}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return dateKey;
  }

  return format(parsed, 'MMM d');
}

function getRepeatMealPreview(snapshot) {
  const preview = snapshot.items
    .slice(0, 2)
    .map((item) => item.name)
    .join(' + ');
  const remainingCount = Math.max(snapshot.itemCount - 2, 0);

  if (remainingCount > 0) {
    return `${preview} +${remainingCount} more`;
  }

  return preview;
}

const RepeatMealCard = memo(function RepeatMealCard({
  suggestion,
  isLoading,
  onPress,
}) {
  const mealLabel = MEAL_LABELS[suggestion.targetMealType] || suggestion.targetMealType;
  const sourceLabel = formatRepeatSourceLabel(
    suggestion.daysSinceSource,
    suggestion.snapshot.dateKey
  );
  const preview = getRepeatMealPreview(suggestion.snapshot);
  const actionLabel = suggestion.alreadyLoggedToday ? `Add to ${mealLabel}` : `Log ${mealLabel}`;

  return (
    <GlassCard
      onPress={() => onPress(suggestion)}
      style={styles.repeatMealCard}
      glow={!suggestion.alreadyLoggedToday}
    >
      <View style={styles.repeatMealCardTop}>
        <View style={styles.repeatMealBadge}>
          <Text style={styles.repeatMealBadgeText}>{mealLabel}</Text>
        </View>
        <Text style={styles.repeatMealSource}>From {sourceLabel}</Text>
      </View>

      <Text style={styles.repeatMealTitle}>
        {suggestion.alreadyLoggedToday ? `Add ${mealLabel} again` : `Log ${mealLabel} again`}
      </Text>
      <Text style={styles.repeatMealPreview} numberOfLines={2}>
        {preview}
      </Text>

      <View style={styles.repeatMealFooter}>
        <Text style={styles.repeatMealMeta}>
          {suggestion.snapshot.itemCount} items · {Math.round(suggestion.snapshot.totals.protein || 0)}g protein
        </Text>
        <View style={styles.repeatMealAction}>
          {isLoading ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <>
              <Text style={styles.repeatMealActionText}>{actionLabel}</Text>
              <ChevronRight size={16} color={Colors.primary} strokeWidth={2.4} />
            </>
          )}
        </View>
      </View>
    </GlassCard>
  );
});

// Premium Stat Card — GlassCard with blur + border
const StatCard = memo(function StatCard({ icon: Icon, value, label, color, onPress }) {
  return (
    <GlassCard
      onPress={onPress}
      style={styles.statCardGlass}
      glow
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      accessibilityHint={`View ${label.toLowerCase()} details`}
    >
      <View style={styles.statCardInner}>
        <View style={[styles.statIconContainer, { backgroundColor: color + '20' }]}>
          <Icon size={20} color={color} strokeWidth={2.5} />
        </View>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </GlassCard>
  );
});

const ACTIVITY_STEP_GOAL = 10000;

const MovementSnapshotCard = memo(function MovementSnapshotCard({
  isConnected,
  steps,
  activeCalories,
  onPress,
}) {
  const progress = Math.min(steps / ACTIVITY_STEP_GOAL, 1);
  const platformName = Platform.OS === 'ios' ? 'Apple Health' : 'Google Fit';

  return (
    <GlassCard onPress={onPress} style={styles.movementCard} glow={isConnected}>
      <View style={styles.movementHeader}>
        <View style={styles.movementHeaderLeft}>
          <View style={styles.movementIconWrap}>
            <Dumbbell size={18} color={Colors.success} strokeWidth={2.4} />
          </View>
          <View style={styles.movementCopy}>
            <Text style={styles.movementTitle}>Activity</Text>
            <Text style={styles.movementSubtitle}>
              {isConnected
                ? `${Math.round(activeCalories || 0).toLocaleString()} active cal`
                : `Sync ${platformName} for movement`}
            </Text>
          </View>
        </View>
        <Text style={styles.movementValue}>
          {isConnected ? steps.toLocaleString() : 'Connect'}
        </Text>
      </View>

      <View style={styles.movementProgressTrack}>
        <LinearGradient
          colors={isConnected ? ['#22C55E', '#16A34A'] : ['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.06)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[
            styles.movementProgressFill,
            {
              width: isConnected
                ? `${Math.max(progress * 100, steps > 0 ? 10 : 0)}%`
                : '36%',
            },
          ]}
        />
      </View>

      <View style={styles.movementFooter}>
        <Text style={styles.movementGoalText}>
          {isConnected ? `${Math.round(progress * 100)}% of 10k goal` : 'Connect to keep today accurate'}
        </Text>
        <ChevronRight size={16} color={Colors.textTertiary} />
      </View>
    </GlassCard>
  );
});

// Memoized Premium Icon Button — Reanimated (UI thread)
const IconButton = memo(function IconButton({ icon: Icon, color, onPress, size = 40, badge }) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.9, { damping: 12, stiffness: 400 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 8, stiffness: 200 });
  }, [scale]);

  const handlePress = useCallback(async () => {
    await hapticLight();
    onPress?.();
  }, [onPress]);

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      hitSlop={10}
    >
      <ReAnimated.View
        style={[
          styles.iconButton,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          },
          animatedStyle,
        ]}
      >
        <Icon size={size * 0.45} color={color} strokeWidth={2.5} />
        {badge !== undefined && (
          <View style={styles.iconBadge}>
            <Text style={styles.iconBadgeText}>{badge}</Text>
          </View>
        )}
      </ReAnimated.View>
    </Pressable>
  );
});

// Memoized Premium Streak Badge — Reanimated (UI thread) with tier-based visuals
const StreakBadge = memo(function StreakBadge({ streak, tier }) {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (streak > 0) {
      // Faster pulse for higher tiers
      const duration = tier?.tier === 'hellfire' ? 800 : tier?.tier === 'blaze' ? 1200 : 1500;
      scale.value = withRepeat(
        withSequence(
          withTiming(tier?.tier === 'hellfire' ? 1.08 : 1.05, { duration }),
          withTiming(1, { duration }),
        ),
        -1,
        false,
      );
    } else {
      scale.value = 1;
    }
  }, [streak, tier, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const gradientColors = tier?.colors || ['#FF6B35', '#FF8F5A'];

  return (
    <ReAnimated.View style={[styles.streakBadge, animatedStyle]}>
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.streakGradient}
      >
        <Flame size={16} color="#fff" strokeWidth={2.5} />
        <Text style={styles.streakText}>{streak}</Text>
      </LinearGradient>
    </ReAnimated.View>
  );
});

// Supplement Reminder Card for Dashboard
const SupplementReminder = memo(function SupplementReminder({ untakenCount, onPress }) {
  if (untakenCount <= 0) return null;

  return (
    <GlassCard onPress={onPress} style={styles.supplementReminderCard}>
      <View style={styles.supplementReminderContent}>
        <View style={[styles.supplementReminderIcon, { backgroundColor: 'rgba(20, 184, 166, 0.15)' }]}>
          <Pill size={18} color="#14B8A6" />
        </View>
        <View style={styles.supplementReminderText}>
          <Text style={styles.supplementReminderTitle}>
            {untakenCount} supplement{untakenCount !== 1 ? 's' : ''} remaining
          </Text>
          <Text style={styles.supplementReminderSubtitle}>
            Tap to mark as taken
          </Text>
        </View>
        <ChevronRight size={18} color={Colors.textTertiary} />
      </View>
    </GlassCard>
  );
});

// Nutrition Score Badge - small glass pill showing score + grade
const NutritionScoreBadge = memo(function NutritionScoreBadge({ score, grade, gradeColor, onPress }) {
  if (score <= 0) return null;

  return (
    <Pressable onPress={onPress} style={styles.nutritionBadgePressable} hitSlop={8}>
      <LinearGradient
        colors={[gradeColor + '20', gradeColor + '08']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.nutritionBadgeGradient}
      >
        <Award size={14} color={gradeColor} strokeWidth={2.5} />
        <Text style={[styles.nutritionBadgeScore, { color: gradeColor }]}>{score}</Text>
        <View style={[styles.nutritionBadgeGrade, { backgroundColor: gradeColor + '30' }]}>
          <Text style={[styles.nutritionBadgeGradeText, { color: gradeColor }]}>{grade}</Text>
        </View>
        <ChevronRight size={14} color={gradeColor} />
      </LinearGradient>
    </Pressable>
  );
});

// Premium Macros Card — GlassCard with blur + border
const MacrosCard = memo(function MacrosCard({ totals, goals, onPress }) {
  const proteinPercent = useMemo(() => Math.min((totals.protein / goals.protein) * 100, 100), [totals.protein, goals.protein]);
  const carbsPercent = useMemo(() => Math.min((totals.carbs / goals.carbs) * 100, 100), [totals.carbs, goals.carbs]);
  const fatPercent = useMemo(() => Math.min((totals.fat / goals.fat) * 100, 100), [totals.fat, goals.fat]);

  return (
    <GlassCard onPress={onPress} style={styles.macrosCardOuter} glow>
      <View style={styles.macrosHeader}>
        <View style={styles.macrosTitleRow}>
          <Zap size={16} color={ACCENT} />
          <Text style={styles.macrosTitle}>Macros</Text>
        </View>
        <ChevronRight size={18} color={Colors.textTertiary} />
      </View>

      <View style={styles.macrosGrid}>
        {/* Protein */}
        <View style={styles.macroColumn}>
          <View style={[styles.macroDot, { backgroundColor: Colors.protein }]} />
          <Text style={styles.macroValue}>{totals.protein}g</Text>
          <Text style={styles.macroLabel}>Protein</Text>
          <View style={styles.macroProgressTrack}>
            <LinearGradient
              colors={['#FF6B9D', '#FF8A80']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.macroProgressFill, { width: `${proteinPercent}%` }]}
            />
          </View>
        </View>

        {/* Carbs */}
        <View style={styles.macroColumn}>
          <View style={[styles.macroDot, { backgroundColor: Colors.carbs }]} />
          <Text style={styles.macroValue}>{totals.carbs}g</Text>
          <Text style={styles.macroLabel}>Carbs</Text>
          <View style={styles.macroProgressTrack}>
            <LinearGradient
              colors={['#64D2FF', '#5AC8FA']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.macroProgressFill, { width: `${carbsPercent}%` }]}
            />
          </View>
        </View>

        {/* Fat */}
        <View style={styles.macroColumn}>
          <View style={[styles.macroDot, { backgroundColor: Colors.fat }]} />
          <Text style={styles.macroValue}>{totals.fat}g</Text>
          <Text style={styles.macroLabel}>Fat</Text>
          <View style={styles.macroProgressTrack}>
            <LinearGradient
              colors={['#FFD93D', '#FFC107']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.macroProgressFill, { width: `${fatPercent}%` }]}
            />
          </View>
        </View>
      </View>
    </GlassCard>
  );
});

function DashboardScreenInner() {
  usePreload('index');
  const { isPremium } = useIsPremium();
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const startupRecordedRef = useRef(false);
  const {
    state: activationState,
    stage: activationStage,
    progress: activationProgress,
    isLoading: activationLoading,
    showValuePaywall,
  } = useActivationTrackerHook();
  const { hasSeen, markSeen, isLoading: tourLoading } = useTour();
  const {
    totals,
    goals,
    remaining,
    calorieBalance,
    meals,
    mealCalories,
    removeFood,
    addFood,
    isLoading,
    isFetchingDay,
    selectedDate,
    isPlanningMode,
    getDateLabel,
    waterProgress,
    addWater,
    copyMeal,
    getDefaultMealType,
  } = useMeals();
  const { profile } = useProfile();
  const { currentStreak, streakTier } = useGamification();
  const { recordMealLogged, isFasting } = useFasting();
  const {
    isConnected: healthConnected,
    steps: healthSteps,
    weeklySteps: healthWeeklySteps,
    activeCalories: healthActiveCalories,
    connect: healthConnect,
  } = useHealthKit();
  const {
    supplements: userSupplements,
    getUntakenCount,
    isLoading: supplementsLoading,
  } = useSupplements();

  const {
    dailyScore: nutritionScore,
    grade: nutritionGrade,
    gradeColor: nutritionGradeColor,
  } = useNutritionScore();

  const { fitnessScore } = usePredictiveAnalyticsHook();

  const { todaysAverage: moodAverage } = useMood();
  const { scheduleStreakWarning, syncActivationReminder } = useNotifications();

  useEffect(() => {
    recordTodayOpened();
  }, []);

  useEffect(() => {
    if (tourLoading) return;
    if (hasSeen('dashboard')) return;
    markSeen('dashboard').catch(() => {});
  }, [hasSeen, markSeen, tourLoading]);

  // Health sync — feeds Apple Health / Google Fit data into the proactive coach
  const {
    snapshot: healthSnapshot,
    recoveryScore: healthRecoveryScore,
    anomalies: healthAnomalies,
  } = useHealthSync();

  // Friend system — detect broken streaks for social comparison nudges
  const { brokenStreakFriends } = useFriends();
  const friendStreakLoss = useMemo(
    () => brokenStreakFriends.length > 0 ? brokenStreakFriends[0] : null,
    [brokenStreakFriends],
  );

  // Proactive coaching — surfaces health-aware and social nudges via the AI FAB
  const { message: proactiveMessage } = useProactiveCoach({
    friendStreakLoss,
    healthData: healthSnapshot ? {
      steps: healthSnapshot.steps ?? 0,
      activeCalories: healthSnapshot.activeCalories ?? 0,
      sleepMinutes: healthSnapshot.sleepMinutes ?? 0,
      recoveryScore: healthRecoveryScore?.score ?? null,
      anomalies: healthAnomalies ?? [],
    } : null,
  });

  // Reschedule streak warning with actual streak data whenever streak changes
  useEffect(() => {
    if (currentStreak > 0) {
      scheduleStreakWarning(currentStreak, profile?.name);
    }
  }, [currentStreak, profile?.name, scheduleStreakWarning]);

  useEffect(() => {
    if (activationLoading) return;

    const hasStartedActivation =
      activationState.onboardingCompletedAt ||
      activationState.firstFoodLoggedAt ||
      activationState.firstBarcodeFoundAt;

    if (!hasStartedActivation) {
      return;
    }

    syncActivationReminder(activationStage, profile?.name);
  }, [
    activationLoading,
    activationStage,
    activationState.firstBarcodeFoundAt,
    activationState.firstFoodLoggedAt,
    activationState.onboardingCompletedAt,
    profile?.name,
    syncActivationReminder,
  ]);

  // Auto-show share card at streak milestones (7, 30, 100, 365 days)
  useEffect(() => {
    if (!currentStreak || !STREAK_MILESTONES.includes(currentStreak)) return;

    (async () => {
      try {
        const shown = await AsyncStorage.getItem('@fueliq_streak_milestones_shown');
        const shownSet = new Set(shown ? JSON.parse(shown) : []);
        if (shownSet.has(currentStreak)) return;

        // Mark as shown before triggering to prevent race conditions
        shownSet.add(currentStreak);
        await AsyncStorage.setItem(
          '@fueliq_streak_milestones_shown',
          JSON.stringify([...shownSet]),
        );

        // Delay slightly so dashboard loads first
        setTimeout(() => {
          setShareModalType('streak');
          setShareModalData({ streak: currentStreak });
          setShareModalVisible(true);
        }, 1500);
      } catch (e) {
        Sentry.captureException(e);
        // Ignore storage errors
      }
    })();
  }, [currentStreak]);

  // Compute holistic wellness score from available context data
  const wellnessResult = useMemo(() => {
    return calculateWellnessScore({
      nutritionScore: nutritionScore || 50,
      fitnessScore: fitnessScore?.score || 50,
      sleepScore: 50, // default until sleep tracking connected
      recoveryScore: 50, // default until recovery data available
      stressLevel: 5, // default mid-range
      hydrationPercent: waterProgress?.percentage || 50,
      moodScore: moodAverage ? Math.round((moodAverage.energy + moodAverage.focus) / 2) : 5,
      streakDays: currentStreak || 0,
    });
  }, [nutritionScore, fitnessScore, waterProgress, moodAverage, currentStreak]);

  // Modal states
  const [macrosModalVisible, setMacrosModalVisible] = useState(false);
  const [caloriesModalVisible, setCaloriesModalVisible] = useState(false);
  const [exerciseModalVisible, setExerciseModalVisible] = useState(false);
  const [smartCoachVisible, setSmartCoachVisible] = useState(false);
  const [foodDetailVisible, setFoodDetailVisible] = useState(false);
  const [selectedFood, setSelectedFood] = useState(null);
  const [selectedMealType, setSelectedMealType] = useState('snacks');
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [shareModalType, setShareModalType] = useState('daily-summary');
  const [shareModalData, setShareModalData] = useState(null);
  const [showAdvancedInsights, setShowAdvancedInsights] = useState(false);

  // Scroll-driven animation
  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const headerAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(scrollY.value, [0, 100], [1, 0], Extrapolation.CLAMP);
    const translateY = interpolate(scrollY.value, [0, 100], [0, -30], Extrapolation.CLAMP);
    const scale = interpolate(scrollY.value, [0, 100], [1, 0.95], Extrapolation.CLAMP);
    return { opacity, transform: [{ translateY }, { scale }] };
  });

  // Parallax depth effect on stat cards — creates floating glass layering on scroll
  const statCardsParallaxStyle = useAnimatedStyle(() => {
    const translateY = interpolate(scrollY.value, [0, 300], [0, -12], Extrapolation.CLAMP);
    return { transform: [{ translateY }] };
  });

  // Previous calories ref for change detection (LayoutAnimation removed — blocks native driver)
  const prevCaloriesRef = useRef(totals.calories);
  useEffect(() => {
    prevCaloriesRef.current = totals.calories;
  }, [totals.calories]);

  const isNavigatingRef = useRef(false);
  const repeatShelfSeenRef = useRef('');
  const [activeRepeatSuggestionId, setActiveRepeatSuggestionId] = useState(null);

  useEffect(() => {
    if (repeatSuggestions.length === 0) {
      return;
    }

    const signature = `${selectedDateKey}:${repeatSuggestions
      .map((suggestion) => `${suggestion.snapshot.id}:${suggestion.alreadyLoggedToday ? 1 : 0}`)
      .join('|')}`;

    if (repeatShelfSeenRef.current === signature) {
      return;
    }

    repeatShelfSeenRef.current = signature;
    trackEvent('engagement', 'repeat_shelf_seen', {
      value: repeatSuggestions.length,
      metadata: {
        dateKey: selectedDateKey,
        mealTypes: repeatSuggestions.map((suggestion) => suggestion.targetMealType),
      },
    });
  }, [repeatSuggestions, selectedDateKey]);

  const handleAddFood = useCallback(async (mealType) => {
    if (isNavigatingRef.current) return;
    isNavigatingRef.current = true;
    await hapticLight();
    router.push({
      pathname: '/add',
      params: { meal: mealType },
    });
    setTimeout(() => { isNavigatingRef.current = false; }, 1000);
  }, [router]);

  const handleRemoveFood = useCallback((logId, mealType) => {
    Alert.alert(
      'Remove Item',
      'Are you sure you want to remove this item?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await hapticWarning();
            removeFood(logId, mealType);
          },
        },
      ]
    );
  }, [removeFood]);

  const handleSmartCoachPress = useCallback(async () => {
    await hapticLight();
    setSmartCoachVisible(true);
  }, []);

  const handleTrainerPress = useCallback(() => {
    router.push('/generate-workout');
  }, [router]);

  const handleChefPress = useCallback(() => {
    router.push('/chef');
  }, [router]);

  const handleMealPlanPress = useCallback(() => {
    router.push('/meal-plan');
  }, [router]);

  const handleSupplementsPress = useCallback(() => {
    router.push('/supplements');
  }, [router]);

  const handleNutritionInsightsPress = useCallback(() => {
    router.push('/nutrition-insights');
  }, [router]);

  const untakenSupplementCount = useMemo(() => getUntakenCount(), [getUntakenCount]);

  const handleWaterCardPress = useCallback(async () => {
    await hapticLight();
    router.push('/water-tracker');
  }, [router]);

  const handleScannerPress = useCallback(async () => {
    await hapticLight();
    router.push('/barcode');
  }, [router]);

  const handleActivationPress = useCallback(() => {
    if (activationStage === 'first_barcode') {
      handleScannerPress();
      return;
    }

    router.push('/(tabs)/add');
  }, [activationStage, handleScannerPress, router]);

  const handleValuePaywallPress = useCallback(() => {
    router.push({
      pathname: '/paywall',
      params: {
        source: 'after_value',
        trigger: 'after_value',
      },
    });
  }, [router]);

  const handleMovementPress = useCallback(async () => {
    await hapticLight();

    if (!healthConnected) {
      healthConnect?.();
      return;
    }

    router.push('/wearable-connections');
  }, [healthConnected, healthConnect, router]);

  const handleQuickWaterLog = useCallback(async () => {
    await hapticLight();
    await addWater(250);
  }, [addWater]);

  const handleAIChatPress = useCallback(async () => {
    await hapticImpact();
    router.push('/chat');
  }, [router]);

  const handleToggleAdvancedInsights = useCallback(async () => {
    await hapticLight();
    setShowAdvancedInsights((current) => !current);
  }, []);

  const handleOpenImportSwitcher = useCallback(async () => {
    await hapticLight();
    router.push({
      pathname: '/import-myfitnesspal',
      params: {
        source: 'dashboard_empty_state',
      },
    });
  }, [router]);

  const handleLogAgainSuggestion = useCallback(async (suggestion) => {
    const actionId = `${suggestion.snapshot.id}:${suggestion.targetMealType}`;
    if (activeRepeatSuggestionId) {
      return;
    }

    setActiveRepeatSuggestionId(actionId);
    trackEvent('engagement', 'repeat_shelf_tapped', {
      metadata: {
        dateKey: selectedDateKey,
        sourceDateKey: suggestion.snapshot.dateKey,
        sourceMealType: suggestion.snapshot.mealType,
        targetMealType: suggestion.targetMealType,
        daysSinceSource: suggestion.daysSinceSource,
      },
    });

    try {
      const copiedCount = await copyMeal(
        suggestion.snapshot.dateKey,
        suggestion.snapshot.mealType,
        selectedDateKey,
        suggestion.targetMealType,
        suggestion.snapshot.items
      );

      if (copiedCount > 0) {
        recordQuickAddUsed({
          source: 'repeat_shelf',
          mealType: suggestion.targetMealType,
          itemCount: copiedCount,
        });
        await recordRepeatLogUsed({
          source: 'repeat_shelf',
          mealType: suggestion.targetMealType,
          itemCount: copiedCount,
        });
        if (!isPlanningMode) {
          recordMealLogged(suggestion.targetMealType);
        }
        trackEvent('engagement', 'repeat_shelf_logged', {
          value: copiedCount,
          metadata: {
            dateKey: selectedDateKey,
            sourceDateKey: suggestion.snapshot.dateKey,
            sourceMealType: suggestion.snapshot.mealType,
            targetMealType: suggestion.targetMealType,
            daysSinceSource: suggestion.daysSinceSource,
          },
        });
      }
    } catch (error) {
      Sentry.captureException(error);
      Alert.alert('Could Not Log Meal', 'Please try again.');
    } finally {
      setActiveRepeatSuggestionId(null);
    }
  }, [activeRepeatSuggestionId, copyMeal, isPlanningMode, recordMealLogged, selectedDateKey]);

  // Share card data for the ShareCardModal
  const shareCardData = useMemo(() => ({
    caloriesConsumed: totals.calories,
    caloriesGoal: calorieBalance?.effectiveGoal || goals.calories,
    protein: totals.protein,
    proteinGoal: goals.protein,
    carbs: totals.carbs,
    carbsGoal: goals.carbs,
    fat: totals.fat,
    fatGoal: goals.fat,
    streak: currentStreak,
    date: selectedDate,
  }), [totals, goals, calorieBalance, currentStreak, selectedDate]);

  const handleSelectRecommendedMeal = useCallback((food, mealType) => {
    setSelectedFood(food);
    setSelectedMealType(mealType);
    setSmartCoachVisible(false);
    setFoodDetailVisible(true);
  }, []);

  const handleConfirmFood = useCallback(async (foodWithQuantity, mealType) => {
    await hapticSuccess();
    addFood(foodWithQuantity, mealType);
    if (!isPlanningMode) {
      recordMealLogged(mealType);
    }
    setFoodDetailVisible(false);
    setSelectedFood(null);
  }, [addFood, isPlanningMode, recordMealLogged]);

  // Modal open/close handlers (stable refs)
  const handleOpenCaloriesModal = useCallback(() => setCaloriesModalVisible(true), []);
  const handleCloseCaloriesModal = useCallback(() => setCaloriesModalVisible(false), []);
  const handleOpenMacrosModal = useCallback(() => setMacrosModalVisible(true), []);
  const handleCloseMacrosModal = useCallback(() => setMacrosModalVisible(false), []);
  const handleCloseExerciseModal = useCallback(() => setExerciseModalVisible(false), []);
  const handleCloseSmartCoach = useCallback(() => setSmartCoachVisible(false), []);
  const handleCloseFoodDetail = useCallback(() => {
    setFoodDetailVisible(false);
    setSelectedFood(null);
  }, []);
  const handleCloseShareModal = useCallback(() => {
    setShareModalVisible(false);
    setShareModalType('daily-summary');
    setShareModalData(null);
  }, []);

  // Calculate stats
  const caloriesConsumed = totals.calories;
  const caloriesGoal = calorieBalance?.effectiveGoal || goals.calories;
  const caloriesRemaining = Math.max(0, caloriesGoal - caloriesConsumed);
  const formattedDate = useMemo(() => getFormattedDate(selectedDate), [selectedDate]);
  const hasLoggedMealsToday = useMemo(
    () => Object.values(meals || {}).some((mealItems) => Array.isArray(mealItems) && mealItems.length > 0),
    [meals]
  );
  const showImportSwitcherCard = !activationLoading && activationStage === 'first_meal' && !hasLoggedMealsToday;

  const { digest: weeklyDigest } = useWeeklyDigest();
  const { recentMeals: recentMealSnapshots } = useRecentMealSnapshots(20);
  const { recommendation: macroRec, applyRecommendation, dismissRecommendation } = useAdaptiveMacros();
  const {
    challenges: dailyChallenges,
    isLoading: challengesLoading,
    checkProgress: checkChallengeProgress,
    completeChallenge: completeDailyChallenge,
    completedCount: challengesCompletedCount,
    totalCount: challengesTotalCount,
    allComplete: allChallengesComplete,
  } = useDailyChallenges();

  const smartNudge = useMemo(() => getSmartNudge({
    todayCalories: totals?.calories || 0,
    calorieGoal: goals?.calories || 0,
    todayProtein: totals?.protein || 0,
    proteinGoal: goals?.protein || 0,
    isFasting: isFasting,
    currentStreak: currentStreak || 0,
    waterPercentage: waterProgress?.percentage || 0,
  }), [totals, goals, isFasting, currentStreak, waterProgress]);
  const selectedDateKey = useMemo(() => format(selectedDate, 'yyyy-MM-dd'), [selectedDate]);
  const isSelectedDateToday = useMemo(
    () => selectedDateKey === format(new Date(), 'yyyy-MM-dd'),
    [selectedDateKey]
  );
  const repeatSuggestions = useMemo(
    () => buildRepeatMealSuggestions({
      snapshots: recentMealSnapshots,
      selectedDateKey,
      currentMeals: meals,
      preferredMealType: getDefaultMealType(),
      limit: 3,
    }),
    [getDefaultMealType, meals, recentMealSnapshots, selectedDateKey]
  );

  const primarySections = useMemo(() => {
    const sections = [
      { key: 'header' },
      { key: 'focus' },
    ];

    if (!activationLoading && activationStage !== 'complete') {
      sections.push({ key: 'activation' });
    }

    if (showImportSwitcherCard) {
      sections.push({ key: 'importSwitcher' });
    }

    sections.push({ key: 'quickLog' });

    if (repeatSuggestions.length > 0) {
      sections.push({ key: 'logAgain' });
    }

    sections.push(
      { key: 'stats' },
      { key: 'meals' },
      { key: 'activity' },
    );

    if (showValuePaywall && !isPremium) {
      sections.push({ key: 'valuePaywall' });
    }

    sections.push({ key: 'insightsToggle' });
    return sections;
  }, [
    activationLoading,
    activationStage,
    isPremium,
    repeatSuggestions.length,
    showImportSwitcherCard,
    showValuePaywall,
  ]);

  const advancedSections = useMemo(() => {
    if (!showAdvancedInsights) {
      return [];
    }

    const sections = [];
    if (smartNudge) sections.push({ key: 'nudge' });
    sections.push(
      { key: 'daySummary' },
      { key: 'macros' },
      { key: 'wellnessScore' },
    );
    if (weeklyDigest) sections.push({ key: 'digest' });
    if (macroRec && macroRec.shouldAdjust) sections.push({ key: 'macroAdapt' });
    sections.push({ key: 'challenges' });
    if (nutritionScore > 0) sections.push({ key: 'nutritionScore' });
    if (!supplementsLoading && userSupplements.length > 0 && untakenSupplementCount > 0) {
      sections.push({ key: 'supplements' });
    }
    sections.push(
      { key: 'actionCards' },
      { key: 'streakRepair' },
      { key: 'contextual' },
      { key: 'health' },
    );
    if (fitnessScore && fitnessScore.score > 0) sections.push({ key: 'fitnessScore' });
    sections.push({ key: 'bioFeedback' });
    return sections;
  }, [
    showAdvancedInsights,
    smartNudge,
    weeklyDigest,
    macroRec,
    nutritionScore,
    supplementsLoading,
    userSupplements.length,
    untakenSupplementCount,
    fitnessScore,
  ]);

  // Build virtualized section data — prioritize the core logging flow before deeper insights
  const dashboardSections = useMemo(() => {
    return [...primarySections, ...advancedSections, { key: 'spacer' }];
  }, [primarySections, advancedSections]);

  useEffect(() => {
    if (startupRecordedRef.current) return;
    if (isLoading) return;

    startupRecordedRef.current = true;
    recordAppInteractive({
      screen: 'dashboard',
      activationStage,
      hasLoggedMealsToday,
      selectedDateKey,
    });
  }, [activationStage, hasLoggedMealsToday, isLoading, selectedDateKey]);

  const sectionKeyExtractor = useCallback((item) => item.key, []);

  const renderDashboardSection = useCallback(({ item, index }) => {
    // Stagger entering animation: first 6 items get incremental delay, rest animate on mount
    const delay = index < 6 ? index * 60 : 0;
    const entering = reduceMotion ? undefined : FadeInDown.delay(delay).springify().damping(12);

    switch (item.key) {
      case 'header': {
        const firstName = profile?.name?.split(' ')[0] || '';
        const greeting = firstName ? `${getGreeting()}, ${firstName}` : getGreeting();
        const caloriePercent = Math.min(caloriesConsumed / caloriesGoal, 1);
        return (
          <ReAnimated.View entering={entering} style={[styles.header, headerAnimatedStyle]}>
            {/* Top bar: greeting + actions */}
            <View style={styles.headerTopBar}>
              <View style={styles.headerLeft}>
                <Text style={styles.welcomeText}>{greeting}</Text>
                <Text style={styles.dateTextSub}>{formattedDate}</Text>
              </View>
              <View style={styles.headerRight}>
                <View style={styles.headerActions}>
                  <IconButton icon={ScanBarcode} color={ACCENT} onPress={handleScannerPress} />
                </View>
                <StreakBadge streak={currentStreak} tier={streakTier} />
              </View>
            </View>

            {/* Hero calorie ring — the "wow" centerpiece */}
            <Pressable onPress={handleOpenCaloriesModal} style={styles.heroRingContainer}>
              {/* Ambient glow behind ring */}
              <View style={styles.heroGlow} />
              <AnimatedProgressRing
                progress={caloriePercent * 100}
                size={140}
                strokeWidth={10}
                color={caloriePercent >= 1 ? Colors.warning : ACCENT}
              />
              <View style={styles.heroRingInner}>
                <Text style={styles.heroCalorieValue}>{caloriesConsumed.toLocaleString()}</Text>
                <Text style={styles.heroCalorieLabel}>of {caloriesGoal.toLocaleString()} kcal</Text>
              </View>
              <Text style={styles.heroRemainingText}>{caloriesRemaining.toLocaleString()} remaining</Text>
            </Pressable>
          </ReAnimated.View>
        );
      }
      case 'focus':
        return (
          <ReAnimated.View entering={entering}>
            <TodayFocusCard
              meals={meals}
              goals={goals}
              totals={totals}
              waterProgress={waterProgress}
              selectedDate={selectedDate}
              onLogMeal={handleAddFood}
              onOpenScanner={handleScannerPress}
              onLogWater={handleQuickWaterLog}
              onOpenCoach={handleSmartCoachPress}
            />
          </ReAnimated.View>
        );
      case 'activation':
        return (
          <ReAnimated.View entering={entering}>
            <ActivationCard
              stage={activationStage}
              progress={activationProgress}
              onPrimaryPress={handleActivationPress}
            />
          </ReAnimated.View>
        );
      case 'importSwitcher':
        return (
          <ReAnimated.View entering={entering}>
            <MyFitnessPalImportCard
              eyebrow="Switch Faster"
              title="Already logging in MyFitnessPal?"
              body="Import your diary before you build today from scratch."
              buttonLabel="Import MyFitnessPal diary"
              onPress={handleOpenImportSwitcher}
              style={styles.importSwitcherCard}
            />
          </ReAnimated.View>
        );
      case 'logAgain':
        return (
          <ReAnimated.View entering={entering}>
            <View style={styles.sectionHeader}>
              <View style={styles.repeatShelfHeaderRow}>
                <View style={styles.repeatShelfIconWrap}>
                  <RotateCcw size={16} color={Colors.primary} strokeWidth={2.5} />
                </View>
                <Text style={styles.sectionTitle}>
                  {isSelectedDateToday ? 'Log Again Today' : 'Log Again'}
                </Text>
              </View>
              <Text style={styles.repeatShelfSubtitle}>
                Reuse the meals you actually eat most, without searching again.
              </Text>
            </View>

            <View style={styles.repeatShelfList}>
              {repeatSuggestions.map((suggestion) => {
                const actionId = `${suggestion.snapshot.id}:${suggestion.targetMealType}`;
                return (
                  <RepeatMealCard
                    key={actionId}
                    suggestion={suggestion}
                    isLoading={activeRepeatSuggestionId === actionId}
                    onPress={handleLogAgainSuggestion}
                  />
                );
              })}
            </View>
          </ReAnimated.View>
        );
      case 'wellnessScore': {
        const wsColor = wellnessResult.score >= 70 ? Colors.success : wellnessResult.score >= 40 ? Colors.warning : Colors.error;
        return (
          <ReAnimated.View entering={entering}>
            <GlassCard style={styles.wellnessScoreCard} glow>
              <View style={styles.wellnessScoreRow}>
                <View style={styles.wellnessScoreRingWrap}>
                  <AnimatedProgressRing
                    progress={wellnessResult.score}
                    size={80}
                    strokeWidth={8}
                    color={wsColor}
                  />
                  <View style={styles.wellnessScoreCenter}>
                    <Text style={[styles.wellnessScoreNumber, { color: wsColor }]}>{wellnessResult.score}</Text>
                  </View>
                </View>
                <View style={styles.wellnessScoreInfo}>
                  <Text style={styles.wellnessScoreLabel}>Wellness Score</Text>
                  <Text style={[styles.wellnessScoreLevel, { color: wsColor }]}>{wellnessResult.level}</Text>
                </View>
              </View>
            </GlassCard>
          </ReAnimated.View>
        );
      }
      case 'nudge':
        return (
          <SmartNudge
            title={smartNudge.title}
            body={smartNudge.body}
            actionLabel={smartNudge.actionLabel}
            onAction={smartNudge.action === 'logFood' ? () => router.push('/(tabs)/add') : smartNudge.action === 'logWater' ? () => addWater(250) : undefined}
          />
        );
      case 'digest':
        return <DigestCard digest={weeklyDigest} />;
      case 'macroAdapt':
        return (
          <MacroAdaptCard
            recommendation={macroRec}
            onApply={applyRecommendation}
            onDismiss={dismissRecommendation}
          />
        );
      case 'challenges':
        return (
          <DailyChallengeCard
            challenges={dailyChallenges}
            isLoading={challengesLoading}
            completedCount={challengesCompletedCount}
            totalCount={challengesTotalCount}
            allComplete={allChallengesComplete}
            onCheckProgress={checkChallengeProgress}
            onCompleteChallenge={completeDailyChallenge}
          />
        );
      case 'stats':
        return (
          <ReAnimated.View entering={entering} style={[styles.statsRow, statCardsParallaxStyle]}>
            <StatCard icon={Flame} value={caloriesConsumed.toLocaleString()} label="Calories" color="#FF6B35" onPress={handleOpenCaloriesModal} />
            <StatCard icon={Target} value={`${Math.round(totals.protein || 0)}g`} label="Protein" color={Colors.protein} onPress={handleOpenMacrosModal} />
          </ReAnimated.View>
        );
      case 'nutritionScore':
        return (
          <ReAnimated.View entering={entering} style={styles.nutritionBadgeContainer}>
            <NutritionScoreBadge score={nutritionScore} grade={nutritionGrade} gradeColor={nutritionGradeColor} onPress={handleNutritionInsightsPress} />
          </ReAnimated.View>
        );
      case 'supplements':
        return (
          <ReAnimated.View entering={entering}>
            <SupplementReminder untakenCount={untakenSupplementCount} onPress={handleSupplementsPress} />
          </ReAnimated.View>
        );
      case 'actionCards':
        return (
          <ReAnimated.View entering={entering} style={styles.actionCardsContainer}>
            <ActionCard icon={Dumbbell} title="AI Personal Trainer" subtitle="Generate custom workouts" gradientColors={[ACCENT, ACCENT_DIM]} onPress={handleTrainerPress} badge="PRO" />
            <ActionCard icon={ChefHat} title="Macro Chef" subtitle="Scan fridge for recipes" gradientColors={['#FF8C32', '#FF5A1E']} onPress={handleChefPress} badge="PRO" />
            <ActionCard icon={ChefHat} title="AI Meal Plan" subtitle="3-day plan built for your goals" gradientColors={['#10B981', '#059669']} onPress={handleMealPlanPress} badge="NEW" />
          </ReAnimated.View>
        );
      case 'quickLog':
        return <ReAnimated.View entering={entering}><QuickLog /></ReAnimated.View>;
      case 'streakRepair':
        return <ReAnimated.View entering={entering}><StreakRepairCard /></ReAnimated.View>;
      case 'contextual':
        return <ReAnimated.View entering={entering}><ContextualCards /></ReAnimated.View>;
      case 'daySummary':
        return (
          <ReAnimated.View entering={entering}>
            <DaySummary
              consumed={totals.calories}
              goal={calorieBalance?.effectiveGoal || goals.calories}
              remaining={remaining.calories}
              burned={calorieBalance?.burned || 0}
              streak={currentStreak}
              onPress={handleOpenCaloriesModal}
            />
          </ReAnimated.View>
        );
      case 'macros':
        return (
          <ReAnimated.View entering={entering}>
            <MacrosCard totals={totals} goals={goals} onPress={handleOpenMacrosModal} />
          </ReAnimated.View>
        );
      case 'meals':
        return (
          <ReAnimated.View entering={entering}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{getDateLabel(selectedDate)}'s Meals</Text>
            </View>
            <MealSection mealType="breakfast" items={meals.breakfast} calories={mealCalories.breakfast} onAddPress={handleAddFood} onRemoveFood={handleRemoveFood} />
            <MealSection mealType="lunch" items={meals.lunch} calories={mealCalories.lunch} onAddPress={handleAddFood} onRemoveFood={handleRemoveFood} />
            <MealSection mealType="dinner" items={meals.dinner} calories={mealCalories.dinner} onAddPress={handleAddFood} onRemoveFood={handleRemoveFood} />
            <MealSection mealType="snacks" items={meals.snacks} calories={mealCalories.snacks} onAddPress={handleAddFood} onRemoveFood={handleRemoveFood} />
          </ReAnimated.View>
        );
      case 'activity':
        return (
          <ReAnimated.View entering={entering}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Hydration & Movement</Text>
            </View>
            <View style={styles.activityGrid}>
              <Pressable onPress={handleWaterCardPress} accessibilityLabel="Open water tracker">
                <WaterCard />
              </Pressable>
              <MovementSnapshotCard
                isConnected={healthConnected}
                steps={healthSteps}
                activeCalories={healthActiveCalories}
                onPress={handleMovementPress}
              />
            </View>
          </ReAnimated.View>
        );
      case 'valuePaywall':
        return (
          <ReAnimated.View entering={entering}>
            <UpgradeMomentumCard onPress={handleValuePaywallPress} />
          </ReAnimated.View>
        );
      case 'insightsToggle':
        return (
          <ReAnimated.View entering={entering}>
            <GlassCard onPress={handleToggleAdvancedInsights} style={styles.insightsToggleCard}>
              <View style={styles.insightsToggleRow}>
                <View style={styles.insightsToggleCopy}>
                  <Text style={styles.insightsToggleEyebrow}>More Depth</Text>
                  <Text style={styles.insightsToggleTitle}>
                    {showAdvancedInsights ? 'Hide advanced insights' : 'Open coaching, trends and recovery'}
                  </Text>
                  <Text style={styles.insightsToggleBody}>
                    {showAdvancedInsights
                      ? 'Collapse the secondary stack and keep Today focused on logging and progress.'
                      : 'Everything beyond the core daily loop lives here once you want more depth.'}
                  </Text>
                </View>
                <View style={styles.insightsToggleIcon}>
                  {showAdvancedInsights ? (
                    <ChevronUp size={20} color={Colors.textSecondary} strokeWidth={2.5} />
                  ) : (
                    <ChevronDown size={20} color={Colors.textSecondary} strokeWidth={2.5} />
                  )}
                </View>
              </View>
            </GlassCard>
          </ReAnimated.View>
        );
      case 'health':
        return (
          <ReAnimated.View entering={entering} style={styles.healthCardContainer}>
            <HealthCard isConnected={healthConnected} steps={healthSteps} activeCalories={healthActiveCalories} weeklySteps={healthWeeklySteps} onConnect={healthConnect} />
          </ReAnimated.View>
        );
      case 'fitnessScore':
        return (
          <ReAnimated.View entering={entering}>
            <GlassCard style={styles.fitnessScoreCard} glow>
              <View style={styles.fitnessScoreRow}>
                <View style={styles.fitnessScoreLeft}>
                  <AnimatedProgressRing
                    progress={fitnessScore.score}
                    size={72}
                    strokeWidth={7}
                    color={fitnessScore.score >= 70 ? Colors.success : fitnessScore.score >= 40 ? Colors.warning : Colors.error}
                  />
                </View>
                <View style={styles.fitnessScoreRight}>
                  <Text style={styles.fitnessScoreTitle}>Fitness Score</Text>
                  <Text style={styles.fitnessScoreValue}>{fitnessScore.score}<Text style={styles.fitnessScoreMax}>/100</Text></Text>
                  <Text style={styles.fitnessScoreLevel}>{fitnessScore.level || 'Getting Started'}</Text>
                </View>
              </View>
            </GlassCard>
          </ReAnimated.View>
        );
      case 'bioFeedback':
        return (
          <ReAnimated.View entering={entering}>
            <View style={styles.bioFeedbackContainer}><BioFeedbackCard /></View>
          </ReAnimated.View>
        );
      case 'spacer':
        return <View style={styles.bottomSpacer} />;
      default:
        return null;
    }
  }, [
    reduceMotion, headerAnimatedStyle, statCardsParallaxStyle, formattedDate, currentStreak, wellnessResult, smartNudge, weeklyDigest,
    macroRec, applyRecommendation, dismissRecommendation, dailyChallenges,
    challengesLoading, challengesCompletedCount, challengesTotalCount,
    allChallengesComplete, checkChallengeProgress, completeDailyChallenge,
    caloriesConsumed, caloriesGoal, totals, goals, caloriesRemaining, nutritionScore, profile, streakTier,
    nutritionGrade, nutritionGradeColor, untakenSupplementCount, meals,
    mealCalories, remaining, calorieBalance, selectedDate, getDateLabel,
    fitnessScore, healthConnected, healthSteps, healthActiveCalories,
    healthWeeklySteps, healthConnect, router, addWater,
    handleOpenCaloriesModal, handleOpenMacrosModal, handleNutritionInsightsPress,
    handleSupplementsPress, handleTrainerPress, handleChefPress, handleMealPlanPress,
    handleAddFood, handleRemoveFood, handleWaterCardPress, handleScannerPress,
    handleQuickWaterLog, handleSmartCoachPress, handleToggleAdvancedInsights, showAdvancedInsights, handleMovementPress,
    activationStage, activationProgress, handleActivationPress, handleOpenImportSwitcher, handleValuePaywallPress,
    handleLogAgainSuggestion, activeRepeatSuggestionId,
    isSelectedDateToday, repeatSuggestions, waterProgress,
  ]);

  return (
    <ScreenWrapper style={styles.safeArea} testID="dashboard-screen">
        {/* Ambient living background */}
        {!reduceMotion && <AmbientOrbs />}

        {/* Date Navigator */}
        <DateNavigator />

        {/* Fetching Day Data Indicator */}
        {(isLoading || isFetchingDay) && (
          <View style={styles.fetchingIndicator}>
            <ActivityIndicator size="small" color={ACCENT} />
            <Text style={styles.fetchingText}>
              {isLoading ? 'Getting today ready' : 'Refreshing today'}
            </Text>
          </View>
        )}

        <ReAnimated.FlatList
          data={dashboardSections}
          keyExtractor={sectionKeyExtractor}
          renderItem={renderDashboardSection}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          onScroll={scrollHandler}
          scrollEventThrottle={reduceMotion ? 32 : 16}
          initialNumToRender={6}
          maxToRenderPerBatch={3}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'android'}
        />

      {/* Modals */}
      <MacrosModal
        visible={macrosModalVisible}
        onClose={handleCloseMacrosModal}
      />
      <CaloriesModal
        visible={caloriesModalVisible}
        onClose={handleCloseCaloriesModal}
      />
      <ExerciseModal
        visible={exerciseModalVisible}
        onClose={handleCloseExerciseModal}
      />
      <SmartCoachModal
        visible={smartCoachVisible}
        onClose={handleCloseSmartCoach}
        onSelectMeal={handleSelectRecommendedMeal}
      />
      <FoodDetailModal
        visible={foodDetailVisible}
        food={selectedFood}
        mealType={selectedMealType}
        onClose={handleCloseFoodDetail}
        onConfirm={handleConfirmFood}
      />

      {/* Share Card Modal */}
      <ShareCardModal
        visible={shareModalVisible}
        onClose={handleCloseShareModal}
        type={shareModalType}
        data={shareModalData || shareCardData}
      />

      {/* Floating AI Chat Button with breathing glow (premium only) */}
      {isPremium && showAdvancedInsights && (
        <ReAnimated.View entering={reduceMotion ? undefined : FadeInUp.delay(800).springify().damping(12)} style={styles.fabContainer}>
          <AIFab
            onPress={handleAIChatPress}
            hasProactiveMessage={!!proactiveMessage}
            proactivePreview={proactiveMessage?.preview}
          />
        </ReAnimated.View>
      )}

    </ScreenWrapper>
  );
}

// Ambient orb styles (separate to keep main styles clean)
const ambientStyles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  orb1: {
    position: 'absolute',
    top: -60,
    left: -80,
    width: 280,
    height: 280,
    borderRadius: 140,
  },
  orb2: {
    position: 'absolute',
    top: 120,
    right: -100,
    width: 240,
    height: 240,
    borderRadius: 120,
  },
  orbGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  fetchingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.03)',
    marginHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  fetchingText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },

  // Cinematic Hero Header
  header: {
    marginBottom: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  headerTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.lg,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    alignItems: 'flex-end',
    gap: Spacing.sm,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  welcomeText: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    letterSpacing: -0.3,
  },
  dateTextSub: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    marginTop: 2,
    letterSpacing: 0.3,
  },
  // Hero calorie ring
  heroRingContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  heroGlow: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: Colors.primaryGlow,
    top: 0,
    opacity: 0.15,
  },
  heroRingInner: {
    position: 'absolute',
    top: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    width: 140,
    height: 140,
  },
  heroCalorieValue: {
    fontSize: 36,
    fontWeight: FontWeight.black,
    color: Colors.text,
    letterSpacing: -1,
  },
  heroCalorieLabel: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  heroRemainingText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
    fontWeight: FontWeight.medium,
  },

  // Icon Button
  iconButton: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  iconBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: Colors.error,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  iconBadgeText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },

  // Streak Badge
  streakBadge: {
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  streakGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    gap: 4,
  },
  streakText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  statCardGlass: {
    flex: 1,
  },
  statCardInner: {
    alignItems: 'center',
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  statValue: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Nutrition Score Badge
  nutritionBadgeContainer: {
    marginBottom: Spacing.md,
    alignItems: 'flex-start',
  },
  nutritionBadgePressable: {
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  nutritionBadgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  nutritionBadgeScore: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  nutritionBadgeGrade: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: BorderRadius.xs,
  },
  nutritionBadgeGradeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.black,
    letterSpacing: 0.5,
  },

  // Action Cards
  actionCardsContainer: {
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },

  // Premium Macros Card (uses GlassCard wrapper)
  macrosCardOuter: {
    marginBottom: Spacing.lg,
  },
  macrosHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  macrosTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  macrosTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  macrosGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  macroColumn: {
    flex: 1,
    alignItems: 'center',
  },
  macroDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginBottom: Spacing.xs,
  },
  macroValue: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  macroLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
    marginBottom: Spacing.sm,
  },
  macroProgressTrack: {
    width: '80%',
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  macroProgressFill: {
    height: '100%',
    borderRadius: 2,
  },

  // Section Headers
  sectionHeader: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  repeatShelfHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  repeatShelfIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary + '16',
    borderWidth: 1,
    borderColor: Colors.primary + '28',
  },
  repeatShelfSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginTop: 6,
  },
  repeatShelfList: {
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  repeatMealCard: {
    paddingVertical: Spacing.md,
  },
  repeatMealCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  repeatMealBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.surfaceGlass,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
  },
  repeatMealBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  repeatMealSource: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    fontWeight: FontWeight.medium,
  },
  repeatMealTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginTop: Spacing.sm,
  },
  repeatMealPreview: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginTop: 6,
  },
  repeatMealFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  repeatMealMeta: {
    flex: 1,
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    fontWeight: FontWeight.medium,
  },
  repeatMealAction: {
    minWidth: 110,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  repeatMealActionText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  importSwitcherCard: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    letterSpacing: -0.3,
  },
  insightsToggleCard: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  insightsToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  insightsToggleCopy: {
    flex: 1,
    gap: 4,
  },
  insightsToggleEyebrow: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  insightsToggleTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  insightsToggleBody: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  insightsToggleIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },

  // Activity Grid
  activityGrid: {
    gap: Spacing.md,
  },
  movementCard: {
    marginBottom: Spacing.xs,
  },
  movementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  movementHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  movementIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
  },
  movementCopy: {
    flex: 1,
  },
  movementTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  movementSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  movementValue: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.black,
    color: Colors.text,
    letterSpacing: -0.4,
  },
  movementProgressTrack: {
    height: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    marginTop: Spacing.md,
  },
  movementProgressFill: {
    height: '100%',
    borderRadius: BorderRadius.full,
  },
  movementFooter: {
    marginTop: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  movementGoalText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },

  // Health Card
  healthCardContainer: {
    marginTop: Spacing.md,
  },

  // Bio Feedback
  bioFeedbackContainer: {
    marginTop: Spacing.lg,
  },

  // Supplement Reminder
  supplementReminderCard: {
    marginBottom: Spacing.md,
  },
  supplementReminderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  supplementReminderIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  supplementReminderText: {
    flex: 1,
  },
  supplementReminderTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  supplementReminderSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: 2,
  },

  // Fitness Score Card
  fitnessScoreCard: {
    marginBottom: Spacing.md,
  },
  fitnessScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  fitnessScoreLeft: {
    alignItems: 'center',
  },
  fitnessScoreRight: {
    flex: 1,
  },
  fitnessScoreTitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  fitnessScoreValue: {
    fontSize: 32,
    fontWeight: FontWeight.black,
    color: Colors.text,
    marginTop: 2,
  },
  fitnessScoreMax: {
    fontSize: FontSize.md,
    color: Colors.textTertiary,
    fontWeight: FontWeight.medium,
  },
  fitnessScoreLevel: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
    marginTop: 2,
  },

  // Wellness Score Card
  wellnessScoreCard: {
    marginBottom: Spacing.lg,
  },
  wellnessScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  wellnessScoreRingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  wellnessScoreCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wellnessScoreNumber: {
    fontSize: 22,
    fontWeight: FontWeight.black,
  },
  wellnessScoreInfo: {
    flex: 1,
  },
  wellnessScoreLabel: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  wellnessScoreLevel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    marginTop: 4,
  },

  // Bottom Spacer
  bottomSpacer: {
    height: 140,
  },

  // Floating AI Chat Button
  fabContainer: {
    position: 'absolute',
    bottom: 100,
    right: Spacing.md,
    zIndex: 100,
  },
});

export default function DashboardScreen(props) {
  return (
    <ScreenErrorBoundary screenName="DashboardScreen">
      <DashboardScreenInner {...props} />
    </ScreenErrorBoundary>
  );
}

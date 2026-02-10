/**
 * VibeFit Dashboard - Premium Dark Mode
 *
 * Features:
 * - Deep black background with Electric Blue accents
 * - Glassmorphism stat cards
 * - Large gradient action cards
 * - Cinematic animations
 */

import React, { useState, useEffect, useCallback, useRef, memo, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  LayoutAnimation,
  Platform,
  UIManager,
  Alert,
  Modal,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import ReAnimated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import ScreenWrapper from '../../components/ScreenWrapper';
import {
  Flame,
  Sparkles,
  ShoppingCart,
  Share2,
  X,
  Zap,
  ChevronRight,
  ChefHat,
  Dumbbell,
  Target,
  TrendingUp,
} from 'lucide-react-native';
import { format } from 'date-fns';
import { hapticImpact, hapticLight, hapticSuccess, hapticWarning } from '../../lib/haptics';
import DateNavigator from '../../components/DateNavigator';
import DaySummary from '../../components/DaySummary';
import MealSection from '../../components/MealSection';
import QuickLog from '../../components/QuickLog';
import WaterCard from '../../components/WaterCard';
import FastingCard from '../../components/FastingCard';
import BioFeedbackCard from '../../components/BioFeedbackCard';
import MacrosModal from '../../components/MacrosModal';
import CaloriesModal from '../../components/CaloriesModal';
import ExerciseModal from '../../components/ExerciseModal';
import SmartCoachModal from '../../components/SmartCoachModal';
import FoodDetailModal from '../../components/FoodDetailModal';
import VictoryCard from '../../components/VictoryCard';
import MorningBriefing from '../../components/MorningBriefing';
import ContextualCards from '../../components/ContextualCards';
import StreakRepairCard from '../../components/StreakRepairCard';
import SmartNudge from '../../components/SmartNudge';
import { getSmartNudge } from '../../lib/smartNudges';
import DigestCard from '../../components/DigestCard';
import { useWeeklyDigest } from '../../hooks/useWeeklyDigest';
import MacroAdaptCard from '../../components/MacroAdaptCard';
import { useAdaptiveMacros } from '../../hooks/useAdaptiveMacros';
import HealthCard from '../../components/HealthCard';
import { useHealthKit } from '../../hooks/useHealthKit';
import GlassCard from '../../components/ui/GlassCard';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import {
  Colors,
  Gradients,
  Spacing,
  FontSize,
  FontWeight,
  BorderRadius,
  Shadows,
  Glass,
} from '../../constants/theme';
import { useFood } from '../../context/FoodContext';
import { useGamification } from '../../context/GamificationContext';
import { useFasting } from '../../context/FastingContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Premium accent colors
const ACCENT = Colors.primary; // Electric Blue
const ACCENT_GLOW = Colors.primaryGlow;
const ACCENT_DIM = Colors.primaryDim;

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function getFormattedDate(date) {
  return format(date, 'EEEE, MMM d');
}

// Premium Stat Card — GlassCard with blur + border
const StatCard = memo(function StatCard({ icon: Icon, value, label, color, onPress }) {
  return (
    <GlassCard onPress={onPress} style={styles.statCardGlass} glow>
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

// Premium Action Card (AI Trainer / Chef)
const ActionCard = memo(function ActionCard({
  icon: Icon,
  title,
  subtitle,
  gradientColors,
  onPress,
  badge,
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 0.6,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.3,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      friction: 8,
      tension: 400,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 4,
      tension: 200,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const handlePress = useCallback(async () => {
    await hapticImpact();
    onPress?.();
  }, [onPress]);

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.actionCardPressable}
    >
      <Animated.View style={[styles.actionCardOuter, { transform: [{ scale: scaleAnim }] }]}>
        <LinearGradient
          colors={[gradientColors[0] + '25', gradientColors[1] + '12']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.actionCard}
        >
          {/* Glass blur layer */}
          {Platform.OS === 'ios' && (
            <BlurView
              intensity={80}
              tint="dark"
              style={StyleSheet.absoluteFill}
            />
          )}

          {/* Badge */}
          {badge && (
            <View style={styles.actionBadge}>
              <LinearGradient
                colors={gradientColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.actionBadgeGradient}
              >
                <Text style={styles.actionBadgeText}>{badge}</Text>
              </LinearGradient>
            </View>
          )}

          {/* Icon */}
          <View style={styles.actionIconContainer}>
            <LinearGradient
              colors={gradientColors}
              style={styles.actionIconGradient}
            >
              <Icon size={32} color="#000" strokeWidth={2} />
            </LinearGradient>
          </View>

          {/* Text */}
          <Text style={styles.actionTitle}>{title}</Text>
          <Text style={styles.actionSubtitle}>{subtitle}</Text>

          {/* Arrow */}
          <View style={styles.actionArrow}>
            <ChevronRight size={24} color={Colors.textTertiary} />
          </View>

          {/* Border */}
          <View style={[styles.actionCardBorder, { borderColor: gradientColors[0] + '40' }]} />
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
});

// Memoized Premium Icon Button
const IconButton = memo(function IconButton({ icon: Icon, color, onPress, size = 40, badge }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      friction: 8,
      tension: 400,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 4,
      tension: 200,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const handlePress = useCallback(async () => {
    await hapticLight();
    onPress?.();
  }, [onPress]);

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View
        style={[
          styles.iconButton,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Icon size={size * 0.45} color={color} strokeWidth={2.5} />
        {badge !== undefined && (
          <View style={styles.iconBadge}>
            <Text style={styles.iconBadgeText}>{badge}</Text>
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
});

// Memoized Premium Streak Badge
const StreakBadge = memo(function StreakBadge({ streak }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (streak > 0) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [streak, pulseAnim]);

  return (
    <Animated.View style={[styles.streakBadge, { transform: [{ scale: pulseAnim }] }]}>
      <LinearGradient
        colors={['#FF6B35', '#FF8F5A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.streakGradient}
      >
        <Flame size={16} color="#fff" strokeWidth={2.5} />
        <Text style={styles.streakText}>{streak}</Text>
      </LinearGradient>
    </Animated.View>
  );
});

// Animated Floating AI Chat Button with breathing glow
const AIFab = memo(function AIFab({ onPress }) {
  const glowAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1800, useNativeDriver: false }),
        Animated.timing(glowAnim, { toValue: 0, duration: 1800, useNativeDriver: false }),
      ])
    );
    glow.start();
    return () => glow.stop();
  }, []);

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      friction: 8,
      tension: 400,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 4,
      tension: 200,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const handlePress = useCallback(async () => {
    await hapticImpact();
    onPress?.();
  }, [onPress]);

  const shadowRadius = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [12, 28],
  });

  const shadowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 0.8],
  });

  return (
    <Pressable onPress={handlePress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <Animated.View
        style={[
          styles.fabButton,
          {
            transform: [{ scale: scaleAnim }],
            shadowColor: ACCENT,
            shadowOffset: { width: 0, height: 4 },
            shadowRadius,
            shadowOpacity,
            elevation: 10,
          },
        ]}
      >
        <LinearGradient
          colors={[ACCENT, ACCENT_DIM]}
          style={styles.fabGradient}
        >
          <Sparkles size={24} color="#000" strokeWidth={2.5} />
        </LinearGradient>
      </Animated.View>
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

export default function DashboardScreen() {
  const router = useRouter();
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
  } = useFood();
  const { currentStreak } = useGamification();
  const { recordMealLogged, isFasting } = useFasting();
  const {
    isConnected: healthConnected,
    steps: healthSteps,
    weeklySteps: healthWeeklySteps,
    activeCalories: healthActiveCalories,
    connect: healthConnect,
  } = useHealthKit();

  // Modal states
  const [macrosModalVisible, setMacrosModalVisible] = useState(false);
  const [caloriesModalVisible, setCaloriesModalVisible] = useState(false);
  const [exerciseModalVisible, setExerciseModalVisible] = useState(false);
  const [smartCoachVisible, setSmartCoachVisible] = useState(false);
  const [foodDetailVisible, setFoodDetailVisible] = useState(false);
  const [selectedFood, setSelectedFood] = useState(null);
  const [selectedMealType, setSelectedMealType] = useState('snacks');
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  // Refs
  const victoryCardRef = useRef(null);
  const scrollY = useRef(new Animated.Value(0)).current;

  // Track previous calories for LayoutAnimation (ref to avoid extra render)
  const prevCaloriesRef = useRef(totals.calories);

  // Animate when calories change
  useEffect(() => {
    if (totals.calories !== prevCaloriesRef.current) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      prevCaloriesRef.current = totals.calories;
    }
  }, [totals.calories]);

  const handleAddFood = useCallback(async (mealType) => {
    await hapticLight();
    router.push({
      pathname: '/add',
      params: { meal: mealType },
    });
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
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
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

  const handleSharePress = useCallback(async () => {
    await hapticLight();
    setShareModalVisible(true);
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

  const handleAIChatPress = useCallback(async () => {
    await hapticImpact();
    router.push('/chat');
  }, [router]);

  const handleCaptureAndShare = useCallback(async () => {
    if (!victoryCardRef.current || isSharing) return;

    setIsSharing(true);
    try {
      await hapticSuccess();
      await new Promise(resolve => setTimeout(resolve, 100));

      const uri = await captureRef(victoryCardRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });

      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Sharing not available', 'Sharing is not available on this device.');
        return;
      }

      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: 'Share your VibeFit progress!',
      });

      setShareModalVisible(false);
    } catch (error) {
      if (__DEV__) console.error('Error sharing:', error);
      Alert.alert('Error', 'Could not share your progress. Please try again.');
    } finally {
      setIsSharing(false);
    }
  }, [isSharing]);

  const handleSelectRecommendedMeal = useCallback((food, mealType) => {
    setSelectedFood(food);
    setSelectedMealType(mealType);
    setSmartCoachVisible(false);
    setFoodDetailVisible(true);
  }, []);

  const handleConfirmFood = useCallback(async (foodWithQuantity, mealType) => {
    await hapticSuccess();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
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
  const handleCloseShareModal = useCallback(() => setShareModalVisible(false), []);

  // Calculate stats
  const caloriesConsumed = totals.calories;
  const caloriesGoal = calorieBalance?.effectiveGoal || goals.calories;
  const caloriesRemaining = Math.max(0, caloriesGoal - caloriesConsumed);
  const formattedDate = useMemo(() => getFormattedDate(selectedDate), [selectedDate]);

  const { digest: weeklyDigest } = useWeeklyDigest();
  const { recommendation: macroRec, applyRecommendation, dismissRecommendation } = useAdaptiveMacros();

  const smartNudge = useMemo(() => getSmartNudge({
    todayCalories: totals?.calories || 0,
    calorieGoal: goals?.calories || 0,
    todayProtein: totals?.protein || 0,
    proteinGoal: goals?.protein || 0,
    isFasting: isFasting,
    currentStreak: currentStreak || 0,
    waterPercentage: waterProgress?.percentage || 0,
  }), [totals, goals, isFasting, currentStreak, waterProgress]);

  if (isLoading) {
    return (
      <ScreenWrapper>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={ACCENT} />
          <Text style={styles.loadingText}>Syncing with cloud...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper style={styles.safeArea}>
        {/* Date Navigator */}
        <DateNavigator />

        {/* Fetching Day Data Indicator */}
        {isFetchingDay && (
          <View style={styles.fetchingIndicator}>
            <ActivityIndicator size="small" color={ACCENT} />
            <Text style={styles.fetchingText}>Loading...</Text>
          </View>
        )}

        <Animated.ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
        >
          {/* Premium Welcome Header */}
          <ReAnimated.View entering={FadeInDown.delay(0).springify().damping(12)} style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.welcomeText}>Welcome Back</Text>
              <Text style={styles.dateText}>{formattedDate}</Text>
            </View>
            <View style={styles.headerRight}>
              <View style={styles.headerActions}>
                <IconButton
                  icon={Sparkles}
                  color={ACCENT}
                  onPress={handleSmartCoachPress}
                />
                <IconButton
                  icon={Share2}
                  color={Colors.accentPurple}
                  onPress={handleSharePress}
                />
              </View>
              <StreakBadge streak={currentStreak} />
            </View>
          </ReAnimated.View>

          {/* Smart Nudge */}
          {smartNudge && (
            <SmartNudge
              title={smartNudge.title}
              body={smartNudge.body}
              actionLabel={smartNudge.actionLabel}
              onAction={smartNudge.action === 'logFood' ? () => router.push('/(tabs)/add') : smartNudge.action === 'logWater' ? () => addWater(250) : undefined}
            />
          )}

          {/* Weekly AI Digest */}
          {weeklyDigest && <DigestCard digest={weeklyDigest} />}

          {/* AI Macro Coach */}
          {macroRec && macroRec.shouldAdjust && (
            <MacroAdaptCard
              recommendation={macroRec}
              onApply={applyRecommendation}
              onDismiss={dismissRecommendation}
            />
          )}

          {/* Stats Row - 3 Glass Cards */}
          <ReAnimated.View entering={FadeInDown.delay(80).springify().damping(12)} style={styles.statsRow}>
            <StatCard
              icon={Flame}
              value={caloriesConsumed.toLocaleString()}
              label="Calories"
              color="#FF6B35"
              onPress={handleOpenCaloriesModal}
            />
            <StatCard
              icon={Target}
              value={`${Math.round((totals.protein / goals.protein) * 100)}%`}
              label="Protein"
              color={Colors.protein}
              onPress={handleOpenMacrosModal}
            />
            <StatCard
              icon={TrendingUp}
              value={caloriesRemaining.toLocaleString()}
              label="Remaining"
              color={ACCENT}
              onPress={handleOpenCaloriesModal}
            />
          </ReAnimated.View>

          {/* Main Action Cards */}
          <ReAnimated.View entering={FadeInDown.delay(160).springify().damping(12)} style={styles.actionCardsContainer}>
            <ActionCard
              icon={Dumbbell}
              title="AI Personal Trainer"
              subtitle="Generate custom workouts"
              gradientColors={[ACCENT, ACCENT_DIM]}
              onPress={handleTrainerPress}
              badge="PRO"
            />
            <ActionCard
              icon={ChefHat}
              title="Macro Chef"
              subtitle="Scan fridge for recipes"
              gradientColors={['#FF8C32', '#FF5A1E']}
              onPress={handleChefPress}
              badge="PRO"
            />
            <ActionCard
              icon={ChefHat}
              title="AI Meal Plan"
              subtitle="3-day plan built for your goals"
              gradientColors={['#10B981', '#059669']}
              onPress={handleMealPlanPress}
              badge="NEW"
            />
          </ReAnimated.View>

          {/* Quick Log Section */}
          <ReAnimated.View entering={FadeInDown.delay(240).springify().damping(12)}>
            <QuickLog />
          </ReAnimated.View>

          {/* Streak Repair Card */}
          <ReAnimated.View entering={FadeInDown.delay(300).springify().damping(12)}>
            <StreakRepairCard />
          </ReAnimated.View>

          {/* AI-Powered Contextual Suggestions */}
          <ReAnimated.View entering={FadeInDown.delay(360).springify().damping(12)}>
            <ContextualCards />
          </ReAnimated.View>

          {/* Day Summary Card */}
          <ReAnimated.View entering={FadeInDown.delay(420).springify().damping(12)}>
            <DaySummary
              consumed={totals.calories}
              goal={calorieBalance?.effectiveGoal || goals.calories}
              remaining={remaining.calories}
              burned={calorieBalance?.burned || 0}
              streak={currentStreak}
              onPress={handleOpenCaloriesModal}
            />
          </ReAnimated.View>

          {/* Premium Macros Card */}
          <ReAnimated.View entering={FadeInDown.delay(480).springify().damping(12)}>
            <MacrosCard
              totals={totals}
              goals={goals}
              onPress={handleOpenMacrosModal}
            />
          </ReAnimated.View>

          {/* Meals Section */}
          <ReAnimated.View entering={FadeInDown.delay(540).springify().damping(12)}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {getDateLabel(selectedDate)}'s Meals
              </Text>
            </View>

            <MealSection
              mealType="breakfast"
              items={meals.breakfast}
              calories={mealCalories.breakfast}
              onAddPress={handleAddFood}
              onRemoveFood={handleRemoveFood}
            />

            <MealSection
              mealType="lunch"
              items={meals.lunch}
              calories={mealCalories.lunch}
              onAddPress={handleAddFood}
              onRemoveFood={handleRemoveFood}
            />

            <MealSection
              mealType="dinner"
              items={meals.dinner}
              calories={mealCalories.dinner}
              onAddPress={handleAddFood}
              onRemoveFood={handleRemoveFood}
            />

            <MealSection
              mealType="snacks"
              items={meals.snacks}
              calories={mealCalories.snacks}
              onAddPress={handleAddFood}
              onRemoveFood={handleRemoveFood}
            />
          </ReAnimated.View>

          {/* Activity Section */}
          <ReAnimated.View entering={FadeInDown.delay(600).springify().damping(12)}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Activity</Text>
            </View>
            <View style={styles.activityGrid}>
              <WaterCard />
              <FastingCard />
            </View>
          </ReAnimated.View>

          {/* Health Integration */}
          <ReAnimated.View entering={FadeInDown.delay(630).springify().damping(12)} style={styles.healthCardContainer}>
            <HealthCard
              isConnected={healthConnected}
              steps={healthSteps}
              activeCalories={healthActiveCalories}
              weeklySteps={healthWeeklySteps}
              onConnect={healthConnect}
            />
          </ReAnimated.View>

          {/* Bio-Feedback Section */}
          <ReAnimated.View entering={FadeInDown.delay(660).springify().damping(12)}>
            <View style={styles.bioFeedbackContainer}>
              <BioFeedbackCard />
            </View>
          </ReAnimated.View>

          <View style={styles.bottomSpacer} />
        </Animated.ScrollView>

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

      {/* Victory Card Share Modal */}
      <Modal
        visible={shareModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={handleCloseShareModal}
      >
        <BlurView intensity={90} tint="dark" style={styles.shareModalOverlay}>
          <View style={styles.shareModalContent}>
            <Pressable
              style={styles.shareModalClose}
              onPress={handleCloseShareModal}
            >
              <X size={24} color={Colors.text} />
            </Pressable>

            <VictoryCard
              ref={victoryCardRef}
              streak={currentStreak}
              caloriesConsumed={totals.calories}
              caloriesGoal={goals.calories}
              protein={totals.protein}
              proteinGoal={goals.protein}
              carbs={totals.carbs}
              carbsGoal={goals.carbs}
              fat={totals.fat}
              fatGoal={goals.fat}
              date={selectedDate}
            />

            <Pressable
              style={[styles.shareActionButton, isSharing && styles.shareActionButtonDisabled]}
              onPress={handleCaptureAndShare}
              disabled={isSharing}
            >
              <LinearGradient
                colors={[ACCENT, ACCENT_DIM]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.shareButtonGradient}
              >
                {isSharing ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <>
                    <Share2 size={20} color="#000" />
                    <Text style={styles.shareActionButtonText}>Share to Social</Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>
          </View>
        </BlurView>
      </Modal>

      {/* Morning Briefing AI Coach */}
      <MorningBriefing />

      {/* Floating AI Chat Button with breathing glow */}
      <ReAnimated.View entering={FadeInUp.delay(800).springify().damping(12)} style={styles.fabContainer}>
        <AIFab onPress={handleAIChatPress} />
      </ReAnimated.View>
    </ScreenWrapper>
  );
}

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

  // Premium Welcome Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xl,
    paddingTop: Spacing.sm,
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
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
    letterSpacing: 0.5,
  },
  dateText: {
    fontSize: 28,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    letterSpacing: -0.5,
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

  // Action Cards
  actionCardsContainer: {
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  actionCardPressable: {
    flex: 1,
  },
  actionCardOuter: {
    borderRadius: 24,
    position: 'relative',
    ...Shadows.card,
  },
  actionCard: {
    borderRadius: 24,
    padding: Spacing.xl,
    paddingVertical: Spacing.lg,
    position: 'relative',
    overflow: 'hidden',
    minHeight: 120,
    justifyContent: 'center',
  },
  actionCardBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 24,
    borderWidth: 1,
  },
  actionBadge: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
  },
  actionBadgeGradient: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  actionBadgeText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    color: Colors.background,
    letterSpacing: 1,
  },
  actionIconContainer: {
    marginBottom: Spacing.md,
  },
  actionIconGradient: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  actionSubtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  actionArrow: {
    position: 'absolute',
    right: Spacing.lg,
    bottom: Spacing.lg,
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
  sectionTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    letterSpacing: -0.3,
  },

  // Activity Grid
  activityGrid: {
    gap: Spacing.md,
  },

  // Health Card
  healthCardContainer: {
    marginTop: Spacing.md,
  },

  // Bio Feedback
  bioFeedbackContainer: {
    marginTop: Spacing.lg,
  },

  // Bottom Spacer
  bottomSpacer: {
    height: 140,
  },

  // Share Modal
  shareModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  shareModalContent: {
    alignItems: 'center',
    gap: Spacing.lg,
  },
  shareModalClose: {
    position: 'absolute',
    top: -60,
    right: 0,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  shareActionButton: {
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    ...Shadows.glowPrimary,
  },
  shareButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
    minWidth: 200,
  },
  shareActionButtonDisabled: {
    opacity: 0.6,
  },
  shareActionButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.background,
  },

  // Floating AI Chat Button
  fabContainer: {
    position: 'absolute',
    bottom: 100,
    right: Spacing.md,
    zIndex: 100,
  },
  fabButton: {
    borderRadius: 28,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

/**
 * Water Tracker Screen - Enhanced Hydration Tracking
 *
 * Features:
 * - SVG-based animated circular progress ring
 * - Quick-add / remove buttons with haptic feedback
 * - Adjustable daily water goal
 * - Weekly hydration bar chart
 * - Streak tracking with celebration
 * - 7-day history with completion indicators
 * - Confetti-like celebration when hitting daily target
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Dimensions,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import ReAnimated, {
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedProps,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  useAnimatedStyle,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Droplets,
  Plus,
  Minus,
  Target,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  Trophy,
  Flame,
  Check,
  X,
} from 'lucide-react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import GlassCard from '../components/ui/GlassCard';
import {
  Colors,
  Spacing,
  FontSize,
  FontWeight,
  BorderRadius,
  Shadows,
} from '../constants/theme';
import { useMeals } from '../context/MealContext';
import { useWaterHistory } from '../hooks/useWaterHistory';
import { hapticLight, hapticSuccess, hapticImpact } from '../lib/haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Ring dimensions
const RING_SIZE = 220;
const RING_STROKE_WIDTH = 14;
const RING_RADIUS = (RING_SIZE - RING_STROKE_WIDTH) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

// Reanimated SVG animated circle
const AnimatedCircle = ReAnimated.createAnimatedComponent(Circle);

// ---- Celebration Particle ----
function CelebrationParticle({ index, active }) {
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0);

  useEffect(() => {
    if (active) {
      const angle = (index / 12) * 2 * Math.PI;
      const distance = 80 + Math.random() * 60;

      opacity.value = withSequence(
        withTiming(1, { duration: 100 }),
        withDelay(600, withTiming(0, { duration: 400 }))
      );
      scale.value = withSequence(
        withSpring(1, { damping: 6, stiffness: 200 }),
        withDelay(500, withTiming(0, { duration: 300 }))
      );
      translateX.value = withSpring(Math.cos(angle) * distance, {
        damping: 8,
        stiffness: 80,
      });
      translateY.value = withSpring(Math.sin(angle) * distance - 40, {
        damping: 8,
        stiffness: 80,
      });
    } else {
      opacity.value = 0;
      scale.value = 0;
      translateX.value = 0;
      translateY.value = 0;
    }
  }, [active]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  const particleColors = [
    Colors.primary,
    Colors.success,
    '#64D2FF',
    Colors.gold,
    '#5AC8FA',
    '#00E676',
  ];
  const color = particleColors[index % particleColors.length];
  const size = 6 + (index % 3) * 3;

  return (
    <ReAnimated.View
      style={[
        styles.particle,
        animatedStyle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
      ]}
    />
  );
}

// ---- Water Progress Ring ----
function WaterRing({ percentage, glasses, targetGlasses }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withSpring(Math.min(percentage / 100, 1), {
      damping: 15,
      stiffness: 60,
    });
  }, [percentage]);

  const animatedProps = useAnimatedProps(() => {
    const strokeDashoffset = RING_CIRCUMFERENCE * (1 - progress.value);
    return {
      strokeDashoffset,
    };
  });

  // Determine ring color based on progress
  const ringColor = percentage >= 100 ? Colors.success : Colors.primary;
  const ringEndColor = percentage >= 100 ? '#00C853' : '#0099CC';

  return (
    <View style={styles.ringContainer}>
      <Svg width={RING_SIZE} height={RING_SIZE}>
        <Defs>
          <SvgLinearGradient id="ringGradient" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={ringColor} stopOpacity="1" />
            <Stop offset="1" stopColor={ringEndColor} stopOpacity="1" />
          </SvgLinearGradient>
        </Defs>

        {/* Background ring */}
        <Circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_RADIUS}
          stroke="rgba(255, 255, 255, 0.06)"
          strokeWidth={RING_STROKE_WIDTH}
          fill="none"
        />

        {/* Progress ring */}
        <AnimatedCircle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_RADIUS}
          stroke="url(#ringGradient)"
          strokeWidth={RING_STROKE_WIDTH}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={RING_CIRCUMFERENCE}
          animatedProps={animatedProps}
          transform={`rotate(-90, ${RING_SIZE / 2}, ${RING_SIZE / 2})`}
        />
      </Svg>

      {/* Center content */}
      <View style={styles.ringCenter}>
        <Droplets size={24} color={ringColor} strokeWidth={2} />
        <Text style={styles.ringGlasses}>
          {glasses}
          <Text style={styles.ringGlassesTarget}> / {targetGlasses}</Text>
        </Text>
        <Text style={styles.ringLabel}>glasses</Text>
        <Text style={[styles.ringPercentage, { color: ringColor }]}>
          {Math.round(percentage)}%
        </Text>
      </View>
    </View>
  );
}

// ---- Weekly Bar Chart ----
function WeeklyChart({ data }) {
  const maxGlasses = useMemo(() => {
    const allValues = data.map((d) => Math.max(d.glasses, d.target));
    return Math.max(...allValues, 1);
  }, [data]);

  return (
    <View style={styles.chartContainer}>
      <View style={styles.chartBars}>
        {data.map((day, index) => {
          const barHeight = (day.glasses / maxGlasses) * 100;
          const targetHeight = (day.target / maxGlasses) * 100;
          const met = day.glasses >= day.target && day.target > 0;

          return (
            <ReAnimated.View
              key={day.date}
              entering={FadeInUp.delay(index * 60)
                .springify()
                .damping(12)}
              style={styles.chartBarWrapper}
            >
              <View style={styles.chartBarContainer}>
                {/* Target line */}
                {day.target > 0 && (
                  <View
                    style={[
                      styles.chartTargetLine,
                      { bottom: `${targetHeight}%` },
                    ]}
                  />
                )}
                {/* Bar */}
                <View
                  style={[
                    styles.chartBar,
                    {
                      height: `${Math.max(barHeight, 4)}%`,
                      backgroundColor: met
                        ? Colors.success
                        : day.glasses > 0
                        ? Colors.primary
                        : 'rgba(255,255,255,0.06)',
                    },
                  ]}
                />
              </View>
              <Text
                style={[
                  styles.chartDayLabel,
                  day.date === data[data.length - 1]?.date && styles.chartDayToday,
                ]}
              >
                {day.dayLabel}
              </Text>
              <Text style={styles.chartBarValue}>
                {day.glasses > 0 ? day.glasses : '-'}
              </Text>
            </ReAnimated.View>
          );
        })}
      </View>
    </View>
  );
}

// ---- History Row ----
function HistoryRow({ entry }) {
  return (
    <View style={styles.historyRow}>
      <View style={styles.historyDateContainer}>
        <Text style={styles.historyDay}>
          {entry.isToday ? 'Today' : entry.dayLabel}
        </Text>
        <Text style={styles.historyDate}>{entry.fullLabel}</Text>
      </View>
      <View style={styles.historyGlassesContainer}>
        <Droplets
          size={14}
          color={entry.met ? Colors.success : Colors.textTertiary}
          strokeWidth={2}
        />
        <Text
          style={[
            styles.historyGlasses,
            entry.met && { color: Colors.success },
          ]}
        >
          {entry.glasses} / {entry.target || '?'}
        </Text>
      </View>
      <View
        style={[
          styles.historyStatus,
          {
            backgroundColor: entry.met
              ? Colors.successSoft
              : entry.glasses > 0
              ? Colors.primarySoft
              : 'rgba(255,255,255,0.05)',
          },
        ]}
      >
        {entry.met ? (
          <Check size={14} color={Colors.success} strokeWidth={2.5} />
        ) : entry.glasses > 0 ? (
          <Text style={styles.historyStatusText}>
            {Math.round((entry.glasses / (entry.target || 1)) * 100)}%
          </Text>
        ) : (
          <Minus size={14} color={Colors.textTertiary} strokeWidth={2} />
        )}
      </View>
    </View>
  );
}

// ---- Goal Setter Modal ----
function GoalSetter({ visible, currentGoal, onSave, onClose }) {
  const [tempGoal, setTempGoal] = useState(currentGoal);

  useEffect(() => {
    setTempGoal(currentGoal);
  }, [currentGoal, visible]);

  if (!visible) return null;

  const minGoal = 6;
  const maxGoal = 16;

  const increment = () => {
    if (tempGoal < maxGoal) {
      hapticLight();
      setTempGoal((g) => g + 1);
    }
  };

  const decrement = () => {
    if (tempGoal > minGoal) {
      hapticLight();
      setTempGoal((g) => g - 1);
    }
  };

  return (
    <ReAnimated.View
      entering={FadeInDown.springify().damping(14)}
      style={styles.goalSetterOverlay}
    >
      <View style={styles.goalSetterCard}>
        <View style={styles.goalSetterHeader}>
          <Target size={20} color={Colors.primary} strokeWidth={2} />
          <Text style={styles.goalSetterTitle}>Daily Goal</Text>
          <Pressable
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <X size={20} color={Colors.textTertiary} />
          </Pressable>
        </View>

        <View style={styles.goalSetterControls}>
          <Pressable
            style={[
              styles.goalAdjustButton,
              tempGoal <= minGoal && styles.goalAdjustButtonDisabled,
            ]}
            onPress={decrement}
            disabled={tempGoal <= minGoal}
          >
            <ChevronDown size={24} color={tempGoal <= minGoal ? Colors.textTertiary : Colors.text} />
          </Pressable>

          <View style={styles.goalValueContainer}>
            <Text style={styles.goalValue}>{tempGoal}</Text>
            <Text style={styles.goalUnit}>glasses</Text>
            <Text style={styles.goalMl}>{tempGoal * 250} ml</Text>
          </View>

          <Pressable
            style={[
              styles.goalAdjustButton,
              tempGoal >= maxGoal && styles.goalAdjustButtonDisabled,
            ]}
            onPress={increment}
            disabled={tempGoal >= maxGoal}
          >
            <ChevronUp size={24} color={tempGoal >= maxGoal ? Colors.textTertiary : Colors.text} />
          </Pressable>
        </View>

        <Pressable
          style={styles.goalSaveButton}
          onPress={() => {
            hapticSuccess();
            onSave(tempGoal);
          }}
        >
          <LinearGradient
            colors={[Colors.primary, Colors.primaryDim]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.goalSaveGradient}
          >
            <Text style={styles.goalSaveText}>Save Goal</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </ReAnimated.View>
  );
}

// ==== Main Screen ====
export default function WaterTrackerScreen() {
  const router = useRouter();
  const {
    waterProgress,
    addWater,
    waterGoal,
    setWaterGoal,
  } = useMeals();

  const {
    isLoading: historyLoading,
    addToHistory,
    getWeeklyData,
    getStreak,
    getRecentHistory,
  } = useWaterHistory();

  const [showGoalSetter, setShowGoalSetter] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const prevPercentageRef = useRef(waterProgress.percentage);

  // Derived data
  const glasses = waterProgress.glasses;
  const targetGlasses = waterProgress.glassesGoal;
  const percentage = waterProgress.percentage;
  const weeklyData = useMemo(() => getWeeklyData(), [getWeeklyData, waterProgress]);
  const streak = useMemo(() => getStreak(), [getStreak, waterProgress]);
  const recentHistory = useMemo(
    () => getRecentHistory(7),
    [getRecentHistory, waterProgress]
  );

  // Record to history whenever water changes
  useEffect(() => {
    if (!historyLoading && targetGlasses > 0) {
      addToHistory(glasses, targetGlasses);
    }
  }, [glasses, targetGlasses, historyLoading]);

  // Celebration trigger: first time crossing 100%
  useEffect(() => {
    if (
      percentage >= 100 &&
      prevPercentageRef.current < 100
    ) {
      setShowCelebration(true);
      hapticSuccess();
      const timer = setTimeout(() => setShowCelebration(false), 1500);
      return () => clearTimeout(timer);
    }
    prevPercentageRef.current = percentage;
  }, [percentage]);

  // ---- Handlers ----
  const handleAddGlasses = useCallback(
    async (count) => {
      await hapticLight();
      // Each glass is 250ml
      addWater(count * 250);
    },
    [addWater]
  );

  const handleRemoveGlass = useCallback(async () => {
    if (glasses <= 0) return;
    await hapticLight();
    // Add negative amount to subtract
    addWater(-250);
  }, [addWater, glasses]);

  const handleSaveGoal = useCallback(
    (newGoalGlasses) => {
      const newGoalMl = newGoalGlasses * 250;
      setWaterGoal(newGoalMl);
      setShowGoalSetter(false);
    },
    [setWaterGoal]
  );

  const handleGoBack = useCallback(async () => {
    await hapticLight();
    router.back();
  }, [router]);

  return (
    <ScreenWrapper>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <ReAnimated.View
          entering={FadeInDown.delay(0).springify().damping(12)}
          style={styles.header}
        >
          <Pressable style={styles.backButton} onPress={handleGoBack}>
            <ChevronLeft size={24} color={Colors.text} />
          </Pressable>
          <View style={styles.headerTitleRow}>
            <Droplets size={22} color={Colors.primary} strokeWidth={2.5} />
            <Text style={styles.headerTitle}>Hydration</Text>
          </View>
          <Pressable
            style={styles.goalButton}
            onPress={() => {
              hapticLight();
              setShowGoalSetter(!showGoalSetter);
            }}
          >
            <Target size={20} color={Colors.primary} strokeWidth={2} />
          </Pressable>
        </ReAnimated.View>

        {/* Goal Setter */}
        <GoalSetter
          visible={showGoalSetter}
          currentGoal={targetGlasses}
          onSave={handleSaveGoal}
          onClose={() => setShowGoalSetter(false)}
        />

        {/* Central Water Ring */}
        <ReAnimated.View
          entering={FadeInDown.delay(80).springify().damping(12)}
          style={styles.ringSection}
        >
          {/* Celebration particles */}
          <View style={styles.celebrationContainer}>
            {Array.from({ length: 12 }).map((_, i) => (
              <CelebrationParticle key={i} index={i} active={showCelebration} />
            ))}
          </View>

          <WaterRing
            percentage={percentage}
            glasses={glasses}
            targetGlasses={targetGlasses}
          />

          {/* Remaining text */}
          <Text style={styles.remainingText}>
            {waterProgress.remaining > 0
              ? `${waterProgress.remaining} ml remaining`
              : 'Daily goal reached!'}
          </Text>
        </ReAnimated.View>

        {/* Quick-Add Buttons */}
        <ReAnimated.View
          entering={FadeInDown.delay(160).springify().damping(12)}
          style={styles.quickAddSection}
        >
          <View style={styles.quickAddRow}>
            <Pressable
              style={styles.quickAddButton}
              onPress={() => handleAddGlasses(1)}
            >
              <LinearGradient
                colors={[Colors.primarySoft, 'rgba(0, 212, 255, 0.05)']}
                style={styles.quickAddGradient}
              >
                <Plus size={18} color={Colors.primary} strokeWidth={2.5} />
                <Text style={styles.quickAddText}>1 Glass</Text>
              </LinearGradient>
            </Pressable>

            <Pressable
              style={styles.quickAddButton}
              onPress={() => handleAddGlasses(2)}
            >
              <LinearGradient
                colors={[Colors.primarySoft, 'rgba(0, 212, 255, 0.05)']}
                style={styles.quickAddGradient}
              >
                <Plus size={18} color={Colors.primary} strokeWidth={2.5} />
                <Text style={styles.quickAddText}>2 Glasses</Text>
              </LinearGradient>
            </Pressable>

            <Pressable
              style={styles.quickAddButton}
              onPress={() => {
                Alert.prompt
                  ? Alert.prompt(
                      'Custom Amount',
                      'Enter number of glasses to add:',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Add',
                          onPress: (value) => {
                            const num = parseInt(value, 10);
                            if (num > 0 && num <= 20) {
                              handleAddGlasses(num);
                            }
                          },
                        },
                      ],
                      'plain-text',
                      '',
                      'number-pad'
                    )
                  : handleAddGlasses(3);
              }}
            >
              <LinearGradient
                colors={[Colors.primarySoft, 'rgba(0, 212, 255, 0.05)']}
                style={styles.quickAddGradient}
              >
                <Droplets size={18} color={Colors.primary} strokeWidth={2.5} />
                <Text style={styles.quickAddText}>Custom</Text>
              </LinearGradient>
            </Pressable>
          </View>

          {/* Remove button */}
          <Pressable
            style={[
              styles.removeButton,
              glasses <= 0 && styles.removeButtonDisabled,
            ]}
            onPress={handleRemoveGlass}
            disabled={glasses <= 0}
          >
            <Minus
              size={16}
              color={glasses > 0 ? Colors.error : Colors.textTertiary}
              strokeWidth={2}
            />
            <Text
              style={[
                styles.removeButtonText,
                glasses <= 0 && { color: Colors.textTertiary },
              ]}
            >
              Remove 1 Glass
            </Text>
          </Pressable>
        </ReAnimated.View>

        {/* Streak Card */}
        <ReAnimated.View
          entering={FadeInDown.delay(240).springify().damping(12)}
        >
          <GlassCard
            style={styles.streakCard}
            variant={streak >= 3 ? 'success' : 'default'}
            glow={streak >= 3}
          >
            <View style={styles.streakContent}>
              <View style={styles.streakLeft}>
                <View
                  style={[
                    styles.streakIconContainer,
                    streak >= 3 && styles.streakIconActive,
                  ]}
                >
                  {streak >= 7 ? (
                    <Trophy size={22} color={Colors.gold} strokeWidth={2} />
                  ) : streak >= 3 ? (
                    <Flame size={22} color={Colors.secondary} strokeWidth={2} />
                  ) : (
                    <Droplets
                      size={22}
                      color={Colors.primary}
                      strokeWidth={2}
                    />
                  )}
                </View>
                <View>
                  <Text style={styles.streakValue}>
                    {streak} Day{streak !== 1 ? 's' : ''}
                  </Text>
                  <Text style={styles.streakLabel}>Hydration Streak</Text>
                </View>
              </View>
              {streak >= 3 && (
                <View style={styles.streakBadge}>
                  <LinearGradient
                    colors={
                      streak >= 7
                        ? [Colors.gold, Colors.goldDim]
                        : [Colors.success, Colors.successDim]
                    }
                    style={styles.streakBadgeGradient}
                  >
                    <Text style={styles.streakBadgeText}>
                      {streak >= 7 ? 'Amazing!' : 'On Fire!'}
                    </Text>
                  </LinearGradient>
                </View>
              )}
            </View>
          </GlassCard>
        </ReAnimated.View>

        {/* Weekly Chart */}
        <ReAnimated.View
          entering={FadeInDown.delay(320).springify().damping(12)}
        >
          <GlassCard style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <Text style={styles.chartTitle}>This Week</Text>
              <Text style={styles.chartSubtitle}>Daily water intake</Text>
            </View>
            <WeeklyChart data={weeklyData} />
          </GlassCard>
        </ReAnimated.View>

        {/* History Section */}
        <ReAnimated.View
          entering={FadeInDown.delay(400).springify().damping(12)}
        >
          <GlassCard style={styles.historyCard}>
            <Text style={styles.historyTitle}>Recent History</Text>
            {recentHistory.map((entry) => (
              <HistoryRow key={entry.date} entry={entry} />
            ))}
          </GlassCard>
        </ReAnimated.View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </ScreenWrapper>
  );
}

// ==== Styles ====
const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
    paddingTop: Spacing.xs,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    letterSpacing: -0.3,
  },
  goalButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primarySoft,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Ring Section
  ringSection: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
    position: 'relative',
  },
  ringContainer: {
    width: RING_SIZE,
    height: RING_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  ringCenter: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringGlasses: {
    fontSize: 40,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginTop: Spacing.xs,
    letterSpacing: -1,
  },
  ringGlassesTarget: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.medium,
    color: Colors.textTertiary,
  },
  ringLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  ringPercentage: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    marginTop: Spacing.xs,
  },
  remainingText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },

  // Celebration
  celebrationContainer: {
    position: 'absolute',
    top: RING_SIZE / 2,
    left: '50%',
    width: 0,
    height: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  particle: {
    position: 'absolute',
  },

  // Quick Add
  quickAddSection: {
    marginBottom: Spacing.lg,
    alignItems: 'center',
  },
  quickAddRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  quickAddButton: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.15)',
  },
  quickAddGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    gap: Spacing.xs,
  },
  quickAddText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255, 82, 82, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 82, 82, 0.15)',
  },
  removeButtonDisabled: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderColor: 'rgba(255,255,255,0.06)',
  },
  removeButtonText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.error,
  },

  // Streak Card
  streakCard: {
    marginBottom: Spacing.lg,
  },
  streakContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  streakLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  streakIconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  streakIconActive: {
    backgroundColor: Colors.successSoft,
  },
  streakValue: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    letterSpacing: -0.3,
  },
  streakLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  streakBadge: {
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  streakBadgeGradient: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  streakBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.background,
    letterSpacing: 0.5,
  },

  // Chart Card
  chartCard: {
    marginBottom: Spacing.lg,
  },
  chartHeader: {
    marginBottom: Spacing.md,
  },
  chartTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  chartSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  chartContainer: {
    paddingTop: Spacing.sm,
  },
  chartBars: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
    gap: Spacing.xs,
  },
  chartBarWrapper: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  chartBarContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
    borderRadius: BorderRadius.xs,
    overflow: 'hidden',
    position: 'relative',
  },
  chartBar: {
    width: '100%',
    borderRadius: BorderRadius.xs,
    minHeight: 4,
  },
  chartTargetLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 1,
    zIndex: 1,
  },
  chartDayLabel: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: Spacing.xs,
  },
  chartDayToday: {
    color: Colors.primary,
    fontWeight: FontWeight.bold,
  },
  chartBarValue: {
    fontSize: 10,
    color: Colors.textTertiary,
    marginTop: 2,
  },

  // History Card
  historyCard: {
    marginBottom: Spacing.lg,
  },
  historyTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  historyDateContainer: {
    flex: 1,
  },
  historyDay: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  historyDate: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: 1,
  },
  historyGlassesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginRight: Spacing.md,
  },
  historyGlasses: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  historyStatus: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyStatusText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },

  // Goal Setter
  goalSetterOverlay: {
    marginBottom: Spacing.lg,
  },
  goalSetterCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.2)',
    padding: Spacing.lg,
  },
  goalSetterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  goalSetterTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    flex: 1,
    marginLeft: Spacing.sm,
  },
  goalSetterControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  goalAdjustButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  goalAdjustButtonDisabled: {
    opacity: 0.3,
  },
  goalValueContainer: {
    alignItems: 'center',
  },
  goalValue: {
    fontSize: 48,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
    letterSpacing: -2,
  },
  goalUnit: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  goalMl: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  goalSaveButton: {
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    ...Shadows.button,
  },
  goalSaveGradient: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalSaveText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.background,
  },

  // Bottom
  bottomSpacer: {
    height: 100,
  },
});

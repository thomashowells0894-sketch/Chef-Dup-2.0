/**
 * Fitness Score Screen - Activity Rings & Overall Fitness Score
 *
 * Features:
 * - Apple Watch-inspired concentric activity rings (Nutrition, Movement, Hydration)
 * - Animated main score ring (0-100) with tier-based coloring
 * - Score breakdown cards showing contribution from 6 categories
 * - Weekly trend bar chart of historical scores
 * - Contextual tips based on weakest scoring areas
 * - Haptic feedback on interactions
 * - Persistent score history via AsyncStorage
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import ReAnimated, {
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedProps,
  withSpring,
  withTiming,
  withDelay,
  useAnimatedStyle,
  interpolateColor,
} from 'react-native-reanimated';
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
} from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronLeft,
  Medal,
  Flame,
  Droplets,
  Dumbbell,
  Moon,
  Target,
  TrendingUp,
  Zap,
  Heart,
  ListChecks,
  Lightbulb,
  Award,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import {
  Colors,
  Spacing,
  FontSize,
  FontWeight,
  BorderRadius,
  Shadows,
  Gradients,
} from '../constants/theme';
import { hapticLight, hapticSuccess } from '../lib/haptics';
import useFitnessScore from '../hooks/useFitnessScore';
import { useMeals } from '../context/MealContext';
import { useProfile } from '../context/ProfileContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================================
// Constants for SVG Rings
// ============================================================

// Main score ring
const MAIN_RING_SIZE = 220;
const MAIN_RING_STROKE = 14;
const MAIN_RING_RADIUS = (MAIN_RING_SIZE - MAIN_RING_STROKE) / 2;
const MAIN_RING_CIRCUMFERENCE = 2 * Math.PI * MAIN_RING_RADIUS;

// Activity rings (concentric) - Apple Watch style
const ACTIVITY_RING_SIZE = 180;
const ACTIVITY_RING_STROKE = 12;
const ACTIVITY_RING_GAP = 16; // Gap between rings

// Outer ring (Nutrition)
const OUTER_RADIUS = (ACTIVITY_RING_SIZE - ACTIVITY_RING_STROKE) / 2;
const OUTER_CIRCUMFERENCE = 2 * Math.PI * OUTER_RADIUS;

// Middle ring (Movement)
const MIDDLE_RADIUS = OUTER_RADIUS - ACTIVITY_RING_STROKE - ACTIVITY_RING_GAP;
const MIDDLE_CIRCUMFERENCE = 2 * Math.PI * MIDDLE_RADIUS;

// Inner ring (Hydration)
const INNER_RADIUS = MIDDLE_RADIUS - ACTIVITY_RING_STROKE - ACTIVITY_RING_GAP;
const INNER_CIRCUMFERENCE = 2 * Math.PI * INNER_RADIUS;

// Animated components
const AnimatedCircle = ReAnimated.createAnimatedComponent(Circle);

// ============================================================
// Main Score Ring Component
// ============================================================
function MainScoreRing({ score, scoreLabel }) {
  const progress = useSharedValue(0);
  const scaleValue = useSharedValue(0.9);

  useEffect(() => {
    scaleValue.value = withSpring(1, { damping: 12, stiffness: 80 });
    progress.value = withDelay(
      300,
      withSpring(Math.min(score / 100, 1), {
        damping: 18,
        stiffness: 50,
      })
    );
  }, [score]);

  const animatedProps = useAnimatedProps(() => {
    const strokeDashoffset = MAIN_RING_CIRCUMFERENCE * (1 - progress.value);
    return { strokeDashoffset };
  });

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleValue.value }],
  }));

  const tierColor = scoreLabel.color;
  const tierEndColor =
    score >= 90
      ? '#DAA520'
      : score >= 75
      ? '#00C853'
      : score >= 60
      ? '#0099CC'
      : score >= 40
      ? '#FFA000'
      : '#E55A2B';

  return (
    <ReAnimated.View style={[styles.mainRingContainer, containerStyle]}>
      <Svg width={MAIN_RING_SIZE} height={MAIN_RING_SIZE}>
        <Defs>
          <SvgLinearGradient id="mainRingGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={tierColor} stopOpacity="1" />
            <Stop offset="1" stopColor={tierEndColor} stopOpacity="1" />
          </SvgLinearGradient>
        </Defs>

        {/* Background ring */}
        <Circle
          cx={MAIN_RING_SIZE / 2}
          cy={MAIN_RING_SIZE / 2}
          r={MAIN_RING_RADIUS}
          stroke="rgba(255, 255, 255, 0.06)"
          strokeWidth={MAIN_RING_STROKE}
          fill="none"
        />

        {/* Progress ring */}
        <AnimatedCircle
          cx={MAIN_RING_SIZE / 2}
          cy={MAIN_RING_SIZE / 2}
          r={MAIN_RING_RADIUS}
          stroke="url(#mainRingGrad)"
          strokeWidth={MAIN_RING_STROKE}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={MAIN_RING_CIRCUMFERENCE}
          animatedProps={animatedProps}
          transform={`rotate(-90, ${MAIN_RING_SIZE / 2}, ${MAIN_RING_SIZE / 2})`}
        />
      </Svg>

      {/* Center content */}
      <View style={styles.mainRingCenter}>
        <Text style={[styles.mainScoreValue, { color: tierColor }]}>
          {score}
        </Text>
        <Text style={[styles.mainScoreLabel, { color: tierColor }]}>
          {scoreLabel.label}
        </Text>
        <Text style={styles.mainScoreSubtext}>out of 100</Text>
      </View>
    </ReAnimated.View>
  );
}

// ============================================================
// Activity Ring Component (Single ring)
// ============================================================
function ActivityRing({
  radius,
  circumference,
  percentage,
  strokeWidth,
  gradientId,
  color,
  colorEnd,
  svgSize,
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      500,
      withSpring(Math.min(percentage / 100, 1), {
        damping: 15,
        stiffness: 60,
      })
    );
  }, [percentage]);

  const animatedProps = useAnimatedProps(() => {
    const strokeDashoffset = circumference * (1 - progress.value);
    return { strokeDashoffset };
  });

  return (
    <>
      <Defs>
        <SvgLinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity="1" />
          <Stop offset="1" stopColor={colorEnd} stopOpacity="1" />
        </SvgLinearGradient>
      </Defs>

      {/* Background ring */}
      <Circle
        cx={svgSize / 2}
        cy={svgSize / 2}
        r={radius}
        stroke={color + '15'}
        strokeWidth={strokeWidth}
        fill="none"
      />

      {/* Progress ring */}
      <AnimatedCircle
        cx={svgSize / 2}
        cy={svgSize / 2}
        r={radius}
        stroke={`url(#${gradientId})`}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={circumference}
        animatedProps={animatedProps}
        transform={`rotate(-90, ${svgSize / 2}, ${svgSize / 2})`}
      />
    </>
  );
}

// ============================================================
// Nested Activity Rings Component (Apple Watch Style)
// ============================================================
function ActivityRingsDisplay({ nutritionPercent, exercisePercent, hydrationPercent }) {
  return (
    <View style={styles.activityRingsWrapper}>
      <View style={styles.activityRingsSvgContainer}>
        <Svg width={ACTIVITY_RING_SIZE} height={ACTIVITY_RING_SIZE}>
          {/* Outer Ring - Nutrition (Red/Pink) */}
          <ActivityRing
            radius={OUTER_RADIUS}
            circumference={OUTER_CIRCUMFERENCE}
            percentage={nutritionPercent}
            strokeWidth={ACTIVITY_RING_STROKE}
            gradientId="nutritionGrad"
            color="#FF6B9D"
            colorEnd="#FF8A80"
            svgSize={ACTIVITY_RING_SIZE}
          />

          {/* Middle Ring - Movement (Green) */}
          <ActivityRing
            radius={MIDDLE_RADIUS}
            circumference={MIDDLE_CIRCUMFERENCE}
            percentage={exercisePercent}
            strokeWidth={ACTIVITY_RING_STROKE}
            gradientId="movementGrad"
            color="#00E676"
            colorEnd="#00C853"
            svgSize={ACTIVITY_RING_SIZE}
          />

          {/* Inner Ring - Hydration (Blue) */}
          <ActivityRing
            radius={INNER_RADIUS}
            circumference={INNER_CIRCUMFERENCE}
            percentage={hydrationPercent}
            strokeWidth={ACTIVITY_RING_STROKE}
            gradientId="hydrationGrad"
            color="#00D4FF"
            colorEnd="#0099CC"
            svgSize={ACTIVITY_RING_SIZE}
          />
        </Svg>
      </View>

      {/* Ring labels */}
      <View style={styles.activityRingLabels}>
        <View style={styles.ringLabelRow}>
          <View style={[styles.ringDot, { backgroundColor: '#FF6B9D' }]} />
          <Text style={styles.ringLabelText}>Nutrition</Text>
          <Text style={[styles.ringLabelPercent, { color: '#FF6B9D' }]}>
            {Math.round(nutritionPercent)}%
          </Text>
        </View>
        <View style={styles.ringLabelRow}>
          <View style={[styles.ringDot, { backgroundColor: '#00E676' }]} />
          <Text style={styles.ringLabelText}>Movement</Text>
          <Text style={[styles.ringLabelPercent, { color: '#00E676' }]}>
            {Math.round(exercisePercent)}%
          </Text>
        </View>
        <View style={styles.ringLabelRow}>
          <View style={[styles.ringDot, { backgroundColor: '#00D4FF' }]} />
          <Text style={styles.ringLabelText}>Hydration</Text>
          <Text style={[styles.ringLabelPercent, { color: '#00D4FF' }]}>
            {Math.round(hydrationPercent)}%
          </Text>
        </View>
      </View>
    </View>
  );
}

// ============================================================
// Score Breakdown Card Component
// ============================================================
function BreakdownCard({ icon: Icon, iconColor, title, earned, max, delay }) {
  const percentage = max > 0 ? Math.round((earned / max) * 100) : 0;
  const progressWidth = useSharedValue(0);

  useEffect(() => {
    progressWidth.value = withDelay(
      delay + 400,
      withSpring(percentage, { damping: 18, stiffness: 60 })
    );
  }, [percentage]);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  return (
    <ReAnimated.View
      entering={FadeInDown.delay(delay).springify().mass(0.5).damping(10)}
      style={styles.breakdownCard}
    >
      <LinearGradient
        colors={Gradients.card}
        style={styles.breakdownCardGradient}
      >
        <View style={[styles.breakdownIcon, { backgroundColor: iconColor + '20' }]}>
          <Icon size={18} color={iconColor} />
        </View>
        <Text style={styles.breakdownTitle}>{title}</Text>
        <Text style={styles.breakdownPoints}>
          <Text style={[styles.breakdownEarned, { color: iconColor }]}>
            {earned}
          </Text>
          <Text style={styles.breakdownMax}> / {max}</Text>
        </Text>
        <View style={styles.breakdownBarBg}>
          <ReAnimated.View
            style={[
              styles.breakdownBarFill,
              { backgroundColor: iconColor },
              progressStyle,
            ]}
          />
        </View>
      </LinearGradient>
    </ReAnimated.View>
  );
}

// ============================================================
// Weekly Trend Chart Component
// ============================================================
function WeeklyTrendChart({ weeklyScores, getScoreLabel }) {
  const maxScore = 100;

  return (
    <View style={styles.weeklyChart}>
      <View style={styles.weeklyBars}>
        {weeklyScores.map((entry, index) => {
          const height = Math.max((entry.score / maxScore) * 100, 4);
          const tierInfo = getScoreLabel(entry.score);
          const isToday = index === weeklyScores.length - 1;

          return (
            <View key={entry.date} style={styles.weeklyBarColumn}>
              <Text style={styles.weeklyBarValue}>
                {entry.score > 0 ? entry.score : '-'}
              </Text>
              <View style={styles.weeklyBarTrack}>
                <ReAnimated.View
                  entering={FadeInDown.delay(index * 80)
                    .springify()
                    .mass(0.5)
                    .damping(10)}
                  style={[
                    styles.weeklyBarFill,
                    {
                      height: `${height}%`,
                      backgroundColor:
                        entry.score > 0 ? tierInfo.color : 'rgba(255,255,255,0.06)',
                    },
                  ]}
                />
              </View>
              <Text
                style={[
                  styles.weeklyBarDay,
                  isToday && styles.weeklyBarDayToday,
                ]}
              >
                {entry.day}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ============================================================
// Tip Card Component
// ============================================================
function TipCard({ tip, index }) {
  return (
    <ReAnimated.View
      entering={FadeInDown.delay(800 + index * 100)
        .springify()
        .mass(0.5)
        .damping(10)}
      style={styles.tipCard}
    >
      <LinearGradient
        colors={[tip.bgColor + '15', tip.bgColor + '05']}
        style={styles.tipGradient}
      >
        <View style={[styles.tipIconWrap, { backgroundColor: tip.bgColor + '25' }]}>
          <Lightbulb size={16} color={tip.bgColor} />
        </View>
        <View style={styles.tipContent}>
          <Text style={styles.tipTitle}>{tip.title}</Text>
          <Text style={styles.tipDescription}>{tip.description}</Text>
        </View>
      </LinearGradient>
    </ReAnimated.View>
  );
}

// ============================================================
// Main Screen
// ============================================================
export default function FitnessScoreScreen() {
  const router = useRouter();
  const {
    scoreHistory,
    isLoading,
    calculateScore,
    saveScore,
    getWeeklyScores,
    getAverageScore,
    getScoreLabel,
  } = useFitnessScore();

  // Pull data from contexts
  const { dailyTotals, waterGlasses, waterGoal } = useMeals();
  const { calculatedGoals, profile } = useProfile();

  // Local state for computed values
  const [currentScore, setCurrentScore] = useState(0);
  const [breakdownScores, setBreakdownScores] = useState({
    nutrition: 0,
    protein: 0,
    hydration: 0,
    exercise: 0,
    sleep: 0,
    consistency: 0,
  });

  // Activity ring percentages
  const [nutritionPercent, setNutritionPercent] = useState(0);
  const [exercisePercent, setExercisePercent] = useState(0);
  const [hydrationPercent, setHydrationPercent] = useState(0);

  // Build current data and compute score
  useEffect(() => {
    if (isLoading) return;

    const caloriesEaten = dailyTotals?.calories || 0;
    const calorieGoal = calculatedGoals?.calories || 2000;
    const proteinEaten = dailyTotals?.protein || 0;
    const proteinGoal = calculatedGoals?.protein || 150;
    const currentWaterGlasses = waterGlasses || 0;
    const currentWaterGoal = waterGoal || 8;

    // We don't have exercise/sleep/habits from context, use defaults
    const exerciseMinutes = 0;
    const exerciseGoal = 30;
    const sleepHours = 0;
    const fastCompleted = false;
    const habitsCompleted = 0;
    const habitsTotal = 0;

    const data = {
      caloriesEaten,
      calorieGoal,
      proteinEaten,
      proteinGoal,
      waterGlasses: currentWaterGlasses,
      waterGoal: currentWaterGoal,
      exerciseMinutes,
      exerciseGoal,
      sleepHours,
      sleepGoal: 8,
      fastCompleted,
      habitsCompleted,
      habitsTotal,
    };

    const score = calculateScore(data);
    setCurrentScore(score);

    // Calculate individual breakdowns
    let nutritionPts = 0;
    if (calorieGoal > 0) {
      const ratio = caloriesEaten / calorieGoal;
      const accuracy = 1 - Math.abs(1 - ratio);
      nutritionPts = Math.round(Math.max(0, accuracy) * 25);
    }

    let proteinPts = 0;
    if (proteinGoal > 0) {
      proteinPts = Math.round(Math.min(proteinEaten / proteinGoal, 1) * 15);
    }

    let hydrationPts = 0;
    if (currentWaterGoal > 0) {
      hydrationPts = Math.round(
        Math.min(currentWaterGlasses / currentWaterGoal, 1) * 15
      );
    }

    let exercisePts = Math.round(
      Math.min(exerciseMinutes / exerciseGoal, 1) * 20
    );

    let sleepPts = 0;
    if (sleepHours > 0) {
      const sleepScore =
        sleepHours >= 7 && sleepHours <= 9
          ? 1
          : sleepHours >= 6
          ? 0.7
          : sleepHours >= 5
          ? 0.4
          : 0.2;
      sleepPts = Math.round(sleepScore * 15);
    }

    let consistencyPts = 0;
    if (fastCompleted) consistencyPts += 5;
    if (habitsTotal > 0)
      consistencyPts += Math.round((habitsCompleted / habitsTotal) * 5);

    setBreakdownScores({
      nutrition: nutritionPts,
      protein: proteinPts,
      hydration: hydrationPts,
      exercise: exercisePts,
      sleep: sleepPts,
      consistency: consistencyPts,
    });

    // Activity ring percents
    if (calorieGoal > 0) {
      const ratio = caloriesEaten / calorieGoal;
      const acc = 1 - Math.abs(1 - ratio);
      setNutritionPercent(Math.max(0, acc) * 100);
    }
    setExercisePercent(Math.min(exerciseMinutes / exerciseGoal, 1) * 100);
    if (currentWaterGoal > 0) {
      setHydrationPercent(
        Math.min(currentWaterGlasses / currentWaterGoal, 1) * 100
      );
    }

    // Save today's score
    if (score > 0) {
      saveScore(score);
    }
  }, [
    isLoading,
    dailyTotals,
    calculatedGoals,
    waterGlasses,
    waterGoal,
    calculateScore,
    saveScore,
  ]);

  const weeklyScores = useMemo(() => getWeeklyScores(), [getWeeklyScores]);
  const averageScore = useMemo(() => getAverageScore(), [getAverageScore]);
  const scoreLabel = useMemo(
    () => getScoreLabel(currentScore),
    [currentScore, getScoreLabel]
  );

  // Determine trend
  const trend = useMemo(() => {
    if (weeklyScores.length < 2) return 'neutral';
    const recent = weeklyScores.filter((s) => s.score > 0);
    if (recent.length < 2) return 'neutral';
    const last = recent[recent.length - 1].score;
    const prev = recent[recent.length - 2].score;
    if (last > prev) return 'up';
    if (last < prev) return 'down';
    return 'neutral';
  }, [weeklyScores]);

  // Generate contextual tips based on weakest areas
  const tips = useMemo(() => {
    const result = [];
    const areas = [
      {
        key: 'nutrition',
        earned: breakdownScores.nutrition,
        max: 25,
        title: 'Nutrition',
        description: 'Try to eat closer to your calorie goal for a higher score.',
        bgColor: '#FF6B9D',
      },
      {
        key: 'protein',
        earned: breakdownScores.protein,
        max: 15,
        title: 'Protein Intake',
        description:
          'Hit your protein target to support muscle recovery and growth.',
        bgColor: Colors.protein,
      },
      {
        key: 'hydration',
        earned: breakdownScores.hydration,
        max: 15,
        title: 'Stay Hydrated',
        description:
          'Drink more water to boost your hydration score and overall health.',
        bgColor: Colors.primary,
      },
      {
        key: 'exercise',
        earned: breakdownScores.exercise,
        max: 20,
        title: 'Move More',
        description:
          'Log a workout or aim for 30 minutes of activity to fill your movement ring.',
        bgColor: Colors.success,
      },
      {
        key: 'sleep',
        earned: breakdownScores.sleep,
        max: 15,
        title: 'Sleep Quality',
        description:
          'Aim for 7-9 hours of sleep to maximize your recovery score.',
        bgColor: '#A78BFA',
      },
      {
        key: 'consistency',
        earned: breakdownScores.consistency,
        max: 10,
        title: 'Build Habits',
        description:
          'Complete your daily habits and fasting goals to improve consistency.',
        bgColor: Colors.warning,
      },
    ];

    // Sort by lowest percentage and take top 3
    const sorted = areas.sort(
      (a, b) => a.earned / a.max - b.earned / b.max
    );
    return sorted.slice(0, 3);
  }, [breakdownScores]);

  const handleBack = useCallback(async () => {
    await hapticLight();
    router.back();
  }, [router]);

  if (isLoading) {
    return (
      <ScreenWrapper>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading fitness score...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <ReAnimated.View
          entering={FadeInDown.delay(0).springify().mass(0.5).damping(10)}
          style={styles.header}
        >
          <Pressable style={styles.backButton} onPress={handleBack}>
            <ChevronLeft size={24} color={Colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Fitness Score</Text>
          <View style={styles.headerMedal}>
            <Medal size={24} color={Colors.gold} />
          </View>
        </ReAnimated.View>

        {/* Main Score Display */}
        <ReAnimated.View
          entering={FadeInDown.delay(100).springify().mass(0.5).damping(10)}
          style={styles.mainScoreSection}
        >
          <LinearGradient
            colors={Gradients.card}
            style={styles.mainScoreCard}
          >
            <MainScoreRing score={currentScore} scoreLabel={scoreLabel} />

            {/* Score stats row */}
            <View style={styles.scoreStatsRow}>
              <View style={styles.scoreStat}>
                <Text style={styles.scoreStatValue}>{averageScore}</Text>
                <Text style={styles.scoreStatLabel}>7-Day Avg</Text>
              </View>
              <View style={styles.scoreStatDivider} />
              <View style={styles.scoreStat}>
                <View style={styles.trendRow}>
                  <Text style={styles.scoreStatValue}>{currentScore}</Text>
                  {trend === 'up' && (
                    <ArrowUpRight size={16} color={Colors.success} />
                  )}
                  {trend === 'down' && (
                    <ArrowDownRight size={16} color={Colors.error} />
                  )}
                </View>
                <Text style={styles.scoreStatLabel}>Today</Text>
              </View>
              <View style={styles.scoreStatDivider} />
              <View style={styles.scoreStat}>
                <Text style={[styles.scoreStatValue, { color: scoreLabel.color }]}>
                  {scoreLabel.emoji}
                </Text>
                <Text style={styles.scoreStatLabel}>Tier</Text>
              </View>
            </View>
          </LinearGradient>
        </ReAnimated.View>

        {/* Activity Rings Section */}
        <ReAnimated.View
          entering={FadeInDown.delay(200).springify().mass(0.5).damping(10)}
        >
          <Text style={styles.sectionTitle}>Activity Rings</Text>
          <LinearGradient colors={Gradients.card} style={styles.activityCard}>
            <ActivityRingsDisplay
              nutritionPercent={nutritionPercent}
              exercisePercent={exercisePercent}
              hydrationPercent={hydrationPercent}
            />
          </LinearGradient>
        </ReAnimated.View>

        {/* Score Breakdown */}
        <ReAnimated.View
          entering={FadeInDown.delay(300).springify().mass(0.5).damping(10)}
        >
          <Text style={styles.sectionTitle}>Score Breakdown</Text>
        </ReAnimated.View>

        <View style={styles.breakdownGrid}>
          <BreakdownCard
            icon={Flame}
            iconColor="#FF6B9D"
            title="Nutrition"
            earned={breakdownScores.nutrition}
            max={25}
            delay={350}
          />
          <BreakdownCard
            icon={Target}
            iconColor={Colors.protein}
            title="Protein"
            earned={breakdownScores.protein}
            max={15}
            delay={400}
          />
          <BreakdownCard
            icon={Droplets}
            iconColor={Colors.primary}
            title="Hydration"
            earned={breakdownScores.hydration}
            max={15}
            delay={450}
          />
          <BreakdownCard
            icon={Dumbbell}
            iconColor={Colors.success}
            title="Exercise"
            earned={breakdownScores.exercise}
            max={20}
            delay={500}
          />
          <BreakdownCard
            icon={Moon}
            iconColor="#A78BFA"
            title="Sleep"
            earned={breakdownScores.sleep}
            max={15}
            delay={550}
          />
          <BreakdownCard
            icon={ListChecks}
            iconColor={Colors.warning}
            title="Consistency"
            earned={breakdownScores.consistency}
            max={10}
            delay={600}
          />
        </View>

        {/* Weekly Trend */}
        <ReAnimated.View
          entering={FadeInDown.delay(650).springify().mass(0.5).damping(10)}
        >
          <Text style={styles.sectionTitle}>Weekly Trend</Text>
          <LinearGradient colors={Gradients.card} style={styles.weeklyCard}>
            <View style={styles.weeklyHeader}>
              <View style={styles.weeklyHeaderLeft}>
                <TrendingUp size={18} color={Colors.primary} />
                <Text style={styles.weeklyHeaderTitle}>Last 7 Days</Text>
              </View>
              <View style={styles.weeklyAvgBadge}>
                <Text style={styles.weeklyAvgText}>
                  Avg: {averageScore}
                </Text>
              </View>
            </View>
            <WeeklyTrendChart
              weeklyScores={weeklyScores}
              getScoreLabel={getScoreLabel}
            />
          </LinearGradient>
        </ReAnimated.View>

        {/* Tips Section */}
        <ReAnimated.View
          entering={FadeInDown.delay(750).springify().mass(0.5).damping(10)}
        >
          <Text style={styles.sectionTitle}>Tips to Improve</Text>
        </ReAnimated.View>

        {tips.map((tip, index) => (
          <TipCard key={tip.key} tip={tip} index={index} />
        ))}

        {/* How Scoring Works */}
        <ReAnimated.View
          entering={FadeInDown.delay(950).springify().mass(0.5).damping(10)}
        >
          <LinearGradient colors={Gradients.card} style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <Award size={20} color={Colors.gold} />
              <Text style={styles.infoTitle}>How Scoring Works</Text>
            </View>
            <Text style={styles.infoText}>
              Your fitness score is a daily snapshot (0-100) based on how well
              you hit your goals across 6 categories: Nutrition (25 pts),
              Exercise (20 pts), Protein (15 pts), Hydration (15 pts), Sleep
              (15 pts), and Consistency (10 pts).
            </Text>
            <View style={styles.tierList}>
              <View style={styles.tierRow}>
                <View
                  style={[styles.tierDot, { backgroundColor: '#FFD700' }]}
                />
                <Text style={styles.tierText}>
                  90-100: Elite
                </Text>
              </View>
              <View style={styles.tierRow}>
                <View
                  style={[styles.tierDot, { backgroundColor: '#00E676' }]}
                />
                <Text style={styles.tierText}>
                  75-89: Excellent
                </Text>
              </View>
              <View style={styles.tierRow}>
                <View
                  style={[styles.tierDot, { backgroundColor: '#00D4FF' }]}
                />
                <Text style={styles.tierText}>
                  60-74: Good
                </Text>
              </View>
              <View style={styles.tierRow}>
                <View
                  style={[styles.tierDot, { backgroundColor: '#FFB300' }]}
                />
                <Text style={styles.tierText}>
                  40-59: Fair
                </Text>
              </View>
              <View style={styles.tierRow}>
                <View
                  style={[styles.tierDot, { backgroundColor: '#FF6B35' }]}
                />
                <Text style={styles.tierText}>
                  0-39: Getting Started
                </Text>
              </View>
            </View>
          </LinearGradient>
        </ReAnimated.View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </ScreenWrapper>
  );
}

// ============================================================
// Styles
// ============================================================
const styles = StyleSheet.create({
  // Loading
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

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xxl,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surfaceGlass,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  headerMedal: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.goldSoft,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Main Score Section
  mainScoreSection: {
    marginBottom: Spacing.lg,
  },
  mainScoreCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  mainRingContainer: {
    width: MAIN_RING_SIZE,
    height: MAIN_RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  mainRingCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainScoreValue: {
    fontSize: 56,
    fontWeight: FontWeight.black,
    letterSpacing: -2,
  },
  mainScoreLabel: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    marginTop: 2,
  },
  mainScoreSubtext: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: 2,
  },

  // Score Stats Row
  scoreStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  scoreStat: {
    alignItems: 'center',
    flex: 1,
  },
  scoreStatValue: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  scoreStatLabel: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: 4,
  },
  scoreStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  // Section Title
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    marginTop: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Activity Rings
  activityCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: Spacing.lg,
  },
  activityRingsWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activityRingsSvgContainer: {
    width: ACTIVITY_RING_SIZE,
    height: ACTIVITY_RING_SIZE,
  },
  activityRingLabels: {
    flex: 1,
    marginLeft: Spacing.lg,
    gap: Spacing.md,
  },
  ringLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  ringDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  ringLabelText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    flex: 1,
  },
  ringLabelPercent: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },

  // Breakdown Grid
  breakdownGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  breakdownCard: {
    width: (SCREEN_WIDTH - Spacing.md * 2 - Spacing.sm) / 2,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  breakdownCardGradient: {
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  breakdownIcon: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  breakdownTitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  breakdownPoints: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  breakdownEarned: {
    fontWeight: FontWeight.bold,
  },
  breakdownMax: {
    color: Colors.textTertiary,
    fontWeight: FontWeight.regular,
    fontSize: FontSize.sm,
  },
  breakdownBarBg: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 4,
  },
  breakdownBarFill: {
    height: '100%',
    borderRadius: 2,
  },

  // Weekly Chart
  weeklyCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: Spacing.lg,
  },
  weeklyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  weeklyHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  weeklyHeaderTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  weeklyAvgBadge: {
    backgroundColor: Colors.primarySoft,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  weeklyAvgText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },
  weeklyChart: {
    paddingTop: Spacing.sm,
  },
  weeklyBars: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
  },
  weeklyBarColumn: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  weeklyBarValue: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    fontWeight: FontWeight.semibold,
  },
  weeklyBarTrack: {
    width: 24,
    height: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  weeklyBarFill: {
    width: '100%',
    borderRadius: 12,
    minHeight: 4,
  },
  weeklyBarDay: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },
  weeklyBarDayToday: {
    color: Colors.primary,
    fontWeight: FontWeight.bold,
  },

  // Tips
  tipCard: {
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  tipGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  tipIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginBottom: 2,
  },
  tipDescription: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 18,
  },

  // Info Card
  infoCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: Spacing.lg,
    marginTop: Spacing.sm,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  infoTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  infoText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  tierList: {
    gap: Spacing.sm,
  },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  tierDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  tierText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },

  // Bottom
  bottomSpacer: {
    height: 80,
  },
});

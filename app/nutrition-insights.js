/**
 * Nutrition Insights Screen - Nutrition Score & Meal Timing
 *
 * Features:
 * - Hero score card with animated ring, letter grade, motivational text
 * - Score breakdown horizontal bars for 5 categories
 * - Meal timing horizontal timeline from 6am - midnight
 * - Meal distribution donut chart with ideal comparison
 * - Actionable improvement tips
 * - Empty state when no foods logged
 */

import React, { useMemo, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Dimensions,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import ReAnimated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import { PieChart } from 'react-native-gifted-charts';
import {
  ChevronLeft,
  Award,
  Target,
  Dumbbell,
  PieChart as PieChartIcon,
  UtensilsCrossed,
  Sparkles,
  Lightbulb,
  Clock,
  Sunrise,
  Sun,
  Moon,
  Coffee,
} from 'lucide-react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import GlassCard from '../components/ui/GlassCard';
import {
  Colors,
  Gradients,
  Spacing,
  FontSize,
  FontWeight,
  BorderRadius,
  Shadows,
} from '../constants/theme';
import { hapticLight } from '../lib/haptics';
import useNutritionScore from '../hooks/useNutritionScore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Ring constants
const RING_SIZE = 180;
const RING_STROKE = 12;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

// Ideal meal distribution
const IDEAL_DISTRIBUTION = { breakfast: 25, lunch: 35, dinner: 30, snack: 10 };

// Meal type config
const MEAL_CONFIG = {
  breakfast: { label: 'Breakfast', color: '#FF8C42', icon: Sunrise },
  lunch: { label: 'Lunch', color: Colors.primary, icon: Sun },
  dinner: { label: 'Dinner', color: Colors.accentPurple, icon: Moon },
  snacks: { label: 'Snacks', color: Colors.success, icon: Coffee },
};

// ============================================================
// Helper: format Date to readable time string
// ============================================================
function formatTime(date) {
  if (!date) return '--:--';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '--:--';
  const hours = d.getHours();
  const minutes = d.getMinutes();
  const ampm = hours >= 12 ? 'pm' : 'am';
  const h = hours % 12 || 12;
  const m = minutes < 10 ? `0${minutes}` : minutes;
  return `${h}:${m}${ampm}`;
}

// ============================================================
// Score Ring Component
// ============================================================
function ScoreRing({ score, gradeColor, animatedProgress }) {
  const strokeDashoffset = animatedProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [RING_CIRCUMFERENCE, RING_CIRCUMFERENCE * (1 - score / 100)],
  });

  const AnimatedCircle = Animated.createAnimatedComponent(Circle);

  return (
    <Svg width={RING_SIZE} height={RING_SIZE} viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}>
      {/* Background ring */}
      <Circle
        cx={RING_SIZE / 2}
        cy={RING_SIZE / 2}
        r={RING_RADIUS}
        stroke="rgba(255,255,255,0.08)"
        strokeWidth={RING_STROKE}
        fill="transparent"
      />
      {/* Foreground ring */}
      <AnimatedCircle
        cx={RING_SIZE / 2}
        cy={RING_SIZE / 2}
        r={RING_RADIUS}
        stroke={gradeColor}
        strokeWidth={RING_STROKE}
        fill="transparent"
        strokeDasharray={RING_CIRCUMFERENCE}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        rotation="-90"
        origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
      />
    </Svg>
  );
}

// ============================================================
// Score Breakdown Bar
// ============================================================
function BreakdownBar({ icon: Icon, label, score, maxScore, color, delay }) {
  const pct = maxScore > 0 ? score / maxScore : 0;
  const barColor =
    pct > 0.8 ? Colors.success : pct > 0.5 ? Colors.warning : Colors.error;

  return (
    <ReAnimated.View
      entering={FadeInDown.delay(delay).springify().damping(12)}
      style={styles.breakdownRow}
    >
      <View style={styles.breakdownLeft}>
        <View style={[styles.breakdownIcon, { backgroundColor: color + '20' }]}>
          <Icon size={16} color={color} />
        </View>
        <Text style={styles.breakdownLabel}>{label}</Text>
      </View>
      <View style={styles.breakdownBarContainer}>
        <View style={styles.breakdownTrack}>
          <View
            style={[
              styles.breakdownFill,
              {
                width: `${Math.round(pct * 100)}%`,
                backgroundColor: barColor,
              },
            ]}
          />
        </View>
      </View>
      <Text style={[styles.breakdownPoints, { color: barColor }]}>
        {score}/{maxScore}
      </Text>
    </ReAnimated.View>
  );
}

// ============================================================
// Meal Timeline Component
// ============================================================
function MealTimeline({ mealTimingData }) {
  // Timeline from 6am to midnight (18 hours)
  const START_HOUR = 6;
  const END_HOUR = 24;
  const TOTAL_HOURS = END_HOUR - START_HOUR;

  const hourLabels = useMemo(() => {
    const labels = [];
    for (let h = START_HOUR; h <= END_HOUR; h += 3) {
      const displayH = h % 12 || 12;
      const ampm = h >= 12 && h < 24 ? 'pm' : 'am';
      labels.push({ hour: h, label: `${displayH}${ampm}` });
    }
    return labels;
  }, []);

  const getPositionPercent = useCallback((date) => {
    if (!date) return null;
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return null;
    const h = d.getHours() + d.getMinutes() / 60;
    if (h < START_HOUR) return 0;
    if (h > END_HOUR) return 100;
    return ((h - START_HOUR) / TOTAL_HOURS) * 100;
  }, []);

  return (
    <View style={styles.timelineContainer}>
      {/* Hour markers */}
      <View style={styles.timelineTrack}>
        <View style={styles.timelineLine} />
        {hourLabels.map(({ hour, label }) => {
          const left = ((hour - START_HOUR) / TOTAL_HOURS) * 100;
          return (
            <View
              key={hour}
              style={[styles.timelineTick, { left: `${left}%` }]}
            >
              <View style={styles.timelineTickLine} />
              <Text style={styles.timelineTickLabel}>{label}</Text>
            </View>
          );
        })}

        {/* Meal dots */}
        {mealTimingData.map((meal) => {
          const config = MEAL_CONFIG[meal.mealType];
          if (!config) return null;
          const pos = getPositionPercent(meal.firstFoodTime);
          if (pos === null) return null;
          return (
            <View
              key={meal.mealType}
              style={[
                styles.timelineDot,
                {
                  left: `${pos}%`,
                  backgroundColor: config.color,
                },
              ]}
            >
              <View style={[styles.timelineDotGlow, { backgroundColor: config.color + '40' }]} />
            </View>
          );
        })}
      </View>

      {/* Meal legend */}
      <View style={styles.timelineLegend}>
        {mealTimingData.map((meal) => {
          const config = MEAL_CONFIG[meal.mealType];
          if (!config) return null;
          return (
            <View key={meal.mealType} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: config.color }]} />
              <Text style={styles.legendText}>
                {config.label} {formatTime(meal.firstFoodTime)}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ============================================================
// Meal Distribution Donut
// ============================================================
function MealDistributionChart({ distribution }) {
  const pieData = useMemo(() => {
    const items = [
      { value: distribution.breakfast || 0, color: '#FF8C42', text: `${distribution.breakfast}%`, label: 'Breakfast' },
      { value: distribution.lunch || 0, color: Colors.primary, text: `${distribution.lunch}%`, label: 'Lunch' },
      { value: distribution.dinner || 0, color: Colors.accentPurple, text: `${distribution.dinner}%`, label: 'Dinner' },
      { value: distribution.snack || 0, color: Colors.success, text: `${distribution.snack}%`, label: 'Snacks' },
    ].filter((d) => d.value > 0);

    // If everything is zero, show placeholder
    if (items.length === 0) {
      return [{ value: 1, color: 'rgba(255,255,255,0.1)', text: '0%', label: 'None' }];
    }
    return items;
  }, [distribution]);

  return (
    <View style={styles.donutContainer}>
      <View style={styles.donutChartWrapper}>
        <PieChart
          data={pieData}
          donut
          radius={70}
          innerRadius={45}
          innerCircleColor={Colors.surface}
          centerLabelComponent={() => (
            <View style={styles.donutCenter}>
              <PieChartIcon size={18} color={Colors.textSecondary} />
              <Text style={styles.donutCenterText}>Split</Text>
            </View>
          )}
        />
      </View>

      {/* Actual vs Ideal comparison */}
      <View style={styles.distributionComparison}>
        <View style={styles.distributionHeader}>
          <Text style={styles.distributionColHeader}>Meal</Text>
          <Text style={styles.distributionColHeader}>Actual</Text>
          <Text style={styles.distributionColHeader}>Ideal</Text>
        </View>
        {[
          { key: 'breakfast', label: 'Breakfast', color: '#FF8C42' },
          { key: 'lunch', label: 'Lunch', color: Colors.primary },
          { key: 'dinner', label: 'Dinner', color: Colors.accentPurple },
          { key: 'snack', label: 'Snacks', color: Colors.success },
        ].map((item) => (
          <View key={item.key} style={styles.distributionRow}>
            <View style={styles.distributionMeal}>
              <View style={[styles.distributionDot, { backgroundColor: item.color }]} />
              <Text style={styles.distributionMealText}>{item.label}</Text>
            </View>
            <Text style={styles.distributionValue}>
              {distribution[item.key] || 0}%
            </Text>
            <Text style={styles.distributionIdeal}>
              {IDEAL_DISTRIBUTION[item.key]}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ============================================================
// Tip Card
// ============================================================
function TipCard({ tip, delay }) {
  return (
    <ReAnimated.View entering={FadeInDown.delay(delay).springify().damping(12)}>
      <GlassCard style={styles.tipCard}>
        <View style={styles.tipContent}>
          <View style={styles.tipIconContainer}>
            <Lightbulb size={18} color={Colors.warning} />
          </View>
          <Text style={styles.tipText}>{tip}</Text>
        </View>
      </GlassCard>
    </ReAnimated.View>
  );
}

// ============================================================
// Empty State
// ============================================================
function EmptyState() {
  const router = useRouter();

  return (
    <ReAnimated.View entering={FadeInDown.delay(200).springify().damping(12)} style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <Award size={48} color={Colors.textTertiary} />
      </View>
      <Text style={styles.emptyTitle}>No Foods Logged Today</Text>
      <Text style={styles.emptySubtitle}>
        Log your meals to see your daily nutrition score, meal timing insights, and
        improvement tips.
      </Text>
      <Pressable
        style={styles.emptyButton}
        onPress={async () => {
          await hapticLight();
          router.push('/(tabs)/add');
        }}
      >
        <LinearGradient
          colors={Gradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.emptyButtonGradient}
        >
          <Text style={styles.emptyButtonText}>Log Food</Text>
        </LinearGradient>
      </Pressable>
    </ReAnimated.View>
  );
}

// ============================================================
// Motivational text based on score
// ============================================================
function getMotivationalText(score) {
  if (score >= 90) return 'Outstanding! Your nutrition is on point.';
  if (score >= 80) return 'Great job! You are fueling your body well.';
  if (score >= 70) return 'Solid day! A few tweaks and you will be elite.';
  if (score >= 60) return 'Good effort. Check the tips below to level up.';
  if (score >= 50) return 'Decent start. Focus on the key areas below.';
  if (score > 0) return 'Room to improve. Small changes make a big difference.';
  return 'Start logging to see your score!';
}

// ============================================================
// Main Screen
// ============================================================
export default function NutritionInsightsScreen() {
  const router = useRouter();

  const {
    dailyScore,
    scoreBreakdown,
    grade,
    gradeColor,
    mealTimingData,
    eatingWindow,
    mealDistribution,
    tips,
    hasFood,
  } = useNutritionScore();

  // Animated ring progress
  const animatedProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (hasFood) {
      Animated.timing(animatedProgress, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: false,
      }).start();
    }
  }, [hasFood, dailyScore]);

  // Score number animation
  const animatedScore = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (hasFood) {
      Animated.timing(animatedScore, {
        toValue: dailyScore,
        duration: 1000,
        useNativeDriver: false,
      }).start();
    }
  }, [hasFood, dailyScore]);

  const handleBack = useCallback(async () => {
    await hapticLight();
    router.back();
  }, [router]);

  const motivationalText = useMemo(() => getMotivationalText(dailyScore), [dailyScore]);

  return (
    <ScreenWrapper>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ---- Header ---- */}
        <ReAnimated.View
          entering={FadeInDown.delay(0).springify().damping(12)}
          style={styles.header}
        >
          <Pressable onPress={handleBack} style={styles.backButton}>
            <ChevronLeft size={24} color={Colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Nutrition Score</Text>
          <View style={styles.headerRight}>
            <Award size={22} color={gradeColor} />
          </View>
        </ReAnimated.View>

        {!hasFood ? (
          <EmptyState />
        ) : (
          <>
            {/* ---- Score Hero Card ---- */}
            <ReAnimated.View entering={FadeInDown.delay(80).springify().damping(12)}>
              <GlassCard style={styles.heroCard}>
                <LinearGradient
                  colors={[gradeColor + '15', 'transparent']}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                  style={styles.heroGlow}
                />
                <View style={styles.heroContent}>
                  {/* Ring + Score */}
                  <View style={styles.heroRingContainer}>
                    <ScoreRing
                      score={dailyScore}
                      gradeColor={gradeColor}
                      animatedProgress={animatedProgress}
                    />
                    <View style={styles.heroScoreOverlay}>
                      <AnimatedScoreText animatedScore={animatedScore} />
                      <Text style={[styles.heroScoreLabel, { color: Colors.textSecondary }]}>
                        out of 100
                      </Text>
                    </View>
                  </View>

                  {/* Grade badge */}
                  <View style={[styles.gradeBadge, { backgroundColor: gradeColor + '25', borderColor: gradeColor + '50' }]}>
                    <Text style={[styles.gradeText, { color: gradeColor }]}>{grade}</Text>
                  </View>

                  {/* Motivational text */}
                  <Text style={styles.heroMotivation}>{motivationalText}</Text>
                </View>
              </GlassCard>
            </ReAnimated.View>

            {/* ---- Score Breakdown ---- */}
            <ReAnimated.View entering={FadeInDown.delay(160).springify().damping(12)}>
              <Text style={styles.sectionTitle}>Score Breakdown</Text>
              <GlassCard style={styles.breakdownCard}>
                <BreakdownBar
                  icon={Target}
                  label="Calories"
                  score={scoreBreakdown.calories}
                  maxScore={25}
                  color={Colors.secondary}
                  delay={200}
                />
                <BreakdownBar
                  icon={Dumbbell}
                  label="Protein"
                  score={scoreBreakdown.protein}
                  maxScore={25}
                  color={Colors.protein}
                  delay={240}
                />
                <BreakdownBar
                  icon={PieChartIcon}
                  label="Macros"
                  score={scoreBreakdown.macros}
                  maxScore={20}
                  color={Colors.carbs}
                  delay={280}
                />
                <BreakdownBar
                  icon={UtensilsCrossed}
                  label="Meals"
                  score={scoreBreakdown.consistency}
                  maxScore={15}
                  color={Colors.warning}
                  delay={320}
                />
                <BreakdownBar
                  icon={Sparkles}
                  label="Variety"
                  score={scoreBreakdown.variety}
                  maxScore={15}
                  color={Colors.accentPurple}
                  delay={360}
                />
              </GlassCard>
            </ReAnimated.View>

            {/* ---- Meal Timing ---- */}
            {mealTimingData.length > 0 && (
              <ReAnimated.View entering={FadeInDown.delay(400).springify().damping(12)}>
                <Text style={styles.sectionTitle}>Meal Timing</Text>
                <GlassCard style={styles.timingCard}>
                  <MealTimeline mealTimingData={mealTimingData} />

                  {/* Eating window badge */}
                  {eatingWindow.start && eatingWindow.end && (
                    <View style={styles.eatingWindowBadge}>
                      <Clock size={14} color={Colors.primary} />
                      <Text style={styles.eatingWindowText}>
                        Eating window: {formatTime(eatingWindow.start)} -{' '}
                        {formatTime(eatingWindow.end)} ({eatingWindow.durationHours}h)
                      </Text>
                    </View>
                  )}
                </GlassCard>
              </ReAnimated.View>
            )}

            {/* ---- Meal Distribution ---- */}
            <ReAnimated.View entering={FadeInDown.delay(480).springify().damping(12)}>
              <Text style={styles.sectionTitle}>Calorie Distribution</Text>
              <GlassCard style={styles.distributionCard}>
                <MealDistributionChart distribution={mealDistribution} />
              </GlassCard>
            </ReAnimated.View>

            {/* ---- Improvement Tips ---- */}
            {tips.length > 0 && (
              <ReAnimated.View entering={FadeInDown.delay(560).springify().damping(12)}>
                <Text style={styles.sectionTitle}>Improvement Tips</Text>
                {tips.map((tip, index) => (
                  <TipCard key={index} tip={tip} delay={600 + index * 60} />
                ))}
              </ReAnimated.View>
            )}
          </>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </ScreenWrapper>
  );
}

// ============================================================
// Animated score counter - uses listener to update displayed text
// ============================================================
function AnimatedScoreText({ animatedScore }) {
  const [displayScore, setDisplayScore] = React.useState(0);

  useEffect(() => {
    const id = animatedScore.addListener(({ value }) => {
      setDisplayScore(Math.round(value));
    });
    return () => animatedScore.removeListener(id);
  }, [animatedScore]);

  return (
    <Text style={styles.heroScoreNumber}>{displayScore}</Text>
  );
}

// ============================================================
// Styles
// ============================================================
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
    backgroundColor: Colors.surfaceGlass,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    letterSpacing: -0.3,
  },
  headerRight: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceGlass,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Hero card
  heroCard: {
    marginBottom: Spacing.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  heroGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
    borderRadius: 24,
  },
  heroContent: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  heroRingContainer: {
    width: RING_SIZE,
    height: RING_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  heroScoreOverlay: {
    position: 'absolute',
    alignItems: 'center',
  },
  heroScoreNumber: {
    fontSize: 52,
    fontWeight: FontWeight.black,
    color: Colors.text,
    letterSpacing: -2,
  },
  heroScoreLabel: {
    fontSize: FontSize.xs,
    marginTop: -2,
  },
  gradeBadge: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  gradeText: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.black,
    letterSpacing: 1,
  },
  heroMotivation: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: Spacing.md,
  },

  // Section title
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.md,
    letterSpacing: -0.3,
  },

  // Breakdown
  breakdownCard: {
    marginBottom: Spacing.lg,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  breakdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 110,
  },
  breakdownIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  breakdownLabel: {
    fontSize: FontSize.sm,
    color: Colors.text,
    fontWeight: FontWeight.medium,
  },
  breakdownBarContainer: {
    flex: 1,
    marginHorizontal: Spacing.sm,
  },
  breakdownTrack: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  breakdownFill: {
    height: '100%',
    borderRadius: 4,
  },
  breakdownPoints: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    width: 40,
    textAlign: 'right',
  },

  // Timing
  timingCard: {
    marginBottom: Spacing.lg,
  },
  timelineContainer: {
    paddingTop: Spacing.sm,
  },
  timelineTrack: {
    height: 60,
    position: 'relative',
    marginBottom: Spacing.sm,
  },
  timelineLine: {
    position: 'absolute',
    top: 20,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 1,
  },
  timelineTick: {
    position: 'absolute',
    top: 14,
    alignItems: 'center',
    marginLeft: -15,
    width: 30,
  },
  timelineTickLine: {
    width: 1,
    height: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  timelineTickLabel: {
    fontSize: 9,
    color: Colors.textTertiary,
    marginTop: 4,
  },
  timelineDot: {
    position: 'absolute',
    top: 13,
    width: 16,
    height: 16,
    borderRadius: 8,
    marginLeft: -8,
    zIndex: 10,
  },
  timelineDotGlow: {
    position: 'absolute',
    top: -4,
    left: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  timelineLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },

  // Eating window
  eatingWindowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.primarySoft,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.md,
    alignSelf: 'center',
  },
  eatingWindowText: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: FontWeight.medium,
  },

  // Distribution
  distributionCard: {
    marginBottom: Spacing.lg,
  },
  donutContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  donutChartWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutCenterText: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  distributionComparison: {
    flex: 1,
  },
  distributionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
    paddingBottom: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  distributionColHeader: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    fontWeight: FontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
  },
  distributionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  distributionMeal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flex: 1,
  },
  distributionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  distributionMealText: {
    fontSize: FontSize.sm,
    color: Colors.text,
  },
  distributionValue: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    flex: 1,
    textAlign: 'center',
  },
  distributionIdeal: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    flex: 1,
    textAlign: 'right',
  },

  // Tips
  tipCard: {
    marginBottom: Spacing.sm,
  },
  tipContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  tipIconContainer: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: Colors.warningSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  tipText: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    lineHeight: 22,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: Spacing.xl,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.surfaceGlass,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  emptyButton: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  emptyButtonGradient: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  emptyButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.background,
  },

  // Bottom spacer
  bottomSpacer: {
    height: 120,
  },
});

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BarChart } from 'react-native-gifted-charts';
import {
  ArrowLeft,
  Clock,
  Sunrise,
  Sun,
  Moon,
  Cookie,
  TrendingUp,
  BarChart3,
  Zap,
  Target,
  Info,
} from 'lucide-react-native';

import { Colors, Gradients, Spacing, FontSize, FontWeight, BorderRadius, Shadows } from '../constants/theme';
import ScreenWrapper from '../components/ScreenWrapper';
import { hapticLight } from '../lib/haptics';
import useMealTiming from '../hooks/useMealTiming';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - Spacing.md * 4;

// ─── Meal Config ────────────────────────────────────────────────────────────

const MEAL_CONFIG = {
  breakfast: {
    label: 'Breakfast',
    emoji: '🌅',
    color: '#FFB300',
    softColor: 'rgba(255, 179, 0, 0.15)',
    glowColor: 'rgba(255, 179, 0, 0.3)',
    icon: Sunrise,
  },
  lunch: {
    label: 'Lunch',
    emoji: '☀️',
    color: '#00E676',
    softColor: 'rgba(0, 230, 118, 0.15)',
    glowColor: 'rgba(0, 230, 118, 0.3)',
    icon: Sun,
  },
  dinner: {
    label: 'Dinner',
    emoji: '🌙',
    color: '#64D2FF',
    softColor: 'rgba(100, 210, 255, 0.15)',
    glowColor: 'rgba(100, 210, 255, 0.3)',
    icon: Moon,
  },
  snack: {
    label: 'Snack',
    emoji: '🍪',
    color: '#BF5AF2',
    softColor: 'rgba(191, 90, 242, 0.15)',
    glowColor: 'rgba(191, 90, 242, 0.3)',
    icon: Cookie,
  },
};

// ─── Insight border colors ──────────────────────────────────────────────────

const INSIGHT_COLORS = {
  late_breakfast: '#FFB300',
  late_dinner: '#64D2FF',
  wide_window: '#FF6B35',
  narrow_window: '#00E676',
  consistent: '#00D4FF',
  inconsistent: '#FF5252',
};

// ─── Helper Components ──────────────────────────────────────────────────────

function GlassCard({ children, style }) {
  return (
    <View style={[styles.glassCard, style]}>
      {children}
    </View>
  );
}

function SectionHeader({ title, icon: Icon, iconColor }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionIconCircle, { backgroundColor: `${iconColor}15` }]}>
        <Icon size={16} color={iconColor} strokeWidth={2} />
      </View>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

// ─── Consistency Score Card ─────────────────────────────────────────────────

function ConsistencyScoreCard({ score, delay }) {
  const scoreColor = score >= 80
    ? Colors.success
    : score >= 50
      ? Colors.warning
      : Colors.error;

  const scoreLabel = score >= 80
    ? 'Excellent'
    : score >= 60
      ? 'Good'
      : score >= 40
        ? 'Fair'
        : score > 0
          ? 'Needs Work'
          : 'No Data';

  // Build a simple ring progress indicator
  const ringSize = 120;
  const strokeWidth = 8;
  const radius = (ringSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progressOffset = circumference - (circumference * Math.min(score, 100)) / 100;

  return (
    <Animated.View
      entering={FadeInDown.delay(delay).springify().damping(12)}
    >
      <GlassCard style={styles.consistencyCard}>
        <View style={styles.consistencyContent}>
          <View style={styles.consistencyRing}>
            <LinearGradient
              colors={[`${scoreColor}20`, `${scoreColor}08`]}
              style={styles.consistencyRingBg}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.consistencyScoreInner}>
                <Text style={[styles.consistencyScoreNumber, { color: scoreColor }]}>
                  {score}
                </Text>
                <Text style={styles.consistencyScoreMax}>/100</Text>
              </View>
            </LinearGradient>
            {/* Colored ring border effect */}
            <View style={[styles.consistencyRingBorder, { borderColor: `${scoreColor}40` }]} />
          </View>
          <View style={styles.consistencyInfo}>
            <Text style={styles.consistencyTitle}>Consistency Score</Text>
            <Text style={[styles.consistencyLabel, { color: scoreColor }]}>
              {scoreLabel}
            </Text>
            <Text style={styles.consistencyDescription}>
              Based on how regularly you eat your meals at the same time each day.
            </Text>
          </View>
        </View>
      </GlassCard>
    </Animated.View>
  );
}

// ─── Average Meal Time Card ─────────────────────────────────────────────────

function MealTimeCard({ mealType, data, delay }) {
  const config = MEAL_CONFIG[mealType];
  if (!config) return null;

  const IconComponent = config.icon;

  return (
    <Animated.View
      entering={FadeInDown.delay(delay).springify().damping(12)}
      style={styles.mealTimeCardWrapper}
    >
      <GlassCard style={styles.mealTimeCard}>
        <View style={[styles.mealTimeIconCircle, { backgroundColor: config.softColor }]}>
          <IconComponent size={18} color={config.color} strokeWidth={2} />
        </View>
        <Text style={styles.mealTimeEmoji}>{config.emoji}</Text>
        <Text style={[styles.mealTypeName, { color: config.color }]}>
          {config.label}
        </Text>
        {data ? (
          <>
            <Text style={styles.mealTimeAvg}>{data.formatted}</Text>
            <Text style={styles.mealTimeCount}>
              {data.count} meal{data.count !== 1 ? 's' : ''} logged
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.mealTimeNoData}>No data</Text>
            <Text style={styles.mealTimeCount}>Log meals to see avg</Text>
          </>
        )}
      </GlassCard>
    </Animated.View>
  );
}

// ─── Insight Card ───────────────────────────────────────────────────────────

function InsightCard({ insight, delay }) {
  const borderColor = INSIGHT_COLORS[insight.type] || Colors.primary;

  return (
    <Animated.View
      entering={FadeInDown.delay(delay).springify().damping(12)}
    >
      <GlassCard style={[styles.insightCard, { borderLeftColor: borderColor, borderLeftWidth: 3 }]}>
        <View style={styles.insightContent}>
          <Text style={styles.insightEmoji}>{insight.emoji}</Text>
          <Text style={styles.insightText}>{insight.text}</Text>
        </View>
      </GlassCard>
    </Animated.View>
  );
}

// ─── Empty State ────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <Animated.View
      entering={FadeInDown.delay(200).springify().damping(12)}
      style={styles.emptyContainer}
    >
      <LinearGradient
        colors={['rgba(0,212,255,0.15)', 'rgba(0,212,255,0.05)']}
        style={styles.emptyIconCircle}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Clock size={48} color={Colors.primary} strokeWidth={1.5} />
      </LinearGradient>
      <Text style={styles.emptyTitle}>Meal Timing Analytics</Text>
      <Text style={styles.emptySubtitle}>
        Log some meals to see your eating patterns, consistency score, and
        personalized insights about your meal timing.
      </Text>
      <View style={styles.emptyHintRow}>
        <Info size={16} color={Colors.textSecondary} strokeWidth={2} />
        <Text style={styles.emptyHint}>
          Start logging meals to unlock analytics
        </Text>
      </View>
    </Animated.View>
  );
}

// ─── Main Screen ────────────────────────────────────────────────────────────

export default function MealTimingScreen() {
  const router = useRouter();
  const {
    mealTimes,
    isLoading,
    getAverageMealTimes,
    getEatingWindow,
    getHourlyDistribution,
    getConsistencyScore,
    getInsights,
  } = useMealTiming();

  // Derived data
  const avgMealTimes = useMemo(() => getAverageMealTimes(), [getAverageMealTimes]);
  const eatingWindow = useMemo(() => getEatingWindow(), [getEatingWindow]);
  const hourlyDist = useMemo(() => getHourlyDistribution(), [getHourlyDistribution]);
  const consistencyScore = useMemo(() => getConsistencyScore(), [getConsistencyScore]);
  const insights = useMemo(() => getInsights(), [getInsights]);

  const hasData = mealTimes.length > 0;

  // ─── Eating Window Chart Data ───────────────────────────────────────────

  const windowChartData = useMemo(() => {
    return eatingWindow.map((day) => {
      let barColor;
      if (day.windowHours <= 0) {
        barColor = 'rgba(255,255,255,0.06)';
      } else if (day.windowHours <= 10) {
        barColor = Colors.success;
      } else if (day.windowHours <= 14) {
        barColor = Colors.warning;
      } else {
        barColor = Colors.error;
      }

      return {
        value: day.windowHours,
        label: day.day,
        frontColor: barColor,
        topLabelComponent: () =>
          day.windowHours > 0 ? (
            <Text style={styles.barTopLabel}>{day.windowHours}h</Text>
          ) : null,
        labelTextStyle: styles.barBottomLabel,
      };
    });
  }, [eatingWindow]);

  // ─── Hourly Distribution Chart Data ─────────────────────────────────────

  const hourlyChartData = useMemo(() => {
    if (hourlyDist.length === 0) return [];

    // Only show hours 5AM-11PM range for readability
    const filtered = hourlyDist.filter(h => h.hour >= 5 && h.hour <= 23);

    return filtered.map((h) => {
      const hourLabel = h.hour > 12
        ? `${h.hour - 12}P`
        : h.hour === 12
          ? '12P'
          : h.hour === 0
            ? '12A'
            : `${h.hour}A`;

      return {
        value: h.avgCalories,
        label: hourLabel,
        frontColor: Colors.primary,
        topLabelComponent: () =>
          h.avgCalories > 0 ? (
            <Text style={styles.barTopLabel}>{h.avgCalories}</Text>
          ) : null,
        labelTextStyle: styles.barBottomLabel,
      };
    });
  }, [hourlyDist]);

  // ─── Average eating window for reference line ───────────────────────────

  const avgWindowHours = useMemo(() => {
    const withData = eatingWindow.filter(w => w.windowHours > 0);
    if (withData.length === 0) return 0;
    return Math.round(
      withData.reduce((s, w) => s + w.windowHours, 0) / withData.length * 10
    ) / 10;
  }, [eatingWindow]);

  // ─── Handlers ───────────────────────────────────────────────────────────

  const handleBack = () => {
    hapticLight();
    router.back();
  };

  // ─── Loading State ──────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <ScreenWrapper>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </ScreenWrapper>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <ScreenWrapper>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Header ──────────────────────────────────────────────── */}
        <Animated.View
          entering={FadeInDown.delay(100).springify().damping(12)}
          style={styles.header}
        >
          <TouchableOpacity
            onPress={handleBack}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <ArrowLeft size={22} color={Colors.text} strokeWidth={2} />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Meal Timing</Text>

          <LinearGradient
            colors={['rgba(0,212,255,0.2)', 'rgba(0,212,255,0.05)']}
            style={styles.headerIconCircle}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Clock size={20} color={Colors.primary} strokeWidth={2} />
          </LinearGradient>
        </Animated.View>

        {/* ─── Empty State or Analytics ────────────────────────────── */}
        {!hasData ? (
          <EmptyState />
        ) : (
          <>
            {/* ─── Consistency Score ──────────────────────────────── */}
            <ConsistencyScoreCard
              score={consistencyScore}
              delay={150}
            />

            {/* ─── Average Meal Times ────────────────────────────── */}
            <Animated.View
              entering={FadeInDown.delay(200).springify().damping(12)}
            >
              <SectionHeader
                title="Average Meal Times"
                icon={Clock}
                iconColor={Colors.primary}
              />
            </Animated.View>

            <View style={styles.mealTimesGrid}>
              <MealTimeCard
                mealType="breakfast"
                data={avgMealTimes.breakfast}
                delay={250}
              />
              <MealTimeCard
                mealType="lunch"
                data={avgMealTimes.lunch}
                delay={300}
              />
              <MealTimeCard
                mealType="dinner"
                data={avgMealTimes.dinner}
                delay={350}
              />
              <MealTimeCard
                mealType="snack"
                data={avgMealTimes.snack}
                delay={400}
              />
            </View>

            {/* ─── Eating Window Chart ────────────────────────────── */}
            <Animated.View
              entering={FadeInDown.delay(450).springify().damping(12)}
            >
              <SectionHeader
                title="Eating Window"
                icon={Target}
                iconColor="#00E676"
              />
              <GlassCard style={styles.chartCard}>
                <View style={styles.chartLegend}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: Colors.success }]} />
                    <Text style={styles.legendText}>10h or less</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: Colors.warning }]} />
                    <Text style={styles.legendText}>10-14h</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: Colors.error }]} />
                    <Text style={styles.legendText}>14h+</Text>
                  </View>
                </View>

                <BarChart
                  data={windowChartData}
                  width={CHART_WIDTH}
                  height={180}
                  barWidth={28}
                  spacing={16}
                  noOfSections={4}
                  maxValue={Math.max(20, avgWindowHours + 6)}
                  barBorderRadius={6}
                  frontColor="rgba(0,212,255,0.6)"
                  yAxisColor="rgba(255,255,255,0.06)"
                  xAxisColor="rgba(255,255,255,0.06)"
                  yAxisTextStyle={styles.yAxisText}
                  xAxisLabelTextStyle={styles.xAxisText}
                  hideRules={false}
                  rulesColor="rgba(255,255,255,0.04)"
                  rulesType="dashed"
                  showReferenceLine1={avgWindowHours > 0}
                  referenceLine1Position={avgWindowHours}
                  referenceLine1Config={{
                    color: 'rgba(0,212,255,0.5)',
                    dashWidth: 6,
                    dashGap: 4,
                    thickness: 1,
                  }}
                  isAnimated
                  animationDuration={600}
                  backgroundColor="transparent"
                  xAxisThickness={1}
                  yAxisThickness={0}
                  disableScroll
                />

                <View style={styles.chartFooter}>
                  <Text style={styles.chartFooterText}>
                    {avgWindowHours > 0
                      ? `Avg window: ${avgWindowHours}h (dashed line)`
                      : 'Log 2+ meals per day to see your window'}
                  </Text>
                </View>
              </GlassCard>
            </Animated.View>

            {/* ─── Hourly Calorie Distribution ────────────────────── */}
            {hourlyChartData.length > 0 && (
              <Animated.View
                entering={FadeInDown.delay(550).springify().damping(12)}
              >
                <SectionHeader
                  title="Calorie Distribution"
                  icon={BarChart3}
                  iconColor="#FFB300"
                />
                <GlassCard style={styles.chartCard}>
                  <Text style={styles.chartDescription}>
                    Average calories consumed per hour of the day
                  </Text>

                  <BarChart
                    data={hourlyChartData}
                    width={CHART_WIDTH}
                    height={180}
                    barWidth={hourlyChartData.length > 10 ? 18 : 28}
                    spacing={hourlyChartData.length > 10 ? 8 : 16}
                    noOfSections={4}
                    maxValue={Math.max(
                      ...hourlyChartData.map(d => d.value),
                      100
                    ) * 1.2}
                    barBorderRadius={6}
                    frontColor={Colors.primary}
                    yAxisColor="rgba(255,255,255,0.06)"
                    xAxisColor="rgba(255,255,255,0.06)"
                    yAxisTextStyle={styles.yAxisText}
                    xAxisLabelTextStyle={styles.xAxisText}
                    hideRules={false}
                    rulesColor="rgba(255,255,255,0.04)"
                    rulesType="dashed"
                    isAnimated
                    animationDuration={600}
                    backgroundColor="transparent"
                    xAxisThickness={1}
                    yAxisThickness={0}
                    disableScroll
                  />

                  <View style={styles.chartFooter}>
                    <Text style={styles.chartFooterText}>
                      Hourly average based on recent meals
                    </Text>
                  </View>
                </GlassCard>
              </Animated.View>
            )}

            {/* ─── AI Insights ────────────────────────────────────── */}
            {insights.length > 0 && (
              <Animated.View
                entering={FadeInDown.delay(650).springify().damping(12)}
              >
                <SectionHeader
                  title="Insights"
                  icon={TrendingUp}
                  iconColor="#00E676"
                />
                {insights.map((insight, index) => (
                  <InsightCard
                    key={insight.type}
                    insight={insight}
                    delay={700 + index * 50}
                  />
                ))}
              </Animated.View>
            )}

            {/* ─── Meal Summary Stats Row ─────────────────────────── */}
            <Animated.View
              entering={FadeInDown.delay(800).springify().damping(12)}
            >
              <SectionHeader
                title="Summary"
                icon={Zap}
                iconColor="#BF5AF2"
              />
              <GlassCard style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryValue}>{mealTimes.length}</Text>
                    <Text style={styles.summaryLabel}>Total Meals</Text>
                  </View>
                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryValue}>
                      {avgWindowHours > 0 ? `${avgWindowHours}h` : '--'}
                    </Text>
                    <Text style={styles.summaryLabel}>Avg Window</Text>
                  </View>
                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryItem}>
                    <Text style={[styles.summaryValue, {
                      color: consistencyScore >= 80
                        ? Colors.success
                        : consistencyScore >= 50
                          ? Colors.warning
                          : Colors.error,
                    }]}>
                      {consistencyScore > 0 ? consistencyScore : '--'}
                    </Text>
                    <Text style={styles.summaryLabel}>Consistency</Text>
                  </View>
                </View>
              </GlassCard>
            </Animated.View>
          </>
        )}

        {/* ─── Bottom Spacer ──────────────────────────────────────── */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </ScreenWrapper>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Scroll
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
    borderColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    letterSpacing: 0.3,
  },
  headerIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,212,255,0.15)',
  },

  // Glass Card
  glassCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: Spacing.md,
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    marginTop: Spacing.xs,
  },
  sectionIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.xs,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    letterSpacing: 0.2,
  },

  // Consistency Score Card
  consistencyCard: {
    marginBottom: Spacing.lg,
  },
  consistencyContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  consistencyRing: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  consistencyRingBg: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  consistencyRingBorder: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
  },
  consistencyScoreInner: {
    alignItems: 'center',
  },
  consistencyScoreNumber: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    letterSpacing: -1,
  },
  consistencyScoreMax: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    fontWeight: FontWeight.medium,
    marginTop: -2,
  },
  consistencyInfo: {
    flex: 1,
  },
  consistencyTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: Spacing.xs,
  },
  consistencyLabel: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.xs,
  },
  consistencyDescription: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    lineHeight: 18,
  },

  // Meal Times Grid
  mealTimesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  mealTimeCardWrapper: {
    width: '48%',
    marginBottom: Spacing.sm,
  },
  mealTimeCard: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
  mealTimeIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  mealTimeEmoji: {
    fontSize: 24,
    marginBottom: Spacing.xs,
  },
  mealTypeName: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    marginBottom: Spacing.xs,
    letterSpacing: 0.2,
  },
  mealTimeAvg: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: 2,
  },
  mealTimeNoData: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.textTertiary,
    marginBottom: 2,
  },
  mealTimeCount: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    fontWeight: FontWeight.medium,
  },

  // Chart Card
  chartCard: {
    marginBottom: Spacing.lg,
    paddingVertical: Spacing.md,
    overflow: 'hidden',
  },
  chartDescription: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.xs,
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  barTopLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
    marginBottom: 2,
  },
  barBottomLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  yAxisText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.3)',
    fontWeight: FontWeight.medium,
  },
  xAxisText: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  chartFooter: {
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  chartFooterText: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    fontWeight: FontWeight.medium,
  },

  // Insight Cards
  insightCard: {
    marginBottom: Spacing.sm,
    borderLeftWidth: 3,
    borderRadius: BorderRadius.xl,
  },
  insightContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  insightEmoji: {
    fontSize: 24,
  },
  insightText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
    fontWeight: FontWeight.medium,
  },

  // Summary Card
  summaryCard: {
    marginBottom: Spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  summaryValue: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: Spacing.lg,
  },
  emptyIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(0,212,255,0.12)',
  },
  emptyTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.sm,
    letterSpacing: 0.3,
  },
  emptySubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  emptyHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  emptyHint: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },

  // Bottom Spacer
  bottomSpacer: {
    height: 120,
  },
});

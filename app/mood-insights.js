/**
 * Mood & Food Correlation Insights Screen
 *
 * Visualises how nutrition, hydration, macros and meal timing
 * correlate with the user's logged mood / energy / focus.
 *
 * Sections:
 *  - 7-day mood trend line chart
 *  - Macro impact cards (protein / carb / balanced)
 *  - Food-mood connections (boosters + drainers)
 *  - Hydration impact comparison
 *  - Calorie target impact
 *  - AI-style generated insights
 *  - Empty state when data is insufficient
 */

import React, { useMemo, useCallback } from 'react';
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
import ReAnimated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { LineChart, BarChart } from 'react-native-gifted-charts';
import {
  ChevronLeft,
  Brain,
  Lightbulb,
  Droplets,
  Target,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  Flame,
  Zap,
  Utensils,
  ThumbsUp,
  ThumbsDown,
  Clock,
} from 'lucide-react-native';
import ScreenWrapper from '../components/ScreenWrapper';
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
import useMoodFoodCorrelation from '../hooks/useMoodFoodCorrelation';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - Spacing.md * 2 - Spacing.lg * 2;

// ============================================================
// Helper: round to 1 decimal
// ============================================================
function r1(n) {
  if (n === null || n === undefined) return '--';
  return (Math.round(n * 10) / 10).toFixed(1);
}

// ============================================================
// Mood colour for a score (1-10)
// ============================================================
function moodColor(score) {
  if (score === null || score === undefined) return Colors.textTertiary;
  if (score >= 7) return Colors.success;
  if (score >= 5) return Colors.warning;
  return Colors.error;
}

function moodEmoji(score) {
  if (score === null || score === undefined) return '\u{2014}';
  if (score >= 8) return '\u{1F929}';
  if (score >= 6.5) return '\u{1F60A}';
  if (score >= 5) return '\u{1F610}';
  if (score >= 3) return '\u{1F614}';
  return '\u{1F629}';
}

// ============================================================
// Empty State
// ============================================================
function EmptyState() {
  return (
    <ReAnimated.View entering={FadeInDown.delay(100).springify().mass(0.5).damping(10)} style={styles.emptyContainer}>
      <LinearGradient
        colors={Gradients.card}
        style={styles.emptyGradient}
      >
        <View style={styles.emptyIconWrap}>
          <Brain size={48} color={Colors.accentPurple} />
        </View>
        <Text style={styles.emptyTitle}>Not Enough Data Yet</Text>
        <Text style={styles.emptySubtitle}>
          Log your mood and food for at least 3 days to unlock insights about how your nutrition affects your mood.
        </Text>
        <View style={styles.emptySteps}>
          <View style={styles.emptyStep}>
            <Text style={styles.emptyStepNum}>1</Text>
            <Text style={styles.emptyStepText}>Log your meals daily</Text>
          </View>
          <View style={styles.emptyStep}>
            <Text style={styles.emptyStepNum}>2</Text>
            <Text style={styles.emptyStepText}>Check in your mood regularly</Text>
          </View>
          <View style={styles.emptyStep}>
            <Text style={styles.emptyStepNum}>3</Text>
            <Text style={styles.emptyStepText}>Come back for personalised insights</Text>
          </View>
        </View>
      </LinearGradient>
    </ReAnimated.View>
  );
}

// ============================================================
// Section Header
// ============================================================
function SectionHeader({ icon: Icon, iconColor, title }) {
  return (
    <View style={styles.sectionHeader}>
      <Icon size={18} color={iconColor || Colors.primary} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

// ============================================================
// Macro Impact Card
// ============================================================
function MacroCard({ label, emoji, avgMood, count, isBest }) {
  return (
    <View style={[styles.macroCard, isBest && styles.macroCardBest]}>
      <LinearGradient
        colors={isBest ? ['rgba(0, 230, 118, 0.12)', 'rgba(0, 230, 118, 0.03)'] : Gradients.card}
        style={styles.macroCardGradient}
      >
        <Text style={styles.macroCardEmoji}>{emoji}</Text>
        <Text style={styles.macroCardLabel}>{label}</Text>
        <Text style={[styles.macroCardScore, { color: moodColor(avgMood) }]}>
          {r1(avgMood)}
        </Text>
        <Text style={styles.macroCardUnit}>/10 mood</Text>
        {count !== undefined && (
          <Text style={styles.macroCardCount}>{count} day{count !== 1 ? 's' : ''}</Text>
        )}
        {isBest && (
          <View style={styles.bestBadge}>
            <Sparkles size={10} color={Colors.success} />
            <Text style={styles.bestBadgeText}>Best</Text>
          </View>
        )}
      </LinearGradient>
    </View>
  );
}

// ============================================================
// Food-Mood Item
// ============================================================
function FoodMoodItem({ item, variant }) {
  const isBooster = variant === 'booster';
  const borderColor = isBooster ? 'rgba(0, 230, 118, 0.25)' : 'rgba(255, 82, 82, 0.25)';
  const bgColors = isBooster
    ? ['rgba(0, 230, 118, 0.10)', 'rgba(0, 230, 118, 0.02)']
    : ['rgba(255, 82, 82, 0.10)', 'rgba(255, 82, 82, 0.02)'];
  const scoreColor = isBooster ? Colors.success : Colors.error;

  return (
    <View style={[styles.foodMoodItem, { borderColor }]}>
      <LinearGradient colors={bgColors} style={styles.foodMoodGradient}>
        <Text style={styles.foodMoodEmoji}>{item.emoji}</Text>
        <View style={styles.foodMoodInfo}>
          <Text style={styles.foodMoodName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.foodMoodFreq}>{item.frequency}x logged</Text>
        </View>
        <View style={styles.foodMoodScoreWrap}>
          <Text style={[styles.foodMoodScore, { color: scoreColor }]}>
            {r1(item.avgMood)}
          </Text>
          <Text style={styles.foodMoodScoreUnit}>/10</Text>
        </View>
      </LinearGradient>
    </View>
  );
}

// ============================================================
// Insight Card
// ============================================================
function InsightCard({ text, index }) {
  return (
    <ReAnimated.View
      entering={FadeInDown.delay(600 + index * 80).springify().mass(0.5).damping(10)}
    >
      <View style={styles.insightCard}>
        <LinearGradient
          colors={['rgba(191, 90, 242, 0.10)', 'rgba(191, 90, 242, 0.03)']}
          style={styles.insightGradient}
        >
          <View style={styles.insightIconWrap}>
            <Lightbulb size={18} color={Colors.accentPurple} />
          </View>
          <Text style={styles.insightText}>{text}</Text>
        </LinearGradient>
      </View>
    </ReAnimated.View>
  );
}

// ============================================================
// Main Screen
// ============================================================
export default function MoodInsightsScreen() {
  const router = useRouter();
  const {
    isLoading,
    hasEnoughData,
    moodByMacroSplit,
    moodByCalories,
    bestFoodsForMood,
    worstFoodsForMood,
    moodTrend,
    energyByMealTiming,
    moodByHydration,
    weeklyMoodAverage,
    insights,
    emojiForScore,
  } = useMoodFoodCorrelation();

  const handleBack = useCallback(async () => {
    await hapticLight();
    router.back();
  }, [router]);

  // --- Chart data for 7-day mood trend ---
  const lineData = useMemo(() => {
    return moodTrend.map((pt) => ({
      value: pt.value !== null ? pt.value : 0,
      label: pt.label,
      dataPointText: pt.value !== null ? pt.emoji : '',
      showDataPoint: pt.value !== null,
      dataPointColor: pt.value !== null ? moodColor(pt.value) : 'transparent',
      hideDataPoint: pt.value === null,
    }));
  }, [moodTrend]);

  const hasLineData = lineData.some((d) => d.value > 0);

  // --- Determine best macro category ---
  const bestMacro = useMemo(() => {
    const candidates = [
      { key: 'highProtein', avg: moodByMacroSplit.highProtein.avg },
      { key: 'highCarb', avg: moodByMacroSplit.highCarb.avg },
      { key: 'balanced', avg: moodByMacroSplit.balanced.avg },
    ].filter((c) => c.avg !== null);
    if (candidates.length === 0) return null;
    return candidates.reduce((a, b) => (a.avg > b.avg ? a : b)).key;
  }, [moodByMacroSplit]);

  // --- Hydration bar data ---
  const hydrationBarData = useMemo(() => {
    return [
      {
        value: moodByHydration.high.avg || 0,
        label: '8+ glasses',
        frontColor: Colors.primary,
        topLabelComponent: () => (
          <Text style={styles.barTopLabel}>{r1(moodByHydration.high.avg)}</Text>
        ),
      },
      {
        value: moodByHydration.low.avg || 0,
        label: '<8 glasses',
        frontColor: Colors.textTertiary,
        topLabelComponent: () => (
          <Text style={styles.barTopLabel}>{r1(moodByHydration.low.avg)}</Text>
        ),
      },
    ];
  }, [moodByHydration]);

  // --- Calorie target bar data ---
  const calorieBarData = useMemo(() => {
    return [
      {
        value: moodByCalories.under.avg || 0,
        label: 'Under',
        frontColor: Colors.warning,
        topLabelComponent: () => (
          <Text style={styles.barTopLabel}>{r1(moodByCalories.under.avg)}</Text>
        ),
      },
      {
        value: moodByCalories.onTarget.avg || 0,
        label: 'On Target',
        frontColor: Colors.success,
        topLabelComponent: () => (
          <Text style={styles.barTopLabel}>{r1(moodByCalories.onTarget.avg)}</Text>
        ),
      },
      {
        value: moodByCalories.over.avg || 0,
        label: 'Over',
        frontColor: Colors.error,
        topLabelComponent: () => (
          <Text style={styles.barTopLabel}>{r1(moodByCalories.over.avg)}</Text>
        ),
      },
    ];
  }, [moodByCalories]);

  // --- Weekly comparison ---
  const weeklyChange = weeklyMoodAverage.change;
  const WeeklyIcon = weeklyChange > 0 ? TrendingUp : weeklyChange < 0 ? TrendingDown : Minus;
  const weeklyColor = weeklyChange > 0 ? Colors.success : weeklyChange < 0 ? Colors.error : Colors.textSecondary;

  if (isLoading) {
    return (
      <ScreenWrapper>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.accentPurple} />
          <Text style={styles.loadingText}>Analysing mood patterns...</Text>
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
        {/* ====== HEADER ====== */}
        <ReAnimated.View entering={FadeInDown.delay(0).springify().mass(0.5).damping(10)} style={styles.header}>
          <Pressable style={styles.backButton} onPress={handleBack}>
            <ChevronLeft size={24} color={Colors.text} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Brain size={22} color={Colors.accentPurple} />
            <Text style={styles.headerTitle}>Mood & Food</Text>
          </View>
          <View style={styles.headerRight} />
        </ReAnimated.View>

        {/* ====== WEEKLY SUMMARY PILL ====== */}
        {hasEnoughData && weeklyMoodAverage.thisWeek !== null && (
          <ReAnimated.View entering={FadeInDown.delay(60).springify().mass(0.5).damping(10)}>
            <View style={styles.weeklyPill}>
              <LinearGradient
                colors={['rgba(191, 90, 242, 0.12)', 'rgba(191, 90, 242, 0.04)']}
                style={styles.weeklyPillGradient}
              >
                <View style={styles.weeklyPillLeft}>
                  <Text style={styles.weeklyPillLabel}>This Week</Text>
                  <Text style={styles.weeklyPillScore}>
                    {moodEmoji(weeklyMoodAverage.thisWeek)} {r1(weeklyMoodAverage.thisWeek)}/10
                  </Text>
                </View>
                {weeklyChange !== null && (
                  <View style={[styles.weeklyChangeBadge, { backgroundColor: weeklyColor + '20' }]}>
                    <WeeklyIcon size={14} color={weeklyColor} />
                    <Text style={[styles.weeklyChangeText, { color: weeklyColor }]}>
                      {weeklyChange > 0 ? '+' : ''}{weeklyChange}%
                    </Text>
                  </View>
                )}
              </LinearGradient>
            </View>
          </ReAnimated.View>
        )}

        {!hasEnoughData ? (
          <EmptyState />
        ) : (
          <>
            {/* ====== MOOD TREND CHART ====== */}
            <ReAnimated.View entering={FadeInDown.delay(100).springify().mass(0.5).damping(10)}>
              <SectionHeader icon={TrendingUp} iconColor={Colors.primary} title="7-Day Mood Trend" />
              <View style={styles.chartCard}>
                <LinearGradient colors={Gradients.card} style={styles.chartCardGradient}>
                  {hasLineData ? (
                    <LineChart
                      data={lineData}
                      width={CHART_WIDTH - 40}
                      height={160}
                      spacing={(CHART_WIDTH - 80) / 6}
                      initialSpacing={15}
                      maxValue={10}
                      noOfSections={5}
                      yAxisThickness={0}
                      xAxisThickness={1}
                      xAxisColor={Colors.border}
                      yAxisTextStyle={styles.chartAxisText}
                      xAxisLabelTextStyle={styles.chartAxisText}
                      color={Colors.accentPurple}
                      thickness={2.5}
                      curved
                      areaChart
                      startFillColor={'rgba(191, 90, 242, 0.25)'}
                      endFillColor={'rgba(191, 90, 242, 0.01)'}
                      startOpacity={0.4}
                      endOpacity={0}
                      dataPointsRadius={5}
                      dataPointsColor={Colors.accentPurple}
                      textColor={Colors.text}
                      textFontSize={FontSize.xs}
                      rulesType="solid"
                      rulesColor={Colors.border}
                      hideRules={false}
                      showVerticalLines={false}
                      pointerConfig={{
                        pointerStripUptoDataPoint: true,
                        pointerStripColor: Colors.accentPurple,
                        pointerStripWidth: 1,
                        pointerColor: Colors.accentPurple,
                        radius: 6,
                        pointerLabelWidth: 80,
                        pointerLabelHeight: 50,
                        pointerLabelComponent: (items) => {
                          const val = items[0]?.value;
                          return (
                            <View style={styles.pointerLabel}>
                              <Text style={styles.pointerLabelText}>
                                {val !== undefined ? `${moodEmoji(val)} ${r1(val)}` : '--'}
                              </Text>
                            </View>
                          );
                        },
                      }}
                    />
                  ) : (
                    <View style={styles.noChartData}>
                      <Text style={styles.noChartDataText}>No mood data for the past 7 days</Text>
                    </View>
                  )}
                </LinearGradient>
              </View>
            </ReAnimated.View>

            {/* ====== MACRO IMPACT CARDS ====== */}
            <ReAnimated.View entering={FadeInDown.delay(200).springify().mass(0.5).damping(10)}>
              <SectionHeader icon={Flame} iconColor={Colors.secondary} title="Macro Impact on Mood" />
              <View style={styles.macroRow}>
                <MacroCard
                  label="High Protein"
                  emoji={'\u{1F969}'}
                  avgMood={moodByMacroSplit.highProtein.avg}
                  count={moodByMacroSplit.highProtein.count}
                  isBest={bestMacro === 'highProtein'}
                />
                <MacroCard
                  label="High Carb"
                  emoji={'\u{1F35E}'}
                  avgMood={moodByMacroSplit.highCarb.avg}
                  count={moodByMacroSplit.highCarb.count}
                  isBest={bestMacro === 'highCarb'}
                />
                <MacroCard
                  label="Balanced"
                  emoji={'\u{2696}\u{FE0F}'}
                  avgMood={moodByMacroSplit.balanced.avg}
                  count={moodByMacroSplit.balanced.count}
                  isBest={bestMacro === 'balanced'}
                />
              </View>
            </ReAnimated.View>

            {/* ====== FOOD-MOOD CONNECTIONS ====== */}
            {bestFoodsForMood.length > 0 && (
              <ReAnimated.View entering={FadeInDown.delay(300).springify().mass(0.5).damping(10)}>
                <SectionHeader icon={ThumbsUp} iconColor={Colors.success} title="Mood Boosters" />
                <Text style={styles.sectionSubtitle}>Foods associated with your best mood days</Text>
                {bestFoodsForMood.map((item, i) => (
                  <FoodMoodItem key={`boost-${i}`} item={item} variant="booster" />
                ))}
              </ReAnimated.View>
            )}

            {worstFoodsForMood.length > 0 && (
              <ReAnimated.View entering={FadeInDown.delay(360).springify().mass(0.5).damping(10)}>
                <SectionHeader icon={ThumbsDown} iconColor={Colors.error} title="Mood Drainers" />
                <Text style={styles.sectionSubtitle}>Foods associated with lower mood days</Text>
                {worstFoodsForMood.map((item, i) => (
                  <FoodMoodItem key={`drain-${i}`} item={item} variant="drainer" />
                ))}
              </ReAnimated.View>
            )}

            {/* ====== HYDRATION IMPACT ====== */}
            {(moodByHydration.high.count > 0 || moodByHydration.low.count > 0) && (
              <ReAnimated.View entering={FadeInDown.delay(420).springify().mass(0.5).damping(10)}>
                <SectionHeader icon={Droplets} iconColor={Colors.primary} title="Hydration Impact" />
                <View style={styles.chartCard}>
                  <LinearGradient colors={Gradients.card} style={styles.chartCardGradient}>
                    <BarChart
                      data={hydrationBarData}
                      width={CHART_WIDTH - 60}
                      height={140}
                      barWidth={50}
                      spacing={40}
                      initialSpacing={30}
                      maxValue={10}
                      noOfSections={5}
                      yAxisThickness={0}
                      xAxisThickness={1}
                      xAxisColor={Colors.border}
                      yAxisTextStyle={styles.chartAxisText}
                      xAxisLabelTextStyle={styles.chartAxisText}
                      barBorderRadius={8}
                      rulesType="solid"
                      rulesColor={Colors.border}
                      isAnimated
                      animationDuration={600}
                    />
                    <View style={styles.hydrationSummary}>
                      <View style={styles.hydrationSummaryItem}>
                        <View style={[styles.hydrationDot, { backgroundColor: Colors.primary }]} />
                        <Text style={styles.hydrationSummaryText}>
                          8+ glasses: {r1(moodByHydration.high.avg)}/10 ({moodByHydration.high.count} days)
                        </Text>
                      </View>
                      <View style={styles.hydrationSummaryItem}>
                        <View style={[styles.hydrationDot, { backgroundColor: Colors.textTertiary }]} />
                        <Text style={styles.hydrationSummaryText}>
                          {'<'}8 glasses: {r1(moodByHydration.low.avg)}/10 ({moodByHydration.low.count} days)
                        </Text>
                      </View>
                    </View>
                  </LinearGradient>
                </View>
              </ReAnimated.View>
            )}

            {/* ====== CALORIE TARGET IMPACT ====== */}
            {(moodByCalories.under.count > 0 || moodByCalories.onTarget.count > 0 || moodByCalories.over.count > 0) && (
              <ReAnimated.View entering={FadeInDown.delay(480).springify().mass(0.5).damping(10)}>
                <SectionHeader icon={Target} iconColor={Colors.warning} title="Calorie Target Impact" />
                <View style={styles.chartCard}>
                  <LinearGradient colors={Gradients.card} style={styles.chartCardGradient}>
                    <BarChart
                      data={calorieBarData}
                      width={CHART_WIDTH - 60}
                      height={140}
                      barWidth={45}
                      spacing={30}
                      initialSpacing={25}
                      maxValue={10}
                      noOfSections={5}
                      yAxisThickness={0}
                      xAxisThickness={1}
                      xAxisColor={Colors.border}
                      yAxisTextStyle={styles.chartAxisText}
                      xAxisLabelTextStyle={styles.chartAxisText}
                      barBorderRadius={8}
                      rulesType="solid"
                      rulesColor={Colors.border}
                      isAnimated
                      animationDuration={600}
                    />
                    <View style={styles.calorieTargetLegend}>
                      <View style={styles.calorieLegendItem}>
                        <View style={[styles.hydrationDot, { backgroundColor: Colors.warning }]} />
                        <Text style={styles.hydrationSummaryText}>Under ({moodByCalories.under.count}d)</Text>
                      </View>
                      <View style={styles.calorieLegendItem}>
                        <View style={[styles.hydrationDot, { backgroundColor: Colors.success }]} />
                        <Text style={styles.hydrationSummaryText}>On Target ({moodByCalories.onTarget.count}d)</Text>
                      </View>
                      <View style={styles.calorieLegendItem}>
                        <View style={[styles.hydrationDot, { backgroundColor: Colors.error }]} />
                        <Text style={styles.hydrationSummaryText}>Over ({moodByCalories.over.count}d)</Text>
                      </View>
                    </View>
                  </LinearGradient>
                </View>
              </ReAnimated.View>
            )}

            {/* ====== ENERGY BY TIME OF DAY ====== */}
            <ReAnimated.View entering={FadeInDown.delay(540).springify().mass(0.5).damping(10)}>
              <SectionHeader icon={Clock} iconColor={Colors.carbs} title="Energy by Time of Day" />
              <View style={styles.timeRow}>
                {[
                  { key: 'morning', label: 'Morning', emoji: '\u{1F305}' },
                  { key: 'midday', label: 'Midday', emoji: '\u{2600}\u{FE0F}' },
                  { key: 'afternoon', label: 'Afternoon', emoji: '\u{1F324}\u{FE0F}' },
                  { key: 'evening', label: 'Evening', emoji: '\u{1F319}' },
                ].map((period) => {
                  const data = energyByMealTiming[period.key];
                  return (
                    <View key={period.key} style={styles.timeCard}>
                      <LinearGradient colors={Gradients.card} style={styles.timeCardGradient}>
                        <Text style={styles.timeCardEmoji}>{period.emoji}</Text>
                        <Text style={[styles.timeCardScore, { color: moodColor(data.avg) }]}>
                          {r1(data.avg)}
                        </Text>
                        <Text style={styles.timeCardLabel}>{period.label}</Text>
                        <Text style={styles.timeCardCount}>{data.count} logs</Text>
                      </LinearGradient>
                    </View>
                  );
                })}
              </View>
            </ReAnimated.View>

            {/* ====== AI INSIGHTS ====== */}
            {insights.length > 0 && (
              <ReAnimated.View entering={FadeInDown.delay(580).springify().mass(0.5).damping(10)}>
                <SectionHeader icon={Sparkles} iconColor={Colors.accentPurple} title="Personalised Insights" />
                {insights.map((text, i) => (
                  <InsightCard key={`insight-${i}`} text={text} index={i} />
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
// Styles
// ============================================================
const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
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

  // --- Header ---
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
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  headerRight: {
    width: 44,
  },

  // --- Weekly Pill ---
  weeklyPill: {
    marginBottom: Spacing.lg,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(191, 90, 242, 0.25)',
  },
  weeklyPillGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  weeklyPillLeft: {},
  weeklyPillLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  weeklyPillScore: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  weeklyChangeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  weeklyChangeText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },

  // --- Section ---
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  sectionSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },

  // --- Chart Card ---
  chartCard: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  chartCardGradient: {
    padding: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  chartAxisText: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },
  noChartData: {
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noChartDataText: {
    fontSize: FontSize.md,
    color: Colors.textTertiary,
  },
  pointerLabel: {
    backgroundColor: Colors.surfaceElevated,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.accentPurple + '40',
  },
  pointerLabelText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  barTopLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: 4,
  },

  // --- Macro Cards ---
  macroRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  macroCard: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  macroCardBest: {
    borderColor: 'rgba(0, 230, 118, 0.4)',
    ...Shadows.glowSuccess,
  },
  macroCardGradient: {
    padding: Spacing.md,
    alignItems: 'center',
  },
  macroCardEmoji: {
    fontSize: 28,
    marginBottom: Spacing.xs,
  },
  macroCardLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  macroCardScore: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
  },
  macroCardUnit: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: 1,
  },
  macroCardCount: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 4,
  },
  bestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.successSoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.xs,
  },
  bestBadgeText: {
    fontSize: 9,
    fontWeight: FontWeight.bold,
    color: Colors.success,
  },

  // --- Food-Mood Items ---
  foodMoodItem: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  foodMoodGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  foodMoodEmoji: {
    fontSize: 28,
  },
  foodMoodInfo: {
    flex: 1,
  },
  foodMoodName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  foodMoodFreq: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  foodMoodScoreWrap: {
    alignItems: 'flex-end',
  },
  foodMoodScore: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
  },
  foodMoodScoreUnit: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },

  // --- Hydration ---
  hydrationSummary: {
    marginTop: Spacing.md,
    gap: Spacing.xs,
  },
  hydrationSummaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  hydrationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  hydrationSummaryText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },

  // --- Calorie Target Legend ---
  calorieTargetLegend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
  },
  calorieLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  // --- Time of Day ---
  timeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  timeCard: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  timeCardGradient: {
    padding: Spacing.sm,
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  timeCardEmoji: {
    fontSize: 22,
    marginBottom: 4,
  },
  timeCardScore: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  timeCardLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  timeCardCount: {
    fontSize: 9,
    color: Colors.textMuted,
    marginTop: 2,
  },

  // --- Insight Cards ---
  insightCard: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(191, 90, 242, 0.2)',
    marginBottom: Spacing.sm,
  },
  insightGradient: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  insightIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(191, 90, 242, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  insightText: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.text,
    lineHeight: 22,
  },

  // --- Empty State ---
  emptyContainer: {
    marginTop: Spacing.xxl,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(191, 90, 242, 0.2)',
  },
  emptyGradient: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(191, 90, 242, 0.12)',
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
    marginBottom: Spacing.lg,
  },
  emptySteps: {
    width: '100%',
    gap: Spacing.md,
  },
  emptyStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  emptyStepNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(191, 90, 242, 0.2)',
    color: Colors.accentPurple,
    fontWeight: FontWeight.bold,
    fontSize: FontSize.md,
    textAlign: 'center',
    lineHeight: 28,
    overflow: 'hidden',
  },
  emptyStepText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },

  bottomSpacer: {
    height: 140,
  },
});

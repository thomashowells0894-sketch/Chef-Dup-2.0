import React, { memo, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Pressable,
  Alert,
} from 'react-native';
import { LineChart, BarChart } from 'react-native-gifted-charts';
import { useRouter } from 'expo-router';
import {
  TrendingDown,
  TrendingUp,
  Flame,
  Scale,
  Award,
  Target,
  Pill,
  ChevronRight,
  Download,
} from 'lucide-react-native';
import ReAnimated, { FadeInDown } from 'react-native-reanimated';
import ScreenWrapper from '../../components/ScreenWrapper';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius, Glass } from '../../constants/theme';
import { useFood } from '../../context/FoodContext';
import { useProfile } from '../../context/ProfileContext';
import { useGamification } from '../../context/GamificationContext';
import { exportFoodDiaryCSV, exportWeeklySummaryPDF } from '../../services/exportData';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - Spacing.md * 4;

const RANGE_OPTIONS = [
  { label: '7 Days', value: 7 },
  { label: '30 Days', value: 30 },
  { label: '90 Days', value: 90 },
];

// Mock weight data for demo when no history exists
const MOCK_WEIGHT_DATA = [
  { value: 75.5, label: 'Mon' },
  { value: 75.2, label: 'Tue' },
  { value: 74.8, label: 'Wed' },
  { value: 74.5, label: 'Thu' },
  { value: 74.9, label: 'Fri' },
  { value: 74.3, label: 'Sat' },
  { value: 74.0, label: 'Sun' },
];

const BigStatCard = memo(function BigStatCard({ icon: Icon, label, value, unit, trend, trendValue, color }) {
  const isPositiveTrend = trend === 'up';
  const TrendIcon = isPositiveTrend ? TrendingUp : TrendingDown;

  return (
    <View style={styles.bigStatCard}>
      <View style={[styles.bigStatIconContainer, { backgroundColor: color + '15' }]}>
        <Icon size={24} color={color} />
      </View>
      <Text style={styles.bigStatLabel}>{label}</Text>
      <View style={styles.bigStatValueRow}>
        <Text style={styles.bigStatValue}>{value}</Text>
        {unit && <Text style={styles.bigStatUnit}>{unit}</Text>}
      </View>
      {trendValue !== undefined && (
        <View style={[
          styles.trendBadge,
          { backgroundColor: isPositiveTrend ? Colors.success + '20' : Colors.error + '20' }
        ]}>
          <TrendIcon size={12} color={isPositiveTrend ? Colors.success : Colors.error} />
          <Text style={[
            styles.trendText,
            { color: isPositiveTrend ? Colors.success : Colors.error }
          ]}>
            {trendValue}
          </Text>
        </View>
      )}
    </View>
  );
});

const RangeSelector = memo(function RangeSelector({ selectedRange, onSelect }) {
  return (
    <View style={styles.rangeSelector}>
      {RANGE_OPTIONS.map((option) => (
        <Pressable
          key={option.value}
          style={[
            styles.rangeOption,
            selectedRange === option.value && styles.rangeOptionActive,
          ]}
          onPress={() => onSelect(option.value)}
        >
          <Text
            style={[
              styles.rangeOptionText,
              selectedRange === option.value && styles.rangeOptionTextActive,
            ]}
          >
            {option.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
});

export default function StatsScreen() {
  const router = useRouter();
  const { weeklyData, weeklyStats, goals, isLoading, getCalorieDataForRange, dayData } = useFood();
  const { weeklyWeightData, profile } = useProfile();
  const { currentStreak, stats: gamificationStats } = useGamification();

  const [selectedRange, setSelectedRange] = useState(7);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPress = useCallback(() => {
    Alert.alert(
      'Export Data',
      'Choose an export format',
      [
        {
          text: 'Export CSV',
          onPress: async () => {
            try {
              setIsExporting(true);
              const end = new Date();
              const start = new Date();
              start.setDate(start.getDate() - 30);
              await exportFoodDiaryCSV(dayData, { start, end });
            } catch (error) {
              Alert.alert('Export Failed', 'Could not export your food diary. Please try again.');
            } finally {
              setIsExporting(false);
            }
          },
        },
        {
          text: 'Export PDF Report',
          onPress: async () => {
            try {
              setIsExporting(true);
              await exportWeeklySummaryPDF(
                {
                  dailyData: weeklyData,
                  stats: weeklyStats,
                  streak: currentStreak,
                  goals,
                },
                profile
              );
            } catch (error) {
              Alert.alert('Export Failed', 'Could not generate your report. Please try again.');
            } finally {
              setIsExporting(false);
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }, [dayData, weeklyData, weeklyStats, currentStreak, goals, profile]);

  // Get calorie data for the selected range
  const rangeData = useMemo(() => {
    if (selectedRange === 7) return weeklyData;
    return getCalorieDataForRange(selectedRange);
  }, [selectedRange, weeklyData, getCalorieDataForRange]);

  const rangeStats = useMemo(() => {
    const daysWithData = rangeData.filter((d) => !d.noData && d.calories > 0);
    if (daysWithData.length === 0) {
      return { totalCalories: 0, avgCalories: 0, daysUnderGoal: 0, daysOverGoal: 0, daysOnTrack: 0, caloriesVsBudget: 0, daysTracked: 0 };
    }
    const totalCalories = daysWithData.reduce((s, d) => s + d.calories, 0);
    const totalGoal = daysWithData.reduce((s, d) => s + d.goal, 0);
    const daysUnderGoal = daysWithData.filter((d) => d.calories <= d.goal).length;
    return {
      totalCalories,
      avgCalories: Math.round(totalCalories / daysWithData.length),
      daysUnderGoal,
      daysOverGoal: daysWithData.filter((d) => d.calories > d.goal).length,
      daysOnTrack: daysUnderGoal,
      caloriesVsBudget: totalGoal - totalCalories,
      daysTracked: daysWithData.length,
    };
  }, [rangeData]);

  // Calculate weight chart data
  const weightChartData = useMemo(() => {
    const hasRealData = weeklyWeightData && weeklyWeightData.some(d => d.weight !== null);

    if (hasRealData) {
      return {
        data: weeklyWeightData.map(d => ({
          value: d.weight || profile?.weight || 70,
          label: d.day,
          dataPointText: d.weight ? `${d.weight}` : '',
        })),
        isReal: true,
      };
    }

    return {
      data: MOCK_WEIGHT_DATA,
      isReal: false,
    };
  }, [weeklyWeightData, profile?.weight]);

  // Calculate calorie bar chart data for selected range
  const calorieChartData = useMemo(() => {
    if (!rangeData || rangeData.length === 0) {
      return {
        data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => ({
          value: 0, label: day, frontColor: Colors.surfaceElevated,
        })),
        maxValue: 2500,
      };
    }

    const goal = goals?.calories || 2000;
    const maxCal = Math.max(...rangeData.map(d => d.calories), goal);

    // For 30/90 day ranges, only show labels every N days
    const showEveryN = selectedRange <= 7 ? 1 : selectedRange <= 30 ? 5 : 15;

    return {
      data: rangeData.map((d, i) => ({
        value: d.calories,
        label: i % showEveryN === 0 ? d.day : '',
        frontColor: d.calories > goal ? Colors.error : Colors.success,
        topLabelComponent: () => (
          selectedRange <= 7 && d.calories > 0 ? (
            <Text style={styles.barTopLabel}>{d.calories}</Text>
          ) : null
        ),
      })),
      maxValue: Math.ceil(maxCal / 500) * 500 + 500,
      goal,
    };
  }, [rangeData, goals?.calories, selectedRange]);

  // Summary stats
  const summaryStats = useMemo(() => {
    const validDays = rangeData?.filter(d => d.calories > 0) || [];
    const avgCalories = validDays.length > 0
      ? Math.round(validDays.reduce((sum, d) => sum + d.calories, 0) / validDays.length)
      : 0;

    let weightChange = 0;
    let weightTrend = 'down';
    if (weightChartData.isReal && weightChartData.data.length >= 2) {
      const firstWeight = weightChartData.data[0].value;
      const lastWeight = weightChartData.data[weightChartData.data.length - 1].value;
      weightChange = parseFloat((lastWeight - firstWeight).toFixed(1));
      weightTrend = weightChange <= 0 ? 'down' : 'up';
    }

    const bestStreak = gamificationStats?.bestStreak || currentStreak;

    return {
      avgCalories,
      weightChange: Math.abs(weightChange),
      weightTrend,
      weightChangeSign: weightChange <= 0 ? '-' : '+',
      bestStreak,
    };
  }, [rangeData, weightChartData, currentStreak, gamificationStats]);

  // Weight min/max for chart scaling
  const weightRange = useMemo(() => {
    const weights = weightChartData.data.map(d => d.value);
    const min = Math.min(...weights);
    const max = Math.max(...weights);
    const padding = (max - min) * 0.2 || 2;
    return {
      min: Math.floor(min - padding),
      max: Math.ceil(max + padding),
    };
  }, [weightChartData]);

  // --- MISSION 3: Weight vs Calories dual-axis data ---
  const weightVsCaloriesData = useMemo(() => {
    if (!weightChartData.isReal) return null;

    const validDays = weeklyData.filter(d => d.calories > 0);
    if (validDays.length < 2) return null;

    // Build calorie line data aligned to weight data days
    const calorieLineData = weightChartData.data.map((wd, i) => {
      const matchingCalDay = weeklyData.find(cd => cd.day === wd.label);
      return {
        value: matchingCalDay ? matchingCalDay.calories : 0,
        label: wd.label,
      };
    });

    const calValues = calorieLineData.map(d => d.value).filter(v => v > 0);
    if (calValues.length < 2) return null;

    const calMin = Math.min(...calValues);
    const calMax = Math.max(...calValues);

    return {
      calorieData: calorieLineData,
      calMin: Math.floor(calMin / 100) * 100,
      calMax: Math.ceil(calMax / 100) * 100 + 200,
    };
  }, [weightChartData, weeklyData]);

  // Dynamic bar width based on range
  const barWidth = selectedRange <= 7 ? 28 : selectedRange <= 30 ? 8 : 4;
  const barSpacing = selectedRange <= 7 ? CHART_WIDTH / 10 : selectedRange <= 30 ? 4 : 2;

  if (isLoading) {
    return (
      <ScreenWrapper>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading your stats...</Text>
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
        <ReAnimated.View entering={FadeInDown.delay(0).springify().mass(0.5).damping(10)} style={styles.header}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Stats</Text>
            <Pressable
              onPress={handleExportPress}
              disabled={isExporting}
              style={styles.exportButton}
            >
              {isExporting ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <Download size={20} color={Colors.primary} />
              )}
            </Pressable>
          </View>
          <Text style={styles.subtitle}>Know if you're winning or losing</Text>
        </ReAnimated.View>

        {/* Range Selector */}
        <ReAnimated.View entering={FadeInDown.delay(80).springify().mass(0.5).damping(10)}>
          <RangeSelector selectedRange={selectedRange} onSelect={setSelectedRange} />
        </ReAnimated.View>

        {/* Empty State - shown when fewer than 3 days tracked */}
        {rangeStats.daysTracked < 3 && (
          <ReAnimated.View entering={FadeInDown.delay(120).springify().mass(0.5).damping(10)}>
            <View style={{ alignItems: 'center', paddingVertical: Spacing.xl, paddingHorizontal: Spacing.lg }}>
              <Text style={{ fontSize: FontSize.lg, color: Colors.textSecondary, fontWeight: FontWeight.semibold, marginBottom: Spacing.sm }}>
                Building your insights...
              </Text>
              <Text style={{ fontSize: FontSize.sm, color: Colors.textTertiary, textAlign: 'center' }}>
                Log food for a few more days to unlock trend analysis and personalized insights.
              </Text>
            </View>
          </ReAnimated.View>
        )}

        {/* Big Summary Stats */}
        <ReAnimated.View entering={FadeInDown.delay(160).springify().mass(0.5).damping(10)} style={styles.summaryRow}>
          <BigStatCard
            icon={Flame}
            label="Avg Calories"
            value={summaryStats.avgCalories.toLocaleString()}
            unit="kcal"
            color={Colors.primary}
          />
          <BigStatCard
            icon={Scale}
            label="Weight Change"
            value={`${summaryStats.weightChangeSign}${summaryStats.weightChange}`}
            unit="kg"
            trend={summaryStats.weightTrend}
            trendValue={summaryStats.weightTrend === 'down' ? 'Losing' : 'Gaining'}
            color={summaryStats.weightTrend === 'down' ? Colors.success : Colors.warning}
          />
          <BigStatCard
            icon={Award}
            label="Best Streak"
            value={summaryStats.bestStreak}
            unit="days"
            color={Colors.warning}
          />
        </ReAnimated.View>

        {/* Weight vs Calories Chart (MISSION 3 - dual-axis) */}
        {weightVsCaloriesData && (
          <View style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <View style={styles.chartTitleRow}>
                <View style={[styles.chartIcon, { backgroundColor: Colors.primary + '20' }]}>
                  <TrendingDown size={18} color={Colors.primary} />
                </View>
                <View>
                  <Text style={styles.chartTitle}>Weight vs Calories</Text>
                  <Text style={styles.chartSubtitle}>See the correlation</Text>
                </View>
              </View>
            </View>

            <View style={styles.chartContainer}>
              <LineChart
                data={weightChartData.data}
                data2={weightVsCaloriesData.calorieData}
                width={CHART_WIDTH}
                height={180}
                spacing={CHART_WIDTH / 8}
                initialSpacing={20}
                endSpacing={20}
                thickness={3}
                thickness2={2}
                color={Colors.success}
                color2={Colors.primary}
                dataPointsColor={Colors.success}
                dataPointsColor2={Colors.primary}
                dataPointsRadius={5}
                dataPointsRadius2={4}
                curved
                curvature={0.2}
                hideRules
                yAxisColor="transparent"
                xAxisColor={Colors.border}
                yAxisTextStyle={styles.axisText}
                xAxisLabelTextStyle={styles.axisText}
                noOfSections={4}
                maxValue={weightRange.max}
                yAxisOffset={weightRange.min}
                secondaryYAxis={{
                  maxValue: weightVsCaloriesData.calMax,
                  noOfSections: 4,
                  yAxisColor: 'transparent',
                  yAxisTextStyle: { ...styles.axisText, color: Colors.primary },
                }}
              />
            </View>

            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: Colors.success }]} />
                <Text style={styles.legendText}>Weight (kg)</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: Colors.primary }]} />
                <Text style={styles.legendText}>Calories</Text>
              </View>
            </View>
          </View>
        )}

        {/* Weight Trend Chart */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <View style={styles.chartTitleRow}>
              <View style={[styles.chartIcon, { backgroundColor: Colors.success + '20' }]}>
                <Scale size={18} color={Colors.success} />
              </View>
              <View>
                <Text style={styles.chartTitle}>Weight Trend</Text>
                <Text style={styles.chartSubtitle}>Last 7 entries</Text>
              </View>
            </View>
            {!weightChartData.isReal && (
              <View style={styles.demoBadge}>
                <Text style={styles.demoBadgeText}>Demo</Text>
              </View>
            )}
          </View>

          <View style={styles.chartContainer}>
            <LineChart
              data={weightChartData.data}
              width={CHART_WIDTH}
              height={180}
              spacing={CHART_WIDTH / 8}
              initialSpacing={20}
              endSpacing={20}
              thickness={3}
              color={Colors.success}
              dataPointsColor={Colors.success}
              dataPointsRadius={5}
              curved
              curvature={0.2}
              startFillColor={Colors.success}
              endFillColor={Colors.surface}
              startOpacity={0.3}
              endOpacity={0.05}
              areaChart
              hideRules
              yAxisColor="transparent"
              xAxisColor={Colors.border}
              yAxisTextStyle={styles.axisText}
              xAxisLabelTextStyle={styles.axisText}
              noOfSections={4}
              maxValue={weightRange.max}
              yAxisOffset={weightRange.min}
              pointerConfig={{
                pointerStripUptoDataPoint: true,
                pointerStripColor: Colors.textTertiary,
                pointerStripWidth: 1,
                pointerColor: Colors.success,
                radius: 6,
                pointerLabelWidth: 80,
                pointerLabelHeight: 30,
                activatePointersOnLongPress: true,
                autoAdjustPointerLabelPosition: true,
                pointerLabelComponent: (items) => (
                  <View style={styles.tooltipContainer}>
                    <Text style={styles.tooltipText}>{items[0].value} kg</Text>
                  </View>
                ),
              }}
            />
          </View>

          {weightChartData.isReal && profile?.weight && (
            <View style={styles.chartFooter}>
              <Text style={styles.currentWeightText}>
                Current: <Text style={styles.currentWeightValue}>{profile.weight} kg</Text>
              </Text>
            </View>
          )}
        </View>

        {/* Calorie Intake Chart */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <View style={styles.chartTitleRow}>
              <View style={[styles.chartIcon, { backgroundColor: Colors.primary + '20' }]}>
                <Target size={18} color={Colors.primary} />
              </View>
              <View>
                <Text style={styles.chartTitle}>Calorie Intake</Text>
                <Text style={styles.chartSubtitle}>
                  Last {selectedRange} days vs goal
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.chartContainer}>
            <BarChart
              data={calorieChartData.data}
              width={CHART_WIDTH}
              height={180}
              barWidth={barWidth}
              spacing={barSpacing}
              initialSpacing={25}
              endSpacing={15}
              barBorderRadius={selectedRange <= 7 ? 6 : 3}
              noOfSections={4}
              maxValue={calorieChartData.maxValue}
              yAxisColor="transparent"
              xAxisColor={Colors.border}
              yAxisTextStyle={styles.axisText}
              xAxisLabelTextStyle={styles.axisText}
              hideRules
              showReferenceLine1
              referenceLine1Position={calorieChartData.goal}
              referenceLine1Config={{
                color: Colors.textTertiary,
                dashWidth: 5,
                dashGap: 3,
                thickness: 1.5,
                labelText: `Goal: ${calorieChartData.goal}`,
                labelTextStyle: styles.referenceLineLabel,
              }}
              isAnimated
              animationDuration={800}
            />
          </View>

          {/* Legend */}
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: Colors.success }]} />
              <Text style={styles.legendText}>Under goal</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: Colors.error }]} />
              <Text style={styles.legendText}>Over goal</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDash]} />
              <Text style={styles.legendText}>Daily goal</Text>
            </View>
          </View>
        </View>

        {/* Scorecard */}
        <View style={styles.weeklySummaryCard}>
          <Text style={styles.weeklySummaryTitle}>
            {selectedRange === 7 ? "This Week's" : `Last ${selectedRange} Days`} Scorecard
          </Text>
          <View style={styles.scoreRow}>
            <View style={styles.scoreItem}>
              <Text style={[styles.scoreValue, { color: Colors.success }]}>
                {rangeStats.daysUnderGoal || 0}
              </Text>
              <Text style={styles.scoreLabel}>Days On Track</Text>
            </View>
            <View style={styles.scoreDivider} />
            <View style={styles.scoreItem}>
              <Text style={[styles.scoreValue, { color: Colors.error }]}>
                {rangeStats.daysOverGoal || 0}
              </Text>
              <Text style={styles.scoreLabel}>Days Over</Text>
            </View>
            <View style={styles.scoreDivider} />
            <View style={styles.scoreItem}>
              <Text style={[
                styles.scoreValue,
                { color: (rangeStats.caloriesVsBudget || 0) >= 0 ? Colors.success : Colors.error }
              ]}>
                {(rangeStats.caloriesVsBudget || 0) >= 0 ? '+' : ''}
                {Math.abs(rangeStats.caloriesVsBudget || 0).toLocaleString()}
              </Text>
              <Text style={styles.scoreLabel}>Cal vs Budget</Text>
            </View>
          </View>

          {/* Verdict */}
          <View style={[
            styles.verdictBadge,
            {
              backgroundColor: (rangeStats.daysUnderGoal || 0) >= Math.ceil(selectedRange * 0.6)
                ? Colors.success + '20'
                : Colors.warning + '20'
            }
          ]}>
            <Text style={[
              styles.verdictText,
              {
                color: (rangeStats.daysUnderGoal || 0) >= Math.ceil(selectedRange * 0.6)
                  ? Colors.success
                  : Colors.warning
              }
            ]}>
              {(rangeStats.daysUnderGoal || 0) >= Math.ceil(selectedRange * 0.7)
                ? "You're crushing it!"
                : (rangeStats.daysUnderGoal || 0) >= Math.ceil(selectedRange * 0.5)
                  ? "Solid progress!"
                  : (rangeStats.daysUnderGoal || 0) >= Math.ceil(selectedRange * 0.3)
                    ? "Room for improvement"
                    : "Let's get back on track"}
            </Text>
          </View>
        </View>

        {/* Micronutrient Dashboard Link */}
        <ReAnimated.View entering={FadeInDown.delay(400).springify().mass(0.5).damping(10)}>
          <Pressable
            style={styles.micronutrientButton}
            onPress={() => router.push('/micronutrients')}
          >
            <View style={styles.micronutrientLeft}>
              <View style={[styles.micronutrientIcon, { backgroundColor: Colors.accentPurple + '20' }]}>
                <Pill size={18} color={Colors.accentPurple} />
              </View>
              <View>
                <Text style={styles.micronutrientTitle}>Micronutrient Dashboard</Text>
                <Text style={styles.micronutrientSubtitle}>Vitamins, minerals & more</Text>
              </View>
            </View>
            <ChevronRight size={18} color={Colors.textTertiary} />
          </Pressable>
        </ReAnimated.View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  header: {
    marginBottom: Spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exportButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceGlass,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  subtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  // Range Selector
  rangeSelector: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.xs,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  rangeOption: {
    flex: 1,
    paddingVertical: Spacing.sm + 2,
    alignItems: 'center',
    borderRadius: BorderRadius.md,
  },
  rangeOptionActive: {
    backgroundColor: Colors.primary,
  },
  rangeOptionText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
  },
  rangeOptionTextActive: {
    color: Colors.background,
  },
  // Big Summary Stats
  summaryRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  bigStatCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  bigStatIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  bigStatLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  bigStatValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  bigStatValue: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  bigStatUnit: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginLeft: 2,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.xs,
    gap: 2,
  },
  trendText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  // Chart Cards
  chartCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  chartTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  chartIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  chartSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  demoBadge: {
    backgroundColor: Colors.warning + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  demoBadgeText: {
    fontSize: FontSize.xs,
    color: Colors.warning,
    fontWeight: FontWeight.bold,
  },
  chartContainer: {
    alignItems: 'center',
    marginLeft: -Spacing.sm,
  },
  axisText: {
    fontSize: 10,
    color: Colors.textTertiary,
  },
  tooltipContainer: {
    backgroundColor: Colors.text,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  tooltipText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.background,
  },
  chartFooter: {
    marginTop: Spacing.md,
    alignItems: 'center',
  },
  currentWeightText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  currentWeightValue: {
    fontWeight: FontWeight.bold,
    color: Colors.success,
  },
  barTopLabel: {
    fontSize: 9,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  referenceLineLabel: {
    fontSize: 10,
    color: Colors.textTertiary,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.lg,
    marginTop: Spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendDash: {
    width: 12,
    height: 2,
    backgroundColor: Colors.textTertiary,
    borderRadius: 1,
  },
  legendText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  // Weekly Summary
  weeklySummaryCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  weeklySummaryTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  scoreItem: {
    alignItems: 'center',
    flex: 1,
  },
  scoreValue: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
  },
  scoreLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  scoreDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.border,
  },
  verdictBadge: {
    marginTop: Spacing.lg,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    alignSelf: 'center',
  },
  verdictText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    textAlign: 'center',
  },
  bottomSpacer: {
    height: 140,
  },
  micronutrientButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surfaceGlass,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  micronutrientLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 4,
  },
  micronutrientIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  micronutrientTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  micronutrientSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    marginTop: 1,
  },
});

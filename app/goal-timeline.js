/**
 * Goal Timeline & Weight Projection Screen - FuelIQ
 *
 * Weight-specific goal projection with:
 * - Progress Hero Card with gradient border
 * - Projection Chart (historical + projected + goal line)
 * - Timeline Card with projected completion date
 * - Rate Analysis with health rating
 * - Milestones section with visual timeline
 * - "What If" scenario cards
 * - No goal / no data empty states
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import ReAnimated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { LineChart } from 'react-native-gifted-charts';
import {
  ArrowLeft,
  Target,
  ArrowRight,
  Calendar,
  Clock,
  TrendingUp,
  TrendingDown,
  Check,
  Circle,
  Zap,
  AlertTriangle,
  Scale,
  ChevronRight,
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
import { useWeightHistory } from '../hooks/useWeightHistory';
import { useProfile } from '../context/ProfileContext';
import useGoalProjection from '../hooks/useGoalProjection';
import { hapticLight } from '../lib/haptics';
import { format, addDays, subDays } from 'date-fns';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 80;

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

function getRateColor(absRate) {
  if (absRate >= 0.5 && absRate <= 2.0) return Colors.success;
  if (absRate < 0.5) return Colors.warning;
  return Colors.error;
}

function getRateLabel(absRate) {
  if (absRate >= 0.5 && absRate <= 2.0) return 'Healthy';
  if (absRate < 0.5) return 'Slow';
  return 'Aggressive';
}

function scenarioDate(currentWeight, goalWeight, weeklyRate) {
  if (weeklyRate === 0) return null;
  const diff = goalWeight - currentWeight;
  const effectiveRate = diff > 0 ? Math.abs(weeklyRate) : -Math.abs(weeklyRate);
  if (effectiveRate === 0) return null;
  const weeksNeeded = Math.abs(diff / effectiveRate);
  const daysNeeded = Math.round(weeksNeeded * 7);
  return addDays(new Date(), daysNeeded);
}

// ----------------------------------------------------------------
// Progress Hero Card
// ----------------------------------------------------------------

function ProgressHeroCard({ projection }) {
  if (!projection) return null;

  const { currentWeight, goalWeight, progressPercentage, achieved } = projection;
  const diff = Math.abs(Math.round((goalWeight - currentWeight) * 10) / 10);
  const isLosing = goalWeight < currentWeight;

  return (
    <ReAnimated.View entering={FadeInDown.delay(100).springify().mass(0.5).damping(10)}>
      <LinearGradient
        colors={['rgba(0, 230, 118, 0.08)', 'rgba(0, 212, 255, 0.04)']}
        style={heroStyles.card}
      >
        {/* Gradient border effect via inner border */}
        <View style={heroStyles.inner}>
          {/* Weight values row */}
          <View style={heroStyles.weightsRow}>
            <View style={heroStyles.weightBlock}>
              <Text style={heroStyles.weightLabel}>Current</Text>
              <Text style={heroStyles.weightValue}>{currentWeight}</Text>
              <Text style={heroStyles.weightUnit}>lbs</Text>
            </View>
            <View style={heroStyles.arrowContainer}>
              <ArrowRight size={24} color={Colors.primary} />
            </View>
            <View style={heroStyles.weightBlock}>
              <Text style={heroStyles.weightLabel}>Goal</Text>
              <Text style={[heroStyles.weightValue, { color: Colors.success }]}>{goalWeight}</Text>
              <Text style={heroStyles.weightUnit}>lbs</Text>
            </View>
          </View>

          {/* Large percentage */}
          <View style={heroStyles.percentageContainer}>
            <Text style={heroStyles.percentageValue}>{achieved ? 100 : progressPercentage}</Text>
            <Text style={heroStyles.percentageSymbol}>%</Text>
          </View>
          <Text style={heroStyles.percentageLabel}>journey complete</Text>

          {/* Progress bar */}
          <View style={heroStyles.progressBarOuter}>
            <LinearGradient
              colors={Gradients.success}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[heroStyles.progressBarInner, { width: `${Math.min(achieved ? 100 : progressPercentage, 100)}%` }]}
            />
          </View>

          {/* Status text */}
          <Text style={heroStyles.statusText}>
            {achieved ? 'Goal reached!' : `${diff} lbs to go`}
          </Text>
        </View>
      </LinearGradient>
    </ReAnimated.View>
  );
}

const heroStyles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.xl,
    padding: 2,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.success + '30',
  },
  inner: {
    borderRadius: BorderRadius.xl - 1,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  weightsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  weightBlock: {
    alignItems: 'center',
  },
  weightLabel: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  weightValue: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  weightUnit: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  arrowContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  percentageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 2,
  },
  percentageValue: {
    fontSize: 56,
    fontWeight: FontWeight.black,
    color: Colors.success,
    lineHeight: 62,
  },
  percentageSymbol: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.success,
    marginBottom: 8,
    marginLeft: 2,
  },
  percentageLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  progressBarOuter: {
    width: '100%',
    height: 8,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  progressBarInner: {
    height: '100%',
    borderRadius: 4,
  },
  statusText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
  },
});

// ----------------------------------------------------------------
// Projection Chart
// ----------------------------------------------------------------

function ProjectionChartSection({ weightEntries, projection, goal }) {
  const chartData = useMemo(() => {
    if (!weightEntries || weightEntries.length === 0) return { historicalData: [], projectedData: [], goalValue: null, minVal: 0, maxVal: 200 };

    // Historical data: last 30 days, sorted oldest first
    const sorted = [...weightEntries].sort((a, b) => new Date(a.date) - new Date(b.date));
    const thirtyDaysAgo = subDays(new Date(), 30);
    const recent = sorted.filter((e) => new Date(e.date) >= thirtyDaysAgo);
    const dataForChart = recent.length > 0 ? recent : sorted.slice(-7);

    const historicalData = dataForChart.map((entry, i) => ({
      value: entry.weight,
      label: i === 0 || i === dataForChart.length - 1 ? format(new Date(entry.date), 'M/d') : '',
      dataPointColor: Colors.primary,
      dataPointRadius: 3,
    }));

    // Projected data
    const projectedData = [];
    if (projection && projection.dataPoints && projection.dataPoints.length > 1) {
      const maxPoints = Math.min(projection.dataPoints.length, 16);
      const step = Math.max(1, Math.floor(projection.dataPoints.length / maxPoints));
      for (let i = 0; i < projection.dataPoints.length; i += step) {
        const dp = projection.dataPoints[i];
        projectedData.push({
          value: dp.weight,
          label: i === 0 || i >= projection.dataPoints.length - step ? format(new Date(dp.date), 'M/d') : '',
          dataPointColor: 'transparent',
        });
      }
      // Always include the last point
      const lastDp = projection.dataPoints[projection.dataPoints.length - 1];
      if (projectedData.length > 0 && projectedData[projectedData.length - 1].value !== lastDp.weight) {
        projectedData.push({
          value: lastDp.weight,
          label: format(new Date(lastDp.date), 'M/d'),
          dataPointColor: 'transparent',
        });
      }
    }

    // Calculate min/max for Y axis
    const allValues = [
      ...historicalData.map((d) => d.value),
      ...projectedData.map((d) => d.value),
    ];
    if (goal) allValues.push(goal);
    const minVal = allValues.length > 0 ? Math.floor(Math.min(...allValues) - 3) : 0;
    const maxVal = allValues.length > 0 ? Math.ceil(Math.max(...allValues) + 3) : 200;

    return { historicalData, projectedData, goalValue: goal, minVal, maxVal };
  }, [weightEntries, projection, goal]);

  if (chartData.historicalData.length < 2) return null;

  return (
    <ReAnimated.View entering={FadeInDown.delay(200).springify().mass(0.5).damping(10)}>
      <View style={chartStyles.container}>
        <Text style={chartStyles.title}>Weight Projection</Text>

        {/* Legend */}
        <View style={chartStyles.legendRow}>
          <View style={chartStyles.legendItem}>
            <View style={[chartStyles.legendLine, { backgroundColor: Colors.primary }]} />
            <Text style={chartStyles.legendText}>Actual</Text>
          </View>
          {chartData.projectedData.length > 0 && (
            <View style={chartStyles.legendItem}>
              <View style={[chartStyles.legendDash, { borderColor: Colors.primary + '60' }]} />
              <Text style={chartStyles.legendText}>Projected</Text>
            </View>
          )}
          {chartData.goalValue && (
            <View style={chartStyles.legendItem}>
              <View style={[chartStyles.legendLine, { backgroundColor: Colors.success }]} />
              <Text style={chartStyles.legendText}>Goal</Text>
            </View>
          )}
        </View>

        {/* Chart */}
        <View style={chartStyles.chartWrap}>
          <LineChart
            data={chartData.historicalData}
            data2={chartData.projectedData.length > 1 ? chartData.projectedData : undefined}
            width={CHART_WIDTH}
            height={200}
            spacing={Math.max(20, CHART_WIDTH / Math.max(chartData.historicalData.length + chartData.projectedData.length - 1, 4))}
            color1={Colors.primary}
            color2={Colors.primary + '60'}
            thickness={2.5}
            thickness2={2}
            strokeDashArray2={[6, 4]}
            dataPointsColor1={Colors.primary}
            dataPointsRadius1={3}
            hideDataPoints2
            startFillColor={Colors.primary + '25'}
            endFillColor={Colors.primary + '05'}
            areaChart
            curved
            yAxisColor={Colors.border}
            xAxisColor={Colors.border}
            yAxisTextStyle={chartStyles.axisText}
            xAxisLabelTextStyle={chartStyles.axisText}
            yAxisOffset={chartData.minVal}
            noOfSections={4}
            rulesColor={Colors.border}
            rulesType="dashed"
            dashWidth={3}
            dashGap={5}
            initialSpacing={10}
            endSpacing={10}
            referenceLine1Config={
              chartData.goalValue
                ? {
                    value: chartData.goalValue - chartData.minVal,
                    color: Colors.success,
                    dashWidth: 6,
                    dashGap: 4,
                    thickness: 2,
                    labelText: `Goal: ${chartData.goalValue} lbs`,
                    labelTextStyle: { color: Colors.success, fontSize: 10, fontWeight: '600' },
                  }
                : undefined
            }
            pointerConfig={{
              pointerStripHeight: 180,
              pointerStripColor: Colors.primary + '30',
              pointerStripWidth: 1,
              pointerColor: Colors.primary,
              radius: 5,
              pointerLabelWidth: 100,
              pointerLabelHeight: 32,
              pointerLabelComponent: (items) => (
                <View style={chartStyles.tooltip}>
                  <Text style={chartStyles.tooltipText}>
                    {(items[0].value + chartData.minVal).toFixed(1)} lbs
                  </Text>
                </View>
              ),
            }}
          />
        </View>
      </View>
    </ReAnimated.View>
  );
}

const chartStyles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  legendRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendLine: {
    width: 16,
    height: 3,
    borderRadius: 1.5,
  },
  legendDash: {
    width: 16,
    height: 0,
    borderTopWidth: 2,
    borderStyle: 'dashed',
  },
  legendText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  chartWrap: {
    marginLeft: -Spacing.xs,
    overflow: 'hidden',
  },
  axisText: {
    color: Colors.textTertiary,
    fontSize: 9,
  },
  tooltip: {
    backgroundColor: Colors.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.xs,
    borderWidth: 1,
    borderColor: Colors.primary + '40',
  },
  tooltipText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },
});

// ----------------------------------------------------------------
// Timeline Card
// ----------------------------------------------------------------

function TimelineCard({ projection }) {
  if (!projection || projection.achieved) return null;
  if (!projection.projectedDate || projection.daysRemaining === Infinity) return null;

  const formattedDate = format(projection.projectedDate, 'MMMM d, yyyy');
  const absRate = Math.abs(projection.weeklyRate);

  return (
    <ReAnimated.View entering={FadeInDown.delay(300).springify().mass(0.5).damping(10)}>
      <LinearGradient
        colors={Gradients.card}
        style={timelineStyles.card}
      >
        <View style={timelineStyles.header}>
          <Clock size={18} color={Colors.primary} />
          <Text style={timelineStyles.title}>Estimated Timeline</Text>
        </View>

        <Text style={timelineStyles.rateText}>
          At your current rate of {absRate} lbs/week...
        </Text>

        <View style={timelineStyles.dateRow}>
          <Calendar size={22} color={Colors.success} />
          <View style={timelineStyles.dateInfo}>
            <Text style={timelineStyles.dateLabel}>Projected Completion</Text>
            <Text style={timelineStyles.dateValue}>{formattedDate}</Text>
          </View>
        </View>

        <View style={timelineStyles.daysRow}>
          <View style={timelineStyles.daysBadge}>
            <Text style={timelineStyles.daysValue}>{projection.daysRemaining}</Text>
            <Text style={timelineStyles.daysLabel}>days remaining</Text>
          </View>
        </View>
      </LinearGradient>
    </ReAnimated.View>
  );
}

const timelineStyles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  rateText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
    lineHeight: 22,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  dateInfo: {
    flex: 1,
  },
  dateLabel: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginBottom: 2,
  },
  dateValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.success,
  },
  daysRow: {
    alignItems: 'center',
  },
  daysBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.sm,
  },
  daysValue: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  daysLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
});

// ----------------------------------------------------------------
// Rate Analysis Card
// ----------------------------------------------------------------

function RateAnalysisCard({ weeklyRate, goalType }) {
  const absRate = Math.abs(weeklyRate);
  const rateColor = getRateColor(absRate);
  const rateLabel = getRateLabel(absRate);
  const isGaining = goalType === 'gain' || weeklyRate > 0;

  return (
    <ReAnimated.View entering={FadeInDown.delay(400).springify().mass(0.5).damping(10)}>
      <LinearGradient
        colors={Gradients.card}
        style={rateStyles.card}
      >
        <View style={rateStyles.header}>
          <TrendingUp size={18} color={Colors.primary} />
          <Text style={rateStyles.title}>Rate Analysis</Text>
        </View>

        <View style={rateStyles.rateRow}>
          <View style={[rateStyles.rateBadge, { backgroundColor: rateColor + '20', borderColor: rateColor + '40' }]}>
            <Text style={[rateStyles.rateBadgeText, { color: rateColor }]}>
              {absRate} lbs/week
            </Text>
          </View>
          <View style={[rateStyles.statusBadge, { backgroundColor: rateColor + '15' }]}>
            <Text style={[rateStyles.statusText, { color: rateColor }]}>{rateLabel}</Text>
          </View>
        </View>

        <View style={rateStyles.infoRow}>
          <Text style={rateStyles.infoLabel}>Direction</Text>
          <View style={rateStyles.directionBadge}>
            {isGaining ? (
              <TrendingUp size={14} color={Colors.success} />
            ) : (
              <TrendingDown size={14} color={Colors.secondary} />
            )}
            <Text style={rateStyles.directionText}>
              {isGaining ? 'Gaining' : 'Losing'} weight
            </Text>
          </View>
        </View>

        <View style={rateStyles.recommendationRow}>
          <AlertTriangle size={14} color={Colors.textTertiary} />
          <Text style={rateStyles.recommendationText}>
            Healthy range: 0.5 - 2 lbs/week
          </Text>
        </View>

        {absRate > 2 && (
          <View style={[rateStyles.warningRow, { backgroundColor: Colors.errorSoft }]}>
            <AlertTriangle size={14} color={Colors.error} />
            <Text style={[rateStyles.warningText, { color: Colors.error }]}>
              Your rate exceeds the recommended maximum. Consider slowing down for sustainability.
            </Text>
          </View>
        )}
        {absRate < 0.5 && absRate > 0 && (
          <View style={[rateStyles.warningRow, { backgroundColor: Colors.warningSoft }]}>
            <AlertTriangle size={14} color={Colors.warning} />
            <Text style={[rateStyles.warningText, { color: Colors.warning }]}>
              Progress is slow but steady. A moderate calorie adjustment could help.
            </Text>
          </View>
        )}
      </LinearGradient>
    </ReAnimated.View>
  );
}

const rateStyles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  rateRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    alignItems: 'center',
  },
  rateBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  rateBadgeText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  statusBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  statusText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  infoLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  directionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  directionText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.text,
  },
  recommendationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  recommendationText: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  warningText: {
    fontSize: FontSize.sm,
    flex: 1,
    lineHeight: 20,
  },
});

// ----------------------------------------------------------------
// Milestones Section
// ----------------------------------------------------------------

function MilestonesSection({ projection }) {
  if (!projection || projection.achieved || !projection.startWeight || !projection.goalWeight) return null;
  if (projection.daysRemaining === Infinity) return null;

  const { startWeight, currentWeight, goalWeight, weeklyRate, progressPercentage } = projection;
  const totalDiff = goalWeight - startWeight;

  const milestones = [
    { pct: 25, label: '25% of goal', weight: Math.round((startWeight + totalDiff * 0.25) * 10) / 10 },
    { pct: 50, label: 'Halfway!', weight: Math.round((startWeight + totalDiff * 0.50) * 10) / 10 },
    { pct: 75, label: '75% of goal', weight: Math.round((startWeight + totalDiff * 0.75) * 10) / 10 },
    { pct: 100, label: 'Goal reached!', weight: goalWeight },
  ];

  // Calculate projected date for each milestone
  const milestonesWithDates = milestones.map((m) => {
    const weightToReach = m.weight;
    const diffFromCurrent = weightToReach - currentWeight;
    if (weeklyRate === 0) return { ...m, date: null, achieved: false };
    const weeksNeeded = diffFromCurrent / weeklyRate;
    const daysNeeded = Math.round(weeksNeeded * 7);
    const reached = progressPercentage >= m.pct;
    return {
      ...m,
      date: daysNeeded > 0 ? format(addDays(new Date(), daysNeeded), 'MMM d, yyyy') : (reached ? 'Achieved' : 'N/A'),
      achieved: reached,
    };
  });

  return (
    <ReAnimated.View entering={FadeInDown.delay(500).springify().mass(0.5).damping(10)}>
      <View style={milestoneStyles.container}>
        <Text style={milestoneStyles.title}>Milestones</Text>

        <View style={milestoneStyles.timeline}>
          {milestonesWithDates.map((m, i) => (
            <View key={m.pct} style={milestoneStyles.milestoneRow}>
              {/* Connector line */}
              {i > 0 && (
                <View style={[
                  milestoneStyles.connector,
                  { backgroundColor: m.achieved ? Colors.success + '40' : Colors.surfaceElevated },
                ]} />
              )}

              {/* Marker */}
              <View style={milestoneStyles.markerRow}>
                <View style={[
                  milestoneStyles.marker,
                  m.achieved
                    ? { backgroundColor: Colors.success }
                    : { backgroundColor: Colors.surfaceElevated, borderWidth: 2, borderColor: Colors.textTertiary },
                ]}>
                  {m.achieved ? (
                    <Check size={12} color={Colors.background} />
                  ) : (
                    <Circle size={8} color={Colors.textTertiary} />
                  )}
                </View>

                {/* Info */}
                <View style={milestoneStyles.infoCol}>
                  <Text style={[milestoneStyles.label, m.achieved && { color: Colors.success }]}>
                    {m.label}
                  </Text>
                  <Text style={milestoneStyles.weight}>{m.weight} lbs</Text>
                </View>

                {/* Date */}
                <Text style={[
                  milestoneStyles.date,
                  m.achieved && { color: Colors.success },
                ]}>
                  {m.date || '--'}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </ReAnimated.View>
  );
}

const milestoneStyles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginBottom: Spacing.lg,
  },
  timeline: {
    gap: 0,
  },
  milestoneRow: {
    position: 'relative',
  },
  connector: {
    position: 'absolute',
    left: 13,
    top: -16,
    width: 2,
    height: 16,
  },
  markerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  marker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoCol: {
    flex: 1,
  },
  label: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  weight: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  date: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textTertiary,
  },
});

// ----------------------------------------------------------------
// Scenario Cards ("What If")
// ----------------------------------------------------------------

function ScenarioCards({ currentWeight, goalWeight, currentRate }) {
  if (!currentWeight || !goalWeight) return null;

  const isLosing = goalWeight < currentWeight;
  const absCurrentRate = Math.abs(currentRate);

  const scenarios = [
    { label: 'Conservative', rate: 0.5, color: Colors.success, icon: TrendingDown },
    { label: 'Moderate', rate: 1.0, color: Colors.primary, icon: TrendingDown },
    { label: 'Aggressive', rate: 2.0, color: Colors.secondary, icon: Zap },
  ];

  return (
    <ReAnimated.View entering={FadeInDown.delay(600).springify().mass(0.5).damping(10)}>
      <Text style={scenarioStyles.sectionTitle}>What If Scenarios</Text>

      <View style={scenarioStyles.row}>
        {scenarios.map((s) => {
          const effectiveRate = isLosing ? -s.rate : s.rate;
          const date = scenarioDate(currentWeight, goalWeight, effectiveRate);
          const isActive = absCurrentRate >= s.rate - 0.25 && absCurrentRate < s.rate + 0.25;

          return (
            <View key={s.label} style={scenarioStyles.cardWrap}>
              <LinearGradient
                colors={isActive ? [s.color + '15', s.color + '05'] : Gradients.card}
                style={[
                  scenarioStyles.card,
                  isActive && { borderColor: s.color + '40' },
                ]}
              >
                {isActive && (
                  <View style={[scenarioStyles.activeBadge, { backgroundColor: s.color + '20' }]}>
                    <Text style={[scenarioStyles.activeText, { color: s.color }]}>Current</Text>
                  </View>
                )}
                <s.icon size={20} color={s.color} />
                <Text style={scenarioStyles.scenarioLabel}>{s.label}</Text>
                <Text style={[scenarioStyles.scenarioRate, { color: s.color }]}>
                  {s.rate} lb/wk
                </Text>
                <Text style={scenarioStyles.scenarioDate}>
                  {date ? format(date, 'MMM d, yyyy') : 'N/A'}
                </Text>
              </LinearGradient>
            </View>
          );
        })}
      </View>
    </ReAnimated.View>
  );
}

const scenarioStyles = StyleSheet.create({
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  cardWrap: {
    flex: 1,
  },
  card: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: Spacing.xs,
    minHeight: 140,
    justifyContent: 'center',
  },
  activeBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.xs,
  },
  activeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  scenarioLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginTop: Spacing.xs,
  },
  scenarioRate: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  scenarioDate: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
});

// ----------------------------------------------------------------
// No Goal State
// ----------------------------------------------------------------

function NoGoalState() {
  return (
    <ReAnimated.View entering={FadeInDown.delay(200).springify().mass(0.5).damping(10)} style={emptyStyles.container}>
      <View style={emptyStyles.iconWrap}>
        <Target size={48} color={Colors.primary} />
      </View>
      <Text style={emptyStyles.title}>No Weight Goal Set</Text>
      <Text style={emptyStyles.subtitle}>
        Set a target weight in the Weight Tracker to see your projected timeline, milestones, and completion date.
      </Text>
      <Pressable
        style={emptyStyles.button}
        onPress={async () => {
          await hapticLight();
          router.push('/weight-log');
        }}
      >
        <LinearGradient colors={Gradients.primary} style={emptyStyles.buttonGradient}>
          <Scale size={18} color={Colors.background} />
          <Text style={emptyStyles.buttonText}>Go to Weight Tracker</Text>
        </LinearGradient>
      </Pressable>
    </ReAnimated.View>
  );
}

// ----------------------------------------------------------------
// No Data State
// ----------------------------------------------------------------

function NoDataState() {
  return (
    <ReAnimated.View entering={FadeInDown.delay(200).springify().mass(0.5).damping(10)} style={emptyStyles.container}>
      <View style={emptyStyles.iconWrap}>
        <Scale size={48} color={Colors.warning} />
      </View>
      <Text style={emptyStyles.title}>Need More Data</Text>
      <Text style={emptyStyles.subtitle}>
        Log at least 2 weight entries to generate projections and see your progress timeline.
      </Text>
      <Pressable
        style={emptyStyles.button}
        onPress={async () => {
          await hapticLight();
          router.push('/weight-log');
        }}
      >
        <LinearGradient colors={Gradients.primary} style={emptyStyles.buttonGradient}>
          <Scale size={18} color={Colors.background} />
          <Text style={emptyStyles.buttonText}>Log Weight</Text>
        </LinearGradient>
      </Pressable>
    </ReAnimated.View>
  );
}

const emptyStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
    paddingHorizontal: Spacing.xl,
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  button: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.button,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  buttonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.background,
  },
});

// ----------------------------------------------------------------
// Wrong Direction State
// ----------------------------------------------------------------

function WrongDirectionCard({ projection }) {
  if (!projection || !projection.wrongDirection) return null;

  return (
    <ReAnimated.View entering={FadeInDown.delay(200).springify().mass(0.5).damping(10)}>
      <LinearGradient
        colors={['rgba(255, 82, 82, 0.08)', 'rgba(255, 82, 82, 0.02)']}
        style={wrongDirStyles.card}
      >
        <AlertTriangle size={24} color={Colors.error} />
        <Text style={wrongDirStyles.title}>Moving in the Wrong Direction</Text>
        <Text style={wrongDirStyles.subtitle}>
          Your weight trend is heading away from your goal. Consider adjusting your calorie intake or activity level.
        </Text>
        <Pressable
          style={wrongDirStyles.button}
          onPress={async () => {
            await hapticLight();
            router.push('/weight-log');
          }}
        >
          <Text style={wrongDirStyles.buttonText}>Review Weight Log</Text>
          <ChevronRight size={16} color={Colors.primary} />
        </Pressable>
      </LinearGradient>
    </ReAnimated.View>
  );
}

const wrongDirStyles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.error + '30',
    alignItems: 'center',
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.error,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.primarySoft,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  buttonText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },
});

// ----------------------------------------------------------------
// Goal Achieved Card
// ----------------------------------------------------------------

function GoalAchievedCard({ projection }) {
  if (!projection || !projection.achieved) return null;

  return (
    <ReAnimated.View entering={FadeInDown.delay(200).springify().mass(0.5).damping(10)}>
      <LinearGradient
        colors={['rgba(0, 230, 118, 0.12)', 'rgba(0, 230, 118, 0.04)']}
        style={achievedStyles.card}
      >
        <View style={achievedStyles.checkWrap}>
          <Check size={32} color={Colors.success} />
        </View>
        <Text style={achievedStyles.title}>Goal Reached!</Text>
        <Text style={achievedStyles.subtitle}>
          Congratulations! You have reached your target weight of {projection.goalWeight} lbs.
        </Text>
      </LinearGradient>
    </ReAnimated.View>
  );
}

const achievedStyles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.success + '30',
    alignItems: 'center',
  },
  checkWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.successSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.success,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});

// ----------------------------------------------------------------
// Main Screen
// ----------------------------------------------------------------

export default function GoalTimelineScreen() {
  const { entries, goal } = useWeightHistory();

  let profileData = null;
  try {
    profileData = useProfile();
  } catch {
    // Profile context not available
  }

  const profile = profileData?.profile;
  const tdee = profile?.tdee || 0;
  const weeklyGoal = profile?.weeklyGoal || 'maintain';

  // Calculate daily calorie deficit from profile settings
  const dailyCalorieDeficit = useMemo(() => {
    const adjustments = {
      lose2: -1000,
      lose1: -500,
      lose05: -250,
      maintain: 0,
      gain05: 250,
      gain1: 500,
    };
    return adjustments[weeklyGoal] || 0;
  }, [weeklyGoal]);

  // Determine weight goal: use the weight-log goal first, then profile goalWeight
  const weightGoal = goal || profile?.goalWeight || null;

  // Get goal type from profile
  const goalType = useMemo(() => {
    if (!weeklyGoal) return 'maintain';
    if (weeklyGoal.startsWith('lose')) return 'lose';
    if (weeklyGoal.startsWith('gain')) return 'gain';
    return 'maintain';
  }, [weeklyGoal]);

  const { projection, weeklyRate } = useGoalProjection(entries, weightGoal, dailyCalorieDeficit);

  // Determine what state to show
  const hasGoal = weightGoal !== null && weightGoal !== undefined;
  const hasEnoughData = entries && entries.length >= 2;

  return (
    <ScreenWrapper>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <ReAnimated.View entering={FadeInDown.delay(0).springify().mass(0.5).damping(10)} style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={async () => {
              await hapticLight();
              router.back();
            }}
          >
            <ArrowLeft size={22} color={Colors.text} />
          </Pressable>
          <Text style={styles.title}>Goal Timeline</Text>
          <View style={styles.headerIcon}>
            <Target size={22} color={Colors.success} />
          </View>
        </ReAnimated.View>

        {/* Conditional Content */}
        {!hasGoal && <NoGoalState />}

        {hasGoal && !hasEnoughData && <NoDataState />}

        {hasGoal && hasEnoughData && projection && (
          <>
            {/* Goal Achieved */}
            {projection.achieved && <GoalAchievedCard projection={projection} />}

            {/* Wrong Direction */}
            {projection.wrongDirection && <WrongDirectionCard projection={projection} />}

            {/* Progress Hero */}
            <ProgressHeroCard projection={projection} />

            {/* Projection Chart */}
            <ProjectionChartSection
              weightEntries={entries}
              projection={projection}
              goal={weightGoal}
            />

            {/* Timeline Card */}
            <TimelineCard projection={projection} />

            {/* Rate Analysis */}
            {weeklyRate !== 0 && (
              <RateAnalysisCard weeklyRate={weeklyRate} goalType={goalType} />
            )}

            {/* Milestones */}
            <MilestonesSection projection={projection} />

            {/* Scenario Cards */}
            {!projection.achieved && (
              <ScenarioCards
                currentWeight={projection.currentWeight}
                goalWeight={projection.goalWeight}
                currentRate={weeklyRate}
              />
            )}
          </>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </ScreenWrapper>
  );
}

// ----------------------------------------------------------------
// Main Styles
// ----------------------------------------------------------------

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
  },
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
  title: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.successSoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomSpacer: {
    height: 120,
  },
});

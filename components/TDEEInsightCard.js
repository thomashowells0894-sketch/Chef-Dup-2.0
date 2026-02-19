/**
 * TDEEInsightCard - Dashboard card showing adaptive TDEE insights.
 *
 * Displays:
 * - Current adaptive TDEE with confidence indicator
 * - 30-day TDEE trend line (mini sparkline via react-native-svg)
 * - "Your metabolism" section: BMR + activity multiplier
 * - Metabolic adaptation warning if detected
 * - Plateau alert with recommendations
 * - Data quality indicator (days logged this week)
 */

import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Polyline, Defs, LinearGradient as SvgGradient, Stop, Rect, Circle } from 'react-native-svg';
import {
  Flame,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Activity,
  BarChart3,
  Zap,
  Shield,
  CheckCircle,
  Info,
} from 'lucide-react-native';
import GlassCard from './ui/GlassCard';
import {
  Colors,
  Gradients,
  Spacing,
  FontSize,
  FontWeight,
  BorderRadius,
} from '../constants/theme';
import { useAdaptiveTDEE } from '../hooks/useAdaptiveTDEE';

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Confidence meter: a segmented bar (0-1) */
function ConfidenceMeter({ confidence, source }) {
  const segments = 5;
  const filledSegments = Math.round(confidence * segments);
  const label =
    confidence >= 0.7 ? 'High' :
    confidence >= 0.4 ? 'Medium' :
    confidence >= 0.2 ? 'Low' : 'Building...';

  const color =
    confidence >= 0.7 ? Colors.success :
    confidence >= 0.4 ? Colors.warning :
    Colors.textMuted;

  return (
    <View style={styles.confidenceContainer}>
      <View style={styles.confidenceBarRow}>
        {Array.from({ length: segments }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.confidenceSegment,
              {
                backgroundColor: i < filledSegments ? color : 'rgba(255,255,255,0.08)',
              },
            ]}
          />
        ))}
      </View>
      <Text style={[styles.confidenceLabel, { color }]}>
        {label} confidence
        {source !== 'formula' ? '' : ' (formula only)'}
      </Text>
    </View>
  );
}

/** Mini sparkline chart using react-native-svg */
function Sparkline({ data, width = 200, height = 50 }) {
  if (!data || data.length < 2) {
    return (
      <View style={[styles.sparklineContainer, { width, height }]}>
        <Text style={styles.sparklineEmpty}>Not enough data for trend</Text>
      </View>
    );
  }

  // Limit to last 30 points for readability
  const points = data.slice(-30);
  const values = points.map((p) => p.tdee);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  // Build polyline points string
  const padding = 4;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const polylinePoints = values
    .map((v, i) => {
      const x = padding + (i / (values.length - 1)) * chartWidth;
      const y = padding + chartHeight - ((v - min) / range) * chartHeight;
      return `${x},${y}`;
    })
    .join(' ');

  // Last point for the glowing dot
  const lastX = padding + chartWidth;
  const lastY = padding + chartHeight - ((values[values.length - 1] - min) / range) * chartHeight;

  return (
    <View style={[styles.sparklineContainer, { width, height }]}>
      <Svg width={width} height={height}>
        <Defs>
          <SvgGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={Colors.primary} stopOpacity="0.3" />
            <Stop offset="1" stopColor={Colors.primary} stopOpacity="0" />
          </SvgGradient>
        </Defs>
        <Polyline
          points={polylinePoints}
          fill="none"
          stroke={Colors.primary}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {/* Glowing endpoint */}
        <Circle cx={lastX} cy={lastY} r={3} fill={Colors.primary} />
        <Circle cx={lastX} cy={lastY} r={6} fill={Colors.primary} opacity={0.3} />
      </Svg>
      <View style={styles.sparklineLabels}>
        <Text style={styles.sparklineLabelLeft}>
          {Math.round(min)} cal
        </Text>
        <Text style={styles.sparklineLabelRight}>
          {Math.round(max)} cal
        </Text>
      </View>
    </View>
  );
}

/** Data quality dots: how many days logged this week */
function DataQualityIndicator({ daysLogged }) {
  const totalDays = 7;
  return (
    <View style={styles.dataQualityRow}>
      <BarChart3 size={14} color={Colors.textTertiary} />
      <Text style={styles.dataQualityLabel}>This week</Text>
      <View style={styles.dataQualityDots}>
        {Array.from({ length: totalDays }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.dataQualityDot,
              {
                backgroundColor:
                  i < daysLogged ? Colors.success : 'rgba(255,255,255,0.1)',
              },
            ]}
          />
        ))}
      </View>
      <Text style={styles.dataQualityCount}>{daysLogged}/7</Text>
    </View>
  );
}

/** Trend icon based on direction */
function TrendIcon({ trend }) {
  if (trend === 'increasing') return <TrendingUp size={16} color={Colors.success} />;
  if (trend === 'decreasing') return <TrendingDown size={16} color={Colors.secondary} />;
  return <Minus size={16} color={Colors.textTertiary} />;
}

/** Insight row (warning / alert / info) */
function InsightRow({ insight }) {
  const config = {
    success: { icon: CheckCircle, color: Colors.success, bg: Colors.successSoft },
    warning: { icon: AlertTriangle, color: Colors.warning, bg: Colors.warningSoft },
    alert: { icon: AlertTriangle, color: Colors.error, bg: Colors.errorSoft },
    info: { icon: Info, color: Colors.primary, bg: Colors.primarySoft },
  };
  const c = config[insight.type] || config.info;
  const Icon = c.icon;

  return (
    <View style={[styles.insightRow, { backgroundColor: c.bg }]}>
      <Icon size={16} color={c.color} />
      <View style={styles.insightTextContainer}>
        <Text style={[styles.insightTitle, { color: c.color }]}>{insight.title}</Text>
        <Text style={styles.insightMessage}>{insight.message}</Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

function TDEEInsightCard() {
  const {
    estimate,
    trendData,
    insights,
    daysLoggedThisWeek,
    totalDaysWithData,
    isLoading,
  } = useAdaptiveTDEE();

  // Format weekly weight change for display
  const weightChangeText = useMemo(() => {
    if (!estimate) return null;
    const change = estimate.weeklyWeightChange;
    if (Math.abs(change) < 0.05) return 'Stable';
    const sign = change > 0 ? '+' : '';
    return `${sign}${change.toFixed(2)} kg/week`;
  }, [estimate]);

  // Loading state
  if (isLoading && !estimate) {
    return (
      <GlassCard style={styles.card}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={styles.loadingText}>Analyzing your metabolism...</Text>
        </View>
      </GlassCard>
    );
  }

  // No estimate available yet
  if (!estimate) {
    return (
      <GlassCard style={styles.card}>
        <View style={styles.header}>
          <LinearGradient
            colors={Gradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.iconBadge}
          >
            <Flame size={18} color="#FFF" />
          </LinearGradient>
          <View style={styles.headerText}>
            <Text style={styles.title}>Adaptive TDEE</Text>
            <Text style={styles.subtitle}>Log food & weight to unlock</Text>
          </View>
        </View>
        <Text style={styles.emptyMessage}>
          Track your calories and weigh in regularly to build a personalized
          metabolic estimate. We need at least 7 days of data.
        </Text>
        <DataQualityIndicator daysLogged={daysLoggedThisWeek} />
      </GlassCard>
    );
  }

  return (
    <GlassCard style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <LinearGradient
          colors={Gradients.electric}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.iconBadge}
        >
          <Flame size={18} color="#FFF" />
        </LinearGradient>
        <View style={styles.headerText}>
          <Text style={styles.title}>Adaptive TDEE</Text>
          <View style={styles.sourceRow}>
            <Shield size={12} color={Colors.textTertiary} />
            <Text style={styles.sourceLabel}>
              {estimate.estimateSource === 'observed'
                ? 'Powered by your data'
                : estimate.estimateSource === 'hybrid'
                ? 'Formula + observed data'
                : 'Formula-based estimate'}
            </Text>
          </View>
        </View>
      </View>

      {/* Main TDEE display */}
      <View style={styles.tdeeRow}>
        <View style={styles.tdeeMain}>
          <Text style={styles.tdeeValue}>{estimate.tdee.toLocaleString()}</Text>
          <Text style={styles.tdeeUnit}>cal/day</Text>
        </View>
        <View style={styles.tdeeMeta}>
          <View style={styles.metaItem}>
            <TrendIcon trend={estimate.trend} />
            <Text style={styles.metaText}>{weightChangeText}</Text>
          </View>
          {estimate.recommendedIntake !== estimate.tdee && (
            <View style={styles.metaItem}>
              <Zap size={14} color={Colors.primary} />
              <Text style={[styles.metaText, { color: Colors.primaryText }]}>
                Target: {estimate.recommendedIntake.toLocaleString()}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Confidence meter */}
      <ConfidenceMeter
        confidence={estimate.confidence}
        source={estimate.estimateSource}
      />

      {/* Sparkline trend */}
      {trendData.length >= 2 && (
        <View style={styles.sparklineSection}>
          <Text style={styles.sectionLabel}>30-Day TDEE Trend</Text>
          <Sparkline data={trendData} width={280} height={55} />
        </View>
      )}

      {/* Metabolism breakdown */}
      <View style={styles.metabolismSection}>
        <Text style={styles.sectionLabel}>Your Metabolism</Text>
        <View style={styles.metabolismRow}>
          <View style={styles.metabolismItem}>
            <Activity size={14} color={Colors.textTertiary} />
            <Text style={styles.metabolismLabel}>BMR</Text>
            <Text style={styles.metabolismValue}>{estimate.bmr.toLocaleString()}</Text>
          </View>
          <View style={styles.metabolismDivider} />
          <View style={styles.metabolismItem}>
            <Zap size={14} color={Colors.textTertiary} />
            <Text style={styles.metabolismLabel}>Activity</Text>
            <Text style={styles.metabolismValue}>x{estimate.activityMultiplier.toFixed(2)}</Text>
          </View>
          <View style={styles.metabolismDivider} />
          <View style={styles.metabolismItem}>
            <Flame size={14} color={Colors.primary} />
            <Text style={styles.metabolismLabel}>TDEE</Text>
            <Text style={[styles.metabolismValue, { color: Colors.primaryText }]}>
              {estimate.tdee.toLocaleString()}
            </Text>
          </View>
        </View>
      </View>

      {/* Data quality */}
      <DataQualityIndicator daysLogged={daysLoggedThisWeek} />

      {/* Insights / Warnings / Alerts */}
      {insights.length > 0 && (
        <View style={styles.insightsSection}>
          {insights.map((insight, i) => (
            <InsightRow key={i} insight={insight} />
          ))}
        </View>
      )}

      {/* Data points badge */}
      <View style={styles.footerRow}>
        <Text style={styles.footerText}>
          Based on {totalDaysWithData} days of paired data
        </Text>
      </View>
    </GlassCard>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.md,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    marginLeft: Spacing.sm,
    flex: 1,
  },
  title: {
    color: Colors.text,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  subtitle: {
    color: Colors.textTertiary,
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  sourceLabel: {
    color: Colors.textTertiary,
    fontSize: FontSize.xs,
  },

  // Main TDEE row
  tdeeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: Spacing.md,
  },
  tdeeMain: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  tdeeValue: {
    color: Colors.text,
    fontSize: FontSize.xxxl,
    fontWeight: FontWeight.black,
    letterSpacing: -1,
  },
  tdeeUnit: {
    color: Colors.textTertiary,
    fontSize: FontSize.sm,
    marginLeft: 4,
    marginBottom: 4,
  },
  tdeeMeta: {
    alignItems: 'flex-end',
    gap: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
  },

  // Confidence
  confidenceContainer: {
    marginBottom: Spacing.md,
  },
  confidenceBarRow: {
    flexDirection: 'row',
    gap: 3,
    marginBottom: 4,
  },
  confidenceSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  confidenceLabel: {
    fontSize: FontSize.xs,
  },

  // Sparkline
  sparklineSection: {
    marginBottom: Spacing.md,
  },
  sectionLabel: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sparklineContainer: {
    alignSelf: 'center',
    position: 'relative',
  },
  sparklineEmpty: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    textAlign: 'center',
    paddingTop: 16,
  },
  sparklineLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    position: 'absolute',
    bottom: -2,
    left: 4,
    right: 4,
  },
  sparklineLabelLeft: {
    color: Colors.textMuted,
    fontSize: 9,
  },
  sparklineLabelRight: {
    color: Colors.textMuted,
    fontSize: 9,
  },

  // Metabolism breakdown
  metabolismSection: {
    marginBottom: Spacing.md,
  },
  metabolismRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    alignItems: 'center',
  },
  metabolismItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  metabolismLabel: {
    color: Colors.textTertiary,
    fontSize: FontSize.xs,
  },
  metabolismValue: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  metabolismDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },

  // Data quality
  dataQualityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.sm,
  },
  dataQualityLabel: {
    color: Colors.textTertiary,
    fontSize: FontSize.xs,
  },
  dataQualityDots: {
    flexDirection: 'row',
    gap: 3,
    flex: 1,
  },
  dataQualityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dataQualityCount: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },

  // Insights
  insightsSection: {
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  insightRow: {
    flexDirection: 'row',
    padding: Spacing.sm,
    borderRadius: BorderRadius.xs,
    gap: Spacing.xs,
    alignItems: 'flex-start',
  },
  insightTextContainer: {
    flex: 1,
  },
  insightTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  insightMessage: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
    lineHeight: 16,
    marginTop: 2,
  },

  // Footer
  footerRow: {
    marginTop: Spacing.xs,
    alignItems: 'center',
  },
  footerText: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
  },

  // Loading
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.sm,
  },
  loadingText: {
    color: Colors.textTertiary,
    fontSize: FontSize.sm,
  },

  // Empty state
  emptyMessage: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
});

export default memo(TDEEInsightCard);

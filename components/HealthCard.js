/**
 * HealthCard Component
 *
 * Glass card for the dashboard displaying Apple Health / Health Connect data.
 * Two variants:
 * - Connected: step progress ring, active calories, weekly step bar chart
 * - Disconnected: "Connect Health" CTA with heart icon
 */

import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import ReAnimated, { FadeInDown } from 'react-native-reanimated';
import { Heart, Activity, Flame } from 'lucide-react-native';
import { hapticLight } from '../lib/haptics';
import {
  Colors,
  Spacing,
  FontSize,
  FontWeight,
  BorderRadius,
  Shadows,
  Glass,
} from '../constants/theme';

// Health accent: vibrant green
const HEALTH_COLOR = Colors.success;
const HEALTH_COLOR_SOFT = Colors.successSoft;
const HEALTH_COLOR_GLOW = Colors.successGlow;

const STEP_GOAL = 10000;

// ---------------------------------------------------------------------------
// Step Progress Ring
// ---------------------------------------------------------------------------
function StepProgressRing({ steps, goal, size = 90, strokeWidth = 8 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(steps / goal, 1);
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <Svg width={size} height={size}>
      {/* Background circle */}
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={Colors.surfaceElevated}
        strokeWidth={strokeWidth}
        fill="none"
      />
      {/* Progress circle */}
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={HEALTH_COLOR}
        strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        rotation="-90"
        origin={`${size / 2}, ${size / 2}`}
      />
    </Svg>
  );
}

// ---------------------------------------------------------------------------
// Mini Weekly Bar Chart
// ---------------------------------------------------------------------------
function WeeklyBarChart({ weeklySteps }) {
  const maxSteps = useMemo(() => {
    if (!weeklySteps || weeklySteps.length === 0) return STEP_GOAL;
    const max = Math.max(...weeklySteps.map((d) => d.steps), STEP_GOAL);
    return max;
  }, [weeklySteps]);

  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  // Ensure we always show 7 bars
  const bars = useMemo(() => {
    if (!weeklySteps || weeklySteps.length === 0) {
      return dayLabels.map((label) => ({ label, steps: 0, height: 0 }));
    }

    return weeklySteps.map((entry, i) => {
      const height = Math.max((entry.steps / maxSteps) * 100, 4); // min 4% so bar is visible
      // Get day label from the date
      const d = new Date(entry.date + 'T00:00:00');
      const dayIdx = (d.getDay() + 6) % 7; // Convert Sun=0 to Mon=0
      return {
        label: dayLabels[dayIdx] || dayLabels[i],
        steps: entry.steps,
        height,
        isToday: i === weeklySteps.length - 1,
      };
    });
  }, [weeklySteps, maxSteps]);

  return (
    <View style={chartStyles.container}>
      {bars.map((bar, idx) => (
        <View key={idx} style={chartStyles.barColumn}>
          <View style={chartStyles.barTrack}>
            <LinearGradient
              colors={bar.isToday ? [HEALTH_COLOR, Colors.successDim] : [Colors.surfaceBright, Colors.surfaceElevated]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={[
                chartStyles.barFill,
                { height: `${bar.height}%` },
              ]}
            />
          </View>
          <Text style={[chartStyles.barLabel, bar.isToday && chartStyles.barLabelToday]}>
            {bar.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const BAR_HEIGHT = 48;

const chartStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: BAR_HEIGHT + FontSize.xs + Spacing.xs,
    gap: Spacing.xs,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
  },
  barTrack: {
    width: '100%',
    height: BAR_HEIGHT,
    backgroundColor: Colors.surfaceGlass,
    borderRadius: BorderRadius.xs / 2,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  barFill: {
    width: '100%',
    borderRadius: BorderRadius.xs / 2,
  },
  barLabel: {
    fontSize: FontSize.xs - 1,
    color: Colors.textTertiary,
    marginTop: Spacing.xs,
    fontWeight: FontWeight.medium,
  },
  barLabelToday: {
    color: HEALTH_COLOR,
    fontWeight: FontWeight.bold,
  },
});

// ---------------------------------------------------------------------------
// Connected Health Card
// ---------------------------------------------------------------------------
function ConnectedHealthCard({ steps, activeCalories, weeklySteps }) {
  const stepPercent = Math.min(Math.round((steps / STEP_GOAL) * 100), 100);
  const isGoalReached = steps >= STEP_GOAL;

  return (
    <View style={styles.card}>
      {/* Glass blur layer */}
      {Platform.OS === 'ios' && (
        <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
      )}

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconContainer}>
            <Activity size={18} color={HEALTH_COLOR} strokeWidth={2.5} />
          </View>
          <Text style={styles.title}>Health</Text>
        </View>
        {isGoalReached && (
          <View style={styles.goalBadge}>
            <Text style={styles.goalBadgeText}>Goal!</Text>
          </View>
        )}
      </View>

      {/* Main content: ring + stats side by side */}
      <View style={styles.mainRow}>
        {/* Progress Ring */}
        <View style={styles.ringContainer}>
          <StepProgressRing steps={steps} goal={STEP_GOAL} size={90} strokeWidth={8} />
          <View style={styles.ringCenter}>
            <Text style={styles.ringSteps}>{steps.toLocaleString()}</Text>
            <Text style={styles.ringLabel}>steps</Text>
          </View>
        </View>

        {/* Stats column */}
        <View style={styles.statsColumn}>
          <View style={styles.statItem}>
            <View style={styles.statIconRow}>
              <Flame size={14} color={Colors.secondary} strokeWidth={2.5} />
              <Text style={styles.statValue}>{activeCalories}</Text>
            </View>
            <Text style={styles.statLabel}>Active cal</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stepPercent}%</Text>
            <Text style={styles.statLabel}>of {(STEP_GOAL / 1000).toFixed(0)}k goal</Text>
          </View>
        </View>
      </View>

      {/* Weekly Bar Chart */}
      <View style={styles.chartSection}>
        <Text style={styles.chartTitle}>This Week</Text>
        <WeeklyBarChart weeklySteps={weeklySteps} />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Disconnected CTA Card
// ---------------------------------------------------------------------------
function DisconnectedHealthCard({ onConnect }) {
  const handlePress = async () => {
    await hapticLight();
    onConnect?.();
  };

  const platformName = Platform.OS === 'ios' ? 'Apple Health' : 'Google Fit';

  return (
    <Pressable onPress={handlePress}>
      <View style={styles.ctaCard}>
        {/* Glass blur layer */}
        {Platform.OS === 'ios' && (
          <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
        )}

        <View style={styles.ctaContent}>
          <View style={styles.ctaIconContainer}>
            <LinearGradient
              colors={[HEALTH_COLOR, Colors.successDim]}
              style={styles.ctaIconGradient}
            >
              <Heart size={24} color={Colors.background} fill={Colors.background} strokeWidth={2} />
            </LinearGradient>
          </View>

          <View style={styles.ctaTextContainer}>
            <Text style={styles.ctaTitle}>Connect {platformName}</Text>
            <Text style={styles.ctaSubtitle}>Sync steps, weight & activity</Text>
          </View>

          <View style={styles.ctaButton}>
            <Text style={styles.ctaButtonText}>Set Up</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Main HealthCard Export
// ---------------------------------------------------------------------------
function HealthCard({ isConnected, steps, activeCalories, weeklySteps, onConnect }) {
  if (isConnected) {
    return (
      <ReAnimated.View entering={FadeInDown.delay(100).springify().damping(12)}>
        <ConnectedHealthCard
          steps={steps || 0}
          activeCalories={activeCalories || 0}
          weeklySteps={weeklySteps || []}
        />
      </ReAnimated.View>
    );
  }

  return (
    <ReAnimated.View entering={FadeInDown.delay(100).springify().damping(12)}>
      <DisconnectedHealthCard onConnect={onConnect} />
    </ReAnimated.View>
  );
}

export default memo(HealthCard);

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  // Connected card
  card: {
    backgroundColor: Colors.surfaceGlass,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: Glass.borderWidth,
    borderColor: Glass.borderColor,
    overflow: 'hidden',
    ...Shadows.card,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.md,
    backgroundColor: HEALTH_COLOR_SOFT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  goalBadge: {
    backgroundColor: HEALTH_COLOR,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs / 2,
    borderRadius: BorderRadius.full,
  },
  goalBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.background,
  },

  // Main row: ring + stats
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  ringContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.lg,
  },
  ringCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringSteps: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  ringLabel: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: 1,
  },
  statsColumn: {
    flex: 1,
    gap: Spacing.sm,
  },
  statItem: {
    gap: Spacing.xs / 2,
  },
  statIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  statValue: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  statLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  statDivider: {
    height: 1,
    backgroundColor: Colors.border,
  },

  // Chart section
  chartSection: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.md,
  },
  chartTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },

  // CTA card (disconnected)
  ctaCard: {
    backgroundColor: Colors.surfaceGlass,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: Glass.borderWidth,
    borderColor: Glass.borderColor,
    overflow: 'hidden',
    ...Shadows.card,
  },
  ctaContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  ctaIconContainer: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  ctaIconGradient: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ctaTextContainer: {
    flex: 1,
  },
  ctaTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.xs / 2,
  },
  ctaSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  ctaButton: {
    backgroundColor: HEALTH_COLOR_SOFT,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: HEALTH_COLOR_GLOW,
  },
  ctaButtonText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: HEALTH_COLOR,
  },
});

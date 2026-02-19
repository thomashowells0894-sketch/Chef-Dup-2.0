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
  Timer,
  TrendingUp,
  Flame,
  Award,
  Zap,
  ChevronDown,
  Target,
  BarChart3,
} from 'lucide-react-native';

import { Colors, Gradients, Spacing, FontSize, FontWeight, BorderRadius, Shadows } from '../constants/theme';
import ScreenWrapper from '../components/ScreenWrapper';
import { hapticLight } from '../lib/haptics';
import useFastingAnalytics from '../hooks/useFastingAnalytics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - Spacing.md * 4;

// ─── Helper Components ──────────────────────────────────────────────────────

function GlassCard({ children, style }) {
  return (
    <View style={[styles.glassCard, style]}>
      {children}
    </View>
  );
}

function StatCard({ icon: Icon, iconColor, label, value, delay }) {
  return (
    <Animated.View
      entering={FadeInDown.delay(delay).springify().damping(12)}
      style={styles.statCardWrapper}
    >
      <GlassCard style={styles.statCard}>
        <View style={[styles.statIconCircle, { backgroundColor: `${iconColor}15` }]}>
          <Icon size={18} color={iconColor} strokeWidth={2} />
        </View>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </GlassCard>
    </Animated.View>
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

function ZoneRow({ zone, delay }) {
  return (
    <Animated.View
      entering={FadeInDown.delay(delay).springify().damping(12)}
      style={styles.zoneRow}
    >
      <View style={styles.zoneHeader}>
        <View style={styles.zoneNameRow}>
          <View style={[styles.zoneDot, { backgroundColor: zone.color }]} />
          <Text style={styles.zoneName}>{zone.name}</Text>
          <View style={styles.zoneRangeBadge}>
            <Text style={styles.zoneRangeText}>{zone.range}</Text>
          </View>
        </View>
        <Text style={[styles.zonePercentage, { color: zone.color }]}>
          {zone.percentage}%
        </Text>
      </View>
      <View style={styles.zoneBarTrack}>
        <Animated.View
          style={[
            styles.zoneBarFill,
            {
              width: `${Math.max(zone.percentage, 2)}%`,
              backgroundColor: zone.color,
            },
          ]}
        />
      </View>
      <Text style={styles.zoneBenefit}>{zone.benefit}</Text>
    </Animated.View>
  );
}

function InsightCard({ icon: Icon, iconColor, title, value, subtitle, delay }) {
  return (
    <Animated.View
      entering={FadeInDown.delay(delay).springify().damping(12)}
    >
      <GlassCard style={styles.insightCard}>
        <View style={styles.insightLeft}>
          <LinearGradient
            colors={[`${iconColor}30`, `${iconColor}10`]}
            style={styles.insightIconCircle}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Icon size={20} color={iconColor} strokeWidth={2} />
          </LinearGradient>
        </View>
        <View style={styles.insightContent}>
          <Text style={styles.insightTitle}>{title}</Text>
          <Text style={[styles.insightValue, { color: iconColor }]}>{value}</Text>
          {subtitle ? (
            <Text style={styles.insightSubtitle}>{subtitle}</Text>
          ) : null}
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
      <Text style={styles.emptyTitle}>Start Your Fasting Journey</Text>
      <Text style={styles.emptySubtitle}>
        Complete your first fast to unlock detailed analytics, streaks, and
        insights into your fasting patterns.
      </Text>
      <View style={styles.emptyHintRow}>
        <ChevronDown size={16} color={Colors.textSecondary} strokeWidth={2} />
        <Text style={styles.emptyHint}>
          Head to the fasting timer to begin
        </Text>
      </View>
    </Animated.View>
  );
}

// ─── Main Screen ────────────────────────────────────────────────────────────

export default function FastingAnalyticsScreen() {
  const router = useRouter();
  const {
    history,
    isLoading,
    totalFasts,
    averageDuration,
    longestFast,
    completionRate,
    totalHoursFasted,
    currentStreak,
    bestStreak,
    weeklyData,
    fastingZones,
    preferredSchedule,
  } = useFastingAnalytics();

  // Build bar chart data
  const chartData = useMemo(() => {
    return weeklyData.map((day) => ({
      value: day.hours,
      label: day.dayLabel,
      frontColor: day.completed ? Colors.success || '#00E676' : '#FFB300',
      gradientColor: day.completed
        ? 'rgba(0,230,118,0.4)'
        : 'rgba(255,179,0,0.4)',
      topLabelComponent: () =>
        day.hours > 0 ? (
          <Text style={styles.barTopLabel}>{day.hours}h</Text>
        ) : null,
      labelTextStyle: styles.barBottomLabel,
    }));
  }, [weeklyData]);

  // Average target for the reference line
  const avgTarget = useMemo(() => {
    const targets = weeklyData.map((d) => d.target);
    const sum = targets.reduce((a, b) => a + b, 0);
    return Math.round(sum / targets.length);
  }, [weeklyData]);

  // Format preferred schedule for display
  const scheduleDisplay = useMemo(() => {
    if (!preferredSchedule) return null;
    const parts = preferredSchedule.split(':');
    return `${parts[0]}:${parts[1]}`;
  }, [preferredSchedule]);

  // Milestone label for total hours
  const milestoneLabel = useMemo(() => {
    if (totalHoursFasted >= 1000) return 'Elite Faster';
    if (totalHoursFasted >= 500) return 'Dedicated Practitioner';
    if (totalHoursFasted >= 200) return 'Committed Faster';
    if (totalHoursFasted >= 100) return 'Building Momentum';
    if (totalHoursFasted >= 50) return 'Getting Started';
    return 'Just Beginning';
  }, [totalHoursFasted]);

  const handleBack = () => {
    hapticLight();
    router.back();
  };

  if (isLoading) {
    return (
      <ScreenWrapper>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
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
            <ArrowLeft size={22} color={Colors.textPrimary} strokeWidth={2} />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Fasting Insights</Text>

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
        {history.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {/* ─── Stats Grid (2x2) ──────────────────────────────── */}
            <Animated.View
              entering={FadeInDown.delay(150).springify().damping(12)}
              style={styles.statsGrid}
            >
              <StatCard
                icon={Timer}
                iconColor="#00D4FF"
                label="Total Fasts"
                value={totalFasts}
                delay={200}
              />
              <StatCard
                icon={Clock}
                iconColor="#A78BFA"
                label="Avg Duration"
                value={`${averageDuration}h`}
                delay={250}
              />
              <StatCard
                icon={Flame}
                iconColor="#FF6B35"
                label="Best Streak"
                value={`${bestStreak}d`}
                delay={300}
              />
              <StatCard
                icon={Target}
                iconColor="#00E676"
                label="Completion"
                value={`${completionRate}%`}
                delay={350}
              />
            </Animated.View>

            {/* ─── Weekly Chart ───────────────────────────────────── */}
            <Animated.View
              entering={FadeInDown.delay(400).springify().damping(12)}
            >
              <SectionHeader
                title="Weekly Overview"
                icon={BarChart3}
                iconColor="#00D4FF"
              />
              <GlassCard style={styles.chartCard}>
                <View style={styles.chartLegend}>
                  <View style={styles.legendItem}>
                    <View
                      style={[
                        styles.legendDot,
                        { backgroundColor: '#00E676' },
                      ]}
                    />
                    <Text style={styles.legendText}>Completed</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View
                      style={[
                        styles.legendDot,
                        { backgroundColor: '#FFB300' },
                      ]}
                    />
                    <Text style={styles.legendText}>Partial</Text>
                  </View>
                </View>

                <BarChart
                  data={chartData}
                  width={CHART_WIDTH}
                  height={180}
                  barWidth={28}
                  spacing={16}
                  noOfSections={4}
                  maxValue={Math.max(24, avgTarget + 4)}
                  barBorderRadius={6}
                  frontColor="rgba(0,212,255,0.6)"
                  yAxisColor="rgba(255,255,255,0.06)"
                  xAxisColor="rgba(255,255,255,0.06)"
                  yAxisTextStyle={styles.yAxisText}
                  xAxisLabelTextStyle={styles.xAxisText}
                  hideRules={false}
                  rulesColor="rgba(255,255,255,0.04)"
                  rulesType="dashed"
                  showReferenceLine1
                  referenceLine1Position={avgTarget}
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
                    Target: {avgTarget}h (dashed line)
                  </Text>
                </View>
              </GlassCard>
            </Animated.View>

            {/* ─── Fasting Zones ──────────────────────────────────── */}
            <Animated.View
              entering={FadeInDown.delay(500).springify().damping(12)}
            >
              <SectionHeader
                title="Fasting Zones"
                icon={Zap}
                iconColor="#A78BFA"
              />
              <GlassCard style={styles.zonesCard}>
                {fastingZones.map((zone, index) => (
                  <ZoneRow
                    key={zone.name}
                    zone={zone}
                    delay={550 + index * 50}
                  />
                ))}
              </GlassCard>
            </Animated.View>

            {/* ─── Insights ──────────────────────────────────────── */}
            <Animated.View
              entering={FadeInDown.delay(700).springify().damping(12)}
            >
              <SectionHeader
                title="Insights"
                icon={TrendingUp}
                iconColor="#00E676"
              />

              {scheduleDisplay ? (
                <InsightCard
                  icon={Clock}
                  iconColor="#00D4FF"
                  title="Preferred Schedule"
                  value={scheduleDisplay}
                  subtitle="Your most used fasting window"
                  delay={750}
                />
              ) : null}

              <InsightCard
                icon={Award}
                iconColor="#FFB300"
                title="Total Hours Fasted"
                value={`${totalHoursFasted}h`}
                subtitle={milestoneLabel}
                delay={800}
              />

              <InsightCard
                icon={Flame}
                iconColor="#FF6B35"
                title="Current Streak"
                value={`${currentStreak} day${currentStreak !== 1 ? 's' : ''}`}
                subtitle={
                  currentStreak >= bestStreak && currentStreak > 0
                    ? 'Personal best! Keep going!'
                    : `Best streak: ${bestStreak} day${bestStreak !== 1 ? 's' : ''}`
                }
                delay={850}
              />

              <InsightCard
                icon={TrendingUp}
                iconColor="#A78BFA"
                title="Longest Fast"
                value={`${longestFast}h`}
                subtitle="Your personal record"
                delay={900}
              />
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
    color: Colors.textPrimary,
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

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  statCardWrapper: {
    width: '48%',
    marginBottom: Spacing.sm,
  },
  statCard: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  statIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  statValue: {
    fontSize: FontSize.xxl || 28,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
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
    color: Colors.textPrimary,
    letterSpacing: 0.2,
  },

  // Chart Card
  chartCard: {
    marginBottom: Spacing.lg,
    paddingVertical: Spacing.md,
    overflow: 'hidden',
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
    color: Colors.textTertiary || 'rgba(255,255,255,0.35)',
    fontWeight: FontWeight.medium,
  },

  // Zones Card
  zonesCard: {
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  zoneRow: {
    marginBottom: 2,
  },
  zoneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  zoneNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  zoneDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  zoneName: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  zoneRangeBadge: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  zoneRangeText: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  zonePercentage: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  zoneBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
    marginBottom: 4,
  },
  zoneBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  zoneBenefit: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontWeight: FontWeight.regular || '400',
    fontStyle: 'italic',
  },

  // Insight Card
  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  insightLeft: {
    marginRight: Spacing.sm,
  },
  insightIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  insightValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    marginBottom: 2,
  },
  insightSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontWeight: FontWeight.regular || '400',
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
    color: Colors.textPrimary,
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

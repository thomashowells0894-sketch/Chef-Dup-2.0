/**
 * Biometric Dashboard - Whoop-Inspired Health Metrics Visualization
 *
 * Features:
 * - Real-time heart rate display with zone indicator and pulsing animation
 * - HRV trend chart (7-day)
 * - Sleep quality breakdown with stage percentages
 * - Recovery score with Whoop-style 0-100 gauge
 * - VO2 Max trend
 * - Step count with hourly activity chart
 * - Calories burned (active + resting) comparison
 * - Blood oxygen trend
 * - Weekly activity rings (Move, Exercise, Stand)
 * - Health sync status indicator
 * - "Simulated" badge when not using real HealthKit data
 * - Pull-to-refresh with haptic feedback
 * - Staggered entrance animations via ReAnimated
 */

import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import ReAnimated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import {
  Heart,
  Activity,
  Footprints,
  Flame,
  ArrowLeft,
  Zap,
  AlertTriangle,
  Moon,
  Wind,
  Droplets,
  Thermometer,
  TrendingUp,
  BarChart3,
  Eye,
  RefreshCw,
  Info,
} from 'lucide-react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import GlassCard from '../components/ui/GlassCard';
import AnimatedProgressRing from '../components/AnimatedProgressRing';
import MetricCard from '../components/MetricCard';
import HealthSyncStatus from '../components/HealthSyncStatus';
import { useHealthSync } from '../hooks/useHealthSync';
import { useBiometricDashboard } from '../hooks/useBiometricDashboard';
import { useHealthKit } from '../hooks/useHealthKit';
import {
  Colors,
  Spacing,
  FontSize,
  FontWeight,
  BorderRadius,
  Shadows,
  Gradients,
} from '../constants/theme';
import { hapticLight, hapticSuccess, hapticWarning } from '../lib/haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const METRIC_CARD_WIDTH = (SCREEN_WIDTH - Spacing.md * 2 - Spacing.sm) / 2;
const CHART_BAR_WIDTH = Math.floor((SCREEN_WIDTH - Spacing.md * 2 - Spacing.lg * 2 - 6 * 4) / 7);
const HOURLY_BAR_WIDTH = Math.floor((SCREEN_WIDTH - Spacing.md * 2 - Spacing.lg * 2) / 24) - 1;

// ============================================================
// Simulated Data Badge
// ============================================================
function SimulatedBadge() {
  return (
    <View style={styles.simulatedBadge}>
      <Info size={10} color={Colors.warning} />
      <Text style={styles.simulatedBadgeText}>Simulated Data</Text>
    </View>
  );
}

// ============================================================
// Pulsing Heart Icon Component
// ============================================================
function PulsingHeart({ size = 28, color = Colors.error }) {
  const scale = useSharedValue(1);

  React.useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.25, { duration: 400, easing: Easing.out(Easing.ease) }),
        withTiming(1, { duration: 400, easing: Easing.in(Easing.ease) }),
        withTiming(1.15, { duration: 300, easing: Easing.out(Easing.ease) }),
        withTiming(1, { duration: 500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, [scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <ReAnimated.View style={animatedStyle}>
      <Heart size={size} color={color} fill={color} />
    </ReAnimated.View>
  );
}

// ============================================================
// Recovery Score Gauge (Whoop-style 0-100)
// ============================================================
function RecoveryGauge({ score, label, color, components, isSimulated }) {
  const progress = Math.min(100, Math.max(0, score));
  const displayScore = score ?? '--';

  return (
    <ReAnimated.View entering={FadeInDown.springify().damping(12).delay(100)}>
      <GlassCard variant="elevated" glow>
        <View style={styles.recoveryHeader}>
          <View style={styles.recoveryTitleRow}>
            <Zap size={20} color={color || Colors.primary} />
            <Text style={styles.recoveryTitle}>Recovery</Text>
          </View>
          {isSimulated && <SimulatedBadge />}
        </View>

        <View style={styles.recoveryContent}>
          <AnimatedProgressRing
            progress={progress}
            size={160}
            strokeWidth={14}
            color={color || Colors.primary}
            gradientEnd={color === '#00E676' ? '#64D2FF' : color === '#FFB300' ? '#FF6B35' : '#FF1744'}
            value={displayScore}
            unit="/100"
            label="Recovery"
          />

          <View style={styles.recoveryDetails}>
            {/* Recovery label */}
            <View style={[styles.recoveryLabelBadge, { backgroundColor: (color || Colors.primary) + '20' }]}>
              <Text style={[styles.recoveryLabelText, { color: color || Colors.primary }]}>
                {score >= 67 ? 'OPTIMAL' : score >= 34 ? 'ADEQUATE' : 'IMPAIRED'}
              </Text>
            </View>

            {/* Component breakdown */}
            <View style={styles.recoveryComponents}>
              {components?.hrvScore !== null && (
                <View style={styles.recoveryComponent}>
                  <Text style={styles.recoveryComponentLabel}>HRV</Text>
                  <View style={styles.recoveryComponentBar}>
                    <View style={[styles.recoveryComponentFill, {
                      width: `${components.hrvScore}%`,
                      backgroundColor: components.hrvScore > 60 ? Colors.success : Colors.warning,
                    }]} />
                  </View>
                  <Text style={styles.recoveryComponentValue}>{components.hrvScore}</Text>
                </View>
              )}
              {components?.sleepScore !== null && (
                <View style={styles.recoveryComponent}>
                  <Text style={styles.recoveryComponentLabel}>Sleep</Text>
                  <View style={styles.recoveryComponentBar}>
                    <View style={[styles.recoveryComponentFill, {
                      width: `${components.sleepScore}%`,
                      backgroundColor: components.sleepScore > 60 ? Colors.success : Colors.warning,
                    }]} />
                  </View>
                  <Text style={styles.recoveryComponentValue}>{components.sleepScore}</Text>
                </View>
              )}
              {components?.rhrScore !== null && (
                <View style={styles.recoveryComponent}>
                  <Text style={styles.recoveryComponentLabel}>RHR</Text>
                  <View style={styles.recoveryComponentBar}>
                    <View style={[styles.recoveryComponentFill, {
                      width: `${components.rhrScore}%`,
                      backgroundColor: components.rhrScore > 60 ? Colors.success : Colors.warning,
                    }]} />
                  </View>
                  <Text style={styles.recoveryComponentValue}>{components.rhrScore}</Text>
                </View>
              )}
            </View>

            <Text style={styles.recoveryRecommendation}>
              {score >= 67
                ? 'You are well-recovered. Push yourself in training today.'
                : score >= 34
                ? 'Moderate recovery. Avoid peak intensity.'
                : 'Prioritize rest and recovery today.'}
            </Text>
          </View>
        </View>
      </GlassCard>
    </ReAnimated.View>
  );
}

// ============================================================
// Heart Rate Zone Card (Hero Section)
// ============================================================
function HeartRateZoneCard({ heartRate, currentZone, hrZones, isSimulated }) {
  const displayHR = heartRate ?? '--';
  const zoneName = currentZone?.name ?? 'No Data';
  const zoneColor = currentZone?.color ?? Colors.textTertiary;

  return (
    <ReAnimated.View entering={FadeInDown.springify().damping(12).delay(200)}>
      <GlassCard>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Heart size={18} color={Colors.error} />
            <Text style={styles.cardTitle}>Heart Rate</Text>
          </View>
          {isSimulated && <SimulatedBadge />}
        </View>

        <View style={styles.hrHeroRow}>
          <PulsingHeart size={32} color={Colors.error} />
          <View style={styles.hrValueContainer}>
            <Text style={styles.hrValue}>{displayHR}</Text>
            <Text style={styles.hrUnit}>BPM</Text>
          </View>
        </View>

        {/* Current Zone Badge */}
        <View style={[styles.zoneBadge, { backgroundColor: zoneColor + '20' }]}>
          <View style={[styles.zoneDot, { backgroundColor: zoneColor }]} />
          <Text style={[styles.zoneBadgeText, { color: zoneColor }]}>
            {zoneName} Zone
          </Text>
        </View>

        {/* Zone Color Bar */}
        <View style={styles.zoneColorBar}>
          {(hrZones || []).map((zone) => (
            <View
              key={zone.zone}
              style={[
                styles.zoneColorSegment,
                {
                  backgroundColor: zone.color,
                  opacity: currentZone?.zone === zone.zone ? 1 : 0.25,
                  flex: 1,
                },
              ]}
            />
          ))}
        </View>

        {/* Zone Breakdown */}
        <View style={styles.zoneBreakdown}>
          {(hrZones || []).map((zone) => {
            const isActive = currentZone?.zone === zone.zone;
            return (
              <View key={zone.zone} style={styles.zoneItem}>
                <View style={styles.zoneItemHeader}>
                  <View style={[styles.zoneItemDot, { backgroundColor: zone.color }]} />
                  <Text style={[
                    styles.zoneItemLabel,
                    isActive && { color: zone.color, fontWeight: FontWeight.bold },
                  ]}>
                    Z{zone.zone}
                  </Text>
                </View>
                <View style={styles.zoneProgressTrack}>
                  <View style={[
                    styles.zoneProgressFill,
                    {
                      backgroundColor: zone.color,
                      width: isActive ? '100%' : '20%',
                      opacity: isActive ? 1 : 0.3,
                    },
                  ]} />
                </View>
                <Text style={styles.zoneRange}>{zone.minBPM}-{zone.maxBPM}</Text>
              </View>
            );
          })}
        </View>
      </GlassCard>
    </ReAnimated.View>
  );
}

// ============================================================
// Mini Trend Chart (7-day bar chart)
// ============================================================
function TrendChart({ data, color, label, unit, icon: Icon, delay = 300, isSimulated }) {
  const maxVal = useMemo(() => {
    if (!data || data.length === 0) return 1;
    return Math.max(...data.map((d) => d.value), 1);
  }, [data]);

  const latestValue = data && data.length > 0 ? data[data.length - 1].value : null;

  if (!data || data.length === 0) return null;

  return (
    <ReAnimated.View entering={FadeInDown.springify().damping(12).delay(delay)}>
      <GlassCard>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            {Icon && <Icon size={16} color={color} />}
            <Text style={styles.cardTitle}>{label}</Text>
          </View>
          <View style={styles.cardHeaderRight}>
            {isSimulated && <SimulatedBadge />}
            {latestValue !== null && (
              <Text style={[styles.trendCurrentValue, { color }]}>
                {typeof latestValue === 'number' ? (Number.isInteger(latestValue) ? latestValue : latestValue.toFixed(1)) : latestValue}
                {unit ? <Text style={styles.trendUnit}> {unit}</Text> : null}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.trendChart}>
          {data.map((entry, idx) => {
            const height = Math.max(4, (entry.value / maxVal) * 60);
            const isLatest = idx === data.length - 1;
            const dayLabel = new Date(entry.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'narrow' });

            return (
              <View key={entry.date} style={styles.trendBarWrapper}>
                <View style={[styles.trendBarTrack, { height: 60 }]}>
                  <View style={[
                    styles.trendBar,
                    {
                      height,
                      backgroundColor: isLatest ? color : color + '60',
                      borderRadius: 3,
                    },
                  ]} />
                </View>
                <Text style={[styles.trendDayLabel, isLatest && { color, fontWeight: FontWeight.bold }]}>
                  {dayLabel}
                </Text>
              </View>
            );
          })}
        </View>
      </GlassCard>
    </ReAnimated.View>
  );
}

// ============================================================
// Sleep Quality Breakdown
// ============================================================
function SleepCard({ snapshot, isSimulated, delay = 400 }) {
  if (!snapshot || snapshot.sleepMinutes <= 0) return null;

  const totalHours = Math.round(snapshot.sleepMinutes / 60 * 10) / 10;
  const totalMin = snapshot.sleepMinutes;
  const deep = snapshot.deepSleepMinutes;
  const rem = snapshot.remSleepMinutes;
  const light = snapshot.lightSleepMinutes;
  const hasStages = deep > 0 || rem > 0;

  const deepPct = hasStages && totalMin > 0 ? Math.round((deep / totalMin) * 100) : 0;
  const remPct = hasStages && totalMin > 0 ? Math.round((rem / totalMin) * 100) : 0;
  const lightPct = hasStages && totalMin > 0 ? Math.round((light / totalMin) * 100) : 0;

  const stages = [
    { label: 'Deep', minutes: deep, pct: deepPct, color: '#5C6BC0' },
    { label: 'REM', minutes: rem, pct: remPct, color: '#26C6DA' },
    { label: 'Light', minutes: light, pct: lightPct, color: '#78909C' },
  ];

  return (
    <ReAnimated.View entering={FadeInDown.springify().damping(12).delay(delay)}>
      <GlassCard>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Moon size={16} color="#7C4DFF" />
            <Text style={styles.cardTitle}>Sleep Quality</Text>
          </View>
          {isSimulated && <SimulatedBadge />}
        </View>

        <View style={styles.sleepHeroRow}>
          <Text style={styles.sleepHeroValue}>{totalHours}</Text>
          <Text style={styles.sleepHeroUnit}>hours</Text>
        </View>

        {hasStages && (
          <>
            {/* Stage bar */}
            <View style={styles.sleepStageBar}>
              {stages.map((stage) => (
                stage.pct > 0 && (
                  <View
                    key={stage.label}
                    style={[styles.sleepStageSegment, {
                      flex: stage.pct,
                      backgroundColor: stage.color,
                    }]}
                  />
                )
              ))}
            </View>

            {/* Stage breakdown */}
            <View style={styles.sleepStageList}>
              {stages.map((stage) => (
                <View key={stage.label} style={styles.sleepStageItem}>
                  <View style={[styles.sleepStageDot, { backgroundColor: stage.color }]} />
                  <Text style={styles.sleepStageLabel}>{stage.label}</Text>
                  <Text style={styles.sleepStageValue}>
                    {Math.round(stage.minutes / 60 * 10) / 10}h
                  </Text>
                  <Text style={styles.sleepStagePct}>{stage.pct}%</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </GlassCard>
    </ReAnimated.View>
  );
}

// ============================================================
// Hourly Steps Activity Chart
// ============================================================
function HourlyStepsCard({ hourlySteps, totalSteps, isSimulated, delay = 500 }) {
  if (!hourlySteps || hourlySteps.length === 0) return null;

  const maxSteps = useMemo(() => {
    return Math.max(...hourlySteps.map((h) => h.steps), 1);
  }, [hourlySteps]);

  const stepsGoal = 10000;
  const pct = Math.min(100, Math.round((totalSteps / stepsGoal) * 100));

  return (
    <ReAnimated.View entering={FadeInDown.springify().damping(12).delay(delay)}>
      <GlassCard>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Footprints size={16} color="#00E676" />
            <Text style={styles.cardTitle}>Steps</Text>
          </View>
          <View style={styles.cardHeaderRight}>
            {isSimulated && <SimulatedBadge />}
            <Text style={styles.stepsValue}>{(totalSteps || 0).toLocaleString()}</Text>
          </View>
        </View>

        {/* Progress bar */}
        <View style={styles.stepsProgressTrack}>
          <View style={[styles.stepsProgressFill, { width: `${pct}%` }]} />
        </View>
        <Text style={styles.stepsGoalText}>{pct}% of {stepsGoal.toLocaleString()} goal</Text>

        {/* Hourly chart */}
        <View style={styles.hourlyChart}>
          {hourlySteps.map((entry) => {
            const height = Math.max(2, (entry.steps / maxSteps) * 40);
            return (
              <View key={entry.hour} style={styles.hourlyBarWrapper}>
                <View style={[styles.hourlyBar, {
                  height,
                  backgroundColor: entry.steps > 500 ? '#00E676' : '#00E676' + '40',
                }]} />
              </View>
            );
          })}
        </View>
        <View style={styles.hourlyLabels}>
          <Text style={styles.hourlyLabel}>12am</Text>
          <Text style={styles.hourlyLabel}>6am</Text>
          <Text style={styles.hourlyLabel}>12pm</Text>
          <Text style={styles.hourlyLabel}>6pm</Text>
        </View>
      </GlassCard>
    </ReAnimated.View>
  );
}

// ============================================================
// Activity Rings Card (Apple Watch-style)
// ============================================================
function ActivityRingsCard({ rings, isSimulated, delay = 600 }) {
  if (!rings) return null;

  const ringData = [
    { ...rings.move, label: 'Move', unit: 'kcal', color: '#FF2D55', bg: '#FF2D55' + '30' },
    { ...rings.exercise, label: 'Exercise', unit: 'min', color: '#00E676', bg: '#00E676' + '30' },
    { ...rings.stand, label: 'Stand', unit: 'hrs', color: '#00D4FF', bg: '#00D4FF' + '30' },
  ];

  return (
    <ReAnimated.View entering={FadeInDown.springify().damping(12).delay(delay)}>
      <GlassCard>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Activity size={16} color={Colors.primary} />
            <Text style={styles.cardTitle}>Activity Rings</Text>
          </View>
          {isSimulated && <SimulatedBadge />}
        </View>

        <View style={styles.ringsContainer}>
          {/* Concentric rings SVG */}
          <View style={styles.ringsVisual}>
            <Svg width={130} height={130}>
              {ringData.map((ring, idx) => {
                const radius = 55 - idx * 18;
                const circumference = 2 * Math.PI * radius;
                const progress = Math.min(1, ring.percent / 100);
                const offset = circumference * (1 - progress);

                return (
                  <React.Fragment key={ring.label}>
                    <Circle
                      cx={65}
                      cy={65}
                      r={radius}
                      stroke={ring.bg}
                      strokeWidth={12}
                      fill="none"
                    />
                    <Circle
                      cx={65}
                      cy={65}
                      r={radius}
                      stroke={ring.color}
                      strokeWidth={12}
                      strokeLinecap="round"
                      fill="none"
                      strokeDasharray={circumference}
                      strokeDashoffset={offset}
                      rotation="-90"
                      origin="65, 65"
                    />
                  </React.Fragment>
                );
              })}
            </Svg>
          </View>

          {/* Ring labels */}
          <View style={styles.ringsLabels}>
            {ringData.map((ring) => (
              <View key={ring.label} style={styles.ringLabelRow}>
                <View style={[styles.ringLabelDot, { backgroundColor: ring.color }]} />
                <Text style={styles.ringLabelName}>{ring.label}</Text>
                <Text style={[styles.ringLabelValue, { color: ring.color }]}>
                  {ring.current}
                  <Text style={styles.ringLabelUnit}>/{ring.goal}{ring.unit}</Text>
                </Text>
              </View>
            ))}
          </View>
        </View>
      </GlassCard>
    </ReAnimated.View>
  );
}

// ============================================================
// Calories Comparison Card
// ============================================================
function CaloriesCard({ activeCal, restingCal, isSimulated, delay = 650 }) {
  const total = (activeCal || 0) + (restingCal || 0);

  return (
    <ReAnimated.View entering={FadeInDown.springify().damping(12).delay(delay)}>
      <GlassCard>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Flame size={16} color={Colors.secondary} />
            <Text style={styles.cardTitle}>Calories Burned</Text>
          </View>
          {isSimulated && <SimulatedBadge />}
        </View>

        <Text style={styles.calTotalValue}>{total.toLocaleString()} <Text style={styles.calTotalUnit}>kcal</Text></Text>

        <View style={styles.calCompare}>
          <View style={styles.calCompareItem}>
            <View style={[styles.calCompareDot, { backgroundColor: Colors.secondary }]} />
            <Text style={styles.calCompareLabel}>Active</Text>
            <Text style={styles.calCompareValue}>{(activeCal || 0).toLocaleString()}</Text>
          </View>
          <View style={styles.calCompareDivider} />
          <View style={styles.calCompareItem}>
            <View style={[styles.calCompareDot, { backgroundColor: Colors.textTertiary }]} />
            <Text style={styles.calCompareLabel}>Resting</Text>
            <Text style={styles.calCompareValue}>{(restingCal || 0).toLocaleString()}</Text>
          </View>
        </View>

        {/* Stacked bar */}
        <View style={styles.calBar}>
          <View style={[styles.calBarActive, { flex: activeCal || 1 }]} />
          <View style={[styles.calBarResting, { flex: restingCal || 1 }]} />
        </View>
      </GlassCard>
    </ReAnimated.View>
  );
}

// ============================================================
// Vitals Grid (compact metrics)
// ============================================================
function VitalsGrid({ snapshot, isSimulated, delay = 700 }) {
  if (!snapshot) return null;

  const vitals = [
    {
      label: 'Resting HR',
      value: snapshot.restingHR != null ? `${snapshot.restingHR}` : '--',
      unit: 'bpm',
      icon: Heart,
      color: Colors.error,
    },
    {
      label: 'Respiratory',
      value: snapshot.respiratoryRate != null ? `${snapshot.respiratoryRate}` : '--',
      unit: 'br/min',
      icon: Wind,
      color: '#00BCD4',
    },
    {
      label: 'Body Temp',
      value: snapshot.bodyTemperature != null ? `${snapshot.bodyTemperature}` : '--',
      unit: '\u00B0C',
      icon: Thermometer,
      color: '#FF9800',
    },
    {
      label: 'Flights',
      value: snapshot.flightsClimbed != null ? `${snapshot.flightsClimbed}` : '--',
      unit: 'floors',
      icon: TrendingUp,
      color: Colors.primary,
    },
  ];

  return (
    <ReAnimated.View entering={FadeInDown.springify().damping(12).delay(delay)}>
      <View style={styles.vitalsGrid}>
        {vitals.map((vital) => (
          <View key={vital.label} style={styles.vitalsCard}>
            <GlassCard style={styles.vitalsCardInner}>
              <vital.icon size={16} color={vital.color} />
              <Text style={styles.vitalsValue}>{vital.value}<Text style={styles.vitalsUnit}> {vital.unit}</Text></Text>
              <Text style={styles.vitalsLabel}>{vital.label}</Text>
            </GlassCard>
          </View>
        ))}
      </View>
      {isSimulated && (
        <View style={styles.vitalsSimBadge}>
          <SimulatedBadge />
        </View>
      )}
    </ReAnimated.View>
  );
}

// ============================================================
// Anomaly Alerts
// ============================================================
function AnomalyAlerts({ anomalies, delay = 800 }) {
  if (!anomalies || anomalies.length === 0) return null;

  const typeColor = {
    critical: Colors.error,
    warning: Colors.warning,
    info: Colors.primary,
  };

  return (
    <>
      <ReAnimated.View entering={FadeInDown.springify().damping(12).delay(delay)}>
        <Text style={styles.sectionTitle}>Health Alerts</Text>
      </ReAnimated.View>
      {anomalies.map((anomaly, index) => {
        const alertColor = typeColor[anomaly.type] || Colors.primary;
        return (
          <ReAnimated.View
            key={`${anomaly.metric}-${index}`}
            entering={FadeInDown.springify().damping(12).delay(delay + 50 + index * 60)}
          >
            <GlassCard
              variant={anomaly.type === 'critical' ? 'warning' : 'default'}
              style={styles.alertCard}
            >
              <View style={styles.alertRow}>
                <View style={[styles.alertIconWrap, { backgroundColor: alertColor + '20' }]}>
                  <AlertTriangle size={18} color={alertColor} />
                </View>
                <View style={styles.alertContent}>
                  <Text style={styles.alertTitle}>{anomaly.title}</Text>
                  <Text style={styles.alertBody}>{anomaly.message}</Text>
                </View>
              </View>
            </GlassCard>
          </ReAnimated.View>
        );
      })}
    </>
  );
}

// ============================================================
// Not Connected State
// ============================================================
function NotConnectedState({ onConnect }) {
  return (
    <ReAnimated.View
      entering={FadeInDown.springify().damping(12).delay(100)}
      style={styles.notConnectedContainer}
    >
      <LinearGradient colors={Gradients.card} style={styles.notConnectedCard}>
        <View style={styles.notConnectedIconWrap}>
          <Heart size={48} color={Colors.primary} />
        </View>
        <Text style={styles.notConnectedTitle}>Connect Your Health Data</Text>
        <Text style={styles.notConnectedDescription}>
          Link Apple Health or Google Fit to unlock real-time heart rate monitoring,
          VO2 Max tracking, sleep analysis, recovery scoring, and more.
        </Text>
        <View style={styles.benefitsList}>
          {[
            { icon: Heart, text: 'Real-time heart rate zones' },
            { icon: Activity, text: 'VO2 Max & recovery scoring' },
            { icon: Moon, text: 'Sleep stage analysis' },
            { icon: Zap, text: 'Smart training recommendations' },
            { icon: Droplets, text: 'Blood oxygen monitoring' },
          ].map(({ icon: Icon, text }) => (
            <View key={text} style={styles.benefitRow}>
              <View style={styles.benefitIconWrap}>
                <Icon size={16} color={Colors.primary} />
              </View>
              <Text style={styles.benefitText}>{text}</Text>
            </View>
          ))}
        </View>
        <Pressable
          style={styles.connectButton}
          onPress={async () => {
            await hapticSuccess();
            onConnect();
          }}
        >
          <LinearGradient
            colors={Gradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.connectButtonGradient}
          >
            <Heart size={20} color={Colors.background} />
            <Text style={styles.connectButtonText}>Connect Health</Text>
          </LinearGradient>
        </Pressable>
      </LinearGradient>
    </ReAnimated.View>
  );
}

// ============================================================
// Main Screen
// ============================================================
export default function BiometricDashboardScreen() {
  const router = useRouter();
  const {
    summary,
    hrZones,
    currentZone,
    vo2max,
    alerts,
    heartRate,
    isConnected: biometricConnected,
    hrv,
    hrvBaseline,
    rhrBaseline,
    hrSamples,
    respiratoryRate,
  } = useBiometricDashboard();

  const {
    isConnected,
    isLoading: healthLoading,
    steps,
    activeCalories,
    weight,
    lastSynced,
    connect,
  } = useHealthKit();

  const {
    snapshot,
    isLoading: syncLoading,
    isSyncing,
    recoveryScore: syncRecoveryScore,
    activityRings,
    hrvTrend,
    vo2MaxTrend,
    spo2Trend,
    anomalies,
    isSimulated,
    syncNow,
    forceRefresh,
  } = useHealthSync();

  const [refreshing, setRefreshing] = React.useState(false);

  const isLoading = healthLoading && syncLoading;

  // Format last synced timestamp
  const lastUpdatedText = useMemo(() => {
    const syncTime = lastSynced || summary?.lastSynced;
    if (!syncTime) return null;
    const date = new Date(syncTime);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }, [lastSynced, summary?.lastSynced]);

  // Pull-to-refresh handler
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await hapticLight();
    try {
      await forceRefresh();
    } catch {
      // Ignore
    }
    setRefreshing(false);
  }, [forceRefresh]);

  const handleBack = useCallback(async () => {
    await hapticLight();
    router.back();
  }, [router]);

  // Loading state
  if (isLoading) {
    return (
      <ScreenWrapper>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading biometric data...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      {/* Header */}
      <ReAnimated.View
        entering={FadeInDown.springify().damping(12).delay(0)}
        style={styles.header}
      >
        <Pressable style={styles.backButton} onPress={handleBack}>
          <ArrowLeft size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Biometrics</Text>
        <View style={styles.headerRight}>
          {lastUpdatedText && (
            <Pressable style={styles.lastUpdatedBadge} onPress={syncNow}>
              {isSyncing ? (
                <ActivityIndicator size={12} color={Colors.primary} />
              ) : (
                <RefreshCw size={12} color={Colors.primary} />
              )}
              <Text style={styles.lastUpdatedText}>{lastUpdatedText}</Text>
            </Pressable>
          )}
          {!lastUpdatedText && <View style={styles.headerPlaceholder} />}
        </View>
      </ReAnimated.View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
            progressBackgroundColor={Colors.surface}
          />
        }
      >
        {/* Not Connected State */}
        {!isConnected && <NotConnectedState onConnect={connect} />}

        {/* Connected: Full Dashboard */}
        {isConnected && (
          <>
            {/* Health Sync Status */}
            <ReAnimated.View entering={FadeInDown.springify().damping(12).delay(50)}>
              <HealthSyncStatus
                onSync={syncNow}
                onConfigure={connect}
                style={styles.syncStatus}
              />
            </ReAnimated.View>

            <View style={styles.sectionSpacer} />

            {/* Recovery Score Gauge */}
            {syncRecoveryScore && (
              <>
                <RecoveryGauge
                  score={syncRecoveryScore.score}
                  label={syncRecoveryScore.label}
                  color={syncRecoveryScore.color}
                  components={syncRecoveryScore.components}
                  isSimulated={isSimulated}
                />
                <View style={styles.sectionSpacer} />
              </>
            )}

            {/* Heart Rate Zone Card */}
            <HeartRateZoneCard
              heartRate={heartRate}
              currentZone={currentZone}
              hrZones={hrZones}
              isSimulated={isSimulated}
            />
            <View style={styles.sectionSpacer} />

            {/* Sleep Quality */}
            {snapshot && (
              <>
                <SleepCard snapshot={snapshot} isSimulated={isSimulated} />
                <View style={styles.sectionSpacer} />
              </>
            )}

            {/* HRV Trend (7-day) */}
            <TrendChart
              data={hrvTrend}
              color="#7C4DFF"
              label="HRV Trend"
              unit="ms"
              icon={BarChart3}
              delay={450}
              isSimulated={isSimulated}
            />
            <View style={styles.sectionSpacer} />

            {/* Hourly Steps */}
            <HourlyStepsCard
              hourlySteps={snapshot?.hourlySteps}
              totalSteps={steps || snapshot?.steps || 0}
              isSimulated={isSimulated}
            />
            <View style={styles.sectionSpacer} />

            {/* Activity Rings */}
            <ActivityRingsCard rings={activityRings} isSimulated={isSimulated} />
            <View style={styles.sectionSpacer} />

            {/* Calories Comparison */}
            <CaloriesCard
              activeCal={activeCalories || snapshot?.activeCalories || 0}
              restingCal={snapshot?.restingCalories || 0}
              isSimulated={isSimulated}
            />
            <View style={styles.sectionSpacer} />

            {/* VO2 Max Trend */}
            <TrendChart
              data={vo2MaxTrend}
              color={Colors.primary}
              label="VO2 Max Trend"
              unit="ml/kg/min"
              icon={Activity}
              delay={700}
              isSimulated={isSimulated}
            />
            <View style={styles.sectionSpacer} />

            {/* Blood Oxygen Trend */}
            <TrendChart
              data={spo2Trend}
              color="#E91E63"
              label="Blood Oxygen (SpO2)"
              unit="%"
              icon={Droplets}
              delay={750}
              isSimulated={isSimulated}
            />
            <View style={styles.sectionSpacer} />

            {/* Vitals Grid */}
            <ReAnimated.View entering={FadeInDown.springify().damping(12).delay(780)}>
              <Text style={styles.sectionTitle}>Vitals</Text>
            </ReAnimated.View>
            <VitalsGrid snapshot={snapshot} isSimulated={isSimulated} delay={800} />
            <View style={styles.sectionSpacer} />

            {/* Anomaly Alerts */}
            <AnomalyAlerts anomalies={anomalies} delay={850} />

            {/* No Alerts Positive State */}
            {(!anomalies || anomalies.length === 0) && (
              <ReAnimated.View entering={FadeInDown.springify().damping(12).delay(850)}>
                <GlassCard variant="success" style={styles.noAlertsCard}>
                  <View style={styles.noAlertsRow}>
                    <View style={styles.noAlertsIconWrap}>
                      <Heart size={20} color={Colors.success} />
                    </View>
                    <View style={styles.noAlertsContent}>
                      <Text style={styles.noAlertsTitle}>All Clear</Text>
                      <Text style={styles.noAlertsBody}>
                        No biometric anomalies detected. Your health metrics look great.
                      </Text>
                    </View>
                  </View>
                </GlassCard>
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

  // Simulated badge
  simulatedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: Colors.warningSoft,
    borderRadius: BorderRadius.full,
  },
  simulatedBadgeText: {
    fontSize: 9,
    fontWeight: FontWeight.semibold,
    color: Colors.warning,
    letterSpacing: 0.3,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
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
  headerRight: {
    minWidth: 44,
    alignItems: 'flex-end',
  },
  headerPlaceholder: {
    width: 44,
    height: 44,
  },
  lastUpdatedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primarySoft,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  lastUpdatedText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Colors.primary,
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },

  // Sync status
  syncStatus: {
    marginBottom: 0,
  },

  // Section
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    marginTop: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionSpacer: {
    height: Spacing.sm,
  },

  // Card shared
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  cardTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  cardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },

  // ========================================
  // Recovery Gauge
  // ========================================
  recoveryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  recoveryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  recoveryTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  recoveryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  recoveryDetails: {
    flex: 1,
    gap: Spacing.sm,
  },
  recoveryLabelBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
  },
  recoveryLabelText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    letterSpacing: 1,
  },
  recoveryComponents: {
    gap: 6,
  },
  recoveryComponent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  recoveryComponentLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    width: 36,
  },
  recoveryComponentBar: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  recoveryComponentFill: {
    height: '100%',
    borderRadius: 2,
  },
  recoveryComponentValue: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    width: 24,
    textAlign: 'right',
  },
  recoveryRecommendation: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    lineHeight: 16,
    marginTop: 2,
  },

  // ========================================
  // Heart Rate Zone Card
  // ========================================
  hrHeroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  hrValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.xs,
  },
  hrValue: {
    fontSize: 52,
    fontWeight: FontWeight.black,
    color: Colors.text,
    letterSpacing: -2,
  },
  hrUnit: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
  },
  zoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.md,
  },
  zoneDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  zoneBadgeText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  zoneColorBar: {
    flexDirection: 'row',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    gap: 2,
    marginBottom: Spacing.lg,
  },
  zoneColorSegment: {
    borderRadius: 3,
  },
  zoneBreakdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.xs,
  },
  zoneItem: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  zoneItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  zoneItemDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  zoneItemLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  zoneProgressTrack: {
    width: '100%',
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  zoneProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  zoneRange: {
    fontSize: 8,
    color: Colors.textTertiary,
    fontWeight: FontWeight.medium,
  },

  // ========================================
  // Trend Chart
  // ========================================
  trendCurrentValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  trendUnit: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.regular,
  },
  trendChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 4,
    paddingTop: Spacing.sm,
  },
  trendBarWrapper: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  trendBarTrack: {
    justifyContent: 'flex-end',
    width: '100%',
  },
  trendBar: {
    width: '100%',
    minHeight: 4,
  },
  trendDayLabel: {
    fontSize: 9,
    color: Colors.textTertiary,
  },

  // ========================================
  // Sleep Card
  // ========================================
  sleepHeroRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  sleepHeroValue: {
    fontSize: 44,
    fontWeight: FontWeight.black,
    color: Colors.text,
    letterSpacing: -1,
  },
  sleepHeroUnit: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
  },
  sleepStageBar: {
    flexDirection: 'row',
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    gap: 2,
    marginBottom: Spacing.md,
  },
  sleepStageSegment: {
    borderRadius: 5,
    minWidth: 4,
  },
  sleepStageList: {
    gap: Spacing.sm,
  },
  sleepStageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  sleepStageDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sleepStageLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    flex: 1,
  },
  sleepStageValue: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    minWidth: 36,
    textAlign: 'right',
  },
  sleepStagePct: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    minWidth: 30,
    textAlign: 'right',
  },

  // ========================================
  // Hourly Steps
  // ========================================
  stepsValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: '#00E676',
  },
  stepsProgressTrack: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  stepsProgressFill: {
    height: '100%',
    backgroundColor: '#00E676',
    borderRadius: 3,
  },
  stepsGoalText: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginBottom: Spacing.md,
  },
  hourlyChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 44,
    gap: 1,
  },
  hourlyBarWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
    height: '100%',
  },
  hourlyBar: {
    width: '100%',
    borderRadius: 1,
    minHeight: 2,
  },
  hourlyLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  hourlyLabel: {
    fontSize: 8,
    color: Colors.textTertiary,
  },

  // ========================================
  // Activity Rings
  // ========================================
  ringsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  ringsVisual: {
    width: 130,
    height: 130,
  },
  ringsLabels: {
    flex: 1,
    gap: Spacing.md,
  },
  ringLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  ringLabelDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  ringLabelName: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    flex: 1,
  },
  ringLabelValue: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  ringLabelUnit: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.regular,
    color: Colors.textTertiary,
  },

  // ========================================
  // Calories
  // ========================================
  calTotalValue: {
    fontSize: 36,
    fontWeight: FontWeight.black,
    color: Colors.text,
    letterSpacing: -1,
    marginBottom: Spacing.md,
  },
  calTotalUnit: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
  },
  calCompare: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: Spacing.md,
  },
  calCompareItem: {
    alignItems: 'center',
    gap: 4,
  },
  calCompareDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  calCompareLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  calCompareValue: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  calCompareDivider: {
    width: 1,
    backgroundColor: Colors.border,
  },
  calBar: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    gap: 2,
  },
  calBarActive: {
    backgroundColor: Colors.secondary,
    borderRadius: 4,
  },
  calBarResting: {
    backgroundColor: Colors.textTertiary + '40',
    borderRadius: 4,
  },

  // ========================================
  // Vitals Grid
  // ========================================
  vitalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  vitalsCard: {
    width: METRIC_CARD_WIDTH,
  },
  vitalsCardInner: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: Spacing.md,
  },
  vitalsValue: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  vitalsUnit: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.regular,
    color: Colors.textSecondary,
  },
  vitalsLabel: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },
  vitalsSimBadge: {
    alignItems: 'center',
    marginTop: Spacing.xs,
  },

  // ========================================
  // Alerts
  // ========================================
  alertCard: {
    marginBottom: Spacing.sm,
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  alertIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertContent: {
    flex: 1,
    gap: 4,
  },
  alertTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  alertBody: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 18,
  },

  // No alerts
  noAlertsCard: {
    marginBottom: Spacing.sm,
  },
  noAlertsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  noAlertsIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.successSoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noAlertsContent: {
    flex: 1,
  },
  noAlertsTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.success,
  },
  noAlertsBody: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  // ========================================
  // Not Connected State
  // ========================================
  notConnectedContainer: {
    marginTop: Spacing.xxl,
  },
  notConnectedCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderAccent,
  },
  notConnectedIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    ...Shadows.glowPrimary,
  },
  notConnectedTitle: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  notConnectedDescription: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.sm,
  },
  benefitsList: {
    width: '100%',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  benefitIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  benefitText: {
    fontSize: FontSize.md,
    color: Colors.text,
    fontWeight: FontWeight.medium,
  },
  connectButton: {
    width: '100%',
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.button,
  },
  connectButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md + 2,
    borderRadius: BorderRadius.lg,
  },
  connectButtonText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.background,
    letterSpacing: 0.5,
  },

  // Bottom
  bottomSpacer: {
    height: 120,
  },
});

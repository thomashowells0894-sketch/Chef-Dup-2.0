/**
 * Recovery & Readiness Tracker Screen
 *
 * Features:
 * - Circular readiness gauge (0-100) with tier-based coloring
 * - Quick assessment form: energy, sleep quality, stress, muscle soreness map
 * - Muscle soreness grid with 6 muscle groups and 4-level toggle (0-3)
 * - Weekly trend bar chart of readiness scores
 * - Muscle recovery map with body-like layout and recovery estimates
 * - Expandable history cards for last 7 entries
 * - Haptic feedback on all interactions
 * - REST DAY badge when readiness is low
 * - Persistent data via AsyncStorage
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import ReAnimated, {
  FadeInDown,
  useSharedValue,
  useAnimatedProps,
  withSpring,
  withDelay,
  useAnimatedStyle,
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
  HeartPulse,
  Moon,
  Zap,
  Brain,
  Lightbulb,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Trash2,
  Shield,
  Activity,
  Dumbbell,
  AlertTriangle,
  Flame,
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
import useRecovery from '../hooks/useRecovery';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================================
// Constants for SVG Ring
// ============================================================
const RING_SIZE = 200;
const RING_STROKE = 14;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const AnimatedCircle = ReAnimated.createAnimatedComponent(Circle);

// Muscle group display config with body-part emojis
const MUSCLE_CONFIG = {
  chest: { label: 'Chest', emoji: '\uD83E\uDDB4', icon: Shield },
  back: { label: 'Back', emoji: '\uD83E\uDDB5', icon: Activity },
  shoulders: { label: 'Shoulders', emoji: '\uD83D\uDCAA', icon: Dumbbell },
  arms: { label: 'Arms', emoji: '\uD83D\uDCAA', icon: Zap },
  legs: { label: 'Legs', emoji: '\uD83E\uDDB5', icon: Activity },
  core: { label: 'Core', emoji: '\uD83E\uDDB4', icon: Shield },
};

// Soreness level colors
function getSorenessColor(level) {
  if (level === 0) return Colors.textTertiary;
  if (level === 1) return Colors.warning;
  if (level === 2) return '#FF9800';
  return Colors.error;
}

function getSorenessLabel(level) {
  if (level === 0) return 'None';
  if (level === 1) return 'Mild';
  if (level === 2) return 'Moderate';
  return 'Severe';
}

// Recovery time estimate based on soreness level
function getRecoveryEstimate(level) {
  if (level === 0) return 'Ready';
  if (level === 1) return '~12h';
  if (level === 2) return '~24h';
  return '~48h';
}

// ============================================================
// Readiness Ring Component
// ============================================================
function ReadinessRing({ score, label }) {
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
    const strokeDashoffset = RING_CIRCUMFERENCE * (1 - progress.value);
    return { strokeDashoffset };
  });

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleValue.value }],
  }));

  const tierColor = label.color;
  const tierEndColor =
    score >= 80
      ? '#00C853'
      : score >= 60
      ? '#FFA000'
      : score >= 40
      ? '#E65100'
      : '#E53935';

  return (
    <ReAnimated.View style={[styles.ringContainer, containerStyle]}>
      <Svg width={RING_SIZE} height={RING_SIZE}>
        <Defs>
          <SvgLinearGradient id="readinessRingGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={tierColor} stopOpacity="1" />
            <Stop offset="1" stopColor={tierEndColor} stopOpacity="1" />
          </SvgLinearGradient>
        </Defs>

        {/* Background ring */}
        <Circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_RADIUS}
          stroke="rgba(255, 255, 255, 0.06)"
          strokeWidth={RING_STROKE}
          fill="none"
        />

        {/* Progress ring */}
        <AnimatedCircle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_RADIUS}
          stroke="url(#readinessRingGrad)"
          strokeWidth={RING_STROKE}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={RING_CIRCUMFERENCE}
          animatedProps={animatedProps}
          transform={`rotate(-90, ${RING_SIZE / 2}, ${RING_SIZE / 2})`}
        />
      </Svg>

      {/* Center content */}
      <View style={styles.ringCenter}>
        <Text style={[styles.ringScoreValue, { color: tierColor }]}>
          {score}
        </Text>
        <Text style={styles.ringEmoji}>{label.emoji}</Text>
        <Text style={styles.ringSubtext}>out of 100</Text>
      </View>
    </ReAnimated.View>
  );
}

// ============================================================
// Icon Rating Component (energy/sleep/stress)
// ============================================================
function IconRating({ value, onChange, max = 5, icon: Icon, activeColor, label }) {
  return (
    <View style={styles.ratingContainer}>
      <Text style={styles.ratingLabel}>{label}</Text>
      <View style={styles.ratingRow}>
        {Array.from({ length: max }, (_, i) => i + 1).map((level) => (
          <Pressable
            key={level}
            onPress={async () => {
              await hapticLight();
              onChange(level);
            }}
            style={styles.ratingButton}
          >
            <Icon
              size={26}
              color={level <= value ? activeColor : Colors.textTertiary}
              fill={level <= value ? activeColor : 'transparent'}
            />
          </Pressable>
        ))}
      </View>
      <Text style={[styles.ratingValueText, { color: activeColor }]}>
        {value} / {max}
      </Text>
    </View>
  );
}

// ============================================================
// Muscle Soreness Grid Component (2x3, 4-level toggle 0-3)
// ============================================================
function MuscleGrid({ soreness, onUpdate }) {
  const handleCycle = useCallback(async (muscle) => {
    await hapticLight();
    const current = soreness[muscle] || 0;
    const next = current >= 3 ? 0 : current + 1;
    onUpdate({ ...soreness, [muscle]: next });
  }, [soreness, onUpdate]);

  return (
    <View style={styles.muscleGridContainer}>
      <Text style={styles.ratingLabel}>Muscle Soreness</Text>
      <View style={styles.muscleGrid}>
        {Object.entries(MUSCLE_CONFIG).map(([key, config]) => {
          const level = soreness[key] || 0;
          const color = getSorenessColor(level);

          return (
            <Pressable
              key={key}
              style={[
                styles.muscleCard,
                { borderColor: level > 0 ? color + '40' : 'rgba(255, 255, 255, 0.06)' },
              ]}
              onPress={() => handleCycle(key)}
            >
              <Text style={styles.muscleEmoji}>{config.emoji}</Text>
              <Text style={styles.muscleLabel}>{config.label}</Text>
              {/* 4-level toggle indicator */}
              <View style={styles.muscleLevelDots}>
                {[0, 1, 2, 3].map((l) => (
                  <View
                    key={l}
                    style={[
                      styles.muscleLevelDot,
                      {
                        backgroundColor: l <= level && level > 0
                          ? getSorenessColor(level)
                          : 'rgba(255, 255, 255, 0.1)',
                      },
                    ]}
                  />
                ))}
              </View>
              <Text style={[styles.muscleLevelLabel, { color: level > 0 ? color : Colors.textTertiary }]}>
                {getSorenessLabel(level)}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.muscleHint}>{'Tap to cycle: None > Mild > Moderate > Severe'}</Text>
    </View>
  );
}

// ============================================================
// Weekly Trend Chart Component
// ============================================================
function WeeklyTrendChart({ weeklyData, getReadinessLabel }) {
  const maxScore = 100;

  return (
    <View style={styles.weeklyChart}>
      <View style={styles.weeklyBars}>
        {weeklyData.map((entry, index) => {
          const height = Math.max((entry.score / maxScore) * 100, 4);
          const tierInfo = getReadinessLabel(entry.score);
          const isToday = index === weeklyData.length - 1;

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
// Muscle Recovery Map Component
// ============================================================
function MuscleRecoveryMap({ soreness, getReadinessLabel }) {
  return (
    <View style={styles.muscleMapContainer}>
      {/* Upper body row: shoulders, chest, back */}
      <View style={styles.muscleMapRow}>
        {['shoulders', 'chest', 'back'].map((muscle) => {
          const level = soreness[muscle] || 0;
          const color = getSorenessColor(level);
          const config = MUSCLE_CONFIG[muscle];

          return (
            <View
              key={muscle}
              style={[
                styles.muscleMapCard,
                { borderColor: level > 0 ? color + '30' : 'rgba(255, 255, 255, 0.06)' },
              ]}
            >
              <Text style={styles.muscleMapEmoji}>{config.emoji}</Text>
              <Text style={styles.muscleMapName}>{config.label}</Text>
              {/* Soreness bar */}
              <View style={styles.muscleMapBarTrack}>
                <View
                  style={[
                    styles.muscleMapBarFill,
                    {
                      width: `${(level / 3) * 100}%`,
                      backgroundColor: color,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.muscleMapEstimate, { color }]}>
                {getRecoveryEstimate(level)}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Lower body row: arms, core, legs */}
      <View style={styles.muscleMapRow}>
        {['arms', 'core', 'legs'].map((muscle) => {
          const level = soreness[muscle] || 0;
          const color = getSorenessColor(level);
          const config = MUSCLE_CONFIG[muscle];

          return (
            <View
              key={muscle}
              style={[
                styles.muscleMapCard,
                { borderColor: level > 0 ? color + '30' : 'rgba(255, 255, 255, 0.06)' },
              ]}
            >
              <Text style={styles.muscleMapEmoji}>{config.emoji}</Text>
              <Text style={styles.muscleMapName}>{config.label}</Text>
              {/* Soreness bar */}
              <View style={styles.muscleMapBarTrack}>
                <View
                  style={[
                    styles.muscleMapBarFill,
                    {
                      width: `${(level / 3) * 100}%`,
                      backgroundColor: color,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.muscleMapEstimate, { color }]}>
                {getRecoveryEstimate(level)}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ============================================================
// Recovery Tip Card Component
// ============================================================
function TipCard({ tip, index }) {
  return (
    <ReAnimated.View
      entering={FadeInDown.delay(700 + index * 100)
        .springify()
        .mass(0.5)
        .damping(10)}
      style={styles.tipCard}
    >
      <LinearGradient
        colors={[tip.color + '15', tip.color + '05']}
        style={styles.tipGradient}
      >
        <View style={[styles.tipIconWrap, { backgroundColor: tip.color + '25' }]}>
          <Lightbulb size={16} color={tip.color} />
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
// Strain Display Component
// ============================================================
function StrainSection({ strain, ratio }) {
  // Color based on strain level: green 0-7, yellow 8-14, red 15-21
  const getStrainColor = (value) => {
    if (value <= 7) return '#00E676';
    if (value <= 14) return '#FFB300';
    return '#FF5252';
  };

  const getStrainLabel = (value) => {
    if (value <= 7) return 'Low';
    if (value <= 14) return 'Moderate';
    return 'High';
  };

  const getRatioInterpretation = (r) => {
    if (r < 1.0) return { text: 'Undertraining \u2014 push harder', color: '#FFB300' };
    if (r <= 1.5) return { text: 'Optimal zone', color: '#00E676' };
    return { text: 'Overreaching \u2014 prioritize rest', color: '#FF5252' };
  };

  const strainColor = getStrainColor(strain);
  const strainPercent = Math.min(100, (strain / 21) * 100);

  return (
    <LinearGradient colors={Gradients.card} style={styles.strainCard}>
      <View style={styles.strainHeader}>
        <View style={styles.strainHeaderLeft}>
          <View style={[styles.strainIconWrap, { backgroundColor: strainColor + '25' }]}>
            <Flame size={18} color={strainColor} />
          </View>
          <Text style={styles.strainTitle}>Today's Strain</Text>
        </View>
        <View style={styles.strainValueWrap}>
          <Text style={[styles.strainValue, { color: strainColor }]}>
            {strain}
          </Text>
          <Text style={styles.strainMax}>/21</Text>
        </View>
      </View>

      {/* Strain bar */}
      <View style={styles.strainBarContainer}>
        <View style={styles.strainBarTrack}>
          {/* Gradient segments: green | yellow | red */}
          <View style={[styles.strainBarSegment, { flex: 7, backgroundColor: 'rgba(0, 230, 118, 0.15)' }]} />
          <View style={[styles.strainBarSegment, { flex: 7, backgroundColor: 'rgba(255, 179, 0, 0.15)' }]} />
          <View style={[styles.strainBarSegment, { flex: 7, backgroundColor: 'rgba(255, 82, 82, 0.15)' }]} />
        </View>
        <View style={[styles.strainBarFill, { width: `${strainPercent}%`, backgroundColor: strainColor }]} />
      </View>

      {/* Strain label */}
      <View style={styles.strainLabelsRow}>
        <Text style={styles.strainLabelText}>0</Text>
        <Text style={[styles.strainLabelCenter, { color: strainColor }]}>
          {getStrainLabel(strain)}
        </Text>
        <Text style={styles.strainLabelText}>21</Text>
      </View>

      {/* Strain:Recovery ratio */}
      {ratio !== null && (
        <View style={styles.strainRatioContainer}>
          <View style={styles.strainRatioDivider} />
          <View style={styles.strainRatioRow}>
            <Text style={styles.strainRatioLabel}>Strain:Recovery ratio</Text>
            <Text style={[styles.strainRatioValue, { color: getRatioInterpretation(ratio).color }]}>
              {ratio}
            </Text>
          </View>
          <View style={[styles.strainRatioBadge, { backgroundColor: getRatioInterpretation(ratio).color + '15' }]}>
            <Text style={[styles.strainRatioBadgeText, { color: getRatioInterpretation(ratio).color }]}>
              {getRatioInterpretation(ratio).text}
            </Text>
          </View>
        </View>
      )}
    </LinearGradient>
  );
}

// ============================================================
// History Entry Card Component
// ============================================================
function HistoryCard({ entry, isExpanded, onToggle, onDelete, getReadinessLabel, calculateReadinessFromEntry }) {
  const readiness = calculateReadinessFromEntry(entry);
  const tierInfo = getReadinessLabel(readiness);

  const formatDate = (dateStr) => {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <Pressable
      style={[styles.historyCard, isExpanded && styles.historyCardExpanded]}
      onPress={onToggle}
    >
      <View style={styles.historyHeader}>
        <View style={styles.historyHeaderLeft}>
          <View style={[styles.historyDateBadge, { backgroundColor: tierInfo.color + '15' }]}>
            <Text style={[styles.historyDateText, { color: tierInfo.color }]}>
              {formatDate(entry.date)}
            </Text>
          </View>
          {!isExpanded && (
            <View style={styles.historySummaryRow}>
              <Text style={[styles.historyScore, { color: tierInfo.color }]}>
                {readiness}
              </Text>
              <Text style={styles.historySummaryLabel}>{tierInfo.label}</Text>
              <Text style={styles.historyEmoji}>{tierInfo.emoji}</Text>
            </View>
          )}
        </View>
        {isExpanded ? (
          <ChevronUp size={18} color={Colors.textSecondary} />
        ) : (
          <ChevronDown size={18} color={Colors.textSecondary} />
        )}
      </View>

      {isExpanded && (
        <View style={styles.historyDetails}>
          {/* Score */}
          <View style={styles.historyDetailRow}>
            <View style={styles.historyDetailLabel}>
              <HeartPulse size={14} color={tierInfo.color} />
              <Text style={styles.historyDetailText}>Readiness</Text>
            </View>
            <Text style={[styles.historyDetailValue, { color: tierInfo.color }]}>
              {readiness} - {tierInfo.label}
            </Text>
          </View>

          {/* Sleep */}
          <View style={styles.historyDetailRow}>
            <View style={styles.historyDetailLabel}>
              <Moon size={14} color="#A78BFA" />
              <Text style={styles.historyDetailText}>Sleep Quality</Text>
            </View>
            <View style={styles.historyMiniIcons}>
              {[1, 2, 3, 4, 5].map((s) => (
                <Moon
                  key={s}
                  size={12}
                  color={s <= (entry.sleepQuality || 0) ? '#A78BFA' : Colors.textTertiary}
                  fill={s <= (entry.sleepQuality || 0) ? '#A78BFA' : 'transparent'}
                />
              ))}
            </View>
          </View>

          {/* Energy */}
          <View style={styles.historyDetailRow}>
            <View style={styles.historyDetailLabel}>
              <Zap size={14} color={Colors.warning} />
              <Text style={styles.historyDetailText}>Energy</Text>
            </View>
            <View style={styles.historyMiniIcons}>
              {[1, 2, 3, 4, 5].map((s) => (
                <Zap
                  key={s}
                  size={12}
                  color={s <= (entry.energyLevel || 0) ? Colors.warning : Colors.textTertiary}
                  fill={s <= (entry.energyLevel || 0) ? Colors.warning : 'transparent'}
                />
              ))}
            </View>
          </View>

          {/* Stress */}
          <View style={styles.historyDetailRow}>
            <View style={styles.historyDetailLabel}>
              <AlertTriangle size={14} color={Colors.secondary} />
              <Text style={styles.historyDetailText}>Stress</Text>
            </View>
            <View style={styles.historyMiniIcons}>
              {[1, 2, 3, 4, 5].map((s) => (
                <AlertTriangle
                  key={s}
                  size={12}
                  color={s <= (entry.stressLevel || 0) ? Colors.secondary : Colors.textTertiary}
                  fill={s <= (entry.stressLevel || 0) ? Colors.secondary : 'transparent'}
                />
              ))}
            </View>
          </View>

          {/* Soreness summary */}
          {entry.soreness && Object.keys(entry.soreness).filter(k => entry.soreness[k] > 0).length > 0 && (
            <View style={styles.historySorenessRow}>
              <Text style={styles.historySorenessTitle}>Sore Areas:</Text>
              <View style={styles.historySorenessTags}>
                {Object.entries(entry.soreness)
                  .filter(([, v]) => v > 0)
                  .map(([muscle, level]) => (
                    <View
                      key={muscle}
                      style={[
                        styles.historySorenessTag,
                        { backgroundColor: getSorenessColor(level) + '20' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.historySorenessTagText,
                          { color: getSorenessColor(level) },
                        ]}
                      >
                        {MUSCLE_CONFIG[muscle]?.label || muscle} ({getSorenessLabel(level)})
                      </Text>
                    </View>
                  ))}
              </View>
            </View>
          )}

          {/* HRV */}
          {entry.hrv ? (
            <View style={styles.historyDetailRow}>
              <View style={styles.historyDetailLabel}>
                <HeartPulse size={14} color={Colors.primary} />
                <Text style={styles.historyDetailText}>HRV</Text>
              </View>
              <Text style={[styles.historyDetailValue, { color: Colors.primary }]}>
                {entry.hrv} ms
              </Text>
            </View>
          ) : null}

          {/* Notes */}
          {entry.notes ? (
            <Text style={styles.historyNote}>{entry.notes}</Text>
          ) : null}

          {/* Delete */}
          <Pressable style={styles.historyDeleteButton} onPress={onDelete}>
            <Trash2 size={14} color={Colors.error} />
            <Text style={styles.historyDeleteText}>Delete Entry</Text>
          </Pressable>
        </View>
      )}
    </Pressable>
  );
}

// ============================================================
// Main Screen
// ============================================================
export default function RecoveryScreen() {
  const router = useRouter();
  const {
    entries,
    isLoading,
    addEntry,
    deleteEntry,
    getTodayEntry,
    calculateReadinessFromEntry,
    getRecoveryTrend,
    getMuscleRecovery,
    getShouldRestToday,
    getRecommendation,
    getReadinessLabel,
    getAverageReadiness,
    MUSCLE_GROUPS,
    SORENESS_LEVELS,
    dailyStrain,
    strainRecoveryRatio,
  } = useRecovery();

  // Form state
  const [energyLevel, setEnergyLevel] = useState(3);
  const [sleepQuality, setSleepQuality] = useState(3);
  const [stressLevel, setStressLevel] = useState(3);
  const [soreness, setSoreness] = useState({});
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [expandedEntry, setExpandedEntry] = useState(null);

  // Computed values
  const todayEntry = useMemo(() => getTodayEntry(), [getTodayEntry]);
  const weeklyTrend = useMemo(() => getRecoveryTrend(), [getRecoveryTrend]);
  const averageReadiness = useMemo(() => getAverageReadiness(), [getAverageReadiness]);
  const shouldRest = useMemo(() => getShouldRestToday(), [getShouldRestToday]);
  const recommendation = useMemo(() => getRecommendation(), [getRecommendation]);
  const muscleRecovery = useMemo(() => getMuscleRecovery(), [getMuscleRecovery]);

  const currentScore = useMemo(() => {
    if (todayEntry) return calculateReadinessFromEntry(todayEntry);
    return 0;
  }, [todayEntry, calculateReadinessFromEntry]);

  const currentLabel = useMemo(
    () => getReadinessLabel(currentScore),
    [currentScore, getReadinessLabel]
  );

  // Preview score while filling form (live calculation)
  const previewScore = useMemo(() => {
    if (todayEntry) return currentScore;
    return calculateReadinessFromEntry({
      sleepQuality,
      energyLevel,
      stressLevel,
      soreness,
    });
  }, [todayEntry, currentScore, calculateReadinessFromEntry, sleepQuality, energyLevel, stressLevel, soreness]);

  const previewLabel = useMemo(
    () => getReadinessLabel(previewScore),
    [previewScore, getReadinessLabel]
  );

  // Generate contextual recovery tips
  const tips = useMemo(() => {
    const result = [];
    const data = todayEntry || { sleepQuality, energyLevel, stressLevel, soreness };

    // Check soreness
    const sorenessVals = Object.values(data.soreness || {}).filter(v => v > 0);
    const avgSoreness = sorenessVals.length > 0
      ? sorenessVals.reduce((s, v) => s + v, 0) / sorenessVals.length
      : 0;

    if (avgSoreness >= 2) {
      result.push({
        title: 'High Muscle Soreness',
        description: 'Try foam rolling, stretching, or a gentle yoga session to relieve tension.',
        color: Colors.secondary,
      });
    }

    if ((data.sleepQuality || sleepQuality) <= 2) {
      result.push({
        title: 'Improve Sleep Quality',
        description: 'Aim for 7-9 hours tonight. Avoid screens 1 hour before bed.',
        color: '#A78BFA',
      });
    }

    if ((data.stressLevel || stressLevel) >= 4) {
      result.push({
        title: 'Manage Stress Levels',
        description: 'Try the Breathing exercises or a 10-minute meditation session.',
        color: Colors.primary,
      });
    }

    if ((data.energyLevel || energyLevel) <= 2) {
      result.push({
        title: 'Boost Your Energy',
        description: 'Check your hydration and nutrition. A short walk can help.',
        color: Colors.warning,
      });
    }

    // Always provide at least one tip
    if (result.length === 0) {
      result.push({
        title: 'Keep It Up!',
        description: 'Your recovery looks great. Maintain your healthy habits.',
        color: Colors.success,
      });
    }

    return result.slice(0, 3);
  }, [todayEntry, sleepQuality, energyLevel, stressLevel, soreness]);

  // History (last 7)
  const recentHistory = useMemo(() => entries.slice(0, 7), [entries]);

  // Handlers
  const handleBack = useCallback(async () => {
    await hapticLight();
    router.back();
  }, [router]);

  const handleLogRecovery = useCallback(async () => {
    setIsSaving(true);
    try {
      const readinessScore = Math.round((energyLevel + sleepQuality) / 2);
      addEntry({
        readinessScore,
        sleepQuality,
        energyLevel,
        stressLevel,
        soreness,
        notes: notes.trim(),
      });
      await hapticSuccess();
      setNotes('');
      const score = calculateReadinessFromEntry({
        sleepQuality,
        energyLevel,
        stressLevel,
        soreness,
      });
      const label = getReadinessLabel(score);
      Alert.alert(
        'Recovery Logged',
        `Readiness score: ${score} - ${label.label}`
      );
    } catch (error) {
      Alert.alert('Error', 'Could not log recovery. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [calculateReadinessFromEntry, sleepQuality, energyLevel, stressLevel, soreness, notes, addEntry, getReadinessLabel]);

  const handleDelete = useCallback((date) => {
    Alert.alert(
      'Delete Entry',
      'Are you sure you want to delete this recovery entry?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            deleteEntry(date);
            await hapticLight();
          },
        },
      ]
    );
  }, [deleteEntry]);

  const handleToggleExpand = useCallback(async (date) => {
    await hapticLight();
    setExpandedEntry((prev) => (prev === date ? null : date));
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <ScreenWrapper>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading recovery data...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  const hasToday = !!todayEntry;
  const displayScore = hasToday ? currentScore : previewScore;
  const displayLabel = hasToday ? currentLabel : previewLabel;

  return (
    <ScreenWrapper>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <ReAnimated.View
          entering={FadeInDown.delay(0).springify().mass(0.5).damping(10)}
          style={styles.header}
        >
          <Pressable style={styles.backButton} onPress={handleBack}>
            <ChevronLeft size={24} color={Colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Recovery</Text>
          <View style={styles.headerIcon}>
            <HeartPulse size={22} color={Colors.error} />
          </View>
        </ReAnimated.View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ============================================ */}
          {/* Today's Readiness Score (Hero Section)       */}
          {/* ============================================ */}
          <ReAnimated.View
            entering={FadeInDown.delay(100).springify().mass(0.5).damping(10)}
            style={styles.scoreSection}
          >
            <LinearGradient
              colors={Gradients.card}
              style={styles.scoreCard}
            >
              <ReadinessRing score={displayScore} label={displayLabel} />

              {/* Stats row */}
              <View style={styles.scoreStatsRow}>
                <View style={styles.scoreStat}>
                  <Text style={styles.scoreStatValue}>{averageReadiness}</Text>
                  <Text style={styles.scoreStatLabel}>7-Day Avg</Text>
                </View>
                <View style={styles.scoreStatDivider} />
                <View style={styles.scoreStat}>
                  <Text style={[styles.scoreStatValue, { color: displayLabel.color }]}>
                    {displayScore}
                  </Text>
                  <Text style={styles.scoreStatLabel}>Today</Text>
                </View>
                <View style={styles.scoreStatDivider} />
                <View style={styles.scoreStat}>
                  <Text style={styles.scoreStatValue}>{displayLabel.emoji}</Text>
                  <Text style={styles.scoreStatLabel}>Status</Text>
                </View>
              </View>

              {/* Recommendation */}
              <View style={[styles.recommendationBadge, { backgroundColor: displayLabel.color + '15' }]}>
                <Text style={[styles.recommendationText, { color: displayLabel.color }]}>
                  {hasToday ? recommendation : displayLabel.recommendation}
                </Text>
              </View>

              {/* REST DAY badge */}
              {(hasToday && shouldRest) && (
                <View style={styles.restDayBadge}>
                  <LinearGradient
                    colors={Gradients.error}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.restDayGradient}
                  >
                    <AlertTriangle size={16} color={Colors.text} />
                    <Text style={styles.restDayText}>REST DAY</Text>
                  </LinearGradient>
                </View>
              )}
            </LinearGradient>
          </ReAnimated.View>

          {/* ============================================ */}
          {/* Today's Strain Section                       */}
          {/* ============================================ */}
          <ReAnimated.View
            entering={FadeInDown.delay(150).springify().mass(0.5).damping(10)}
            style={styles.strainSection}
          >
            <StrainSection strain={dailyStrain} ratio={strainRecoveryRatio} />
          </ReAnimated.View>

          {/* ============================================ */}
          {/* Quick Log Section (form)                     */}
          {/* ============================================ */}
          {!hasToday && (
            <ReAnimated.View
              entering={FadeInDown.delay(200).springify().mass(0.5).damping(10)}
            >
              <Text style={styles.sectionTitle}>Quick Log</Text>
              <View style={styles.formCard}>
                {/* Energy Level */}
                <IconRating
                  value={energyLevel}
                  onChange={setEnergyLevel}
                  max={5}
                  icon={Zap}
                  activeColor={Colors.warning}
                  label="Energy Level"
                />

                <View style={styles.formDivider} />

                {/* Sleep Quality */}
                <IconRating
                  value={sleepQuality}
                  onChange={setSleepQuality}
                  max={5}
                  icon={Moon}
                  activeColor="#A78BFA"
                  label="Sleep Quality"
                />

                <View style={styles.formDivider} />

                {/* Stress Level */}
                <IconRating
                  value={stressLevel}
                  onChange={setStressLevel}
                  max={5}
                  icon={AlertTriangle}
                  activeColor={Colors.secondary}
                  label="Stress Level"
                />

                <View style={styles.formDivider} />

                {/* Muscle Soreness Map */}
                <MuscleGrid soreness={soreness} onUpdate={setSoreness} />

                <View style={styles.formDivider} />

                {/* Notes */}
                <View style={styles.notesContainer}>
                  <Text style={styles.ratingLabel}>Notes (optional)</Text>
                  <TextInput
                    style={styles.notesInput}
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="How are you feeling today?..."
                    placeholderTextColor={Colors.textTertiary}
                    maxLength={200}
                    multiline
                  />
                </View>

                {/* Log Button */}
                <Pressable
                  style={[styles.logButton, isSaving && styles.logButtonDisabled]}
                  onPress={handleLogRecovery}
                  disabled={isSaving}
                >
                  <LinearGradient
                    colors={isSaving ? Gradients.disabled : Gradients.fire}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.logButtonGradient}
                  >
                    {isSaving ? (
                      <ActivityIndicator size="small" color={Colors.text} />
                    ) : (
                      <>
                        <HeartPulse size={20} color={Colors.text} />
                        <Text style={styles.logButtonText}>Log Recovery</Text>
                      </>
                    )}
                  </LinearGradient>
                </Pressable>
              </View>
            </ReAnimated.View>
          )}

          {/* Already Logged Today */}
          {hasToday && (
            <ReAnimated.View
              entering={FadeInDown.delay(200).springify().mass(0.5).damping(10)}
            >
              <LinearGradient
                colors={[currentLabel.color + '12', currentLabel.color + '04']}
                style={styles.loggedTodayCard}
              >
                <View style={[styles.loggedTodayIcon, { backgroundColor: currentLabel.color + '20' }]}>
                  <HeartPulse size={20} color={currentLabel.color} />
                </View>
                <View style={styles.loggedTodayContent}>
                  <Text style={styles.loggedTodayTitle}>Today's Recovery Logged</Text>
                  <Text style={styles.loggedTodaySubtitle}>
                    Score: {currentScore} - {currentLabel.label}
                  </Text>
                </View>
              </LinearGradient>
            </ReAnimated.View>
          )}

          {/* ============================================ */}
          {/* Recovery Trend Chart                         */}
          {/* ============================================ */}
          {entries.length > 0 && (
            <ReAnimated.View
              entering={FadeInDown.delay(400).springify().mass(0.5).damping(10)}
            >
              <Text style={styles.sectionTitle}>Recovery Trend</Text>
              <LinearGradient colors={Gradients.card} style={styles.weeklyCard}>
                <View style={styles.weeklyHeader}>
                  <View style={styles.weeklyHeaderLeft}>
                    <TrendingUp size={18} color={Colors.primary} />
                    <Text style={styles.weeklyHeaderTitle}>Last 7 Days</Text>
                  </View>
                  <View style={styles.weeklyAvgBadge}>
                    <Text style={styles.weeklyAvgText}>
                      Avg: {averageReadiness}
                    </Text>
                  </View>
                </View>
                <WeeklyTrendChart
                  weeklyData={weeklyTrend}
                  getReadinessLabel={getReadinessLabel}
                />
                {/* Legend */}
                <View style={styles.legendRow}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#00E676' }]} />
                    <Text style={styles.legendText}>Peak 80+</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#FFB300' }]} />
                    <Text style={styles.legendText}>Good 60+</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#FF9800' }]} />
                    <Text style={styles.legendText}>Fair 40+</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#FF5252' }]} />
                    <Text style={styles.legendText}>Rest</Text>
                  </View>
                </View>
              </LinearGradient>
            </ReAnimated.View>
          )}

          {/* ============================================ */}
          {/* Muscle Recovery Map                          */}
          {/* ============================================ */}
          {entries.length > 0 && (
            <ReAnimated.View
              entering={FadeInDown.delay(500).springify().mass(0.5).damping(10)}
            >
              <Text style={styles.sectionTitle}>Muscle Recovery Map</Text>
              <LinearGradient colors={Gradients.card} style={styles.muscleMapSection}>
                <MuscleRecoveryMap
                  soreness={muscleRecovery}
                  getReadinessLabel={getReadinessLabel}
                />
                {/* Legend for soreness colors */}
                <View style={styles.muscleMapLegend}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: Colors.textTertiary }]} />
                    <Text style={styles.legendText}>None</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: Colors.warning }]} />
                    <Text style={styles.legendText}>Mild</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#FF9800' }]} />
                    <Text style={styles.legendText}>Moderate</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: Colors.error }]} />
                    <Text style={styles.legendText}>Severe</Text>
                  </View>
                </View>
              </LinearGradient>
            </ReAnimated.View>
          )}

          {/* ============================================ */}
          {/* Recovery Tips                                */}
          {/* ============================================ */}
          <ReAnimated.View
            entering={FadeInDown.delay(600).springify().mass(0.5).damping(10)}
          >
            <Text style={styles.sectionTitle}>Recovery Tips</Text>
          </ReAnimated.View>
          {tips.map((tip, index) => (
            <TipCard key={tip.title} tip={tip} index={index} />
          ))}

          {/* ============================================ */}
          {/* History                                       */}
          {/* ============================================ */}
          {recentHistory.length > 0 && (
            <ReAnimated.View
              entering={FadeInDown.delay(800).springify().mass(0.5).damping(10)}
            >
              <Text style={styles.sectionTitle}>History</Text>
              {recentHistory.map((entry) => (
                <HistoryCard
                  key={entry.date}
                  entry={entry}
                  isExpanded={expandedEntry === entry.date}
                  onToggle={() => handleToggleExpand(entry.date)}
                  onDelete={() => handleDelete(entry.date)}
                  getReadinessLabel={getReadinessLabel}
                  calculateReadinessFromEntry={calculateReadinessFromEntry}
                />
              ))}
            </ReAnimated.View>
          )}

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

// ============================================================
// Styles
// ============================================================
const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },

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
    paddingTop: Spacing.sm,
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
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.errorSoft,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Score Section
  scoreSection: {
    marginBottom: Spacing.lg,
  },
  scoreCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },

  // Ring
  ringContainer: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  ringCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringScoreValue: {
    fontSize: 52,
    fontWeight: FontWeight.black,
    letterSpacing: -2,
  },
  ringEmoji: {
    fontSize: 20,
    marginTop: 2,
  },
  ringSubtext: {
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

  // Recommendation
  recommendationBadge: {
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  recommendationText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    textAlign: 'center',
  },

  // REST DAY badge
  restDayBadge: {
    marginTop: Spacing.md,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    ...Shadows.glowError,
  },
  restDayGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  restDayText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    letterSpacing: 2,
  },

  // Section Title
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Form Card
  formCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  formDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginVertical: Spacing.md,
  },

  // Rating Component
  ratingContainer: {
    alignItems: 'center',
  },
  ratingLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  ratingRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  ratingButton: {
    padding: Spacing.xs,
  },
  ratingValueText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    marginTop: Spacing.xs,
  },

  // Muscle Grid (2x3)
  muscleGridContainer: {
    alignItems: 'center',
  },
  muscleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  muscleCard: {
    width: (SCREEN_WIDTH - Spacing.md * 2 - Spacing.md * 2 - Spacing.sm * 2) / 3,
    minWidth: 90,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    gap: 4,
  },
  muscleEmoji: {
    fontSize: 22,
  },
  muscleLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
  },
  muscleLevelDots: {
    flexDirection: 'row',
    gap: 3,
    marginTop: 2,
  },
  muscleLevelDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  muscleLevelLabel: {
    fontSize: 9,
    fontWeight: FontWeight.medium,
  },
  muscleHint: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: Spacing.sm,
  },

  // Notes
  notesContainer: {
    alignItems: 'center',
    width: '100%',
  },
  notesInput: {
    width: '100%',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
    minHeight: 48,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },

  // Log Button
  logButton: {
    marginTop: Spacing.lg,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.glowSecondary,
  },
  logButtonDisabled: {
    opacity: 0.6,
  },
  logButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  logButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },

  // Logged Today Card
  loggedTodayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  loggedTodayIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loggedTodayContent: {
    flex: 1,
  },
  loggedTodayTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  loggedTodaySubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
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

  // Legend
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.md,
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    flexWrap: 'wrap',
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
    color: Colors.textTertiary,
  },

  // Muscle Recovery Map
  muscleMapSection: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: Spacing.lg,
  },
  muscleMapContainer: {
    gap: Spacing.sm,
  },
  muscleMapRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  muscleMapCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    gap: 4,
  },
  muscleMapEmoji: {
    fontSize: 24,
  },
  muscleMapName: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
  },
  muscleMapBarTrack: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 2,
  },
  muscleMapBarFill: {
    height: '100%',
    borderRadius: 2,
    minWidth: 2,
  },
  muscleMapEstimate: {
    fontSize: 9,
    fontWeight: FontWeight.semibold,
    marginTop: 2,
  },
  muscleMapLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.md,
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    flexWrap: 'wrap',
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

  // History
  historyCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  historyCardExpanded: {
    borderColor: 'rgba(0, 212, 255, 0.3)',
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  historyHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
    marginRight: Spacing.sm,
  },
  historyDateBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  historyDateText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  historySummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  historyScore: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  historySummaryLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  historyEmoji: {
    fontSize: FontSize.sm,
  },

  // History expanded
  historyDetails: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  historyDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  historyDetailLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  historyDetailText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  historyDetailValue: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  historyMiniIcons: {
    flexDirection: 'row',
    gap: 3,
  },
  historySorenessRow: {
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  historySorenessTitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  historySorenessTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  historySorenessTag: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  historySorenessTagText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
  historyNote: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    fontStyle: 'italic',
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  historyDeleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.errorSoft,
  },
  historyDeleteText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.error,
  },

  // Strain Section
  strainSection: {
    marginBottom: Spacing.lg,
  },
  strainCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  strainHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  strainHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  strainIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  strainTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  strainValueWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  strainValue: {
    fontSize: FontSize.xxl || 28,
    fontWeight: FontWeight.bold,
  },
  strainMax: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    marginLeft: 2,
  },
  strainBarContainer: {
    position: 'relative',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
  },
  strainBarTrack: {
    flexDirection: 'row',
    height: '100%',
    borderRadius: 6,
    overflow: 'hidden',
  },
  strainBarSegment: {
    height: '100%',
  },
  strainBarFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: '100%',
    borderRadius: 6,
    minWidth: 4,
  },
  strainLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  strainLabelText: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },
  strainLabelCenter: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  strainRatioContainer: {
    marginTop: Spacing.sm,
  },
  strainRatioDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: Spacing.sm,
  },
  strainRatioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  strainRatioLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  strainRatioValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  strainRatioBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  strainRatioBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },

  // Bottom
  bottomSpacer: {
    height: 120,
  },
});

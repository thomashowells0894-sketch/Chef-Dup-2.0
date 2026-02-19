import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import ReAnimated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  PieChart,
  Dumbbell,
  Flame,
  Droplets,
  Zap,
  ChevronDown,
  ChevronUp,
  Ruler,
  Target,
  Info,
  Activity,
  TrendingUp,
  Heart,
  Scale,
  Check,
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
import useBodyComposition from '../hooks/useBodyComposition';
import { useProfile, ACTIVITY_LEVELS } from '../context/ProfileContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ──────────────────────────────────────────────
// BMI Scale Segment Colors
// ──────────────────────────────────────────────
const BMI_SEGMENTS = [
  { label: 'Underweight', min: 0, max: 18.5, color: '#64D2FF' },
  { label: 'Normal', min: 18.5, max: 25, color: '#00E676' },
  { label: 'Overweight', min: 25, max: 30, color: '#FFB300' },
  { label: 'Obese I', min: 30, max: 35, color: '#FF6B35' },
  { label: 'Obese II+', min: 35, max: 45, color: '#FF5252' },
];

const BMI_SCALE_MIN = 12;
const BMI_SCALE_MAX = 45;

// ──────────────────────────────────────────────
// Activity level options for TDEE selector
// ──────────────────────────────────────────────
const ACTIVITY_KEYS = ['sedentary', 'light', 'moderate', 'active', 'extreme'];

// ──────────────────────────────────────────────
// Expandable Info Card
// ──────────────────────────────────────────────
function InfoCard({ title, children, delay = 0 }) {
  const [expanded, setExpanded] = useState(false);

  const toggle = async () => {
    await hapticLight();
    setExpanded((prev) => !prev);
  };

  return (
    <ReAnimated.View
      entering={FadeInDown.delay(delay).springify().mass(0.5).damping(10)}
    >
      <Pressable onPress={toggle} style={styles.infoCard}>
        <LinearGradient colors={Gradients.card} style={styles.infoCardGradient}>
          <View style={styles.infoCardHeader}>
            <View style={styles.infoCardTitleRow}>
              <Info size={18} color={Colors.primary} />
              <Text style={styles.infoCardTitle}>{title}</Text>
            </View>
            {expanded ? (
              <ChevronUp size={18} color={Colors.textSecondary} />
            ) : (
              <ChevronDown size={18} color={Colors.textSecondary} />
            )}
          </View>
          {expanded && (
            <View style={styles.infoCardBody}>
              <Text style={styles.infoCardText}>{children}</Text>
            </View>
          )}
        </LinearGradient>
      </Pressable>
    </ReAnimated.View>
  );
}

// ──────────────────────────────────────────────
// BMI Scale Bar Visual
// ──────────────────────────────────────────────
function BMIScaleBar({ bmi }) {
  const barWidth = SCREEN_WIDTH - Spacing.md * 2 - Spacing.lg * 2;
  const clampedBMI = Math.max(BMI_SCALE_MIN, Math.min(BMI_SCALE_MAX, bmi));
  const pointerPosition =
    ((clampedBMI - BMI_SCALE_MIN) / (BMI_SCALE_MAX - BMI_SCALE_MIN)) * barWidth;

  return (
    <View style={styles.bmiScaleContainer}>
      <View style={styles.bmiScaleBar}>
        {BMI_SEGMENTS.map((seg, i) => {
          const segStart =
            ((Math.max(seg.min, BMI_SCALE_MIN) - BMI_SCALE_MIN) /
              (BMI_SCALE_MAX - BMI_SCALE_MIN)) *
            100;
          const segEnd =
            ((Math.min(seg.max, BMI_SCALE_MAX) - BMI_SCALE_MIN) /
              (BMI_SCALE_MAX - BMI_SCALE_MIN)) *
            100;
          const segWidth = segEnd - segStart;

          return (
            <View
              key={i}
              style={[
                styles.bmiSegment,
                {
                  backgroundColor: seg.color,
                  width: `${segWidth}%`,
                  borderTopLeftRadius: i === 0 ? 6 : 0,
                  borderBottomLeftRadius: i === 0 ? 6 : 0,
                  borderTopRightRadius: i === BMI_SEGMENTS.length - 1 ? 6 : 0,
                  borderBottomRightRadius:
                    i === BMI_SEGMENTS.length - 1 ? 6 : 0,
                },
              ]}
            />
          );
        })}
      </View>
      {/* Pointer */}
      <View
        style={[
          styles.bmiPointer,
          { left: Math.max(4, Math.min(barWidth - 4, pointerPosition)) },
        ]}
      >
        <View style={styles.bmiPointerTriangle} />
        <View style={styles.bmiPointerDot} />
      </View>
      {/* Scale Labels */}
      <View style={styles.bmiScaleLabels}>
        <Text style={styles.bmiScaleLabel}>18.5</Text>
        <Text style={styles.bmiScaleLabel}>25</Text>
        <Text style={styles.bmiScaleLabel}>30</Text>
        <Text style={styles.bmiScaleLabel}>35</Text>
      </View>
    </View>
  );
}

// ──────────────────────────────────────────────
// Composition Breakdown Mini Card
// ──────────────────────────────────────────────
function CompositionCard({ icon: Icon, iconColor, label, value, unit, delay = 0 }) {
  return (
    <ReAnimated.View
      entering={FadeInDown.delay(delay).springify().mass(0.5).damping(10)}
      style={styles.compCard}
    >
      <LinearGradient
        colors={[iconColor + '18', iconColor + '06']}
        style={styles.compCardGradient}
      >
        <View style={[styles.compCardIcon, { backgroundColor: iconColor + '25' }]}>
          <Icon size={18} color={iconColor} />
        </View>
        <Text style={styles.compCardValue}>
          {value !== null && value !== undefined ? value.toLocaleString() : '--'}
        </Text>
        <Text style={styles.compCardUnit}>{unit}</Text>
        <Text style={styles.compCardLabel}>{label}</Text>
      </LinearGradient>
    </ReAnimated.View>
  );
}

// ──────────────────────────────────────────────
// Body Fat Proportion Bar
// ──────────────────────────────────────────────
function BodyFatProportionBar({ fatPercent }) {
  const leanPercent = 100 - fatPercent;

  return (
    <View style={styles.proportionContainer}>
      <View style={styles.proportionBar}>
        <View
          style={[
            styles.proportionSegment,
            {
              width: `${leanPercent}%`,
              backgroundColor: Colors.success,
              borderTopLeftRadius: 8,
              borderBottomLeftRadius: 8,
            },
          ]}
        />
        <View
          style={[
            styles.proportionSegment,
            {
              width: `${fatPercent}%`,
              backgroundColor: Colors.secondary,
              borderTopRightRadius: 8,
              borderBottomRightRadius: 8,
            },
          ]}
        />
      </View>
      <View style={styles.proportionLabels}>
        <View style={styles.proportionLabelRow}>
          <View style={[styles.proportionDot, { backgroundColor: Colors.success }]} />
          <Text style={styles.proportionLabelText}>
            Lean Mass {leanPercent.toFixed(1)}%
          </Text>
        </View>
        <View style={styles.proportionLabelRow}>
          <View style={[styles.proportionDot, { backgroundColor: Colors.secondary }]} />
          <Text style={styles.proportionLabelText}>
            Body Fat {fatPercent.toFixed(1)}%
          </Text>
        </View>
      </View>
    </View>
  );
}

// ──────────────────────────────────────────────
// Ideal Weight Scale
// ──────────────────────────────────────────────
function IdealWeightScale({ min, max, current }) {
  if (!min || !max || !current) return null;

  const scaleMin = Math.min(min - 20, current - 10);
  const scaleMax = Math.max(max + 20, current + 10);
  const range = scaleMax - scaleMin;

  const idealStartPct = ((min - scaleMin) / range) * 100;
  const idealWidthPct = ((max - min) / range) * 100;
  const currentPct = ((current - scaleMin) / range) * 100;

  const isInRange = current >= min && current <= max;
  const distFromRange = current < min ? min - current : current > max ? current - max : 0;

  return (
    <View style={styles.idealScaleContainer}>
      {/* Scale bar */}
      <View style={styles.idealScaleBar}>
        <View
          style={[
            styles.idealScaleRange,
            {
              left: `${idealStartPct}%`,
              width: `${idealWidthPct}%`,
            },
          ]}
        />
        {/* Current weight marker */}
        <View
          style={[
            styles.idealScaleMarker,
            {
              left: `${Math.max(2, Math.min(98, currentPct))}%`,
              backgroundColor: isInRange ? Colors.success : Colors.warning,
            },
          ]}
        />
      </View>
      {/* Labels */}
      <View style={styles.idealScaleLabels}>
        <Text style={styles.idealScaleLabelText}>{min} lbs</Text>
        <Text style={[styles.idealScaleLabelText, { color: Colors.text }]}>
          {current} lbs
        </Text>
        <Text style={styles.idealScaleLabelText}>{max} lbs</Text>
      </View>
      {/* Status message */}
      <View
        style={[
          styles.idealStatusBadge,
          {
            backgroundColor: isInRange ? Colors.successSoft : Colors.warningSoft,
          },
        ]}
      >
        {isInRange ? (
          <Check size={14} color={Colors.success} />
        ) : (
          <Target size={14} color={Colors.warning} />
        )}
        <Text
          style={[
            styles.idealStatusText,
            { color: isInRange ? Colors.success : Colors.warning },
          ]}
        >
          {isInRange
            ? "You're within your ideal range!"
            : `You're ${Math.round(distFromRange)} lbs from ideal range`}
        </Text>
      </View>
    </View>
  );
}

// ──────────────────────────────────────────────
// TDEE Activity Level Selector
// ──────────────────────────────────────────────
function TDEEBreakdown({ bmr, activityLevel, gender }) {
  const [selectedLevel, setSelectedLevel] = useState(activityLevel || 'moderate');

  const multiplier = ACTIVITY_LEVELS[selectedLevel]?.multiplier || 1.55;
  const tdee = bmr ? Math.round(bmr * multiplier) : null;
  const activityCalories = bmr && tdee ? tdee - bmr : null;
  const bmrPercent = bmr && tdee ? Math.round((bmr / tdee) * 100) : 0;

  const handleSelect = async (key) => {
    await hapticLight();
    setSelectedLevel(key);
  };

  if (!bmr) return null;

  return (
    <View style={styles.tdeeContainer}>
      <View style={styles.tdeeHeader}>
        <Activity size={20} color={Colors.warning} />
        <Text style={styles.tdeeTitle}>Daily Energy Needs</Text>
      </View>

      {/* Activity Level Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tdeeChipsScroll}
        contentContainerStyle={styles.tdeeChipsContent}
      >
        {ACTIVITY_KEYS.map((key) => {
          const level = ACTIVITY_LEVELS[key];
          const isActive = key === selectedLevel;
          return (
            <Pressable
              key={key}
              style={[styles.tdeeChip, isActive && styles.tdeeChipActive]}
              onPress={() => handleSelect(key)}
            >
              <Text
                style={[
                  styles.tdeeChipText,
                  isActive && styles.tdeeChipTextActive,
                ]}
              >
                {level.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* TDEE Value */}
      <View style={styles.tdeeTotalRow}>
        <Text style={styles.tdeeTotalValue}>
          {tdee ? tdee.toLocaleString() : '--'}
        </Text>
        <Text style={styles.tdeeTotalUnit}>kcal/day</Text>
      </View>

      {/* Breakdown Bar */}
      <View style={styles.tdeeBreakdownBar}>
        <View
          style={[
            styles.tdeeBreakdownSegment,
            {
              width: `${bmrPercent}%`,
              backgroundColor: Colors.primary,
              borderTopLeftRadius: 6,
              borderBottomLeftRadius: 6,
            },
          ]}
        />
        <View
          style={[
            styles.tdeeBreakdownSegment,
            {
              width: `${100 - bmrPercent}%`,
              backgroundColor: Colors.warning,
              borderTopRightRadius: 6,
              borderBottomRightRadius: 6,
            },
          ]}
        />
      </View>

      {/* Legend */}
      <View style={styles.tdeeBreakdownLegend}>
        <View style={styles.tdeeLegendItem}>
          <View
            style={[styles.tdeeLegendDot, { backgroundColor: Colors.primary }]}
          />
          <Text style={styles.tdeeLegendLabel}>BMR</Text>
          <Text style={styles.tdeeLegendValue}>
            {bmr ? bmr.toLocaleString() : '--'} kcal
          </Text>
        </View>
        <View style={styles.tdeeLegendItem}>
          <View
            style={[styles.tdeeLegendDot, { backgroundColor: Colors.warning }]}
          />
          <Text style={styles.tdeeLegendLabel}>Activity</Text>
          <Text style={styles.tdeeLegendValue}>
            {activityCalories ? activityCalories.toLocaleString() : '--'} kcal
          </Text>
        </View>
      </View>

      <Text style={styles.tdeeDescription}>
        {ACTIVITY_LEVELS[selectedLevel]?.description}
      </Text>
    </View>
  );
}

// ══════════════════════════════════════════════
// MAIN SCREEN
// ══════════════════════════════════════════════
export default function BodyCompositionScreen() {
  const router = useRouter();
  const composition = useBodyComposition();
  const { profile } = useProfile();

  const {
    bmi,
    bmiCategory,
    bodyFatPercentage,
    bodyFatCategory,
    leanBodyMass,
    fatMass,
    bmr,
    tdee,
    idealWeightRange,
    muscleGainPotential,
    waterWeight,
    hasMeasurements,
    weight,
    height,
    gender,
    activityLevel,
  } = composition;

  const handleBack = async () => {
    await hapticLight();
    router.back();
  };

  const handleGoToMeasurements = async () => {
    await hapticLight();
    router.push('/body-measurements');
  };

  // Check if basic profile data exists
  const hasBasicData = weight && height;

  return (
    <ScreenWrapper>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <ReAnimated.View
          entering={FadeInDown.delay(0).springify().mass(0.5).damping(10)}
          style={styles.header}
        >
          <Pressable style={styles.backButton} onPress={handleBack}>
            <ArrowLeft size={22} color={Colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Body Composition</Text>
          <View style={styles.headerIconContainer}>
            <PieChart size={22} color={Colors.primary} />
          </View>
        </ReAnimated.View>

        {/* ── No Data State ── */}
        {!hasBasicData && (
          <ReAnimated.View
            entering={FadeInDown.delay(100).springify().mass(0.5).damping(10)}
            style={styles.emptyState}
          >
            <LinearGradient colors={Gradients.card} style={styles.emptyStateGradient}>
              <Scale size={48} color={Colors.textTertiary} />
              <Text style={styles.emptyStateTitle}>Profile Incomplete</Text>
              <Text style={styles.emptyStateText}>
                Add your weight and height in your profile to see body composition
                analysis.
              </Text>
            </LinearGradient>
          </ReAnimated.View>
        )}

        {/* ── BMI Hero Card ── */}
        {hasBasicData && bmi !== null && (
          <ReAnimated.View
            entering={FadeInDown.delay(100).springify().mass(0.5).damping(10)}
          >
            <LinearGradient
              colors={Gradients.card}
              style={styles.bmiCard}
            >
              <View style={styles.bmiCardHeader}>
                <Text style={styles.bmiCardLabel}>Body Mass Index</Text>
                <View
                  style={[
                    styles.bmiCategoryBadge,
                    { backgroundColor: bmiCategory.color + '25' },
                  ]}
                >
                  <Text
                    style={[styles.bmiCategoryText, { color: bmiCategory.color }]}
                  >
                    {bmiCategory.label}
                  </Text>
                </View>
              </View>

              <Text style={styles.bmiValue}>{bmi}</Text>

              <BMIScaleBar bmi={bmi} />

              {idealWeightRange && (
                <Text style={styles.bmiRangeText}>
                  Normal range for your height: {idealWeightRange.min} - {idealWeightRange.max} lbs
                </Text>
              )}
            </LinearGradient>
          </ReAnimated.View>
        )}

        {/* ── Body Fat Section ── */}
        {hasBasicData && hasMeasurements && bodyFatPercentage !== null && (
          <ReAnimated.View
            entering={FadeInDown.delay(200).springify().mass(0.5).damping(10)}
          >
            <LinearGradient
              colors={Gradients.card}
              style={styles.bodyFatCard}
            >
              <View style={styles.bodyFatHeader}>
                <Text style={styles.bodyFatLabel}>Body Fat</Text>
                {bodyFatCategory && (
                  <View
                    style={[
                      styles.bodyFatCategoryBadge,
                      { backgroundColor: bodyFatCategory.color + '25' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.bodyFatCategoryText,
                        { color: bodyFatCategory.color },
                      ]}
                    >
                      {bodyFatCategory.label}
                    </Text>
                  </View>
                )}
              </View>

              <Text style={styles.bodyFatValue}>{bodyFatPercentage}%</Text>

              <BodyFatProportionBar fatPercent={bodyFatPercentage} />

              {/* Fat vs Lean numbers */}
              <View style={styles.bodyFatNumbers}>
                <View style={styles.bodyFatNumberItem}>
                  <Dumbbell size={16} color={Colors.success} />
                  <Text style={styles.bodyFatNumberValue}>
                    {leanBodyMass !== null ? `${leanBodyMass} lbs` : '--'}
                  </Text>
                  <Text style={styles.bodyFatNumberLabel}>Lean Mass</Text>
                </View>
                <View style={styles.bodyFatDivider} />
                <View style={styles.bodyFatNumberItem}>
                  <Flame size={16} color={Colors.secondary} />
                  <Text style={styles.bodyFatNumberValue}>
                    {fatMass !== null ? `${fatMass} lbs` : '--'}
                  </Text>
                  <Text style={styles.bodyFatNumberLabel}>Fat Mass</Text>
                </View>
              </View>

              <Text style={styles.bodyFatMethodText}>
                Based on US Navy method using your body measurements
              </Text>
            </LinearGradient>
          </ReAnimated.View>
        )}

        {/* ── Body Fat Unavailable State ── */}
        {hasBasicData && !hasMeasurements && (
          <ReAnimated.View
            entering={FadeInDown.delay(200).springify().mass(0.5).damping(10)}
          >
            <LinearGradient
              colors={Gradients.card}
              style={styles.bodyFatUnavailable}
            >
              <Ruler size={32} color={Colors.textTertiary} />
              <Text style={styles.bodyFatUnavailableTitle}>
                Body Fat Estimate Unavailable
              </Text>
              <Text style={styles.bodyFatUnavailableText}>
                Log your waist, neck{gender === 'female' ? ', and hip' : ''}{' '}
                measurements to calculate your body fat percentage using the US
                Navy method.
              </Text>
              <Pressable
                style={styles.bodyFatUnavailableButton}
                onPress={handleGoToMeasurements}
              >
                <LinearGradient
                  colors={Gradients.primary}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.bodyFatUnavailableButtonGradient}
                >
                  <Ruler size={16} color={Colors.background} />
                  <Text style={styles.bodyFatUnavailableButtonText}>
                    Log Body Measurements
                  </Text>
                </LinearGradient>
              </Pressable>
            </LinearGradient>
          </ReAnimated.View>
        )}

        {/* ── Composition Breakdown Grid ── */}
        {hasBasicData && (
          <View style={styles.compGrid}>
            <View style={styles.compGridRow}>
              <CompositionCard
                icon={Dumbbell}
                iconColor={Colors.success}
                label="Lean Mass"
                value={leanBodyMass}
                unit="lbs"
                delay={300}
              />
              <CompositionCard
                icon={Flame}
                iconColor={Colors.secondary}
                label="Fat Mass"
                value={fatMass}
                unit="lbs"
                delay={350}
              />
            </View>
            <View style={styles.compGridRow}>
              <CompositionCard
                icon={Droplets}
                iconColor="#64D2FF"
                label="Water Weight"
                value={waterWeight}
                unit="lbs"
                delay={400}
              />
              <CompositionCard
                icon={Zap}
                iconColor={Colors.warning}
                label="BMR"
                value={bmr}
                unit="kcal"
                delay={450}
              />
            </View>
          </View>
        )}

        {/* ── Ideal Weight Range ── */}
        {hasBasicData && idealWeightRange && (
          <ReAnimated.View
            entering={FadeInDown.delay(500).springify().mass(0.5).damping(10)}
          >
            <LinearGradient
              colors={Gradients.card}
              style={styles.idealWeightCard}
            >
              <View style={styles.idealWeightHeader}>
                <Target size={20} color={Colors.primary} />
                <Text style={styles.idealWeightTitle}>Ideal Weight Range</Text>
              </View>
              <IdealWeightScale
                min={idealWeightRange.min}
                max={idealWeightRange.max}
                current={weight}
              />
            </LinearGradient>
          </ReAnimated.View>
        )}

        {/* ── TDEE Breakdown ── */}
        {hasBasicData && bmr && (
          <ReAnimated.View
            entering={FadeInDown.delay(550).springify().mass(0.5).damping(10)}
          >
            <LinearGradient
              colors={Gradients.card}
              style={styles.tdeeCard}
            >
              <TDEEBreakdown
                bmr={bmr}
                activityLevel={activityLevel}
                gender={gender}
              />
            </LinearGradient>
          </ReAnimated.View>
        )}

        {/* ── Muscle Gain Potential ── */}
        {hasBasicData && muscleGainPotential && (
          <ReAnimated.View
            entering={FadeInDown.delay(600).springify().mass(0.5).damping(10)}
          >
            <LinearGradient
              colors={Gradients.card}
              style={styles.muscleCard}
            >
              <View style={styles.muscleHeader}>
                <TrendingUp size={20} color={Colors.success} />
                <Text style={styles.muscleTitle}>Muscle Gain Potential</Text>
              </View>
              <Text style={styles.muscleSubtitle}>
                Estimated monthly lean mass gain (lbs)
              </Text>
              {['beginner', 'intermediate', 'advanced'].map((level) => {
                const data = muscleGainPotential[level];
                return (
                  <View key={level} style={styles.muscleRow}>
                    <Text style={styles.muscleRowLabel}>{data.label}</Text>
                    <Text style={styles.muscleRowValue}>
                      {data.min} - {data.max} lbs/mo
                    </Text>
                  </View>
                );
              })}
              <View style={styles.muscleDivider} />
              <View style={styles.muscleRow}>
                <Text style={styles.muscleRowLabel}>Max Lean Potential</Text>
                <Text style={[styles.muscleRowValue, { color: Colors.success }]}>
                  ~{muscleGainPotential.maxLeanPotential} lbs
                </Text>
              </View>
              <Text style={styles.muscleNote}>
                Based on the Alan Aragon model. Individual results vary.
              </Text>
            </LinearGradient>
          </ReAnimated.View>
        )}

        {/* ── Info Cards ── */}
        <View style={styles.infoSection}>
          <InfoCard title="What is BMI?" delay={650}>
            {
              'Body Mass Index (BMI) is a simple calculation using your height and weight. ' +
              'While it provides a general indication of whether you are in a healthy weight range, ' +
              'it does not account for muscle mass, bone density, or body composition. ' +
              'Athletes and muscular individuals may have a high BMI while having low body fat.'
            }
          </InfoCard>

          <InfoCard title="Understanding Body Fat %" delay={700}>
            {
              'Body fat percentage represents the proportion of your total weight that is fat tissue. ' +
              'Essential fat is necessary for normal bodily functions (2-5% for men, 10-13% for women). ' +
              'The US Navy method estimates body fat using circumference measurements. ' +
              'For more accurate readings, consider DEXA scans or hydrostatic weighing.'
            }
          </InfoCard>

          <InfoCard title="About These Calculations" delay={750}>
            {
              'All calculations shown are estimates based on established formulas and should not be used as medical advice. ' +
              'BMR is calculated using the Mifflin-St Jeor equation. ' +
              'Body fat uses the US Navy circumference method. ' +
              'Ideal weight range is based on BMI 18.5-24.9. ' +
              'Individual factors such as genetics, muscle mass, and medical conditions can significantly affect these values. ' +
              'Consult a healthcare professional for personalized guidance.'
            }
          </InfoCard>
        </View>

        {/* Bottom spacer */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </ScreenWrapper>
  );
}

// ══════════════════════════════════════════════
// STYLES
// ══════════════════════════════════════════════
const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
  },

  // ── Header ──
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
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  headerIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Empty State ──
  emptyState: {
    marginBottom: Spacing.lg,
  },
  emptyStateGradient: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyStateTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  emptyStateText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },

  // ── BMI Card ──
  bmiCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bmiCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  bmiCardLabel: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bmiCategoryBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  bmiCategoryText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  bmiValue: {
    fontSize: 64,
    fontWeight: FontWeight.black,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.md,
    lineHeight: 72,
  },
  bmiRangeText: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: Spacing.md,
  },

  // ── BMI Scale ──
  bmiScaleContainer: {
    marginTop: Spacing.sm,
  },
  bmiScaleBar: {
    flexDirection: 'row',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
  },
  bmiSegment: {
    height: '100%',
  },
  bmiPointer: {
    position: 'absolute',
    top: -6,
    alignItems: 'center',
    marginLeft: -6,
  },
  bmiPointerTriangle: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: Colors.text,
  },
  bmiPointerDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.text,
    marginTop: 1,
  },
  bmiScaleLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
    paddingHorizontal: '10%',
  },
  bmiScaleLabel: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },

  // ── Body Fat Card ──
  bodyFatCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bodyFatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  bodyFatLabel: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bodyFatCategoryBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  bodyFatCategoryText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  bodyFatValue: {
    fontSize: 56,
    fontWeight: FontWeight.black,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.md,
    lineHeight: 64,
  },
  bodyFatNumbers: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  bodyFatNumberItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  bodyFatNumberValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  bodyFatNumberLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  bodyFatDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.border,
  },
  bodyFatMethodText: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: Spacing.md,
    fontStyle: 'italic',
  },

  // ── Proportion Bar ──
  proportionContainer: {
    marginTop: Spacing.sm,
  },
  proportionBar: {
    flexDirection: 'row',
    height: 16,
    borderRadius: 8,
    overflow: 'hidden',
  },
  proportionSegment: {
    height: '100%',
  },
  proportionLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
  },
  proportionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  proportionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  proportionLabelText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },

  // ── Body Fat Unavailable ──
  bodyFatUnavailable: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bodyFatUnavailableTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  bodyFatUnavailableText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  bodyFatUnavailableButton: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  bodyFatUnavailableButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
  },
  bodyFatUnavailableButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.background,
  },

  // ── Composition Grid ──
  compGrid: {
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  compGridRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  compCard: {
    flex: 1,
  },
  compCardGradient: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 130,
    justifyContent: 'center',
  },
  compCardIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  compCardValue: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  compCardUnit: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  compCardLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    fontWeight: FontWeight.medium,
  },

  // ── Ideal Weight ──
  idealWeightCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  idealWeightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  idealWeightTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  idealScaleContainer: {
    gap: Spacing.sm,
  },
  idealScaleBar: {
    height: 12,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 6,
    position: 'relative',
    overflow: 'visible',
  },
  idealScaleRange: {
    position: 'absolute',
    top: 0,
    height: '100%',
    backgroundColor: Colors.success + '40',
    borderRadius: 6,
  },
  idealScaleMarker: {
    position: 'absolute',
    top: -4,
    width: 8,
    height: 20,
    borderRadius: 4,
    marginLeft: -4,
  },
  idealScaleLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  idealScaleLabelText: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },
  idealStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    alignSelf: 'center',
    marginTop: Spacing.sm,
  },
  idealStatusText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },

  // ── TDEE ──
  tdeeCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tdeeContainer: {},
  tdeeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  tdeeTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  tdeeChipsScroll: {
    marginBottom: Spacing.md,
  },
  tdeeChipsContent: {
    gap: Spacing.sm,
  },
  tdeeChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceElevated,
  },
  tdeeChipActive: {
    backgroundColor: Colors.primary,
  },
  tdeeChipText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
  },
  tdeeChipTextActive: {
    color: Colors.background,
    fontWeight: FontWeight.semibold,
  },
  tdeeTotalRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  tdeeTotalValue: {
    fontSize: FontSize.xxxl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  tdeeTotalUnit: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  tdeeBreakdownBar: {
    flexDirection: 'row',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  tdeeBreakdownSegment: {
    height: '100%',
  },
  tdeeBreakdownLegend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: Spacing.sm,
  },
  tdeeLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  tdeeLegendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  tdeeLegendLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  tdeeLegendValue: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  tdeeDescription: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: Spacing.xs,
  },

  // ── Muscle Gain ──
  muscleCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  muscleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  muscleTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  muscleSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  muscleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  muscleRowLabel: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  muscleRowValue: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  muscleDivider: {
    height: Spacing.sm,
  },
  muscleNote: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: Spacing.md,
    fontStyle: 'italic',
  },

  // ── Info Cards ──
  infoSection: {
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  infoCard: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  infoCardGradient: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  infoCardTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  infoCardBody: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  infoCardText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    lineHeight: 22,
  },

  // ── Bottom Spacer ──
  bottomSpacer: {
    height: 120,
  },
});

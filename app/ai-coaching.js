/**
 * AI Coaching & Training Plan Screen
 *
 * Features:
 * - Periodized training plan generator with experience/goal/frequency selectors
 * - Deload assessment with animated progress ring and score-based recommendations
 * - Injury prevention plans by body area with stretches and mobility exercises
 * - Plateau-breaking strategies categorized by goal type
 * - Evidence-graded supplement guide from SUPPLEMENT_DATABASE
 * - Haptic feedback on all interactions
 * - ReAnimated entrance animations throughout
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import ScreenErrorBoundary from '../components/ScreenErrorBoundary';
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
import ReAnimated, {
  FadeInDown,
  FadeInUp,
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
  ArrowLeft,
  Dumbbell,
  Brain,
  Shield,
  TrendingUp,
  Pill,
  ChevronRight,
  Target,
  Zap,
} from 'lucide-react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import GlassCard from '../components/ui/GlassCard';
import InsightCard from '../components/InsightCard';
import {
  Colors,
  Spacing,
  FontSize,
  FontWeight,
  BorderRadius,
  Shadows,
  Gradients,
} from '../constants/theme';
import { hapticLight, hapticSuccess, hapticImpact } from '../lib/haptics';
import {
  generatePeriodizedPlan as generateTrainingPlan,
  shouldDeload as evaluateDeloadNeed,
  getInjuryPreventionPlan,
  getPlateauBreakingStrategies as getPlateauBreakers,
  SUPPLEMENT_DATABASE,
} from '../lib/aiCoaching';
import { useProfile } from '../context/ProfileContext';
import { useGamification } from '../context/GamificationContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================================
// Constants
// ============================================================

const EXPERIENCE_LEVELS = ['Beginner', 'Intermediate', 'Advanced'];
const GOAL_OPTIONS = ['Strength', 'Hypertrophy', 'Fat Loss', 'General Fitness'];
const GOAL_MAP = {
  Strength: 'strength',
  Hypertrophy: 'hypertrophy',
  'Fat Loss': 'weight_loss',
  'General Fitness': 'hypertrophy',
};
const BODY_AREAS = [
  { key: 'shoulders', label: 'Shoulder' },
  { key: 'knees', label: 'Knee' },
  { key: 'lower_back', label: 'Back' },
  { key: 'hips', label: 'Hip' },
  { key: 'wrists', label: 'Ankle' },
];
const PLATEAU_CATEGORIES = ['Strength', 'Hypertrophy', 'Weight Loss'];
const PLATEAU_MAP = {
  Strength: 'strength',
  Hypertrophy: 'hypertrophy',
  'Weight Loss': 'weight_loss',
};

// Deload ring constants
const RING_SIZE = 160;
const RING_STROKE = 12;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const AnimatedCircle = ReAnimated.createAnimatedComponent(Circle);

// Evidence grade color mapping
function getEvidenceColor(grade) {
  if (!grade) return Colors.textTertiary;
  const g = grade.toUpperCase().replace('+', '');
  if (g === 'A') return Colors.success;
  if (g === 'B') return Colors.warning;
  return '#FF8C42';
}

// ============================================================
// AnimatedProgressRing Component
// ============================================================
function AnimatedProgressRing({ score }) {
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

  const ringColor =
    score >= 70 ? Colors.error : score >= 40 ? Colors.warning : Colors.success;
  const ringEndColor =
    score >= 70 ? '#FF1744' : score >= 40 ? '#FFA000' : '#00C853';

  return (
    <ReAnimated.View style={[styles.ringContainer, containerStyle]}>
      <Svg width={RING_SIZE} height={RING_SIZE}>
        <Defs>
          <SvgLinearGradient id="deloadGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={ringColor} stopOpacity="1" />
            <Stop offset="1" stopColor={ringEndColor} stopOpacity="1" />
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
          stroke="url(#deloadGrad)"
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
        <Text style={[styles.ringScoreValue, { color: ringColor }]}>
          {score}
        </Text>
        <Text style={styles.ringScoreLabel}>/ 100</Text>
      </View>
    </ReAnimated.View>
  );
}

// ============================================================
// Pill Selector Component (Horizontal Chip Row)
// ============================================================
function PillSelector({ options, selected, onSelect, style }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={[styles.pillRow, style]}
      contentContainerStyle={styles.pillRowContent}
    >
      {options.map((option) => {
        const isActive = selected === option;
        return (
          <Pressable
            key={option}
            onPress={async () => {
              await hapticLight();
              onSelect(option);
            }}
            style={[styles.pill, isActive && styles.pillActive]}
          >
            <Text style={[styles.pillText, isActive && styles.pillTextActive]}>
              {option}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

// ============================================================
// Days Per Week Slider
// ============================================================
function DaysSlider({ value, onChange }) {
  const days = [3, 4, 5, 6];
  return (
    <View style={styles.sliderRow}>
      <Text style={styles.sliderLabel}>Days / Week</Text>
      <View style={styles.sliderButtons}>
        {days.map((d) => {
          const isActive = value === d;
          return (
            <Pressable
              key={d}
              onPress={async () => {
                await hapticLight();
                onChange(d);
              }}
              style={[styles.sliderButton, isActive && styles.sliderButtonActive]}
            >
              <Text
                style={[
                  styles.sliderButtonText,
                  isActive && styles.sliderButtonTextActive,
                ]}
              >
                {d}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ============================================================
// Training Plan Display
// ============================================================
function TrainingPlanDisplay({ plan }) {
  if (!plan) return null;

  return (
    <ReAnimated.View entering={FadeInDown.springify().mass(0.5).damping(10)}>
      {/* Weekly Split */}
      <Text style={styles.planSubheading}>Weekly Split</Text>
      {plan.weeklySplit.map((dayInfo, idx) => (
        <ReAnimated.View
          key={dayInfo.day}
          entering={FadeInDown.delay(idx * 60).springify().mass(0.5).damping(10)}
        >
          <LinearGradient colors={Gradients.card} style={styles.splitDayCard}>
            <View style={styles.splitDayHeader}>
              <View style={[styles.dayBadge, { backgroundColor: Colors.primarySoft }]}>
                <Text style={styles.dayBadgeText}>{dayInfo.day}</Text>
              </View>
              <Text style={styles.splitDayFocus}>{dayInfo.focus}</Text>
            </View>
            <View style={styles.muscleChips}>
              {dayInfo.muscles.map((muscle) => (
                <View key={muscle} style={styles.muscleChip}>
                  <Text style={styles.muscleChipText}>{muscle}</Text>
                </View>
              ))}
            </View>
          </LinearGradient>
        </ReAnimated.View>
      ))}

      {/* Phases */}
      <Text style={[styles.planSubheading, { marginTop: Spacing.lg }]}>
        Periodization Phases
      </Text>
      {plan.phases.map((phase, idx) => (
        <ReAnimated.View
          key={`${phase.name}-${idx}`}
          entering={FadeInDown.delay(300 + idx * 80).springify().mass(0.5).damping(10)}
        >
          <LinearGradient
            colors={
              phase.name === 'Deload'
                ? Gradients.warningSoft
                : Gradients.card
            }
            style={styles.phaseCard}
          >
            <View style={styles.phaseHeader}>
              <Text style={styles.phaseName}>{phase.name}</Text>
              <Text style={styles.phaseWeeks}>
                Weeks {phase.weeks[0]}-{phase.weeks[1]}
              </Text>
            </View>
            <Text style={styles.phaseFocus}>{phase.focus}</Text>
            <View style={styles.phaseDetails}>
              <View style={styles.phaseDetailItem}>
                <Text style={styles.phaseDetailLabel}>Intensity</Text>
                <Text style={styles.phaseDetailValue}>{phase.intensity}</Text>
              </View>
              <View style={styles.phaseDetailItem}>
                <Text style={styles.phaseDetailLabel}>Volume</Text>
                <Text style={styles.phaseDetailValue}>{phase.volume}</Text>
              </View>
              <View style={styles.phaseDetailItem}>
                <Text style={styles.phaseDetailLabel}>Rest</Text>
                <Text style={styles.phaseDetailValue}>{phase.restPeriods}</Text>
              </View>
              <View style={styles.phaseDetailItem}>
                <Text style={styles.phaseDetailLabel}>RPE</Text>
                <Text style={styles.phaseDetailValue}>{phase.rpe}</Text>
              </View>
            </View>
            {phase.tips && phase.tips.length > 0 && (
              <View style={styles.phaseTips}>
                {phase.tips.map((tip, tIdx) => (
                  <View key={tIdx} style={styles.phaseTipRow}>
                    <View style={styles.phaseTipDot} />
                    <Text style={styles.phaseTipText}>{tip}</Text>
                  </View>
                ))}
              </View>
            )}
          </LinearGradient>
        </ReAnimated.View>
      ))}

      {/* Estimated Calories */}
      <View style={styles.calorieEstimate}>
        <Zap size={16} color={Colors.secondary} />
        <Text style={styles.calorieEstimateText}>
          Est. {plan.estimatedCaloriesBurnedPerWeek} cal/week burned
        </Text>
      </View>
    </ReAnimated.View>
  );
}

// ============================================================
// Supplement Card Component
// ============================================================
function SupplementCard({ supplement }) {
  const gradeColor = getEvidenceColor(supplement.evidenceLevel);

  return (
    <LinearGradient colors={Gradients.card} style={styles.supplementCard}>
      <View style={styles.supplementHeader}>
        <Text style={styles.supplementName} numberOfLines={1}>
          {supplement.name}
        </Text>
        <View style={[styles.gradeBadge, { backgroundColor: gradeColor + '20' }]}>
          <Text style={[styles.gradeBadgeText, { color: gradeColor }]}>
            {supplement.evidenceLevel}
          </Text>
        </View>
      </View>
      <Text style={styles.supplementDosage}>{supplement.dosage}</Text>
      <Text style={styles.supplementTiming}>{supplement.timing}</Text>
      <View style={styles.supplementBenefits}>
        {supplement.benefits.slice(0, 3).map((benefit, idx) => (
          <View key={idx} style={styles.benefitRow}>
            <View style={[styles.benefitDot, { backgroundColor: gradeColor }]} />
            <Text style={styles.benefitText} numberOfLines={1}>
              {benefit}
            </Text>
          </View>
        ))}
      </View>
    </LinearGradient>
  );
}

// ============================================================
// Main Screen
// ============================================================
function AICoachingScreenInner() {
  const router = useRouter();
  const { profile } = useProfile();
  const { levelInfo, totalXP } = useGamification();

  // ---- Training Plan Generator State ----
  const [experienceLevel, setExperienceLevel] = useState('Intermediate');
  const [goal, setGoal] = useState('Hypertrophy');
  const [daysPerWeek, setDaysPerWeek] = useState(4);
  const [generatedPlan, setGeneratedPlan] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // ---- Deload Assessment State ----
  const [deloadResult, setDeloadResult] = useState(null);

  // ---- Injury Prevention State ----
  const [selectedBodyArea, setSelectedBodyArea] = useState('shoulders');
  const injuryPlan = useMemo(() => {
    return getInjuryPreventionPlan([selectedBodyArea]);
  }, [selectedBodyArea]);

  // ---- Plateau Breakers State ----
  const [plateauCategory, setPlateauCategory] = useState('Strength');
  const plateauStrategies = useMemo(() => {
    return getPlateauBreakers(PLATEAU_MAP[plateauCategory] || 'strength');
  }, [plateauCategory]);

  // ---- Supplement Guide ----
  const supplements = useMemo(() => {
    return Object.values(SUPPLEMENT_DATABASE);
  }, []);

  // ---- Auto-evaluate deload on mount ----
  useEffect(() => {
    const result = evaluateDeloadNeed({
      weeksSinceDeload: 5,
      sleepQuality: 6,
      performanceTrend: 'stable',
      mood: 6,
      soreness: 4,
      motivation: 6,
    });
    setDeloadResult(result);
  }, []);

  // ---- Handlers ----
  const handleBack = useCallback(async () => {
    await hapticLight();
    router.back();
  }, [router]);

  const handleGeneratePlan = useCallback(async () => {
    await hapticImpact();
    setIsGenerating(true);

    // Simulate brief processing delay for UX
    setTimeout(() => {
      const levelMap = { Beginner: 1, Intermediate: 3, Advanced: 5 };
      const plan = generateTrainingPlan({
        goal: GOAL_MAP[goal] || 'hypertrophy',
        level: levelMap[experienceLevel] || 3,
        daysPerWeek,
        weeksDuration: 12,
        equipment: profile?.equipment || [],
        injuries: profile?.injuries || '',
      });
      setGeneratedPlan(plan);
      setIsGenerating(false);
      hapticSuccess();
    }, 600);
  }, [experienceLevel, goal, daysPerWeek, profile]);

  // Deload insight type based on score
  const deloadInsightType = useMemo(() => {
    if (!deloadResult) return 'tip';
    if (deloadResult.score >= 70) return 'warning';
    if (deloadResult.score >= 50) return 'warning';
    return 'success';
  }, [deloadResult]);

  const deloadInsightTitle = useMemo(() => {
    if (!deloadResult) return 'Evaluating...';
    if (deloadResult.score >= 70) return 'Deload Recommended';
    if (deloadResult.score >= 50) return 'Consider a Deload';
    return 'Keep Training';
  }, [deloadResult]);

  // Current injury area data
  const currentAreaData = useMemo(() => {
    if (!injuryPlan || !injuryPlan.plans) return null;
    const areaKey = selectedBodyArea;
    return injuryPlan.plans[areaKey] || null;
  }, [injuryPlan, selectedBodyArea]);

  return (
    <ScreenWrapper>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ============================================ */}
        {/* Header */}
        {/* ============================================ */}
        <ReAnimated.View
          entering={FadeInDown.delay(0).springify().mass(0.5).damping(10)}
          style={styles.header}
        >
          <Pressable style={styles.backButton} onPress={handleBack}>
            <ArrowLeft size={22} color={Colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>AI Coach</Text>
          <View style={styles.headerIcon}>
            <Brain size={22} color={Colors.primary} />
          </View>
        </ReAnimated.View>

        {/* ============================================ */}
        {/* Section 1: Training Plan Generator */}
        {/* ============================================ */}
        <ReAnimated.View
          entering={FadeInDown.delay(100).springify().mass(0.5).damping(10)}
        >
          <View style={styles.sectionHeader}>
            <Dumbbell size={18} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Training Plan Generator</Text>
          </View>

          <GlassCard style={styles.sectionCard}>
            {/* Experience Level */}
            <Text style={styles.fieldLabel}>Experience Level</Text>
            <PillSelector
              options={EXPERIENCE_LEVELS}
              selected={experienceLevel}
              onSelect={setExperienceLevel}
            />

            {/* Goal */}
            <Text style={[styles.fieldLabel, { marginTop: Spacing.md }]}>Goal</Text>
            <PillSelector
              options={GOAL_OPTIONS}
              selected={goal}
              onSelect={setGoal}
            />

            {/* Days Per Week */}
            <DaysSlider value={daysPerWeek} onChange={setDaysPerWeek} />

            {/* Generate Button */}
            <Pressable
              onPress={handleGeneratePlan}
              disabled={isGenerating}
              style={styles.generateButtonWrap}
            >
              <LinearGradient
                colors={Gradients.primary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[
                  styles.generateButton,
                  isGenerating && { opacity: 0.6 },
                ]}
              >
                {isGenerating ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <>
                    <Target size={18} color="#000" />
                    <Text style={styles.generateButtonText}>Generate Plan</Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>
          </GlassCard>

          {/* Generated Plan Display */}
          {generatedPlan && <TrainingPlanDisplay plan={generatedPlan} />}
        </ReAnimated.View>

        {/* ============================================ */}
        {/* Section 2: Deload Assessment */}
        {/* ============================================ */}
        <ReAnimated.View
          entering={FadeInDown.delay(200).springify().mass(0.5).damping(10)}
        >
          <View style={[styles.sectionHeader, { marginTop: Spacing.xl }]}>
            <Shield size={18} color={Colors.warning} />
            <Text style={styles.sectionTitle}>Deload Assessment</Text>
          </View>

          <GlassCard style={styles.sectionCard}>
            {deloadResult ? (
              <View style={styles.deloadContent}>
                <View style={styles.deloadRingRow}>
                  <AnimatedProgressRing score={deloadResult.score} />
                  <View style={styles.deloadInfo}>
                    <Text style={styles.deloadScoreLabel}>Fatigue Score</Text>
                    <Text
                      style={[
                        styles.deloadUrgency,
                        {
                          color:
                            deloadResult.urgency === 'high'
                              ? Colors.error
                              : deloadResult.urgency === 'moderate'
                              ? Colors.warning
                              : Colors.success,
                        },
                      ]}
                    >
                      {deloadResult.urgency.charAt(0).toUpperCase() +
                        deloadResult.urgency.slice(1)}{' '}
                      Urgency
                    </Text>
                    {deloadResult.reasons.map((reason, idx) => (
                      <View key={idx} style={styles.deloadReasonRow}>
                        <View style={styles.deloadReasonDot} />
                        <Text style={styles.deloadReasonText}>{reason}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                <InsightCard
                  type={deloadInsightType}
                  title={deloadInsightTitle}
                  body={deloadResult.recommendation}
                />
              </View>
            ) : (
              <View style={styles.loadingSection}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.loadingText}>Evaluating...</Text>
              </View>
            )}
          </GlassCard>
        </ReAnimated.View>

        {/* ============================================ */}
        {/* Section 3: Injury Prevention */}
        {/* ============================================ */}
        <ReAnimated.View
          entering={FadeInDown.delay(300).springify().mass(0.5).damping(10)}
        >
          <View style={[styles.sectionHeader, { marginTop: Spacing.xl }]}>
            <Shield size={18} color={Colors.success} />
            <Text style={styles.sectionTitle}>Injury Prevention</Text>
          </View>

          {/* Body Area Selector */}
          <PillSelector
            options={BODY_AREAS.map((a) => a.label)}
            selected={
              BODY_AREAS.find((a) => a.key === selectedBodyArea)?.label || 'Shoulder'
            }
            onSelect={(label) => {
              const area = BODY_AREAS.find((a) => a.label === label);
              if (area) setSelectedBodyArea(area.key);
            }}
            style={{ marginBottom: Spacing.md }}
          />

          <GlassCard style={styles.sectionCard}>
            {currentAreaData ? (
              <>
                {/* Risk Factors */}
                <Text style={styles.injurySubheading}>Risk Factors</Text>
                {currentAreaData.riskFactors.map((factor, idx) => (
                  <View key={idx} style={styles.injuryFactorRow}>
                    <View
                      style={[
                        styles.injuryFactorDot,
                        { backgroundColor: Colors.warning },
                      ]}
                    />
                    <Text style={styles.injuryFactorText}>{factor}</Text>
                  </View>
                ))}

                {/* Warm-Up Focus */}
                <View style={styles.warmUpBanner}>
                  <Zap size={14} color={Colors.primary} />
                  <Text style={styles.warmUpText}>
                    Warm-Up Focus: {currentAreaData.warmUpFocus}
                  </Text>
                </View>

                {/* Preventive Exercises */}
                <Text style={[styles.injurySubheading, { marginTop: Spacing.md }]}>
                  Mobility & Stretches
                </Text>
                {currentAreaData.preventiveExercises.map((exercise, idx) => (
                  <ReAnimated.View
                    key={exercise}
                    entering={FadeInDown.delay(idx * 60)
                      .springify()
                      .mass(0.5)
                      .damping(10)}
                  >
                    <LinearGradient
                      colors={Gradients.card}
                      style={styles.exerciseCard}
                    >
                      <View style={styles.exerciseIndex}>
                        <Text style={styles.exerciseIndexText}>{idx + 1}</Text>
                      </View>
                      <View style={styles.exerciseContent}>
                        <Text style={styles.exerciseName}>{exercise}</Text>
                        <Text style={styles.exerciseDuration}>
                          30-60 seconds hold / 10-15 reps
                        </Text>
                        <Text style={styles.exerciseDesc}>
                          Perform with controlled movement. Focus on breathing and
                          maintaining proper form throughout.
                        </Text>
                      </View>
                    </LinearGradient>
                  </ReAnimated.View>
                ))}

                {/* Exercises to Modify */}
                {currentAreaData.exercises_to_modify &&
                  currentAreaData.exercises_to_modify.length > 0 && (
                    <InsightCard
                      type="warning"
                      title="Modify With Caution"
                      body={`Consider modifying: ${currentAreaData.exercises_to_modify.join(
                        ', '
                      )}. Use lighter weight and full range of motion.`}
                    />
                  )}
              </>
            ) : (
              <Text style={styles.emptyText}>
                Select a body area to see prevention exercises.
              </Text>
            )}
          </GlassCard>

          {/* General Tips */}
          {injuryPlan?.generalTips && (
            <ReAnimated.View
              entering={FadeInDown.delay(400).springify().mass(0.5).damping(10)}
            >
              <InsightCard
                type="tip"
                title="General Injury Prevention"
                body={injuryPlan.generalTips.slice(0, 4).join(' | ')}
              />
            </ReAnimated.View>
          )}
        </ReAnimated.View>

        {/* ============================================ */}
        {/* Section 4: Plateau Breakers */}
        {/* ============================================ */}
        <ReAnimated.View
          entering={FadeInDown.delay(400).springify().mass(0.5).damping(10)}
        >
          <View style={[styles.sectionHeader, { marginTop: Spacing.xl }]}>
            <TrendingUp size={18} color={Colors.secondary} />
            <Text style={styles.sectionTitle}>Plateau Breakers</Text>
          </View>

          {/* Category Tabs */}
          <PillSelector
            options={PLATEAU_CATEGORIES}
            selected={plateauCategory}
            onSelect={setPlateauCategory}
            style={{ marginBottom: Spacing.md }}
          />

          {plateauStrategies.map((strategy, idx) => (
            <ReAnimated.View
              key={strategy.name}
              entering={FadeInDown.delay(idx * 80)
                .springify()
                .mass(0.5)
                .damping(10)}
            >
              <InsightCard
                type="tip"
                title={strategy.name}
                body={`${strategy.description}\n\nHow to implement: ${strategy.implementation}`}
                actionLabel="Try This"
                onAction={async () => {
                  await hapticSuccess();
                }}
              />
            </ReAnimated.View>
          ))}
        </ReAnimated.View>

        {/* ============================================ */}
        {/* Section 5: Supplement Guide */}
        {/* ============================================ */}
        <ReAnimated.View
          entering={FadeInDown.delay(500).springify().mass(0.5).damping(10)}
        >
          <View style={[styles.sectionHeader, { marginTop: Spacing.xl }]}>
            <Pill size={18} color={Colors.accentPurple} />
            <Text style={styles.sectionTitle}>Supplement Guide</Text>
          </View>

          <View style={styles.supplementGrid}>
            {supplements.map((supplement, idx) => (
              <ReAnimated.View
                key={supplement.name}
                entering={FadeInDown.delay(550 + idx * 60)
                  .springify()
                  .mass(0.5)
                  .damping(10)}
                style={styles.supplementGridItem}
              >
                <SupplementCard supplement={supplement} />
              </ReAnimated.View>
            ))}
          </View>

          {/* Evidence Grade Legend */}
          <LinearGradient colors={Gradients.card} style={styles.legendCard}>
            <Text style={styles.legendTitle}>Evidence Grades</Text>
            <View style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: Colors.success }]} />
              <Text style={styles.legendText}>A / A+ - Strong clinical evidence</Text>
            </View>
            <View style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: Colors.warning }]} />
              <Text style={styles.legendText}>B / B+ - Moderate evidence</Text>
            </View>
            <View style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: '#FF8C42' }]} />
              <Text style={styles.legendText}>C - Limited or emerging evidence</Text>
            </View>
          </LinearGradient>
        </ReAnimated.View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </ScreenWrapper>
  );
}

// ============================================================
// Styles
// ============================================================
const styles = StyleSheet.create({
  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xxl,
  },

  // Header
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
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Section Headers
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionCard: {
    marginBottom: Spacing.md,
  },

  // Field Labels
  fieldLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },

  // Pill Selector
  pillRow: {
    flexGrow: 0,
  },
  pillRowContent: {
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  pill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceGlass,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pillActive: {
    backgroundColor: Colors.primarySoft,
    borderColor: Colors.primary,
  },
  pillText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
  },
  pillTextActive: {
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
  },

  // Days Slider
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  sliderLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
  },
  sliderButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  sliderButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surfaceGlass,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sliderButtonActive: {
    backgroundColor: Colors.primarySoft,
    borderColor: Colors.primary,
  },
  sliderButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
  },
  sliderButtonTextActive: {
    color: Colors.primary,
  },

  // Generate Button
  generateButtonWrap: {
    marginTop: Spacing.xs,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: 14,
    borderRadius: BorderRadius.lg,
    ...Shadows.button,
  },
  generateButtonText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: '#000',
  },

  // Training Plan Display
  planSubheading: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  splitDayCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  splitDayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  dayBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  dayBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  splitDayFocus: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    flex: 1,
  },
  muscleChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  muscleChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  muscleChipText: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    textTransform: 'capitalize',
  },

  // Phase Cards
  phaseCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  phaseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  phaseName: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  phaseWeeks: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
    backgroundColor: Colors.primarySoft,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  phaseFocus: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  phaseDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  phaseDetailItem: {
    flex: 1,
    minWidth: (SCREEN_WIDTH - Spacing.md * 4) / 2 - Spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
  },
  phaseDetailLabel: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginBottom: 2,
  },
  phaseDetailValue: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  phaseTips: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    paddingTop: Spacing.sm,
    gap: Spacing.xs,
  },
  phaseTipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  phaseTipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    marginTop: 6,
  },
  phaseTipText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    flex: 1,
    lineHeight: 18,
  },

  // Calorie Estimate
  calorieEstimate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    justifyContent: 'center',
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  calorieEstimateText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.secondary,
  },

  // Deload Assessment
  deloadContent: {
    gap: Spacing.md,
  },
  deloadRingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  ringContainer: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringScoreValue: {
    fontSize: 36,
    fontWeight: FontWeight.black,
    letterSpacing: -1,
  },
  ringScoreLabel: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  deloadInfo: {
    flex: 1,
    gap: Spacing.xs,
  },
  deloadScoreLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
  },
  deloadUrgency: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  deloadReasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  deloadReasonDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.textTertiary,
  },
  deloadReasonText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    flex: 1,
  },

  // Injury Prevention
  injurySubheading: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  injuryFactorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  injuryFactorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  injuryFactorText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    flex: 1,
  },
  warmUpBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primarySoft,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    marginTop: Spacing.sm,
  },
  warmUpText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.primary,
    flex: 1,
  },
  exerciseCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    gap: Spacing.md,
  },
  exerciseIndex: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exerciseIndexText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  exerciseContent: {
    flex: 1,
  },
  exerciseName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginBottom: 2,
  },
  exerciseDuration: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Colors.primary,
    marginBottom: 4,
  },
  exerciseDesc: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    lineHeight: 18,
  },
  emptyText: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    textAlign: 'center',
    paddingVertical: Spacing.lg,
  },

  // Supplement Guide
  supplementGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  supplementGridItem: {
    width: (SCREEN_WIDTH - Spacing.md * 2 - Spacing.sm) / 2,
  },
  supplementCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    minHeight: 180,
  },
  supplementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  supplementName: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    flex: 1,
  },
  gradeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  gradeBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  supplementDosage: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Colors.primary,
    marginBottom: 2,
  },
  supplementTiming: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginBottom: Spacing.sm,
  },
  supplementBenefits: {
    gap: 3,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  benefitDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  benefitText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    flex: 1,
  },

  // Legend Card
  legendCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginTop: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  legendTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },

  // Loading
  loadingSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
  },
  loadingText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },

  // Bottom Spacer
  bottomSpacer: {
    height: 80,
  },
});

export default function AICoachingScreen(props) {
  return (
    <ScreenErrorBoundary screenName="AICoachingScreen">
      <AICoachingScreenInner {...props} />
    </ScreenErrorBoundary>
  );
}

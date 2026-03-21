import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Dimensions,
  Platform,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Keyboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import ReAnimated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  SlideInRight,
  SlideOutLeft,
  SlideInLeft,
  SlideOutRight,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import {
  Dumbbell,
  Heart,
  Trophy,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Check,
  Utensils,
  Wheat,
  Droplets,
  ChevronRight,
  Flame,
  TrendingDown,
  Minus,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { hapticImpact, hapticHeavy } from '../../lib/haptics';
import { useProfile } from '../../context/ProfileContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  recordOnboardingCompleted,
  recordOnboardingStarted,
} from '../../lib/activationTracker';
import { Colors, Gradients, Spacing, BorderRadius, FontSize, FontWeight, Shadows } from '../../constants/theme';
import MyFitnessPalImportCard from '../../components/MyFitnessPalImportCard';
import {
  ONBOARDING_STEP_COUNT,
  buildStarterPlan,
  canContinueOnboardingStep,
  sanitizeDecimalInput,
  sanitizeIntegerInput,
} from '../../lib/onboardingFlow';
import { recordAppInteractive } from '../../lib/startupTrace';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TOTAL_STEPS = ONBOARDING_STEP_COUNT;

// ---------------------------------------------------------------------------
// Data Constants
// ---------------------------------------------------------------------------

const GOALS = [
  {
    id: 'lose',
    label: 'Lose Weight',
    subtitle: 'Burn fat, get lean',
    icon: TrendingDown,
    color: '#FF6B35',
    gradient: ['#FF6B35', '#FF8F5A'],
  },
  {
    id: 'build',
    label: 'Build Muscle',
    subtitle: 'Gain strength and size',
    icon: Dumbbell,
    color: '#00E676',
    gradient: ['#00E676', '#00C853'],
  },
  {
    id: 'maintain',
    label: 'Maintain Weight',
    subtitle: 'Stay healthy and balanced',
    icon: Minus,
    color: '#00D4FF',
    gradient: ['#00D4FF', '#0099CC'],
  },
  {
    id: 'health',
    label: 'Improve Health',
    subtitle: 'Better energy and wellness',
    icon: Heart,
    color: '#FF6B9D',
    gradient: ['#FF6B9D', '#FF8A80'],
  },
  {
    id: 'athletic',
    label: 'Athletic Performance',
    subtitle: 'Train for competition',
    icon: Trophy,
    color: '#FFD700',
    gradient: ['#FFD700', '#FFC107'],
  },
];

const ACTIVITY_OPTIONS = [
  { id: 'sedentary', label: 'Sedentary', description: 'Desk job, little to no exercise', multiplier: 1.2 },
  { id: 'light', label: 'Lightly Active', description: 'Light walks, 1-3 days exercise/week', multiplier: 1.375 },
  { id: 'moderate', label: 'Moderately Active', description: '3-5 days moderate exercise/week', multiplier: 1.55 },
  { id: 'active', label: 'Very Active', description: 'Hard training 6-7 days/week', multiplier: 1.725 },
  { id: 'extreme', label: 'Extremely Active', description: 'Athlete or physical labor job', multiplier: 1.9 },
];

// ---------------------------------------------------------------------------
// Reusable Sub-Components
// ---------------------------------------------------------------------------

function ProgressBar({ step, total }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(step / total, { duration: 400, easing: Easing.out(Easing.cubic) });
  }, [progress, step, total]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressTrack}>
        <ReAnimated.View style={[styles.progressFill, barStyle]}>
          <LinearGradient
            colors={Gradients.electric}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </ReAnimated.View>
      </View>
      <Text style={styles.progressText}>Step {step} of {total}</Text>
    </View>
  );
}

function StepHeader({ title, subtitle }) {
  return (
    <ReAnimated.View entering={FadeInDown.duration(400).springify()} style={styles.stepHeader}>
      <Text style={styles.stepTitle}>{title}</Text>
      {subtitle ? <Text style={styles.stepSubtitle}>{subtitle}</Text> : null}
    </ReAnimated.View>
  );
}

function GoalCard({ item, selected, onPress, index }) {
  const Icon = item.icon;
  const isSelected = selected === item.id;

  return (
    <ReAnimated.View entering={FadeInDown.delay(index * 80).duration(400).springify()}>
      <Pressable
        onPress={() => { hapticImpact(); onPress(item.id); }}
        hitSlop={2}
        style={[styles.goalCard, isSelected && styles.goalCardSelected]}
      >
        {isSelected && (
          <LinearGradient
            colors={[`${item.color}20`, `${item.color}08`]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        )}
        <View style={[styles.goalIconWrap, { backgroundColor: `${item.color}18` }]}>
          <Icon size={24} color={item.color} />
        </View>
        <View style={styles.goalTextWrap}>
          <Text style={[styles.goalLabel, isSelected && { color: item.color }]}>{item.label}</Text>
          <Text style={styles.goalSubtitle}>{item.subtitle}</Text>
        </View>
        {isSelected && (
          <View style={[styles.goalCheck, { backgroundColor: item.color }]}>
            <Check size={14} color="#fff" strokeWidth={3} />
          </View>
        )}
      </Pressable>
    </ReAnimated.View>
  );
}

function OptionButton({ label, description, selected, onPress, index }) {
  return (
    <ReAnimated.View entering={FadeInDown.delay(index * 60).duration(350).springify()}>
      <Pressable
        onPress={() => { hapticImpact(); onPress(); }}
        hitSlop={4}
        style={[styles.optionBtn, selected && styles.optionBtnSelected]}
      >
        <View style={{ flex: 1 }}>
          <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>{label}</Text>
          {description ? <Text style={styles.optionDesc}>{description}</Text> : null}
        </View>
        {selected && (
          <View style={styles.optionCheck}>
            <Check size={14} color="#fff" strokeWidth={3} />
          </View>
        )}
      </Pressable>
    </ReAnimated.View>
  );
}

// ---------------------------------------------------------------------------
// Step Components
// ---------------------------------------------------------------------------

function Step1Welcome({ data, onGoalSelect }) {
  return (
    <ScrollView
      style={styles.stepScroll}
      contentContainerStyle={styles.stepContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
    >
      <ReAnimated.View entering={FadeInDown.duration(500).springify()} style={styles.welcomeHeader}>
        <View style={styles.logoRow}>
          <Sparkles size={32} color={Colors.primary} />
          <Text style={styles.welcomeLogo}>FuelIQ</Text>
        </View>
        <Text style={styles.welcomeTagline}>
          Log food fast. Know what to do today.
        </Text>
      </ReAnimated.View>

      <StepHeader
        title="What do you want to improve first?"
        subtitle="We'll turn this into clear calorie and protein targets for today"
      />

      {GOALS.map((item, index) => (
        <GoalCard
          key={item.id}
          item={item}
          selected={data.goal}
          onPress={onGoalSelect}
          index={index}
        />
      ))}
    </ScrollView>
  );
}

function Step2BodyProfile({ data, onChange }) {
  const [isMetric, setIsMetric] = useState(data.heightUnit === 'cm');
  const scrollRef = useRef(null);
  const fieldPositions = useRef({});
  const ageInputRef = useRef(null);
  const heightCmInputRef = useRef(null);
  const heightFtInputRef = useRef(null);
  const heightInInputRef = useRef(null);
  const weightInputRef = useRef(null);
  const goalWeightInputRef = useRef(null);

  useEffect(() => {
    setIsMetric(data.heightUnit === 'cm');
  }, [data.heightUnit]);

  const toggleUnit = useCallback((metric) => {
    setIsMetric(metric);
    onChange({ heightUnit: metric ? 'cm' : 'ft', weightUnit: metric ? 'kg' : 'lbs' });
    hapticImpact();
  }, [onChange]);

  const scrollToField = useCallback((fieldKey) => {
    requestAnimationFrame(() => {
      const nextY = Math.max((fieldPositions.current[fieldKey] || 0) - 24, 0);
      scrollRef.current?.scrollTo({ y: nextY, animated: true });
    });
  }, []);

  const registerField = useCallback((fieldKey) => (event) => {
    fieldPositions.current[fieldKey] = event.nativeEvent.layout.y;
  }, []);

  const focusNext = useCallback((ref) => {
    ref?.current?.focus?.();
  }, []);

  // Convert for display
  const displayWeight = useMemo(() => {
    if (!data.weightRaw) return '';
    return data.weightRaw;
  }, [data.weightRaw]);

  const displayGoalWeight = useMemo(() => {
    if (!data.goalWeightRaw) return '';
    return data.goalWeightRaw;
  }, [data.goalWeightRaw]);

  const weightDiff = useMemo(() => {
    if (!data.weightRaw || !data.goalWeightRaw) return null;
    const diff = parseFloat(data.goalWeightRaw) - parseFloat(data.weightRaw);
    return diff;
  }, [data.weightRaw, data.goalWeightRaw]);

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.stepScroll}
      contentContainerStyle={styles.stepContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      onScrollBeginDrag={Keyboard.dismiss}
    >
      <StepHeader title="Set your daily targets" subtitle="These details make your calorie and protein goals trustworthy" />

      {/* Gender */}
      <Text style={styles.fieldLabel}>Gender</Text>
      <View style={styles.genderRow}>
        {['male', 'female', 'other'].map((g) => (
          <Pressable
            key={g}
            onPress={() => { hapticImpact(); onChange({ gender: g }); }}
            style={[styles.genderBtn, data.gender === g && styles.genderBtnActive]}
          >
            <Text style={[styles.genderText, data.gender === g && styles.genderTextActive]}>
              {g === 'other' ? 'Prefer not to say' : g.charAt(0).toUpperCase() + g.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* DOB / Age */}
      <Text style={styles.fieldLabel}>Age</Text>
      <View style={styles.inputWrap} onLayout={registerField('age')}>
        <TextInput
          ref={ageInputRef}
          style={styles.textInput}
          placeholder="e.g. 28"
          placeholderTextColor={Colors.textTertiary}
          keyboardType="number-pad"
          value={data.ageStr}
          onFocus={() => scrollToField('age')}
          onChangeText={(v) => onChange({ ageStr: sanitizeIntegerInput(v, 3) })}
          maxLength={3}
          returnKeyType="next"
          blurOnSubmit={false}
          onSubmitEditing={() => {
            if (isMetric) {
              focusNext(heightCmInputRef);
              return;
            }
            focusNext(heightFtInputRef);
          }}
        />
        <Text style={styles.inputSuffix}>years</Text>
      </View>

      {/* Unit toggle */}
      <View style={styles.unitToggleWrap}>
        <Pressable
          style={[styles.unitBtn, !isMetric && styles.unitBtnActive]}
          onPress={() => toggleUnit(false)}
        >
          <Text style={[styles.unitBtnText, !isMetric && styles.unitBtnTextActive]}>Imperial</Text>
        </Pressable>
        <Pressable
          style={[styles.unitBtn, isMetric && styles.unitBtnActive]}
          onPress={() => toggleUnit(true)}
        >
          <Text style={[styles.unitBtnText, isMetric && styles.unitBtnTextActive]}>Metric</Text>
        </Pressable>
      </View>

      {/* Height */}
      <Text style={styles.fieldLabel}>Height</Text>
      {isMetric ? (
        <View style={styles.inputWrap} onLayout={registerField('height')}>
          <TextInput
            ref={heightCmInputRef}
            style={styles.textInput}
            placeholder="175"
            placeholderTextColor={Colors.textTertiary}
            keyboardType="number-pad"
            value={data.heightCm}
            onFocus={() => scrollToField('height')}
            onChangeText={(v) => onChange({ heightCm: sanitizeIntegerInput(v, 3) })}
            maxLength={3}
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => focusNext(weightInputRef)}
          />
          <Text style={styles.inputSuffix}>cm</Text>
        </View>
      ) : (
        <View style={styles.heightRow}>
          <View style={[styles.inputWrap, { flex: 1 }]} onLayout={registerField('height')}>
            <TextInput
              ref={heightFtInputRef}
              style={styles.textInput}
              placeholder="5"
              placeholderTextColor={Colors.textTertiary}
              keyboardType="number-pad"
              value={data.heightFt}
              onFocus={() => scrollToField('height')}
              onChangeText={(v) => onChange({ heightFt: sanitizeIntegerInput(v, 1) })}
              maxLength={1}
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => focusNext(heightInInputRef)}
            />
            <Text style={styles.inputSuffix}>ft</Text>
          </View>
          <View style={[styles.inputWrap, { flex: 1 }]}>
            <TextInput
              ref={heightInInputRef}
              style={styles.textInput}
              placeholder="10"
              placeholderTextColor={Colors.textTertiary}
              keyboardType="number-pad"
              value={data.heightIn}
              onFocus={() => scrollToField('height')}
              onChangeText={(v) => onChange({ heightIn: sanitizeIntegerInput(v, 2) })}
              maxLength={2}
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => focusNext(weightInputRef)}
            />
            <Text style={styles.inputSuffix}>in</Text>
          </View>
        </View>
      )}

      {/* Current weight */}
      <Text style={styles.fieldLabel}>Current Weight</Text>
      <View style={styles.inputWrap} onLayout={registerField('weight')}>
        <TextInput
          ref={weightInputRef}
          style={styles.textInput}
          placeholder={isMetric ? '80' : '176'}
          placeholderTextColor={Colors.textTertiary}
          keyboardType="decimal-pad"
          value={displayWeight}
          onFocus={() => scrollToField('weight')}
          onChangeText={(v) => onChange({ weightRaw: sanitizeDecimalInput(v) })}
          maxLength={6}
          returnKeyType="next"
          blurOnSubmit={false}
          onSubmitEditing={() => focusNext(goalWeightInputRef)}
        />
        <Text style={styles.inputSuffix}>{isMetric ? 'kg' : 'lbs'}</Text>
      </View>

      {/* Goal weight */}
      <Text style={styles.fieldLabel}>Goal Weight</Text>
      <View style={styles.inputWrap} onLayout={registerField('goalWeight')}>
        <TextInput
          ref={goalWeightInputRef}
          style={styles.textInput}
          placeholder={isMetric ? '75' : '165'}
          placeholderTextColor={Colors.textTertiary}
          keyboardType="decimal-pad"
          value={displayGoalWeight}
          onFocus={() => scrollToField('goalWeight')}
          onChangeText={(v) => onChange({ goalWeightRaw: sanitizeDecimalInput(v) })}
          maxLength={6}
          returnKeyType="done"
          onSubmitEditing={() => Keyboard.dismiss()}
        />
        <Text style={styles.inputSuffix}>{isMetric ? 'kg' : 'lbs'}</Text>
      </View>

      {weightDiff !== null && (
        <ReAnimated.View entering={FadeIn.duration(300)} style={styles.weightDiffBadge}>
          <Text style={[styles.weightDiffText, { color: weightDiff < 0 ? Colors.success : weightDiff > 0 ? Colors.secondary : Colors.primary }]}>
            {weightDiff > 0 ? '+' : ''}{weightDiff.toFixed(1)} {isMetric ? 'kg' : 'lbs'} {weightDiff < 0 ? 'to lose' : weightDiff > 0 ? 'to gain' : 'on target'}
          </Text>
        </ReAnimated.View>
      )}

      {/* Activity level */}
      <Text style={styles.fieldLabel}>Activity Level</Text>
      {ACTIVITY_OPTIONS.map((opt, index) => (
        <OptionButton
          key={opt.id}
          label={opt.label}
          description={opt.description}
          selected={data.activityLevel === opt.id}
          onPress={() => onChange({ activityLevel: opt.id })}
          index={index}
        />
      ))}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function Step6Generation({ data, onComplete, onImport, onQuickLog }) {
  const results = useMemo(() => buildStarterPlan(data), [data]);

  return (
    <ScrollView
      style={styles.stepScroll}
      contentContainerStyle={[styles.stepContent, { alignItems: 'center' }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
    >
      <ReAnimated.View entering={FadeInDown.duration(600).springify()} style={styles.resultsHeader}>
        <View style={styles.resultsCheckCircle}>
          <Check size={32} color="#fff" strokeWidth={3} />
        </View>
        <Text style={styles.resultsTitle}>Starter targets, ready now</Text>
        <Text style={styles.resultsSubtitle}>
          You can fine-tune reminders and preferences later. Today only needs one clean first action.
        </Text>
      </ReAnimated.View>

      <View style={styles.resultsGrid}>
        <ReAnimated.View entering={FadeInDown.delay(100).duration(400).springify()} style={styles.resultCard}>
          <LinearGradient colors={['rgba(0,212,255,0.12)', 'rgba(0,212,255,0.03)']} style={StyleSheet.absoluteFill} />
          <Flame size={22} color={Colors.secondary} />
          <Text style={styles.resultValue}>{results.calories}</Text>
          <Text style={styles.resultLabel}>Daily Calories</Text>
        </ReAnimated.View>

        <ReAnimated.View entering={FadeInDown.delay(200).duration(400).springify()} style={styles.resultCard}>
          <LinearGradient colors={['rgba(255,107,157,0.12)', 'rgba(255,107,157,0.03)']} style={StyleSheet.absoluteFill} />
          <Dumbbell size={22} color={Colors.protein} />
          <Text style={styles.resultValue}>{results.macros.protein}g</Text>
          <Text style={styles.resultLabel}>Protein</Text>
        </ReAnimated.View>

        <ReAnimated.View entering={FadeInDown.delay(300).duration(400).springify()} style={styles.resultCard}>
          <LinearGradient colors={['rgba(100,210,255,0.12)', 'rgba(100,210,255,0.03)']} style={StyleSheet.absoluteFill} />
          <Wheat size={22} color={Colors.carbs} />
          <Text style={styles.resultValue}>{results.macros.carbs}g</Text>
          <Text style={styles.resultLabel}>Carbs</Text>
        </ReAnimated.View>

        <ReAnimated.View entering={FadeInDown.delay(400).duration(400).springify()} style={styles.resultCard}>
          <LinearGradient colors={['rgba(255,217,61,0.12)', 'rgba(255,217,61,0.03)']} style={StyleSheet.absoluteFill} />
          <Droplets size={22} color={Colors.fat} />
          <Text style={styles.resultValue}>{results.macros.fat}g</Text>
          <Text style={styles.resultLabel}>Fat</Text>
        </ReAnimated.View>
      </View>

      <ReAnimated.View entering={FadeInDown.delay(500).duration(400).springify()} style={styles.macroBar}>
        <View style={[styles.macroSegment, { flex: results.macros.proteinPct, backgroundColor: Colors.protein, borderTopLeftRadius: 6, borderBottomLeftRadius: 6 }]} />
        <View style={[styles.macroSegment, { flex: results.macros.carbsPct, backgroundColor: Colors.carbs }]} />
        <View style={[styles.macroSegment, { flex: results.macros.fatPct, backgroundColor: Colors.fat, borderTopRightRadius: 6, borderBottomRightRadius: 6 }]} />
      </ReAnimated.View>
      <View style={styles.macroLegend}>
        <View style={styles.macroLegendItem}>
          <View style={[styles.macroLegendDot, { backgroundColor: Colors.protein }]} />
          <Text style={styles.macroLegendText}>Protein {results.macros.proteinPct}%</Text>
        </View>
        <View style={styles.macroLegendItem}>
          <View style={[styles.macroLegendDot, { backgroundColor: Colors.carbs }]} />
          <Text style={styles.macroLegendText}>Carbs {results.macros.carbsPct}%</Text>
        </View>
        <View style={styles.macroLegendItem}>
          <View style={[styles.macroLegendDot, { backgroundColor: Colors.fat }]} />
          <Text style={styles.macroLegendText}>Fat {results.macros.fatPct}%</Text>
        </View>
      </View>

      <ReAnimated.View entering={FadeInDown.delay(600).duration(400).springify()} style={styles.resultInfoRow}>
        <Utensils size={20} color={Colors.primary} />
        <Text style={styles.resultInfoText}>Fast logging is live. The rest of setup can happen after your first day.</Text>
      </ReAnimated.View>

      <ReAnimated.View entering={FadeInUp.delay(700).duration(500).springify()} style={{ width: '100%', marginTop: Spacing.xl }}>
        <Pressable onPress={onComplete} style={styles.ctaButton}>
          <LinearGradient
            colors={Gradients.electric}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
          <Sparkles size={20} color="#fff" />
          <Text style={styles.ctaText}>Open Today</Text>
          <ArrowRight size={20} color="#fff" />
        </Pressable>
      </ReAnimated.View>

      <ReAnimated.View entering={FadeInUp.delay(740).duration(500).springify()} style={styles.secondaryCtaWrap}>
        <Pressable onPress={onQuickLog} style={styles.secondaryCtaButton}>
          <Text style={styles.secondaryCtaText}>Log first meal now</Text>
          <ChevronRight size={18} color={Colors.text} />
        </Pressable>
      </ReAnimated.View>

      <ReAnimated.View entering={FadeInUp.delay(780).duration(500).springify()} style={styles.resultsImportCardWrap}>
        <MyFitnessPalImportCard
          eyebrow="Coming From MyFitnessPal?"
          title="Bring your diary over first"
          body="Finish setup and import your meals before you start searching from scratch."
          buttonLabel="Finish and import"
          onPress={onImport}
          style={styles.resultsImportCard}
        />
      </ReAnimated.View>

      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

export default function OnboardingScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { updateProfile } = useProfile();
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState('forward');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    recordOnboardingStarted().catch(() => {});
  }, []);

  useEffect(() => {
    recordAppInteractive({ screen: 'onboarding' });
  }, []);

  // All onboarding data in one state
  const [data, setData] = useState({
    // Step 1
    goal: null,
    // Step 2
    gender: 'male',
    ageStr: '',
    heightUnit: 'ft',
    weightUnit: 'lbs',
    heightCm: '',
    heightFt: '',
    heightIn: '',
    weightRaw: '',
    goalWeightRaw: '',
    activityLevel: 'moderate',
    // Step 3
    dietType: 'Standard',
    allergies: [],
    mealsPerDay: 3,
    interestedInFasting: false,
    // Step 4
    experience: 'beginner',
    workoutTypes: [],
    equipment: [],
    daysPerWeek: 4,
    sessionDuration: 45,
    // Step 5
    enableMealReminders: true,
    enableWorkoutReminders: true,
    enableStreakWarnings: true,
    connectHealth: false,
    enableAI: true,
    waterGoal: 2500,
    enableFasting: false,
  });

  const onChange = useCallback((updates) => {
    setData((prev) => ({ ...prev, ...updates }));
  }, []);

  // Validation per step
  const canProceed = useMemo(() => canContinueOnboardingStep(step, data), [step, data]);

  const goNext = useCallback(() => {
    if (step < TOTAL_STEPS && canProceed) {
      Keyboard.dismiss();
      setDirection('forward');
      hapticImpact();
      setStep((s) => s + 1);
    }
  }, [step, canProceed]);

  const goBack = useCallback(() => {
    if (step > 1) {
      Keyboard.dismiss();
      setDirection('back');
      hapticImpact();
      setStep((s) => s - 1);
    }
  }, [step]);

  const handleGoalSelect = useCallback((goal) => {
    onChange({ goal });
    if (step !== 1) {
      return;
    }

    Keyboard.dismiss();
    setDirection('forward');
    hapticImpact();
    setStep(2);
  }, [onChange, step]);

  // Save everything and navigate to main app
  const completeOnboarding = useCallback(async (nextDestination) => {
    if (saving) return;
    setSaving(true);

    try {
      const starterPlan = buildStarterPlan(data);

      // Update ProfileContext state so isProfileComplete becomes true.
      // This sets local state immediately AND saves core fields to Supabase.
      await updateProfile(starterPlan.profileUpdates);

      // Save additional onboarding metadata to Supabase (non-blocking best-effort).
      // These are supplementary fields — the core profile is already saved above.
      if (user) {
        supabase
          .from('profiles')
          .update({
            onboarding_completed: true,
            onboarding_data: starterPlan.onboardingData,
          })
          .eq('user_id', user.id)
          .then(() => {})
          .catch(() => {});
      }

      hapticHeavy();
      await recordOnboardingCompleted();

      // Small delay to let React commit the profile state update before navigation,
      // ensuring ProfileAwareNav sees isProfileComplete = true when it evaluates.
      setTimeout(() => {
        router.replace(nextDestination || '/(tabs)');
      }, 50);
    } catch (err) {
      if (__DEV__) console.error('Onboarding complete error:', err);
      Alert.alert('Error', 'Failed to save your profile. Please try again.');
      setSaving(false);
    }
  }, [data, user, updateProfile, router, saving]);

  const completeOnboardingAndImport = useCallback(() => {
    completeOnboarding({
      pathname: '/import-myfitnesspal',
      params: {
        source: 'onboarding_completion',
      },
    });
  }, [completeOnboarding]);

  const completeOnboardingAndQuickLog = useCallback(() => {
    completeOnboarding({
      pathname: '/(tabs)/add',
      params: {
        focus: 'browse',
        source: 'onboarding_complete',
      },
    });
  }, [completeOnboarding]);

  // Choose entering/exiting animations based on direction
  const entering = direction === 'forward'
    ? SlideInRight.duration(350).springify().damping(18)
    : SlideInLeft.duration(350).springify().damping(18);

  const exiting = direction === 'forward'
    ? SlideOutLeft.duration(250)
    : SlideOutRight.duration(250);

  const renderStep = () => {
    switch (step) {
      case 1: return <Step1Welcome data={data} onGoalSelect={handleGoalSelect} />;
      case 2: return <Step2BodyProfile data={data} onChange={onChange} />;
      case 3:
        return (
          <Step6Generation
            data={data}
            onComplete={completeOnboarding}
            onImport={completeOnboardingAndImport}
            onQuickLog={completeOnboardingAndQuickLog}
          />
        );
      default: return null;
    }
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#0A0A12', '#060608', '#000000']}
        locations={[0, 0.4, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Subtle radial glow */}
      <LinearGradient
        colors={['rgba(0, 212, 255, 0.04)', 'transparent']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.5 }}
        style={styles.topGlow}
      />

      <StatusBar style="light" />

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
        >
          {/* Top navigation bar */}
          <View style={styles.navBar}>
            {step > 1 && step < TOTAL_STEPS ? (
              <Pressable onPress={goBack} style={styles.navBtn} hitSlop={12}>
                <ArrowLeft size={22} color={Colors.text} />
              </Pressable>
            ) : (
              <View style={styles.navBtn} />
            )}

            <ProgressBar step={step} total={TOTAL_STEPS} />

            {/* Empty right side for balance */}
            <View style={styles.navBtn} />
          </View>

          {/* Step content with animation */}
          <View style={styles.stepContainer}>
            <ReAnimated.View
              key={`step-${step}`}
              entering={entering}
              exiting={exiting}
              style={styles.stepAnimWrap}
            >
              {renderStep()}
            </ReAnimated.View>
          </View>

          {/* Bottom navigation (not shown on final step — it has its own CTA) */}
          {step < TOTAL_STEPS && (
            <View style={styles.bottomBar}>
              {step === 1 ? (
                <View style={styles.bottomHintWrap}>
                  <Text style={styles.bottomHintText}>Two quick steps. Preferences can wait until after your first log.</Text>
                </View>
              ) : (
                <View />
              )}

              {step === 1 ? (
                <View style={styles.nextBtnPlaceholder} />
              ) : (
                <Pressable
                  onPress={goNext}
                  disabled={!canProceed}
                  style={[styles.nextBtn, !canProceed && styles.nextBtnDisabled]}
                >
                  <LinearGradient
                    colors={canProceed ? Gradients.electric : Gradients.disabled}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[StyleSheet.absoluteFill, { borderRadius: 14 }]}
                  />
                  <Text style={styles.nextBtnText}>See My Targets</Text>
                  <ArrowRight size={18} color="#fff" strokeWidth={2.5} />
                </Pressable>
              )}
            </View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '40%',
  },
  safeArea: {
    flex: 1,
  },

  // Nav bar
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  navBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Progress bar
  progressContainer: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  progressTrack: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressText: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    fontWeight: FontWeight.medium,
  },

  // Step container
  stepContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  stepAnimWrap: {
    flex: 1,
  },
  stepScroll: {
    flex: 1,
  },
  stepContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
  },

  // Step header
  stepHeader: {
    marginBottom: Spacing.lg,
  },
  stepTitle: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    letterSpacing: -0.5,
  },
  stepSubtitle: {
    fontSize: FontSize.md,
    color: Colors.textTertiary,
    marginTop: Spacing.xs,
    lineHeight: 22,
  },

  // Welcome
  welcomeHeader: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
    paddingTop: Spacing.md,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  welcomeLogo: {
    fontSize: 44,
    fontWeight: FontWeight.black,
    color: Colors.text,
    letterSpacing: -2,
  },
  welcomeTagline: {
    fontSize: FontSize.md,
    color: Colors.textTertiary,
    marginTop: Spacing.sm,
  },

  // Goal cards
  goalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  goalCardSelected: {
    borderColor: 'rgba(255,255,255,0.15)',
  },
  goalIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  goalTextWrap: {
    flex: 1,
  },
  goalLabel: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  goalSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  goalCheck: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Field label
  fieldLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    marginTop: Spacing.lg,
  },

  // Gender row
  genderRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  genderBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  genderBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}15`,
  },
  genderText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textTertiary,
  },
  genderTextActive: {
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
  },

  // Text input
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: Spacing.md,
    height: 52,
  },
  textInput: {
    flex: 1,
    fontSize: FontSize.lg,
    color: Colors.text,
    fontWeight: FontWeight.semibold,
    height: '100%',
  },
  inputSuffix: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    fontWeight: FontWeight.medium,
    marginLeft: Spacing.sm,
  },
  heightRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },

  // Unit toggle
  unitToggleWrap: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  unitBtn: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  unitBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}15`,
  },
  unitBtnText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textTertiary,
  },
  unitBtnTextActive: {
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
  },

  // Weight diff badge
  weightDiffBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.sm,
  },
  weightDiffText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },

  // Chips
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  chipText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textTertiary,
  },

  // Option button
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  optionBtnSelected: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}12`,
  },
  optionLabel: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.text,
  },
  optionLabelSelected: {
    color: Colors.primary,
  },
  optionDesc: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  optionCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.sm,
  },
  equipIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },

  // Slider row
  sliderRow: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  sliderLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  sliderTrack: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  sliderDot: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  sliderDotActive: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}15`,
  },
  sliderDotText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textTertiary,
  },
  sliderDotTextActive: {
    color: Colors.primary,
    fontWeight: FontWeight.bold,
  },

  // Toggle row
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  toggleIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: `${Colors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  toggleTextWrap: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  toggleLabel: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.text,
  },
  toggleDesc: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: 2,
    lineHeight: 16,
  },
  featureDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginVertical: Spacing.md,
  },

  // Bottom bar
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  bottomHintWrap: {
    flex: 1,
    paddingRight: Spacing.md,
  },
  bottomHintText: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    lineHeight: 18,
  },
  nextBtnPlaceholder: {
    width: 152,
  },
  skipBtn: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  skipText: {
    fontSize: FontSize.md,
    color: Colors.textTertiary,
    fontWeight: FontWeight.medium,
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    height: 48,
    paddingHorizontal: Spacing.xl,
    borderRadius: 14,
    overflow: 'hidden',
    ...Shadows.button,
  },
  nextBtnDisabled: {
    opacity: 0.5,
    shadowOpacity: 0,
  },
  nextBtnText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: '#fff',
  },

  // Generation screen
  generationWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  generationInner: {
    alignItems: 'center',
    width: '100%',
  },
  genTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },
  genPhaseText: {
    fontSize: FontSize.md,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    height: 24,
  },
  genBarTrack: {
    width: '80%',
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  genBarFill: {
    height: '100%',
    borderRadius: 3,
    overflow: 'hidden',
  },

  // Pulsing orb
  orbContainer: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbGlow: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
  },
  orbCenter: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.glowPrimary,
  },

  // Results
  resultsHeader: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
    paddingTop: Spacing.lg,
  },
  resultsCheckCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    ...Shadows.glowSuccess,
  },
  resultsTitle: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    letterSpacing: -0.5,
  },
  resultsSubtitle: {
    fontSize: FontSize.md,
    color: Colors.textTertiary,
    marginTop: Spacing.xs,
  },
  resultsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    width: '100%',
  },
  resultCard: {
    width: (SCREEN_WIDTH - Spacing.lg * 2 - Spacing.sm) / 2,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  resultValue: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginTop: Spacing.sm,
  },
  resultLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Colors.textTertiary,
    marginTop: 2,
  },

  // Macro bar
  macroBar: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 6,
    overflow: 'hidden',
    width: '100%',
    marginTop: Spacing.lg,
    gap: 2,
  },
  macroSegment: {
    height: '100%',
  },
  macroLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.lg,
    marginTop: Spacing.sm,
  },
  macroLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  macroLegendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  macroLegendText: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    fontWeight: FontWeight.medium,
  },

  // Result info row
  resultInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    width: '100%',
  },
  resultInfoText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.text,
  },

  // CTA
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
    ...Shadows.button,
  },
  ctaText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: '#fff',
  },
  secondaryCtaWrap: {
    width: '100%',
    marginTop: Spacing.md,
  },
  secondaryCtaButton: {
    minHeight: 48,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  secondaryCtaText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  resultsImportCardWrap: {
    width: '100%',
    marginTop: Spacing.md,
  },
  resultsImportCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderColor: Colors.warning + '28',
  },
});

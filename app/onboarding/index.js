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
  Switch,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import ReAnimated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOut,
  SlideInRight,
  SlideOutLeft,
  SlideInLeft,
  SlideOutRight,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  withRepeat,
  withSpring,
  Easing,
  runOnJS,
  interpolateColor,
} from 'react-native-reanimated';
import {
  Target,
  Dumbbell,
  Scale,
  Heart,
  Zap,
  Trophy,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Check,
  User,
  Calendar,
  Ruler,
  Weight,
  Activity,
  Utensils,
  Leaf,
  Apple,
  Fish,
  Wheat,
  Milk,
  Nut,
  Egg,
  Shell,
  Ban,
  Clock,
  Sun,
  Moon,
  Bell,
  Smartphone,
  Brain,
  Droplets,
  Timer,
  ChevronRight,
  Flame,
  TrendingDown,
  TrendingUp,
  Minus,
  PersonStanding,
  Bike,
  Waves,
  Footprints,
  CircleDot,
  Home,
  Building2,
  TreePine,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { hapticImpact, hapticSuccess, hapticHeavy } from '../../lib/haptics';
import { useProfile, ACTIVITY_LEVELS } from '../../context/ProfileContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Colors, Gradients, Spacing, BorderRadius, FontSize, FontWeight, Shadows } from '../../constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const TOTAL_STEPS = 6;

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

const DIET_TYPES = [
  'Standard', 'Keto', 'Low Carb', 'High Protein',
  'Vegetarian', 'Vegan', 'Mediterranean', 'Paleo',
];

const ALLERGY_OPTIONS = [
  'Gluten', 'Dairy', 'Nuts', 'Soy', 'Eggs', 'Shellfish', 'None',
];

const EXPERIENCE_LEVELS = [
  { id: 'beginner', label: 'Beginner', description: '0 - 6 months training' },
  { id: 'intermediate', label: 'Intermediate', description: '6 months - 2 years' },
  { id: 'advanced', label: 'Advanced', description: '2+ years training' },
];

const WORKOUT_TYPES = [
  'Strength', 'Cardio', 'HIIT', 'Yoga', 'Calisthenics', 'Swimming', 'Running',
];

const EQUIPMENT_OPTIONS = [
  { id: 'bodyweight', label: 'Home (bodyweight)', icon: Home },
  { id: 'home_gym', label: 'Home Gym', icon: Dumbbell },
  { id: 'full_gym', label: 'Full Gym', icon: Building2 },
  { id: 'outdoor', label: 'Outdoor', icon: TreePine },
];

const SESSION_DURATIONS = [20, 30, 45, 60, 90];

// ---------------------------------------------------------------------------
// Helper: BMR / TDEE / Macros
// ---------------------------------------------------------------------------

function computeBMR(weightKg, heightCm, age, gender) {
  if (!weightKg || !heightCm || !age) return null;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return Math.round(gender === 'male' ? base + 5 : base - 161);
}

function computeTDEE(bmr, activityId) {
  if (!bmr) return null;
  const option = ACTIVITY_OPTIONS.find((a) => a.id === activityId);
  return Math.round(bmr * (option?.multiplier || 1.55));
}

function computeCalorieTarget(tdee, goalId) {
  if (!tdee) return 2000;
  switch (goalId) {
    case 'lose': return Math.max(tdee - 500, 1200);
    case 'build': return tdee + 300;
    case 'maintain': return tdee;
    case 'health': return tdee;
    case 'athletic': return tdee + 200;
    default: return tdee;
  }
}

function computeMacros(calories, goalId) {
  let proteinPct, carbsPct, fatPct;
  switch (goalId) {
    case 'lose':
      proteinPct = 0.40; carbsPct = 0.30; fatPct = 0.30; break;
    case 'build':
      proteinPct = 0.35; carbsPct = 0.40; fatPct = 0.25; break;
    case 'athletic':
      proteinPct = 0.25; carbsPct = 0.50; fatPct = 0.25; break;
    default:
      proteinPct = 0.30; carbsPct = 0.40; fatPct = 0.30;
  }
  return {
    protein: Math.round((calories * proteinPct) / 4),
    carbs: Math.round((calories * carbsPct) / 4),
    fat: Math.round((calories * fatPct) / 9),
    proteinPct: Math.round(proteinPct * 100),
    carbsPct: Math.round(carbsPct * 100),
    fatPct: Math.round(fatPct * 100),
  };
}

function goalToWeeklyGoal(goalId) {
  switch (goalId) {
    case 'lose': return 'lose1';
    case 'build': return 'gain05';
    default: return 'maintain';
  }
}

function goalToMacroPreset(goalId) {
  switch (goalId) {
    case 'lose': return 'highProtein';
    case 'build': return 'highProtein';
    case 'athletic': return 'athletic';
    default: return 'balanced';
  }
}

// ---------------------------------------------------------------------------
// Reusable Sub-Components
// ---------------------------------------------------------------------------

function ProgressBar({ step, total }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(step / total, { duration: 400, easing: Easing.out(Easing.cubic) });
  }, [step, total]);

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

function SelectChip({ label, selected, onPress, color = Colors.primary }) {
  return (
    <Pressable
      onPress={() => { hapticImpact(); onPress(); }}
      style={[
        styles.chip,
        selected && { backgroundColor: `${color}22`, borderColor: color },
      ]}
    >
      <Text style={[styles.chipText, selected && { color }]}>{label}</Text>
    </Pressable>
  );
}

function OptionButton({ label, description, selected, onPress, index }) {
  return (
    <ReAnimated.View entering={FadeInDown.delay(index * 60).duration(350).springify()}>
      <Pressable
        onPress={() => { hapticImpact(); onPress(); }}
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

function SliderRow({ label, value, min, max, step, suffix, onChange }) {
  const values = [];
  for (let v = min; v <= max; v += step) values.push(v);

  return (
    <View style={styles.sliderRow}>
      <Text style={styles.sliderLabel}>{label}</Text>
      <View style={styles.sliderTrack}>
        {values.map((v) => (
          <Pressable
            key={v}
            onPress={() => { hapticImpact(); onChange(v); }}
            style={[styles.sliderDot, v === value && styles.sliderDotActive]}
          >
            <Text style={[styles.sliderDotText, v === value && styles.sliderDotTextActive]}>
              {v}{suffix || ''}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function ToggleRow({ icon: Icon, label, description, value, onChange }) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleIcon}>
        <Icon size={20} color={Colors.primary} />
      </View>
      <View style={styles.toggleTextWrap}>
        <Text style={styles.toggleLabel}>{label}</Text>
        {description ? <Text style={styles.toggleDesc}>{description}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={(v) => { hapticImpact(); onChange(v); }}
        trackColor={{ false: Colors.surfaceBright, true: Colors.primaryDim }}
        thumbColor={value ? Colors.primary : Colors.textTertiary}
        ios_backgroundColor={Colors.surfaceBright}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Step Components
// ---------------------------------------------------------------------------

function Step1Welcome({ data, onChange }) {
  return (
    <ScrollView style={styles.stepScroll} contentContainerStyle={styles.stepContent} showsVerticalScrollIndicator={false}>
      <ReAnimated.View entering={FadeInDown.duration(500).springify()} style={styles.welcomeHeader}>
        <View style={styles.logoRow}>
          <Sparkles size={32} color={Colors.primary} />
          <Text style={styles.welcomeLogo}>FuelIQ</Text>
        </View>
        <Text style={styles.welcomeTagline}>
          Let's build your personalized fitness plan
        </Text>
      </ReAnimated.View>

      <StepHeader
        title="What's your primary goal?"
        subtitle="This helps us personalize your entire experience"
      />

      {GOALS.map((item, index) => (
        <GoalCard
          key={item.id}
          item={item}
          selected={data.goal}
          onPress={(id) => onChange({ goal: id })}
          index={index}
        />
      ))}
    </ScrollView>
  );
}

function Step2BodyProfile({ data, onChange }) {
  const [isMetric, setIsMetric] = useState(data.heightUnit === 'cm');

  const toggleUnit = useCallback((metric) => {
    setIsMetric(metric);
    onChange({ heightUnit: metric ? 'cm' : 'ft', weightUnit: metric ? 'kg' : 'lbs' });
    hapticImpact();
  }, [onChange]);

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
    <ScrollView style={styles.stepScroll} contentContainerStyle={styles.stepContent} showsVerticalScrollIndicator={false}>
      <StepHeader title="Your Body Profile" subtitle="We need these to calculate your targets" />

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
      <View style={styles.inputWrap}>
        <TextInput
          style={styles.textInput}
          placeholder="e.g. 28"
          placeholderTextColor={Colors.textTertiary}
          keyboardType="number-pad"
          value={data.ageStr}
          onChangeText={(v) => onChange({ ageStr: v.replace(/[^0-9]/g, '') })}
          maxLength={3}
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
        <View style={styles.inputWrap}>
          <TextInput
            style={styles.textInput}
            placeholder="175"
            placeholderTextColor={Colors.textTertiary}
            keyboardType="number-pad"
            value={data.heightCm}
            onChangeText={(v) => onChange({ heightCm: v.replace(/[^0-9]/g, '') })}
            maxLength={3}
          />
          <Text style={styles.inputSuffix}>cm</Text>
        </View>
      ) : (
        <View style={styles.heightRow}>
          <View style={[styles.inputWrap, { flex: 1 }]}>
            <TextInput
              style={styles.textInput}
              placeholder="5"
              placeholderTextColor={Colors.textTertiary}
              keyboardType="number-pad"
              value={data.heightFt}
              onChangeText={(v) => onChange({ heightFt: v.replace(/[^0-9]/g, '') })}
              maxLength={1}
            />
            <Text style={styles.inputSuffix}>ft</Text>
          </View>
          <View style={[styles.inputWrap, { flex: 1 }]}>
            <TextInput
              style={styles.textInput}
              placeholder="10"
              placeholderTextColor={Colors.textTertiary}
              keyboardType="number-pad"
              value={data.heightIn}
              onChangeText={(v) => onChange({ heightIn: v.replace(/[^0-9]/g, '') })}
              maxLength={2}
            />
            <Text style={styles.inputSuffix}>in</Text>
          </View>
        </View>
      )}

      {/* Current weight */}
      <Text style={styles.fieldLabel}>Current Weight</Text>
      <View style={styles.inputWrap}>
        <TextInput
          style={styles.textInput}
          placeholder={isMetric ? '80' : '176'}
          placeholderTextColor={Colors.textTertiary}
          keyboardType="decimal-pad"
          value={displayWeight}
          onChangeText={(v) => onChange({ weightRaw: v.replace(/[^0-9.]/g, '') })}
          maxLength={6}
        />
        <Text style={styles.inputSuffix}>{isMetric ? 'kg' : 'lbs'}</Text>
      </View>

      {/* Goal weight */}
      <Text style={styles.fieldLabel}>Goal Weight</Text>
      <View style={styles.inputWrap}>
        <TextInput
          style={styles.textInput}
          placeholder={isMetric ? '75' : '165'}
          placeholderTextColor={Colors.textTertiary}
          keyboardType="decimal-pad"
          value={displayGoalWeight}
          onChangeText={(v) => onChange({ goalWeightRaw: v.replace(/[^0-9.]/g, '') })}
          maxLength={6}
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

function Step3Dietary({ data, onChange }) {
  const toggleAllergy = useCallback((allergy) => {
    const current = data.allergies || [];
    if (allergy === 'None') {
      onChange({ allergies: ['None'] });
      return;
    }
    const filtered = current.filter((a) => a !== 'None');
    if (filtered.includes(allergy)) {
      onChange({ allergies: filtered.filter((a) => a !== allergy) });
    } else {
      onChange({ allergies: [...filtered, allergy] });
    }
  }, [data.allergies, onChange]);

  return (
    <ScrollView style={styles.stepScroll} contentContainerStyle={styles.stepContent} showsVerticalScrollIndicator={false}>
      <StepHeader title="Dietary Preferences" subtitle="We'll tailor meal suggestions for you" />

      {/* Diet type */}
      <Text style={styles.fieldLabel}>Diet Type</Text>
      <View style={styles.chipWrap}>
        {DIET_TYPES.map((dt) => (
          <SelectChip
            key={dt}
            label={dt}
            selected={data.dietType === dt}
            onPress={() => onChange({ dietType: dt })}
          />
        ))}
      </View>

      {/* Allergies */}
      <Text style={styles.fieldLabel}>Allergies / Intolerances</Text>
      <View style={styles.chipWrap}>
        {ALLERGY_OPTIONS.map((a) => (
          <SelectChip
            key={a}
            label={a}
            selected={(data.allergies || []).includes(a)}
            onPress={() => toggleAllergy(a)}
            color={a === 'None' ? Colors.success : Colors.secondary}
          />
        ))}
      </View>

      {/* Meals per day */}
      <SliderRow
        label="Meals Per Day"
        value={data.mealsPerDay || 3}
        min={2}
        max={6}
        step={1}
        onChange={(v) => onChange({ mealsPerDay: v })}
      />

      {/* Intermittent fasting */}
      <Text style={styles.fieldLabel}>Interested in Intermittent Fasting?</Text>
      <View style={styles.genderRow}>
        <Pressable
          onPress={() => { hapticImpact(); onChange({ interestedInFasting: true }); }}
          style={[styles.genderBtn, data.interestedInFasting === true && styles.genderBtnActive]}
        >
          <Text style={[styles.genderText, data.interestedInFasting === true && styles.genderTextActive]}>Yes</Text>
        </Pressable>
        <Pressable
          onPress={() => { hapticImpact(); onChange({ interestedInFasting: false }); }}
          style={[styles.genderBtn, data.interestedInFasting === false && styles.genderBtnActive]}
        >
          <Text style={[styles.genderText, data.interestedInFasting === false && styles.genderTextActive]}>No</Text>
        </Pressable>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function Step4Fitness({ data, onChange }) {
  const toggleWorkoutType = useCallback((type) => {
    const current = data.workoutTypes || [];
    if (current.includes(type)) {
      onChange({ workoutTypes: current.filter((t) => t !== type) });
    } else {
      onChange({ workoutTypes: [...current, type] });
    }
  }, [data.workoutTypes, onChange]);

  const toggleEquipment = useCallback((eq) => {
    const current = data.equipment || [];
    if (current.includes(eq)) {
      onChange({ equipment: current.filter((e) => e !== eq) });
    } else {
      onChange({ equipment: [...current, eq] });
    }
  }, [data.equipment, onChange]);

  return (
    <ScrollView style={styles.stepScroll} contentContainerStyle={styles.stepContent} showsVerticalScrollIndicator={false}>
      <StepHeader title="Fitness Experience" subtitle="Help us build the right workout plan" />

      {/* Experience level */}
      <Text style={styles.fieldLabel}>Training Experience</Text>
      {EXPERIENCE_LEVELS.map((opt, index) => (
        <OptionButton
          key={opt.id}
          label={opt.label}
          description={opt.description}
          selected={data.experience === opt.id}
          onPress={() => onChange({ experience: opt.id })}
          index={index}
        />
      ))}

      {/* Workout types */}
      <Text style={styles.fieldLabel}>Preferred Workout Types</Text>
      <View style={styles.chipWrap}>
        {WORKOUT_TYPES.map((wt) => (
          <SelectChip
            key={wt}
            label={wt}
            selected={(data.workoutTypes || []).includes(wt)}
            onPress={() => toggleWorkoutType(wt)}
            color={Colors.success}
          />
        ))}
      </View>

      {/* Equipment */}
      <Text style={styles.fieldLabel}>Available Equipment</Text>
      {EQUIPMENT_OPTIONS.map((eq, index) => {
        const EqIcon = eq.icon;
        const selected = (data.equipment || []).includes(eq.id);
        return (
          <ReAnimated.View key={eq.id} entering={FadeInDown.delay(index * 60).duration(350).springify()}>
            <Pressable
              onPress={() => { hapticImpact(); toggleEquipment(eq.id); }}
              style={[styles.optionBtn, selected && styles.optionBtnSelected]}
            >
              <View style={styles.equipIconWrap}>
                <EqIcon size={18} color={selected ? Colors.primary : Colors.textTertiary} />
              </View>
              <Text style={[styles.optionLabel, selected && styles.optionLabelSelected, { flex: 1 }]}>{eq.label}</Text>
              {selected && (
                <View style={styles.optionCheck}>
                  <Check size={14} color="#fff" strokeWidth={3} />
                </View>
              )}
            </Pressable>
          </ReAnimated.View>
        );
      })}

      {/* Days per week */}
      <SliderRow
        label="Days Per Week"
        value={data.daysPerWeek || 4}
        min={2}
        max={7}
        step={1}
        onChange={(v) => onChange({ daysPerWeek: v })}
      />

      {/* Session duration */}
      <Text style={styles.fieldLabel}>Session Duration</Text>
      <View style={styles.chipWrap}>
        {SESSION_DURATIONS.map((d) => (
          <SelectChip
            key={d}
            label={`${d} min`}
            selected={data.sessionDuration === d}
            onPress={() => onChange({ sessionDuration: d })}
            color={Colors.primary}
          />
        ))}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function Step5SmartFeatures({ data, onChange }) {
  return (
    <ScrollView style={styles.stepScroll} contentContainerStyle={styles.stepContent} showsVerticalScrollIndicator={false}>
      <StepHeader title="Smart Features" subtitle="Customize your experience" />

      <ToggleRow
        icon={Bell}
        label="Meal Reminders"
        description="Get reminded to log breakfast, lunch, dinner"
        value={data.enableMealReminders !== false}
        onChange={(v) => onChange({ enableMealReminders: v })}
      />

      <ToggleRow
        icon={Dumbbell}
        label="Workout Reminders"
        description="Scheduled notifications for training days"
        value={data.enableWorkoutReminders !== false}
        onChange={(v) => onChange({ enableWorkoutReminders: v })}
      />

      <ToggleRow
        icon={Flame}
        label="Streak Warnings"
        description="Alerts before you're about to lose a streak"
        value={data.enableStreakWarnings !== false}
        onChange={(v) => onChange({ enableStreakWarnings: v })}
      />

      <View style={styles.featureDivider} />

      <ToggleRow
        icon={Smartphone}
        label="Connect Health App"
        description="Sync with Apple Health or Google Fit"
        value={data.connectHealth === true}
        onChange={(v) => onChange({ connectHealth: v })}
      />

      <ToggleRow
        icon={Brain}
        label="AI Coaching"
        description="Personalized tips, meal suggestions, and workout feedback powered by AI"
        value={data.enableAI !== false}
        onChange={(v) => onChange({ enableAI: v })}
      />

      <View style={styles.featureDivider} />

      {/* Water goal */}
      <Text style={styles.fieldLabel}>Daily Water Goal</Text>
      <View style={styles.chipWrap}>
        {[1500, 2000, 2500, 3000, 3500, 4000].map((ml) => (
          <SelectChip
            key={ml}
            label={`${(ml / 1000).toFixed(1)}L`}
            selected={(data.waterGoal || 2500) === ml}
            onPress={() => onChange({ waterGoal: ml })}
            color={Colors.primary}
          />
        ))}
      </View>

      <ToggleRow
        icon={Timer}
        label="Enable Fasting Tracker"
        description="Track intermittent fasting windows"
        value={data.enableFasting === true}
        onChange={(v) => onChange({ enableFasting: v })}
      />

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function Step6Generation({ data, onComplete }) {
  const [phase, setPhase] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const progressWidth = useSharedValue(0);

  const phases = [
    'Calculating your metabolic rate...',
    'Building your macro targets...',
    'Generating your workout plan...',
    'Personalizing your AI coach...',
  ];

  // Calculate results
  const results = useMemo(() => {
    const isMetric = data.heightUnit === 'cm';

    let weightKg, heightCm;
    if (isMetric) {
      weightKg = parseFloat(data.weightRaw) || 75;
      heightCm = parseFloat(data.heightCm) || 170;
    } else {
      const lbs = parseFloat(data.weightRaw) || 165;
      weightKg = lbs * 0.453592;
      const ft = parseInt(data.heightFt || '5', 10);
      const inches = parseInt(data.heightIn || '9', 10);
      heightCm = (ft * 12 + inches) * 2.54;
    }

    const age = parseInt(data.ageStr || '30', 10);
    const gender = data.gender === 'female' ? 'female' : 'male';

    const bmr = computeBMR(weightKg, heightCm, age, gender);
    const tdee = computeTDEE(bmr, data.activityLevel || 'moderate');
    const calories = computeCalorieTarget(tdee, data.goal || 'maintain');
    const macros = computeMacros(calories, data.goal || 'maintain');

    return { bmr, tdee, calories, macros, weightKg, heightCm, age, gender, daysPerWeek: data.daysPerWeek || 4 };
  }, [data]);

  useEffect(() => {
    // Animated progress through phases
    const timers = [];
    let currentPhase = 0;

    const advancePhase = () => {
      currentPhase += 1;
      if (currentPhase < phases.length) {
        setPhase(currentPhase);
        progressWidth.value = withTiming((currentPhase + 1) / phases.length, { duration: 1200 });
        timers.push(setTimeout(advancePhase, 1400));
      } else {
        // All done
        timers.push(setTimeout(() => {
          setShowResults(true);
          hapticSuccess();
        }, 800));
      }
    };

    progressWidth.value = withTiming(1 / phases.length, { duration: 1200 });
    timers.push(setTimeout(advancePhase, 1400));

    return () => timers.forEach(clearTimeout);
  }, []);

  const genBarStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value * 100}%`,
  }));

  if (!showResults) {
    return (
      <View style={styles.generationWrap}>
        <ReAnimated.View entering={FadeIn.duration(400)} style={styles.generationInner}>
          {/* Pulsing icon */}
          <PulsingOrb />

          <Text style={styles.genTitle}>Analyzing Your Goals</Text>

          {/* Phase text */}
          <ReAnimated.View key={phase} entering={FadeIn.duration(300)}>
            <Text style={styles.genPhaseText}>{phases[phase]}</Text>
          </ReAnimated.View>

          {/* Progress bar */}
          <View style={styles.genBarTrack}>
            <ReAnimated.View style={[styles.genBarFill, genBarStyle]}>
              <LinearGradient
                colors={Gradients.electric}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
            </ReAnimated.View>
          </View>
        </ReAnimated.View>
      </View>
    );
  }

  // Show results
  return (
    <ScrollView style={styles.stepScroll} contentContainerStyle={[styles.stepContent, { alignItems: 'center' }]} showsVerticalScrollIndicator={false}>
      {/* Confetti-like top decoration */}
      <ReAnimated.View entering={FadeInDown.duration(600).springify()} style={styles.resultsHeader}>
        <View style={styles.resultsCheckCircle}>
          <Check size={32} color="#fff" strokeWidth={3} />
        </View>
        <Text style={styles.resultsTitle}>Your Plan Is Ready!</Text>
        <Text style={styles.resultsSubtitle}>Here's what we've built for you</Text>
      </ReAnimated.View>

      {/* Stats cards */}
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

      {/* Macro split bar */}
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

      {/* Workout frequency */}
      <ReAnimated.View entering={FadeInDown.delay(600).duration(400).springify()} style={styles.resultInfoRow}>
        <Activity size={20} color={Colors.primary} />
        <Text style={styles.resultInfoText}>{results.daysPerWeek} workouts per week</Text>
      </ReAnimated.View>

      {/* CTA */}
      <ReAnimated.View entering={FadeInUp.delay(700).duration(500).springify()} style={{ width: '100%', marginTop: Spacing.xl }}>
        <Pressable onPress={onComplete} style={styles.ctaButton}>
          <LinearGradient
            colors={Gradients.electric}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
          <Sparkles size={20} color="#fff" />
          <Text style={styles.ctaText}>Start Your Journey</Text>
          <ArrowRight size={20} color="#fff" />
        </Pressable>
      </ReAnimated.View>

      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

function PulsingOrb() {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.3, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 1000 }),
        withTiming(0.4, { duration: 1000 }),
      ),
      -1,
      true,
    );
  }, []);

  const orbStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <View style={styles.orbContainer}>
      <ReAnimated.View style={[styles.orbGlow, orbStyle]} />
      <View style={styles.orbCenter}>
        <Sparkles size={28} color="#fff" />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main Onboarding Screen
// ---------------------------------------------------------------------------

export default function OnboardingScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { updateProfile, fetchProfile } = useProfile();
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState('forward');
  const [saving, setSaving] = useState(false);

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
  const canProceed = useMemo(() => {
    switch (step) {
      case 1: return !!data.goal;
      case 2: {
        const hasAge = data.ageStr && parseInt(data.ageStr) >= 13;
        const hasWeight = data.weightRaw && parseFloat(data.weightRaw) > 0;
        const isMetric = data.heightUnit === 'cm';
        const hasHeight = isMetric
          ? (data.heightCm && parseInt(data.heightCm) > 0)
          : (data.heightFt && parseInt(data.heightFt) > 0);
        return hasAge && hasWeight && hasHeight;
      }
      case 3: return !!data.dietType;
      case 4: return !!data.experience;
      case 5: return true;
      case 6: return true;
      default: return false;
    }
  }, [step, data]);

  const goNext = useCallback(() => {
    if (step < TOTAL_STEPS && canProceed) {
      setDirection('forward');
      hapticImpact();
      setStep((s) => s + 1);
    }
  }, [step, canProceed]);

  const goBack = useCallback(() => {
    if (step > 1) {
      setDirection('back');
      hapticImpact();
      setStep((s) => s - 1);
    }
  }, [step]);

  // Save everything and navigate to main app
  const completeOnboarding = useCallback(async () => {
    if (saving) return;
    setSaving(true);

    try {
      const isMetric = data.heightUnit === 'cm';
      let weightKg, heightCm, goalWeightKg;

      if (isMetric) {
        weightKg = parseFloat(data.weightRaw) || 75;
        heightCm = parseFloat(data.heightCm) || 170;
        goalWeightKg = data.goalWeightRaw ? parseFloat(data.goalWeightRaw) : null;
      } else {
        const lbs = parseFloat(data.weightRaw) || 165;
        weightKg = lbs * 0.453592;
        const ft = parseInt(data.heightFt || '5', 10);
        const inches = parseInt(data.heightIn || '9', 10);
        heightCm = (ft * 12 + inches) * 2.54;
        goalWeightKg = data.goalWeightRaw ? parseFloat(data.goalWeightRaw) * 0.453592 : null;
      }

      const age = parseInt(data.ageStr || '30', 10);
      const gender = data.gender === 'female' ? 'female' : 'male';
      const bmr = computeBMR(weightKg, heightCm, age, gender);
      const tdee = computeTDEE(bmr, data.activityLevel || 'moderate');
      const calories = computeCalorieTarget(tdee, data.goal || 'maintain');
      const macros = computeMacros(calories, data.goal || 'maintain');
      const weeklyGoal = goalToWeeklyGoal(data.goal);
      const macroPreset = goalToMacroPreset(data.goal);

      // Convert stored weight/height to lbs/inches for ProfileContext compatibility
      const weightLbs = Math.round(weightKg / 0.453592 * 10) / 10;
      const heightInches = Math.round(heightCm / 2.54 * 10) / 10;
      const goalWeightLbs = goalWeightKg ? Math.round(goalWeightKg / 0.453592 * 10) / 10 : null;

      // Build dietary restrictions array
      const dietaryRestrictions = [];
      if (data.dietType && data.dietType !== 'Standard') dietaryRestrictions.push(data.dietType.toLowerCase());
      if (data.allergies && !data.allergies.includes('None')) {
        data.allergies.forEach((a) => dietaryRestrictions.push(a.toLowerCase()));
      }

      // Build equipment list
      const equipmentList = (data.equipment || []).map((e) => {
        switch (e) {
          case 'bodyweight': return 'bodyweight';
          case 'home_gym': return 'dumbbells';
          case 'full_gym': return 'full gym';
          case 'outdoor': return 'outdoor';
          default: return e;
        }
      });

      // Save to Supabase directly for extended fields
      if (user) {
        const supabaseUpdates = {
          weight: weightLbs,
          height: heightInches,
          age,
          gender,
          activity_level: data.activityLevel || 'moderate',
          goal_weight: goalWeightLbs,
          weekly_goal: weeklyGoal,
          macro_preset: macroPreset,
          weight_unit: isMetric ? 'kg' : 'lbs',
          dietary_restrictions: dietaryRestrictions,
          equipment: equipmentList,
          custom_macros: {
            protein: macros.proteinPct,
            carbs: macros.carbsPct,
            fat: macros.fatPct,
          },
          bmr,
          tdee,
          daily_calories: calories,
          onboarding_completed: true,
          onboarding_data: {
            goal: data.goal,
            dietType: data.dietType,
            allergies: data.allergies,
            mealsPerDay: data.mealsPerDay,
            interestedInFasting: data.interestedInFasting,
            experience: data.experience,
            workoutTypes: data.workoutTypes,
            equipment: data.equipment,
            daysPerWeek: data.daysPerWeek,
            sessionDuration: data.sessionDuration,
            enableMealReminders: data.enableMealReminders,
            enableWorkoutReminders: data.enableWorkoutReminders,
            enableStreakWarnings: data.enableStreakWarnings,
            connectHealth: data.connectHealth,
            enableAI: data.enableAI,
            waterGoal: data.waterGoal,
            enableFasting: data.enableFasting,
          },
          weight_history: [{ date: new Date().toISOString().split('T')[0], weight: weightLbs }],
          updated_at: new Date().toISOString(),
        };

        const { error } = await supabase
          .from('profiles')
          .upsert({ user_id: user.id, ...supabaseUpdates })
          .select();

        if (error) {
          if (__DEV__) console.error('Onboarding save error:', error);
          // Still try to save locally
        }
      }

      // Update ProfileContext state so isProfileComplete becomes true
      await updateProfile({
        weight: weightLbs,
        height: heightInches,
        age,
        gender,
        activityLevel: data.activityLevel || 'moderate',
        goalWeight: goalWeightLbs,
        weeklyGoal,
        macroPreset,
        weightUnit: isMetric ? 'kg' : 'lbs',
        dietaryRestrictions,
        equipment: equipmentList,
      });

      // Re-fetch to make sure everything is consistent
      await fetchProfile();

      hapticHeavy();
      router.replace('/(tabs)');
    } catch (err) {
      if (__DEV__) console.error('Onboarding complete error:', err);
      Alert.alert('Error', 'Failed to save your profile. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [data, user, updateProfile, fetchProfile, router, saving]);

  // Choose entering/exiting animations based on direction
  const entering = direction === 'forward'
    ? SlideInRight.duration(350).springify().damping(18)
    : SlideInLeft.duration(350).springify().damping(18);

  const exiting = direction === 'forward'
    ? SlideOutLeft.duration(250)
    : SlideOutRight.duration(250);

  const renderStep = () => {
    switch (step) {
      case 1: return <Step1Welcome data={data} onChange={onChange} />;
      case 2: return <Step2BodyProfile data={data} onChange={onChange} />;
      case 3: return <Step3Dietary data={data} onChange={onChange} />;
      case 4: return <Step4Fitness data={data} onChange={onChange} />;
      case 5: return <Step5SmartFeatures data={data} onChange={onChange} />;
      case 6: return <Step6Generation data={data} onComplete={completeOnboarding} />;
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
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          {/* Top navigation bar */}
          <View style={styles.navBar}>
            {step > 1 && step < 6 ? (
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

          {/* Bottom navigation (not shown on step 6 — it has its own CTA) */}
          {step < 6 && (
            <View style={styles.bottomBar}>
              {step === 1 ? (
                <Pressable
                  onPress={() => router.replace('/(tabs)')}
                  style={styles.skipBtn}
                >
                  <Text style={styles.skipText}>Skip for now</Text>
                </Pressable>
              ) : (
                <View />
              )}

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
                <Text style={styles.nextBtnText}>
                  {step === 5 ? 'Generate Plan' : 'Continue'}
                </Text>
                <ArrowRight size={18} color="#fff" strokeWidth={2.5} />
              </Pressable>
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
});

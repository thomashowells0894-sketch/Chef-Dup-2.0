import React, { useState, useRef, useMemo } from 'react';
import ScreenErrorBoundary from '../components/ScreenErrorBoundary';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import Slider from '@react-native-community/slider';
import { hapticLight, hapticHeavy, hapticSuccess, hapticError } from '../lib/haptics';
import {
  X,
  Sparkles,
  Clock,
  Dumbbell,
  Zap,
  Play,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  Flame,
  Target,
  Award,
  AlertCircle,
  Check,
  Timer,
  Heart,
} from 'lucide-react-native';
import {
  Colors,
  Gradients,
  Spacing,
  FontSize,
  FontWeight,
  BorderRadius,
} from '../constants/theme';
import { generateWorkout } from '../services/ai';
import { suggestSupersets } from '../lib/workoutEngine';
import { useMeals } from '../context/MealContext';
import { useOffline } from '../context/OfflineContext';
import PremiumGate from '../components/PremiumGate';
import SetLogger from '../components/SetLogger';
import RestTimer from '../components/RestTimer';
import PRCelebration from '../components/PRCelebration';
import WorkoutRatingModal from '../components/WorkoutRatingModal';
import usePersonalRecords from '../hooks/usePersonalRecords';
import useWorkoutHistory from '../hooks/useWorkoutHistory';
import useWorkoutTemplates from '../hooks/useWorkoutTemplates';
import useWorkoutRatings from '../hooks/useWorkoutRatings';
import useRecovery from '../hooks/useRecovery';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Goal options with icons and colors
const GOALS = [
  {
    id: 'hypertrophy',
    label: 'Muscle Size',
    emoji: '💪',
    description: 'Build muscle mass',
    color: '#FF6B6B',
    gradient: ['#FF6B6B', '#EE5A5A'],
  },
  {
    id: 'strength',
    label: 'Strength',
    emoji: '🏋️',
    description: 'Get stronger',
    color: '#4ECDC4',
    gradient: ['#4ECDC4', '#44A08D'],
  },
  {
    id: 'yoga',
    label: 'Yoga',
    emoji: '🧘',
    description: 'Mind & body flow',
    color: '#A78BFA',
    gradient: ['#A78BFA', '#8B5CF6'],
  },
  {
    id: 'hiit',
    label: 'HIIT',
    emoji: '🔥',
    description: 'Burn calories fast',
    color: '#F59E0B',
    gradient: ['#F59E0B', '#D97706'],
  },
  {
    id: 'flexibility',
    label: 'Flexibility',
    emoji: '🤸',
    description: 'Improve mobility',
    color: '#EC4899',
    gradient: ['#EC4899', '#DB2777'],
  },
  {
    id: 'endurance',
    label: 'Endurance',
    emoji: '🏃',
    description: 'Build stamina',
    color: '#06B6D4',
    gradient: ['#06B6D4', '#0891B2'],
  },
];

// Equipment options
const EQUIPMENT = [
  { id: 'bodyweight', label: 'Bodyweight', emoji: '🤸' },
  { id: 'dumbbells', label: 'Dumbbells', emoji: '🏋️' },
  { id: 'barbell', label: 'Barbell', emoji: '🏋️‍♂️' },
  { id: 'kettlebell', label: 'Kettlebell', emoji: '🔔' },
  { id: 'resistance_bands', label: 'Bands', emoji: '🎗️' },
  { id: 'pull_up_bar', label: 'Pull-up Bar', emoji: '🪜' },
  { id: 'cables', label: 'Cables', emoji: '🔌' },
  { id: 'machines', label: 'Machines', emoji: '🤖' },
];

// Target muscle groups
const MUSCLE_GROUPS = [
  { id: 'full_body', label: 'Full Body', emoji: '🦾' },
  { id: 'upper', label: 'Upper Body', emoji: '💪' },
  { id: 'lower', label: 'Lower Body', emoji: '🦵' },
  { id: 'push', label: 'Push', emoji: '👐' },
  { id: 'pull', label: 'Pull', emoji: '🤲' },
  { id: 'core', label: 'Core', emoji: '🎯' },
];

// Duration options
const DURATIONS = [15, 20, 30, 45, 60, 75, 90];

// Level colors
const getLevelColor = (level) => {
  if (level <= 1) return '#10B981'; // Green
  if (level <= 2) return '#34D399';
  if (level <= 3) return '#FBBF24'; // Yellow
  if (level <= 4) return '#F97316'; // Orange
  return '#EF4444'; // Red
};

const getLevelLabel = (level) => {
  const labels = ['Beginner', 'Novice', 'Intermediate', 'Advanced', 'Elite'];
  return labels[Math.min(level - 1, 4)];
};

// Collapsible Section Component
function CollapsibleSection({ title, icon: Icon, color, children, defaultOpen = false, count }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const animatedHeight = useRef(new Animated.Value(defaultOpen ? 1 : 0)).current;

  const toggleSection = () => {
    hapticLight();
    setIsOpen(!isOpen);
    Animated.spring(animatedHeight, {
      toValue: isOpen ? 0 : 1,
      useNativeDriver: false,
      tension: 50,
      friction: 10,
    }).start();
  };

  return (
    <View style={styles.collapsibleSection}>
      <Pressable style={styles.collapsibleHeader} onPress={toggleSection}>
        <View style={[styles.collapsibleIcon, { backgroundColor: color + '20' }]}>
          <Icon size={20} color={color} />
        </View>
        <View style={styles.collapsibleTitleContainer}>
          <Text style={styles.collapsibleTitle}>{title}</Text>
          {count !== undefined && (
            <View style={[styles.countBadge, { backgroundColor: color + '20' }]}>
              <Text style={[styles.countBadgeText, { color }]}>{count}</Text>
            </View>
          )}
        </View>
        <Animated.View
          style={{
            transform: [
              {
                rotate: animatedHeight.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '180deg'],
                }),
              },
            ],
          }}
        >
          <ChevronDown size={20} color={Colors.textSecondary} />
        </Animated.View>
      </Pressable>
      <Animated.View
        style={[
          styles.collapsibleContent,
          {
            maxHeight: animatedHeight.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 2000],
            }),
            opacity: animatedHeight,
          },
        ]}
      >
        {children}
      </Animated.View>
    </View>
  );
}

// Goal Card Component
function GoalCard({ goal, isSelected, onSelect }) {
  return (
    <Pressable
      style={[styles.goalCard, isSelected && styles.goalCardSelected]}
      onPress={() => onSelect(goal.id)}
    >
      {isSelected && (
        <LinearGradient
          colors={goal.gradient}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      )}
      <Text style={styles.goalEmoji}>{goal.emoji}</Text>
      <Text style={[styles.goalLabel, isSelected && styles.goalLabelSelected]}>
        {goal.label}
      </Text>
      <Text style={[styles.goalDescription, isSelected && styles.goalDescriptionSelected]}>
        {goal.description}
      </Text>
      {isSelected && (
        <View style={styles.goalCheckmark}>
          <Check size={16} color="#fff" />
        </View>
      )}
    </Pressable>
  );
}

// Equipment Chip Component
function EquipmentChip({ item, isSelected, onToggle }) {
  return (
    <Pressable
      style={[styles.equipmentChip, isSelected && styles.equipmentChipSelected]}
      onPress={() => onToggle(item.id)}
    >
      <Text style={styles.equipmentEmoji}>{item.emoji}</Text>
      <Text style={[styles.equipmentLabel, isSelected && styles.equipmentLabelSelected]}>
        {item.label}
      </Text>
      {isSelected && (
        <View style={styles.equipmentCheck}>
          <Check size={12} color={Colors.primary} />
        </View>
      )}
    </Pressable>
  );
}

// Main Exercise Card
function MainExerciseCard({ exercise, index, goalColor, isActive, onToggle, onSetComplete, onStartRest }) {
  return (
    <View style={styles.exerciseCard}>
      <Pressable onPress={onToggle} style={styles.exerciseCardHeader}>
        <View style={[styles.exerciseNumber, { backgroundColor: goalColor + '20' }]}>
          <Text style={[styles.exerciseNumberText, { color: goalColor }]}>{index + 1}</Text>
        </View>
        <View style={styles.exerciseNameContainer}>
          <Text style={styles.exerciseName}>{exercise.name}</Text>
          {exercise.muscle_group && (
            <Text style={styles.exerciseMuscle}>{exercise.muscle_group}</Text>
          )}
        </View>
        <Dumbbell size={16} color={isActive ? goalColor : Colors.textTertiary} />
      </Pressable>

      <View style={styles.exerciseMetrics}>
        <View style={styles.metricItem}>
          <Text style={styles.metricValue}>{exercise.sets}</Text>
          <Text style={styles.metricLabel}>Sets</Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metricItem}>
          <Text style={styles.metricValue}>{exercise.reps}</Text>
          <Text style={styles.metricLabel}>Reps</Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metricItem}>
          <Text style={styles.metricValue}>{exercise.rest}</Text>
          <Text style={styles.metricLabel}>Rest</Text>
        </View>
        {exercise.tempo !== 'Controlled' && exercise.tempo !== 'N/A' && (
          <>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={[styles.metricValue, styles.tempoValue]}>{exercise.tempo}</Text>
              <Text style={styles.metricLabel}>Tempo</Text>
            </View>
          </>
        )}
      </View>

      {exercise.tips && (
        <View style={styles.tipsContainer}>
          <Zap size={14} color={goalColor} />
          <Text style={styles.tipsText}>{exercise.tips}</Text>
        </View>
      )}

      {isActive && (
        <SetLogger
          exercise={exercise}
          onComplete={onSetComplete}
          onStartRest={onStartRest}
        />
      )}
    </View>
  );
}

// Simple Exercise Card (for warmup/cooldown)
function SimpleExerciseCard({ exercise }) {
  return (
    <View style={styles.simpleExerciseCard}>
      <View style={styles.simpleExerciseInfo}>
        <Text style={styles.simpleExerciseName}>{exercise.name}</Text>
        {exercise.notes && (
          <Text style={styles.simpleExerciseNotes}>{exercise.notes}</Text>
        )}
      </View>
      <Text style={styles.simpleExerciseDuration}>{exercise.duration}</Text>
    </View>
  );
}

// Recovery Status Card
function RecoveryStatusCard({ score, dataSource, readinessLabel }) {
  if (score === 0) return null;

  const { label, color, recommendation } = readinessLabel;

  let statusIcon = Heart;
  let statusMessage = '';
  let borderColor = color + '40';

  if (score < 40) {
    statusMessage = 'Recovery is low. Consider rest or light yoga.';
    statusIcon = AlertCircle;
    borderColor = '#FF525240';
  } else if (score < 60) {
    statusMessage = 'Moderate recovery. Reduce intensity 20%.';
    borderColor = '#FF980040';
  } else if (score >= 80) {
    statusMessage = 'Peak recovery. Push for PRs today!';
    borderColor = '#00E67640';
  } else {
    statusMessage = recommendation;
  }

  return (
    <View style={[recoveryStyles.container, { borderColor }]}>
      <View style={recoveryStyles.headerRow}>
        <View style={[recoveryStyles.iconContainer, { backgroundColor: color + '20' }]}>
          <Heart size={16} color={color} />
        </View>
        <View style={recoveryStyles.headerText}>
          <Text style={recoveryStyles.title}>Recovery Status</Text>
          {dataSource === 'biometric-enhanced' && (
            <View style={recoveryStyles.biometricBadge}>
              <Text style={recoveryStyles.biometricBadgeText}>HRV</Text>
            </View>
          )}
        </View>
        <View style={[recoveryStyles.scoreBadge, { backgroundColor: color + '20' }]}>
          <Text style={[recoveryStyles.scoreText, { color }]}>{score}</Text>
          <Text style={[recoveryStyles.scoreLabel, { color: color + 'CC' }]}>{label}</Text>
        </View>
      </View>

      {/* Score bar */}
      <View style={recoveryStyles.barBackground}>
        <View style={[recoveryStyles.barFill, { width: `${score}%`, backgroundColor: color }]} />
      </View>

      {/* Message */}
      <Text style={recoveryStyles.message}>{statusMessage}</Text>

      {dataSource === 'self-reported' && (
        <Text style={recoveryStyles.sourceHint}>Based on self-reported data</Text>
      )}
    </View>
  );
}

const recoveryStyles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  headerText: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  biometricBadge: {
    backgroundColor: 'rgba(0, 212, 255, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  biometricBadgeText: {
    fontSize: 9,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  scoreBadge: {
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  scoreText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  scoreLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
  barBackground: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 3,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  message: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  sourceHint: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: Spacing.xs,
    fontStyle: 'italic',
  },
});

// Recovery Banner — color-coded by recovery score
function RecoveryBanner({ score, isLoading }) {
  if (isLoading || score === 0) return null;

  let backgroundColor, textColor, message;
  if (score > 70) {
    backgroundColor = 'rgba(16, 185, 129, 0.15)';
    textColor = '#10B981';
    message = 'Recovery: Great \u2014 go all out';
  } else if (score >= 40) {
    backgroundColor = 'rgba(251, 191, 36, 0.15)';
    textColor = '#FBBF24';
    message = 'Recovery: Moderate \u2014 consider lighter weights';
  } else {
    backgroundColor = 'rgba(239, 68, 68, 0.15)';
    textColor = '#EF4444';
    message = 'Recovery: Low \u2014 rest day recommended';
  }

  return (
    <View style={[bannerStyles.container, { backgroundColor }]}>
      <Heart size={16} color={textColor} />
      <Text style={[bannerStyles.text, { color: textColor }]}>{message}</Text>
      <Text style={[bannerStyles.score, { color: textColor }]}>{score}</Text>
    </View>
  );
}

const bannerStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  text: {
    flex: 1,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  score: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
});

function GenerateWorkoutScreenContent() {
  const router = useRouter();
  const { addExercise } = useMeals();
  const { isOnline } = useOffline();
  const scrollViewRef = useRef(null);
  const { getReadinessScore, getReadinessLabel, dataSource, getDetailedReadiness, isLoading: recoveryLoading } = useRecovery();

  // Recovery data
  const recoveryScore = useMemo(() => getReadinessScore(), [getReadinessScore]);
  const recoveryLabel = useMemo(() => getReadinessLabel(recoveryScore), [getReadinessLabel, recoveryScore]);
  const recoveryDetails = useMemo(() => getDetailedReadiness(), [getDetailedReadiness]);

  // Form state
  const [goal, setGoal] = useState('hypertrophy');
  const [level, setLevel] = useState(3);
  const [duration, setDuration] = useState(30);
  const [selectedEquipment, setSelectedEquipment] = useState(['bodyweight']);
  const [targetMuscles, setTargetMuscles] = useState('full_body');
  const [injuries, setInjuries] = useState('');

  // UI state
  const [step, setStep] = useState(1); // 1: Goal, 2: Details, 3: Results
  const [isGenerating, setIsGenerating] = useState(false);
  const [workout, setWorkout] = useState(null);
  const [supersetSuggestions, setSupersetSuggestions] = useState([]);

  // Exercise tracking state
  const [activeExerciseIndex, setActiveExerciseIndex] = useState(null);
  const [restTimerVisible, setRestTimerVisible] = useState(false);
  const [restSeconds, setRestSeconds] = useState(60);
  const [prInfo, setPrInfo] = useState(null);
  const { checkAndUpdatePR } = usePersonalRecords();
  const { addWorkout } = useWorkoutHistory();
  const { saveAsTemplate } = useWorkoutTemplates();

  const selectedGoal = GOALS.find((g) => g.id === goal);
  const goalColor = selectedGoal?.color || Colors.primary;

  const handleToggleExercise = (index) => {
    setActiveExerciseIndex((prev) => (prev === index ? null : index));
  };

  const handleStartRest = (seconds) => {
    setRestSeconds(seconds);
    setRestTimerVisible(true);
  };

  const handleExerciseComplete = async (data) => {
    // Check for personal records
    const prResult = await checkAndUpdatePR(data.exerciseName, data.sets);
    if (prResult && prResult.isNewPR) {
      setPrInfo({
        exerciseName: data.exerciseName,
        prType: prResult.prType,
        value: prResult.newValue,
      });
    }
    setActiveExerciseIndex(null);
  };

  const toggleEquipment = (id) => {
    setSelectedEquipment((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    );
  };

  const handleGenerate = async () => {
    if (!isOnline) {
      Alert.alert('No Connection', 'Workout generation requires an internet connection.');
      return;
    }
    try {
      await hapticHeavy();
      setIsGenerating(true);

      const params = {
        goal,
        level: Math.round(level),
        duration,
        equipment: selectedEquipment,
        targetMuscles: MUSCLE_GROUPS.find((m) => m.id === targetMuscles)?.label || 'Full Body',
        injuries: injuries.trim() || null,
        recoveryScore: recoveryScore > 0 ? recoveryScore : undefined,
      };

      const result = await generateWorkout(params);
      setWorkout(result);

      // Generate superset suggestions from exercise IDs in main_set
      const exerciseIds = (result.main_set || []).map((ex) =>
        (ex.name || '').toLowerCase().replace(/\s+/g, '-')
      );
      const suggestions = suggestSupersets(exerciseIds);
      setSupersetSuggestions(suggestions);

      setStep(3);
      await hapticSuccess();

      // Scroll to top
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    } catch (error) {
      if (__DEV__) console.error('Generation error:', error);
      Alert.alert(
        'Generation Failed',
        error.message || 'Could not generate workout. Please try again.',
        [{ text: 'OK' }]
      );
      await hapticError();
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveAndStart = async () => {
    if (!workout) return;

    try {
      await hapticSuccess();

      const workoutSummary = {
        name: workout.title,
        emoji: selectedGoal?.emoji || '💪',
      };

      await addExercise(workoutSummary, workout.duration, workout.estimated_calories);

      // Save full workout to history
      await addWorkout({
        name: workout.title,
        emoji: selectedGoal?.emoji,
        type: goal,
        duration: workout.duration,
        calories: workout.estimated_calories,
        exercises: workout.main_set,
        notes: workout.coach_notes,
      });

      Alert.alert(
        'Workout Saved!',
        `Your ${workout.duration}-minute ${selectedGoal?.label} session has been logged.`,
        [
          {
            text: 'Save as Template',
            onPress: async () => {
              await saveAsTemplate(
                { title: workout.title, main_set: workout.main_set, duration: workout.duration, estimated_calories: workout.estimated_calories, coach_notes: workout.coach_notes },
                workout.title,
                selectedGoal?.emoji || '💪'
              );
              Alert.alert('Template Saved!', 'You can reuse this workout anytime from Workout Templates.', [{ text: 'OK', onPress: () => router.replace('/') }]);
            },
          },
          { text: 'Done', onPress: () => router.replace('/') },
        ]
      );
    } catch (error) {
      if (__DEV__) console.error('Error saving workout:', error);
      Alert.alert('Error', 'Failed to save workout. Please try again.');
    }
  };

  const handleRegenerate = () => {
    setWorkout(null);
    setSupersetSuggestions([]);
    handleGenerate();
  };

  const handleBack = () => {
    if (step === 3) {
      setStep(2);
      setWorkout(null);
    } else if (step === 2) {
      setStep(1);
    } else {
      router.back();
    }
  };

  const handleNext = () => {
    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      handleGenerate();
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0A0A0F', '#1A1A2E', '#0A0A0F']}
        style={StyleSheet.absoluteFill}
      />

      {/* Animated background glow */}
      <View style={[styles.glowOrb, { backgroundColor: goalColor + '15' }]} />
      <View style={[styles.glowOrb2, { backgroundColor: goalColor + '10' }]} />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={handleBack}>
            <X size={24} color={Colors.text} />
          </Pressable>
          <View style={styles.titleContainer}>
            <Sparkles size={20} color={goalColor} />
            <Text style={styles.title}>Smart Trainer</Text>
            <View style={styles.proBadge}>
              <Text style={styles.proBadgeText}>PRO</Text>
            </View>
          </View>
          <View style={styles.placeholder} />
        </View>

        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          {[1, 2, 3].map((s) => (
            <View
              key={s}
              style={[
                styles.progressDot,
                s === step && { backgroundColor: goalColor },
                s < step && { backgroundColor: goalColor + '60' },
              ]}
            />
          ))}
        </View>

        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Step 1: Goal Selection */}
          {step === 1 && (
            <>
              <RecoveryBanner score={recoveryScore} isLoading={recoveryLoading} />
              <Text style={styles.stepTitle}>What's your goal?</Text>
              <Text style={styles.stepSubtitle}>
                Choose your training focus for today
              </Text>

              <View style={styles.goalsGrid}>
                {GOALS.map((g) => (
                  <GoalCard
                    key={g.id}
                    goal={g}
                    isSelected={goal === g.id}
                    onSelect={setGoal}
                  />
                ))}
              </View>
            </>
          )}

          {/* Step 2: Details */}
          {step === 2 && (
            <>
              <RecoveryBanner score={recoveryScore} isLoading={recoveryLoading} />
              <Text style={styles.stepTitle}>Customize your session</Text>
              <Text style={styles.stepSubtitle}>
                Fine-tune your {selectedGoal?.label} workout
              </Text>

              {/* Recovery Status Card */}
              {recoveryScore > 0 && (
                <RecoveryStatusCard
                  score={recoveryScore}
                  dataSource={recoveryDetails.dataSource}
                  readinessLabel={recoveryLabel}
                />
              )}

              {/* Level Slider */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Zap size={18} color={getLevelColor(level)} />
                  <Text style={styles.sectionTitle}>Experience Level</Text>
                  <View
                    style={[
                      styles.levelBadge,
                      { backgroundColor: getLevelColor(level) + '20' },
                    ]}
                  >
                    <Text style={[styles.levelBadgeText, { color: getLevelColor(level) }]}>
                      {getLevelLabel(level)}
                    </Text>
                  </View>
                </View>
                <View style={styles.sliderContainer}>
                  <Slider
                    style={styles.slider}
                    minimumValue={1}
                    maximumValue={5}
                    step={1}
                    value={level}
                    onValueChange={setLevel}
                    minimumTrackTintColor={getLevelColor(level)}
                    maximumTrackTintColor={Colors.border}
                    thumbTintColor={getLevelColor(level)}
                  />
                  <View style={styles.sliderLabels}>
                    <Text style={styles.sliderLabel}>Beginner</Text>
                    <Text style={styles.sliderLabel}>Elite</Text>
                  </View>
                </View>
              </View>

              {/* Duration */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Clock size={18} color={goalColor} />
                  <Text style={styles.sectionTitle}>Duration</Text>
                  <Text style={styles.sectionValue}>{duration} min</Text>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.durationScroll}
                >
                  {DURATIONS.map((d) => (
                    <Pressable
                      key={d}
                      style={[
                        styles.durationChip,
                        duration === d && { backgroundColor: goalColor, borderColor: goalColor },
                      ]}
                      onPress={() => setDuration(d)}
                    >
                      <Text
                        style={[
                          styles.durationChipText,
                          duration === d && styles.durationChipTextSelected,
                        ]}
                      >
                        {d}m
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              {/* Target Muscles */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Target size={18} color={goalColor} />
                  <Text style={styles.sectionTitle}>Target Area</Text>
                </View>
                <View style={styles.muscleGrid}>
                  {MUSCLE_GROUPS.map((m) => (
                    <Pressable
                      key={m.id}
                      style={[
                        styles.muscleChip,
                        targetMuscles === m.id && {
                          backgroundColor: goalColor + '20',
                          borderColor: goalColor,
                        },
                      ]}
                      onPress={() => setTargetMuscles(m.id)}
                    >
                      <Text style={styles.muscleEmoji}>{m.emoji}</Text>
                      <Text
                        style={[
                          styles.muscleLabel,
                          targetMuscles === m.id && { color: goalColor },
                        ]}
                      >
                        {m.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Equipment */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Dumbbell size={18} color={goalColor} />
                  <Text style={styles.sectionTitle}>Equipment</Text>
                  <Text style={styles.sectionHint}>Select all available</Text>
                </View>
                <View style={styles.equipmentGrid}>
                  {EQUIPMENT.map((e) => (
                    <EquipmentChip
                      key={e.id}
                      item={e}
                      isSelected={selectedEquipment.includes(e.id)}
                      onToggle={toggleEquipment}
                    />
                  ))}
                </View>
              </View>

              {/* Injuries */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <AlertCircle size={18} color={Colors.warning} />
                  <Text style={styles.sectionTitle}>Limitations</Text>
                  <Text style={styles.sectionHint}>Optional</Text>
                </View>
                <TextInput
                  style={styles.injuryInput}
                  placeholder="e.g., Lower back pain, knee injury..."
                  placeholderTextColor={Colors.textTertiary}
                  value={injuries}
                  onChangeText={setInjuries}
                  multiline
                  numberOfLines={2}
                />
              </View>
            </>
          )}

          {/* Step 3: Results */}
          {step === 3 && workout && (
            <>
              {/* Workout Header */}
              <View style={styles.workoutHeader}>
                <LinearGradient
                  colors={selectedGoal?.gradient || [goalColor, goalColor]}
                  style={styles.workoutHeaderGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.workoutEmoji}>{selectedGoal?.emoji}</Text>
                  <Text style={styles.workoutTitle}>{workout.title}</Text>
                  {workout.subtitle && (
                    <Text style={styles.workoutSubtitle}>{workout.subtitle}</Text>
                  )}

                  <View style={styles.workoutStats}>
                    <View style={styles.workoutStat}>
                      <Clock size={16} color="rgba(255,255,255,0.8)" />
                      <Text style={styles.workoutStatText}>{workout.duration} min</Text>
                    </View>
                    <View style={styles.workoutStat}>
                      <Flame size={16} color="rgba(255,255,255,0.8)" />
                      <Text style={styles.workoutStatText}>
                        ~{workout.estimated_calories} cal
                      </Text>
                    </View>
                    <View style={styles.workoutStat}>
                      <Zap size={16} color="rgba(255,255,255,0.8)" />
                      <Text style={styles.workoutStatText}>
                        {workout.difficulty_rating}/10
                      </Text>
                    </View>
                  </View>
                </LinearGradient>
              </View>

              {/* Coach Notes */}
              {workout.coach_notes && (
                <View style={styles.coachNotes}>
                  <View style={styles.coachNotesIcon}>
                    <Heart size={16} color={goalColor} />
                  </View>
                  <Text style={styles.coachNotesText}>{workout.coach_notes}</Text>
                </View>
              )}

              {/* Warmup Section */}
              <CollapsibleSection
                title="Warm-Up"
                icon={Timer}
                color="#10B981"
                count={workout.warmup?.length}
                defaultOpen={false}
              >
                <View style={styles.exerciseList}>
                  {workout.warmup?.map((exercise) => (
                    <SimpleExerciseCard key={exercise.id} exercise={exercise} />
                  ))}
                </View>
              </CollapsibleSection>

              {/* Main Set Section */}
              <CollapsibleSection
                title="Main Workout"
                icon={Dumbbell}
                color={goalColor}
                count={workout.main_set?.length}
                defaultOpen={true}
              >
                <View style={styles.exerciseList}>
                  {workout.main_set?.map((exercise, index) => (
                    <MainExerciseCard
                      key={exercise.id}
                      exercise={exercise}
                      index={index}
                      goalColor={goalColor}
                      isActive={activeExerciseIndex === index}
                      onToggle={() => handleToggleExercise(index)}
                      onSetComplete={handleExerciseComplete}
                      onStartRest={handleStartRest}
                    />
                  ))}
                </View>
              </CollapsibleSection>

              {/* Cooldown Section */}
              <CollapsibleSection
                title="Cool-Down"
                icon={Heart}
                color="#8B5CF6"
                count={workout.cooldown?.length}
                defaultOpen={false}
              >
                <View style={styles.exerciseList}>
                  {workout.cooldown?.map((exercise) => (
                    <SimpleExerciseCard key={exercise.id} exercise={exercise} />
                  ))}
                </View>
              </CollapsibleSection>

              {/* Superset Suggestions */}
              {supersetSuggestions.length > 0 && (
                <View style={styles.proTipsSection}>
                  <View style={styles.proTipsHeader}>
                    <Zap size={18} color={Colors.warning} />
                    <Text style={styles.proTipsTitle}>Superset Suggestions</Text>
                  </View>
                  <Text style={[styles.supersetRest, { marginBottom: Spacing.sm }]}>
                    Pair these exercises back-to-back to save time and boost intensity
                  </Text>
                  {supersetSuggestions.map((group) => (
                    <View key={group.id} style={styles.supersetContainer}>
                      <View style={styles.supersetBadge}>
                        <Text style={styles.supersetBadgeText}>
                          {group.type === 'triset' ? 'Tri-Set' : 'Superset'}
                        </Text>
                      </View>
                      {group.exercises.map((exId, idx) => (
                        <React.Fragment key={exId}>
                          <Text style={styles.supersetExercise}>
                            {exId.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                          </Text>
                          {idx < group.exercises.length - 1 && (
                            <Text style={styles.supersetRest}>
                              {'\u26A1'} No rest
                            </Text>
                          )}
                        </React.Fragment>
                      ))}
                      <Text style={styles.supersetRest}>
                        Rest {group.restAfterGroup}s after round
                      </Text>
                      <View style={[styles.supersetBadge, { marginTop: 4 }]}>
                        <Text style={styles.supersetBadgeText}>{group.rounds} rounds</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Pro Tips */}
              {workout.pro_tips?.length > 0 && (
                <View style={styles.proTipsSection}>
                  <View style={styles.proTipsHeader}>
                    <Award size={18} color={Colors.warning} />
                    <Text style={styles.proTipsTitle}>Pro Tips</Text>
                  </View>
                  {workout.pro_tips.map((tip, index) => (
                    <View key={index} style={styles.proTip}>
                      <View style={styles.proTipBullet} />
                      <Text style={styles.proTipText}>{tip}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.resultActions}>
                <Pressable style={styles.regenerateButton} onPress={handleRegenerate}>
                  <RotateCcw size={20} color={Colors.textSecondary} />
                  <Text style={styles.regenerateButtonText}>Regenerate</Text>
                </Pressable>

                <Pressable style={styles.saveButton} onPress={handleSaveAndStart}>
                  <LinearGradient
                    colors={selectedGoal?.gradient || Gradients.success}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.saveButtonGradient}
                  >
                    <Play size={20} color="#fff" />
                    <Text style={styles.saveButtonText}>Save & Start</Text>
                  </LinearGradient>
                </Pressable>
              </View>

              {/* Start Workout Session Button */}
              <Pressable
                style={styles.startSessionButton}
                onPress={() => {
                  hapticHeavy();
                  router.push({
                    pathname: '/workout-session',
                    params: {
                      workout: JSON.stringify({
                        title: workout.title,
                        name: workout.title,
                        emoji: selectedGoal?.emoji || '',
                        type: goal,
                        main_set: workout.main_set,
                        duration: workout.duration,
                        estimated_calories: workout.estimated_calories,
                      }),
                    },
                  });
                }}
              >
                <LinearGradient
                  colors={Gradients.electric}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.startSessionGradient}
                >
                  <Dumbbell size={22} color="#fff" />
                  <Text style={styles.startSessionText}>Start Workout Session</Text>
                  <ChevronRight size={20} color="rgba(255,255,255,0.7)" />
                </LinearGradient>
              </Pressable>
            </>
          )}

          <View style={styles.bottomSpacer} />
        </ScrollView>

        {/* Bottom Action Bar (Step 1 & 2) */}
        {step < 3 && !isGenerating && (
          <BlurView intensity={80} tint="dark" style={styles.bottomBar}>
            <Pressable style={styles.nextButton} onPress={handleNext}>
              <LinearGradient
                colors={selectedGoal?.gradient || Gradients.electric}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.nextButtonGradient}
              >
                <Text style={styles.nextButtonText}>
                  {step === 1 ? 'Continue' : 'Generate Workout'}
                </Text>
                <ChevronRight size={20} color="#fff" />
              </LinearGradient>
            </Pressable>
            <Text style={styles.poweredBy}>Powered by Google Gemini AI</Text>
          </BlurView>
        )}

        {/* Loading Overlay */}
        {isGenerating && (
          <View style={styles.loadingOverlay}>
            <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={styles.loadingContent}>
              <View style={[styles.loadingSpinner, { borderColor: goalColor }]}>
                <ActivityIndicator size="large" color={goalColor} />
              </View>
              <Text style={styles.loadingTitle}>Creating Your Plan</Text>
              <Text style={styles.loadingSubtitle}>
                Our AI coach is designing your perfect workout...
              </Text>
            </View>
          </View>
        )}

        {/* Rest Timer Overlay */}
        <RestTimer
          visible={restTimerVisible}
          seconds={restSeconds}
          onComplete={() => setRestTimerVisible(false)}
          onSkip={() => setRestTimerVisible(false)}
        />

        {/* PR Celebration */}
        <PRCelebration
          visible={!!prInfo}
          exerciseName={prInfo?.exerciseName}
          prType={prInfo?.prType}
          value={prInfo?.value}
          onDismiss={() => setPrInfo(null)}
        />
      </SafeAreaView>
    </View>
  );
}

// Premium-gated export - redirects non-subscribers to paywall
function GenerateWorkoutScreenInner() {
  return (
    <PremiumGate>
      <GenerateWorkoutScreenContent />
    </PremiumGate>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
  safeArea: {
    flex: 1,
  },
  glowOrb: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
  },
  glowOrb2: {
    position: 'absolute',
    bottom: 100,
    left: -150,
    width: 400,
    height: 400,
    borderRadius: 200,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  proBadge: {
    backgroundColor: Colors.warning,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 4,
  },
  proBadgeText: {
    fontSize: 10,
    fontWeight: FontWeight.black,
    color: '#000',
  },
  placeholder: {
    width: 44,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
  },
  stepTitle: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  stepSubtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  // Goal Cards
  goalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  goalCard: {
    width: (SCREEN_WIDTH - Spacing.md * 2 - Spacing.sm) / 2,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  goalCardSelected: {
    borderColor: 'transparent',
  },
  goalEmoji: {
    fontSize: 40,
    marginBottom: Spacing.sm,
  },
  goalLabel: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: 4,
  },
  goalLabelSelected: {
    color: '#fff',
  },
  goalDescription: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  goalDescriptionSelected: {
    color: 'rgba(255,255,255,0.8)',
  },
  goalCheckmark: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Sections
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    flex: 1,
  },
  sectionValue: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  sectionHint: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
  },
  // Level Slider
  levelBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  levelBadgeText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  sliderContainer: {
    paddingHorizontal: Spacing.sm,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -Spacing.xs,
  },
  sliderLabel: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },
  // Duration
  durationScroll: {
    gap: Spacing.sm,
    paddingRight: Spacing.md,
  },
  durationChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  durationChipText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.textSecondary,
  },
  durationChipTextSelected: {
    color: '#fff',
  },
  // Muscle Groups
  muscleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  muscleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  muscleEmoji: {
    fontSize: 18,
  },
  muscleLabel: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
  },
  // Equipment
  equipmentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  equipmentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  equipmentChipSelected: {
    backgroundColor: Colors.primary + '20',
    borderColor: Colors.primary,
  },
  equipmentEmoji: {
    fontSize: 16,
  },
  equipmentLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
  },
  equipmentLabelSelected: {
    color: Colors.primary,
  },
  equipmentCheck: {
    marginLeft: 4,
  },
  // Injury Input
  injuryInput: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    color: Colors.text,
    fontSize: FontSize.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  // Bottom Bar
  bottomBar: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  nextButton: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  nextButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md + 4,
    gap: Spacing.sm,
  },
  nextButtonText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: '#fff',
  },
  poweredBy: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  // Loading
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
    padding: Spacing.xl,
  },
  loadingSpinner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  loadingTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  loadingSubtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  // Workout Results
  workoutHeader: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
  },
  workoutHeaderGradient: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  workoutEmoji: {
    fontSize: 48,
    marginBottom: Spacing.sm,
  },
  workoutTitle: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: '#fff',
    textAlign: 'center',
  },
  workoutSubtitle: {
    fontSize: FontSize.md,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  workoutStats: {
    flexDirection: 'row',
    gap: Spacing.lg,
    marginTop: Spacing.lg,
  },
  workoutStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  workoutStatText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: '#fff',
  },
  // Coach Notes
  coachNotes: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  coachNotesIcon: {
    marginTop: 2,
  },
  coachNotesText: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    lineHeight: 22,
  },
  // Collapsible
  collapsibleSection: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  collapsibleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  collapsibleIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  collapsibleTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  collapsibleTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  countBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  countBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  collapsibleContent: {
    overflow: 'hidden',
  },
  exerciseList: {
    padding: Spacing.md,
    paddingTop: 0,
    gap: Spacing.sm,
  },
  // Exercise Cards
  exerciseCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  exerciseCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  exerciseNumber: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exerciseNumberText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  exerciseNameContainer: {
    flex: 1,
  },
  exerciseName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  exerciseMuscle: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  exerciseMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  tempoValue: {
    fontSize: FontSize.sm,
  },
  metricLabel: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  tipsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
  },
  tipsText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  // Simple Exercise Card
  simpleExerciseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  simpleExerciseInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  simpleExerciseName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.text,
  },
  simpleExerciseNotes: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  simpleExerciseDuration: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  // Pro Tips
  proTipsSection: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.2)',
  },
  proTipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  proTipsTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.warning,
  },
  proTip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  proTipBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.warning,
    marginTop: 6,
  },
  proTipText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  // Result Actions
  resultActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xl,
  },
  regenerateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  regenerateButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
  },
  saveButton: {
    flex: 2,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.xs,
  },
  saveButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: '#fff',
  },
  startSessionButton: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    marginTop: Spacing.sm,
  },
  startSessionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md + 4,
    paddingHorizontal: Spacing.lg,
  },
  startSessionText: {
    flex: 1,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: '#fff',
    textAlign: 'center',
  },
  // Superset Suggestions
  supersetContainer: {
    marginVertical: Spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: Colors.warning,
    paddingLeft: Spacing.md,
    gap: Spacing.xs,
  },
  supersetBadge: {
    backgroundColor: Colors.warning + '22',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    alignSelf: 'flex-start',
  },
  supersetBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.warning,
    textTransform: 'uppercase',
  },
  supersetExercise: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  supersetRest: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  bottomSpacer: {
    height: 120,
  },
});

export default function GenerateWorkoutScreen(props) {
  return (
    <ScreenErrorBoundary screenName="GenerateWorkoutScreen">
      <GenerateWorkoutScreenInner {...props} />
    </ScreenErrorBoundary>
  );
}

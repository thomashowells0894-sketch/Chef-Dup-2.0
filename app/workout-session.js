/**
 * WorkoutSession - The main active workout tracking screen.
 *
 * Features:
 * 1.  Active timer (elapsed time counting up)
 * 2.  Exercise list with sets/reps/weight
 * 3.  Set logger (reps, weight, RPE) per exercise
 * 4.  Auto-start rest timer after completing a set
 * 5.  Exercise swap for alternatives targeting same muscle group
 * 6.  Superset visual grouping
 * 7.  Progress comparison (previous session weights/reps)
 * 8.  Notes per exercise
 * 9.  Workout summary on completion
 * 10. Save to Supabase
 *
 * Receives workout data via route params from generate-workout or workout-templates.
 */
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  TextInput,
  FlatList,
  Modal,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Animated, { FadeInUp, FadeInDown, FadeIn, SlideInRight } from 'react-native-reanimated';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Clock,
  Flame,
  Trophy,
  Award,
  Zap,
  Play,
  Pause,
  Check,
  RotateCcw,
  ArrowRightLeft,
  StickyNote,
  Timer,
  TrendingUp,
  Volume2,
  Settings,
  Target,
  CheckCircle,
  Layers,
} from 'lucide-react-native';
import { hapticLight, hapticHeavy, hapticSuccess } from '../lib/haptics';
import {
  Colors,
  Gradients,
  Spacing,
  FontSize,
  FontWeight,
  BorderRadius,
  Shadows,
} from '../constants/theme';
import useWorkoutSession from '../hooks/useWorkoutSession';
import useWorkoutHistory from '../hooks/useWorkoutHistory';
import { searchExercises, getExercisesByMuscle } from '../data/exerciseLibrary';
import WorkoutTimer from '../components/WorkoutTimer';
import SetLogger from '../components/SetLogger';
import RestTimer from '../components/RestTimer';
import PRCelebration from '../components/PRCelebration';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const REST_PRESETS = [60, 90, 120, 180];

// ---------------------------------------------------------------------------
// Exercise Swap Modal
// ---------------------------------------------------------------------------
function ExerciseSwapModal({ visible, muscleGroup, currentName, onSelect, onClose }) {
  const [search, setSearch] = useState('');

  const alternatives = useMemo(() => {
    const results = muscleGroup
      ? getExercisesByMuscle(muscleGroup)
      : searchExercises(search || null);
    return results.filter((e) => e.name !== currentName).slice(0, 30);
  }, [muscleGroup, currentName, search]);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={swapStyles.overlay}>
        <View style={swapStyles.sheet}>
          <View style={swapStyles.header}>
            <Text style={swapStyles.title}>Swap Exercise</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <X size={24} color={Colors.text} />
            </Pressable>
          </View>

          {muscleGroup && (
            <Text style={swapStyles.subtitle}>
              Alternatives targeting {muscleGroup}
            </Text>
          )}

          <TextInput
            style={swapStyles.search}
            placeholder="Search exercises..."
            placeholderTextColor={Colors.textTertiary}
            value={search}
            onChangeText={setSearch}
          />

          <FlatList
            data={alternatives}
            keyExtractor={(item) => item.id}
            style={swapStyles.list}
            renderItem={({ item }) => (
              <Pressable
                style={swapStyles.item}
                onPress={() => {
                  hapticLight();
                  onSelect({
                    id: item.id,
                    name: item.name,
                    muscle_group: item.muscles?.primary?.[0] || muscleGroup,
                    tips: item.tips,
                  });
                  onClose();
                }}
              >
                <Text style={swapStyles.itemEmoji}>{item.emoji}</Text>
                <View style={swapStyles.itemInfo}>
                  <Text style={swapStyles.itemName}>{item.name}</Text>
                  <Text style={swapStyles.itemMuscle}>
                    {(item.muscles?.primary || []).join(', ')} {' | '} {item.difficulty}
                  </Text>
                </View>
                <ArrowRightLeft size={16} color={Colors.textTertiary} />
              </Pressable>
            )}
            ListEmptyComponent={
              <Text style={swapStyles.empty}>No matching exercises found</Text>
            }
          />
        </View>
      </View>
    </Modal>
  );
}

const swapStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
    maxHeight: '75%',
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xs,
  },
  search: {
    margin: Spacing.md,
    height: 44,
    backgroundColor: Colors.surfaceGlass,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  list: {
    paddingHorizontal: Spacing.md,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  itemEmoji: {
    fontSize: 24,
    width: 36,
    textAlign: 'center',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  itemMuscle: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  empty: {
    textAlign: 'center',
    color: Colors.textTertiary,
    padding: Spacing.xl,
    fontSize: FontSize.md,
  },
});

// ---------------------------------------------------------------------------
// Rest Settings Modal
// ---------------------------------------------------------------------------
function RestSettingsModal({ visible, current, onSelect, onClose }) {
  return (
    <Modal visible={visible} animationType="fade" transparent>
      <Pressable style={restModalStyles.overlay} onPress={onClose}>
        <View style={restModalStyles.content}>
          <Text style={restModalStyles.title}>Default Rest Timer</Text>
          <View style={restModalStyles.options}>
            {REST_PRESETS.map((sec) => (
              <Pressable
                key={sec}
                style={[
                  restModalStyles.option,
                  current === sec && restModalStyles.optionActive,
                ]}
                onPress={() => {
                  hapticLight();
                  onSelect(sec);
                  onClose();
                }}
              >
                <Text
                  style={[
                    restModalStyles.optionText,
                    current === sec && restModalStyles.optionTextActive,
                  ]}
                >
                  {sec < 60 ? `${sec}s` : `${sec / 60}:${sec % 60 === 0 ? '00' : sec % 60}`}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

const restModalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    width: SCREEN_WIDTH * 0.8,
    ...Shadows.card,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    justifyContent: 'center',
  },
  option: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  optionActive: {
    backgroundColor: Colors.primarySoft,
    borderColor: Colors.primary,
  },
  optionText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.textSecondary,
  },
  optionTextActive: {
    color: Colors.primary,
  },
});

// ---------------------------------------------------------------------------
// Workout Summary Modal
// ---------------------------------------------------------------------------
function WorkoutSummaryModal({ visible, summary, prs, onDone }) {
  if (!visible || !summary) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={summaryStyles.container}>
        <SafeAreaView style={summaryStyles.safe}>
          <ScrollView contentContainerStyle={summaryStyles.scroll}>
            {/* Hero */}
            <Animated.View entering={FadeInUp.delay(100)} style={summaryStyles.hero}>
              <LinearGradient
                colors={Gradients.success}
                style={summaryStyles.heroGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <CheckCircle size={48} color="#fff" />
                <Text style={summaryStyles.heroTitle}>Workout Complete!</Text>
                <Text style={summaryStyles.heroSubtitle}>{summary.name}</Text>
              </LinearGradient>
            </Animated.View>

            {/* Score */}
            <Animated.View entering={FadeInUp.delay(200)} style={summaryStyles.scoreCard}>
              <View style={summaryStyles.scoreCircle}>
                <Text style={summaryStyles.scoreGrade}>{summary.grade}</Text>
              </View>
              <View style={summaryStyles.scoreInfo}>
                <Text style={summaryStyles.scoreLabel}>Workout Score</Text>
                <Text style={summaryStyles.scoreValue}>{summary.score}/100</Text>
              </View>
            </Animated.View>

            {/* Stats Grid */}
            <Animated.View entering={FadeInUp.delay(300)} style={summaryStyles.statsGrid}>
              <View style={summaryStyles.statCard}>
                <Clock size={20} color={Colors.primary} />
                <Text style={summaryStyles.statValue}>{summary.duration}</Text>
                <Text style={summaryStyles.statLabel}>Minutes</Text>
              </View>
              <View style={summaryStyles.statCard}>
                <Dumbbell size={20} color={Colors.secondary} />
                <Text style={summaryStyles.statValue}>
                  {summary.totalVolume >= 1000
                    ? `${(summary.totalVolume / 1000).toFixed(1)}k`
                    : summary.totalVolume}
                </Text>
                <Text style={summaryStyles.statLabel}>Volume (lbs)</Text>
              </View>
              <View style={summaryStyles.statCard}>
                <Target size={20} color={Colors.success} />
                <Text style={summaryStyles.statValue}>{summary.totalSets}</Text>
                <Text style={summaryStyles.statLabel}>Sets</Text>
              </View>
              <View style={summaryStyles.statCard}>
                <Flame size={20} color={Colors.warning} />
                <Text style={summaryStyles.statValue}>{summary.estimatedCalories}</Text>
                <Text style={summaryStyles.statLabel}>Calories</Text>
              </View>
              <View style={summaryStyles.statCard}>
                <TrendingUp size={20} color={Colors.primary} />
                <Text style={summaryStyles.statValue}>{summary.totalReps}</Text>
                <Text style={summaryStyles.statLabel}>Reps</Text>
              </View>
              <View style={summaryStyles.statCard}>
                <Layers size={20} color={Colors.textSecondary} />
                <Text style={summaryStyles.statValue}>{summary.exercisesCompleted}</Text>
                <Text style={summaryStyles.statLabel}>Exercises</Text>
              </View>
            </Animated.View>

            {/* PRs */}
            {prs && prs.length > 0 && (
              <Animated.View entering={FadeInUp.delay(400)} style={summaryStyles.prSection}>
                <View style={summaryStyles.prHeader}>
                  <Trophy size={20} color={Colors.gold} />
                  <Text style={summaryStyles.prTitle}>Personal Records!</Text>
                </View>
                {prs.map((pr, i) => (
                  <View key={i} style={summaryStyles.prRow}>
                    <Award size={16} color={Colors.gold} />
                    <View style={summaryStyles.prInfo}>
                      <Text style={summaryStyles.prName}>{pr.exerciseName}</Text>
                      <Text style={summaryStyles.prDetail}>
                        New {pr.prType} PR: {pr.newValue}
                        {pr.prType === 'weight' ? ' lbs' : pr.prType === 'reps' ? ' reps' : ' lbs total'}
                        {pr.oldValue > 0 ? ` (was ${pr.oldValue})` : ''}
                      </Text>
                    </View>
                  </View>
                ))}
              </Animated.View>
            )}

            {/* Done Button */}
            <Animated.View entering={FadeInUp.delay(500)}>
              <Pressable style={summaryStyles.doneButton} onPress={onDone}>
                <LinearGradient
                  colors={Gradients.success}
                  style={summaryStyles.doneGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={summaryStyles.doneText}>Done</Text>
                </LinearGradient>
              </Pressable>
            </Animated.View>
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const summaryStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safe: {
    flex: 1,
  },
  scroll: {
    padding: Spacing.md,
    paddingBottom: 40,
  },
  hero: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
  },
  heroGradient: {
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  heroTitle: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.black,
    color: '#fff',
  },
  heroSubtitle: {
    fontSize: FontSize.md,
    color: 'rgba(255,255,255,0.8)',
  },
  scoreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surfaceGlass,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    ...Shadows.card,
  },
  scoreCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primarySoft,
    borderWidth: 2,
    borderColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreGrade: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.black,
    color: Colors.primary,
  },
  scoreInfo: {
    flex: 1,
  },
  scoreLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  scoreValue: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  statCard: {
    width: (SCREEN_WIDTH - Spacing.md * 2 - Spacing.sm * 2) / 3,
    backgroundColor: Colors.surfaceGlass,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    alignItems: 'center',
    gap: 6,
  },
  statValue: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  statLabel: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    textAlign: 'center',
  },
  prSection: {
    backgroundColor: Colors.surfaceGlass,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.goldSoft,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  prHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  prTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.gold,
  },
  prRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  prInfo: {
    flex: 1,
  },
  prName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  prDetail: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  doneButton: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  doneGradient: {
    paddingVertical: Spacing.md + 2,
    alignItems: 'center',
  },
  doneText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: '#fff',
  },
});

// ---------------------------------------------------------------------------
// Exercise Card for the workout list
// ---------------------------------------------------------------------------
function ExerciseCard({
  exercise,
  exerciseIndex,
  isActive,
  session,
  onPress,
  onSwap,
  onUpdateSet,
  onCompleteSet,
  onAddSet,
  onDeleteSet,
  onIncrementWeight,
  onUpdateNotes,
  onStartRest,
}) {
  const [showNotes, setShowNotes] = useState(!!exercise.notes);
  const completedSets = exercise.sets.filter((s) => s.completed).length;
  const totalSets = exercise.sets.length;
  const allDone = completedSets > 0 && completedSets === totalSets;

  return (
    <Animated.View entering={FadeInUp.delay(exerciseIndex * 50)}>
      <View
        style={[
          cardStyles.container,
          isActive && cardStyles.containerActive,
          allDone && cardStyles.containerComplete,
          exercise.isSuperset && cardStyles.containerSuperset,
        ]}
      >
        {/* Superset indicator */}
        {exercise.isSuperset && (
          <View style={cardStyles.supersetBadge}>
            <Zap size={12} color={Colors.warning} />
            <Text style={cardStyles.supersetText}>Superset</Text>
          </View>
        )}

        {/* Header */}
        <Pressable style={cardStyles.header} onPress={onPress}>
          <View style={[cardStyles.indexBadge, allDone && cardStyles.indexBadgeDone]}>
            {allDone ? (
              <Check size={16} color={Colors.success} />
            ) : (
              <Text style={[cardStyles.indexText, isActive && cardStyles.indexTextActive]}>
                {exerciseIndex + 1}
              </Text>
            )}
          </View>

          <View style={cardStyles.headerInfo}>
            <Text
              style={[cardStyles.exerciseName, allDone && cardStyles.exerciseNameDone]}
              numberOfLines={1}
            >
              {exercise.name}
            </Text>
            <Text style={cardStyles.exerciseMeta}>
              {exercise.targetSets} sets x {exercise.targetReps} reps
              {exercise.muscle_group ? ` | ${exercise.muscle_group}` : ''}
            </Text>
          </View>

          {/* Progress indicator */}
          <View style={cardStyles.progressBadge}>
            <Text style={cardStyles.progressText}>
              {completedSets}/{totalSets}
            </Text>
          </View>
        </Pressable>

        {/* Previous best info */}
        {exercise.previousBest && exercise.previousBest.length > 0 && isActive && (
          <View style={cardStyles.previousBest}>
            <TrendingUp size={12} color={Colors.textTertiary} />
            <Text style={cardStyles.previousBestText}>
              Last: {exercise.previousBest.map((s) => `${s.weight}x${s.reps}`).join(', ')}
            </Text>
          </View>
        )}

        {/* Expanded content */}
        {isActive && (
          <View style={cardStyles.expandedContent}>
            {/* Actions row */}
            <View style={cardStyles.actionsRow}>
              <Pressable
                style={cardStyles.actionChip}
                onPress={() => {
                  hapticLight();
                  onSwap(exerciseIndex);
                }}
              >
                <ArrowRightLeft size={14} color={Colors.primary} />
                <Text style={cardStyles.actionChipText}>Swap</Text>
              </Pressable>

              <Pressable
                style={cardStyles.actionChip}
                onPress={() => {
                  hapticLight();
                  setShowNotes(!showNotes);
                }}
              >
                <StickyNote size={14} color={Colors.primary} />
                <Text style={cardStyles.actionChipText}>Notes</Text>
              </Pressable>

              {exercise.tips && (
                <View style={cardStyles.tipBadge}>
                  <Text style={cardStyles.tipText} numberOfLines={1}>
                    {exercise.tips}
                  </Text>
                </View>
              )}
            </View>

            {/* Notes input */}
            {showNotes && (
              <TextInput
                style={cardStyles.notesInput}
                placeholder="Add form cues or notes..."
                placeholderTextColor={Colors.textTertiary}
                value={exercise.notes}
                onChangeText={(text) => onUpdateNotes(exerciseIndex, text)}
                multiline
                numberOfLines={2}
              />
            )}

            {/* Set Logger */}
            <SetLogger
              controlled
              exercise={exercise}
              sets={exercise.sets}
              previousSets={exercise.previousBest}
              showRPE={true}
              onUpdateSet={(setIdx, field, val) => onUpdateSet(exerciseIndex, setIdx, field, val)}
              onCompleteSet={(setIdx) => {
                onCompleteSet(exerciseIndex, setIdx);
                // Parse rest time
                const restSec = parseInt(String(exercise.rest), 10) || session?.defaultRestSeconds || 90;
                onStartRest(restSec);
              }}
              onAddSet={() => onAddSet(exerciseIndex)}
              onDeleteSet={(setIdx) => onDeleteSet(exerciseIndex, setIdx)}
              onIncrementWeight={(setIdx, step) => onIncrementWeight(exerciseIndex, setIdx, step)}
            />
          </View>
        )}
      </View>
    </Animated.View>
  );
}

const cardStyles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surfaceGlass,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
    ...Shadows.card,
  },
  containerActive: {
    borderColor: Colors.primary + '60',
  },
  containerComplete: {
    borderColor: Colors.success + '40',
    opacity: 0.85,
  },
  containerSuperset: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.warning,
  },
  supersetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.warningSoft,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  supersetText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.warning,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  indexBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  indexBadgeDone: {
    backgroundColor: Colors.successSoft,
  },
  indexText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.textSecondary,
  },
  indexTextActive: {
    color: Colors.primary,
  },
  headerInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  exerciseNameDone: {
    color: Colors.success,
  },
  exerciseMeta: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  progressBadge: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  progressText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  previousBest: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  previousBestText: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    fontStyle: 'italic',
  },
  expandedContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
    alignItems: 'center',
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primarySoft,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  actionChipText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },
  tipBadge: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  tipText: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    fontStyle: 'italic',
  },
  notesInput: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.sm,
    fontSize: FontSize.sm,
    color: Colors.text,
    marginBottom: Spacing.sm,
    minHeight: 60,
    textAlignVertical: 'top',
  },
});

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------
export default function WorkoutSessionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // Parse workout data from route params
  const workoutData = useMemo(() => {
    try {
      if (params.workout) return JSON.parse(params.workout);
      // Construct from individual params
      if (params.title || params.name) {
        const exercises = params.exercises ? JSON.parse(params.exercises) : [];
        return {
          title: params.title || params.name,
          name: params.name || params.title,
          emoji: params.emoji || '',
          type: params.type || 'strength',
          main_set: exercises,
          duration: parseInt(params.duration, 10) || 0,
        };
      }
      return null;
    } catch {
      return null;
    }
  }, [params]);

  // Load workout history for previous session comparison
  const { workouts: history } = useWorkoutHistory();
  const previousHistory = useMemo(() => {
    const map = {};
    if (!history || history.length === 0) return map;
    // Get most recent workout's exercise data
    for (const w of history) {
      const exercises = w.exercises || [];
      for (const ex of exercises) {
        if (ex.name && ex.sets && !map[ex.name]) {
          map[ex.name] = ex.sets.map((s) => ({
            weight: s.weight || 0,
            reps: s.reps || 0,
          }));
        }
      }
    }
    return map;
  }, [history]);

  // Session hook
  const {
    session,
    prs,
    summary,
    totalVolume,
    totalCompletedSets,
    totalCompletedReps,
    exercisesWithCompletedSets,
    estimatedCalories,
    initSession,
    updateSet,
    completeSet,
    addSet,
    removeSet,
    updateExerciseNotes,
    swapExercise,
    setCurrentExercise,
    togglePause,
    startRestTimer,
    skipRestTimer,
    extendRestTimer,
    setDefaultRest,
    incrementWeight,
    completeWorkout,
    discardWorkout,
  } = useWorkoutSession({
    workout: workoutData,
    previousHistory,
  });

  // Local UI state
  const [swapModal, setSwapModal] = useState({ visible: false, index: -1, muscle: '' });
  const [restSettingsVisible, setRestSettingsVisible] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [activePR, setActivePR] = useState(null);
  const scrollRef = useRef(null);

  // Show summary when workout completes
  useEffect(() => {
    if (summary) setShowSummary(true);
  }, [summary]);

  // Show PR notifications
  useEffect(() => {
    if (prs && prs.length > 0) {
      setActivePR(prs[0]);
    }
  }, [prs]);

  // Handlers
  const handleExercisePress = useCallback(
    (index) => {
      hapticLight();
      setCurrentExercise(session?.currentExerciseIndex === index ? -1 : index);
    },
    [session?.currentExerciseIndex, setCurrentExercise]
  );

  const handleSwapOpen = useCallback(
    (exerciseIndex) => {
      const exercise = session?.exercises[exerciseIndex];
      setSwapModal({
        visible: true,
        index: exerciseIndex,
        muscle: exercise?.muscle_group || '',
      });
    },
    [session?.exercises]
  );

  const handleSwapSelect = useCallback(
    (newExercise) => {
      swapExercise(swapModal.index, newExercise);
    },
    [swapModal.index, swapExercise]
  );

  const handleCompleteSet = useCallback(
    (exerciseIdx, setIdx) => {
      hapticSuccess();
      completeSet(exerciseIdx, setIdx);
    },
    [completeSet]
  );

  const handleStartRest = useCallback(
    (seconds) => {
      startRestTimer(seconds);
    },
    [startRestTimer]
  );

  const handleFinishWorkout = useCallback(async () => {
    if (!session) return;

    const hasCompletedSets = session.exercises.some((ex) =>
      ex.sets.some((s) => s.completed)
    );

    if (!hasCompletedSets) {
      Alert.alert('No Sets Completed', 'Complete at least one set before finishing.');
      return;
    }

    Alert.alert(
      'Finish Workout?',
      'This will save your workout and show your summary.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Finish',
          onPress: async () => {
            hapticSuccess();
            await completeWorkout();
          },
        },
      ]
    );
  }, [session, completeWorkout]);

  const handleDiscard = useCallback(() => {
    Alert.alert(
      'Discard Workout?',
      'All progress will be lost. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: async () => {
            await discardWorkout();
            router.back();
          },
        },
      ]
    );
  }, [discardWorkout, router]);

  const handleSummaryDone = useCallback(() => {
    setShowSummary(false);
    router.replace('/');
  }, [router]);

  const handleIncrementWeight = useCallback(
    (exerciseIdx, setIdx, step) => {
      incrementWeight(exerciseIdx, setIdx, step);
    },
    [incrementWeight]
  );

  // No workout data
  if (!workoutData) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safe}>
          <View style={styles.emptyContainer}>
            <Dumbbell size={48} color={Colors.textTertiary} />
            <Text style={styles.emptyTitle}>No Workout Data</Text>
            <Text style={styles.emptySubtitle}>
              Generate a workout or select a template to get started.
            </Text>
            <Pressable style={styles.emptyButton} onPress={() => router.back()}>
              <Text style={styles.emptyButtonText}>Go Back</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (!session) return null;

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
        >
          {/* Top Header Bar */}
          <View style={styles.topBar}>
            <Pressable style={styles.topBarButton} onPress={handleDiscard} hitSlop={12}>
              <X size={22} color={Colors.text} />
            </Pressable>

            <View style={styles.topBarCenter}>
              <Text style={styles.topBarTitle} numberOfLines={1}>
                {session.name}
              </Text>
            </View>

            <Pressable
              style={styles.topBarButton}
              onPress={() => {
                hapticLight();
                setRestSettingsVisible(true);
              }}
              hitSlop={12}
            >
              <Settings size={20} color={Colors.textSecondary} />
            </Pressable>
          </View>

          {/* Timer + Stats Strip */}
          <View style={styles.statsStrip}>
            <WorkoutTimer
              compact
              mode="stopwatch"
              elapsedSeconds={session.elapsedSeconds}
              isPaused={session.isPaused}
              onPause={togglePause}
              onResume={togglePause}
            />

            <View style={styles.statPill}>
              <Dumbbell size={14} color={Colors.secondary} />
              <Text style={styles.statPillText}>
                {totalVolume >= 1000
                  ? `${(totalVolume / 1000).toFixed(1)}k`
                  : totalVolume}{' '}
                lb
              </Text>
            </View>

            <View style={styles.statPill}>
              <Check size={14} color={Colors.success} />
              <Text style={styles.statPillText}>{totalCompletedSets} sets</Text>
            </View>
          </View>

          {/* Exercise List */}
          <ScrollView
            ref={scrollRef}
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {session.exercises.map((exercise, index) => (
              <ExerciseCard
                key={`${exercise.id}-${index}`}
                exercise={exercise}
                exerciseIndex={index}
                isActive={session.currentExerciseIndex === index}
                session={session}
                onPress={() => handleExercisePress(index)}
                onSwap={handleSwapOpen}
                onUpdateSet={updateSet}
                onCompleteSet={handleCompleteSet}
                onAddSet={addSet}
                onDeleteSet={removeSet}
                onIncrementWeight={handleIncrementWeight}
                onUpdateNotes={updateExerciseNotes}
                onStartRest={handleStartRest}
              />
            ))}

            <View style={styles.bottomSpacer} />
          </ScrollView>

          {/* Bottom Action Bar */}
          <View style={styles.bottomBar}>
            <View style={styles.bottomBarStats}>
              <Flame size={14} color={Colors.warning} />
              <Text style={styles.bottomBarStatText}>~{estimatedCalories} cal</Text>
            </View>

            <Pressable style={styles.finishWorkoutButton} onPress={handleFinishWorkout}>
              <LinearGradient
                colors={Gradients.success}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.finishWorkoutGradient}
              >
                <CheckCircle size={20} color="#fff" />
                <Text style={styles.finishWorkoutText}>Finish Workout</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Rest Timer Overlay */}
      <RestTimer
        visible={session.restTimerActive}
        totalSeconds={session.restTimerSeconds}
        remaining={session.restTimerRemaining}
        onComplete={skipRestTimer}
        onSkip={skipRestTimer}
        onExtend={extendRestTimer}
      />

      {/* PR Celebration */}
      <PRCelebration
        visible={!!activePR}
        exerciseName={activePR?.exerciseName}
        prType={activePR?.prType}
        value={activePR?.newValue}
        onDismiss={() => setActivePR(null)}
      />

      {/* Exercise Swap Modal */}
      <ExerciseSwapModal
        visible={swapModal.visible}
        muscleGroup={swapModal.muscle}
        currentName={session.exercises[swapModal.index]?.name}
        onSelect={handleSwapSelect}
        onClose={() => setSwapModal({ visible: false, index: -1, muscle: '' })}
      />

      {/* Rest Settings Modal */}
      <RestSettingsModal
        visible={restSettingsVisible}
        current={session.defaultRestSeconds}
        onSelect={setDefaultRest}
        onClose={() => setRestSettingsVisible(false)}
      />

      {/* Workout Summary */}
      <WorkoutSummaryModal
        visible={showSummary}
        summary={summary}
        prs={prs}
        onDone={handleSummaryDone}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safe: {
    flex: 1,
  },
  // Top Bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  topBarButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBarCenter: {
    flex: 1,
    alignItems: 'center',
  },
  topBarTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  // Stats Strip
  statsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs + 2,
  },
  statPillText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    fontVariant: ['tabular-nums'],
  },
  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
  },
  bottomSpacer: {
    height: 100,
  },
  // Bottom Bar
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
    gap: Spacing.sm,
  },
  bottomBarStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bottomBarStatText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
  },
  finishWorkoutButton: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  finishWorkoutGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  finishWorkoutText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: '#fff',
  },
  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  emptyTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  emptySubtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  emptyButton: {
    backgroundColor: Colors.primarySoft,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.md,
  },
  emptyButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
});

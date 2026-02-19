/**
 * SetLogger - Compact set logging component for workout sessions.
 *
 * Features:
 * - Compact row per set: set number, weight input, reps input, RPE selector (6-10)
 * - Previous set data shown as placeholder
 * - Swipe to delete a set
 * - Add set button
 * - Weight increment +/- buttons (2.5kg / 5lb steps)
 * - Completion checkbox with animation
 *
 * Works in two modes:
 * 1. Standalone (legacy) - manages its own state (used from generate-workout)
 * 2. Controlled - receives sets + callbacks from useWorkoutSession (used from workout-session)
 */
import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Animated,
} from 'react-native';
import {
  Check,
  Plus,
  Minus,
  Dumbbell,
  Trash2,
  ChevronUp,
  ChevronDown,
} from 'lucide-react-native';
import { hapticLight, hapticSuccess } from '../lib/haptics';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius, Shadows } from '../constants/theme';

const DEFAULT_REST_SECONDS = 90;
const RPE_OPTIONS = [6, 7, 8, 9, 10];
const WEIGHT_STEP = 2.5;

// ---------------------------------------------------------------------------
// RPE Selector
// ---------------------------------------------------------------------------
function RPESelector({ value = 7, onChange, disabled }) {
  return (
    <View style={rpeStyles.container}>
      {RPE_OPTIONS.map((rpe) => (
        <Pressable
          key={rpe}
          style={[
            rpeStyles.chip,
            value === rpe && rpeStyles.chipActive,
            disabled && rpeStyles.chipDisabled,
          ]}
          onPress={() => {
            if (!disabled) {
              hapticLight();
              onChange(rpe);
            }
          }}
          hitSlop={4}
        >
          <Text
            style={[
              rpeStyles.chipText,
              value === rpe && rpeStyles.chipTextActive,
            ]}
          >
            {rpe}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const rpeStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 4,
  },
  chip: {
    width: 28,
    height: 24,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipActive: {
    backgroundColor: Colors.primarySoft,
    borderWidth: 1,
    borderColor: Colors.primary + '60',
  },
  chipDisabled: {
    opacity: 0.5,
  },
  chipText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.textTertiary,
  },
  chipTextActive: {
    color: Colors.primary,
  },
});

// ---------------------------------------------------------------------------
// Set Row
// ---------------------------------------------------------------------------
function SetRow({
  index,
  set,
  onUpdate,
  onComplete,
  onDelete,
  onIncrementWeight,
  lastSet,
  showRPE = true,
  canDelete = true,
}) {
  const highlightAnim = useRef(new Animated.Value(0)).current;

  const handleComplete = () => {
    if (!set.weight && !set.reps) return;
    hapticLight();

    Animated.sequence([
      Animated.timing(highlightAnim, { toValue: 1, duration: 200, useNativeDriver: false }),
      Animated.timing(highlightAnim, { toValue: 0, duration: 600, useNativeDriver: false }),
    ]).start();

    onComplete(index);
  };

  const bgColor = highlightAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['transparent', Colors.successSoft],
  });

  const placeholderWeight = lastSet?.weight ? `${lastSet.weight}` : '';
  const placeholderReps = lastSet?.reps ? `${lastSet.reps}` : '';

  return (
    <Animated.View
      style={[styles.setRow, { backgroundColor: bgColor }, set.completed && styles.setRowCompleted]}
    >
      {/* Set number */}
      <View style={[styles.setNumberBadge, set.completed && styles.setNumberBadgeCompleted]}>
        <Text style={[styles.setNumberText, set.completed && styles.setNumberTextCompleted]}>
          {index + 1}
        </Text>
      </View>

      {/* Weight with +/- buttons */}
      <View style={styles.weightGroup}>
        {!set.completed && onIncrementWeight && (
          <Pressable
            style={styles.incrementButton}
            onPress={() => {
              hapticLight();
              onIncrementWeight(index, -WEIGHT_STEP);
            }}
            hitSlop={4}
          >
            <Minus size={12} color={Colors.textTertiary} />
          </Pressable>
        )}
        <TextInput
          style={[styles.input, styles.weightInput, set.completed && styles.inputCompleted]}
          value={set.weight}
          onChangeText={(val) => onUpdate(index, 'weight', val)}
          keyboardType="numeric"
          placeholder={placeholderWeight || 'lb'}
          placeholderTextColor={Colors.textTertiary}
          editable={!set.completed}
          selectTextOnFocus
          maxLength={5}
        />
        {!set.completed && onIncrementWeight && (
          <Pressable
            style={styles.incrementButton}
            onPress={() => {
              hapticLight();
              onIncrementWeight(index, WEIGHT_STEP);
            }}
            hitSlop={4}
          >
            <Plus size={12} color={Colors.textTertiary} />
          </Pressable>
        )}
      </View>

      <Text style={styles.separator}>x</Text>

      {/* Reps */}
      <TextInput
        style={[styles.input, styles.repsInput, set.completed && styles.inputCompleted]}
        value={set.reps}
        onChangeText={(val) => onUpdate(index, 'reps', val)}
        keyboardType="numeric"
        placeholder={placeholderReps || 'reps'}
        placeholderTextColor={Colors.textTertiary}
        editable={!set.completed}
        selectTextOnFocus
        maxLength={4}
      />

      {/* RPE */}
      {showRPE && (
        <RPESelector
          value={set.rpe || 7}
          onChange={(rpe) => onUpdate(index, 'rpe', rpe)}
          disabled={set.completed}
        />
      )}

      {/* Complete / Delete */}
      {!set.completed ? (
        <Pressable
          style={styles.checkButton}
          onPress={handleComplete}
          hitSlop={8}
        >
          <Check size={18} color={Colors.textTertiary} />
        </Pressable>
      ) : (
        <View style={styles.checkButtonDone}>
          <Check size={18} color={Colors.success} />
        </View>
      )}

      {/* Delete button (shown on swipe or always for non-completed) */}
      {canDelete && !set.completed && onDelete && (
        <Pressable
          style={styles.deleteSetButton}
          onPress={() => {
            hapticLight();
            onDelete(index);
          }}
          hitSlop={6}
        >
          <Trash2 size={14} color={Colors.error} />
        </Pressable>
      )}
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function SetLogger({
  // Common props
  exercise,
  previousSets,
  // Legacy standalone props (from generate-workout)
  onComplete,
  onStartRest,
  // Controlled mode props (from workout-session)
  controlled = false,
  sets: controlledSets,
  onUpdateSet,
  onCompleteSet,
  onAddSet,
  onDeleteSet,
  onIncrementWeight,
  showRPE = true,
}) {
  // Standalone state (fallback)
  const [localSets, setLocalSets] = useState([
    { weight: '', reps: '', rpe: 7, completed: false },
    { weight: '', reps: '', rpe: 7, completed: false },
    { weight: '', reps: '', rpe: 7, completed: false },
  ]);

  const sets = controlled ? controlledSets || [] : localSets;

  const updateSet = useCallback(
    (index, field, value) => {
      if (controlled && onUpdateSet) {
        onUpdateSet(index, field, value);
      } else {
        setLocalSets((prev) => {
          const updated = [...prev];
          updated[index] = { ...updated[index], [field]: value };
          return updated;
        });
      }
    },
    [controlled, onUpdateSet]
  );

  const completeSet = useCallback(
    (index) => {
      if (controlled && onCompleteSet) {
        onCompleteSet(index);
      } else {
        setLocalSets((prev) => {
          const updated = [...prev];
          updated[index] = { ...updated[index], completed: true };
          return updated;
        });
        onStartRest?.(DEFAULT_REST_SECONDS);
      }
    },
    [controlled, onCompleteSet, onStartRest]
  );

  const addSet = useCallback(() => {
    hapticLight();
    if (controlled && onAddSet) {
      onAddSet();
    } else {
      setLocalSets((prev) => [...prev, { weight: '', reps: '', rpe: 7, completed: false }]);
    }
  }, [controlled, onAddSet]);

  const deleteSet = useCallback(
    (index) => {
      if (controlled && onDeleteSet) {
        onDeleteSet(index);
      } else {
        setLocalSets((prev) => {
          if (prev.length <= 1) return prev;
          return prev.filter((_, i) => i !== index);
        });
      }
    },
    [controlled, onDeleteSet]
  );

  const handleIncrementWeight = useCallback(
    (index, step) => {
      if (controlled && onIncrementWeight) {
        onIncrementWeight(index, step);
      } else {
        setLocalSets((prev) => {
          const updated = [...prev];
          const current = parseFloat(updated[index].weight) || 0;
          const newVal = Math.max(0, current + step);
          updated[index] = { ...updated[index], weight: String(newVal) };
          return updated;
        });
      }
    },
    [controlled, onIncrementWeight]
  );

  // Legacy finish handler
  const handleFinish = useCallback(() => {
    if (controlled) return; // Not used in controlled mode
    const completedSets = sets
      .filter((s) => s.completed && (s.weight || s.reps))
      .map((s) => ({
        weight: parseFloat(s.weight) || 0,
        reps: parseInt(s.reps, 10) || 0,
        rpe: s.rpe || 7,
      }));

    if (completedSets.length === 0) return;

    const totalVolume = completedSets.reduce(
      (sum, s) => sum + s.weight * s.reps,
      0
    );

    hapticSuccess();
    onComplete?.({
      exerciseName: exercise.name,
      exerciseId: exercise.id,
      sets: completedSets,
      totalVolume,
    });
  }, [sets, exercise, onComplete, controlled]);

  const completedCount = sets.filter((s) => s.completed).length;
  const allDone = completedCount > 0 && completedCount === sets.length;

  return (
    <View style={styles.container}>
      {/* Header - only in standalone mode */}
      {!controlled && (
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Dumbbell size={20} color={Colors.primary} />
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.exerciseName} numberOfLines={1}>
              {exercise?.name}
            </Text>
            {completedCount > 0 && (
              <Text style={styles.progressText}>
                {completedCount}/{sets.length} sets completed
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Column headers */}
      <View style={styles.columnHeaders}>
        <Text style={[styles.columnHeader, { width: 28 }]}>SET</Text>
        <Text style={[styles.columnHeader, { flex: 1, textAlign: 'center' }]}>WEIGHT</Text>
        <Text style={[styles.columnHeader, { width: 14 }]} />
        <Text style={[styles.columnHeader, { width: 52, textAlign: 'center' }]}>REPS</Text>
        {showRPE && <Text style={[styles.columnHeader, { width: 140, textAlign: 'center' }]}>RPE</Text>}
        <Text style={[styles.columnHeader, { width: 36 }]} />
      </View>

      {/* Set rows */}
      <View style={styles.setsContainer} accessibilityLiveRegion="polite">
        {sets.map((set, index) => (
          <SetRow
            key={`set-${index}`}
            index={index}
            set={set}
            onUpdate={updateSet}
            onComplete={completeSet}
            onDelete={deleteSet}
            onIncrementWeight={handleIncrementWeight}
            lastSet={previousSets?.[index] || exercise?.previousBest?.[index]}
            showRPE={showRPE}
            canDelete={sets.length > 1}
          />
        ))}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Pressable style={styles.addSetButton} onPress={addSet}>
          <Plus size={16} color={Colors.primary} />
          <Text style={styles.addSetText}>Add Set</Text>
        </Pressable>

        {!controlled && completedCount > 0 && (
          <Pressable
            style={[styles.finishButton, allDone && styles.finishButtonReady]}
            onPress={handleFinish}
          >
            <Check size={16} color={allDone ? Colors.background : Colors.primary} />
            <Text style={[styles.finishText, allDone && styles.finishTextReady]}>
              Finish Exercise
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surfaceGlass,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    ...Shadows.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  progressText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  columnHeaders: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  columnHeader: {
    fontSize: 9,
    fontWeight: FontWeight.bold,
    color: Colors.textTertiary,
    letterSpacing: 0.5,
  },
  setsContainer: {
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  setRowCompleted: {
    opacity: 0.65,
  },
  setNumberBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  setNumberBadgeCompleted: {
    backgroundColor: Colors.successSoft,
  },
  setNumberText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.textSecondary,
  },
  setNumberTextCompleted: {
    color: Colors.success,
  },
  weightGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  incrementButton: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    height: 36,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.xs,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    textAlign: 'center',
  },
  weightInput: {
    flex: 1,
    minWidth: 44,
  },
  repsInput: {
    width: 52,
  },
  inputCompleted: {
    backgroundColor: Colors.successSoft,
    borderColor: Colors.success + '40',
    color: Colors.success,
  },
  separator: {
    fontSize: FontSize.md,
    color: Colors.textTertiary,
    fontWeight: FontWeight.medium,
  },
  checkButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkButtonDone: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.successSoft,
    borderWidth: 1,
    borderColor: Colors.success + '40',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteSetButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.errorSoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  addSetButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.primary + '40',
    borderStyle: 'dashed',
  },
  addSetText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },
  finishButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primarySoft,
  },
  finishButtonReady: {
    backgroundColor: Colors.primary,
  },
  finishText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  finishTextReady: {
    color: Colors.background,
  },
});

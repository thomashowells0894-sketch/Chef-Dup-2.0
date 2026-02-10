import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Animated,
} from 'react-native';
import { Check, Plus, Dumbbell } from 'lucide-react-native';
import { hapticLight, hapticSuccess } from '../lib/haptics';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius, Shadows } from '../constants/theme';

const DEFAULT_REST_SECONDS = 90;

function SetRow({ index, set, onUpdate, onComplete, lastSet }) {
  const highlightAnim = useRef(new Animated.Value(0)).current;

  const handleComplete = () => {
    if (!set.weight || !set.reps) return;
    hapticLight();

    // Flash green highlight
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
    <Animated.View style={[styles.setRow, { backgroundColor: bgColor }, set.completed && styles.setRowCompleted]}>
      <Text style={[styles.setLabel, set.completed && styles.setLabelCompleted]}>
        Set {index + 1}
      </Text>

      <TextInput
        style={[styles.input, set.completed && styles.inputCompleted]}
        value={set.weight}
        onChangeText={(val) => onUpdate(index, 'weight', val)}
        keyboardType="numeric"
        placeholder={placeholderWeight || 'lbs'}
        placeholderTextColor={Colors.textTertiary}
        editable={!set.completed}
        selectTextOnFocus
        maxLength={5}
      />

      <Text style={styles.separator}>x</Text>

      <TextInput
        style={[styles.input, set.completed && styles.inputCompleted]}
        value={set.reps}
        onChangeText={(val) => onUpdate(index, 'reps', val)}
        keyboardType="numeric"
        placeholder={placeholderReps || 'reps'}
        placeholderTextColor={Colors.textTertiary}
        editable={!set.completed}
        selectTextOnFocus
        maxLength={4}
      />

      <Pressable
        style={[styles.checkButton, set.completed && styles.checkButtonDone]}
        onPress={handleComplete}
        disabled={set.completed}
        hitSlop={8}
      >
        <Check size={18} color={set.completed ? Colors.success : Colors.textTertiary} />
      </Pressable>
    </Animated.View>
  );
}

export default function SetLogger({ exercise, onComplete, onStartRest, previousSets }) {
  const [sets, setSets] = useState([
    { weight: '', reps: '', completed: false },
    { weight: '', reps: '', completed: false },
    { weight: '', reps: '', completed: false },
  ]);

  const updateSet = useCallback((index, field, value) => {
    setSets((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }, []);

  const completeSet = useCallback((index) => {
    setSets((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], completed: true };
      return updated;
    });

    // Start rest timer
    onStartRest?.(DEFAULT_REST_SECONDS);
  }, [onStartRest]);

  const addSet = useCallback(() => {
    hapticLight();
    setSets((prev) => [...prev, { weight: '', reps: '', completed: false }]);
  }, []);

  const handleFinish = useCallback(() => {
    const completedSets = sets
      .filter((s) => s.completed && s.weight && s.reps)
      .map((s) => ({
        weight: parseFloat(s.weight) || 0,
        reps: parseInt(s.reps, 10) || 0,
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
  }, [sets, exercise, onComplete]);

  const completedCount = sets.filter((s) => s.completed).length;
  const allDone = completedCount > 0 && completedCount === sets.length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Dumbbell size={20} color={Colors.primary} />
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.exerciseName} numberOfLines={1}>
            {exercise.name}
          </Text>
          {completedCount > 0 && (
            <Text style={styles.progressText}>
              {completedCount}/{sets.length} sets completed
            </Text>
          )}
        </View>
      </View>

      {/* Set rows */}
      <View style={styles.setsContainer}>
        {sets.map((set, index) => (
          <SetRow
            key={index}
            index={index}
            set={set}
            onUpdate={updateSet}
            onComplete={completeSet}
            lastSet={previousSets?.[index]}
          />
        ))}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Pressable style={styles.addSetButton} onPress={addSet}>
          <Plus size={16} color={Colors.primary} />
          <Text style={styles.addSetText}>Add Set</Text>
        </Pressable>

        {completedCount > 0 && (
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
  setsContainer: {
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  setRowCompleted: {
    opacity: 0.7,
  },
  setLabel: {
    width: 44,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
  },
  setLabelCompleted: {
    color: Colors.success,
  },
  input: {
    flex: 1,
    height: 40,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.sm,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    textAlign: 'center',
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
    backgroundColor: Colors.successSoft,
    borderColor: Colors.success + '40',
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

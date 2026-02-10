import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  Alert,
} from 'react-native';
import { X, Trash2, Flame, Clock, Zap } from 'lucide-react-native';
import { hapticLight, hapticWarning } from '../lib/haptics';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '../constants/theme';
import { useFood } from '../context/FoodContext';

function ExerciseItem({ exercise, onRemove }) {
  const logTime = new Date(exercise.loggedAt).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <View style={styles.exerciseItem}>
      <View style={styles.exerciseIconContainer}>
        <Text style={styles.exerciseEmoji}>{exercise.emoji || '🏃'}</Text>
      </View>
      <View style={styles.exerciseInfo}>
        <Text style={styles.exerciseName}>{exercise.name}</Text>
        <View style={styles.exerciseStats}>
          <View style={styles.exerciseStat}>
            <Clock size={12} color={Colors.textTertiary} />
            <Text style={styles.exerciseStatText}>{exercise.duration} min</Text>
          </View>
          <View style={styles.exerciseStat}>
            <Flame size={12} color={Colors.warning} />
            <Text style={styles.exerciseStatText}>{exercise.caloriesBurned} kcal</Text>
          </View>
        </View>
      </View>
      <View style={styles.exerciseRight}>
        <Text style={styles.exerciseTime}>{logTime}</Text>
        <Pressable
          style={styles.deleteButton}
          onPress={() => onRemove(exercise.id)}
          hitSlop={8}
        >
          <Trash2 size={16} color={Colors.danger} />
        </Pressable>
      </View>
    </View>
  );
}

export default function ExerciseModal({ visible, onClose }) {
  const { exercises, caloriesBurned, exerciseMinutes, removeExercise } = useFood();

  const handleClose = async () => {
    await hapticLight();
    onClose();
  };

  const handleRemove = async (logId) => {
    await hapticWarning();

    Alert.alert(
      'Remove Exercise',
      'Are you sure you want to remove this exercise?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => removeExercise(logId),
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Today's Workouts</Text>
          <Pressable style={styles.closeButton} onPress={handleClose}>
            <X size={24} color={Colors.text} />
          </Pressable>
        </View>

        <View style={styles.summary}>
          <View style={styles.summaryCard}>
            <View style={[styles.summaryIconContainer, { backgroundColor: Colors.primary + '20' }]}>
              <Zap size={24} color={Colors.primary} />
            </View>
            <Text style={styles.summaryValue}>{caloriesBurned}</Text>
            <Text style={styles.summaryLabel}>kcal burned</Text>
          </View>
          <View style={styles.summaryCard}>
            <View style={[styles.summaryIconContainer, { backgroundColor: Colors.accent + '20' }]}>
              <Clock size={24} color={Colors.accent} />
            </View>
            <Text style={styles.summaryValue}>{exerciseMinutes}</Text>
            <Text style={styles.summaryLabel}>minutes</Text>
          </View>
          <View style={styles.summaryCard}>
            <View style={[styles.summaryIconContainer, { backgroundColor: Colors.warning + '20' }]}>
              <Flame size={24} color={Colors.warning} />
            </View>
            <Text style={styles.summaryValue}>{exercises.length}</Text>
            <Text style={styles.summaryLabel}>workouts</Text>
          </View>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {exercises.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>💪</Text>
              <Text style={styles.emptyTitle}>No workouts logged yet</Text>
              <Text style={styles.emptySubtitle}>
                Log your exercises to track calories burned and unlock extra food allowance!
              </Text>
            </View>
          ) : (
            <View style={styles.exerciseList}>
              {exercises.map((exercise) => (
                <ExerciseItem
                  key={exercise.id}
                  exercise={exercise}
                  onRemove={handleRemove}
                />
              ))}
            </View>
          )}

          <View style={styles.tipCard}>
            <Text style={styles.tipTitle}>🔥 Burn Bonus</Text>
            <Text style={styles.tipText}>
              Calories burned from exercise are added to your daily allowance.
              Burned {caloriesBurned} kcal = {caloriesBurned} extra kcal you can eat!
            </Text>
          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summary: {
    flexDirection: 'row',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
  },
  summaryIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  summaryValue: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  summaryLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },
  exerciseList: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  exerciseIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  exerciseEmoji: {
    fontSize: 20,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginBottom: 4,
  },
  exerciseStats: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  exerciseStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  exerciseStatText: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
  },
  exerciseRight: {
    alignItems: 'flex-end',
    gap: Spacing.sm,
  },
  exerciseTime: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.danger + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  emptySubtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
  },
  tipCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: Colors.warning,
  },
  tipTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  tipText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  bottomSpacer: {
    height: 40,
  },
});

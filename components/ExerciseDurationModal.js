import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Modal,
} from 'react-native';
import {
  Dumbbell,
  Clock,
  Flame,
  Check,
} from 'lucide-react-native';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../constants/theme';
import { calculateCaloriesBurned } from '../data/exercises';

function ExerciseDurationModal({ visible, exercise, userWeight, onClose, onConfirm }) {
  const [duration, setDuration] = useState('30');

  if (!exercise) return null;

  const durationNum = parseInt(duration, 10) || 0;
  const caloriesBurned = calculateCaloriesBurned(exercise.met, userWeight || 150, durationNum);

  const handleConfirm = () => {
    if (durationNum > 0) {
      onConfirm(exercise, durationNum, caloriesBurned);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()} accessibilityViewIsModal={true} accessibilityLabel="Exercise duration">
          <View style={styles.modalHeader}>
            <View style={styles.modalExerciseIcon}>
              <Dumbbell size={24} color={Colors.primary} />
            </View>
            <Text style={styles.modalTitle}>{exercise.name}</Text>
            <Text style={styles.modalSubtitle}>{exercise.category} · MET {exercise.met}</Text>
          </View>

          <View style={styles.durationInputContainer}>
            <Clock size={20} color={Colors.textSecondary} />
            <TextInput
              style={styles.durationInput}
              value={duration}
              onChangeText={setDuration}
              keyboardType="number-pad"
              placeholder="30"
              placeholderTextColor={Colors.textTertiary}
              maxLength={3}
              selectTextOnFocus
            />
            <Text style={styles.durationLabel}>minutes</Text>
          </View>

          <View style={styles.caloriesPreview}>
            <Flame size={24} color={Colors.primary} />
            <View style={styles.caloriesPreviewText}>
              <Text style={styles.caloriesPreviewValue}>{caloriesBurned}</Text>
              <Text style={styles.caloriesPreviewLabel}>calories burned</Text>
            </View>
          </View>

          <Text style={styles.formulaText}>
            ({exercise.met} × 3.5 × {((userWeight || 150) * 0.453592).toFixed(1)}kg) / 200 × {durationNum}min
          </Text>

          <View style={styles.modalButtons}>
            <Pressable style={styles.modalCancelButton} onPress={onClose}>
              <Text style={styles.modalCancelButtonText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.modalConfirmButton, durationNum === 0 && styles.modalConfirmButtonDisabled]}
              onPress={handleConfirm}
              disabled={durationNum === 0}
            >
              <Check size={18} color={Colors.background} />
              <Text style={styles.modalConfirmButtonText}>Log Exercise</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.md,
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    width: '100%',
    maxWidth: 360,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  modalExerciseIcon: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  modalTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  durationInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  durationInput: {
    flex: 1,
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    textAlign: 'center',
    marginHorizontal: Spacing.sm,
  },
  durationLabel: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  caloriesPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary + '15',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  caloriesPreviewText: {
    alignItems: 'center',
  },
  caloriesPreviewValue: {
    fontSize: FontSize.xxxl,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  caloriesPreviewLabel: {
    fontSize: FontSize.sm,
    color: Colors.primary,
  },
  formulaText: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
  },
  modalConfirmButton: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  modalConfirmButtonDisabled: {
    opacity: 0.5,
  },
  modalConfirmButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.background,
  },
});

export default ExerciseDurationModal;

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { X, Check, Zap, Brain, Heart, FileText } from 'lucide-react-native';
import { hapticLight } from '../lib/haptics';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../constants/theme';
import { useMood, DIGESTION_STATUS } from '../context/MoodContext';

function SliderInput({ icon: Icon, iconColor, label, value, onChange, min = 1, max = 10 }) {
  const getEmoji = (val) => {
    if (val <= 3) return '😔';
    if (val <= 5) return '😐';
    if (val <= 7) return '🙂';
    return '😄';
  };

  const handleValueChange = async (val) => {
    const rounded = Math.round(val);
    if (rounded !== value) {
      await hapticLight();
      onChange(rounded);
    }
  };

  return (
    <View style={styles.sliderContainer}>
      <View style={styles.sliderHeader}>
        <View style={[styles.sliderIcon, { backgroundColor: iconColor + '20' }]}>
          <Icon size={18} color={iconColor} />
        </View>
        <Text style={styles.sliderLabel}>{label}</Text>
        <View style={styles.sliderValueContainer}>
          <Text style={styles.sliderEmoji}>{getEmoji(value)}</Text>
          <Text style={[styles.sliderValue, { color: iconColor }]}>{value}</Text>
        </View>
      </View>
      <View style={styles.sliderTrackContainer}>
        <Slider
          style={styles.slider}
          value={value}
          onValueChange={handleValueChange}
          minimumValue={min}
          maximumValue={max}
          step={1}
          minimumTrackTintColor={iconColor}
          maximumTrackTintColor={Colors.surfaceElevated}
          thumbTintColor={iconColor}
        />
        <View style={styles.sliderLabels}>
          <Text style={styles.sliderMinMax}>Low</Text>
          <Text style={styles.sliderMinMax}>High</Text>
        </View>
      </View>
    </View>
  );
}

function DigestionSelector({ value, onChange }) {
  const options = Object.entries(DIGESTION_STATUS);

  const handleSelect = async (key) => {
    await hapticLight();
    onChange(key);
  };

  return (
    <View style={styles.digestionContainer}>
      <View style={styles.digestionHeader}>
        <View style={[styles.sliderIcon, { backgroundColor: Colors.success + '20' }]}>
          <Heart size={18} color={Colors.success} />
        </View>
        <Text style={styles.sliderLabel}>Digestion</Text>
      </View>
      <View style={styles.digestionOptions}>
        {options.map(([key, option]) => {
          const isSelected = value === key;
          return (
            <Pressable
              key={key}
              style={[
                styles.digestionOption,
                isSelected && { backgroundColor: option.color + '20', borderColor: option.color },
              ]}
              onPress={() => handleSelect(key)}
            >
              <Text style={styles.digestionEmoji}>{option.emoji}</Text>
              <Text
                style={[
                  styles.digestionLabel,
                  isSelected && { color: option.color, fontWeight: FontWeight.semibold },
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function MoodCheckInModal({
  visible,
  onClose,
  initialEnergy = 5,
  initialFocus = 5,
}) {
  const { addLog } = useMood();

  const [energyLevel, setEnergyLevel] = useState(initialEnergy);
  const [focusLevel, setFocusLevel] = useState(initialFocus);
  const [digestionStatus, setDigestionStatus] = useState('good');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Reset when modal opens
  useEffect(() => {
    if (visible) {
      setEnergyLevel(initialEnergy);
      setFocusLevel(initialFocus);
      setDigestionStatus('good');
      setNotes('');
    }
  }, [visible, initialEnergy, initialFocus]);

  const handleSave = async () => {
    setIsSaving(true);
    await addLog({
      energyLevel,
      focusLevel,
      digestionStatus,
      notes,
    });
    setIsSaving(false);
    onClose();
  };

  const handleClose = async () => {
    await hapticLight();
    onClose();
  };

  // Calculate overall mood score
  const overallScore = Math.round((energyLevel + focusLevel) / 2);
  const getOverallEmoji = () => {
    if (overallScore <= 3) return '😔';
    if (overallScore <= 5) return '😐';
    if (overallScore <= 7) return '🙂';
    return '😄';
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable style={styles.closeButton} onPress={handleClose}>
            <X size={24} color={Colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>How are you feeling?</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Overall Score Preview */}
          <View style={styles.overallCard}>
            <Text style={styles.overallEmoji}>{getOverallEmoji()}</Text>
            <View style={styles.overallInfo}>
              <Text style={styles.overallLabel}>Overall Mood</Text>
              <Text style={styles.overallScore}>{overallScore}/10</Text>
            </View>
          </View>

          {/* Energy Slider */}
          <View style={styles.card}>
            <SliderInput
              icon={Zap}
              iconColor={Colors.warning}
              label="Energy Level"
              value={energyLevel}
              onChange={setEnergyLevel}
            />
          </View>

          {/* Focus Slider */}
          <View style={styles.card}>
            <SliderInput
              icon={Brain}
              iconColor={Colors.accent}
              label="Focus Level"
              value={focusLevel}
              onChange={setFocusLevel}
            />
          </View>

          {/* Digestion Selector */}
          <View style={styles.card}>
            <DigestionSelector
              value={digestionStatus}
              onChange={setDigestionStatus}
            />
          </View>

          {/* Notes Input */}
          <View style={styles.card}>
            <View style={styles.notesHeader}>
              <View style={[styles.sliderIcon, { backgroundColor: Colors.textSecondary + '20' }]}>
                <FileText size={18} color={Colors.textSecondary} />
              </View>
              <Text style={styles.sliderLabel}>Notes (optional)</Text>
            </View>
            <TextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={setNotes}
              placeholder="Any thoughts about how you're feeling..."
              placeholderTextColor={Colors.textTertiary}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        </ScrollView>

        {/* Bottom Action */}
        <View style={styles.bottomAction}>
          <Pressable
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={isSaving}
          >
            <Check size={22} color={Colors.background} />
            <Text style={styles.saveButtonText}>Log Check-in</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  overallCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '15',
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  overallEmoji: {
    fontSize: 48,
    marginRight: Spacing.md,
  },
  overallInfo: {
    flex: 1,
  },
  overallLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  overallScore: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sliderContainer: {},
  sliderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sliderIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  sliderLabel: {
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  sliderValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  sliderEmoji: {
    fontSize: 20,
  },
  sliderValue: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
  },
  sliderTrackContainer: {
    marginHorizontal: -Spacing.xs,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xs,
    marginTop: -Spacing.xs,
  },
  sliderMinMax: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },
  digestionContainer: {},
  digestionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  digestionOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  digestionOption: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  digestionEmoji: {
    fontSize: 18,
  },
  digestionLabel: {
    fontSize: FontSize.sm,
    color: Colors.text,
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  notesInput: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
    minHeight: 80,
  },
  bottomAction: {
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  saveButtonDisabled: {
    backgroundColor: Colors.surfaceElevated,
    shadowOpacity: 0,
  },
  saveButtonText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.background,
  },
});

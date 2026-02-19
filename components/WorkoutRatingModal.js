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
  ActivityIndicator,
} from 'react-native';
import ReAnimated, {
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import {
  X,
  Dumbbell,
  Sparkles,
  MessageCircle,
  ChevronRight,
  Check,
} from 'lucide-react-native';
import { hapticLight, hapticSuccess } from '../lib/haptics';
import {
  Colors,
  Spacing,
  FontSize,
  FontWeight,
  BorderRadius,
  Gradients,
  Shadows,
} from '../constants/theme';

// Rating emojis and labels
const RATING_OPTIONS = [
  { emoji: '\uD83D\uDE2B', label: 'Too Easy', value: 1 },
  { emoji: '\uD83D\uDE10', label: 'Just Right', value: 2 },
  { emoji: '\uD83D\uDCAA', label: 'Challenging', value: 3 },
  { emoji: '\uD83D\uDD25', label: 'Intense', value: 4 },
  { emoji: '\uD83C\uDFC6', label: 'Beast Mode', value: 5 },
];

// Difficulty options
const DIFFICULTY_OPTIONS = [
  { id: 'easier', label: 'Easier than expected' },
  { id: 'expected', label: 'As expected' },
  { id: 'harder', label: 'Harder than expected' },
];

/**
 * Generate AI tips locally based on rating, difficulty, and workout data.
 */
function generateAITips(rating, difficulty, workout) {
  const tips = [];
  const type = (workout?.type || '').toLowerCase();

  // Rating-based tips
  if (rating <= 2) {
    tips.push(
      'Great foundation! Try increasing weight by 5-10% next session to keep progressing.'
    );
    if (type === 'strength' || type === 'hypertrophy') {
      tips.push(
        'Consider adding an extra set or reducing rest periods between sets to up the intensity.'
      );
    } else {
      tips.push(
        'Try shortening rest intervals or adding supersets to increase the challenge.'
      );
    }
  } else if (rating === 3) {
    tips.push(
      'You hit the sweet spot! Keep this intensity and focus on progressive overload each week.'
    );
    tips.push(
      'Consider adding a 5-minute stretching cooldown to aid recovery and flexibility.'
    );
  } else if (rating >= 4) {
    tips.push(
      'Incredible effort! Prioritize hydration and aim for 7-9 hours of sleep tonight for optimal recovery.'
    );
    tips.push(
      'Consider a lighter recovery session or active rest day tomorrow to prevent overtraining.'
    );
  }

  // Type-specific tips
  if (type === 'strength' || type === 'hypertrophy') {
    if (rating <= 2) {
      tips.push(
        'For progressive overload, increase weight by 2.5-5 lbs when you can complete all sets with good form.'
      );
    } else if (rating >= 4) {
      tips.push(
        'Foam rolling and protein intake within 30 minutes post-workout can accelerate strength recovery.'
      );
    }
  } else if (type === 'hiit') {
    tips.push(
      'Track your heart rate during HIIT sessions - aim for 80-90% max HR during work intervals.'
    );
    if (rating >= 4) {
      tips.push(
        'Limit HIIT sessions to 2-3 per week to allow adequate CNS recovery.'
      );
    }
  } else if (type === 'yoga' || type === 'flexibility') {
    tips.push(
      'Complement your flexibility work with 1-2 strength sessions per week for balanced fitness.'
    );
    if (rating <= 2) {
      tips.push(
        'Try holding poses for 5-10 seconds longer or exploring more advanced variations.'
      );
    }
  } else if (type === 'endurance' || type === 'cardio') {
    tips.push(
      'Ensure adequate carb intake before endurance workouts for sustained energy.'
    );
    if (rating >= 4) {
      tips.push(
        'Great cardio session! Electrolyte replenishment is key after intense endurance work.'
      );
    }
  }

  // Difficulty-based tips
  if (difficulty === 'harder') {
    tips.push(
      'If workouts consistently feel harder than expected, consider a deload week or extra rest day.'
    );
  } else if (difficulty === 'easier') {
    tips.push(
      'Time to level up! Increase difficulty by adding weight, reps, or reducing rest periods.'
    );
  }

  // Deduplicate and limit to 3 tips
  const unique = [...new Set(tips)];
  return unique.slice(0, 3);
}

// Animated emoji button
function EmojiButton({ option, isSelected, onPress }) {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withSpring(isSelected ? 1.3 : 1, {
      damping: 10,
      stiffness: 150,
    });
  }, [isSelected, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPress={onPress}
      style={[
        modalStyles.emojiButton,
        isSelected && modalStyles.emojiButtonSelected,
      ]}
    >
      <ReAnimated.Text style={[modalStyles.emojiText, animatedStyle]}>
        {option.emoji}
      </ReAnimated.Text>
      {isSelected && (
        <Text style={modalStyles.emojiLabel}>{option.label}</Text>
      )}
    </Pressable>
  );
}

export default function WorkoutRatingModal({ visible, onClose, workout, onSaveRating }) {
  const [rating, setRating] = useState(3);
  const [difficulty, setDifficulty] = useState('expected');
  const [notes, setNotes] = useState('');
  const [tips, setTips] = useState([]);
  const [showTips, setShowTips] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setRating(3);
      setDifficulty('expected');
      setNotes('');
      setTips([]);
      setShowTips(false);
      setIsGenerating(false);
      setIsSaving(false);
    }
  }, [visible]);

  const handleSelectRating = async (value) => {
    await hapticLight();
    setRating(value);
    // Reset tips when rating changes
    if (showTips) {
      setShowTips(false);
      setTips([]);
    }
  };

  const handleSelectDifficulty = async (id) => {
    await hapticLight();
    setDifficulty(id);
    if (showTips) {
      setShowTips(false);
      setTips([]);
    }
  };

  const handleGenerateTips = async () => {
    await hapticLight();
    setIsGenerating(true);

    // Simulate a brief delay for a more natural feel
    await new Promise((resolve) => setTimeout(resolve, 800));

    const generatedTips = generateAITips(rating, difficulty, workout);
    setTips(generatedTips);
    setShowTips(true);
    setIsGenerating(false);
    await hapticSuccess();
  };

  const handleSaveAndClose = async () => {
    setIsSaving(true);
    await hapticSuccess();

    if (onSaveRating) {
      await onSaveRating({
        workoutId: workout?.id || '',
        workoutName: workout?.title || workout?.name || 'Workout',
        workoutType: workout?.type || 'strength',
        rating,
        difficulty,
        notes: notes.trim(),
        tips,
      });
    }

    setIsSaving(false);
    onClose();
  };

  const handleClose = async () => {
    await hapticLight();
    onClose();
  };

  const selectedOption = RATING_OPTIONS.find((o) => o.value === rating);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={modalStyles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        accessibilityViewIsModal={true}
        accessibilityLabel="Rate your workout"
      >
        {/* Header */}
        <View style={modalStyles.header}>
          <Pressable style={modalStyles.closeButton} onPress={handleClose}>
            <X size={24} color={Colors.text} />
          </Pressable>
          <View style={modalStyles.headerTitleRow}>
            <Dumbbell size={20} color={Colors.primary} />
            <Text style={modalStyles.headerTitle}>Rate Your Workout</Text>
          </View>
          <View style={modalStyles.headerSpacer} />
        </View>

        <ScrollView
          style={modalStyles.content}
          contentContainerStyle={modalStyles.contentContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Question */}
          <ReAnimated.View entering={FadeInDown.delay(100).springify().mass(0.5).damping(10)}>
            <Text style={modalStyles.questionText}>How was your workout?</Text>
            {workout?.title && (
              <Text style={modalStyles.workoutName}>{workout.title}</Text>
            )}
          </ReAnimated.View>

          {/* Emoji Rating Row */}
          <ReAnimated.View
            entering={FadeInDown.delay(200).springify().mass(0.5).damping(10)}
            style={modalStyles.emojiRow}
          >
            {RATING_OPTIONS.map((option) => (
              <EmojiButton
                key={option.value}
                option={option}
                isSelected={rating === option.value}
                onPress={() => handleSelectRating(option.value)}
              />
            ))}
          </ReAnimated.View>

          {/* Selected Rating Label */}
          <ReAnimated.View entering={FadeInDown.delay(250).springify().mass(0.5).damping(10)}>
            <View style={modalStyles.ratingLabelContainer}>
              <Text style={modalStyles.ratingLabel}>
                {selectedOption?.label || 'Challenging'}
              </Text>
              <Text style={modalStyles.ratingValue}>{rating}/5</Text>
            </View>
          </ReAnimated.View>

          {/* Difficulty Section */}
          <ReAnimated.View entering={FadeInDown.delay(300).springify().mass(0.5).damping(10)}>
            <View style={modalStyles.card}>
              <Text style={modalStyles.cardTitle}>How did the difficulty feel?</Text>
              <View style={modalStyles.difficultyRow}>
                {DIFFICULTY_OPTIONS.map((option) => {
                  const isSelected = difficulty === option.id;
                  return (
                    <Pressable
                      key={option.id}
                      style={[
                        modalStyles.difficultyButton,
                        isSelected && modalStyles.difficultyButtonSelected,
                      ]}
                      onPress={() => handleSelectDifficulty(option.id)}
                    >
                      {isSelected && (
                        <LinearGradient
                          colors={Gradients.primary}
                          style={StyleSheet.absoluteFill}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                        />
                      )}
                      <Text
                        style={[
                          modalStyles.difficultyText,
                          isSelected && modalStyles.difficultyTextSelected,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </ReAnimated.View>

          {/* Notes Section */}
          <ReAnimated.View entering={FadeInDown.delay(400).springify().mass(0.5).damping(10)}>
            <View style={modalStyles.card}>
              <View style={modalStyles.cardTitleRow}>
                <MessageCircle size={16} color={Colors.textSecondary} />
                <Text style={modalStyles.cardTitle}>Notes (optional)</Text>
              </View>
              <TextInput
                style={modalStyles.notesInput}
                value={notes}
                onChangeText={setNotes}
                placeholder="How did you feel? Anything notable?"
                placeholderTextColor={Colors.textTertiary}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                maxLength={300}
              />
            </View>
          </ReAnimated.View>

          {/* Get AI Tips Button */}
          {!showTips && (
            <ReAnimated.View entering={FadeInDown.delay(500).springify().mass(0.5).damping(10)}>
              <Pressable
                style={modalStyles.aiTipsButton}
                onPress={handleGenerateTips}
                disabled={isGenerating}
              >
                <LinearGradient
                  colors={Gradients.electric}
                  style={modalStyles.aiTipsGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {isGenerating ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Sparkles size={20} color="#fff" />
                  )}
                  <Text style={modalStyles.aiTipsButtonText}>
                    {isGenerating ? 'Generating Tips...' : 'Get AI Tips'}
                  </Text>
                  {!isGenerating && <ChevronRight size={18} color="#fff" />}
                </LinearGradient>
              </Pressable>
            </ReAnimated.View>
          )}

          {/* AI Tips Section */}
          {showTips && tips.length > 0 && (
            <ReAnimated.View entering={FadeInUp.delay(100).springify().mass(0.5).damping(10)}>
              <View style={modalStyles.tipsCard}>
                <View style={modalStyles.tipsHeader}>
                  <Sparkles size={18} color={Colors.primary} />
                  <Text style={modalStyles.tipsTitle}>AI Coach Tips</Text>
                </View>
                {tips.map((tip, index) => (
                  <ReAnimated.View
                    key={index}
                    entering={FadeInDown.delay(index * 100 + 100).springify().mass(0.5).damping(10)}
                    style={modalStyles.tipRow}
                  >
                    <View style={modalStyles.tipBullet} />
                    <Text style={modalStyles.tipText}>{tip}</Text>
                  </ReAnimated.View>
                ))}
              </View>
            </ReAnimated.View>
          )}

          <View style={modalStyles.bottomSpacer} />
        </ScrollView>

        {/* Bottom Action */}
        <View style={modalStyles.bottomAction}>
          <Pressable
            style={[
              modalStyles.saveButton,
              isSaving && modalStyles.saveButtonDisabled,
            ]}
            onPress={handleSaveAndClose}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={Colors.background} />
            ) : (
              <>
                <Check size={22} color={Colors.background} />
                <Text style={modalStyles.saveButtonText}>Save & Close</Text>
              </>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
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
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
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
  questionText: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
  workoutName: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  // Emoji Row
  emojiRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: Spacing.xs,
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.xs,
  },
  emojiButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 2,
    borderColor: 'transparent',
    minHeight: 72,
  },
  emojiButtonSelected: {
    backgroundColor: Colors.primarySoft,
    borderColor: Colors.primary,
    minHeight: 88,
  },
  emojiText: {
    fontSize: 32,
  },
  emojiLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  // Rating Label
  ratingLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  ratingLabel: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  ratingValue: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
    backgroundColor: Colors.primarySoft,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
  },
  // Card
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  cardTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  // Difficulty
  difficultyRow: {
    gap: Spacing.sm,
  },
  difficultyButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    overflow: 'hidden',
  },
  difficultyButtonSelected: {
    borderColor: Colors.primary,
  },
  difficultyText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
  },
  difficultyTextSelected: {
    color: '#fff',
    fontWeight: FontWeight.semibold,
  },
  // Notes
  notesInput: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
    minHeight: 80,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  // AI Tips Button
  aiTipsButton: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.md,
    ...Shadows.button,
  },
  aiTipsGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md + 2,
    gap: Spacing.sm,
  },
  aiTipsButtonText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: '#fff',
  },
  // Tips Card
  tipsCard: {
    backgroundColor: 'rgba(0, 212, 255, 0.06)',
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.15)',
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  tipsTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  tipBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    marginTop: 7,
  },
  tipText: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  // Bottom
  bottomSpacer: {
    height: 40,
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
    ...Shadows.glowPrimary,
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

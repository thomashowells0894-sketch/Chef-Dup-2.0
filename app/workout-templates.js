import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  FlatList,
  Modal,
  TextInput,
  Alert,
  Dimensions,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import ReAnimated, { FadeInDown } from 'react-native-reanimated';
import {
  ArrowLeft,
  Plus,
  Heart,
  Play,
  Clock,
  Dumbbell,
  Star,
  Trash2,
  Edit3,
  Bookmark,
  X,
  Check,
  ChevronDown,
  Minus,
  Flame,
  Zap,
} from 'lucide-react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import OptimizedFlatList from '../components/OptimizedFlatList';
import GlassCard from '../components/ui/GlassCard';
import {
  Colors,
  Spacing,
  FontSize,
  FontWeight,
  BorderRadius,
  Shadows,
  Gradients,
} from '../constants/theme';
import { hapticLight, hapticSuccess, hapticWarning } from '../lib/haptics';
import useWorkoutTemplates from '../hooks/useWorkoutTemplates';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const FILTER_TABS = [
  { id: 'all', label: 'All' },
  { id: 'favorites', label: 'Favorites' },
  { id: 'strength', label: 'Strength' },
  { id: 'hiit', label: 'HIIT' },
  { id: 'yoga', label: 'Yoga' },
  { id: 'cardio', label: 'Cardio' },
  { id: 'custom', label: 'Custom' },
];

const WORKOUT_TYPES = [
  { id: 'strength', label: 'Strength', color: '#4ECDC4' },
  { id: 'hiit', label: 'HIIT', color: '#F59E0B' },
  { id: 'yoga', label: 'Yoga', color: '#A78BFA' },
  { id: 'cardio', label: 'Cardio', color: '#06B6D4' },
  { id: 'custom', label: 'Custom', color: Colors.secondary },
];

const FITNESS_EMOJIS = [
  '💪', '🏋️', '🏃', '🧘', '🔥', '⚡', '🎯', '🦾',
  '🏆', '💥', '🥊', '🚴', '🤸', '🏊', '⭐', '🎪',
  '🧗', '🤾', '🏂', '🎾', '🏸', '⚽', '🏈', '🥇',
];

// Get type badge color
function getTypeColor(type) {
  const colors = {
    strength: '#4ECDC4',
    hiit: '#F59E0B',
    yoga: '#A78BFA',
    cardio: '#06B6D4',
    custom: Colors.secondary,
  };
  return colors[type?.toLowerCase()] || Colors.primary;
}

function getTypeLabel(type) {
  if (!type) return 'Custom';
  const labels = {
    strength: 'Strength',
    hiit: 'HIIT',
    yoga: 'Yoga',
    cardio: 'Cardio',
    custom: 'Custom',
  };
  return labels[type.toLowerCase()] || type.charAt(0).toUpperCase() + type.slice(1);
}

// Difficulty stars renderer
function DifficultyStars({ difficulty, size = 12, color = Colors.warning }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          color={i <= difficulty ? color : Colors.textTertiary}
          fill={i <= difficulty ? color : 'transparent'}
        />
      ))}
    </View>
  );
}

// Filter Tabs
function FilterTabs({ activeFilter, onFilterChange }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={filterStyles.container}
      style={filterStyles.scroll}
    >
      {FILTER_TABS.map((tab) => {
        const isActive = activeFilter === tab.id;
        return (
          <Pressable
            key={tab.id}
            style={[filterStyles.pill, isActive && filterStyles.pillActive]}
            onPress={() => {
              hapticLight();
              onFilterChange(tab.id);
            }}
          >
            {isActive && (
              <LinearGradient
                colors={Gradients.primary}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
            )}
            <Text style={[filterStyles.pillText, isActive && filterStyles.pillTextActive]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const filterStyles = StyleSheet.create({
  scroll: {
    marginBottom: Spacing.md,
  },
  container: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  pill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  pillActive: {
    borderColor: Colors.primary,
  },
  pillText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
  },
  pillTextActive: {
    color: '#fff',
    fontWeight: FontWeight.semibold,
  },
});

// Template Card
function TemplateCard({ template, onStart, onToggleFavorite, onEdit, onDelete }) {
  const typeColor = getTypeColor(template.type);

  const handleLongPress = () => {
    hapticWarning();
    Alert.alert(
      template.name,
      'What would you like to do?',
      [
        {
          text: 'Edit',
          onPress: () => onEdit(template),
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Delete Template',
              `Remove "${template.name}" template?`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: () => onDelete(template.id),
                },
              ]
            );
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  return (
    <GlassCard
      style={cardStyles.card}
      onPress={() => handleLongPress()}
      onLongPress={handleLongPress}
    >
      {/* Top row: Emoji + Name + Favorite */}
      <View style={cardStyles.topRow}>
        <Text style={cardStyles.emoji}>{template.emoji || '💪'}</Text>
        <View style={cardStyles.nameContainer}>
          <Text style={cardStyles.name} numberOfLines={1}>{template.name}</Text>
          <View style={cardStyles.metaRow}>
            <View style={[cardStyles.typeBadge, { backgroundColor: typeColor + '20' }]}>
              <Text style={[cardStyles.typeText, { color: typeColor }]}>
                {getTypeLabel(template.type)}
              </Text>
            </View>
            {template.useCount > 0 && (
              <View style={cardStyles.useCountBadge}>
                <Flame size={10} color={Colors.secondary} />
                <Text style={cardStyles.useCountText}>{template.useCount}x</Text>
              </View>
            )}
          </View>
        </View>
        <Pressable
          style={cardStyles.favoriteButton}
          onPress={() => {
            hapticLight();
            onToggleFavorite(template.id);
          }}
        >
          <Heart
            size={20}
            color={template.isFavorite ? '#FF6B6B' : Colors.textTertiary}
            fill={template.isFavorite ? '#FF6B6B' : 'transparent'}
          />
        </Pressable>
      </View>

      {/* Stats row */}
      <View style={cardStyles.statsRow}>
        <View style={cardStyles.stat}>
          <Dumbbell size={14} color={Colors.textSecondary} />
          <Text style={cardStyles.statText}>
            {template.exercises?.length || 0} exercises
          </Text>
        </View>
        <View style={cardStyles.stat}>
          <Clock size={14} color={Colors.primary} />
          <Text style={cardStyles.statText}>{template.duration || 0}m</Text>
        </View>
        <DifficultyStars difficulty={template.difficulty || 3} />
      </View>

      {/* Exercise preview */}
      {template.exercises?.length > 0 && (
        <View style={cardStyles.exercisePreview}>
          {template.exercises.slice(0, 3).map((ex, i) => (
            <Text key={i} style={cardStyles.exercisePreviewText} numberOfLines={1}>
              {ex.name} - {ex.sets}x{ex.reps}
            </Text>
          ))}
          {template.exercises.length > 3 && (
            <Text style={cardStyles.moreText}>
              +{template.exercises.length - 3} more
            </Text>
          )}
        </View>
      )}

      {/* Start button */}
      <Pressable
        style={cardStyles.startButton}
        onPress={() => {
          hapticSuccess();
          onStart(template);
        }}
      >
        <LinearGradient
          colors={Gradients.primary}
          style={cardStyles.startButtonGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Play size={16} color="#fff" />
          <Text style={cardStyles.startButtonText}>Start Workout</Text>
        </LinearGradient>
      </Pressable>
    </GlassCard>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  emoji: {
    fontSize: 36,
    marginRight: Spacing.sm,
  },
  nameContainer: {
    flex: 1,
  },
  name: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: 4,
  },
  typeBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  typeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  useCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: Colors.secondarySoft,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  useCountText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.secondary,
  },
  favoriteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  exercisePreview: {
    marginBottom: Spacing.sm,
    gap: 2,
  },
  exercisePreviewText: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
  },
  moreText: {
    fontSize: FontSize.xs,
    color: Colors.primary,
    marginTop: 2,
  },
  startButton: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  startButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm + 2,
    gap: Spacing.xs,
  },
  startButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: '#fff',
  },
});

// Empty State
function EmptyState({ onCreateNew }) {
  return (
    <View style={emptyStyles.container}>
      <View style={emptyStyles.iconCircle}>
        <Bookmark size={48} color={Colors.textTertiary} />
      </View>
      <Text style={emptyStyles.title}>No templates yet</Text>
      <Text style={emptyStyles.subtitle}>
        Save your favorite workouts as templates for quick access, or create custom ones from scratch
      </Text>
      <Pressable style={emptyStyles.button} onPress={onCreateNew}>
        <LinearGradient
          colors={Gradients.primary}
          style={emptyStyles.buttonGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Plus size={20} color="#fff" />
          <Text style={emptyStyles.buttonText}>Create Your First Template</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const emptyStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
    paddingHorizontal: Spacing.xl,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  button: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    width: '100%',
  },
  buttonGradient: {
    flexDirection: 'row',
    paddingVertical: Spacing.md + 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  buttonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: '#fff',
  },
});

// Exercise Row in Create/Edit Modal
function ExerciseFormRow({ exercise, index, onUpdate, onRemove }) {
  return (
    <View style={exerciseFormStyles.row}>
      <View style={exerciseFormStyles.header}>
        <View style={exerciseFormStyles.indexBadge}>
          <Text style={exerciseFormStyles.indexText}>{index + 1}</Text>
        </View>
        <TextInput
          style={exerciseFormStyles.nameInput}
          value={exercise.name}
          onChangeText={(text) => onUpdate(index, { ...exercise, name: text })}
          placeholder="Exercise name"
          placeholderTextColor={Colors.textTertiary}
        />
        <Pressable style={exerciseFormStyles.removeButton} onPress={() => onRemove(index)}>
          <Minus size={16} color={Colors.error} />
        </Pressable>
      </View>
      <View style={exerciseFormStyles.inputs}>
        <View style={exerciseFormStyles.inputGroup}>
          <Text style={exerciseFormStyles.inputLabel}>Sets</Text>
          <TextInput
            style={exerciseFormStyles.smallInput}
            value={String(exercise.sets || '')}
            onChangeText={(text) => onUpdate(index, { ...exercise, sets: parseInt(text, 10) || 0 })}
            keyboardType="numeric"
            placeholder="3"
            placeholderTextColor={Colors.textTertiary}
          />
        </View>
        <View style={exerciseFormStyles.inputGroup}>
          <Text style={exerciseFormStyles.inputLabel}>Reps</Text>
          <TextInput
            style={exerciseFormStyles.smallInput}
            value={String(exercise.reps || '')}
            onChangeText={(text) => onUpdate(index, { ...exercise, reps: parseInt(text, 10) || 0 })}
            keyboardType="numeric"
            placeholder="10"
            placeholderTextColor={Colors.textTertiary}
          />
        </View>
        <View style={exerciseFormStyles.inputGroup}>
          <Text style={exerciseFormStyles.inputLabel}>Rest(s)</Text>
          <TextInput
            style={exerciseFormStyles.smallInput}
            value={String(exercise.restSeconds || '')}
            onChangeText={(text) => onUpdate(index, { ...exercise, restSeconds: parseInt(text, 10) || 0 })}
            keyboardType="numeric"
            placeholder="60"
            placeholderTextColor={Colors.textTertiary}
          />
        </View>
      </View>
      <TextInput
        style={exerciseFormStyles.notesInput}
        value={exercise.notes || ''}
        onChangeText={(text) => onUpdate(index, { ...exercise, notes: text })}
        placeholder="Notes (optional)"
        placeholderTextColor={Colors.textTertiary}
      />
    </View>
  );
}

const exerciseFormStyles = StyleSheet.create({
  row: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  indexBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  indexText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  nameInput: {
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.text,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: Spacing.xs,
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.errorSoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputs: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginBottom: 4,
  },
  smallInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.text,
    textAlign: 'center',
  },
  notesInput: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    paddingVertical: Spacing.xs,
  },
});

// Create/Edit Template Modal
function TemplateModal({ visible, onClose, onSave, initialData }) {
  const isEdit = !!initialData?.id;
  const [name, setName] = useState(initialData?.name || '');
  const [emoji, setEmoji] = useState(initialData?.emoji || '💪');
  const [type, setType] = useState(initialData?.type || 'custom');
  const [duration, setDuration] = useState(String(initialData?.duration || '30'));
  const [difficulty, setDifficulty] = useState(initialData?.difficulty || 3);
  const [exercises, setExercises] = useState(
    initialData?.exercises?.length > 0
      ? initialData.exercises
      : [{ name: '', sets: 3, reps: 10, restSeconds: 60, notes: '' }]
  );
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Reset state when modal reopens
  React.useEffect(() => {
    if (visible) {
      setName(initialData?.name || '');
      setEmoji(initialData?.emoji || '💪');
      setType(initialData?.type || 'custom');
      setDuration(String(initialData?.duration || '30'));
      setDifficulty(initialData?.difficulty || 3);
      setExercises(
        initialData?.exercises?.length > 0
          ? [...initialData.exercises]
          : [{ name: '', sets: 3, reps: 10, restSeconds: 60, notes: '' }]
      );
    }
  }, [visible, initialData]);

  const handleAddExercise = () => {
    hapticLight();
    setExercises([...exercises, { name: '', sets: 3, reps: 10, restSeconds: 60, notes: '' }]);
  };

  const handleUpdateExercise = (index, data) => {
    const updated = [...exercises];
    updated[index] = data;
    setExercises(updated);
  };

  const handleRemoveExercise = (index) => {
    hapticLight();
    if (exercises.length <= 1) {
      Alert.alert('Cannot Remove', 'A template must have at least one exercise.');
      return;
    }
    setExercises(exercises.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Name Required', 'Please enter a template name.');
      return;
    }

    const validExercises = exercises.filter((ex) => ex.name.trim());
    if (validExercises.length === 0) {
      Alert.alert('Exercises Required', 'Please add at least one exercise with a name.');
      return;
    }

    hapticSuccess();
    onSave({
      ...(initialData?.id ? { id: initialData.id } : {}),
      name: name.trim(),
      emoji,
      type,
      duration: parseInt(duration, 10) || 30,
      difficulty,
      exercises: validExercises,
    });
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <BlurView intensity={40} tint="dark" style={modalStyles.overlay}>
        <KeyboardAvoidingView
          style={modalStyles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={modalStyles.container}>
            <LinearGradient
              colors={Gradients.card}
              style={modalStyles.gradient}
            >
              {/* Modal Header */}
              <View style={modalStyles.header}>
                <Text style={modalStyles.title}>
                  {isEdit ? 'Edit Template' : 'New Template'}
                </Text>
                <Pressable style={modalStyles.closeButton} onPress={onClose}>
                  <X size={22} color={Colors.textSecondary} />
                </Pressable>
              </View>

              <ScrollView
                style={modalStyles.scrollView}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {/* Emoji + Name Row */}
                <View style={modalStyles.nameRow}>
                  <Pressable
                    style={modalStyles.emojiButton}
                    onPress={() => setShowEmojiPicker(!showEmojiPicker)}
                  >
                    <Text style={modalStyles.emojiText}>{emoji}</Text>
                  </Pressable>
                  <TextInput
                    style={modalStyles.nameInput}
                    value={name}
                    onChangeText={setName}
                    placeholder="Template name"
                    placeholderTextColor={Colors.textTertiary}
                  />
                </View>

                {/* Emoji Picker */}
                {showEmojiPicker && (
                  <View style={modalStyles.emojiGrid}>
                    {FITNESS_EMOJIS.map((e) => (
                      <Pressable
                        key={e}
                        style={[
                          modalStyles.emojiOption,
                          emoji === e && modalStyles.emojiOptionActive,
                        ]}
                        onPress={() => {
                          hapticLight();
                          setEmoji(e);
                          setShowEmojiPicker(false);
                        }}
                      >
                        <Text style={modalStyles.emojiOptionText}>{e}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}

                {/* Type Selector */}
                <Text style={modalStyles.sectionLabel}>Workout Type</Text>
                <View style={modalStyles.typeGrid}>
                  {WORKOUT_TYPES.map((t) => (
                    <Pressable
                      key={t.id}
                      style={[
                        modalStyles.typeChip,
                        type === t.id && {
                          backgroundColor: t.color + '20',
                          borderColor: t.color,
                        },
                      ]}
                      onPress={() => {
                        hapticLight();
                        setType(t.id);
                      }}
                    >
                      <Text
                        style={[
                          modalStyles.typeChipText,
                          type === t.id && { color: t.color },
                        ]}
                      >
                        {t.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {/* Duration */}
                <Text style={modalStyles.sectionLabel}>Duration (minutes)</Text>
                <TextInput
                  style={modalStyles.durationInput}
                  value={duration}
                  onChangeText={setDuration}
                  keyboardType="numeric"
                  placeholder="30"
                  placeholderTextColor={Colors.textTertiary}
                />

                {/* Difficulty */}
                <Text style={modalStyles.sectionLabel}>Difficulty</Text>
                <View style={modalStyles.difficultyRow}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Pressable
                      key={i}
                      onPress={() => {
                        hapticLight();
                        setDifficulty(i);
                      }}
                    >
                      <Star
                        size={28}
                        color={i <= difficulty ? Colors.warning : Colors.textTertiary}
                        fill={i <= difficulty ? Colors.warning : 'transparent'}
                      />
                    </Pressable>
                  ))}
                </View>

                {/* Exercises */}
                <Text style={modalStyles.sectionLabel}>Exercises</Text>
                {exercises.map((ex, i) => (
                  <ExerciseFormRow
                    key={i}
                    exercise={ex}
                    index={i}
                    onUpdate={handleUpdateExercise}
                    onRemove={handleRemoveExercise}
                  />
                ))}

                <Pressable style={modalStyles.addExerciseButton} onPress={handleAddExercise}>
                  <Plus size={18} color={Colors.primary} />
                  <Text style={modalStyles.addExerciseText}>Add Exercise</Text>
                </Pressable>

                {/* Save Button */}
                <Pressable style={modalStyles.saveButtonContainer} onPress={handleSave}>
                  <LinearGradient
                    colors={Gradients.primary}
                    style={modalStyles.saveButton}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Check size={20} color="#fff" />
                    <Text style={modalStyles.saveButtonText}>
                      {isEdit ? 'Save Changes' : 'Create Template'}
                    </Text>
                  </LinearGradient>
                </Pressable>

                <View style={{ height: 40 }} />
              </ScrollView>
            </LinearGradient>
          </View>
        </KeyboardAvoidingView>
      </BlurView>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  keyboardView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  container: {
    maxHeight: '90%',
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
    overflow: 'hidden',
  },
  gradient: {
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    paddingHorizontal: Spacing.lg,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  emojiButton: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  emojiText: {
    fontSize: 28,
  },
  nameInput: {
    flex: 1,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  emojiOption: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiOptionActive: {
    backgroundColor: Colors.primarySoft,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  emojiOptionText: {
    fontSize: 22,
  },
  sectionLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  typeChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  typeChipText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
  },
  durationInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    fontSize: FontSize.md,
    color: Colors.text,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: Spacing.lg,
  },
  difficultyRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  addExerciseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.primary + '40',
    borderStyle: 'dashed',
    marginBottom: Spacing.lg,
  },
  addExerciseText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.primary,
  },
  saveButtonContainer: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md + 2,
    gap: Spacing.sm,
  },
  saveButtonText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: '#fff',
  },
});

// Main Screen
export default function WorkoutTemplatesScreen() {
  const router = useRouter();
  const {
    templates,
    isLoading,
    createTemplate,
    editTemplate,
    deleteTemplate,
    toggleFavorite,
    useTemplate,
    getTemplatesByType,
    getFavorites,
  } = useWorkoutTemplates();

  const [activeFilter, setActiveFilter] = useState('all');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);

  const filteredTemplates = useMemo(() => {
    if (activeFilter === 'favorites') return getFavorites();
    return getTemplatesByType(activeFilter);
  }, [activeFilter, getTemplatesByType, getFavorites, templates]);

  const handleCreateNew = () => {
    hapticLight();
    setEditingTemplate(null);
    setModalVisible(true);
  };

  const handleEdit = (template) => {
    hapticLight();
    setEditingTemplate(template);
    setModalVisible(true);
  };

  const handleDelete = useCallback(
    async (id) => {
      await deleteTemplate(id);
      hapticSuccess();
    },
    [deleteTemplate]
  );

  const handleSaveModal = useCallback(
    async (data) => {
      if (data.id) {
        await editTemplate(data.id, data);
      } else {
        await createTemplate(data);
      }
      setModalVisible(false);
      setEditingTemplate(null);
    },
    [createTemplate, editTemplate]
  );

  const handleStartWorkout = useCallback(
    async (template) => {
      const templateData = await useTemplate(template.id);
      if (templateData) {
        // Navigate to workout-session with the template exercises
        const workoutPayload = {
          title: templateData.name,
          name: templateData.name,
          emoji: templateData.emoji || '',
          type: templateData.type || 'strength',
          main_set: (templateData.exercises || []).map((ex, i) => ({
            id: `tmpl-${i}`,
            name: ex.name,
            sets: ex.sets || 3,
            reps: ex.reps || 10,
            rest: `${ex.restSeconds || 60}s`,
            tips: ex.notes || '',
            muscle_group: '',
          })),
          duration: templateData.duration || 0,
        };
        router.push({
          pathname: '/workout-session',
          params: { workout: JSON.stringify(workoutPayload) },
        });
      }
    },
    [useTemplate, router]
  );

  const renderTemplateCard = useCallback(
    ({ item, index }) => (
      <ReAnimated.View entering={FadeInDown.delay(index * 60).springify().damping(12)}>
        <TemplateCard
          template={item}
          onStart={handleStartWorkout}
          onToggleFavorite={toggleFavorite}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </ReAnimated.View>
    ),
    [handleStartWorkout, toggleFavorite, handleDelete]
  );

  const keyExtractor = useCallback((item) => item.id, []);

  if (isLoading) {
    return (
      <ScreenWrapper>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading templates...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      {/* Header */}
      <ReAnimated.View entering={FadeInDown.delay(0).springify().damping(12)}>
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() => {
              hapticLight();
              router.back();
            }}
          >
            <ArrowLeft size={22} color={Colors.text} />
          </Pressable>
          <Text style={styles.title}>Workout Templates</Text>
          <Pressable
            style={styles.addButton}
            onPress={handleCreateNew}
          >
            <Plus size={22} color={Colors.primary} />
          </Pressable>
        </View>
      </ReAnimated.View>

      {/* Quick Filters */}
      <ReAnimated.View entering={FadeInDown.delay(60).springify().damping(12)}>
        <FilterTabs activeFilter={activeFilter} onFilterChange={setActiveFilter} />
      </ReAnimated.View>

      {/* Content */}
      {templates.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.emptyScrollContent}
          showsVerticalScrollIndicator={false}
        >
          <EmptyState onCreateNew={handleCreateNew} />
        </ScrollView>
      ) : filteredTemplates.length === 0 ? (
        <View style={styles.noResultsContainer}>
          <Text style={styles.noResultsText}>
            No {activeFilter === 'favorites' ? 'favorite' : getTypeLabel(activeFilter).toLowerCase()} templates found
          </Text>
        </View>
      ) : (
        <OptimizedFlatList
          data={filteredTemplates}
          renderItem={renderTemplateCard}
          keyExtractor={keyExtractor}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListFooterComponent={<View style={styles.bottomSpacer} />}
        />
      )}

      {/* Create/Edit Modal */}
      <TemplateModal
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false);
          setEditingTemplate(null);
        }}
        onSave={handleSaveModal}
        initialData={editingTemplate}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyScrollContent: {
    flexGrow: 1,
  },
  listContent: {
    paddingBottom: Spacing.md,
  },
  noResultsContainer: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  noResultsText: {
    fontSize: FontSize.md,
    color: Colors.textTertiary,
  },
  bottomSpacer: {
    height: 100,
  },
});

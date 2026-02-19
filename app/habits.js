/**
 * Habits Tracker Screen - VibeFit
 *
 * Features:
 * - Today's progress card with circular progress ring
 * - Daily habit list with tap-to-complete checkboxes
 * - Weekly grid showing 7-day completion dots per habit
 * - Streak leaders section (top 3 by current streak)
 * - Add/Edit habit modal with emoji picker, color picker, frequency selector
 * - Preset suggestions in empty state
 * - Haptic feedback on interactions
 */

import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Dimensions,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import ReAnimated, {
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  Plus,
  Check,
  Flame,
  ChevronDown,
  X,
  Target,
  Trash2,
} from 'lucide-react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import {
  Colors,
  Gradients,
  Spacing,
  FontSize,
  FontWeight,
  BorderRadius,
  Shadows,
} from '../constants/theme';
import useHabits from '../hooks/useHabits';
import { hapticLight, hapticSuccess } from '../lib/haptics';
import { format } from 'date-fns';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Progress ring dimensions
const RING_SIZE = 140;
const RING_STROKE = 10;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

// Emoji picker options
const EMOJI_OPTIONS = [
  '✅', '💪', '🏃‍♂️', '🧘‍♀️', '💧', '🥗', '📖', '🧠',
  '💊', '🎯', '⭐', '🌿', '😴', '🍎', '💤', '🚶',
];

// Color picker options
const COLOR_OPTIONS = [
  '#00D4FF', '#FF6B35', '#00E676', '#FFB300',
  '#FF5252', '#BF5AF2', '#FF6B9D', '#64D2FF',
];

// Frequency options
const FREQUENCY_OPTIONS = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekdays', label: 'Weekdays' },
  { key: 'weekends', label: 'Weekends' },
  { key: 'custom', label: 'Custom' },
];

// Day labels for custom frequency
const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// Preset habit suggestions
const PRESET_SUGGESTIONS = [
  { name: '10,000 steps', emoji: '🚶', color: '#00E676' },
  { name: 'Meditate', emoji: '🧘‍♀️', color: '#BF5AF2' },
  { name: 'Read 20 pages', emoji: '📖', color: '#FFB300' },
  { name: 'Drink water', emoji: '💧', color: '#00D4FF' },
  { name: 'No junk food', emoji: '🥗', color: '#00E676' },
  { name: 'Stretch', emoji: '🤸', color: '#FF6B9D' },
];

// Motivational messages based on progress
function getMotivation(percentage) {
  if (percentage === 0) return 'Start your day strong!';
  if (percentage < 25) return 'You\'re getting started!';
  if (percentage < 50) return 'Keep the momentum going!';
  if (percentage < 75) return 'More than halfway there!';
  if (percentage < 100) return 'Almost done, push through!';
  return 'All habits complete! Great work!';
}

// ---- Progress Ring Component ----
function ProgressRing({ percentage, size, strokeWidth, color }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (circumference * Math.min(percentage, 100)) / 100;
  const center = size / 2;

  return (
    <View style={{ width: size, height: size }}>
      {/* Background ring */}
      <View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: 'rgba(255,255,255,0.06)',
        }}
      />
      {/* Progress arc using a trick with border and rotation */}
      {percentage > 0 && (
        <View
          style={{
            position: 'absolute',
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: 'transparent',
            borderTopColor: color,
            borderRightColor: percentage > 25 ? color : 'transparent',
            borderBottomColor: percentage > 50 ? color : 'transparent',
            borderLeftColor: percentage > 75 ? color : 'transparent',
            transform: [{ rotate: '-90deg' }],
          }}
        />
      )}
      {/* Center content */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Text style={styles.ringPercentage}>{percentage}%</Text>
      </View>
    </View>
  );
}

// ---- Habit Checkbox Component ----
function HabitCheckbox({ completed, target, color, onPress }) {
  const boxes = [];
  for (let i = 0; i < target; i++) {
    const isDone = completed > i;
    boxes.push(
      <Pressable
        key={i}
        onPress={onPress}
        style={[
          styles.checkbox,
          {
            backgroundColor: isDone ? Colors.success : 'rgba(255,255,255,0.06)',
            borderColor: isDone ? Colors.success : 'rgba(255,255,255,0.12)',
          },
        ]}
      >
        {isDone && <Check size={14} color="#fff" strokeWidth={3} />}
      </Pressable>
    );
  }
  return <View style={styles.checkboxRow}>{boxes}</View>;
}

// ---- Habit Row Component ----
function HabitRow({ habit, completed, streak, onToggle, onLongPress }) {
  const isFullyDone = completed >= habit.targetPerDay;

  return (
    <Pressable
      onPress={onToggle}
      onLongPress={onLongPress}
      style={[
        styles.habitRow,
        isFullyDone && styles.habitRowCompleted,
      ]}
    >
      {/* Left: emoji circle */}
      <View
        style={[
          styles.emojiCircle,
          { backgroundColor: habit.color + '20', borderColor: habit.color + '40' },
        ]}
      >
        <Text style={styles.emojiText}>{habit.emoji}</Text>
      </View>

      {/* Center: name + streak */}
      <View style={styles.habitInfo}>
        <View style={styles.habitNameRow}>
          <Text
            style={[
              styles.habitName,
              isFullyDone && styles.habitNameDone,
            ]}
            numberOfLines={1}
          >
            {habit.name}
          </Text>
          {streak >= 3 && (
            <View style={styles.streakBadge}>
              <Flame size={12} color={Colors.secondary} fill={Colors.secondary} />
              <Text style={styles.streakBadgeText}>{streak}</Text>
            </View>
          )}
        </View>
        {habit.targetPerDay > 1 && (
          <Text style={styles.habitSubtext}>
            {completed}/{habit.targetPerDay} today
          </Text>
        )}
      </View>

      {/* Right: checkbox(es) */}
      <HabitCheckbox
        completed={completed}
        target={habit.targetPerDay}
        color={habit.color}
        onPress={onToggle}
      />
    </Pressable>
  );
}

// ---- Weekly Grid Dot ----
function WeeklyDot({ completed, target, color }) {
  const isDone = completed >= target;
  const isPartial = completed > 0 && !isDone;

  return (
    <View
      style={[
        styles.weeklyDot,
        {
          backgroundColor: isDone
            ? color
            : isPartial
              ? color + '50'
              : 'rgba(255,255,255,0.06)',
        },
      ]}
    />
  );
}

// ---- Streak Leader Card ----
function StreakLeaderCard({ habit, streak, rank, delay }) {
  const medals = ['🥇', '🥈', '🥉'];

  return (
    <ReAnimated.View
      entering={FadeInDown.delay(delay).springify().damping(12)}
      style={styles.streakLeaderCard}
    >
      <Text style={styles.streakLeaderMedal}>{medals[rank]}</Text>
      <Text style={styles.streakLeaderEmoji}>{habit.emoji}</Text>
      <Text style={styles.streakLeaderName} numberOfLines={1}>{habit.name}</Text>
      <View style={styles.streakLeaderRow}>
        <Flame size={14} color={Colors.secondary} fill={Colors.secondary} />
        <Text style={styles.streakLeaderDays}>{streak}d</Text>
      </View>
    </ReAnimated.View>
  );
}

// ============================================================
// Main Screen
// ============================================================
export default function HabitsScreen() {
  const router = useRouter();
  const {
    habits,
    isLoading,
    addHabit,
    editHabit,
    deleteHabit,
    archiveHabit,
    toggleCompletion,
    getCompletionForDate,
    getStreak,
    getBestStreak,
    getActiveHabitsForDay,
    getTodayProgress,
    getWeeklyGrid,
  } = useHabits();

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingHabit, setEditingHabit] = useState(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formEmoji, setFormEmoji] = useState('✅');
  const [formColor, setFormColor] = useState('#00D4FF');
  const [formFrequency, setFormFrequency] = useState('daily');
  const [formCustomDays, setFormCustomDays] = useState([]);
  const [formTarget, setFormTarget] = useState(1);

  const nameInputRef = useRef(null);

  // Derived data
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const activeHabits = useMemo(() => getActiveHabitsForDay(), [getActiveHabitsForDay]);
  const progress = useMemo(() => getTodayProgress(), [getTodayProgress]);

  // Streak leaders (top 3 by current streak, non-archived habits only)
  const streakLeaders = useMemo(() => {
    const withStreaks = habits
      .filter(h => !h.archived)
      .map(h => ({ habit: h, streak: getStreak(h.id) }))
      .filter(s => s.streak > 0)
      .sort((a, b) => b.streak - a.streak)
      .slice(0, 3);
    return withStreaks;
  }, [habits, getStreak]);

  // Non-archived habits for weekly grid
  const visibleHabits = useMemo(
    () => habits.filter(h => !h.archived),
    [habits]
  );

  // ---- Modal helpers ----
  const openAddModal = useCallback(() => {
    setEditingHabit(null);
    setFormName('');
    setFormEmoji('✅');
    setFormColor('#00D4FF');
    setFormFrequency('daily');
    setFormCustomDays([]);
    setFormTarget(1);
    setModalVisible(true);
    hapticLight();
  }, []);

  const openEditModal = useCallback((habit) => {
    setEditingHabit(habit);
    setFormName(habit.name);
    setFormEmoji(habit.emoji);
    setFormColor(habit.color);
    setFormFrequency(habit.frequency);
    setFormCustomDays(habit.customDays || []);
    setFormTarget(habit.targetPerDay || 1);
    setModalVisible(true);
    hapticLight();
  }, []);

  const closeModal = useCallback(() => {
    setModalVisible(false);
    setEditingHabit(null);
  }, []);

  const handleSave = useCallback(() => {
    const trimmed = formName.trim();
    if (!trimmed) {
      Alert.alert('Name Required', 'Please enter a habit name.');
      return;
    }

    if (editingHabit) {
      editHabit(editingHabit.id, {
        name: trimmed,
        emoji: formEmoji,
        color: formColor,
        frequency: formFrequency,
        customDays: formCustomDays,
        targetPerDay: formTarget,
      });
    } else {
      const ok = addHabit({
        name: trimmed,
        emoji: formEmoji,
        color: formColor,
        frequency: formFrequency,
        customDays: formCustomDays,
        targetPerDay: formTarget,
      });
      if (!ok) {
        Alert.alert('Limit Reached', 'You can track up to 20 habits.');
        return;
      }
    }

    hapticSuccess();
    closeModal();
  }, [
    formName, formEmoji, formColor, formFrequency, formCustomDays, formTarget,
    editingHabit, editHabit, addHabit, closeModal,
  ]);

  const handleDelete = useCallback(() => {
    if (!editingHabit) return;
    Alert.alert(
      'Delete Habit',
      `Remove "${editingHabit.name}" and all its data?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteHabit(editingHabit.id);
            hapticLight();
            closeModal();
          },
        },
      ]
    );
  }, [editingHabit, deleteHabit, closeModal]);

  const handleToggle = useCallback((habitId) => {
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return;
    const current = getCompletionForDate(habitId);
    toggleCompletion(habitId);
    if (current + 1 >= habit.targetPerDay) {
      hapticSuccess();
    } else {
      hapticLight();
    }
  }, [habits, getCompletionForDate, toggleCompletion]);

  const handlePreset = useCallback((preset) => {
    setEditingHabit(null);
    setFormName(preset.name);
    setFormEmoji(preset.emoji);
    setFormColor(preset.color);
    setFormFrequency('daily');
    setFormCustomDays([]);
    setFormTarget(1);
    setModalVisible(true);
    hapticLight();
  }, []);

  const toggleCustomDay = useCallback((dayIdx) => {
    setFormCustomDays(prev =>
      prev.includes(dayIdx) ? prev.filter(d => d !== dayIdx) : [...prev, dayIdx]
    );
    hapticLight();
  }, []);

  // ---- Loading state ----
  if (isLoading) {
    return (
      <ScreenWrapper>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading habits...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  const hasHabits = habits.filter(h => !h.archived).length > 0;

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <ScreenWrapper>
      {/* Header */}
      <ReAnimated.View
        entering={FadeInDown.delay(50).springify().damping(12)}
        style={styles.header}
      >
        <Pressable
          onPress={() => { hapticLight(); router.back(); }}
          style={styles.headerButton}
        >
          <ArrowLeft size={22} color={Colors.text} />
        </Pressable>

        <Text style={styles.headerTitle}>Habits</Text>

        <Pressable
          onPress={openAddModal}
          style={styles.headerButton}
        >
          <Plus size={22} color={Colors.primary} />
        </Pressable>
      </ReAnimated.View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ---- Today's Progress Card ---- */}
        <ReAnimated.View
          entering={FadeInDown.delay(100).springify().damping(12)}
        >
          <LinearGradient
            colors={Gradients.card}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.progressCard}
          >
            <View style={styles.progressCardInner}>
              <ProgressRing
                percentage={progress.percentage}
                size={RING_SIZE}
                strokeWidth={RING_STROKE}
                color={Colors.primary}
              />

              <View style={styles.progressInfo}>
                <Text style={styles.progressTitle}>Today</Text>
                <Text style={styles.progressCount}>
                  {progress.completed}{' '}
                  <Text style={styles.progressCountDim}>of {progress.total}</Text>
                </Text>
                <Text style={styles.progressLabel}>habits complete</Text>
                <Text style={styles.progressMotivation}>
                  {getMotivation(progress.percentage)}
                </Text>
              </View>
            </View>
          </LinearGradient>
        </ReAnimated.View>

        {/* ---- Empty State ---- */}
        {!hasHabits && (
          <ReAnimated.View
            entering={FadeInDown.delay(200).springify().damping(12)}
          >
            <View style={styles.emptyState}>
              <Target size={48} color={Colors.textTertiary} />
              <Text style={styles.emptyTitle}>No habits yet</Text>
              <Text style={styles.emptySubtitle}>
                Start building healthy routines. Tap the + button or choose a preset below.
              </Text>
            </View>

            {/* Preset suggestions */}
            <Text style={styles.sectionTitle}>Quick Start</Text>
            <View style={styles.presetGrid}>
              {PRESET_SUGGESTIONS.map((preset, idx) => (
                <Pressable
                  key={preset.name}
                  onPress={() => handlePreset(preset)}
                  style={styles.presetCard}
                >
                  <Text style={styles.presetEmoji}>{preset.emoji}</Text>
                  <Text style={styles.presetName} numberOfLines={1}>{preset.name}</Text>
                </Pressable>
              ))}
            </View>
          </ReAnimated.View>
        )}

        {/* ---- Today's Habits List ---- */}
        {hasHabits && (
          <ReAnimated.View
            entering={FadeInDown.delay(200).springify().damping(12)}
          >
            <Text style={styles.sectionTitle}>Today's Habits</Text>
            {activeHabits.length === 0 ? (
              <View style={styles.noneToday}>
                <Text style={styles.noneTodayText}>No habits scheduled for today</Text>
              </View>
            ) : (
              activeHabits.map((habit) => {
                const completed = getCompletionForDate(habit.id);
                const streak = getStreak(habit.id);
                return (
                  <HabitRow
                    key={habit.id}
                    habit={habit}
                    completed={completed}
                    streak={streak}
                    onToggle={() => handleToggle(habit.id)}
                    onLongPress={() => openEditModal(habit)}
                  />
                );
              })
            )}
          </ReAnimated.View>
        )}

        {/* ---- Weekly Grid Section ---- */}
        {hasHabits && visibleHabits.length > 0 && (
          <ReAnimated.View
            entering={FadeInDown.delay(300).springify().damping(12)}
          >
            <Text style={styles.sectionTitle}>Weekly Overview</Text>
            <View style={styles.weeklyCard}>
              {/* Day headers */}
              <View style={styles.weeklyHeaderRow}>
                <View style={styles.weeklyLabelCol} />
                {(() => {
                  const days = [];
                  for (let i = 6; i >= 0; i--) {
                    const d = new Date();
                    d.setDate(d.getDate() - i);
                    days.push(
                      <View key={i} style={styles.weeklyDayCol}>
                        <Text style={styles.weeklyDayLabel}>
                          {format(d, 'EEE').charAt(0)}
                        </Text>
                      </View>
                    );
                  }
                  return days;
                })()}
              </View>

              {/* Habit rows */}
              {visibleHabits.map((habit) => {
                const grid = getWeeklyGrid(habit.id);
                return (
                  <View key={habit.id} style={styles.weeklyRow}>
                    <View style={styles.weeklyLabelCol}>
                      <Text style={styles.weeklyHabitEmoji}>{habit.emoji}</Text>
                    </View>
                    {grid.map((day) => (
                      <View key={day.date} style={styles.weeklyDayCol}>
                        <WeeklyDot
                          completed={day.completed}
                          target={day.target}
                          color={habit.color}
                        />
                      </View>
                    ))}
                  </View>
                );
              })}
            </View>
          </ReAnimated.View>
        )}

        {/* ---- Streak Leaders ---- */}
        {streakLeaders.length > 0 && (
          <ReAnimated.View
            entering={FadeInDown.delay(400).springify().damping(12)}
          >
            <Text style={styles.sectionTitle}>Streak Leaders</Text>
            <View style={styles.streakLeadersRow}>
              {streakLeaders.map((item, idx) => (
                <StreakLeaderCard
                  key={item.habit.id}
                  habit={item.habit}
                  streak={item.streak}
                  rank={idx}
                  delay={450 + idx * 80}
                />
              ))}
            </View>
          </ReAnimated.View>
        )}

        {/* ---- All Habits (archived toggle future) ---- */}
        {hasHabits && (
          <ReAnimated.View
            entering={FadeInDown.delay(500).springify().damping(12)}
          >
            <Pressable onPress={openAddModal} style={styles.addMoreButton}>
              <Plus size={18} color={Colors.primary} />
              <Text style={styles.addMoreText}>Add New Habit</Text>
            </Pressable>
          </ReAnimated.View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* ============================================================ */}
      {/* ADD / EDIT HABIT MODAL                                       */}
      {/* ============================================================ */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <Pressable style={styles.modalBackdrop} onPress={closeModal} />

          <View style={styles.modalContainer}>
            <LinearGradient
              colors={['#1A1A22', '#111116']}
              style={styles.modalGradient}
            >
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingHabit ? 'Edit Habit' : 'New Habit'}
                </Text>
                <Pressable onPress={closeModal} style={styles.modalCloseBtn}>
                  <X size={20} color={Colors.textSecondary} />
                </Pressable>
              </View>

              <ScrollView
                style={styles.modalScroll}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {/* Name input */}
                <Text style={styles.modalLabel}>Name</Text>
                <TextInput
                  ref={nameInputRef}
                  style={styles.modalInput}
                  value={formName}
                  onChangeText={setFormName}
                  placeholder="e.g. Morning run"
                  placeholderTextColor={Colors.textTertiary}
                  maxLength={40}
                  autoFocus={!editingHabit}
                />

                {/* Emoji picker */}
                <Text style={styles.modalLabel}>Icon</Text>
                <View style={styles.emojiGrid}>
                  {EMOJI_OPTIONS.map((emoji) => (
                    <Pressable
                      key={emoji}
                      onPress={() => { setFormEmoji(emoji); hapticLight(); }}
                      style={[
                        styles.emojiOption,
                        formEmoji === emoji && styles.emojiOptionSelected,
                      ]}
                    >
                      <Text style={styles.emojiOptionText}>{emoji}</Text>
                    </Pressable>
                  ))}
                </View>

                {/* Color picker */}
                <Text style={styles.modalLabel}>Color</Text>
                <View style={styles.colorGrid}>
                  {COLOR_OPTIONS.map((color) => (
                    <Pressable
                      key={color}
                      onPress={() => { setFormColor(color); hapticLight(); }}
                      style={[
                        styles.colorOption,
                        { backgroundColor: color },
                        formColor === color && styles.colorOptionSelected,
                      ]}
                    >
                      {formColor === color && (
                        <Check size={16} color="#fff" strokeWidth={3} />
                      )}
                    </Pressable>
                  ))}
                </View>

                {/* Frequency selector */}
                <Text style={styles.modalLabel}>Frequency</Text>
                <View style={styles.frequencyRow}>
                  {FREQUENCY_OPTIONS.map((opt) => (
                    <Pressable
                      key={opt.key}
                      onPress={() => { setFormFrequency(opt.key); hapticLight(); }}
                      style={[
                        styles.frequencyChip,
                        formFrequency === opt.key && styles.frequencyChipActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.frequencyChipText,
                          formFrequency === opt.key && styles.frequencyChipTextActive,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {/* Custom day selector */}
                {formFrequency === 'custom' && (
                  <View style={styles.customDaysRow}>
                    {DAY_LABELS.map((label, idx) => {
                      const isActive = formCustomDays.includes(idx);
                      return (
                        <Pressable
                          key={idx}
                          onPress={() => toggleCustomDay(idx)}
                          style={[
                            styles.dayCircle,
                            isActive && { backgroundColor: formColor, borderColor: formColor },
                          ]}
                        >
                          <Text
                            style={[
                              styles.dayCircleText,
                              isActive && styles.dayCircleTextActive,
                            ]}
                          >
                            {label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}

                {/* Target per day stepper */}
                <Text style={styles.modalLabel}>Target per Day</Text>
                <View style={styles.stepperRow}>
                  <Pressable
                    onPress={() => {
                      if (formTarget > 1) {
                        setFormTarget(prev => prev - 1);
                        hapticLight();
                      }
                    }}
                    style={[
                      styles.stepperButton,
                      formTarget <= 1 && styles.stepperButtonDisabled,
                    ]}
                  >
                    <Text style={styles.stepperButtonText}>-</Text>
                  </Pressable>

                  <View style={styles.stepperValue}>
                    <Text style={styles.stepperValueText}>{formTarget}</Text>
                  </View>

                  <Pressable
                    onPress={() => {
                      if (formTarget < 5) {
                        setFormTarget(prev => prev + 1);
                        hapticLight();
                      }
                    }}
                    style={[
                      styles.stepperButton,
                      formTarget >= 5 && styles.stepperButtonDisabled,
                    ]}
                  >
                    <Text style={styles.stepperButtonText}>+</Text>
                  </Pressable>
                </View>

                {/* Delete button (edit mode only) */}
                {editingHabit && (
                  <Pressable onPress={handleDelete} style={styles.deleteButton}>
                    <Trash2 size={18} color={Colors.error} />
                    <Text style={styles.deleteButtonText}>Delete Habit</Text>
                  </Pressable>
                )}

                <View style={{ height: Spacing.lg }} />
              </ScrollView>

              {/* Save button */}
              <Pressable onPress={handleSave} style={styles.saveButton}>
                <LinearGradient
                  colors={Gradients.primary}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.saveButtonGradient}
                >
                  <Text style={styles.saveButtonText}>
                    {editingHabit ? 'Save Changes' : 'Add Habit'}
                  </Text>
                </LinearGradient>
              </Pressable>
            </LinearGradient>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScreenWrapper>
  );
}

// ============================================================
// STYLES
// ============================================================
const styles = StyleSheet.create({
  // ---- Loading ----
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
  },

  // ---- Header ----
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  headerButton: {
    width: 42,
    height: 42,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    letterSpacing: -0.5,
  },

  // ---- Scroll ----
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },

  // ---- Progress Card ----
  progressCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadows.card,
  },
  progressCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  ringPercentage: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  progressInfo: {
    flex: 1,
  },
  progressTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: Spacing.xs,
  },
  progressCount: {
    fontSize: 36,
    fontWeight: FontWeight.heavy,
    color: Colors.text,
    lineHeight: 42,
  },
  progressCountDim: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.medium,
    color: Colors.textTertiary,
  },
  progressLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  progressMotivation: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: FontWeight.medium,
  },

  // ---- Section title ----
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginBottom: Spacing.md,
    marginTop: Spacing.sm,
  },

  // ---- Empty State ----
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    gap: Spacing.sm,
  },
  emptyTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginTop: Spacing.md,
  },
  emptySubtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: Spacing.lg,
  },

  // ---- Preset suggestions ----
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  presetCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    width: (SCREEN_WIDTH - Spacing.md * 2 - Spacing.sm) / 2,
  },
  presetEmoji: {
    fontSize: 22,
  },
  presetName: {
    fontSize: FontSize.sm,
    color: Colors.text,
    fontWeight: FontWeight.medium,
    flex: 1,
  },

  // ---- Habit Row ----
  habitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  habitRowCompleted: {
    borderColor: 'rgba(0,230,118,0.15)',
    backgroundColor: 'rgba(0,230,118,0.03)',
  },
  emojiCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiText: {
    fontSize: 22,
  },
  habitInfo: {
    flex: 1,
  },
  habitNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  habitName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    flexShrink: 1,
  },
  habitNameDone: {
    color: Colors.textSecondary,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.secondarySoft,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 2,
  },
  streakBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.secondary,
  },
  habitSubtext: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: 2,
  },

  // ---- Checkbox ----
  checkboxRow: {
    flexDirection: 'row',
    gap: 6,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ---- None today ----
  noneToday: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  noneTodayText: {
    fontSize: FontSize.md,
    color: Colors.textTertiary,
  },

  // ---- Weekly Grid ----
  weeklyCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  weeklyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  weeklyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  weeklyLabelCol: {
    width: 36,
    alignItems: 'center',
  },
  weeklyDayCol: {
    flex: 1,
    alignItems: 'center',
  },
  weeklyDayLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Colors.textTertiary,
  },
  weeklyHabitEmoji: {
    fontSize: 16,
  },
  weeklyDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },

  // ---- Streak Leaders ----
  streakLeadersRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  streakLeaderCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: Spacing.md,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  streakLeaderMedal: {
    fontSize: 20,
  },
  streakLeaderEmoji: {
    fontSize: 28,
  },
  streakLeaderName: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Colors.text,
    textAlign: 'center',
  },
  streakLeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  streakLeaderDays: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.secondary,
  },

  // ---- Add More Button ----
  addMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.primarySoft,
    borderStyle: 'dashed',
  },
  addMoreText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.primary,
  },

  // ---- Bottom Spacer ----
  bottomSpacer: {
    height: 120,
  },

  // ============================================================
  // MODAL STYLES
  // ============================================================
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.overlay,
  },
  modalContainer: {
    maxHeight: '88%',
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
    overflow: 'hidden',
  },
  modalGradient: {
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },

  // Modal header
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Modal scroll
  modalScroll: {
    paddingHorizontal: Spacing.lg,
  },

  // Modal label
  modalLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },

  // Modal input
  modalInput: {
    backgroundColor: Colors.inputBackground,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    fontSize: FontSize.md,
    color: Colors.text,
  },

  // Emoji grid
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  emojiOption: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.sm,
    backgroundColor: 'rgba(255,255,255,0.04)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  emojiOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primarySoft,
  },
  emojiOptionText: {
    fontSize: 22,
  },

  // Color grid
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  colorOption: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorOptionSelected: {
    borderColor: '#fff',
    transform: [{ scale: 1.1 }],
  },

  // Frequency
  frequencyRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  frequencyChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
  },
  frequencyChipActive: {
    backgroundColor: Colors.primarySoft,
    borderColor: Colors.primary,
  },
  frequencyChipText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
  },
  frequencyChipTextActive: {
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
  },

  // Custom days
  customDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.xs,
  },
  dayCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayCircleText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
  },
  dayCircleTextActive: {
    color: '#fff',
  },

  // Stepper
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  stepperButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperButtonDisabled: {
    opacity: 0.3,
  },
  stepperButtonText: {
    fontSize: 22,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  stepperValue: {
    width: 56,
    height: 44,
    borderRadius: BorderRadius.sm,
    backgroundColor: 'rgba(255,255,255,0.04)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperValueText: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },

  // Delete button
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    marginTop: Spacing.xl,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.errorSoft,
  },
  deleteButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.error,
  },

  // Save button
  saveButton: {
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.button,
  },
  saveButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
  },
  saveButtonText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: '#fff',
    letterSpacing: 0.5,
  },
});

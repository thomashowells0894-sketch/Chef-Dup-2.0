/**
 * Wellness Journal Screen - FuelIQ
 *
 * Features:
 * - Daily prompt displayed as InsightCard
 * - Mood selector with 5 emoji buttons (1-5)
 * - Glass-styled multiline TextInput for journaling
 * - Tag selector with preset wellness tags
 * - Save button with gradient
 * - Journal streak display
 * - Past entries FlatList with expand/collapse
 * - Empty state with calming encouragement
 * - Reanimated enter animations
 * - Haptic feedback on interactions
 */

import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import ReAnimated, {
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  Layout,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  BookOpen,
  Flame,
  Save,
  Trash2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react-native';
import { format, parseISO, isToday, isYesterday } from 'date-fns';
import ScreenWrapper from '../components/ScreenWrapper';
import GlassCard from '../components/ui/GlassCard';
import InsightCard from '../components/InsightCard';
import {
  Colors,
  Gradients,
  Spacing,
  FontSize,
  FontWeight,
  BorderRadius,
  Shadows,
} from '../constants/theme';
import { useJournal } from '../hooks/useJournal';
import { hapticLight, hapticSuccess, hapticImpact } from '../lib/haptics';

// Mood emoji mapping: index 0-4 corresponds to mood values 1-5
const MOOD_OPTIONS = [
  { value: 1, emoji: '\u{1F622}', label: 'Awful' },
  { value: 2, emoji: '\u{1F615}', label: 'Bad' },
  { value: 3, emoji: '\u{1F610}', label: 'Okay' },
  { value: 4, emoji: '\u{1F642}', label: 'Good' },
  { value: 5, emoji: '\u{1F60A}', label: 'Great' },
];

// Preset tags for journal entries
const PRESET_TAGS = [
  'grateful',
  'stressed',
  'energized',
  'tired',
  'motivated',
  'anxious',
];

// Get mood emoji from a numeric value
function getMoodEmoji(mood) {
  const option = MOOD_OPTIONS.find((m) => m.value === mood);
  return option ? option.emoji : '\u{1F610}';
}

// Format a date string for display in entries list
function formatEntryDate(dateStr) {
  try {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'EEEE, MMM d');
  } catch {
    return dateStr;
  }
}

// ============================================================
// Mood Selector Component
// ============================================================
function MoodSelector({ selectedMood, onSelect }) {
  return (
    <View style={styles.moodRow}>
      {MOOD_OPTIONS.map((option) => {
        const isSelected = selectedMood === option.value;
        return (
          <Pressable
            key={option.value}
            onPress={() => {
              hapticLight();
              onSelect(option.value);
            }}
            style={[
              styles.moodButton,
              isSelected && styles.moodButtonSelected,
            ]}
          >
            <Text style={[styles.moodEmoji, isSelected && styles.moodEmojiSelected]}>
              {option.emoji}
            </Text>
            <Text style={[styles.moodLabel, isSelected && styles.moodLabelSelected]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ============================================================
// Tag Selector Component
// ============================================================
function TagSelector({ selectedTags, onToggle }) {
  return (
    <View style={styles.tagRow}>
      {PRESET_TAGS.map((tag) => {
        const isActive = selectedTags.includes(tag);
        return (
          <Pressable
            key={tag}
            onPress={() => {
              hapticLight();
              onToggle(tag);
            }}
            style={[styles.tagChip, isActive && styles.tagChipActive]}
          >
            <Text style={[styles.tagChipText, isActive && styles.tagChipTextActive]}>
              {tag}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ============================================================
// Streak Display Component
// ============================================================
function StreakDisplay({ streak }) {
  return (
    <ReAnimated.View entering={FadeInDown.delay(300).springify().damping(12)}>
      <GlassCard variant={streak > 0 ? 'accent' : 'default'} glow={streak >= 7}>
        <View style={styles.streakContent}>
          <View style={styles.streakIconWrap}>
            <Flame
              size={28}
              color={streak > 0 ? Colors.secondary : Colors.textTertiary}
              fill={streak > 0 ? Colors.secondary : 'transparent'}
            />
          </View>
          <View style={styles.streakInfo}>
            <Text style={styles.streakNumber}>{streak}</Text>
            <Text style={styles.streakLabel}>
              day{streak !== 1 ? 's' : ''} journaling streak
            </Text>
          </View>
          {streak >= 3 && (
            <View style={styles.streakBadge}>
              <Text style={styles.streakBadgeText}>
                {streak >= 30 ? 'Legendary' : streak >= 14 ? 'On Fire' : streak >= 7 ? 'Consistent' : 'Building'}
              </Text>
            </View>
          )}
        </View>
      </GlassCard>
    </ReAnimated.View>
  );
}

// ============================================================
// Past Entry Card Component
// ============================================================
function PastEntryCard({ entry, onDelete }) {
  const [expanded, setExpanded] = useState(false);

  const toggleExpand = useCallback(() => {
    hapticLight();
    setExpanded((prev) => !prev);
  }, []);

  const handleDelete = useCallback(() => {
    Alert.alert(
      'Delete Entry',
      'Are you sure you want to delete this journal entry?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            hapticImpact();
            onDelete(entry.id);
          },
        },
      ]
    );
  }, [entry.id, onDelete]);

  const ExpandIcon = expanded ? ChevronUp : ChevronDown;

  return (
    <Pressable onPress={toggleExpand}>
      <View style={styles.entryCard}>
        <LinearGradient
          colors={Gradients.card}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.entryCardGradient}
        >
          {/* Header row: date + mood */}
          <View style={styles.entryHeader}>
            <View style={styles.entryDateRow}>
              <Text style={styles.entryDate}>{formatEntryDate(entry.date)}</Text>
              <Text style={styles.entryMoodEmoji}>{getMoodEmoji(entry.mood)}</Text>
            </View>
            <ExpandIcon size={18} color={Colors.textTertiary} />
          </View>

          {/* Body (truncated or expanded) */}
          <Text
            style={styles.entryBody}
            numberOfLines={expanded ? undefined : 3}
          >
            {entry.content}
          </Text>

          {/* Tags */}
          {entry.tags && entry.tags.length > 0 && (
            <View style={styles.entryTagRow}>
              {entry.tags.map((tag) => (
                <View key={tag} style={styles.entryTagPill}>
                  <Text style={styles.entryTagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Delete button (only visible when expanded) */}
          {expanded && (
            <Pressable onPress={handleDelete} style={styles.entryDeleteBtn}>
              <Trash2 size={14} color={Colors.error} />
              <Text style={styles.entryDeleteText}>Delete</Text>
            </Pressable>
          )}
        </LinearGradient>
      </View>
    </Pressable>
  );
}

// ============================================================
// Empty State Component
// ============================================================
function EmptyJournalState() {
  return (
    <ReAnimated.View entering={FadeInDown.delay(200).springify().damping(12)}>
      <View style={styles.emptyContainer}>
        <LinearGradient
          colors={Gradients.card}
          style={styles.emptyGradient}
        >
          <View style={styles.emptyIconWrap}>
            <BookOpen size={48} color={Colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>Your Journal Awaits</Text>
          <Text style={styles.emptySubtitle}>
            Taking a moment to reflect can help you understand your patterns, celebrate
            wins, and navigate challenges. Start writing above -- even a single sentence
            counts.
          </Text>
          <View style={styles.emptyHints}>
            <Text style={styles.emptyHint}>
              {'\u{2728}'} Write about what you are grateful for
            </Text>
            <Text style={styles.emptyHint}>
              {'\u{1F4AA}'} Note how your body feels after a workout
            </Text>
            <Text style={styles.emptyHint}>
              {'\u{1F33F}'} Reflect on one thing that brought you peace
            </Text>
          </View>
        </LinearGradient>
      </View>
    </ReAnimated.View>
  );
}

// ============================================================
// Main Screen
// ============================================================
export default function JournalScreen() {
  const router = useRouter();
  const {
    entries,
    todayEntry,
    todayPrompt,
    isLoading,
    streak,
    saveEntry,
    deleteEntry,
    refresh,
  } = useJournal();

  // Local state for current entry form
  const [mood, setMood] = useState(todayEntry?.mood || 3);
  const [text, setText] = useState(todayEntry?.content || '');
  const [selectedTags, setSelectedTags] = useState(todayEntry?.tags || []);
  const [isSaving, setIsSaving] = useState(false);
  const textInputRef = useRef(null);

  // Sync local state when todayEntry loads
  React.useEffect(() => {
    if (todayEntry) {
      setMood(todayEntry.mood || 3);
      setText(todayEntry.content || '');
      setSelectedTags(todayEntry.tags || []);
    }
  }, [todayEntry]);

  // Past entries (exclude today)
  const pastEntries = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return entries.filter((e) => e.date !== today);
  }, [entries]);

  // Toggle a tag
  const handleToggleTag = useCallback((tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }, []);

  // Save entry
  const handleSave = useCallback(async () => {
    if (!text.trim()) {
      Alert.alert('Write Something', 'Please write at least a sentence before saving.');
      return;
    }
    setIsSaving(true);
    try {
      const success = await saveEntry(text, mood, selectedTags);
      if (success) {
        await hapticSuccess();
      }
    } catch (error) {
      if (__DEV__) console.error('[Journal] Save failed:', error);
    } finally {
      setIsSaving(false);
    }
  }, [text, mood, selectedTags, saveEntry]);

  // Delete entry
  const handleDelete = useCallback(
    async (entryId) => {
      await deleteEntry(entryId);
      hapticLight();
    },
    [deleteEntry]
  );

  // Navigate back
  const handleBack = useCallback(() => {
    hapticLight();
    router.back();
  }, [router]);

  // Loading state
  if (isLoading) {
    return (
      <ScreenWrapper>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading journal...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  // FlatList header (today's entry form + streak)
  const ListHeader = () => (
    <View style={styles.listHeader}>
      {/* Daily Prompt */}
      <ReAnimated.View entering={FadeInDown.delay(100).springify().damping(12)}>
        <InsightCard
          type="tip"
          emoji={todayPrompt?.emoji || '\u{1F4AD}'}
          title="Today's Prompt"
          body={todayPrompt?.question || 'What is on your mind today?'}
        />
      </ReAnimated.View>

      {/* Mood Selector */}
      <ReAnimated.View entering={FadeInDown.delay(150).springify().damping(12)}>
        <Text style={styles.sectionLabel}>How are you feeling?</Text>
        <MoodSelector selectedMood={mood} onSelect={setMood} />
      </ReAnimated.View>

      {/* Journal TextInput */}
      <ReAnimated.View entering={FadeInDown.delay(200).springify().damping(12)}>
        <Text style={styles.sectionLabel}>Write your thoughts</Text>
        <View style={styles.textInputWrapper}>
          <TextInput
            ref={textInputRef}
            style={styles.journalInput}
            value={text}
            onChangeText={setText}
            placeholder="What's on your mind today..."
            placeholderTextColor={Colors.textTertiary}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            maxLength={2000}
          />
          <Text style={styles.charCount}>{text.length}/2000</Text>
        </View>
      </ReAnimated.View>

      {/* Tag Selector */}
      <ReAnimated.View entering={FadeInDown.delay(250).springify().damping(12)}>
        <Text style={styles.sectionLabel}>Tags</Text>
        <TagSelector selectedTags={selectedTags} onToggle={handleToggleTag} />
      </ReAnimated.View>

      {/* Save Button */}
      <ReAnimated.View entering={FadeInDown.delay(280).springify().damping(12)}>
        <Pressable
          onPress={handleSave}
          disabled={isSaving || !text.trim()}
          style={[styles.saveButton, (!text.trim() || isSaving) && styles.saveButtonDisabled]}
        >
          <LinearGradient
            colors={text.trim() && !isSaving ? Gradients.primary : Gradients.disabled}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.saveButtonGradient}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Save size={18} color="#fff" />
                <Text style={styles.saveButtonText}>
                  {todayEntry ? 'Update Entry' : 'Save Entry'}
                </Text>
              </>
            )}
          </LinearGradient>
        </Pressable>
      </ReAnimated.View>

      {/* Streak Display */}
      <View style={styles.streakSection}>
        <StreakDisplay streak={streak} />
      </View>

      {/* Past Entries Header */}
      {pastEntries.length > 0 && (
        <ReAnimated.View entering={FadeInDown.delay(350).springify().damping(12)}>
          <Text style={styles.pastEntriesTitle}>Past Entries</Text>
        </ReAnimated.View>
      )}
    </View>
  );

  // FlatList empty component (only for past entries area)
  const ListEmpty = () => {
    if (todayEntry) return null; // They have today's entry, just no past ones
    return <EmptyJournalState />;
  };

  // FlatList footer spacer
  const ListFooter = () => <View style={styles.bottomSpacer} />;

  return (
    <ScreenWrapper>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        {/* Header */}
        <ReAnimated.View
          entering={FadeInDown.delay(50).springify().damping(12)}
          style={styles.header}
        >
          <Pressable onPress={handleBack} style={styles.headerButton}>
            <ArrowLeft size={22} color={Colors.text} />
          </Pressable>
          <View style={styles.headerCenter}>
            <BookOpen size={20} color={Colors.primary} />
            <Text style={styles.headerTitle}>Wellness Journal</Text>
          </View>
          <View style={styles.headerSpacer} />
        </ReAnimated.View>

        {/* Content */}
        <FlatList
          data={pastEntries}
          keyExtractor={(item) => item.id?.toString() || item.date}
          renderItem={({ item, index }) => (
            <ReAnimated.View
              entering={FadeInDown.delay(400 + index * 60).springify().damping(12)}
              style={styles.entryItemWrap}
            >
              <PastEntryCard entry={item} onDelete={handleDelete} />
            </ReAnimated.View>
          )}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={ListEmpty}
          ListFooterComponent={ListFooter}
          contentContainerStyle={styles.flatListContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={5}
          initialNumToRender={10}
        />
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

// ============================================================
// STYLES
// ============================================================
const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },

  // --- Loading ---
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
  },

  // --- Header ---
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
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    letterSpacing: -0.5,
  },
  headerSpacer: {
    width: 42,
  },

  // --- FlatList ---
  flatListContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  listHeader: {
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },

  // --- Section Labels ---
  sectionLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },

  // --- Mood Selector ---
  moodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  moodButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 4,
  },
  moodButtonSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primarySoft,
    ...Shadows.glowPrimary,
  },
  moodEmoji: {
    fontSize: 26,
  },
  moodEmojiSelected: {
    fontSize: 30,
  },
  moodLabel: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    fontWeight: FontWeight.medium,
  },
  moodLabelSelected: {
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
  },

  // --- Journal TextInput ---
  textInputWrapper: {
    backgroundColor: Colors.inputBackground,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    overflow: 'hidden',
  },
  journalInput: {
    padding: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
    minHeight: 120,
    maxHeight: 200,
    lineHeight: 22,
  },
  charCount: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textAlign: 'right',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },

  // --- Tag Selector ---
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  tagChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  tagChipActive: {
    backgroundColor: Colors.primarySoft,
    borderColor: Colors.primary,
  },
  tagChipText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
  },
  tagChipTextActive: {
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
  },

  // --- Save Button ---
  saveButton: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.button,
  },
  saveButtonDisabled: {
    opacity: 0.6,
    ...Shadows.inner,
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  saveButtonText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: '#fff',
    letterSpacing: 0.5,
  },

  // --- Streak ---
  streakSection: {
    marginTop: Spacing.xs,
  },
  streakContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  streakIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 107, 53, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  streakInfo: {
    flex: 1,
  },
  streakNumber: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.heavy,
    color: Colors.text,
    lineHeight: 36,
  },
  streakLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  streakBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.secondarySoft,
  },
  streakBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.secondary,
  },

  // --- Past Entries ---
  pastEntriesTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginTop: Spacing.sm,
  },
  entryItemWrap: {
    marginBottom: Spacing.sm,
  },
  entryCard: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  entryCardGradient: {
    padding: Spacing.md,
  },
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  entryDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  entryDate: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  entryMoodEmoji: {
    fontSize: 20,
  },
  entryBody: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  entryTagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  entryTagPill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(0, 212, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.2)',
  },
  entryTagText: {
    fontSize: FontSize.xs,
    color: Colors.primary,
    fontWeight: FontWeight.medium,
  },
  entryDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.errorSoft,
  },
  entryDeleteText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.error,
  },

  // --- Empty State ---
  emptyContainer: {
    marginTop: Spacing.lg,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.15)',
  },
  emptyGradient: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 212, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  emptyHints: {
    width: '100%',
    gap: Spacing.md,
  },
  emptyHint: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    lineHeight: 22,
  },

  // --- Bottom Spacer ---
  bottomSpacer: {
    height: 120,
  },
});

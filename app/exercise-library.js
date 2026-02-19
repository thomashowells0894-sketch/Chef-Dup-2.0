import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ScrollView,
  TextInput,
  Dimensions,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import ReAnimated, { FadeInDown } from 'react-native-reanimated';
import {
  ArrowLeft,
  Search,
  X,
  Filter,
  Dumbbell,
  ChevronDown,
  ChevronUp,
  Zap,
  Target,
  Info,
  Hash,
} from 'lucide-react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import OptimizedFlatList from '../components/OptimizedFlatList';
import {
  Colors,
  Spacing,
  FontSize,
  FontWeight,
  BorderRadius,
  Shadows,
  Gradients,
} from '../constants/theme';
import { hapticLight } from '../lib/haptics';
import { MUSCLE_GROUPS, EQUIPMENT, DIFFICULTY, EXERCISES } from '../data/exerciseLibrary';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const DIFFICULTY_COLORS = {
  Beginner: '#00E676',
  Intermediate: '#FFB300',
  Advanced: '#FF5252',
};

const DIFFICULTY_BG = {
  Beginner: 'rgba(0, 230, 118, 0.15)',
  Intermediate: 'rgba(255, 179, 0, 0.15)',
  Advanced: 'rgba(255, 82, 82, 0.15)',
};

// Get muscle group info helper
function getMuscleGroup(id) {
  return MUSCLE_GROUPS.find((m) => m.id === id) || { name: id, color: Colors.textSecondary, emoji: '' };
}

// Exercise Card Component
function ExerciseCard({ exercise, index, expanded, onToggle }) {
  const muscleGroup = getMuscleGroup(exercise.muscle);
  const difficultyColor = DIFFICULTY_COLORS[exercise.difficulty] || Colors.textSecondary;
  const difficultyBg = DIFFICULTY_BG[exercise.difficulty] || 'rgba(255,255,255,0.1)';

  const handlePress = useCallback(async () => {
    await hapticLight();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onToggle(exercise.id);
  }, [exercise.id, onToggle]);

  return (
    <ReAnimated.View
      entering={FadeInDown.delay(Math.min(index * 50, 500)).springify().mass(0.5).damping(12)}
    >
      <Pressable onPress={handlePress}>
        <LinearGradient
          colors={expanded ? ['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.03)'] : Gradients.card}
          style={[
            styles.exerciseCard,
            expanded && { borderColor: muscleGroup.color + '40' },
          ]}
        >
          {/* Card Header */}
          <View style={styles.exerciseCardHeader}>
            <View style={styles.exerciseCardLeft}>
              <Text style={styles.exerciseEmoji}>{exercise.emoji}</Text>
              <View style={styles.exerciseNameContainer}>
                <Text style={styles.exerciseName} numberOfLines={1}>
                  {exercise.name}
                </Text>
                <View style={styles.exerciseBadgeRow}>
                  {/* Muscle group badge */}
                  <View style={[styles.muscleBadge, { backgroundColor: muscleGroup.color + '20' }]}>
                    <Text style={[styles.muscleBadgeText, { color: muscleGroup.color }]}>
                      {muscleGroup.name}
                    </Text>
                  </View>
                  {/* Secondary muscles */}
                  {exercise.secondary.slice(0, 2).map((sec) => {
                    const secGroup = getMuscleGroup(sec);
                    return (
                      <View
                        key={sec}
                        style={[styles.secondaryBadge, { backgroundColor: secGroup.color + '10' }]}
                      >
                        <Text style={[styles.secondaryBadgeText, { color: secGroup.color + 'CC' }]}>
                          {secGroup.name}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            </View>
            <View style={styles.exerciseCardRight}>
              {expanded ? (
                <ChevronUp size={18} color={Colors.textSecondary} />
              ) : (
                <ChevronDown size={18} color={Colors.textSecondary} />
              )}
            </View>
          </View>

          {/* Meta Row */}
          <View style={styles.exerciseMetaRow}>
            {/* Equipment badge */}
            <View style={styles.equipmentBadge}>
              <Dumbbell size={12} color={Colors.textSecondary} />
              <Text style={styles.equipmentBadgeText}>{exercise.equipment}</Text>
            </View>
            {/* Difficulty badge */}
            <View style={[styles.difficultyBadge, { backgroundColor: difficultyBg }]}>
              <Zap size={11} color={difficultyColor} />
              <Text style={[styles.difficultyBadgeText, { color: difficultyColor }]}>
                {exercise.difficulty}
              </Text>
            </View>
            {/* Sets x Reps */}
            <View style={styles.setsRepsBadge}>
              <Hash size={11} color={Colors.primary} />
              <Text style={styles.setsRepsText}>
                {exercise.sets} x {exercise.reps}
              </Text>
            </View>
          </View>

          {/* Expanded Content */}
          {expanded && (
            <View style={styles.expandedContent}>
              {/* Description */}
              <View style={styles.descriptionContainer}>
                <Info size={14} color={Colors.primary} />
                <Text style={styles.descriptionText}>{exercise.description}</Text>
              </View>

              {/* Tips */}
              <View style={styles.tipsContainer}>
                <Text style={styles.tipsTitle}>Tips</Text>
                {exercise.tips.map((tip, tipIndex) => (
                  <View key={tipIndex} style={styles.tipRow}>
                    <View style={[styles.tipBullet, { backgroundColor: muscleGroup.color }]} />
                    <Text style={styles.tipText}>{tip}</Text>
                  </View>
                ))}
              </View>

              {/* Recommended Sets/Reps */}
              <View style={styles.recommendedContainer}>
                <LinearGradient
                  colors={[muscleGroup.color + '15', muscleGroup.color + '05']}
                  style={styles.recommendedGradient}
                >
                  <View style={styles.recommendedItem}>
                    <Text style={styles.recommendedLabel}>Sets</Text>
                    <Text style={[styles.recommendedValue, { color: muscleGroup.color }]}>
                      {exercise.sets}
                    </Text>
                  </View>
                  <View style={styles.recommendedDivider} />
                  <View style={styles.recommendedItem}>
                    <Text style={styles.recommendedLabel}>Reps</Text>
                    <Text style={[styles.recommendedValue, { color: muscleGroup.color }]}>
                      {exercise.reps}
                    </Text>
                  </View>
                  <View style={styles.recommendedDivider} />
                  <View style={styles.recommendedItem}>
                    <Text style={styles.recommendedLabel}>Level</Text>
                    <Text style={[styles.recommendedValue, { color: difficultyColor }]}>
                      {exercise.difficulty}
                    </Text>
                  </View>
                </LinearGradient>
              </View>
            </View>
          )}
        </LinearGradient>
      </Pressable>
    </ReAnimated.View>
  );
}

// Main Component
export default function ExerciseLibraryScreen() {
  const router = useRouter();
  const searchInputRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState(null);
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState(null);
  const [expandedExercise, setExpandedExercise] = useState(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Filter exercises
  const filteredExercises = useMemo(() => {
    let results = EXERCISES;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      results = results.filter(
        (ex) =>
          ex.name.toLowerCase().includes(query) ||
          ex.muscle.toLowerCase().includes(query) ||
          ex.equipment.toLowerCase().includes(query) ||
          ex.description.toLowerCase().includes(query) ||
          ex.secondary.some((s) => s.toLowerCase().includes(query))
      );
    }

    // Muscle group filter
    if (selectedMuscle) {
      results = results.filter(
        (ex) => ex.muscle === selectedMuscle || ex.secondary.includes(selectedMuscle)
      );
    }

    // Equipment filter
    if (selectedEquipment) {
      results = results.filter((ex) => ex.equipment === selectedEquipment);
    }

    // Difficulty filter
    if (selectedDifficulty) {
      results = results.filter((ex) => ex.difficulty === selectedDifficulty);
    }

    return results;
  }, [searchQuery, selectedMuscle, selectedEquipment, selectedDifficulty]);

  const handleToggleExpand = useCallback((exerciseId) => {
    setExpandedExercise((prev) => (prev === exerciseId ? null : exerciseId));
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    searchInputRef.current?.blur();
  }, []);

  const handleMuscleFilter = useCallback(async (muscleId) => {
    await hapticLight();
    setSelectedMuscle((prev) => (prev === muscleId ? null : muscleId));
  }, []);

  const handleEquipmentFilter = useCallback(async (equipment) => {
    await hapticLight();
    setSelectedEquipment((prev) => (prev === equipment ? null : equipment));
  }, []);

  const handleDifficultyFilter = useCallback(async (difficulty) => {
    await hapticLight();
    setSelectedDifficulty((prev) => (prev === difficulty ? null : difficulty));
  }, []);

  const hasActiveFilters = selectedMuscle || selectedEquipment || selectedDifficulty || searchQuery.trim();

  const handleClearAllFilters = useCallback(async () => {
    await hapticLight();
    setSelectedMuscle(null);
    setSelectedEquipment(null);
    setSelectedDifficulty(null);
    setSearchQuery('');
  }, []);

  const renderExercise = useCallback(
    ({ item, index }) => (
      <ExerciseCard
        exercise={item}
        index={index}
        expanded={expandedExercise === item.id}
        onToggle={handleToggleExpand}
      />
    ),
    [expandedExercise, handleToggleExpand]
  );

  const keyExtractor = useCallback((item) => item.id, []);

  const ListHeader = useMemo(
    () => (
      <View>
        {/* Search Bar */}
        <ReAnimated.View entering={FadeInDown.delay(100).springify().mass(0.5).damping(10)}>
          <View style={[styles.searchContainer, isSearchFocused && styles.searchContainerFocused]}>
            <Search size={18} color={isSearchFocused ? Colors.primary : Colors.textTertiary} />
            <TextInput
              ref={searchInputRef}
              style={styles.searchInput}
              placeholder="Search exercises, muscles, equipment..."
              placeholderTextColor={Colors.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              returnKeyType="search"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={handleClearSearch} hitSlop={8}>
                <X size={18} color={Colors.textSecondary} />
              </Pressable>
            )}
          </View>
        </ReAnimated.View>

        {/* Muscle Group Filters */}
        <ReAnimated.View entering={FadeInDown.delay(150).springify().mass(0.5).damping(10)}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScrollContent}
            style={styles.filterScroll}
          >
            {MUSCLE_GROUPS.map((muscle) => {
              const isActive = selectedMuscle === muscle.id;
              return (
                <Pressable
                  key={muscle.id}
                  style={[
                    styles.muscleFilterPill,
                    isActive && { backgroundColor: muscle.color + '25', borderColor: muscle.color + '60' },
                  ]}
                  onPress={() => handleMuscleFilter(muscle.id)}
                >
                  <Text style={styles.muscleFilterEmoji}>{muscle.emoji}</Text>
                  <Text
                    style={[
                      styles.muscleFilterText,
                      isActive && { color: muscle.color },
                    ]}
                  >
                    {muscle.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </ReAnimated.View>

        {/* Equipment Filters */}
        <ReAnimated.View entering={FadeInDown.delay(200).springify().mass(0.5).damping(10)}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScrollContent}
            style={styles.equipmentFilterScroll}
          >
            {EQUIPMENT.map((equip) => {
              const isActive = selectedEquipment === equip;
              return (
                <Pressable
                  key={equip}
                  style={[
                    styles.equipmentFilterPill,
                    isActive && styles.equipmentFilterPillActive,
                  ]}
                  onPress={() => handleEquipmentFilter(equip)}
                >
                  <Text
                    style={[
                      styles.equipmentFilterText,
                      isActive && styles.equipmentFilterTextActive,
                    ]}
                  >
                    {equip}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </ReAnimated.View>

        {/* Difficulty Filters */}
        <ReAnimated.View entering={FadeInDown.delay(250).springify().mass(0.5).damping(10)}>
          <View style={styles.difficultyFilterRow}>
            {DIFFICULTY.map((diff) => {
              const isActive = selectedDifficulty === diff;
              const color = DIFFICULTY_COLORS[diff];
              return (
                <Pressable
                  key={diff}
                  style={[
                    styles.difficultyFilterPill,
                    isActive && { backgroundColor: color + '20', borderColor: color + '50' },
                  ]}
                  onPress={() => handleDifficultyFilter(diff)}
                >
                  <Zap size={12} color={isActive ? color : Colors.textTertiary} />
                  <Text
                    style={[
                      styles.difficultyFilterText,
                      isActive && { color: color },
                    ]}
                  >
                    {diff}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ReAnimated.View>

        {/* Stats Row */}
        <ReAnimated.View entering={FadeInDown.delay(300).springify().mass(0.5).damping(10)}>
          <View style={styles.statsRow}>
            <View style={styles.statsLeft}>
              <Target size={14} color={Colors.primary} />
              <Text style={styles.statsText}>
                {filteredExercises.length} exercise{filteredExercises.length !== 1 ? 's' : ''}
              </Text>
            </View>
            {hasActiveFilters && (
              <Pressable style={styles.clearFiltersButton} onPress={handleClearAllFilters}>
                <X size={14} color={Colors.secondary} />
                <Text style={styles.clearFiltersText}>Clear filters</Text>
              </Pressable>
            )}
          </View>
        </ReAnimated.View>
      </View>
    ),
    [
      searchQuery,
      isSearchFocused,
      selectedMuscle,
      selectedEquipment,
      selectedDifficulty,
      filteredExercises.length,
      hasActiveFilters,
      handleMuscleFilter,
      handleEquipmentFilter,
      handleDifficultyFilter,
      handleClearSearch,
      handleClearAllFilters,
    ]
  );

  const ListEmpty = useMemo(
    () => (
      <ReAnimated.View
        entering={FadeInDown.delay(100).springify().mass(0.5).damping(10)}
        style={styles.emptyContainer}
      >
        <Text style={styles.emptyEmoji}>🔍</Text>
        <Text style={styles.emptyTitle}>No exercises found</Text>
        <Text style={styles.emptySubtitle}>
          Try a different search term or adjust your filters
        </Text>
        {hasActiveFilters && (
          <Pressable style={styles.emptyResetButton} onPress={handleClearAllFilters}>
            <Text style={styles.emptyResetText}>Clear all filters</Text>
          </Pressable>
        )}
      </ReAnimated.View>
    ),
    [hasActiveFilters, handleClearAllFilters]
  );

  return (
    <ScreenWrapper>
      {/* Header */}
      <ReAnimated.View
        entering={FadeInDown.delay(0).springify().mass(0.5).damping(10)}
        style={styles.header}
      >
        <Pressable
          style={styles.backButton}
          onPress={async () => {
            await hapticLight();
            router.back();
          }}
        >
          <ArrowLeft size={22} color={Colors.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Exercise Library</Text>
          <Text style={styles.headerSubtitle}>{EXERCISES.length} exercises</Text>
        </View>
        <View style={styles.headerRight}>
          <Dumbbell size={22} color={Colors.secondary} />
        </View>
      </ReAnimated.View>

      {/* Main List */}
      <OptimizedFlatList
        data={filteredExercises}
        renderItem={renderExercise}
        keyExtractor={keyExtractor}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        removeClippedSubviews={Platform.OS === 'android'}
        maxToRenderPerBatch={15}
        windowSize={10}
        initialNumToRender={10}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.md,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surfaceGlass,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
  },
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  headerSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  headerRight: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.secondarySoft,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // List
  listContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: 120,
  },

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceGlass,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  searchContainerFocused: {
    borderColor: Colors.primary + '50',
    backgroundColor: Colors.surfaceGlassLight,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.text,
    paddingVertical: Platform.OS === 'ios' ? Spacing.xs : 0,
  },

  // Muscle Group Filters
  filterScroll: {
    marginBottom: Spacing.sm,
  },
  filterScrollContent: {
    gap: Spacing.sm,
    paddingRight: Spacing.md,
  },
  muscleFilterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceGlass,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  muscleFilterEmoji: {
    fontSize: 14,
  },
  muscleFilterText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
  },

  // Equipment Filters
  equipmentFilterScroll: {
    marginBottom: Spacing.sm,
  },
  equipmentFilterPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceGlass,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  equipmentFilterPillActive: {
    backgroundColor: Colors.primary + '20',
    borderColor: Colors.primary + '50',
  },
  equipmentFilterText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
  },
  equipmentFilterTextActive: {
    color: Colors.primary,
  },

  // Difficulty Filters
  difficultyFilterRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  difficultyFilterPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceGlass,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  difficultyFilterText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  statsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  statsText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  clearFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.secondarySoft,
  },
  clearFiltersText: {
    fontSize: FontSize.sm,
    color: Colors.secondary,
    fontWeight: FontWeight.medium,
  },

  // Exercise Card
  exerciseCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  exerciseCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  exerciseCardLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  exerciseEmoji: {
    fontSize: 24,
    width: 36,
    textAlign: 'center',
  },
  exerciseNameContainer: {
    flex: 1,
  },
  exerciseName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginBottom: 4,
  },
  exerciseBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  muscleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  muscleBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  secondaryBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  secondaryBadgeText: {
    fontSize: 10,
    fontWeight: FontWeight.medium,
  },
  exerciseCardRight: {
    marginLeft: Spacing.sm,
  },

  // Meta Row
  exerciseMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    paddingLeft: 48,
  },
  equipmentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surfaceElevated,
  },
  equipmentBadgeText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  difficultyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
  },
  difficultyBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  setsRepsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.primarySoft,
  },
  setsRepsText: {
    fontSize: FontSize.xs,
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
  },

  // Expanded Content
  expandedContent: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  descriptionContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  descriptionText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  tipsContainer: {
    marginBottom: Spacing.md,
  },
  tipsTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: 6,
  },
  tipBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
  },
  tipText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  recommendedContainer: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  recommendedGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  recommendedItem: {
    flex: 1,
    alignItems: 'center',
  },
  recommendedLabel: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginBottom: 4,
  },
  recommendedValue: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  recommendedDivider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.border,
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
    paddingHorizontal: Spacing.lg,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyResetButton: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.secondarySoft,
  },
  emptyResetText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.secondary,
  },
});

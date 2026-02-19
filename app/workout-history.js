import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ScrollView,
  Alert,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import ReAnimated, { FadeInDown } from 'react-native-reanimated';
import {
  ArrowLeft,
  Dumbbell,
  Clock,
  Flame,
  Trophy,
  ChevronDown,
  Calendar,
  BarChart3,
  Trash2,
  ChevronUp,
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
import useWorkoutHistory from '../hooks/useWorkoutHistory';
import usePersonalRecords from '../hooks/usePersonalRecords';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const FILTER_TABS = [
  { id: 'all', label: 'All' },
  { id: 'strength', label: 'Strength' },
  { id: 'hiit', label: 'HIIT' },
  { id: 'yoga', label: 'Yoga' },
  { id: 'cardio', label: 'Cardio' },
  { id: 'hypertrophy', label: 'Hypertrophy' },
  { id: 'endurance', label: 'Endurance' },
];

// Format date to "Mon, Feb 10" style
function formatDate(isoString) {
  const date = new Date(isoString);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
}

// Format minutes to readable duration
function formatDuration(mins) {
  if (!mins) return '0m';
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// Format total duration for stats
function formatTotalDuration(mins) {
  if (!mins) return '0';
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// Get a display-friendly type label
function getTypeLabel(type) {
  if (!type) return 'Workout';
  const labels = {
    strength: 'Strength',
    hiit: 'HIIT',
    yoga: 'Yoga',
    cardio: 'Cardio',
    hypertrophy: 'Hypertrophy',
    endurance: 'Endurance',
    flexibility: 'Flexibility',
  };
  return labels[type.toLowerCase()] || type.charAt(0).toUpperCase() + type.slice(1);
}

// Get type badge color
function getTypeColor(type) {
  const colors = {
    strength: '#4ECDC4',
    hiit: '#F59E0B',
    yoga: '#A78BFA',
    cardio: '#06B6D4',
    hypertrophy: '#FF6B6B',
    endurance: '#06B6D4',
    flexibility: '#EC4899',
  };
  return colors[type?.toLowerCase()] || Colors.primary;
}

// Stats Summary Card
function StatsSummary({ stats }) {
  const items = [
    { label: 'Workouts', value: stats.totalWorkouts.toString() },
    { label: 'Duration', value: formatTotalDuration(stats.totalDuration) },
    { label: 'Calories', value: stats.totalCalories.toLocaleString() },
    { label: 'This Week', value: stats.thisWeekCount.toString() },
  ];

  return (
    <ReAnimated.View entering={FadeInDown.delay(100).springify().mass(0.5).damping(10)}>
      <View style={statsStyles.card}>
        <LinearGradient
          colors={Gradients.card}
          style={statsStyles.gradient}
        >
          {items.map((item, index) => (
            <React.Fragment key={item.label}>
              {index > 0 && <View style={statsStyles.divider} />}
              <View style={statsStyles.item}>
                <Text style={statsStyles.value}>{item.value}</Text>
                <Text style={statsStyles.label}>{item.label}</Text>
              </View>
            </React.Fragment>
          ))}
        </LinearGradient>
      </View>
    </ReAnimated.View>
  );
}

const statsStyles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    ...Shadows.card,
  },
  gradient: {
    flexDirection: 'row',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
  item: {
    flex: 1,
    alignItems: 'center',
  },
  value: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  label: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignSelf: 'center',
  },
});

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

// Workout Card (expandable)
function WorkoutCard({ workout, personalRecords, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const typeColor = getTypeColor(workout.type);

  // Check if any exercise in this workout has a PR
  const hasPR = useMemo(() => {
    return (workout.exercises || []).some((ex) => {
      const record = personalRecords[ex.name];
      return record && record.date === new Date(workout.date).toISOString().split('T')[0];
    });
  }, [workout, personalRecords]);

  const exerciseCount = (workout.exercises || []).length;

  const handlePress = () => {
    hapticLight();
    setExpanded(!expanded);
  };

  const handleDelete = () => {
    hapticLight();
    Alert.alert(
      'Delete Workout',
      `Remove "${workout.name}" from your history?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete(workout.id),
        },
      ]
    );
  };

  return (
    <View style={cardStyles.container}>
      <Pressable onPress={handlePress} style={cardStyles.main}>
        {/* Top row: Emoji + Name + Type badge */}
        <View style={cardStyles.topRow}>
          <Text style={cardStyles.emoji}>{workout.emoji || '💪'}</Text>
          <View style={cardStyles.nameContainer}>
            <View style={cardStyles.nameRow}>
              <Text style={cardStyles.name} numberOfLines={1}>
                {workout.name}
              </Text>
              {hasPR && (
                <Trophy size={14} color={Colors.gold} style={{ marginLeft: 4 }} />
              )}
            </View>
            <View style={cardStyles.metaRow}>
              <Calendar size={12} color={Colors.textTertiary} />
              <Text style={cardStyles.date}>{formatDate(workout.date)}</Text>
            </View>
          </View>
          <View style={[cardStyles.typeBadge, { backgroundColor: typeColor + '20' }]}>
            <Text style={[cardStyles.typeText, { color: typeColor }]}>
              {getTypeLabel(workout.type)}
            </Text>
          </View>
        </View>

        {/* Bottom row: Duration + Calories + Exercise count */}
        <View style={cardStyles.bottomRow}>
          <View style={cardStyles.stat}>
            <Clock size={14} color={Colors.primary} />
            <Text style={cardStyles.statText}>{formatDuration(workout.duration)}</Text>
          </View>
          <View style={cardStyles.stat}>
            <Flame size={14} color={Colors.secondary} />
            <Text style={cardStyles.statText}>{workout.calories} cal</Text>
          </View>
          <View style={cardStyles.stat}>
            <Dumbbell size={14} color={Colors.textSecondary} />
            <Text style={cardStyles.statText}>
              {exerciseCount} exercise{exerciseCount !== 1 ? 's' : ''}
            </Text>
          </View>
          <View style={{ marginLeft: 'auto' }}>
            {expanded ? (
              <ChevronUp size={18} color={Colors.textTertiary} />
            ) : (
              <ChevronDown size={18} color={Colors.textTertiary} />
            )}
          </View>
        </View>
      </Pressable>

      {/* Expanded: Exercise details */}
      {expanded && (
        <View style={cardStyles.expandedSection}>
          <View style={cardStyles.divider} />

          {(workout.exercises || []).length > 0 ? (
            (workout.exercises || []).map((ex, i) => {
              const record = personalRecords[ex.name];
              const isPR =
                record &&
                record.date ===
                  new Date(workout.date).toISOString().split('T')[0];

              return (
                <View key={i} style={cardStyles.exerciseRow}>
                  <View style={cardStyles.exerciseIndex}>
                    <Text style={cardStyles.exerciseIndexText}>{i + 1}</Text>
                  </View>
                  <View style={cardStyles.exerciseInfo}>
                    <View style={cardStyles.exerciseNameRow}>
                      <Text style={cardStyles.exerciseName}>{ex.name}</Text>
                      {isPR && (
                        <Trophy size={12} color={Colors.gold} />
                      )}
                    </View>
                    {(ex.sets || []).length > 0 && (
                      <Text style={cardStyles.exerciseSets}>
                        {ex.sets.map((s, si) => {
                          if (s.weight > 0) {
                            return `${s.weight}lb x ${s.reps}`;
                          }
                          return `${s.reps} reps`;
                        }).join('  |  ')}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })
          ) : (
            <Text style={cardStyles.noExercises}>No exercise details recorded</Text>
          )}

          {workout.notes ? (
            <View style={cardStyles.notesContainer}>
              <Text style={cardStyles.notesLabel}>Coach Notes</Text>
              <Text style={cardStyles.notesText}>{workout.notes}</Text>
            </View>
          ) : null}

          {/* Delete button */}
          <Pressable style={cardStyles.deleteButton} onPress={handleDelete}>
            <Trash2 size={14} color={Colors.error} />
            <Text style={cardStyles.deleteText}>Remove</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const cardStyles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: BorderRadius.xl,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    overflow: 'hidden',
  },
  main: {
    padding: Spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  emoji: {
    fontSize: 32,
    marginRight: Spacing.sm,
  },
  nameContainer: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    flexShrink: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  date: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },
  typeBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    marginLeft: Spacing.sm,
  },
  typeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
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
  expandedSection: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: Spacing.sm,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: Spacing.xs,
    gap: Spacing.sm,
  },
  exerciseIndex: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  exerciseIndexText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.textSecondary,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  exerciseName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.text,
  },
  exerciseSets: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  noExercises: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    fontStyle: 'italic',
    paddingVertical: Spacing.sm,
  },
  notesContainer: {
    marginTop: Spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    borderLeftWidth: 2,
    borderLeftColor: Colors.primary,
  },
  notesLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
    marginBottom: 2,
  },
  notesText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.errorSoft,
  },
  deleteText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.error,
  },
});

// Personal Records Section (collapsible)
function PersonalRecordsSection({ records }) {
  const [expanded, setExpanded] = useState(false);

  // Get top 5 PRs sorted by date (most recent first)
  const topPRs = useMemo(() => {
    return Object.entries(records)
      .filter(([, data]) => data.maxWeight > 0 || data.maxReps > 0)
      .sort((a, b) => {
        const dateA = a[1].date || '';
        const dateB = b[1].date || '';
        return dateB.localeCompare(dateA);
      })
      .slice(0, 5)
      .map(([name, data]) => ({
        name,
        maxWeight: data.maxWeight,
        maxReps: data.maxReps,
        maxVolume: data.maxVolume,
        date: data.date,
      }));
  }, [records]);

  if (topPRs.length === 0) return null;

  return (
    <ReAnimated.View entering={FadeInDown.delay(300).springify().mass(0.5).damping(10)}>
      <View style={prStyles.container}>
        <Pressable
          style={prStyles.header}
          onPress={() => {
            hapticLight();
            setExpanded(!expanded);
          }}
        >
          <View style={prStyles.headerLeft}>
            <View style={prStyles.iconWrap}>
              <Trophy size={18} color={Colors.gold} />
            </View>
            <Text style={prStyles.title}>Personal Records</Text>
            <View style={prStyles.countBadge}>
              <Text style={prStyles.countText}>{topPRs.length}</Text>
            </View>
          </View>
          {expanded ? (
            <ChevronUp size={20} color={Colors.textSecondary} />
          ) : (
            <ChevronDown size={20} color={Colors.textSecondary} />
          )}
        </Pressable>

        {expanded && (
          <View style={prStyles.list}>
            {topPRs.map((pr, index) => (
              <View key={pr.name} style={prStyles.item}>
                <View style={prStyles.itemLeft}>
                  <Text style={prStyles.itemRank}>#{index + 1}</Text>
                  <View>
                    <Text style={prStyles.itemName}>{pr.name}</Text>
                    {pr.date && (
                      <Text style={prStyles.itemDate}>
                        {formatDate(pr.date + 'T00:00:00')}
                      </Text>
                    )}
                  </View>
                </View>
                <View style={prStyles.itemRight}>
                  {pr.maxWeight > 0 && (
                    <Text style={prStyles.itemValue}>{pr.maxWeight} lb</Text>
                  )}
                  {pr.maxReps > 0 && (
                    <Text style={prStyles.itemReps}>{pr.maxReps} reps</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </ReAnimated.View>
  );
}

const prStyles = StyleSheet.create({
  container: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
    backgroundColor: 'rgba(255, 215, 0, 0.04)',
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.15)',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.goldSoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  countBadge: {
    backgroundColor: Colors.goldSoft,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  countText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.gold,
  },
  list: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  itemRank: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.gold,
    width: 24,
  },
  itemName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.text,
  },
  itemDate: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: 1,
  },
  itemRight: {
    alignItems: 'flex-end',
  },
  itemValue: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.gold,
  },
  itemReps: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 1,
  },
});

// Empty State
function EmptyState({ router }) {
  return (
    <View style={emptyStyles.container}>
      <View style={emptyStyles.iconCircle}>
        <Dumbbell size={48} color={Colors.textTertiary} />
      </View>
      <Text style={emptyStyles.title}>No workouts yet</Text>
      <Text style={emptyStyles.subtitle}>
        Complete your first AI-powered workout to start tracking your progress
      </Text>
      <Pressable
        style={emptyStyles.button}
        onPress={() => {
          hapticLight();
          router.push('/generate-workout');
        }}
      >
        <LinearGradient
          colors={Gradients.primary}
          style={emptyStyles.buttonGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Text style={emptyStyles.buttonText}>Generate Your First AI Workout</Text>
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
    paddingVertical: Spacing.md + 2,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: '#fff',
  },
});

// Main Screen
export default function WorkoutHistoryScreen() {
  const router = useRouter();
  const {
    workouts,
    deleteWorkout,
    getWorkoutsByType,
    getStats,
    isLoading,
  } = useWorkoutHistory();
  const { records } = usePersonalRecords();

  const [activeFilter, setActiveFilter] = useState('all');

  const stats = useMemo(() => getStats(), [getStats]);
  const filteredWorkouts = useMemo(
    () => getWorkoutsByType(activeFilter),
    [getWorkoutsByType, activeFilter]
  );

  const handleDelete = useCallback(
    async (id) => {
      await deleteWorkout(id);
    },
    [deleteWorkout]
  );

  const renderWorkoutCard = useCallback(
    ({ item, index }) => (
      <ReAnimated.View entering={FadeInDown.delay(index * 50).springify().mass(0.5).damping(10)}>
        <WorkoutCard
          workout={item}
          personalRecords={records}
          onDelete={handleDelete}
        />
      </ReAnimated.View>
    ),
    [records, handleDelete]
  );

  const keyExtractor = useCallback((item) => item.id, []);

  const ListHeader = useMemo(
    () => (
      <>
        {/* Stats Summary */}
        <StatsSummary stats={stats} />

        {/* Filter Tabs */}
        <FilterTabs activeFilter={activeFilter} onFilterChange={setActiveFilter} />

        {/* Personal Records (at top for visibility) */}
        {Object.keys(records).length > 0 && (
          <PersonalRecordsSection records={records} />
        )}
      </>
    ),
    [stats, activeFilter, records]
  );

  if (isLoading) {
    return (
      <ScreenWrapper>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading workout history...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      {/* Header */}
      <ReAnimated.View entering={FadeInDown.delay(0).springify().mass(0.5).damping(10)}>
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
          <Text style={styles.title}>Workouts</Text>
          <View style={styles.headerRight}>
            <BarChart3 size={22} color={Colors.primary} />
          </View>
        </View>
      </ReAnimated.View>

      {/* Content */}
      {workouts.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.emptyScrollContent}
          showsVerticalScrollIndicator={false}
        >
          <StatsSummary stats={stats} />
          <EmptyState router={router} />
        </ScrollView>
      ) : (
        <OptimizedFlatList
          data={filteredWorkouts}
          renderItem={renderWorkoutCard}
          keyExtractor={keyExtractor}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={
            <View style={styles.noResultsContainer}>
              <Text style={styles.noResultsText}>
                No {getTypeLabel(activeFilter).toLowerCase()} workouts found
              </Text>
            </View>
          }
          ListFooterComponent={<View style={styles.bottomSpacer} />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      )}
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
  headerRight: {
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

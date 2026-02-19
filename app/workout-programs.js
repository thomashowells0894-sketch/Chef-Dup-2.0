import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  FlatList,
  Modal,
  Alert,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import ReAnimated, { FadeInDown } from 'react-native-reanimated';
import {
  ArrowLeft,
  CalendarDays,
  Play,
  Clock,
  Dumbbell,
  Target,
  ChevronDown,
  ChevronRight,
  Flame,
  Zap,
  Check,
  X,
  Trophy,
  BarChart3,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import {
  Colors,
  Spacing,
  FontSize,
  FontWeight,
  BorderRadius,
  Shadows,
  Gradients,
} from '../constants/theme';
import { hapticLight, hapticSuccess } from '../lib/haptics';
import useWorkoutPrograms from '../hooks/useWorkoutPrograms';
import { WORKOUT_PROGRAMS, getProgramById, getTotalDays } from '../data/workoutPrograms';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ---------- Filter configuration ----------
const FILTER_TABS = [
  { id: 'all', label: 'All' },
  { id: 'beginner', label: 'Beginner' },
  { id: 'intermediate', label: 'Intermediate' },
  { id: 'strength', label: 'Strength' },
  { id: 'fat_loss', label: 'Fat Loss' },
  { id: 'flexibility', label: 'Flexibility' },
];

// Goal label + icon helpers
const GOAL_META = {
  general_fitness: { label: 'General Fitness', color: '#00E676' },
  muscle_building: { label: 'Muscle Building', color: '#FF6B35' },
  fat_loss: { label: 'Fat Loss', color: '#FF5252' },
  strength: { label: 'Strength', color: '#00D4FF' },
  flexibility: { label: 'Flexibility', color: '#A78BFA' },
};

const LEVEL_META = {
  beginner: { label: 'Beginner', color: '#00E676' },
  intermediate: { label: 'Intermediate', color: '#FFB300' },
  advanced: { label: 'Advanced', color: '#FF5252' },
};

// ---------- Sub-components ----------

/** Small pill badge */
function Badge({ label, color }) {
  return (
    <View style={[styles.badge, { backgroundColor: color + '20' }]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

/** Filter pill row */
function FilterRow({ activeFilter, onSelect }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filterRow}
    >
      {FILTER_TABS.map((tab) => {
        const isActive = activeFilter === tab.id;
        return (
          <Pressable
            key={tab.id}
            style={[styles.filterPill, isActive && styles.filterPillActive]}
            onPress={() => onSelect(tab.id)}
          >
            <Text style={[styles.filterPillText, isActive && styles.filterPillTextActive]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** Active program card shown at the top when a program is in progress */
function ActiveProgramCard({ activeProgram, onContinue, onAbandon }) {
  const program = getProgramById(activeProgram.programId);
  if (!program) return null;

  const totalDays = getTotalDays(program);
  const completedCount = Object.keys(activeProgram.completedDays).length;
  const percentage = totalDays > 0 ? Math.round((completedCount / totalDays) * 100) : 0;
  const isComplete = completedCount >= totalDays;

  // Determine current workout info
  const weekData = program.weeks[activeProgram.currentWeek - 1];
  const dayData = weekData?.days?.[activeProgram.currentDay - 1];
  const currentLabel = dayData ? `Week ${activeProgram.currentWeek}, Day ${activeProgram.currentDay} - ${dayData.name}` : 'Program Complete';

  return (
    <ReAnimated.View entering={FadeInDown.delay(100).springify().mass(0.5).damping(10)}>
      <View style={[styles.activeProgramCard, { borderColor: program.color + '40' }]}>
        <LinearGradient
          colors={[program.color + '18', program.color + '06']}
          style={styles.activeProgramGradient}
        >
          {/* Header */}
          <View style={styles.activeProgramHeader}>
            <Text style={styles.activeProgramEmoji}>{program.emoji}</Text>
            <View style={styles.activeProgramInfo}>
              <Text style={styles.activeProgramName}>{program.name}</Text>
              <Text style={styles.activeProgramMeta}>
                Week {activeProgram.currentWeek} of {program.durationWeeks}
              </Text>
            </View>
            {isComplete && (
              <View style={styles.completeBadgeSmall}>
                <Trophy size={14} color={Colors.gold} />
              </View>
            )}
          </View>

          {/* Progress bar */}
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarOuter}>
              <View
                style={[
                  styles.progressBarInner,
                  { width: `${percentage}%`, backgroundColor: program.color },
                ]}
              />
            </View>
            <Text style={styles.progressText}>{percentage}% ({completedCount}/{totalDays} days)</Text>
          </View>

          {/* Continue / Completed button */}
          {!isComplete ? (
            <Pressable
              style={[styles.continueButton, { backgroundColor: program.color }]}
              onPress={onContinue}
            >
              <Play size={16} color={Colors.background} />
              <Text style={styles.continueButtonText} numberOfLines={1}>
                Continue: {currentLabel}
              </Text>
            </Pressable>
          ) : (
            <View style={styles.completedBanner}>
              <Trophy size={18} color={Colors.gold} />
              <Text style={styles.completedBannerText}>Program Completed!</Text>
            </View>
          )}

          {/* Abandon */}
          <Pressable
            style={styles.abandonButton}
            onPress={onAbandon}
          >
            <X size={14} color={Colors.textTertiary} />
            <Text style={styles.abandonButtonText}>
              {isComplete ? 'Clear Program' : 'Abandon Program'}
            </Text>
          </Pressable>
        </LinearGradient>
      </View>
    </ReAnimated.View>
  );
}

/** Individual program card in the browser list */
function ProgramCard({ program, index, isCurrentProgram, onPress, onStart }) {
  const totalDays = getTotalDays(program);
  const goalMeta = GOAL_META[program.goal] || { label: program.goal, color: Colors.primary };
  const levelMeta = LEVEL_META[program.level] || { label: program.level, color: Colors.primary };

  return (
    <ReAnimated.View entering={FadeInDown.delay(150 + index * 60).springify().mass(0.5).damping(10)}>
      <Pressable
        style={[styles.programCard, { borderColor: program.color + '25' }]}
        onPress={onPress}
      >
        <LinearGradient
          colors={[program.color + '10', 'transparent']}
          style={styles.programCardGradient}
        >
          {/* Top row: emoji + name + level badge */}
          <View style={styles.programCardHeader}>
            <Text style={styles.programCardEmoji}>{program.emoji}</Text>
            <View style={styles.programCardTitleArea}>
              <Text style={styles.programCardName}>{program.name}</Text>
              <Badge label={levelMeta.label} color={levelMeta.color} />
            </View>
          </View>

          {/* Description */}
          <Text style={styles.programCardDesc} numberOfLines={2}>
            {program.description}
          </Text>

          {/* Meta badges */}
          <View style={styles.programCardMeta}>
            <View style={styles.metaItem}>
              <CalendarDays size={13} color={Colors.textSecondary} />
              <Text style={styles.metaText}>{program.durationWeeks} weeks</Text>
            </View>
            <View style={styles.metaItem}>
              <Dumbbell size={13} color={Colors.textSecondary} />
              <Text style={styles.metaText}>{program.daysPerWeek}x/week</Text>
            </View>
            <View style={styles.metaItem}>
              <Target size={13} color={goalMeta.color} />
              <Text style={[styles.metaText, { color: goalMeta.color }]}>{goalMeta.label}</Text>
            </View>
          </View>

          {/* Start / Active button */}
          {isCurrentProgram ? (
            <View style={[styles.activeIndicator, { backgroundColor: program.color + '20' }]}>
              <Zap size={14} color={program.color} />
              <Text style={[styles.activeIndicatorText, { color: program.color }]}>Currently Active</Text>
            </View>
          ) : (
            <Pressable
              style={styles.startButton}
              onPress={(e) => {
                e.stopPropagation?.();
                onStart();
              }}
            >
              <LinearGradient
                colors={[program.color, program.color + 'CC']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.startButtonGradient}
              >
                <Play size={14} color={Colors.background} />
                <Text style={styles.startButtonText}>Start Program</Text>
              </LinearGradient>
            </Pressable>
          )}
        </LinearGradient>
      </Pressable>
    </ReAnimated.View>
  );
}

/** Detail modal for expanded program view */
function ProgramDetailModal({ visible, program, activeProgram, isDayCompleted, onClose, onStart, onCompleteDay }) {
  const scrollRef = useRef(null);
  if (!program) return null;

  const totalDays = getTotalDays(program);
  const goalMeta = GOAL_META[program.goal] || { label: program.goal, color: Colors.primary };
  const levelMeta = LEVEL_META[program.level] || { label: program.level, color: Colors.primary };
  const isCurrentProgram = activeProgram?.programId === program.id;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <BlurView intensity={40} tint="dark" style={styles.modalOverlay}>
        <View style={styles.detailModal}>
          <LinearGradient
            colors={['#16161A', '#0E0E12']}
            style={styles.detailModalContent}
          >
            {/* Modal handle */}
            <View style={styles.modalHandle} />

            {/* Close button */}
            <Pressable style={styles.modalCloseButton} onPress={onClose}>
              <X size={22} color={Colors.textSecondary} />
            </Pressable>

            <ScrollView
              ref={scrollRef}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.detailScrollContent}
            >
              {/* Header */}
              <View style={styles.detailHeader}>
                <Text style={styles.detailEmoji}>{program.emoji}</Text>
                <Text style={styles.detailName}>{program.name}</Text>
                <Text style={styles.detailDesc}>{program.description}</Text>

                {/* Stats row */}
                <View style={styles.detailStats}>
                  <View style={styles.detailStat}>
                    <Text style={[styles.detailStatValue, { color: program.color }]}>{program.durationWeeks}</Text>
                    <Text style={styles.detailStatLabel}>Weeks</Text>
                  </View>
                  <View style={styles.detailStatDivider} />
                  <View style={styles.detailStat}>
                    <Text style={[styles.detailStatValue, { color: program.color }]}>{program.daysPerWeek}</Text>
                    <Text style={styles.detailStatLabel}>Days/Week</Text>
                  </View>
                  <View style={styles.detailStatDivider} />
                  <View style={styles.detailStat}>
                    <Text style={[styles.detailStatValue, { color: program.color }]}>{totalDays}</Text>
                    <Text style={styles.detailStatLabel}>Total Sessions</Text>
                  </View>
                </View>

                {/* Badges */}
                <View style={styles.detailBadges}>
                  <Badge label={levelMeta.label} color={levelMeta.color} />
                  <Badge label={goalMeta.label} color={goalMeta.color} />
                </View>
              </View>

              {/* Week-by-week schedule */}
              {program.weeks.map((weekData) => (
                <View key={weekData.week} style={styles.weekSection}>
                  {/* Week header */}
                  <View style={styles.weekHeader}>
                    <View style={[styles.weekNumber, { backgroundColor: program.color + '20' }]}>
                      <Text style={[styles.weekNumberText, { color: program.color }]}>W{weekData.week}</Text>
                    </View>
                    <View style={styles.weekHeaderInfo}>
                      <Text style={styles.weekTitle}>Week {weekData.week}</Text>
                      <Text style={styles.weekTheme}>{weekData.theme}</Text>
                    </View>
                  </View>

                  {/* Days */}
                  {weekData.days.map((dayData) => {
                    const completed = isCurrentProgram && isDayCompleted(weekData.week, dayData.day);
                    const isCurrent = isCurrentProgram &&
                      activeProgram.currentWeek === weekData.week &&
                      activeProgram.currentDay === dayData.day &&
                      !completed;

                    return (
                      <View
                        key={`${weekData.week}-${dayData.day}`}
                        style={[
                          styles.dayCard,
                          completed && styles.dayCardCompleted,
                          isCurrent && { borderColor: program.color + '50' },
                        ]}
                      >
                        {/* Day header */}
                        <Pressable
                          style={styles.dayHeader}
                          onPress={async () => {
                            if (isCurrent && isCurrentProgram) {
                              await hapticSuccess();
                              onCompleteDay(weekData.week, dayData.day);
                            }
                          }}
                        >
                          <View style={styles.dayHeaderLeft}>
                            {completed ? (
                              <View style={[styles.dayCheckCircle, { backgroundColor: program.color }]}>
                                <Check size={12} color={Colors.background} />
                              </View>
                            ) : isCurrent ? (
                              <View style={[styles.dayCheckCircle, { backgroundColor: program.color + '30', borderWidth: 2, borderColor: program.color }]}>
                                <Play size={10} color={program.color} />
                              </View>
                            ) : (
                              <View style={styles.dayCheckCircleEmpty} />
                            )}
                            <View>
                              <Text style={[styles.dayName, completed && styles.dayNameCompleted]}>
                                Day {dayData.day}: {dayData.name}
                              </Text>
                              <Text style={styles.dayExerciseCount}>
                                {dayData.exercises.length} exercises
                              </Text>
                            </View>
                          </View>
                          {isCurrent && (
                            <Pressable
                              style={[styles.markDoneButton, { backgroundColor: program.color }]}
                              onPress={async () => {
                                await hapticSuccess();
                                onCompleteDay(weekData.week, dayData.day);
                              }}
                            >
                              <Check size={14} color={Colors.background} />
                              <Text style={styles.markDoneText}>Done</Text>
                            </Pressable>
                          )}
                        </Pressable>

                        {/* Exercises list */}
                        <View style={styles.exerciseList}>
                          {dayData.exercises.map((ex, exIdx) => (
                            <View key={exIdx} style={styles.exerciseRow}>
                              <View style={styles.exerciseDot} />
                              <Text style={[styles.exerciseName, completed && styles.exerciseNameCompleted]} numberOfLines={1}>
                                {ex.name}
                              </Text>
                              <Text style={styles.exerciseMeta}>
                                {ex.sets}x{ex.reps}
                              </Text>
                              {ex.rest > 0 && (
                                <Text style={styles.exerciseRest}>{ex.rest}s</Text>
                              )}
                            </View>
                          ))}
                        </View>
                      </View>
                    );
                  })}
                </View>
              ))}

              {/* Bottom action */}
              {!isCurrentProgram && (
                <Pressable
                  style={styles.detailStartButton}
                  onPress={onStart}
                >
                  <LinearGradient
                    colors={[program.color, program.color + 'CC']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.detailStartGradient}
                  >
                    <Play size={18} color={Colors.background} />
                    <Text style={styles.detailStartText}>Start This Program</Text>
                  </LinearGradient>
                </Pressable>
              )}

              <View style={{ height: 40 }} />
            </ScrollView>
          </LinearGradient>
        </View>
      </BlurView>
    </Modal>
  );
}


// ---------- Main screen ----------

export default function WorkoutProgramsScreen() {
  const router = useRouter();
  const {
    activeProgram,
    isLoading,
    startProgram,
    completeDay,
    abandonProgram,
    isDayCompleted,
    isProgramComplete,
    getProgress,
    getCurrentWorkout,
  } = useWorkoutPrograms();

  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [detailVisible, setDetailVisible] = useState(false);

  // Filter programs
  const filteredPrograms = useMemo(() => {
    if (activeFilter === 'all') return WORKOUT_PROGRAMS;
    // Check both level and goal for the filter
    return WORKOUT_PROGRAMS.filter(
      (p) => p.level === activeFilter || p.goal === activeFilter
    );
  }, [activeFilter]);

  const handleFilterSelect = useCallback(async (id) => {
    await hapticLight();
    setActiveFilter(id);
  }, []);

  const handleProgramPress = useCallback(async (program) => {
    await hapticLight();
    setSelectedProgram(program);
    setDetailVisible(true);
  }, []);

  const handleStartProgram = useCallback(async (programId) => {
    if (activeProgram) {
      Alert.alert(
        'Replace Active Program?',
        'Starting a new program will replace your current program and all progress will be lost.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Replace',
            style: 'destructive',
            onPress: async () => {
              await startProgram(programId);
              await hapticSuccess();
              setDetailVisible(false);
            },
          },
        ]
      );
    } else {
      await startProgram(programId);
      await hapticSuccess();
      setDetailVisible(false);
    }
  }, [activeProgram, startProgram]);

  const handleCompleteDay = useCallback(async (week, day) => {
    await completeDay(week, day);
    await hapticSuccess();
  }, [completeDay]);

  const handleAbandon = useCallback(async () => {
    const isComplete = isProgramComplete();
    Alert.alert(
      isComplete ? 'Clear Program?' : 'Abandon Program?',
      isComplete
        ? 'This will clear the completed program from your active slot.'
        : 'All progress will be lost. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isComplete ? 'Clear' : 'Abandon',
          style: 'destructive',
          onPress: async () => {
            await abandonProgram();
            await hapticLight();
          },
        },
      ]
    );
  }, [abandonProgram, isProgramComplete]);

  const handleContinue = useCallback(async () => {
    await hapticLight();
    // Open detail view for the active program
    const program = getProgramById(activeProgram?.programId);
    if (program) {
      setSelectedProgram(program);
      setDetailVisible(true);
    }
  }, [activeProgram]);

  if (isLoading) {
    return (
      <ScreenWrapper>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading programs...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      {/* Header */}
      <ReAnimated.View entering={FadeInDown.delay(0).springify().mass(0.5).damping(10)} style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={async () => {
            await hapticLight();
            router.back();
          }}
        >
          <ArrowLeft size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.title}>Programs</Text>
        <View style={styles.headerIcon}>
          <CalendarDays size={22} color={Colors.primary} />
        </View>
      </ReAnimated.View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Active Program Card */}
        {activeProgram && (
          <ActiveProgramCard
            activeProgram={activeProgram}
            onContinue={handleContinue}
            onAbandon={handleAbandon}
          />
        )}

        {/* Section title */}
        <ReAnimated.View entering={FadeInDown.delay(activeProgram ? 200 : 100).springify().mass(0.5).damping(10)}>
          <Text style={styles.sectionTitle}>Browse Programs</Text>
        </ReAnimated.View>

        {/* Filter pills */}
        <ReAnimated.View entering={FadeInDown.delay(activeProgram ? 250 : 120).springify().mass(0.5).damping(10)}>
          <FilterRow activeFilter={activeFilter} onSelect={handleFilterSelect} />
        </ReAnimated.View>

        {/* Program list */}
        {filteredPrograms.length === 0 ? (
          <ReAnimated.View entering={FadeInDown.delay(300).springify().mass(0.5).damping(10)} style={styles.emptyContainer}>
            <Target size={48} color={Colors.textTertiary} />
            <Text style={styles.emptyText}>No programs match this filter</Text>
            <Pressable onPress={() => setActiveFilter('all')}>
              <Text style={styles.emptyAction}>Show all programs</Text>
            </Pressable>
          </ReAnimated.View>
        ) : (
          filteredPrograms.map((program, index) => (
            <ProgramCard
              key={program.id}
              program={program}
              index={index}
              isCurrentProgram={activeProgram?.programId === program.id}
              onPress={() => handleProgramPress(program)}
              onStart={() => handleStartProgram(program.id)}
            />
          ))
        )}

        {/* Info card at bottom */}
        <ReAnimated.View entering={FadeInDown.delay(500).springify().mass(0.5).damping(10)}>
          <View style={styles.infoCard}>
            <BarChart3 size={18} color={Colors.primary} />
            <View style={styles.infoCardContent}>
              <Text style={styles.infoCardTitle}>Progressive Overload</Text>
              <Text style={styles.infoCardDesc}>
                Each week builds on the last with increased volume, intensity, or complexity to keep you progressing.
              </Text>
            </View>
          </View>
        </ReAnimated.View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Program Detail Modal */}
      <ProgramDetailModal
        visible={detailVisible}
        program={selectedProgram}
        activeProgram={activeProgram}
        isDayCompleted={isDayCompleted}
        onClose={() => setDetailVisible(false)}
        onStart={() => {
          if (selectedProgram) handleStartProgram(selectedProgram.id);
        }}
        onCompleteDay={handleCompleteDay}
      />
    </ScreenWrapper>
  );
}


// ---------- Styles ----------

const styles = StyleSheet.create({
  // Loading
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

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    gap: Spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceGlass,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    flex: 1,
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
  },

  // Section title
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    marginTop: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Filter pills
  filterRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  filterPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceGlass,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterPillActive: {
    backgroundColor: Colors.primarySoft,
    borderColor: Colors.primary + '50',
  },
  filterPillText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
  },
  filterPillTextActive: {
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
  },

  // Badge
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  badgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },

  // Active program card
  activeProgramCard: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: Spacing.lg,
    ...Shadows.card,
  },
  activeProgramGradient: {
    padding: Spacing.md,
  },
  activeProgramHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  activeProgramEmoji: {
    fontSize: 36,
    marginRight: Spacing.md,
  },
  activeProgramInfo: {
    flex: 1,
  },
  activeProgramName: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  activeProgramMeta: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  completeBadgeSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.goldSoft,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Progress bar
  progressBarContainer: {
    marginBottom: Spacing.md,
  },
  progressBarOuter: {
    height: 8,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: Spacing.xs,
  },
  progressBarInner: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },

  // Continue button
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
  },
  continueButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.background,
    flexShrink: 1,
  },

  // Completed banner
  completedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.goldSoft,
    marginBottom: Spacing.sm,
  },
  completedBannerText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.gold,
  },

  // Abandon button
  abandonButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
  },
  abandonButtonText: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
  },

  // Program card
  programCard: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: Spacing.md,
    ...Shadows.card,
  },
  programCardGradient: {
    padding: Spacing.md,
  },
  programCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  programCardEmoji: {
    fontSize: 32,
    marginRight: Spacing.md,
  },
  programCardTitleArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  programCardName: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  programCardDesc: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  programCardMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },

  // Active indicator
  activeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  activeIndicatorText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },

  // Start button
  startButton: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  startButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.lg,
  },
  startButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.background,
  },

  // Empty state
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    gap: Spacing.md,
  },
  emptyText: {
    fontSize: FontSize.md,
    color: Colors.textTertiary,
  },
  emptyAction: {
    fontSize: FontSize.md,
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
  },

  // Info card
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.primarySoft,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.primary + '20',
    marginTop: Spacing.md,
  },
  infoCardContent: {
    flex: 1,
  },
  infoCardTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
    marginBottom: 4,
  },
  infoCardDesc: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },

  // ---------- Detail Modal ----------
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  detailModal: {
    maxHeight: '92%',
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
    overflow: 'hidden',
  },
  detailModalContent: {
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
    minHeight: 400,
  },
  modalHandle: {
    width: 36,
    height: 4,
    backgroundColor: Colors.textTertiary,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  modalCloseButton: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  detailScrollContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xl,
  },

  // Detail header
  detailHeader: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  detailEmoji: {
    fontSize: 56,
    marginBottom: Spacing.sm,
  },
  detailName: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  detailDesc: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  detailStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceGlass,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    width: '100%',
  },
  detailStat: {
    flex: 1,
    alignItems: 'center',
  },
  detailStatValue: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
  },
  detailStatLabel: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  detailStatDivider: {
    width: 1,
    height: 36,
    backgroundColor: Colors.border,
  },
  detailBadges: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },

  // Week section
  weekSection: {
    marginBottom: Spacing.lg,
  },
  weekHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  weekNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  weekNumberText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  weekHeaderInfo: {
    flex: 1,
  },
  weekTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  weekTheme: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  // Day card
  dayCard: {
    backgroundColor: Colors.surfaceGlass,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dayCardCompleted: {
    borderColor: Colors.success + '30',
    backgroundColor: Colors.success + '08',
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  dayHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  dayCheckCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayCheckCircleEmpty: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.textTertiary,
  },
  dayName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  dayNameCompleted: {
    color: Colors.textSecondary,
  },
  dayExerciseCount: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: 1,
  },
  markDoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
  },
  markDoneText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.background,
  },

  // Exercise list
  exerciseList: {
    gap: 6,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  exerciseDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.textTertiary,
  },
  exerciseName: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  exerciseNameCompleted: {
    color: Colors.textTertiary,
  },
  exerciseMeta: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    fontWeight: FontWeight.medium,
    minWidth: 40,
    textAlign: 'right',
  },
  exerciseRest: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    minWidth: 28,
    textAlign: 'right',
  },

  // Detail start button
  detailStartButton: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginTop: Spacing.md,
  },
  detailStartGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  detailStartText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.background,
  },
});

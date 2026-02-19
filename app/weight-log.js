import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  FlatList,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import ReAnimated, { FadeInDown } from 'react-native-reanimated';
import { LineChart } from 'react-native-gifted-charts';
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
import {
  ArrowLeft,
  Scale,
  TrendingDown,
  TrendingUp,
  Target,
  Plus,
  Trash2,
  Minus,
} from 'lucide-react-native';
import { hapticSuccess, hapticLight } from '../lib/haptics';
import { useWeightHistory } from '../hooks/useWeightHistory';
import { useProfile } from '../context/ProfileContext';

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatShortDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function getMonthYear(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

function isSameDay(date1, date2) {
  const d1 = new Date(date1).toISOString().split('T')[0];
  const d2 = new Date(date2).toISOString().split('T')[0];
  return d1 === d2;
}

// Stats Card component
function StatCard({ label, value, unit, icon: Icon, iconColor, subtitle }) {
  return (
    <View style={styles.statCard}>
      <LinearGradient
        colors={Gradients.card}
        style={styles.statCardGradient}
      >
        <View style={[styles.statIconWrap, { backgroundColor: iconColor + '20' }]}>
          <Icon size={18} color={iconColor} />
        </View>
        <Text style={styles.statValue}>
          {value !== null && value !== undefined ? value : '--'}
          {unit ? <Text style={styles.statUnit}> {unit}</Text> : null}
        </Text>
        <Text style={styles.statLabel}>{label}</Text>
        {subtitle ? <Text style={styles.statSubtitle}>{subtitle}</Text> : null}
      </LinearGradient>
    </View>
  );
}

// History row component
function HistoryRow({ item, index, entries, onDelete, weightUnit }) {
  const prevEntry = index < entries.length - 1 ? entries[index + 1] : null;
  const change = prevEntry
    ? Math.round((item.weight - prevEntry.weight) * 10) / 10
    : null;
  const isToday = isSameDay(item.date, new Date());

  const handleDelete = useCallback(() => {
    Alert.alert(
      'Delete Entry',
      `Remove the weight entry for ${formatDate(item.date)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete(item.date),
        },
      ]
    );
  }, [item.date, onDelete]);

  return (
    <Pressable
      style={[styles.historyRow, isToday && styles.historyRowToday]}
      onLongPress={handleDelete}
    >
      <View style={styles.historyLeft}>
        <Text style={styles.historyDate}>
          {isToday ? 'Today' : formatDate(item.date)}
        </Text>
        {item.note ? (
          <Text style={styles.historyNote} numberOfLines={1}>{item.note}</Text>
        ) : null}
      </View>
      <View style={styles.historyRight}>
        <Text style={styles.historyWeight}>
          {item.weight} {weightUnit}
        </Text>
        {change !== null && change !== 0 ? (
          <View style={styles.historyChange}>
            {change > 0 ? (
              <TrendingUp size={12} color={Colors.error} />
            ) : (
              <TrendingDown size={12} color={Colors.success} />
            )}
            <Text
              style={[
                styles.historyChangeText,
                { color: change > 0 ? Colors.error : Colors.success },
              ]}
            >
              {change > 0 ? '+' : ''}{change}
            </Text>
          </View>
        ) : null}
      </View>
      <Pressable
        style={styles.historyDeleteBtn}
        onPress={handleDelete}
        hitSlop={8}
      >
        <Trash2 size={16} color={Colors.textTertiary} />
      </Pressable>
    </Pressable>
  );
}

export default function WeightLogScreen() {
  const {
    entries,
    goal,
    addEntry,
    deleteEntry,
    setGoal,
    getWeeklyAverage,
    getMonthlyTrend,
    getTotalChange,
    currentWeight,
    isLoading,
  } = useWeightHistory();

  let profileData = null;
  try {
    const ctx = useProfile();
    profileData = ctx.profile;
  } catch {
    // Profile context not available
  }

  const weightUnit = profileData?.weightUnit || 'lbs';

  const [weightInput, setWeightInput] = useState('');
  const [noteInput, setNoteInput] = useState('');
  const [goalInput, setGoalInput] = useState('');
  const [showGoalInput, setShowGoalInput] = useState(false);

  // Check if today already has an entry
  const todayEntry = useMemo(() => {
    return entries.find((e) => isSameDay(e.date, new Date()));
  }, [entries]);

  // Total change stats
  const totalChange = useMemo(() => getTotalChange(), [getTotalChange]);

  // Weekly average
  const weeklyAvg = useMemo(() => getWeeklyAverage(), [getWeeklyAverage]);

  // Distance to goal
  const toGoal = useMemo(() => {
    if (!goal || !currentWeight) return null;
    return Math.round((currentWeight - goal) * 10) / 10;
  }, [goal, currentWeight]);

  // Chart data (last 30 entries, reversed to oldest-first for line chart)
  const chartData = useMemo(() => {
    const chartEntries = entries.slice(0, 30).reverse();
    if (chartEntries.length === 0) return [];

    return chartEntries.map((e, i) => ({
      value: e.weight,
      label: i % 5 === 0 ? formatShortDate(e.date) : '',
      dataPointText: i === chartEntries.length - 1 ? String(e.weight) : '',
      showDataPoint: true,
      dataPointColor:
        i === chartEntries.length - 1 ? Colors.primary : Colors.primaryDim,
      dataPointRadius: i === chartEntries.length - 1 ? 6 : 3,
    }));
  }, [entries]);

  // Goal line reference
  const goalLineConfig = useMemo(() => {
    if (!goal || chartData.length === 0) return null;
    return {
      value: goal,
      dashWidth: 8,
      dashGap: 6,
      labelText: `Goal: ${goal}`,
      labelTextStyle: {
        color: Colors.success,
        fontSize: 10,
        fontWeight: FontWeight.semibold,
      },
      lineColor: Colors.success,
    };
  }, [goal, chartData]);

  // Min/max for chart Y axis
  const yAxisRange = useMemo(() => {
    if (chartData.length === 0) return { min: 0, max: 200 };
    const weights = chartData.map((d) => d.value);
    if (goal) weights.push(goal);
    const min = Math.floor(Math.min(...weights) - 5);
    const max = Math.ceil(Math.max(...weights) + 5);
    return { min: Math.max(0, min), max };
  }, [chartData, goal]);

  // Group entries by month for section headers
  const groupedEntries = useMemo(() => {
    const groups = [];
    let currentMonth = '';

    entries.forEach((entry) => {
      const monthKey = getMonthYear(entry.date);
      if (monthKey !== currentMonth) {
        currentMonth = monthKey;
        groups.push({ type: 'header', month: monthKey, key: `header-${monthKey}` });
      }
      groups.push({ type: 'entry', ...entry, key: entry.date });
    });

    return groups;
  }, [entries]);

  // Handle logging a weight entry
  const handleLogWeight = useCallback(async () => {
    const parsed = parseFloat(weightInput);
    if (isNaN(parsed) || parsed <= 0) {
      Alert.alert('Invalid Weight', 'Please enter a valid weight.');
      return;
    }

    await hapticSuccess();
    addEntry(parsed, noteInput.trim());
    setWeightInput('');
    setNoteInput('');
  }, [weightInput, noteInput, addEntry]);

  // Handle setting goal
  const handleSetGoal = useCallback(async () => {
    const parsed = parseFloat(goalInput);
    if (isNaN(parsed) || parsed <= 0) {
      Alert.alert('Invalid Weight', 'Please enter a valid target weight.');
      return;
    }

    await hapticLight();
    setGoal(parsed);
    setGoalInput('');
    setShowGoalInput(false);
  }, [goalInput, setGoal]);

  // Handle deleting an entry
  const handleDeleteEntry = useCallback(
    async (date) => {
      await hapticLight();
      deleteEntry(date);
    },
    [deleteEntry]
  );

  const renderItem = useCallback(
    ({ item, index }) => {
      if (item.type === 'header') {
        return (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderText}>{item.month}</Text>
          </View>
        );
      }

      // Find the real index in entries array for change calculation
      const entryIndex = entries.findIndex((e) => e.date === item.date);

      return (
        <HistoryRow
          item={item}
          index={entryIndex}
          entries={entries}
          onDelete={handleDeleteEntry}
          weightUnit={weightUnit}
        />
      );
    },
    [entries, handleDeleteEntry, weightUnit]
  );

  const keyExtractor = useCallback((item) => item.key, []);

  // Empty state
  const hasEntries = entries.length > 0;

  // Header component for FlatList
  const ListHeaderComponent = useMemo(
    () => (
      <View>
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
          <Text style={styles.headerTitle}>Weight</Text>
          <Pressable
            style={styles.goalBadge}
            onPress={() => setShowGoalInput(!showGoalInput)}
          >
            <Target size={14} color={Colors.success} />
            <Text style={styles.goalBadgeText}>
              {goal ? `${goal} ${weightUnit}` : 'Set Goal'}
            </Text>
          </Pressable>
        </ReAnimated.View>

        {/* Goal Input */}
        {showGoalInput && (
          <ReAnimated.View
            entering={FadeInDown.springify().mass(0.5).damping(10)}
            style={styles.goalInputContainer}
          >
            <TextInput
              style={styles.goalTextInput}
              value={goalInput}
              onChangeText={setGoalInput}
              placeholder={`Target weight (${weightUnit})`}
              placeholderTextColor={Colors.textTertiary}
              keyboardType="decimal-pad"
              returnKeyType="done"
              onSubmitEditing={handleSetGoal}
            />
            <Pressable style={styles.goalSetBtn} onPress={handleSetGoal}>
              <Text style={styles.goalSetBtnText}>Set</Text>
            </Pressable>
            {goal && (
              <Pressable
                style={styles.goalClearBtn}
                onPress={async () => {
                  await hapticLight();
                  setGoal(null);
                  setShowGoalInput(false);
                }}
              >
                <Text style={styles.goalClearBtnText}>Clear</Text>
              </Pressable>
            )}
          </ReAnimated.View>
        )}

        {/* Quick Entry Section */}
        <ReAnimated.View
          entering={FadeInDown.delay(80).springify().mass(0.5).damping(10)}
          style={styles.entryCard}
        >
          <LinearGradient
            colors={Gradients.card}
            style={styles.entryCardGradient}
          >
            <View style={styles.entryBorder} />

            {todayEntry && (
              <View style={styles.todayBanner}>
                <Text style={styles.todayBannerText}>
                  Today: {todayEntry.weight} {weightUnit}
                </Text>
                <Text style={styles.todayBannerSub}>Log again to update</Text>
              </View>
            )}

            <View style={styles.entryInputRow}>
              <View style={styles.weightInputWrap}>
                <TextInput
                  style={styles.weightInput}
                  value={weightInput}
                  onChangeText={setWeightInput}
                  placeholder="0.0"
                  placeholderTextColor={Colors.textTertiary}
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                />
                <Text style={styles.weightInputUnit}>{weightUnit}</Text>
              </View>
            </View>

            <TextInput
              style={styles.noteInput}
              value={noteInput}
              onChangeText={setNoteInput}
              placeholder="Optional note (e.g., after breakfast)"
              placeholderTextColor={Colors.textTertiary}
              returnKeyType="done"
            />

            <Pressable style={styles.logButton} onPress={handleLogWeight}>
              <LinearGradient
                colors={Gradients.primary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.logButtonGradient}
              >
                <Plus size={20} color={Colors.background} />
                <Text style={styles.logButtonText}>Log Weight</Text>
              </LinearGradient>
            </Pressable>
          </LinearGradient>
        </ReAnimated.View>

        {/* Weight Chart */}
        {hasEntries && chartData.length > 1 && (
          <ReAnimated.View
            entering={FadeInDown.delay(160).springify().mass(0.5).damping(10)}
            style={styles.chartCard}
          >
            <LinearGradient
              colors={Gradients.card}
              style={styles.chartCardGradient}
            >
              <View style={styles.entryBorder} />
              <Text style={styles.chartTitle}>Weight Trend</Text>
              <View style={styles.chartWrap}>
                <LineChart
                  data={chartData}
                  width={300}
                  height={180}
                  spacing={chartData.length > 15 ? 20 : 30}
                  color={Colors.primary}
                  thickness={2}
                  startFillColor={Colors.primaryGlow}
                  endFillColor="transparent"
                  startOpacity={0.3}
                  endOpacity={0}
                  areaChart
                  hideDataPoints={false}
                  yAxisColor="transparent"
                  xAxisColor={Colors.border}
                  yAxisTextStyle={{
                    color: Colors.textTertiary,
                    fontSize: 10,
                  }}
                  xAxisLabelTextStyle={{
                    color: Colors.textTertiary,
                    fontSize: 9,
                    width: 40,
                  }}
                  noOfSections={4}
                  maxValue={yAxisRange.max}
                  minValue={yAxisRange.min}
                  rulesColor={Colors.border}
                  rulesType="dashed"
                  showReferenceLine1={!!goalLineConfig}
                  referenceLine1Config={goalLineConfig}
                  curved
                  curveType={0}
                  animateOnDataChange
                  isAnimated
                  pointerConfig={{
                    pointerStripColor: Colors.primary,
                    pointerStripWidth: 1,
                    pointerColor: Colors.primary,
                    radius: 5,
                    pointerLabelWidth: 100,
                    pointerLabelHeight: 40,
                    pointerLabelComponent: (items) => {
                      return (
                        <View style={styles.pointerLabel}>
                          <Text style={styles.pointerLabelText}>
                            {items[0].value} {weightUnit}
                          </Text>
                        </View>
                      );
                    },
                  }}
                />
              </View>
            </LinearGradient>
          </ReAnimated.View>
        )}

        {/* Stats Cards Row */}
        {hasEntries && (
          <ReAnimated.View
            entering={FadeInDown.delay(240).springify().mass(0.5).damping(10)}
            style={styles.statsRow}
          >
            <StatCard
              label="Current"
              value={currentWeight}
              unit={weightUnit}
              icon={Scale}
              iconColor={Colors.primary}
            />
            <StatCard
              label="Change"
              value={
                totalChange.change !== 0
                  ? `${totalChange.direction === 'up' ? '+' : '-'}${totalChange.change}`
                  : '0'
              }
              unit={weightUnit}
              icon={totalChange.direction === 'up' ? TrendingUp : totalChange.direction === 'down' ? TrendingDown : Minus}
              iconColor={
                totalChange.direction === 'up'
                  ? Colors.error
                  : totalChange.direction === 'down'
                    ? Colors.success
                    : Colors.textSecondary
              }
              subtitle={
                totalChange.startWeight
                  ? `from ${totalChange.startWeight}`
                  : null
              }
            />
            <StatCard
              label="To Goal"
              value={toGoal !== null ? Math.abs(toGoal) : '--'}
              unit={toGoal !== null ? weightUnit : ''}
              icon={Target}
              iconColor={Colors.success}
              subtitle={
                toGoal !== null
                  ? toGoal > 0
                    ? 'to lose'
                    : toGoal < 0
                      ? 'to gain'
                      : 'reached!'
                  : 'set a goal'
              }
            />
          </ReAnimated.View>
        )}

        {/* History Title */}
        {hasEntries && (
          <ReAnimated.View
            entering={FadeInDown.delay(320).springify().mass(0.5).damping(10)}
            style={styles.historyHeader}
          >
            <Text style={styles.historyTitle}>History</Text>
            <Text style={styles.historyCount}>
              {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
            </Text>
          </ReAnimated.View>
        )}
      </View>
    ),
    [
      showGoalInput,
      goalInput,
      goal,
      weightUnit,
      todayEntry,
      weightInput,
      noteInput,
      hasEntries,
      chartData,
      goalLineConfig,
      yAxisRange,
      currentWeight,
      totalChange,
      toGoal,
      entries.length,
      handleLogWeight,
      handleSetGoal,
    ]
  );

  // Empty state component
  const ListEmptyComponent = useMemo(
    () => (
      <View style={styles.emptyState}>
        <View style={styles.emptyIconWrap}>
          <Scale size={48} color={Colors.textTertiary} />
        </View>
        <Text style={styles.emptyTitle}>Start tracking your weight</Text>
        <Text style={styles.emptySubtitle}>
          Log your first entry above
        </Text>
      </View>
    ),
    []
  );

  return (
    <ScreenWrapper edges={['top']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <OptimizedFlatList
          data={groupedEntries}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          ListHeaderComponent={ListHeaderComponent}
          ListEmptyComponent={ListEmptyComponent}
          ListFooterComponent={<View style={styles.bottomSpacer} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.md,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
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
  headerTitle: {
    flex: 1,
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  goalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.successSoft,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  goalBadgeText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.success,
  },

  // Goal Input
  goalInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
  goalTextInput: {
    flex: 1,
    height: 44,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  goalSetBtn: {
    height: 44,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.success,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  goalSetBtnText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.background,
  },
  goalClearBtn: {
    height: 44,
    paddingHorizontal: Spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  goalClearBtnText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },

  // Entry Card
  entryCard: {
    marginBottom: Spacing.lg,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadows.card,
  },
  entryCardGradient: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    position: 'relative',
  },
  entryBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  todayBanner: {
    backgroundColor: Colors.primarySoft,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
    alignItems: 'center',
  },
  todayBannerText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },
  todayBannerSub: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  entryInputRow: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  weightInputWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.sm,
  },
  weightInput: {
    fontSize: FontSize.display,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    textAlign: 'center',
    minWidth: 120,
    padding: 0,
  },
  weightInputUnit: {
    fontSize: FontSize.xl,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  noteInput: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  logButton: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.button,
  },
  logButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  logButtonText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.background,
  },

  // Chart Card
  chartCard: {
    marginBottom: Spacing.lg,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadows.card,
  },
  chartCardGradient: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    position: 'relative',
  },
  chartTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  chartWrap: {
    alignItems: 'center',
    overflow: 'hidden',
  },
  pointerLabel: {
    backgroundColor: Colors.surfaceElevated,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pointerLabelText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  statCard: {
    flex: 1,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadows.card,
  },
  statCardGradient: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  statValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  statUnit: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.regular,
    color: Colors.textSecondary,
  },
  statLabel: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: 2,
  },

  // History
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  historyTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  historyCount: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
  },
  sectionHeader: {
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  sectionHeaderText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  historyRowToday: {
    borderColor: Colors.primary + '30',
    backgroundColor: Colors.primarySoft,
  },
  historyLeft: {
    flex: 1,
  },
  historyDate: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.text,
  },
  historyNote: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  historyRight: {
    alignItems: 'flex-end',
    marginRight: Spacing.sm,
  },
  historyWeight: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  historyChange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
  },
  historyChangeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  historyDeleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.surfaceGlass,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  emptySubtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },

  // Bottom spacer
  bottomSpacer: {
    height: 100,
  },
});

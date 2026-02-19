import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import ReAnimated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BarChart } from 'react-native-gifted-charts';
import {
  ArrowLeft,
  Moon,
  Clock,
  Sunrise,
  Trash2,
  ChevronDown,
  ChevronUp,
  BedDouble,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius, Shadows, Gradients } from '../constants/theme';
import { hapticSuccess, hapticLight } from '../lib/haptics';
import { useSleepTracking } from '../hooks/useSleepTracking';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = SCREEN_WIDTH - Spacing.md * 2 - Spacing.md * 2;

function formatTime12(hour, minute, ampm) {
  const h = String(hour).padStart(2, '0');
  const m = String(minute).padStart(2, '0');
  return `${h}:${m} ${ampm}`;
}

function formatDuration(hours) {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function formatDate(isoString) {
  const d = new Date(isoString);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatShortDate(isoString) {
  const d = new Date(isoString);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function timeStringFromISO(isoString) {
  const d = new Date(isoString);
  let hours = d.getHours();
  const minutes = d.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${hours}:${String(minutes).padStart(2, '0')} ${ampm}`;
}

function getDayLabel(isoString) {
  const d = new Date(isoString);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[d.getDay()];
}

// Convert hour/minute/ampm to a Date object for today (or yesterday for bedtime)
function buildTimeDate(hour, minute, ampm, isYesterday = false) {
  let h = parseInt(hour, 10);
  if (ampm === 'PM' && h !== 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;
  const d = new Date();
  if (isYesterday) d.setDate(d.getDate() - 1);
  d.setHours(h, parseInt(minute, 10), 0, 0);
  return d;
}

// Quality Moon Rating Component
function QualityRating({ value, onChange }) {
  return (
    <View style={styles.qualityContainer}>
      <Text style={styles.qualityLabel}>Sleep Quality</Text>
      <View style={styles.qualityRow}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Pressable
            key={star}
            onPress={async () => {
              await hapticLight();
              onChange(star);
            }}
            style={styles.qualityButton}
          >
            <Moon
              size={28}
              color={star <= value ? '#A78BFA' : Colors.textTertiary}
              fill={star <= value ? '#A78BFA' : 'transparent'}
            />
          </Pressable>
        ))}
      </View>
      <Text style={styles.qualityValueText}>
        {value === 1 && 'Poor'}
        {value === 2 && 'Fair'}
        {value === 3 && 'Good'}
        {value === 4 && 'Great'}
        {value === 5 && 'Excellent'}
      </Text>
    </View>
  );
}

// Time Picker Component
function TimePicker({ label, icon: Icon, iconColor, hour, minute, ampm, onChangeHour, onChangeMinute, onToggleAmPm }) {
  return (
    <View style={styles.timePickerContainer}>
      <View style={styles.timePickerHeader}>
        <View style={[styles.timePickerIcon, { backgroundColor: iconColor + '20' }]}>
          <Icon size={18} color={iconColor} />
        </View>
        <Text style={styles.timePickerLabel}>{label}</Text>
      </View>
      <View style={styles.timePickerRow}>
        <View style={styles.timeInputWrapper}>
          <TextInput
            style={styles.timeInput}
            value={hour}
            onChangeText={(v) => {
              const cleaned = v.replace(/[^0-9]/g, '');
              if (cleaned.length <= 2) {
                const num = parseInt(cleaned, 10);
                if (!cleaned || (num >= 1 && num <= 12)) {
                  onChangeHour(cleaned);
                }
              }
            }}
            placeholder="12"
            placeholderTextColor={Colors.textTertiary}
            keyboardType="number-pad"
            maxLength={2}
          />
          <Text style={styles.timeLabel}>hr</Text>
        </View>
        <Text style={styles.timeSeparator}>:</Text>
        <View style={styles.timeInputWrapper}>
          <TextInput
            style={styles.timeInput}
            value={minute}
            onChangeText={(v) => {
              const cleaned = v.replace(/[^0-9]/g, '');
              if (cleaned.length <= 2) {
                const num = parseInt(cleaned, 10);
                if (!cleaned || num <= 59) {
                  onChangeMinute(cleaned);
                }
              }
            }}
            placeholder="00"
            placeholderTextColor={Colors.textTertiary}
            keyboardType="number-pad"
            maxLength={2}
          />
          <Text style={styles.timeLabel}>min</Text>
        </View>
        <Pressable
          style={styles.ampmToggle}
          onPress={async () => {
            await hapticLight();
            onToggleAmPm();
          }}
        >
          <View style={[styles.ampmOption, ampm === 'AM' && styles.ampmOptionActive]}>
            <Text style={[styles.ampmText, ampm === 'AM' && styles.ampmTextActive]}>AM</Text>
          </View>
          <View style={[styles.ampmOption, ampm === 'PM' && styles.ampmOptionActive]}>
            <Text style={[styles.ampmText, ampm === 'PM' && styles.ampmTextActive]}>PM</Text>
          </View>
        </Pressable>
      </View>
    </View>
  );
}

// Stats Card Component
function StatCard({ label, value, unit, icon: Icon, iconColor, delay }) {
  return (
    <ReAnimated.View
      entering={FadeInDown.delay(delay).springify().mass(0.5).damping(10)}
      style={styles.statCard}
    >
      <View style={[styles.statIconContainer, { backgroundColor: iconColor + '20' }]}>
        <Icon size={18} color={iconColor} />
      </View>
      <Text style={styles.statValue}>{value}{unit && <Text style={styles.statUnit}> {unit}</Text>}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </ReAnimated.View>
  );
}

export default function SleepTrackerScreen() {
  const router = useRouter();
  const {
    entries,
    isLoading,
    addEntry,
    deleteEntry,
    getWeeklyAverage,
    getSleepDebt,
    getQualityTrend,
    autoSleepStages,
    hasAutoSleep,
    getStagePercentages,
  } = useSleepTracking();

  // Sleep stage data
  const stagePercentages = useMemo(() => getStagePercentages(), [getStagePercentages]);

  // Form state
  const [bedHour, setBedHour] = useState('10');
  const [bedMinute, setBedMinute] = useState('30');
  const [bedAmPm, setBedAmPm] = useState('PM');
  const [wakeHour, setWakeHour] = useState('6');
  const [wakeMinute, setWakeMinute] = useState('30');
  const [wakeAmPm, setWakeAmPm] = useState('AM');
  const [quality, setQuality] = useState(3);
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [expandedEntry, setExpandedEntry] = useState(null);

  // Stats
  const weeklyAvg = useMemo(() => getWeeklyAverage(), [getWeeklyAverage]);
  const sleepDebt = useMemo(() => getSleepDebt(8), [getSleepDebt]);
  const qualityTrend = useMemo(() => getQualityTrend(), [getQualityTrend]);

  // Weekly chart data
  const chartData = useMemo(() => {
    if (entries.length === 0) return [];

    const now = new Date();
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dayStr = d.toISOString().split('T')[0];
      const dayLabel = getDayLabel(d.toISOString());
      const entry = entries.find((e) => {
        const entryDay = new Date(e.date).toISOString().split('T')[0];
        return entryDay === dayStr;
      });

      days.push({
        value: entry ? entry.duration : 0,
        label: dayLabel,
        frontColor: entry
          ? entry.duration >= 7
            ? '#A78BFA'
            : entry.duration >= 5
              ? '#7C3AED'
              : Colors.error
          : 'rgba(255, 255, 255, 0.05)',
        topLabelComponent: entry ? () => (
          <Text style={styles.barTopLabel}>{entry.duration.toFixed(1)}</Text>
        ) : undefined,
      });
    }

    return days;
  }, [entries]);

  const handleLogSleep = useCallback(async () => {
    const bh = parseInt(bedHour, 10);
    const bm = parseInt(bedMinute, 10);
    const wh = parseInt(wakeHour, 10);
    const wm = parseInt(wakeMinute, 10);

    if (!bh || isNaN(bm) || !wh || isNaN(wm)) {
      Alert.alert('Invalid Time', 'Please enter valid bedtime and wake time.');
      return;
    }

    setIsSaving(true);
    try {
      // For bedtime, assume last night; for wake, assume this morning
      const bedtime = buildTimeDate(bedHour, bedMinute, bedAmPm, true);
      const wakeTime = buildTimeDate(wakeHour, wakeMinute, wakeAmPm, false);

      // If bed is PM and wake is PM and wake > bed, no overnight span needed
      // If bed is AM, it might be early morning bedtime
      // The buildTimeDate logic handles yesterday for bed

      addEntry(bedtime.toISOString(), wakeTime.toISOString(), quality, notes);
      await hapticSuccess();
      setNotes('');
      Alert.alert('Sleep Logged', `${formatDuration(((wakeTime - bedtime) < 0 ? (wakeTime - bedtime + 86400000) : (wakeTime - bedtime)) / 3600000)} of sleep recorded.`);
    } catch (error) {
      Alert.alert('Error', 'Could not log sleep. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [bedHour, bedMinute, bedAmPm, wakeHour, wakeMinute, wakeAmPm, quality, notes, addEntry]);

  const handleDelete = useCallback((date) => {
    Alert.alert(
      'Delete Entry',
      'Are you sure you want to delete this sleep entry?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            deleteEntry(date);
            await hapticLight();
          },
        },
      ]
    );
  }, [deleteEntry]);

  const handleToggleExpand = useCallback((date) => {
    hapticLight();
    setExpandedEntry((prev) => (prev === date ? null : date));
  }, []);

  if (isLoading) {
    return (
      <ScreenWrapper>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading sleep data...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  const hasHistory = entries.length > 0;

  return (
    <ScreenWrapper>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <ReAnimated.View entering={FadeInDown.delay(0).springify().mass(0.5).damping(10)} style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={22} color={Colors.text} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.title}>Sleep</Text>
          </View>
          <View style={styles.headerRight}>
            <Moon size={22} color="#A78BFA" />
          </View>
        </ReAnimated.View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Empty State */}
          {!hasHistory && (
            <ReAnimated.View entering={FadeInDown.delay(100).springify().mass(0.5).damping(10)} style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Moon size={48} color={Colors.textTertiary} />
              </View>
              <Text style={styles.emptyTitle}>Track Your Sleep</Text>
              <Text style={styles.emptySubtitle}>
                Log your bedtime and wake time to understand your sleep patterns and improve your rest
              </Text>
            </ReAnimated.View>
          )}

          {/* Quick Log Section */}
          <ReAnimated.View entering={FadeInDown.delay(hasHistory ? 80 : 200).springify().mass(0.5).damping(10)}>
            <Text style={styles.sectionTitle}>Log Sleep</Text>
            <View style={styles.logCard}>
              {/* Time Pickers */}
              <View style={styles.timePickersRow}>
                <TimePicker
                  label="Bedtime"
                  icon={BedDouble}
                  iconColor="#A78BFA"
                  hour={bedHour}
                  minute={bedMinute}
                  ampm={bedAmPm}
                  onChangeHour={setBedHour}
                  onChangeMinute={setBedMinute}
                  onToggleAmPm={() => setBedAmPm((p) => (p === 'AM' ? 'PM' : 'AM'))}
                />
                <TimePicker
                  label="Wake Time"
                  icon={Sunrise}
                  iconColor={Colors.warning}
                  hour={wakeHour}
                  minute={wakeMinute}
                  ampm={wakeAmPm}
                  onChangeHour={setWakeHour}
                  onChangeMinute={setWakeMinute}
                  onToggleAmPm={() => setWakeAmPm((p) => (p === 'AM' ? 'PM' : 'AM'))}
                />
              </View>

              {/* Quality Rating */}
              <QualityRating value={quality} onChange={setQuality} />

              {/* Notes */}
              <View style={styles.notesContainer}>
                <TextInput
                  style={styles.notesInput}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Add notes (optional)..."
                  placeholderTextColor={Colors.textTertiary}
                  maxLength={150}
                  multiline
                />
              </View>

              {/* Log Button */}
              <Pressable
                style={[styles.logButton, isSaving && styles.logButtonDisabled]}
                onPress={handleLogSleep}
                disabled={isSaving}
              >
                <LinearGradient
                  colors={isSaving ? Gradients.disabled : ['#7C3AED', '#A78BFA']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.logButtonGradient}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color={Colors.text} />
                  ) : (
                    <>
                      <Moon size={20} color={Colors.text} />
                      <Text style={styles.logButtonText}>Log Sleep</Text>
                    </>
                  )}
                </LinearGradient>
              </Pressable>
            </View>
          </ReAnimated.View>

          {/* Stats Cards */}
          {hasHistory && (
            <View style={styles.statsRow}>
              <StatCard
                label="Avg Duration"
                value={weeklyAvg !== null ? formatDuration(weeklyAvg) : '--'}
                icon={Clock}
                iconColor="#A78BFA"
                delay={120}
              />
              <StatCard
                label="Quality"
                value={qualityTrend !== null ? qualityTrend.toFixed(1) : '--'}
                unit={qualityTrend !== null ? '/ 5' : ''}
                icon={Moon}
                iconColor={Colors.warning}
                delay={160}
              />
              <StatCard
                label="Sleep Debt"
                value={sleepDebt !== null ? (sleepDebt > 0 ? `${formatDuration(sleepDebt)}` : 'None') : '--'}
                icon={sleepDebt !== null && sleepDebt > 0 ? AlertTriangle : TrendingUp}
                iconColor={sleepDebt !== null && sleepDebt > 0 ? Colors.error : Colors.success}
                delay={200}
              />
            </View>
          )}

          {/* Sleep Stage Breakdown (auto-detected from HealthKit) */}
          {hasAutoSleep && autoSleepStages && stagePercentages && (
            <ReAnimated.View entering={FadeInDown.delay(180).springify().mass(0.5).damping(10)}>
              <Text style={styles.sectionTitle}>Last Night&apos;s Sleep Stages</Text>
              <View style={styles.stagesCard}>
                {/* Source badge */}
                <View style={styles.stagesSourceBadge}>
                  <Text style={styles.stagesSourceText}>
                    {autoSleepStages.source === 'healthkit' ? 'Apple Health' :
                     autoSleepStages.source === 'health-connect' ? 'Health Connect' :
                     'Estimated'}
                  </Text>
                </View>

                {/* Total sleep and efficiency */}
                <View style={styles.stagesTotalRow}>
                  <View style={styles.stagesTotalItem}>
                    <Text style={styles.stagesTotalValue}>
                      {Math.floor(autoSleepStages.totalMinutes / 60)}h {autoSleepStages.totalMinutes % 60}m
                    </Text>
                    <Text style={styles.stagesTotalLabel}>Total Sleep</Text>
                  </View>
                  <View style={styles.stagesTotalDivider} />
                  <View style={styles.stagesTotalItem}>
                    <Text style={styles.stagesTotalValue}>{autoSleepStages.efficiency}%</Text>
                    <Text style={styles.stagesTotalLabel}>Efficiency</Text>
                  </View>
                </View>

                {/* Stacked bar visualization */}
                <View style={styles.stackedBarContainer}>
                  <View style={styles.stackedBar}>
                    {stagePercentages.deep > 0 && (
                      <View style={[styles.stackedSegment, { flex: stagePercentages.deep, backgroundColor: '#5C6BC0' }]} />
                    )}
                    {stagePercentages.light > 0 && (
                      <View style={[styles.stackedSegment, { flex: stagePercentages.light, backgroundColor: '#7986CB' }]} />
                    )}
                    {stagePercentages.rem > 0 && (
                      <View style={[styles.stackedSegment, { flex: stagePercentages.rem, backgroundColor: '#A78BFA' }]} />
                    )}
                    {stagePercentages.awake > 0 && (
                      <View style={[styles.stackedSegment, { flex: stagePercentages.awake, backgroundColor: '#FF8A80' }]} />
                    )}
                  </View>
                </View>

                {/* Stage legend with minutes */}
                <View style={styles.stagesLegend}>
                  <View style={styles.stageLegendItem}>
                    <View style={[styles.stageLegendDot, { backgroundColor: '#5C6BC0' }]} />
                    <View style={styles.stageLegendInfo}>
                      <Text style={styles.stageLegendLabel}>Deep</Text>
                      <Text style={styles.stageLegendValue}>
                        {autoSleepStages.deepMinutes}m ({stagePercentages.deep}%)
                      </Text>
                    </View>
                  </View>
                  <View style={styles.stageLegendItem}>
                    <View style={[styles.stageLegendDot, { backgroundColor: '#7986CB' }]} />
                    <View style={styles.stageLegendInfo}>
                      <Text style={styles.stageLegendLabel}>Light</Text>
                      <Text style={styles.stageLegendValue}>
                        {autoSleepStages.lightMinutes}m ({stagePercentages.light}%)
                      </Text>
                    </View>
                  </View>
                  <View style={styles.stageLegendItem}>
                    <View style={[styles.stageLegendDot, { backgroundColor: '#A78BFA' }]} />
                    <View style={styles.stageLegendInfo}>
                      <Text style={styles.stageLegendLabel}>REM</Text>
                      <Text style={styles.stageLegendValue}>
                        {autoSleepStages.remMinutes}m ({stagePercentages.rem}%)
                      </Text>
                    </View>
                  </View>
                  <View style={styles.stageLegendItem}>
                    <View style={[styles.stageLegendDot, { backgroundColor: '#FF8A80' }]} />
                    <View style={styles.stageLegendInfo}>
                      <Text style={styles.stageLegendLabel}>Awake</Text>
                      <Text style={styles.stageLegendValue}>
                        {autoSleepStages.awakeMinutes}m ({stagePercentages.awake}%)
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </ReAnimated.View>
          )}

          {/* Weekly Bar Chart */}
          {hasHistory && chartData.length > 0 && (
            <ReAnimated.View entering={FadeInDown.delay(240).springify().mass(0.5).damping(10)}>
              <Text style={styles.sectionTitle}>This Week</Text>
              <View style={styles.chartCard}>
                <View style={styles.chartContainer}>
                  <BarChart
                    data={chartData}
                    width={CHART_WIDTH}
                    height={160}
                    barWidth={28}
                    spacing={18}
                    initialSpacing={15}
                    endSpacing={10}
                    barBorderRadius={6}
                    noOfSections={4}
                    maxValue={12}
                    yAxisColor="transparent"
                    xAxisColor={Colors.border}
                    yAxisTextStyle={styles.axisText}
                    xAxisLabelTextStyle={styles.axisText}
                    hideRules
                    showReferenceLine1
                    referenceLine1Position={8}
                    referenceLine1Config={{
                      color: Colors.textTertiary,
                      dashWidth: 5,
                      dashGap: 3,
                      thickness: 1,
                      labelText: '8h goal',
                      labelTextStyle: styles.referenceLineLabel,
                    }}
                    isAnimated
                    animationDuration={800}
                  />
                </View>
                <View style={styles.legendRow}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#A78BFA' }]} />
                    <Text style={styles.legendText}>7+ hours</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#7C3AED' }]} />
                    <Text style={styles.legendText}>5-7 hours</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: Colors.error }]} />
                    <Text style={styles.legendText}>Under 5h</Text>
                  </View>
                </View>
              </View>
            </ReAnimated.View>
          )}

          {/* History List */}
          {hasHistory && (
            <ReAnimated.View entering={FadeInDown.delay(320).springify().mass(0.5).damping(10)}>
              <Text style={styles.sectionTitle}>History</Text>
              {entries.map((entry) => {
                const isExpanded = expandedEntry === entry.date;

                return (
                  <Pressable
                    key={entry.date}
                    style={[styles.historyCard, isExpanded && styles.historyCardExpanded]}
                    onPress={() => handleToggleExpand(entry.date)}
                  >
                    <View style={styles.historyHeader}>
                      <View style={styles.historyHeaderLeft}>
                        <View style={styles.historyDateBadge}>
                          <Text style={styles.historyDateText}>{formatShortDate(entry.date)}</Text>
                        </View>
                        {!isExpanded && (
                          <View style={styles.historySummaryRow}>
                            <Text style={styles.historySummary}>
                              {formatDuration(entry.duration)}
                            </Text>
                            <View style={styles.historyMoonsRow}>
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Moon
                                  key={s}
                                  size={12}
                                  color={s <= entry.quality ? '#A78BFA' : Colors.textTertiary}
                                  fill={s <= entry.quality ? '#A78BFA' : 'transparent'}
                                />
                              ))}
                            </View>
                          </View>
                        )}
                      </View>
                      {isExpanded ? (
                        <ChevronUp size={18} color={Colors.textSecondary} />
                      ) : (
                        <ChevronDown size={18} color={Colors.textSecondary} />
                      )}
                    </View>

                    {isExpanded && (
                      <View style={styles.historyDetails}>
                        <View style={styles.historyDetailRow}>
                          <View style={styles.historyDetailLabel}>
                            <BedDouble size={14} color="#A78BFA" />
                            <Text style={styles.historyDetailText}>Bedtime</Text>
                          </View>
                          <Text style={styles.historyDetailValue}>
                            {timeStringFromISO(entry.bedtime)}
                          </Text>
                        </View>
                        <View style={styles.historyDetailRow}>
                          <View style={styles.historyDetailLabel}>
                            <Sunrise size={14} color={Colors.warning} />
                            <Text style={styles.historyDetailText}>Wake Time</Text>
                          </View>
                          <Text style={styles.historyDetailValue}>
                            {timeStringFromISO(entry.wakeTime)}
                          </Text>
                        </View>
                        <View style={styles.historyDetailRow}>
                          <View style={styles.historyDetailLabel}>
                            <Clock size={14} color={Colors.primary} />
                            <Text style={styles.historyDetailText}>Duration</Text>
                          </View>
                          <Text style={styles.historyDetailValue}>
                            {formatDuration(entry.duration)}
                          </Text>
                        </View>
                        <View style={styles.historyDetailRow}>
                          <View style={styles.historyDetailLabel}>
                            <Moon size={14} color="#A78BFA" />
                            <Text style={styles.historyDetailText}>Quality</Text>
                          </View>
                          <View style={styles.historyMoonsRow}>
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Moon
                                key={s}
                                size={16}
                                color={s <= entry.quality ? '#A78BFA' : Colors.textTertiary}
                                fill={s <= entry.quality ? '#A78BFA' : 'transparent'}
                              />
                            ))}
                          </View>
                        </View>
                        {entry.notes ? (
                          <Text style={styles.historyNote}>{entry.notes}</Text>
                        ) : null}
                        <Pressable
                          style={styles.historyDeleteButton}
                          onPress={() => handleDelete(entry.date)}
                        >
                          <Trash2 size={14} color={Colors.error} />
                          <Text style={styles.historyDeleteText}>Delete Entry</Text>
                        </Pressable>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </ReAnimated.View>
          )}

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
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
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
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
    alignItems: 'center',
  },
  headerRight: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(167, 139, 250, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(167, 139, 250, 0.1)',
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
    paddingHorizontal: Spacing.xl,
    lineHeight: 22,
  },

  // Section title
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Log card
  logCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },

  // Time pickers
  timePickersRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  timePickerContainer: {
    flex: 1,
  },
  timePickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  timePickerIcon: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timePickerLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
  },
  timePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  timeInputWrapper: {
    alignItems: 'center',
  },
  timeInput: {
    width: 40,
    height: 44,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.sm,
    textAlign: 'center',
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  timeLabel: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  timeSeparator: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.textSecondary,
    marginBottom: 14,
  },
  ampmToggle: {
    flexDirection: 'column',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.sm,
    padding: 2,
    marginLeft: Spacing.xs,
  },
  ampmOption: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.xs,
  },
  ampmOptionActive: {
    backgroundColor: '#A78BFA',
  },
  ampmText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.textTertiary,
  },
  ampmTextActive: {
    color: Colors.text,
  },

  // Quality
  qualityContainer: {
    marginTop: Spacing.lg,
    alignItems: 'center',
  },
  qualityLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  qualityRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  qualityButton: {
    padding: Spacing.xs,
  },
  qualityValueText: {
    fontSize: FontSize.sm,
    color: '#A78BFA',
    fontWeight: FontWeight.medium,
    marginTop: Spacing.xs,
  },

  // Notes
  notesContainer: {
    marginTop: Spacing.md,
  },
  notesInput: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
    minHeight: 48,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },

  // Log button
  logButton: {
    marginTop: Spacing.lg,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.button,
    shadowColor: '#7C3AED',
  },
  logButtonDisabled: {
    opacity: 0.6,
  },
  logButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  logButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  statValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  statUnit: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
  },
  statLabel: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: 2,
    textAlign: 'center',
  },

  // Chart
  chartCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  chartContainer: {
    alignItems: 'center',
  },
  axisText: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },
  referenceLineLabel: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },
  barTopLabel: {
    fontSize: 9,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.md,
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },

  // History
  historyCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  historyCardExpanded: {
    borderColor: 'rgba(167, 139, 250, 0.3)',
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  historyHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
    marginRight: Spacing.sm,
  },
  historyDateBadge: {
    backgroundColor: 'rgba(167, 139, 250, 0.15)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  historyDateText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: '#A78BFA',
  },
  historySummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  historySummary: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  historyMoonsRow: {
    flexDirection: 'row',
    gap: 2,
  },

  // History expanded details
  historyDetails: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  historyDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  historyDetailLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  historyDetailText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  historyDetailValue: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  historyNote: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    fontStyle: 'italic',
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  historyDeleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.errorSoft,
  },
  historyDeleteText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.error,
  },

  // Sleep Stages
  stagesCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.2)',
  },
  stagesSourceBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(167, 139, 250, 0.15)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
  },
  stagesSourceText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: '#A78BFA',
  },
  stagesTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  stagesTotalItem: {
    flex: 1,
    alignItems: 'center',
  },
  stagesTotalValue: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  stagesTotalLabel: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  stagesTotalDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.border,
  },
  stackedBarContainer: {
    marginBottom: Spacing.lg,
  },
  stackedBar: {
    flexDirection: 'row',
    height: 16,
    borderRadius: 8,
    overflow: 'hidden',
  },
  stackedSegment: {
    height: '100%',
  },
  stagesLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  stageLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    width: '46%',
    marginBottom: Spacing.xs,
  },
  stageLegendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  stageLegendInfo: {
    flex: 1,
  },
  stageLegendLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  stageLegendValue: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },

  bottomSpacer: {
    height: 120,
  },
});

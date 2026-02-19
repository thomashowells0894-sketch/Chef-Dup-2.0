import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
} from 'react-native';
import { useRouter } from 'expo-router';
import ReAnimated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  Ruler,
  TrendingDown,
  TrendingUp,
  Save,
  Trash2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius, Shadows, Gradients } from '../constants/theme';
import { hapticSuccess, hapticLight } from '../lib/haptics';
import useBodyMeasurements, { BODY_PARTS } from '../hooks/useBodyMeasurements';

const BODY_PART_LABELS = {
  chest: 'Chest',
  waist: 'Waist',
  hips: 'Hips',
  leftArm: 'L Arm',
  rightArm: 'R Arm',
  leftThigh: 'L Thigh',
  rightThigh: 'R Thigh',
  neck: 'Neck',
};

const BODY_PART_ICONS = {
  chest: Colors.primary,
  waist: Colors.secondary,
  hips: Colors.accentPurple,
  leftArm: Colors.success,
  rightArm: Colors.success,
  leftThigh: Colors.warning,
  rightThigh: Colors.warning,
  neck: Colors.carbs,
};

// Measurements where a decrease is generally favorable (cutting)
const DECREASE_FAVORABLE = ['waist', 'hips'];

function formatDate(isoString) {
  const d = new Date(isoString);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatShortDate(isoString) {
  const d = new Date(isoString);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getChangeFromLatest(latestMeasurements, part, currentValue) {
  if (!latestMeasurements || !latestMeasurements[part]) return null;
  const prev = parseFloat(latestMeasurements[part]);
  const curr = parseFloat(currentValue);
  if (isNaN(prev) || isNaN(curr) || prev === 0) return null;
  return parseFloat((curr - prev).toFixed(2));
}

export default function BodyMeasurementsScreen() {
  const router = useRouter();
  const {
    history,
    unit,
    addMeasurement,
    deleteMeasurement,
    getLatest,
    getChanges,
    setUnit,
    isLoading,
  } = useBodyMeasurements();

  // Form state for quick entry
  const [formValues, setFormValues] = useState({});
  const [noteValue, setNoteValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [expandedEntry, setExpandedEntry] = useState(null);

  // Pre-fill with latest values
  useEffect(() => {
    if (!isLoading) {
      const latest = getLatest();
      if (latest) {
        const prefilled = {};
        for (const part of BODY_PARTS) {
          prefilled[part] = latest.measurements[part] ? String(latest.measurements[part]) : '';
        }
        setFormValues(prefilled);
      } else {
        const empty = {};
        for (const part of BODY_PARTS) {
          empty[part] = '';
        }
        setFormValues(empty);
      }
    }
  }, [isLoading, history.length]);

  const latestEntry = useMemo(() => getLatest(), [getLatest]);
  const changes = useMemo(() => getChanges(), [getChanges]);

  const handleUpdateField = useCallback((part, value) => {
    // Only allow numbers and decimal point
    const cleaned = value.replace(/[^0-9.]/g, '');
    setFormValues((prev) => ({ ...prev, [part]: cleaned }));
  }, []);

  const handleSave = useCallback(async () => {
    // Validate at least one measurement is entered
    const hasValues = Object.values(formValues).some((v) => v && parseFloat(v) > 0);
    if (!hasValues) {
      Alert.alert('No Measurements', 'Please enter at least one body measurement.');
      return;
    }

    setIsSaving(true);
    try {
      const measurements = {};
      for (const part of BODY_PARTS) {
        const val = parseFloat(formValues[part]);
        measurements[part] = !isNaN(val) && val > 0 ? val : null;
      }
      await addMeasurement(measurements, noteValue.trim());
      await hapticSuccess();
      setNoteValue('');
    } catch {
      Alert.alert('Save Failed', 'Could not save your measurements. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [formValues, noteValue, addMeasurement]);

  const handleDelete = useCallback(
    (date) => {
      Alert.alert(
        'Delete Entry',
        'Are you sure you want to delete this measurement entry?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              await deleteMeasurement(date);
              await hapticLight();
            },
          },
        ]
      );
    },
    [deleteMeasurement]
  );

  const handleToggleUnit = useCallback(async () => {
    await hapticLight();
    const newUnit = unit === 'cm' ? 'in' : 'cm';
    await setUnit(newUnit);
  }, [unit, setUnit]);

  const handleToggleExpand = useCallback(
    (date) => {
      hapticLight();
      setExpandedEntry((prev) => (prev === date ? null : date));
    },
    []
  );

  if (isLoading) {
    return (
      <ScreenWrapper>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading measurements...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  const hasHistory = history.length > 0;

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
          <Text style={styles.title}>Body Measurements</Text>
          <Pressable style={styles.unitToggle} onPress={handleToggleUnit}>
            <View style={[styles.unitOption, unit === 'cm' && styles.unitOptionActive]}>
              <Text style={[styles.unitText, unit === 'cm' && styles.unitTextActive]}>cm</Text>
            </View>
            <View style={[styles.unitOption, unit === 'in' && styles.unitOptionActive]}>
              <Text style={[styles.unitText, unit === 'in' && styles.unitTextActive]}>in</Text>
            </View>
          </Pressable>
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
                <Ruler size={48} color={Colors.textTertiary} />
              </View>
              <Text style={styles.emptyTitle}>Track Your Body Changes</Text>
              <Text style={styles.emptySubtitle}>
                Take your first measurements to start tracking your body composition over time
              </Text>
            </ReAnimated.View>
          )}

          {/* Quick Entry Section */}
          <ReAnimated.View entering={FadeInDown.delay(hasHistory ? 80 : 200).springify().mass(0.5).damping(10)}>
            <Text style={styles.sectionTitle}>Measurements</Text>
            <View style={styles.inputGrid}>
              {BODY_PARTS.map((part, index) => {
                const change = latestEntry
                  ? getChangeFromLatest(latestEntry.measurements, part, formValues[part])
                  : null;
                const isFavorable = change !== null
                  ? DECREASE_FAVORABLE.includes(part)
                    ? change < 0
                    : change > 0
                  : null;

                return (
                  <View key={part} style={styles.inputCard}>
                    <View style={styles.inputCardHeader}>
                      <View style={[styles.inputDot, { backgroundColor: BODY_PART_ICONS[part] }]} />
                      <Text style={styles.inputLabel}>{BODY_PART_LABELS[part]}</Text>
                      {change !== null && change !== 0 && (
                        <View style={[styles.changeBadge, { backgroundColor: isFavorable ? Colors.successSoft : Colors.errorSoft }]}>
                          {change < 0 ? (
                            <TrendingDown size={10} color={isFavorable ? Colors.success : Colors.error} />
                          ) : (
                            <TrendingUp size={10} color={isFavorable ? Colors.success : Colors.error} />
                          )}
                          <Text style={[styles.changeText, { color: isFavorable ? Colors.success : Colors.error }]}>
                            {change > 0 ? '+' : ''}{change}
                          </Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.inputFieldRow}>
                      <TextInput
                        style={styles.inputField}
                        value={formValues[part] || ''}
                        onChangeText={(v) => handleUpdateField(part, v)}
                        placeholder="0.0"
                        placeholderTextColor={Colors.textTertiary}
                        keyboardType="decimal-pad"
                        returnKeyType="done"
                      />
                      <Text style={styles.unitSuffix}>{unit}</Text>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Note input */}
            <View style={styles.noteContainer}>
              <TextInput
                style={styles.noteInput}
                value={noteValue}
                onChangeText={setNoteValue}
                placeholder="Add a note (optional)..."
                placeholderTextColor={Colors.textTertiary}
                maxLength={120}
              />
            </View>

            {/* Save Button */}
            <Pressable
              style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={isSaving}
            >
              <LinearGradient
                colors={isSaving ? Gradients.disabled : Gradients.primary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.saveButtonGradient}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color={Colors.text} />
                ) : (
                  <>
                    <Save size={20} color={Colors.background} />
                    <Text style={styles.saveButtonText}>Save Measurements</Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>
          </ReAnimated.View>

          {/* Changes Overview */}
          {changes && (
            <ReAnimated.View entering={FadeInDown.delay(160).springify().mass(0.5).damping(10)}>
              <Text style={styles.sectionTitle}>Changes Overview</Text>
              <View style={styles.changesCard}>
                <Text style={styles.changesSubtitle}>First entry to latest</Text>
                {BODY_PARTS.map((part) => {
                  const change = changes[part];
                  if (change === null || change === undefined) return null;

                  const isFavorable = DECREASE_FAVORABLE.includes(part)
                    ? change < 0
                    : change > 0;
                  const absChange = Math.abs(change);
                  // Max bar width based on max change for relative sizing
                  const maxChange = Math.max(
                    ...Object.values(changes).filter((v) => v !== null).map((v) => Math.abs(v)),
                    1
                  );
                  const barWidth = Math.min((absChange / maxChange) * 100, 100);

                  return (
                    <View key={part} style={styles.changeRow}>
                      <View style={styles.changeRowLabel}>
                        <View style={[styles.inputDot, { backgroundColor: BODY_PART_ICONS[part] }]} />
                        <Text style={styles.changeRowText}>{BODY_PART_LABELS[part]}</Text>
                      </View>
                      <View style={styles.changeBarContainer}>
                        <View
                          style={[
                            styles.changeBar,
                            {
                              width: `${barWidth}%`,
                              backgroundColor: change === 0
                                ? Colors.textTertiary
                                : isFavorable
                                  ? Colors.success
                                  : Colors.error,
                            },
                          ]}
                        />
                      </View>
                      <Text
                        style={[
                          styles.changeRowValue,
                          {
                            color: change === 0
                              ? Colors.textTertiary
                              : isFavorable
                                ? Colors.success
                                : Colors.error,
                          },
                        ]}
                      >
                        {change > 0 ? '+' : ''}{change} {unit}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </ReAnimated.View>
          )}

          {/* History Timeline */}
          {hasHistory && (
            <ReAnimated.View entering={FadeInDown.delay(240).springify().mass(0.5).damping(10)}>
              <Text style={styles.sectionTitle}>History</Text>
              {history.map((entry, index) => {
                const isExpanded = expandedEntry === entry.date;
                const measurements = entry.measurements;
                // Quick summary: show key measurements
                const summaryParts = [];
                if (measurements.chest) summaryParts.push(`Chest: ${measurements.chest}`);
                if (measurements.waist) summaryParts.push(`Waist: ${measurements.waist}`);
                if (measurements.hips) summaryParts.push(`Hips: ${measurements.hips}`);
                const summaryText = summaryParts.length > 0
                  ? summaryParts.join('  |  ')
                  : 'No key measurements';

                return (
                  <Pressable
                    key={entry.date}
                    style={[styles.historyCard, isExpanded && styles.historyCardExpanded]}
                    onPress={() => handleToggleExpand(entry.date)}
                    onLongPress={() => handleDelete(entry.date)}
                  >
                    <View style={styles.historyHeader}>
                      <View style={styles.historyHeaderLeft}>
                        <View style={styles.historyDateBadge}>
                          <Text style={styles.historyDateText}>{formatShortDate(entry.date)}</Text>
                        </View>
                        {!isExpanded && (
                          <Text style={styles.historySummary} numberOfLines={1}>
                            {summaryText}
                          </Text>
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
                        {BODY_PARTS.map((part) => {
                          const val = measurements[part];
                          if (!val) return null;
                          return (
                            <View key={part} style={styles.historyDetailRow}>
                              <View style={styles.historyDetailLabel}>
                                <View style={[styles.inputDotSmall, { backgroundColor: BODY_PART_ICONS[part] }]} />
                                <Text style={styles.historyDetailText}>{BODY_PART_LABELS[part]}</Text>
                              </View>
                              <Text style={styles.historyDetailValue}>{val} {unit}</Text>
                            </View>
                          );
                        })}
                        {entry.note ? (
                          <Text style={styles.historyNote}>{entry.note}</Text>
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
  title: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  unitToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceGlass,
    borderRadius: BorderRadius.full,
    padding: 3,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  unitOption: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
  },
  unitOptionActive: {
    backgroundColor: Colors.primary,
  },
  unitText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textTertiary,
  },
  unitTextActive: {
    color: Colors.background,
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
    backgroundColor: Colors.surfaceGlass,
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

  // Input grid
  inputGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  inputCard: {
    width: '48.5%',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  inputCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  inputDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  inputLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
    flex: 1,
  },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  changeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  inputFieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputField: {
    flex: 1,
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    padding: 0,
  },
  unitSuffix: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    marginLeft: Spacing.xs,
  },

  // Note
  noteContainer: {
    marginTop: Spacing.md,
  },
  noteInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },

  // Save button
  saveButton: {
    marginTop: Spacing.lg,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.button,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  saveButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.background,
  },

  // Changes overview
  changesCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  changesSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  changeRowLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    width: 80,
  },
  changeRowText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  changeBarContainer: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 3,
    marginHorizontal: Spacing.sm,
    overflow: 'hidden',
  },
  changeBar: {
    height: '100%',
    borderRadius: 3,
  },
  changeRowValue: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    width: 64,
    textAlign: 'right',
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
    borderColor: Colors.primary + '30',
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
    backgroundColor: Colors.primarySoft,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  historyDateText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },
  historySummary: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    flex: 1,
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
  inputDotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
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

  bottomSpacer: {
    height: 120,
  },
});

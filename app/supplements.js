import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import ReAnimated, { FadeInDown } from 'react-native-reanimated';
import {
  Pill,
  ArrowLeft,
  Plus,
  Check,
  X,
  Trash2,
  ChevronDown,
  Clock,
  TrendingUp,
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
import { hapticLight, hapticSuccess, hapticWarning } from '../lib/haptics';
import useSupplements from '../hooks/useSupplements';

const EMOJI_OPTIONS = [
  '\uD83D\uDC8A', '\u2600\uFE0F', '\uD83D\uDC1F', '\uD83E\uDDEA', '\uD83D\uDCAA',
  '\uD83E\uDD5B', '\uD83D\uDEE1\uFE0F', '\u26A1', '\uD83E\uDDCA', '\uD83C\uDF3F',
  '\uD83C\uDF4A', '\uD83E\uDD66', '\uD83C\uDF52', '\uD83E\uDDC2', '\uD83C\uDF75',
  '\uD83E\uDDC1', '\uD83C\uDF4B', '\u2764\uFE0F', '\uD83E\uDDB4', '\uD83E\uDDE0',
  '\uD83D\uDC41\uFE0F', '\uD83D\uDE34', '\uD83C\uDFCB\uFE0F', '\uD83C\uDF43',
];

const UNIT_OPTIONS = ['mg', 'g', 'ml', 'IU', 'mcg', 'tablet', 'capsule', 'scoop'];

const COLOR_OPTIONS = [
  '#00D4FF', '#FF6B35', '#00E676', '#FFB300', '#BF5AF2',
  '#FF6B9D', '#64D2FF', '#FFD700', '#FF5252', '#14B8A6',
];

const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
];

// Supplement Card Component
function SupplementCard({ supplement, isTaken, takenAt, onToggle, onEdit, onDelete, index }) {
  const handleToggle = async () => {
    if (!isTaken) {
      await hapticSuccess();
    } else {
      await hapticLight();
    }
    onToggle(supplement.id);
  };

  const handleLongPress = () => {
    Alert.alert(
      supplement.name,
      'What would you like to do?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Edit', onPress: () => onEdit(supplement) },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete(supplement.id),
        },
      ]
    );
  };

  const timeLabel = supplement.times && supplement.times.length > 0
    ? supplement.times[0]
    : '';

  return (
    <ReAnimated.View entering={FadeInDown.delay(index * 60).springify().mass(0.5).damping(10)}>
      <Pressable onPress={handleToggle} onLongPress={handleLongPress}>
        <LinearGradient
          colors={[
            isTaken ? 'rgba(0, 230, 118, 0.08)' : (supplement.color || '#00D4FF') + '10',
            isTaken ? 'rgba(0, 230, 118, 0.02)' : (supplement.color || '#00D4FF') + '05',
          ]}
          style={[
            styles.supplementCard,
            {
              borderColor: isTaken
                ? 'rgba(0, 230, 118, 0.25)'
                : (supplement.color || '#00D4FF') + '25',
            },
          ]}
        >
          {/* Checkbox */}
          <View
            style={[
              styles.checkbox,
              isTaken && styles.checkboxChecked,
              !isTaken && { borderColor: (supplement.color || '#00D4FF') + '60' },
            ]}
          >
            {isTaken && <Check size={14} color={Colors.background} strokeWidth={3} />}
          </View>

          {/* Emoji */}
          <Text style={styles.supplementEmoji}>{supplement.emoji}</Text>

          {/* Info */}
          <View style={styles.supplementInfo}>
            <Text
              style={[
                styles.supplementName,
                isTaken && styles.supplementNameTaken,
              ]}
            >
              {supplement.name}
            </Text>
            <Text style={styles.supplementDosage}>
              {supplement.dosage} {supplement.unit}
            </Text>
          </View>

          {/* Time / Taken indicator */}
          <View style={styles.supplementRight}>
            {isTaken ? (
              <View style={styles.takenBadge}>
                <Check size={12} color={Colors.success} />
                <Text style={styles.takenText}>Done</Text>
              </View>
            ) : (
              timeLabel ? (
                <View style={styles.timeBadge}>
                  <Clock size={12} color={Colors.textTertiary} />
                  <Text style={styles.timeText}>{timeLabel}</Text>
                </View>
              ) : null
            )}
          </View>
        </LinearGradient>
      </Pressable>
    </ReAnimated.View>
  );
}

// Progress Bar Component
function ProgressBar({ taken, total }) {
  const percentage = total > 0 ? (taken / total) * 100 : 0;

  return (
    <ReAnimated.View entering={FadeInDown.delay(0).springify().mass(0.5).damping(10)}>
      <LinearGradient
        colors={['rgba(0, 230, 118, 0.08)', 'rgba(0, 230, 118, 0.02)']}
        style={styles.progressContainer}
      >
        <View style={styles.progressHeader}>
          <View style={styles.progressTitleRow}>
            <Pill size={18} color={Colors.success} />
            <Text style={styles.progressTitle}>Today's Progress</Text>
          </View>
          <Text style={styles.progressCount}>
            {taken}/{total}
          </Text>
        </View>
        <View style={styles.progressTrack}>
          <LinearGradient
            colors={['#00E676', '#00C853']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.progressFill, { width: `${Math.min(percentage, 100)}%` }]}
          />
        </View>
        <Text style={styles.progressPercentage}>
          {Math.round(percentage)}% complete
        </Text>
      </LinearGradient>
    </ReAnimated.View>
  );
}

// Compliance Card Component
function ComplianceCard({ rate }) {
  const getComplianceColor = () => {
    if (rate >= 80) return Colors.success;
    if (rate >= 50) return Colors.warning;
    return Colors.error;
  };

  const complianceColor = getComplianceColor();

  return (
    <ReAnimated.View entering={FadeInDown.delay(100).springify().mass(0.5).damping(10)}>
      <LinearGradient
        colors={[complianceColor + '10', complianceColor + '05']}
        style={[styles.complianceCard, { borderColor: complianceColor + '25' }]}
      >
        <View style={styles.complianceHeader}>
          <TrendingUp size={18} color={complianceColor} />
          <Text style={styles.complianceTitle}>Adherence</Text>
        </View>
        <View style={styles.complianceContent}>
          <Text style={[styles.complianceRate, { color: complianceColor }]}>
            {rate}%
          </Text>
          <Text style={styles.complianceLabel}>Today's Compliance</Text>
        </View>
      </LinearGradient>
    </ReAnimated.View>
  );
}

// Add/Edit Modal
function SupplementModal({ visible, onClose, onSave, editingSupplement }) {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('\uD83D\uDC8A');
  const [dosage, setDosage] = useState('');
  const [unit, setUnit] = useState('mg');
  const [frequency, setFrequency] = useState('daily');
  const [time, setTime] = useState('08:00');
  const [color, setColor] = useState('#00D4FF');
  const [showUnitPicker, setShowUnitPicker] = useState(false);

  // Reset form when modal opens
  React.useEffect(() => {
    if (visible) {
      if (editingSupplement) {
        setName(editingSupplement.name || '');
        setEmoji(editingSupplement.emoji || '\uD83D\uDC8A');
        setDosage(editingSupplement.dosage || '');
        setUnit(editingSupplement.unit || 'mg');
        setFrequency(editingSupplement.frequency || 'daily');
        setTime(
          editingSupplement.times && editingSupplement.times.length > 0
            ? editingSupplement.times[0]
            : '08:00'
        );
        setColor(editingSupplement.color || '#00D4FF');
      } else {
        setName('');
        setEmoji('\uD83D\uDC8A');
        setDosage('');
        setUnit('mg');
        setFrequency('daily');
        setTime('08:00');
        setColor('#00D4FF');
      }
    }
  }, [visible, editingSupplement]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Missing Name', 'Please enter a supplement name.');
      return;
    }
    await hapticSuccess();
    onSave({
      name: name.trim(),
      emoji,
      dosage: dosage || '1',
      unit,
      frequency,
      times: [time],
      color,
    });
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <BlurView intensity={40} tint="dark" style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={onClose} />
          <View style={styles.modalContainer}>
            <LinearGradient
              colors={Gradients.card}
              style={styles.modalGradient}
            >
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingSupplement ? 'Edit Supplement' : 'Add Supplement'}
                </Text>
                <Pressable onPress={onClose} style={styles.modalCloseButton}>
                  <X size={22} color={Colors.textSecondary} />
                </Pressable>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                style={styles.modalScroll}
                contentContainerStyle={styles.modalScrollContent}
                keyboardShouldPersistTaps="handled"
              >
                {/* Name Input */}
                <Text style={styles.fieldLabel}>Name</Text>
                <View style={styles.textInputContainer}>
                  <TextInput
                    style={styles.textInput}
                    value={name}
                    onChangeText={setName}
                    placeholder="e.g. Vitamin D"
                    placeholderTextColor={Colors.textTertiary}
                    maxLength={30}
                  />
                </View>

                {/* Emoji Picker */}
                <Text style={styles.fieldLabel}>Icon</Text>
                <View style={styles.emojiGrid}>
                  {EMOJI_OPTIONS.map((e, i) => (
                    <Pressable
                      key={i}
                      style={[
                        styles.emojiOption,
                        emoji === e && styles.emojiOptionSelected,
                      ]}
                      onPress={() => {
                        hapticLight();
                        setEmoji(e);
                      }}
                    >
                      <Text style={styles.emojiText}>{e}</Text>
                    </Pressable>
                  ))}
                </View>

                {/* Dosage & Unit Row */}
                <Text style={styles.fieldLabel}>Dosage</Text>
                <View style={styles.dosageRow}>
                  <View style={[styles.textInputContainer, { flex: 1 }]}>
                    <TextInput
                      style={styles.textInput}
                      value={dosage}
                      onChangeText={setDosage}
                      placeholder="Amount"
                      placeholderTextColor={Colors.textTertiary}
                      keyboardType="decimal-pad"
                    />
                  </View>
                  <Pressable
                    style={styles.unitButton}
                    onPress={() => setShowUnitPicker(!showUnitPicker)}
                  >
                    <Text style={styles.unitButtonText}>{unit}</Text>
                    <ChevronDown
                      size={16}
                      color={Colors.textSecondary}
                      style={{
                        transform: [{ rotate: showUnitPicker ? '180deg' : '0deg' }],
                      }}
                    />
                  </Pressable>
                </View>

                {/* Unit Picker */}
                {showUnitPicker && (
                  <View style={styles.unitPickerContainer}>
                    {UNIT_OPTIONS.map((u) => (
                      <Pressable
                        key={u}
                        style={[
                          styles.unitOption,
                          unit === u && styles.unitOptionSelected,
                        ]}
                        onPress={() => {
                          hapticLight();
                          setUnit(u);
                          setShowUnitPicker(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.unitOptionText,
                            unit === u && styles.unitOptionTextSelected,
                          ]}
                        >
                          {u}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}

                {/* Frequency */}
                <Text style={styles.fieldLabel}>Frequency</Text>
                <View style={styles.frequencyRow}>
                  {FREQUENCY_OPTIONS.map((opt) => (
                    <Pressable
                      key={opt.value}
                      style={[
                        styles.frequencyOption,
                        frequency === opt.value && styles.frequencyOptionSelected,
                      ]}
                      onPress={() => {
                        hapticLight();
                        setFrequency(opt.value);
                      }}
                    >
                      <Text
                        style={[
                          styles.frequencyOptionText,
                          frequency === opt.value && styles.frequencyOptionTextSelected,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {/* Reminder Time */}
                <Text style={styles.fieldLabel}>Reminder Time</Text>
                <View style={styles.textInputContainer}>
                  <Clock size={16} color={Colors.textTertiary} style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.textInput}
                    value={time}
                    onChangeText={setTime}
                    placeholder="08:00"
                    placeholderTextColor={Colors.textTertiary}
                  />
                </View>

                {/* Color Picker */}
                <Text style={styles.fieldLabel}>Accent Color</Text>
                <View style={styles.colorGrid}>
                  {COLOR_OPTIONS.map((c) => (
                    <Pressable
                      key={c}
                      style={[
                        styles.colorOption,
                        { backgroundColor: c },
                        color === c && styles.colorOptionSelected,
                      ]}
                      onPress={() => {
                        hapticLight();
                        setColor(c);
                      }}
                    >
                      {color === c && (
                        <Check size={16} color={Colors.background} strokeWidth={3} />
                      )}
                    </Pressable>
                  ))}
                </View>
              </ScrollView>

              {/* Save Button */}
              <Pressable style={styles.saveButton} onPress={handleSave}>
                <LinearGradient
                  colors={['#00D4FF', '#0099CC']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.saveButtonGradient}
                >
                  <Check size={20} color={Colors.background} />
                  <Text style={styles.saveButtonText}>
                    {editingSupplement ? 'Save Changes' : 'Add Supplement'}
                  </Text>
                </LinearGradient>
              </Pressable>
            </LinearGradient>
          </View>
        </BlurView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// Main Supplements Screen
export default function SupplementsScreen() {
  const {
    supplements,
    todayLog,
    isLoading,
    addSupplement,
    removeSupplement,
    editSupplement,
    toggleTaken,
    getComplianceRate,
    getTodayProgress,
  } = useSupplements();

  const [modalVisible, setModalVisible] = useState(false);
  const [editingSupplement, setEditingSupplement] = useState(null);

  const { taken, total } = useMemo(() => getTodayProgress(), [getTodayProgress]);
  const complianceRate = useMemo(() => getComplianceRate(), [getComplianceRate]);

  const handleAddPress = useCallback(async () => {
    await hapticLight();
    setEditingSupplement(null);
    setModalVisible(true);
  }, []);

  const handleEditPress = useCallback(async (supplement) => {
    await hapticLight();
    setEditingSupplement(supplement);
    setModalVisible(true);
  }, []);

  const handleDeletePress = useCallback(
    async (id) => {
      await hapticWarning();
      Alert.alert(
        'Remove Supplement',
        'Are you sure you want to remove this supplement?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: () => removeSupplement(id),
          },
        ]
      );
    },
    [removeSupplement]
  );

  const handleSave = useCallback(
    async (data) => {
      if (editingSupplement) {
        await editSupplement(editingSupplement.id, data);
      } else {
        const success = await addSupplement(data);
        if (!success) {
          Alert.alert(
            'Limit Reached',
            `You can track up to ${20} supplements. Remove one to add more.`
          );
        }
      }
    },
    [editingSupplement, editSupplement, addSupplement]
  );

  const handleCloseModal = useCallback(() => {
    setModalVisible(false);
    setEditingSupplement(null);
  }, []);

  if (isLoading) {
    return (
      <ScreenWrapper>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading supplements...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
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
          <Pill size={22} color={Colors.primary} />
          <Text style={styles.title}>Supplements</Text>
        </ReAnimated.View>

        {/* Progress Bar */}
        {total > 0 && <ProgressBar taken={taken} total={total} />}

        {/* Compliance Card */}
        {total > 0 && <ComplianceCard rate={complianceRate} />}

        {/* Supplements List */}
        <View style={styles.listSection}>
          <Text style={styles.sectionTitle}>
            Today's Supplements
          </Text>

          {supplements.length === 0 ? (
            <ReAnimated.View entering={FadeInDown.delay(100).springify().mass(0.5).damping(10)}>
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>{'\uD83D\uDC8A'}</Text>
                <Text style={styles.emptyTitle}>No Supplements</Text>
                <Text style={styles.emptySubtitle}>
                  Add your vitamins and supplements to track daily intake
                </Text>
              </View>
            </ReAnimated.View>
          ) : (
            supplements.map((supplement, index) => (
              <SupplementCard
                key={supplement.id}
                supplement={supplement}
                isTaken={
                  todayLog[supplement.id] && todayLog[supplement.id].taken
                }
                takenAt={
                  todayLog[supplement.id]
                    ? todayLog[supplement.id].takenAt
                    : null
                }
                onToggle={toggleTaken}
                onEdit={handleEditPress}
                onDelete={handleDeletePress}
                index={index + 2}
              />
            ))
          )}
        </View>

        {/* Add Button */}
        <ReAnimated.View
          entering={FadeInDown.delay(
            Math.min(supplements.length * 60 + 200, 800)
          )
            .springify()
            .mass(0.5)
            .damping(10)}
        >
          <Pressable style={styles.addButton} onPress={handleAddPress}>
            <LinearGradient
              colors={['rgba(0, 212, 255, 0.15)', 'rgba(0, 212, 255, 0.05)']}
              style={styles.addButtonGradient}
            >
              <View style={styles.addButtonIcon}>
                <Plus size={20} color={Colors.primary} />
              </View>
              <Text style={styles.addButtonText}>Add Supplement</Text>
            </LinearGradient>
          </Pressable>
        </ReAnimated.View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Add/Edit Modal */}
      <SupplementModal
        visible={modalVisible}
        onClose={handleCloseModal}
        onSave={handleSave}
        editingSupplement={editingSupplement}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.xs,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },

  // Progress
  progressContainer: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.2)',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  progressTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  progressTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  progressCount: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.success,
  },
  progressTrack: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressPercentage: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: Spacing.xs,
    textAlign: 'right',
  },

  // Compliance Card
  complianceCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
  },
  complianceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  complianceTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
  },
  complianceContent: {
    alignItems: 'center',
  },
  complianceRate: {
    fontSize: 40,
    fontWeight: FontWeight.bold,
  },
  complianceLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },

  // Section
  listSection: {
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Supplement Card
  supplementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
    borderWidth: 1,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  checkboxChecked: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  supplementEmoji: {
    fontSize: 24,
    marginRight: Spacing.sm,
  },
  supplementInfo: {
    flex: 1,
  },
  supplementName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  supplementNameTaken: {
    color: Colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  supplementDosage: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  supplementRight: {
    marginLeft: Spacing.sm,
  },
  takenBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.successSoft,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  takenText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.success,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  timeText: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderStyle: 'dashed',
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  emptySubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.xl,
  },

  // Add Button
  addButton: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.primary + '30',
    borderStyle: 'dashed',
  },
  addButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  addButtonIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },

  bottomSpacer: {
    height: 100,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
  },
  modalContainer: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    overflow: 'hidden',
    maxHeight: '85%',
  },
  modalGradient: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingBottom: Spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  modalTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalScroll: {
    maxHeight: 420,
    paddingHorizontal: Spacing.lg,
  },
  modalScrollContent: {
    paddingBottom: Spacing.md,
  },

  // Form Fields
  fieldLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  textInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  textInput: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.text,
    paddingVertical: Spacing.sm + 2,
  },

  // Emoji Grid
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  emojiOption: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  emojiOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primarySoft,
  },
  emojiText: {
    fontSize: 22,
  },

  // Dosage Row
  dosageRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  unitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderWidth: 1,
    borderColor: Colors.border,
    minWidth: 80,
    justifyContent: 'center',
  },
  unitButtonText: {
    fontSize: FontSize.md,
    color: Colors.text,
    fontWeight: FontWeight.medium,
  },

  // Unit Picker
  unitPickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  unitOption: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  unitOptionSelected: {
    backgroundColor: Colors.primarySoft,
  },
  unitOptionText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  unitOptionTextSelected: {
    color: Colors.primary,
  },

  // Frequency
  frequencyRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  frequencyOption: {
    flex: 1,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  frequencyOptionSelected: {
    backgroundColor: Colors.primarySoft,
    borderColor: Colors.primary + '50',
  },
  frequencyOptionText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  frequencyOptionTextSelected: {
    color: Colors.primary,
  },

  // Color Grid
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  colorOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorOptionSelected: {
    borderColor: Colors.text,
  },

  // Save Button
  saveButton: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.glowPrimary,
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  saveButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.background,
  },
});

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from 'react-native';
import ReAnimated, { FadeInDown } from 'react-native-reanimated';
import { X, Calendar, ArrowRight, Sun, Copy, Check, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../constants/theme';
import { hapticSuccess, hapticLight } from '../lib/haptics';
import { format, addDays, subDays, isToday, isTomorrow, isYesterday } from 'date-fns';

const MEAL_LABELS = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snacks: 'Snacks',
};

/**
 * CopyMealModal - Bottom sheet for selecting a destination date when copying meals.
 *
 * Props:
 *   visible       - whether the modal is shown
 *   onClose       - callback to close the modal
 *   onCopy        - callback(targetDateKey) when user picks a destination
 *   sourceDate    - the currently viewed date (Date object)
 *   mode          - 'meal' | 'day' — determines title text
 *   mealType      - (optional) the meal type being copied (for title)
 *   isCopying     - whether a copy operation is in progress
 *   itemCount     - number of items that will be copied (for subtitle)
 */
export default function CopyMealModal({
  visible,
  onClose,
  onCopy,
  sourceDate,
  mode = 'meal',
  mealType = null,
  isCopying = false,
  itemCount = 0,
}) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerDate, setPickerDate] = useState(() => addDays(new Date(), 1));
  const [copied, setCopied] = useState(false);
  const dismissTimerRef = useRef(null);

  // Reset state when modal opens; clean up timer on close/unmount
  useEffect(() => {
    if (visible) {
      setShowDatePicker(false);
      setCopied(false);
      setPickerDate(addDays(new Date(), 1));
    }
    return () => {
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
        dismissTimerRef.current = null;
      }
    };
  }, [visible]);

  const sourceDateKey = useMemo(
    () => (sourceDate ? format(sourceDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')),
    [sourceDate]
  );

  const isViewingToday = useMemo(() => (sourceDate ? isToday(sourceDate) : true), [sourceDate]);

  const title = useMemo(() => {
    if (mode === 'day') return 'Copy Entire Day';
    if (mealType && MEAL_LABELS[mealType]) return `Copy ${MEAL_LABELS[mealType]}`;
    return 'Copy Meal';
  }, [mode, mealType]);

  const subtitle = useMemo(() => {
    if (itemCount === 0) return 'No items to copy';
    const itemLabel = itemCount === 1 ? '1 item' : `${itemCount} items`;
    const sourceLabel = sourceDate
      ? isToday(sourceDate)
        ? 'from today'
        : isYesterday(sourceDate)
          ? 'from yesterday'
          : `from ${format(sourceDate, 'MMM d')}`
      : '';
    return `${itemLabel} ${sourceLabel}`;
  }, [itemCount, sourceDate]);

  const handleCopy = useCallback(
    async (targetDateKey) => {
      if (isCopying || copied) return;
      await hapticLight();
      await onCopy(targetDateKey);
      await hapticSuccess();
      setCopied(true);
      // Auto-dismiss after short delay
      dismissTimerRef.current = setTimeout(() => {
        dismissTimerRef.current = null;
        onClose();
      }, 600);
    },
    [isCopying, copied, onCopy, onClose]
  );

  const handlePickerDateChange = useCallback(
    (direction) => {
      hapticLight();
      setPickerDate((current) => (direction === 'next' ? addDays(current, 1) : subDays(current, 1)));
    },
    []
  );

  const handlePickerConfirm = useCallback(() => {
    const targetKey = format(pickerDate, 'yyyy-MM-dd');
    if (targetKey === sourceDateKey) return; // prevent copy to same day
    handleCopy(targetKey);
  }, [pickerDate, sourceDateKey, handleCopy]);

  const getDateOptionLabel = useCallback((date) => {
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'EEE, MMM d');
  }, []);

  const todayKey = format(new Date(), 'yyyy-MM-dd');
  const tomorrowKey = format(addDays(new Date(), 1), 'yyyy-MM-dd');

  // Quick options: "Copy to Today" (if not viewing today), "Copy to Tomorrow"
  const quickOptions = useMemo(() => {
    const options = [];
    if (!isViewingToday) {
      options.push({
        key: todayKey,
        label: 'Copy to Today',
        sublabel: format(new Date(), 'MMM d'),
        icon: Sun,
      });
    }
    if (tomorrowKey !== sourceDateKey) {
      options.push({
        key: tomorrowKey,
        label: 'Copy to Tomorrow',
        sublabel: format(addDays(new Date(), 1), 'MMM d'),
        icon: ArrowRight,
      });
    }
    return options;
  }, [isViewingToday, todayKey, tomorrowKey, sourceDateKey]);

  // Don't allow picking the source date itself in the date picker
  const pickerDateKey = format(pickerDate, 'yyyy-MM-dd');
  const isPickerDateSameAsSource = pickerDateKey === sourceDateKey;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <ReAnimated.View
          entering={FadeInDown.springify().damping(14)}
          style={styles.sheet}
          accessibilityViewIsModal={true}
          accessibilityLabel={title}
        >
          {/* Handle */}
          <View style={styles.handleBar} />

          {/* Close button */}
          <Pressable style={styles.closeButton} onPress={onClose} hitSlop={12}>
            <X size={20} color={Colors.textSecondary} />
          </Pressable>

          {/* Header */}
          <View style={styles.headerSection}>
            <Copy size={22} color={Colors.primary} />
            <Text style={styles.title}>{title}</Text>
          </View>
          <Text style={styles.subtitle}>{subtitle}</Text>

          {/* Copied confirmation */}
          {copied && (
            <ReAnimated.View entering={FadeInDown.duration(200)} style={styles.copiedBanner}>
              <Check size={18} color={Colors.success} />
              <Text style={styles.copiedText}>Copied successfully!</Text>
            </ReAnimated.View>
          )}

          {/* Quick destination options */}
          {!copied && !showDatePicker && (
            <View style={styles.optionsContainer}>
              {quickOptions.map((option) => {
                const IconComponent = option.icon;
                return (
                  <Pressable
                    key={option.key}
                    style={({ pressed }) => [styles.optionRow, pressed && styles.optionRowPressed]}
                    onPress={() => handleCopy(option.key)}
                    disabled={isCopying || itemCount === 0}
                  >
                    <View style={styles.optionIconContainer}>
                      <IconComponent size={18} color={Colors.primary} />
                    </View>
                    <View style={styles.optionTextContainer}>
                      <Text style={styles.optionLabel}>{option.label}</Text>
                      <Text style={styles.optionSublabel}>{option.sublabel}</Text>
                    </View>
                    {isCopying ? (
                      <ActivityIndicator size={16} color={Colors.primary} />
                    ) : (
                      <ArrowRight size={16} color={Colors.textTertiary} />
                    )}
                  </Pressable>
                );
              })}

              {/* Pick a date option */}
              <Pressable
                style={({ pressed }) => [styles.optionRow, pressed && styles.optionRowPressed]}
                onPress={() => {
                  hapticLight();
                  setShowDatePicker(true);
                }}
                disabled={isCopying || itemCount === 0}
              >
                <View style={styles.optionIconContainer}>
                  <Calendar size={18} color={Colors.secondary} />
                </View>
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionLabel}>Pick a Date</Text>
                  <Text style={styles.optionSublabel}>Choose any day</Text>
                </View>
                <ArrowRight size={16} color={Colors.textTertiary} />
              </Pressable>
            </View>
          )}

          {/* Inline date picker */}
          {!copied && showDatePicker && (
            <ReAnimated.View entering={FadeInDown.duration(200)} style={styles.datePickerContainer}>
              <View style={styles.datePickerRow}>
                <Pressable
                  style={styles.datePickerArrow}
                  onPress={() => handlePickerDateChange('prev')}
                  hitSlop={12}
                >
                  <ChevronLeft size={24} color={Colors.textSecondary} />
                </Pressable>
                <View style={styles.datePickerCenter}>
                  <Text style={styles.datePickerLabel}>{getDateOptionLabel(pickerDate)}</Text>
                  <Text style={styles.datePickerSublabel}>{format(pickerDate, 'EEEE, MMM d, yyyy')}</Text>
                </View>
                <Pressable
                  style={styles.datePickerArrow}
                  onPress={() => handlePickerDateChange('next')}
                  hitSlop={12}
                >
                  <ChevronRight size={24} color={Colors.textSecondary} />
                </Pressable>
              </View>

              {isPickerDateSameAsSource && (
                <Text style={styles.sameDataWarning}>Cannot copy to the same day</Text>
              )}

              <View style={styles.datePickerActions}>
                <Pressable
                  style={styles.datePickerBack}
                  onPress={() => {
                    hapticLight();
                    setShowDatePicker(false);
                  }}
                >
                  <Text style={styles.datePickerBackText}>Back</Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.datePickerConfirm,
                    (isPickerDateSameAsSource || itemCount === 0) && styles.datePickerConfirmDisabled,
                  ]}
                  onPress={handlePickerConfirm}
                  disabled={isPickerDateSameAsSource || isCopying || itemCount === 0}
                >
                  {isCopying ? (
                    <ActivityIndicator size={16} color={Colors.background} />
                  ) : (
                    <Text
                      style={[
                        styles.datePickerConfirmText,
                        (isPickerDateSameAsSource || itemCount === 0) && styles.datePickerConfirmTextDisabled,
                      ]}
                    >
                      Copy Here
                    </Text>
                  )}
                </Pressable>
              </View>
            </ReAnimated.View>
          )}
        </ReAnimated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.overlay,
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 40 : Spacing.lg,
    paddingTop: Spacing.md,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.textTertiary,
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  closeButton: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.lg,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceGlass,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  headerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  copiedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
    marginBottom: Spacing.md,
  },
  copiedText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.success,
  },
  optionsContainer: {
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.surfaceGlass,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  optionRowPressed: {
    backgroundColor: Colors.surfaceGlassLight,
  },
  optionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionTextContainer: {
    flex: 1,
  },
  optionLabel: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  optionSublabel: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  datePickerContainer: {
    marginBottom: Spacing.md,
  },
  datePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceGlass,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  datePickerArrow: {
    padding: Spacing.xs,
  },
  datePickerCenter: {
    alignItems: 'center',
    flex: 1,
  },
  datePickerLabel: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  datePickerSublabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  sameDataWarning: {
    fontSize: FontSize.xs,
    color: Colors.warning,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  datePickerActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  datePickerBack: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
  },
  datePickerBackText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
  },
  datePickerConfirm: {
    flex: 2,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  datePickerConfirmDisabled: {
    backgroundColor: Colors.surfaceElevated,
  },
  datePickerConfirmText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.background,
  },
  datePickerConfirmTextDisabled: {
    color: Colors.textTertiary,
  },
});

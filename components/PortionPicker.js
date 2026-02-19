/**
 * PortionPicker - Smart portion selector after choosing a food
 *
 * Features:
 * - Common portions (1 serving, 1 cup, 1 tablespoon, 100g, 1 piece)
 * - Numeric input with +/- buttons
 * - Visual slider for amount
 * - Real-time calorie update as portion changes
 * - "Log it" button with haptic feedback
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Modal,
  Dimensions,
} from 'react-native';
import {
  X,
  Plus,
  Minus,
  Check,
  Scale,
  ChevronDown,
} from 'lucide-react-native';
import Animated, {
  FadeInDown,
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import {
  GestureDetector,
  Gesture,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius, Shadows } from '../constants/theme';
import { hapticLight, hapticSuccess } from '../lib/haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SLIDER_WIDTH = SCREEN_WIDTH - Spacing.md * 2 - Spacing.lg * 2;
const SLIDER_PADDING = 24;
const TRACK_WIDTH = SLIDER_WIDTH - SLIDER_PADDING * 2;

// ---------------------------------------------------------------------------
// Common Portion Definitions
// ---------------------------------------------------------------------------

const COMMON_PORTIONS = [
  { label: '1 serving', multiplier: 1, unit: 'serving' },
  { label: '100g', multiplier: null, unit: 'g', grams: 100 },
  { label: '1 cup', multiplier: null, unit: 'cup', grams: 240 },
  { label: '1 tbsp', multiplier: null, unit: 'tbsp', grams: 15 },
  { label: '1 piece', multiplier: 1, unit: 'piece' },
  { label: 'Custom', multiplier: null, unit: 'custom' },
];

// ---------------------------------------------------------------------------
// Portion Chip
// ---------------------------------------------------------------------------

function PortionChip({ label, isSelected, onPress }) {
  return (
    <Pressable
      style={[
        styles.portionChip,
        isSelected && styles.portionChipSelected,
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.portionChipText,
          isSelected && styles.portionChipTextSelected,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Macro Bar
// ---------------------------------------------------------------------------

function MacroBar({ label, value, unit, color, total }) {
  const pct = total > 0 ? Math.min(100, (value / total) * 100) : 0;

  return (
    <View style={styles.macroBar}>
      <View style={styles.macroBarHeader}>
        <Text style={[styles.macroBarLabel, { color }]}>{label}</Text>
        <Text style={styles.macroBarValue}>
          {value}
          <Text style={styles.macroBarUnit}>{unit}</Text>
        </Text>
      </View>
      <View style={styles.macroBarTrack}>
        <Animated.View
          style={[
            styles.macroBarFill,
            { width: `${pct}%`, backgroundColor: color },
          ]}
        />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function PortionPicker({
  visible,
  food,
  mealType = 'breakfast',
  onConfirm,
  onClose,
}) {
  const [selectedPortion, setSelectedPortion] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [customGrams, setCustomGrams] = useState('');
  const sliderPosition = useSharedValue(0.5);

  // Base nutrition per serving
  const baseCalories = food?.calories || 0;
  const baseProtein = food?.protein || 0;
  const baseCarbs = food?.carbs || 0;
  const baseFat = food?.fat || 0;
  const baseServingSize = food?.servingSize || 100;

  // Reset state when food changes
  useEffect(() => {
    if (food) {
      setSelectedPortion(0);
      setQuantity(1);
      setCustomGrams('');
      sliderPosition.value = withSpring(0.5);
    }
  }, [food, sliderPosition]);

  // Calculate actual multiplier based on portion type and quantity
  const effectiveMultiplier = useMemo(() => {
    const portion = COMMON_PORTIONS[selectedPortion];
    if (!portion) return quantity;

    if (portion.unit === 'custom') {
      const grams = parseFloat(customGrams) || 0;
      return baseServingSize > 0 ? grams / baseServingSize : 0;
    }

    if (portion.grams && baseServingSize > 0) {
      return (portion.grams / baseServingSize) * quantity;
    }

    return (portion.multiplier || 1) * quantity;
  }, [selectedPortion, quantity, customGrams, baseServingSize]);

  // Calculated nutrition
  const calories = Math.round(baseCalories * effectiveMultiplier);
  const protein = Math.round(baseProtein * effectiveMultiplier * 10) / 10;
  const carbs = Math.round(baseCarbs * effectiveMultiplier * 10) / 10;
  const fat = Math.round(baseFat * effectiveMultiplier * 10) / 10;

  // Slider gesture
  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      const newPos = Math.max(0, Math.min(1, e.x / TRACK_WIDTH));
      sliderPosition.value = newPos;
    })
    .onEnd(() => {
      // Snap to nearest 0.25 increment
      const snapped = Math.round(sliderPosition.value * 20) / 20;
      sliderPosition.value = withSpring(snapped, { damping: 15, stiffness: 200 });
    });

  // Update quantity from slider
  useEffect(() => {
    const sliderVal = sliderPosition.value;
    // Map 0-1 to 0.25-5 servings
    const newQuantity = Math.max(0.25, Math.round(interpolate(
      sliderVal,
      [0, 1],
      [0.25, 5],
      Extrapolation.CLAMP,
    ) * 4) / 4);

    setQuantity(newQuantity);
  }, [sliderPosition.value]);

  const sliderThumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: sliderPosition.value * TRACK_WIDTH }],
  }));

  const sliderFillStyle = useAnimatedStyle(() => ({
    width: sliderPosition.value * TRACK_WIDTH,
  }));

  const handleIncrement = useCallback(() => {
    hapticLight();
    setQuantity((prev) => {
      const next = Math.min(10, prev + 0.25);
      sliderPosition.value = withSpring(
        interpolate(next, [0.25, 5], [0, 1], Extrapolation.CLAMP),
      );
      return next;
    });
  }, [sliderPosition]);

  const handleDecrement = useCallback(() => {
    hapticLight();
    setQuantity((prev) => {
      const next = Math.max(0.25, prev - 0.25);
      sliderPosition.value = withSpring(
        interpolate(next, [0.25, 5], [0, 1], Extrapolation.CLAMP),
      );
      return next;
    });
  }, [sliderPosition]);

  const handleConfirm = useCallback(() => {
    hapticSuccess();
    const portion = COMMON_PORTIONS[selectedPortion];
    const servingLabel = portion?.unit === 'custom'
      ? `${customGrams}g`
      : `${quantity} ${portion?.label || 'serving'}`;

    onConfirm?.({
      ...food,
      calories,
      protein,
      carbs,
      fat,
      serving: servingLabel,
      quantity,
    }, mealType);
  }, [food, calories, protein, carbs, fat, quantity, selectedPortion, customGrams, mealType, onConfirm]);

  if (!food) return null;

  const isCustom = COMMON_PORTIONS[selectedPortion]?.unit === 'custom';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <Animated.View entering={FadeInDown.duration(300)}>
            {/* Handle bar */}
            <View style={styles.handleBar} />

            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerInfo}>
                <Text style={styles.foodName} numberOfLines={2}>
                  {food.name}
                </Text>
                {food.brand && (
                  <Text style={styles.foodBrand}>{food.brand}</Text>
                )}
                <Text style={styles.servingInfo}>
                  Per {food.serving || '1 serving'}
                </Text>
              </View>
              <Pressable style={styles.closeButton} onPress={onClose}>
                <X size={20} color={Colors.textSecondary} />
              </Pressable>
            </View>

            {/* Calorie display (large, updates in real-time) */}
            <Animated.View entering={FadeIn.duration(400)} style={styles.calorieDisplay}>
              <Text style={styles.calorieValue}>{calories}</Text>
              <Text style={styles.calorieUnit}>kcal</Text>
            </Animated.View>

            {/* Macro bars */}
            <View style={styles.macros}>
              <MacroBar
                label="Protein"
                value={protein}
                unit="g"
                color={Colors.protein}
                total={protein + carbs + fat}
              />
              <MacroBar
                label="Carbs"
                value={carbs}
                unit="g"
                color={Colors.carbs}
                total={protein + carbs + fat}
              />
              <MacroBar
                label="Fat"
                value={fat}
                unit="g"
                color={Colors.fat}
                total={protein + carbs + fat}
              />
            </View>

            {/* Portion selector */}
            <Text style={styles.portionLabel}>Portion Size</Text>
            <View style={styles.portionChips}>
              {COMMON_PORTIONS.map((portion, index) => (
                <PortionChip
                  key={portion.label}
                  label={portion.label}
                  isSelected={selectedPortion === index}
                  onPress={() => {
                    hapticLight();
                    setSelectedPortion(index);
                  }}
                />
              ))}
            </View>

            {/* Custom grams input */}
            {isCustom && (
              <View style={styles.customInputRow}>
                <Scale size={16} color={Colors.textSecondary} />
                <TextInput
                  style={styles.customInput}
                  placeholder="Enter grams"
                  placeholderTextColor={Colors.textTertiary}
                  value={customGrams}
                  onChangeText={setCustomGrams}
                  keyboardType="numeric"
                  maxLength={6}
                  autoFocus
                />
                <Text style={styles.customUnit}>g</Text>
              </View>
            )}

            {/* Quantity controls (hidden for custom) */}
            {!isCustom && (
              <View style={styles.quantitySection}>
                <View style={styles.quantityControls}>
                  <Pressable
                    style={styles.quantityButton}
                    onPress={handleDecrement}
                    disabled={quantity <= 0.25}
                  >
                    <Minus size={20} color={quantity <= 0.25 ? Colors.textTertiary : Colors.text} />
                  </Pressable>

                  <View style={styles.quantityDisplay}>
                    <Text style={styles.quantityValue}>{quantity}</Text>
                  </View>

                  <Pressable
                    style={styles.quantityButton}
                    onPress={handleIncrement}
                    disabled={quantity >= 10}
                  >
                    <Plus size={20} color={quantity >= 10 ? Colors.textTertiary : Colors.text} />
                  </Pressable>
                </View>

                {/* Visual slider */}
                <GestureHandlerRootView style={styles.sliderContainer}>
                  <GestureDetector gesture={panGesture}>
                    <View style={styles.sliderTrack}>
                      <Animated.View style={[styles.sliderFill, sliderFillStyle]} />
                      <Animated.View style={[styles.sliderThumb, sliderThumbStyle]} />
                    </View>
                  </GestureDetector>
                  <View style={styles.sliderLabels}>
                    <Text style={styles.sliderLabel}>0.25</Text>
                    <Text style={styles.sliderLabel}>5</Text>
                  </View>
                </GestureHandlerRootView>
              </View>
            )}

            {/* Log it button */}
            <Pressable style={styles.logButton} onPress={handleConfirm}>
              <Check size={20} color="#fff" />
              <Text style={styles.logButtonText}>
                Log {calories} kcal
              </Text>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: Colors.overlay,
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
    maxHeight: '85%',
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.textTertiary,
    alignSelf: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  headerInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  foodName: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  foodBrand: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  servingInfo: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    marginTop: 4,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Calorie display
  calorieDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  calorieValue: {
    fontSize: 48,
    fontWeight: FontWeight.black,
    color: Colors.primary,
  },
  calorieUnit: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
    marginLeft: 4,
  },

  // Macros
  macros: {
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  macroBar: {
    gap: 4,
  },
  macroBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  macroBarLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  macroBarValue: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  macroBarUnit: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.regular,
    color: Colors.textSecondary,
  },
  macroBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.surfaceElevated,
    overflow: 'hidden',
  },
  macroBarFill: {
    height: '100%',
    borderRadius: 3,
  },

  // Portion
  portionLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  portionChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  portionChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  portionChipSelected: {
    backgroundColor: Colors.primary + '20',
    borderColor: Colors.primary + '60',
  },
  portionChipText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.text,
  },
  portionChipTextSelected: {
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
  },

  // Custom input
  customInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    height: 48,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  customInput: {
    flex: 1,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    height: '100%',
  },
  customUnit: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },

  // Quantity
  quantitySection: {
    marginBottom: Spacing.lg,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
    marginBottom: Spacing.md,
  },
  quantityButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quantityDisplay: {
    minWidth: 80,
    alignItems: 'center',
  },
  quantityValue: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },

  // Slider
  sliderContainer: {
    paddingHorizontal: SLIDER_PADDING,
  },
  sliderTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.surfaceElevated,
    justifyContent: 'center',
  },
  sliderFill: {
    position: 'absolute',
    left: 0,
    height: '100%',
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  sliderThumb: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    marginLeft: -12,
    ...Shadows.glowPrimary,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  sliderLabel: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },

  // Log button
  logButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    ...Shadows.button,
  },
  logButtonText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: '#fff',
  },
});

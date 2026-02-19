import React, { useState, useEffect, useRef, useMemo, memo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Switch,
  InteractionManager,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { X, Check, Edit3, Calculator, ChevronDown, Sparkles, Heart } from 'lucide-react-native';
import { hapticLight, hapticSuccess } from '../lib/haptics';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../constants/theme';
import FoodSwapSheet from './FoodSwapSheet';
import { useFavoriteFoods } from '../hooks/useFavoriteFoods';

// Performance: Blurhash placeholder for smooth loading
const BLURHASH = 'L6PZfSi_.AyE_3t7t7R**0o#DgR4';

// Quantity memory: remember last-used quantity/unit per food
const QTY_MEMORY_KEY = '@qty_memory';
let _qtyCache = null;

async function getQtyMemory() {
  if (_qtyCache) return _qtyCache;
  try {
    const raw = await AsyncStorage.getItem(QTY_MEMORY_KEY);
    _qtyCache = raw ? JSON.parse(raw) : {};
  } catch {
    _qtyCache = {};
  }
  return _qtyCache;
}

async function saveQtyMemory(foodName, quantity, unit) {
  const mem = await getQtyMemory();
  mem[foodName] = { quantity, unit };
  // Keep only last 200 entries
  const keys = Object.keys(mem);
  if (keys.length > 200) {
    delete mem[keys[0]];
  }
  _qtyCache = mem;
  AsyncStorage.setItem(QTY_MEMORY_KEY, JSON.stringify(mem)).catch(() => {});
}

const MEAL_LABELS = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snacks: 'Snacks',
};

function UnitSelector({ value, onChange, servingLabel }) {
  const options = [
    { id: 'serving', label: servingLabel || 'Serving' },
    { id: 'grams', label: 'Grams' },
  ];

  const handleSelect = async (unit) => {
    if (unit !== value) {
      await hapticLight();
      onChange(unit);
    }
  };

  return (
    <View style={styles.unitSelector}>
      {options.map((option) => {
        const isSelected = value === option.id;
        return (
          <Pressable
            key={option.id}
            style={[
              styles.unitOption,
              isSelected && styles.unitOptionActive,
            ]}
            onPress={() => handleSelect(option.id)}
          >
            <Text
              style={[
                styles.unitOptionText,
                isSelected && styles.unitOptionTextActive,
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function MacroInput({ label, value, onChange, color, unit = 'g', editable }) {
  return (
    <View style={styles.macroInputContainer}>
      <View style={[styles.macroInputIndicator, { backgroundColor: color }]} />
      <View style={styles.macroInputContent}>
        <Text style={styles.macroInputLabel}>{label}</Text>
        {editable ? (
          <View style={styles.macroInputWrapper}>
            <TextInput
              style={styles.macroInputField}
              value={value.toString()}
              onChangeText={onChange}
              keyboardType="decimal-pad"
              selectTextOnFocus
            />
            <Text style={styles.macroInputUnit}>{unit}</Text>
          </View>
        ) : (
          <Text style={styles.macroInputValue}>
            {value}<Text style={styles.macroInputUnit}>{unit}</Text>
          </Text>
        )}
      </View>
    </View>
  );
}

function QuickAmountChip({ amount, label, isSelected, onPress }) {
  return (
    <Pressable
      style={[styles.quickChip, isSelected && styles.quickChipActive]}
      onPress={onPress}
    >
      <Text style={[styles.quickChipText, isSelected && styles.quickChipTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

function FoodDetailModal({
  visible,
  food,
  mealType,
  onClose,
  onConfirm,
}) {
  const quantityInputRef = useRef(null);
  const { isFavorite, toggleFavorite } = useFavoriteFoods();

  // Swap sheet state
  const [swapSheetVisible, setSwapSheetVisible] = useState(false);

  // Input state
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('serving');

  // Manual override state
  const [manualOverride, setManualOverride] = useState(false);
  const [manualCalories, setManualCalories] = useState('');
  const [manualProtein, setManualProtein] = useState('');
  const [manualCarbs, setManualCarbs] = useState('');
  const [manualFat, setManualFat] = useState('');

  // Parse base nutritional values from food
  const baseValues = useMemo(() => {
    if (!food) return { calories: 0, protein: 0, carbs: 0, fat: 0, servingSize: 100 };

    return {
      calories: food.calories || 0,
      protein: food.protein || 0,
      carbs: food.carbs || 0,
      fat: food.fat || 0,
      servingSize: food.servingSize || 100,
      servingDescription: food.serving || '100g',
    };
  }, [food]);

  // Calculate current values based on quantity and unit
  const calculatedValues = useMemo(() => {
    const qty = parseFloat(quantity) || 0;

    // Calculate multiplier based on unit
    let multiplier;
    if (unit === 'grams') {
      // qty grams / 100g base = multiplier
      multiplier = qty / 100;
    } else {
      // qty servings * 1 = multiplier (base is per serving)
      multiplier = qty;
    }

    return {
      calories: Math.round(baseValues.calories * multiplier),
      protein: Math.round(baseValues.protein * multiplier * 10) / 10,
      carbs: Math.round(baseValues.carbs * multiplier * 10) / 10,
      fat: Math.round(baseValues.fat * multiplier * 10) / 10,
      quantity: qty,
      multiplier,
    };
  }, [quantity, unit, baseValues]);

  // Final values (manual override or calculated)
  const finalValues = useMemo(() => {
    if (manualOverride) {
      return {
        calories: parseInt(manualCalories, 10) || 0,
        protein: parseFloat(manualProtein) || 0,
        carbs: parseFloat(manualCarbs) || 0,
        fat: parseFloat(manualFat) || 0,
      };
    }
    return calculatedValues;
  }, [manualOverride, manualCalories, manualProtein, manualCarbs, manualFat, calculatedValues]);

  // Reset state when modal opens with new food
  useEffect(() => {
    if (visible && food) {
      setManualOverride(false);
      setManualCalories('');
      setManualProtein('');
      setManualCarbs('');
      setManualFat('');

      // Restore last-used quantity for this food, or default to 1 serving
      getQtyMemory().then((mem) => {
        const saved = mem[food.name];
        if (saved) {
          setQuantity(saved.quantity);
          setUnit(saved.unit);
        } else {
          setQuantity('1');
          setUnit('serving');
        }
      });

      // Auto-focus after modal transition completes (no arbitrary delay)
      const handle = InteractionManager.runAfterInteractions(() => {
        quantityInputRef.current?.focus();
      });
      return () => handle.cancel();
    }
  }, [visible, food]);

  // Sync manual values with calculated when toggling override on
  useEffect(() => {
    if (manualOverride) {
      setManualCalories(calculatedValues.calories.toString());
      setManualProtein(calculatedValues.protein.toString());
      setManualCarbs(calculatedValues.carbs.toString());
      setManualFat(calculatedValues.fat.toString());
    }
  }, [manualOverride]);

  const handleQuantityChange = useCallback((text) => {
    // Allow empty, numbers, and single decimal point
    const cleaned = text.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) return;
    setQuantity(cleaned);
  }, []);

  const handleUnitChange = useCallback((newUnit) => {
    // Convert quantity when switching units
    setQuantity((prevQuantity) => {
      const qty = parseFloat(prevQuantity) || 1;

      if (unit === 'serving' && newUnit === 'grams') {
        // Convert servings to grams
        const grams = Math.round(qty * baseValues.servingSize);
        return grams.toString();
      } else if (unit === 'grams' && newUnit === 'serving') {
        // Convert grams to servings
        const servings = qty / baseValues.servingSize;
        return servings.toFixed(1).replace(/\.0$/, '');
      }
      return prevQuantity;
    });

    setUnit(newUnit);
  }, [unit, baseValues.servingSize]);

  const handleQuickAmount = useCallback(async (amount, selectedUnit) => {
    await hapticLight();
    setQuantity(amount);
    if (selectedUnit && selectedUnit !== unit) {
      setUnit(selectedUnit);
    }
  }, [unit]);

  const handleManualOverrideToggle = useCallback(async (value) => {
    await hapticLight();
    setManualOverride(value);
  }, []);

  const handleConfirm = useCallback(async () => {
    await hapticSuccess();

    // Remember this quantity/unit for next time
    if (food?.name) {
      saveQtyMemory(food.name, quantity, unit);
    }

    onConfirm({
      ...food,
      calories: finalValues.calories,
      protein: finalValues.protein,
      carbs: finalValues.carbs,
      fat: finalValues.fat,
      quantity: parseFloat(quantity) || 1,
      unit,
      wasManuallyEdited: manualOverride,
    }, mealType);
  }, [food, finalValues, quantity, unit, manualOverride, mealType, onConfirm]);

  const handleClose = useCallback(async () => {
    await hapticLight();
    onClose();
  }, [onClose]);

  const handleToggleFavorite = useCallback(async () => {
    await hapticLight();
    if (food) {
      toggleFavorite({
        name: food.name,
        emoji: food.emoji || food.name?.charAt(0) || '?',
        calories: baseValues.calories,
        protein: baseValues.protein,
        carbs: baseValues.carbs,
        fat: baseValues.fat,
        serving: baseValues.servingDescription || '1 serving',
      });
    }
  }, [food, baseValues, toggleFavorite]);

  const handleOpenSwapSheet = useCallback(async () => {
    await hapticLight();
    setSwapSheetVisible(true);
  }, []);

  const handleSwap = useCallback((swapItem) => {
    // When user picks a swap, confirm it as the food to add (same flow as normal add)
    onConfirm({
      name: swapItem.name,
      emoji: swapItem.emoji,
      calories: swapItem.calories,
      protein: swapItem.protein,
      carbs: swapItem.carbs,
      fat: swapItem.fat,
      serving: swapItem.serving,
      quantity: 1,
      unit: 'serving',
      wasSwapped: true,
    }, mealType);
  }, [mealType, onConfirm]);

  if (!food) return null;

  const mealLabel = MEAL_LABELS[mealType] || 'Log';
  const isValidQuantity = parseFloat(quantity) > 0;
  const quantityNum = parseFloat(quantity) || 0;

  // Build breakdown string
  const breakdownText = unit === 'grams'
    ? `${quantityNum}g = ${finalValues.calories} kcal`
    : `${quantityNum} serving${quantityNum !== 1 ? 's' : ''} = ${finalValues.calories} kcal`;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        testID="food-detail-modal"
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        accessibilityViewIsModal={true}
        accessibilityLabel="Food detail and quantity selector"
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable style={styles.closeButton} onPress={handleClose}>
            <X size={24} color={Colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Add Food</Text>
          <Pressable style={styles.favoriteHeaderButton} onPress={handleToggleFavorite}>
            <Heart
              size={22}
              color={food && isFavorite(food.name) ? Colors.secondary : Colors.textTertiary}
              fill={food && isFavorite(food.name) ? Colors.secondary : 'none'}
            />
          </Pressable>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Food Info Header */}
          <View style={styles.foodHeader}>
            {food.image ? (
              <Image
                source={{ uri: food.image }}
                style={styles.foodImage}
                placeholder={BLURHASH}
                contentFit="cover"
                transition={200}
                cachePolicy="memory-disk"
              />
            ) : (
              <View style={[styles.foodImage, styles.foodImagePlaceholder]}>
                <Text style={styles.foodImagePlaceholderText}>
                  {food.name?.charAt(0) || '?'}
                </Text>
              </View>
            )}
            <View style={styles.foodInfo}>
              <Text style={styles.foodName} numberOfLines={2}>{food.name}</Text>
              {food.brand && (
                <Text style={styles.foodBrand}>{food.brand}</Text>
              )}
              <Text style={styles.baseNutrition}>
                {baseValues.calories} kcal per {baseValues.servingDescription}
              </Text>
            </View>
          </View>

          {/* Quantity Calculator Card */}
          <View style={styles.calculatorCard}>
            <View style={styles.calculatorHeader}>
              <Calculator size={18} color={Colors.primary} />
              <Text style={styles.calculatorTitle}>Amount</Text>
            </View>

            {/* Unit Selector */}
            <UnitSelector
              value={unit}
              onChange={handleUnitChange}
              servingLabel={food.serving ? `Serving (${food.serving})` : 'Serving'}
            />

            {/* Large Quantity Input */}
            <View style={styles.quantityInputContainer}>
              <TextInput
                testID="quantity-input"
                ref={quantityInputRef}
                style={styles.quantityInput}
                value={quantity}
                onChangeText={handleQuantityChange}
                keyboardType="decimal-pad"
                selectTextOnFocus
                placeholder="0"
                placeholderTextColor={Colors.textTertiary}
              />
              <Text style={styles.quantityUnit}>
                {unit === 'grams' ? 'g' : 'serving(s)'}
              </Text>
            </View>

            {/* Quick Amounts */}
            <View style={styles.quickAmounts}>
              {unit === 'serving' ? (
                <>
                  <QuickAmountChip
                    amount="0.5"
                    label="½"
                    isSelected={quantity === '0.5'}
                    onPress={() => handleQuickAmount('0.5')}
                  />
                  <QuickAmountChip
                    amount="1"
                    label="1"
                    isSelected={quantity === '1'}
                    onPress={() => handleQuickAmount('1')}
                  />
                  <QuickAmountChip
                    amount="1.5"
                    label="1½"
                    isSelected={quantity === '1.5'}
                    onPress={() => handleQuickAmount('1.5')}
                  />
                  <QuickAmountChip
                    amount="2"
                    label="2"
                    isSelected={quantity === '2'}
                    onPress={() => handleQuickAmount('2')}
                  />
                </>
              ) : (
                <>
                  <QuickAmountChip
                    amount="50"
                    label="50g"
                    isSelected={quantity === '50'}
                    onPress={() => handleQuickAmount('50')}
                  />
                  <QuickAmountChip
                    amount="100"
                    label="100g"
                    isSelected={quantity === '100'}
                    onPress={() => handleQuickAmount('100')}
                  />
                  <QuickAmountChip
                    amount="150"
                    label="150g"
                    isSelected={quantity === '150'}
                    onPress={() => handleQuickAmount('150')}
                  />
                  <QuickAmountChip
                    amount="200"
                    label="200g"
                    isSelected={quantity === '200'}
                    onPress={() => handleQuickAmount('200')}
                  />
                </>
              )}
            </View>
          </View>

          {/* Live Calorie Display */}
          <View style={styles.calorieCard}>
            <Text style={styles.calorieValue}>{finalValues.calories}</Text>
            <Text style={styles.calorieLabel}>calories</Text>
            <Text style={styles.breakdownText}>{breakdownText}</Text>
          </View>

          {/* Macros Display/Edit */}
          <View style={styles.macrosCard}>
            <View style={styles.macrosHeader}>
              <Text style={styles.macrosTitle}>Nutrition</Text>
              <View style={styles.overrideToggle}>
                <Edit3 size={14} color={manualOverride ? Colors.primary : Colors.textTertiary} />
                <Text style={[
                  styles.overrideLabel,
                  manualOverride && styles.overrideLabelActive
                ]}>
                  Edit
                </Text>
                <Switch
                  value={manualOverride}
                  onValueChange={handleManualOverrideToggle}
                  trackColor={{ false: Colors.surfaceElevated, true: Colors.primary + '60' }}
                  thumbColor={manualOverride ? Colors.primary : Colors.textTertiary}
                  style={styles.overrideSwitch}
                />
              </View>
            </View>

            {manualOverride && (
              <View style={styles.overrideHint}>
                <Text style={styles.overrideHintText}>
                  Manually adjust values if the database is incorrect
                </Text>
              </View>
            )}

            <View style={styles.macrosGrid}>
              <MacroInput
                label="Protein"
                value={manualOverride ? manualProtein : finalValues.protein}
                onChange={setManualProtein}
                color={Colors.protein}
                editable={manualOverride}
              />
              <MacroInput
                label="Carbs"
                value={manualOverride ? manualCarbs : finalValues.carbs}
                onChange={setManualCarbs}
                color={Colors.carbs}
                editable={manualOverride}
              />
              <MacroInput
                label="Fat"
                value={manualOverride ? manualFat : finalValues.fat}
                onChange={setManualFat}
                color={Colors.fat}
                editable={manualOverride}
              />
            </View>

            {manualOverride && (
              <MacroInput
                label="Calories"
                value={manualCalories}
                onChange={setManualCalories}
                color={Colors.primary}
                unit="kcal"
                editable={true}
              />
            )}

            {/* Macro Bar Visualization */}
            <View style={styles.macroBarContainer}>
              <View style={styles.macroBar}>
                <View
                  style={[
                    styles.macroBarSegment,
                    {
                      backgroundColor: Colors.protein,
                      flex: finalValues.protein * 4 || 0.1,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.macroBarSegment,
                    {
                      backgroundColor: Colors.carbs,
                      flex: finalValues.carbs * 4 || 0.1,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.macroBarSegment,
                    {
                      backgroundColor: Colors.fat,
                      flex: finalValues.fat * 9 || 0.1,
                    },
                  ]}
                />
              </View>
            </View>
          </View>

          {/* Find Smarter Swap button */}
          <Pressable style={styles.swapButton} onPress={handleOpenSwapSheet}>
            <Sparkles size={16} color={Colors.primary} />
            <Text style={styles.swapButtonText}>Find Smarter Swap</Text>
          </Pressable>
        </ScrollView>

        {/* Bottom Action */}
        <View style={styles.bottomAction}>
          <Pressable
            testID="confirm-food-button"
            style={[
              styles.confirmButton,
              !isValidQuantity && styles.confirmButtonDisabled,
            ]}
            onPress={handleConfirm}
            disabled={!isValidQuantity}
          >
            <Check size={22} color={Colors.background} />
            <Text style={styles.confirmButtonText}>
              Add to {mealLabel}
            </Text>
          </Pressable>
        </View>

        {/* Food Swap Sheet */}
        <FoodSwapSheet
          visible={swapSheetVisible}
          onClose={() => setSwapSheetVisible(false)}
          food={food ? {
            name: food.name,
            emoji: food.emoji || food.name?.charAt(0) || '?',
            calories: baseValues.calories,
            protein: baseValues.protein,
            carbs: baseValues.carbs,
            fat: baseValues.fat,
            serving: baseValues.servingDescription || '1 serving',
          } : null}
          onSwap={handleSwap}
        />
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default memo(FoodDetailModal);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  headerSpacer: {
    width: 40,
  },
  favoriteHeaderButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  foodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  foodImage: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surfaceElevated,
  },
  foodImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  foodImagePlaceholderText: {
    fontSize: 28,
    fontWeight: FontWeight.bold,
    color: Colors.textTertiary,
  },
  foodInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  foodName: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: 2,
  },
  foodBrand: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  baseNutrition: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
  },
  calculatorCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  calculatorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  calculatorTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  unitSelector: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  unitOption: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  unitOptionActive: {
    backgroundColor: Colors.primary,
  },
  unitOptionText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
  },
  unitOptionTextActive: {
    color: Colors.background,
  },
  quantityInputContainer: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  quantityInput: {
    fontSize: 72,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    textAlign: 'center',
    minWidth: 200,
    paddingVertical: Spacing.sm,
  },
  quantityUnit: {
    fontSize: FontSize.lg,
    color: Colors.textSecondary,
    marginTop: -Spacing.sm,
  },
  quickAmounts: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  quickChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceElevated,
    minWidth: 64,
    alignItems: 'center',
  },
  quickChipActive: {
    backgroundColor: Colors.primary,
  },
  quickChipText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.textSecondary,
  },
  quickChipTextActive: {
    color: Colors.background,
  },
  calorieCard: {
    backgroundColor: Colors.primary + '15',
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.primary + '30',
  },
  calorieValue: {
    fontSize: 80,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
    lineHeight: 88,
  },
  calorieLabel: {
    fontSize: FontSize.lg,
    color: Colors.primary,
    marginTop: -Spacing.xs,
    fontWeight: FontWeight.medium,
  },
  breakdownText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  macrosCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  macrosHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  macrosTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  overrideToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  overrideLabel: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    fontWeight: FontWeight.medium,
  },
  overrideLabelActive: {
    color: Colors.primary,
  },
  overrideSwitch: {
    transform: [{ scale: 0.8 }],
    marginLeft: -Spacing.xs,
  },
  overrideHint: {
    backgroundColor: Colors.primary + '15',
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
  },
  overrideHintText: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    textAlign: 'center',
  },
  macrosGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  macroInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    gap: Spacing.xs,
  },
  macroInputIndicator: {
    width: 4,
    height: 36,
    borderRadius: 2,
  },
  macroInputContent: {
    flex: 1,
  },
  macroInputLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  macroInputValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  macroInputUnit: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.regular,
    color: Colors.textSecondary,
  },
  macroInputWrapper: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  macroInputField: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    padding: 0,
    minWidth: 40,
  },
  macroBarContainer: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: Colors.surfaceElevated,
    marginTop: Spacing.sm,
  },
  macroBar: {
    flex: 1,
    flexDirection: 'row',
  },
  macroBarSegment: {
    height: '100%',
  },
  swapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surfaceGlass,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.primarySoft,
  },
  swapButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },
  bottomAction: {
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  confirmButtonDisabled: {
    backgroundColor: Colors.surfaceElevated,
    shadowOpacity: 0,
  },
  confirmButtonText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.background,
  },
});

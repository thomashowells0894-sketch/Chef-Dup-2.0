/**
 * Submit Food to Community Database
 *
 * Allows authenticated users to submit custom foods to the shared community
 * database. Includes full nutrition form with macro validation, category
 * picker, and optional barcode/brand fields.
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Check,
  Flame,
  Beef,
  Wheat,
  Droplets,
  ScanBarcode,
  ChevronDown,
  AlertTriangle,
  Sparkles,
  Users,
  Leaf,
  Cookie,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { Colors, Gradients, Spacing, FontSize, FontWeight, BorderRadius, Shadows } from '../constants/theme';
import { useCommunityFoods } from '../hooks/useCommunityFoods';
import { hapticSuccess, hapticLight, hapticError, hapticWarning } from '../lib/haptics';
import ScreenErrorBoundary from '../components/ScreenErrorBoundary';

// ============================================================================
// CONSTANTS
// ============================================================================

const CATEGORIES = [
  { value: 'fruits', label: 'Fruits', icon: '🍎' },
  { value: 'vegetables', label: 'Vegetables', icon: '🥦' },
  { value: 'grains', label: 'Grains', icon: '🌾' },
  { value: 'dairy', label: 'Dairy', icon: '🥛' },
  { value: 'meat', label: 'Meat', icon: '🥩' },
  { value: 'seafood', label: 'Seafood', icon: '🐟' },
  { value: 'beverages', label: 'Beverages', icon: '🥤' },
  { value: 'snacks', label: 'Snacks', icon: '🍪' },
  { value: 'prepared meals', label: 'Prepared Meals', icon: '🍱' },
  { value: 'other', label: 'Other', icon: '🍽️' },
];

const SERVING_UNITS = [
  'serving',
  'g',
  'oz',
  'ml',
  'cup',
  'tbsp',
  'tsp',
  'piece',
  'slice',
  'scoop',
];

// ============================================================================
// SCREEN
// ============================================================================

function SubmitFoodScreen() {
  const router = useRouter();
  const { submitFood, isSubmitting, error: hookError } = useCommunityFoods();

  // Form state
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [barcode, setBarcode] = useState('');
  const [servingSize, setServingSize] = useState('1');
  const [servingUnit, setServingUnit] = useState('serving');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [fiber, setFiber] = useState('');
  const [sugar, setSugar] = useState('');
  const [sodium, setSodium] = useState('');
  const [category, setCategory] = useState('other');

  // UI state
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showUnitPicker, setShowUnitPicker] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // ---- Macro calorie calculation ----
  const calculatedCalories = useMemo(() => {
    const p = parseFloat(protein) || 0;
    const c = parseFloat(carbs) || 0;
    const f = parseFloat(fat) || 0;
    return Math.round(p * 4 + c * 4 + f * 9);
  }, [protein, carbs, fat]);

  const enteredCalories = parseInt(calories) || 0;
  const hasMacros =
    (parseFloat(protein) || 0) > 0 ||
    (parseFloat(carbs) || 0) > 0 ||
    (parseFloat(fat) || 0) > 0;

  // Validation: check if calories roughly match macros (within 20%)
  const calorieDeviation = useMemo(() => {
    if (!hasMacros || enteredCalories === 0 || calculatedCalories === 0) return 0;
    return Math.abs(enteredCalories - calculatedCalories) / calculatedCalories;
  }, [hasMacros, enteredCalories, calculatedCalories]);

  const hasCalorieMismatch = hasMacros && enteredCalories > 0 && calorieDeviation > 0.2;

  // Selected category info
  const selectedCategory = CATEGORIES.find((c) => c.value === category) || CATEGORIES[9];

  // ---- Handlers ----

  const handleCategorySelect = useCallback(
    (value) => {
      hapticLight();
      setCategory(value);
      setShowCategoryPicker(false);
    },
    []
  );

  const handleUnitSelect = useCallback(
    (unit) => {
      hapticLight();
      setServingUnit(unit);
      setShowUnitPicker(false);
    },
    []
  );

  const handleSubmit = useCallback(async () => {
    // Basic validation
    if (!name.trim()) {
      hapticError();
      Alert.alert('Missing Name', 'Please enter a name for this food.');
      return;
    }
    if (!calories || parseInt(calories) <= 0) {
      hapticError();
      Alert.alert('Missing Calories', 'Please enter the calorie count.');
      return;
    }
    if (!servingSize || parseFloat(servingSize) <= 0) {
      hapticError();
      Alert.alert('Invalid Serving', 'Please enter a valid serving size.');
      return;
    }

    // Warn about calorie mismatch but allow submission
    if (hasCalorieMismatch) {
      hapticWarning();
      const proceed = await new Promise((resolve) => {
        Alert.alert(
          'Calorie Mismatch',
          `The entered calories (${enteredCalories}) differ significantly from the macro calculation (${calculatedCalories} kcal).\n\nProtein*4 + Carbs*4 + Fat*9 = ${calculatedCalories}\n\nSubmit anyway?`,
          [
            { text: 'Fix', onPress: () => resolve(false) },
            { text: 'Submit Anyway', onPress: () => resolve(true), style: 'default' },
          ]
        );
      });
      if (!proceed) return;
    }

    const result = await submitFood({
      name: name.trim(),
      brand: brand.trim() || undefined,
      barcode: barcode.trim() || undefined,
      calories: parseInt(calories) || 0,
      protein: parseFloat(protein) || 0,
      carbs: parseFloat(carbs) || 0,
      fat: parseFloat(fat) || 0,
      fiber: parseFloat(fiber) || 0,
      sugar: parseFloat(sugar) || 0,
      sodium: parseFloat(sodium) || 0,
      serving_size: parseFloat(servingSize) || 1,
      serving_unit: servingUnit,
      category: category,
    });

    if (result) {
      hapticSuccess();
      setSubmitted(true);
      // Navigate back after a short delay to show success
      setTimeout(() => {
        router.back();
      }, 1800);
    } else {
      hapticError();
      Alert.alert(
        'Submission Failed',
        hookError || 'Something went wrong. Please try again.'
      );
    }
  }, [
    name, brand, barcode, calories, protein, carbs, fat, fiber, sugar, sodium,
    servingSize, servingUnit, category, hasCalorieMismatch, enteredCalories,
    calculatedCalories, submitFood, hookError, router,
  ]);

  // ---- Success state ----
  if (submitted) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.successContainer}>
          <Animated.View entering={FadeIn.duration(400)} style={styles.successContent}>
            <LinearGradient
              colors={Gradients.success}
              style={styles.successIcon}
            >
              <Check size={40} color={Colors.background} />
            </LinearGradient>
            <Text style={styles.successTitle}>Food Submitted!</Text>
            <Text style={styles.successSubtitle}>
              Your food is pending review. You earned XP for contributing!
            </Text>
            <View style={styles.xpBadge}>
              <Sparkles size={16} color={Colors.gold} />
              <Text style={styles.xpBadgeText}>+15 XP</Text>
            </View>
          </Animated.View>
        </View>
      </SafeAreaView>
    );
  }

  // ---- Main form ----
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            style={styles.headerButton}
            onPress={() => router.back()}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <ArrowLeft size={24} color={Colors.text} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Users size={18} color={Colors.primary} />
            <Text style={styles.headerTitle}>Submit Food</Text>
          </View>
          <View style={styles.headerButton} />
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Info banner */}
          <Animated.View entering={FadeInDown.delay(50).duration(400)}>
            <View style={styles.infoBanner}>
              <Users size={16} color={Colors.primary} />
              <Text style={styles.infoBannerText}>
                Contribute to the community food database. Submitted foods are reviewed and can be used by all users.
              </Text>
            </View>
          </Animated.View>

          {/* Food Name */}
          <Animated.View entering={FadeInDown.delay(100).duration(400)}>
            <Text style={styles.sectionLabel}>Food Name *</Text>
            <View style={styles.glassInput}>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Greek Yogurt with Honey"
                placeholderTextColor={Colors.textTertiary}
                value={name}
                onChangeText={setName}
                returnKeyType="next"
                maxLength={200}
                accessibilityLabel="Food name"
              />
            </View>
          </Animated.View>

          {/* Brand + Barcode row */}
          <Animated.View entering={FadeInDown.delay(150).duration(400)}>
            <View style={styles.rowFields}>
              <View style={styles.rowFieldHalf}>
                <Text style={styles.sectionLabel}>Brand</Text>
                <View style={styles.glassInput}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Optional"
                    placeholderTextColor={Colors.textTertiary}
                    value={brand}
                    onChangeText={setBrand}
                    returnKeyType="next"
                    maxLength={100}
                    accessibilityLabel="Brand name"
                  />
                </View>
              </View>
              <View style={styles.rowFieldHalf}>
                <Text style={styles.sectionLabel}>Barcode</Text>
                <View style={[styles.glassInput, styles.barcodeInputRow]}>
                  <TextInput
                    style={[styles.textInput, styles.barcodeTextInput]}
                    placeholder="Optional"
                    placeholderTextColor={Colors.textTertiary}
                    value={barcode}
                    onChangeText={setBarcode}
                    returnKeyType="next"
                    keyboardType="numeric"
                    maxLength={50}
                    accessibilityLabel="Barcode number"
                  />
                  <Pressable
                    style={styles.barcodeScanButton}
                    hitSlop={4}
                    accessibilityRole="button"
                    accessibilityLabel="Scan barcode"
                    onPress={() => {
                      hapticLight();
                      Alert.alert('Scanner', 'Barcode scanner coming soon!');
                    }}
                  >
                    <ScanBarcode size={18} color={Colors.primary} />
                  </Pressable>
                </View>
              </View>
            </View>
          </Animated.View>

          {/* Serving Size + Unit */}
          <Animated.View entering={FadeInDown.delay(200).duration(400)}>
            <View style={styles.rowFields}>
              <View style={styles.rowFieldHalf}>
                <Text style={styles.sectionLabel}>Serving Size *</Text>
                <View style={styles.glassInput}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="1"
                    placeholderTextColor={Colors.textTertiary}
                    value={servingSize}
                    onChangeText={setServingSize}
                    keyboardType="decimal-pad"
                    returnKeyType="next"
                    maxLength={8}
                    accessibilityLabel="Serving size"
                  />
                </View>
              </View>
              <View style={styles.rowFieldHalf}>
                <Text style={styles.sectionLabel}>Unit</Text>
                <Pressable
                  style={styles.pickerButton}
                  onPress={() => {
                    hapticLight();
                    setShowUnitPicker(true);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Serving unit: ${servingUnit}`}
                >
                  <Text style={styles.pickerButtonText}>{servingUnit}</Text>
                  <ChevronDown size={16} color={Colors.textSecondary} />
                </Pressable>
              </View>
            </View>
          </Animated.View>

          {/* Category */}
          <Animated.View entering={FadeInDown.delay(250).duration(400)}>
            <Text style={styles.sectionLabel}>Category</Text>
            <Pressable
              style={styles.pickerButton}
              onPress={() => {
                hapticLight();
                setShowCategoryPicker(true);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Category: ${selectedCategory.label}`}
            >
              <Text style={styles.categoryIcon}>{selectedCategory.icon}</Text>
              <Text style={styles.pickerButtonText}>{selectedCategory.label}</Text>
              <ChevronDown size={16} color={Colors.textSecondary} />
            </Pressable>
          </Animated.View>

          {/* Nutrition Inputs - Main macros */}
          <Animated.View entering={FadeInDown.delay(300).duration(400)}>
            <Text style={styles.sectionLabel}>Nutrition (per serving) *</Text>
            <View style={styles.nutritionGrid}>
              {/* Calories */}
              <View style={styles.nutritionCard}>
                <View style={styles.nutritionHeader}>
                  <Flame size={16} color={Colors.primary} />
                  <Text style={styles.nutritionLabel}>Calories</Text>
                </View>
                <TextInput
                  style={styles.nutritionInput}
                  placeholder="0"
                  placeholderTextColor={Colors.textTertiary}
                  value={calories}
                  onChangeText={setCalories}
                  keyboardType="numeric"
                  returnKeyType="next"
                  maxLength={5}
                  accessibilityLabel="Calories"
                />
                <Text style={styles.nutritionUnit}>kcal</Text>
              </View>

              {/* Protein */}
              <View style={styles.nutritionCard}>
                <View style={styles.nutritionHeader}>
                  <Beef size={16} color={Colors.protein} />
                  <Text style={styles.nutritionLabel}>Protein</Text>
                </View>
                <TextInput
                  style={styles.nutritionInput}
                  placeholder="0"
                  placeholderTextColor={Colors.textTertiary}
                  value={protein}
                  onChangeText={setProtein}
                  keyboardType="decimal-pad"
                  returnKeyType="next"
                  maxLength={6}
                  accessibilityLabel="Protein in grams"
                />
                <Text style={styles.nutritionUnit}>g</Text>
              </View>

              {/* Carbs */}
              <View style={styles.nutritionCard}>
                <View style={styles.nutritionHeader}>
                  <Wheat size={16} color={Colors.carbs} />
                  <Text style={styles.nutritionLabel}>Carbs</Text>
                </View>
                <TextInput
                  style={styles.nutritionInput}
                  placeholder="0"
                  placeholderTextColor={Colors.textTertiary}
                  value={carbs}
                  onChangeText={setCarbs}
                  keyboardType="decimal-pad"
                  returnKeyType="next"
                  maxLength={6}
                  accessibilityLabel="Carbohydrates in grams"
                />
                <Text style={styles.nutritionUnit}>g</Text>
              </View>

              {/* Fat */}
              <View style={styles.nutritionCard}>
                <View style={styles.nutritionHeader}>
                  <Droplets size={16} color={Colors.fat} />
                  <Text style={styles.nutritionLabel}>Fat</Text>
                </View>
                <TextInput
                  style={styles.nutritionInput}
                  placeholder="0"
                  placeholderTextColor={Colors.textTertiary}
                  value={fat}
                  onChangeText={setFat}
                  keyboardType="decimal-pad"
                  returnKeyType="next"
                  maxLength={6}
                  accessibilityLabel="Fat in grams"
                />
                <Text style={styles.nutritionUnit}>g</Text>
              </View>
            </View>
          </Animated.View>

          {/* Calorie validation indicator */}
          {hasMacros && enteredCalories > 0 && (
            <Animated.View entering={FadeInDown.duration(300)} style={styles.validationContainer}>
              <View style={styles.validationRow}>
                <View style={styles.validationBarGroup}>
                  <Text style={styles.validationBarLabel}>Entered</Text>
                  <View style={styles.validationBarTrack}>
                    <View
                      style={[
                        styles.validationBarFill,
                        {
                          width: `${Math.min((enteredCalories / Math.max(enteredCalories, calculatedCalories)) * 100, 100)}%`,
                          backgroundColor: hasCalorieMismatch ? Colors.warning : Colors.primary,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.validationBarValue}>{enteredCalories}</Text>
                </View>
                <View style={styles.validationBarGroup}>
                  <Text style={styles.validationBarLabel}>From macros</Text>
                  <View style={styles.validationBarTrack}>
                    <View
                      style={[
                        styles.validationBarFill,
                        {
                          width: `${Math.min((calculatedCalories / Math.max(enteredCalories, calculatedCalories)) * 100, 100)}%`,
                          backgroundColor: Colors.success,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.validationBarValue}>{calculatedCalories}</Text>
                </View>
              </View>
              {hasCalorieMismatch && (
                <View style={styles.validationWarning}>
                  <AlertTriangle size={14} color={Colors.warning} />
                  <Text style={styles.validationWarningText}>
                    Calories differ by more than 20% from macros (P*4 + C*4 + F*9)
                  </Text>
                </View>
              )}
            </Animated.View>
          )}

          {/* Additional nutrition fields */}
          <Animated.View entering={FadeInDown.delay(350).duration(400)}>
            <Text style={styles.sectionLabel}>Additional Nutrition</Text>
            <View style={styles.additionalNutritionRow}>
              <View style={styles.additionalField}>
                <View style={styles.additionalFieldHeader}>
                  <Leaf size={14} color={Colors.success} />
                  <Text style={styles.additionalFieldLabel}>Fiber</Text>
                </View>
                <View style={styles.additionalFieldInputWrap}>
                  <TextInput
                    style={styles.additionalFieldInput}
                    placeholder="0"
                    placeholderTextColor={Colors.textTertiary}
                    value={fiber}
                    onChangeText={setFiber}
                    keyboardType="decimal-pad"
                    maxLength={5}
                    accessibilityLabel="Fiber in grams"
                  />
                  <Text style={styles.additionalFieldUnit}>g</Text>
                </View>
              </View>

              <View style={styles.additionalField}>
                <View style={styles.additionalFieldHeader}>
                  <Cookie size={14} color={Colors.warning} />
                  <Text style={styles.additionalFieldLabel}>Sugar</Text>
                </View>
                <View style={styles.additionalFieldInputWrap}>
                  <TextInput
                    style={styles.additionalFieldInput}
                    placeholder="0"
                    placeholderTextColor={Colors.textTertiary}
                    value={sugar}
                    onChangeText={setSugar}
                    keyboardType="decimal-pad"
                    maxLength={5}
                    accessibilityLabel="Sugar in grams"
                  />
                  <Text style={styles.additionalFieldUnit}>g</Text>
                </View>
              </View>

              <View style={styles.additionalField}>
                <View style={styles.additionalFieldHeader}>
                  <Droplets size={14} color={Colors.textSecondary} />
                  <Text style={styles.additionalFieldLabel}>Sodium</Text>
                </View>
                <View style={styles.additionalFieldInputWrap}>
                  <TextInput
                    style={styles.additionalFieldInput}
                    placeholder="0"
                    placeholderTextColor={Colors.textTertiary}
                    value={sodium}
                    onChangeText={setSodium}
                    keyboardType="decimal-pad"
                    maxLength={6}
                    accessibilityLabel="Sodium in milligrams"
                  />
                  <Text style={styles.additionalFieldUnit}>mg</Text>
                </View>
              </View>
            </View>
          </Animated.View>

          {/* Submit Button */}
          <Animated.View entering={FadeInDown.delay(400).duration(400)} style={styles.submitContainer}>
            <Pressable
              onPress={handleSubmit}
              disabled={isSubmitting}
              accessibilityRole="button"
              accessibilityLabel="Submit food to community"
              accessibilityState={{ disabled: isSubmitting }}
            >
              <LinearGradient
                colors={isSubmitting ? Gradients.disabled : Gradients.primary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitButton}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color={Colors.background} />
                ) : (
                  <>
                    <Users size={20} color={Colors.background} />
                    <Text style={styles.submitButtonText}>Submit to Community</Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>
            <Text style={styles.submitDisclaimer}>
              Submissions are reviewed before appearing in the public database.
              You'll earn XP when your food is approved.
            </Text>
          </Animated.View>

          {/* Bottom spacer */}
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Category Picker Modal */}
      <Modal
        visible={showCategoryPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCategoryPicker(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowCategoryPicker(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Category</Text>
            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {CATEGORIES.map((cat) => (
                <Pressable
                  key={cat.value}
                  style={[
                    styles.modalOption,
                    category === cat.value && styles.modalOptionSelected,
                  ]}
                  onPress={() => handleCategorySelect(cat.value)}
                >
                  <Text style={styles.modalOptionIcon}>{cat.icon}</Text>
                  <Text
                    style={[
                      styles.modalOptionText,
                      category === cat.value && styles.modalOptionTextSelected,
                    ]}
                  >
                    {cat.label}
                  </Text>
                  {category === cat.value && (
                    <Check size={18} color={Colors.primary} />
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {/* Unit Picker Modal */}
      <Modal
        visible={showUnitPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowUnitPicker(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowUnitPicker(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Unit</Text>
            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {SERVING_UNITS.map((unit) => (
                <Pressable
                  key={unit}
                  style={[
                    styles.modalOption,
                    servingUnit === unit && styles.modalOptionSelected,
                  ]}
                  onPress={() => handleUnitSelect(unit)}
                >
                  <Text
                    style={[
                      styles.modalOptionText,
                      servingUnit === unit && styles.modalOptionTextSelected,
                    ]}
                  >
                    {unit}
                  </Text>
                  {servingUnit === unit && (
                    <Check size={18} color={Colors.primary} />
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xxl,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },

  // Info banner
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.primarySoft,
    borderWidth: 1,
    borderColor: Colors.borderAccent,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  infoBannerText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: FontSize.sm * 1.5,
  },

  // Section labels
  sectionLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },

  // Glass Text Input
  glassInput: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    height: 52,
    justifyContent: 'center',
  },
  textInput: {
    fontSize: FontSize.md,
    color: Colors.text,
    height: '100%',
  },

  // Row fields
  rowFields: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  rowFieldHalf: {
    flex: 1,
  },

  // Barcode input
  barcodeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: Spacing.xs,
  },
  barcodeTextInput: {
    flex: 1,
  },
  barcodeScanButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Picker button
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    height: 52,
    gap: Spacing.sm,
  },
  pickerButtonText: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  categoryIcon: {
    fontSize: 20,
  },

  // Nutrition Grid
  nutritionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  nutritionCard: {
    width: '48.5%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  nutritionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  nutritionLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
  },
  nutritionInput: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    padding: 0,
    marginBottom: 2,
  },
  nutritionUnit: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },

  // Calorie validation
  validationContainer: {
    marginTop: Spacing.md,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  validationRow: {
    gap: Spacing.sm,
  },
  validationBarGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  validationBarLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    width: 70,
  },
  validationBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  validationBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  validationBarValue: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    width: 45,
    textAlign: 'right',
  },
  validationWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  validationWarningText: {
    flex: 1,
    fontSize: FontSize.xs,
    color: Colors.warning,
    lineHeight: FontSize.xs * 1.4,
  },

  // Additional nutrition
  additionalNutritionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  additionalField: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
  },
  additionalFieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  additionalFieldLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
  },
  additionalFieldInputWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  additionalFieldInput: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    padding: 0,
    minWidth: 30,
    flex: 1,
  },
  additionalFieldUnit: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },

  // Submit button
  submitContainer: {
    marginTop: Spacing.xl,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    height: 56,
    borderRadius: BorderRadius.lg,
    ...Shadows.button,
  },
  submitButtonText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.background,
  },
  submitDisclaimer: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: Spacing.sm,
    lineHeight: FontSize.xs * 1.5,
    paddingHorizontal: Spacing.md,
  },

  // Success state
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  successContent: {
    alignItems: 'center',
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    ...Shadows.glowSuccess,
  },
  successTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: FontSize.md * 1.5,
    marginBottom: Spacing.lg,
  },
  xpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.goldSoft,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  xpBadgeText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.gold,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  modalContent: {
    width: '100%',
    maxHeight: '60%',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    ...Shadows.cardElevated,
  },
  modalTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  modalScroll: {
    maxHeight: 400,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xs,
  },
  modalOptionSelected: {
    backgroundColor: Colors.primarySoft,
  },
  modalOptionIcon: {
    fontSize: 20,
    width: 28,
    textAlign: 'center',
  },
  modalOptionText: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  modalOptionTextSelected: {
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
  },
});

// ============================================================================
// EXPORT WITH ERROR BOUNDARY
// ============================================================================

export default function SubmitFoodScreenWithBoundary() {
  return (
    <ScreenErrorBoundary screenName="Submit Food">
      <SubmitFoodScreen />
    </ScreenErrorBoundary>
  );
}

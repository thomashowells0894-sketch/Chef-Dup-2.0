/**
 * Enhanced Custom Food Creation Screen
 *
 * Features:
 * - Nutrition label scanner (AI-powered photo extraction)
 * - Manual entry with all macros + key micronutrients
 * - Recipe builder: combine multiple ingredients, auto-calculate totals
 * - Save to personal database
 * - Share to community database (future)
 */

import React, { useState, useMemo, useCallback, useRef } from 'react';
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
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Check,
  Camera,
  Plus,
  Minus,
  Trash2,
  ChefHat,
  ScanBarcode,
  Flame,
  Beef,
  Wheat,
  Droplets,
  Sparkles,
  Upload,
  ChevronDown,
  ChevronUp,
  Search,
} from 'lucide-react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius, Shadows } from '../constants/theme';
import { useMeals } from '../context/MealContext';
import { hapticSuccess, hapticLight } from '../lib/haptics';
import { sanitizeFoodName, validateMacro } from '../lib/validation';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FOOD_EMOJIS = [
  '\u{1F37D}\u{FE0F}', '\u{1F357}', '\u{1F969}', '\u{1F41F}', '\u{1F95A}', '\u{1F957}',
  '\u{1F35A}', '\u{1F35D}', '\u{1F355}', '\u{1F96A}', '\u{1F34E}', '\u{1F964}',
  '\u{1F32E}', '\u{1F959}', '\u{1F956}', '\u{1F950}', '\u{1F95E}', '\u{1F9C7}',
];

const TABS = [
  { id: 'manual', label: 'Manual', icon: Flame },
  { id: 'scan', label: 'Scan Label', icon: Camera },
  { id: 'recipe', label: 'Recipe', icon: ChefHat },
];

const MEAL_LABELS = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snacks: 'Snacks',
};

// ---------------------------------------------------------------------------
// Macro Input Row
// ---------------------------------------------------------------------------

function MacroInput({ label, value, onChange, color, unit = 'g', icon: Icon }) {
  return (
    <View style={styles.macroInputRow}>
      <View style={[styles.macroInputIcon, { backgroundColor: color + '20' }]}>
        {Icon && <Icon size={16} color={color} />}
      </View>
      <Text style={styles.macroInputLabel}>{label}</Text>
      <TextInput
        style={styles.macroInputField}
        value={value}
        onChangeText={onChange}
        keyboardType="numeric"
        placeholder="0"
        placeholderTextColor={Colors.textTertiary}
        maxLength={6}
      />
      <Text style={styles.macroInputUnit}>{unit}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Micro Input Row (collapsible section)
// ---------------------------------------------------------------------------

function MicroInput({ label, value, onChange, unit = 'mg' }) {
  return (
    <View style={styles.microInputRow}>
      <Text style={styles.microInputLabel}>{label}</Text>
      <TextInput
        style={styles.microInputField}
        value={value}
        onChangeText={onChange}
        keyboardType="numeric"
        placeholder="0"
        placeholderTextColor={Colors.textTertiary}
        maxLength={6}
      />
      <Text style={styles.microInputUnit}>{unit}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Recipe Ingredient Item
// ---------------------------------------------------------------------------

function IngredientItem({ ingredient, onRemove, index }) {
  return (
    <Animated.View entering={FadeInDown.delay(index * 50).duration(200)}>
      <View style={styles.ingredientItem}>
        <View style={styles.ingredientInfo}>
          <Text style={styles.ingredientName} numberOfLines={1}>
            {ingredient.name}
          </Text>
          <Text style={styles.ingredientServing}>
            {ingredient.quantity} {ingredient.serving}
          </Text>
        </View>
        <View style={styles.ingredientMacros}>
          <Text style={styles.ingredientCal}>{ingredient.calories} cal</Text>
        </View>
        <Pressable
          style={styles.ingredientRemove}
          onPress={() => onRemove(index)}
          hitSlop={8}
        >
          <Trash2 size={16} color={Colors.error} />
        </Pressable>
      </View>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function CreateFoodEnhanced() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { addFood } = useMeals();
  const initialMeal = params.meal || 'breakfast';

  // Tab state
  const [activeTab, setActiveTab] = useState('manual');

  // Common state
  const [name, setName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState(FOOD_EMOJIS[0]);
  const [serving, setServing] = useState('1 serving');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Macro state
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');

  // Micro state
  const [showMicros, setShowMicros] = useState(false);
  const [fiber, setFiber] = useState('');
  const [sugar, setSugar] = useState('');
  const [sodium, setSodium] = useState('');
  const [saturatedFat, setSaturatedFat] = useState('');
  const [cholesterol, setCholesterol] = useState('');
  const [calcium, setCalcium] = useState('');
  const [iron, setIron] = useState('');
  const [potassium, setPotassium] = useState('');
  const [vitaminA, setVitaminA] = useState('');
  const [vitaminC, setVitaminC] = useState('');
  const [vitaminD, setVitaminD] = useState('');

  // Scan state
  const [isScanning, setIsScanning] = useState(false);
  const [scanImage, setScanImage] = useState(null);

  // Recipe state
  const [ingredients, setIngredients] = useState([]);
  const [servings, setServings] = useState('1');

  // Calculated calories from macros
  const calculatedCalories = useMemo(() => {
    const p = parseFloat(protein) || 0;
    const c = parseFloat(carbs) || 0;
    const f = parseFloat(fat) || 0;
    return Math.round(p * 4 + c * 4 + f * 9);
  }, [protein, carbs, fat]);

  // Auto-fill calories from macros if not manually set
  const displayCalories = calories || (calculatedCalories > 0 ? calculatedCalories.toString() : '');

  // Recipe totals
  const recipeTotals = useMemo(() => {
    const numServings = Math.max(1, parseInt(servings) || 1);
    const totals = ingredients.reduce(
      (acc, ing) => ({
        calories: acc.calories + (ing.calories || 0) * (ing.quantity || 1),
        protein: acc.protein + (ing.protein || 0) * (ing.quantity || 1),
        carbs: acc.carbs + (ing.carbs || 0) * (ing.quantity || 1),
        fat: acc.fat + (ing.fat || 0) * (ing.quantity || 1),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 },
    );

    return {
      calories: Math.round(totals.calories / numServings),
      protein: Math.round(totals.protein / numServings * 10) / 10,
      carbs: Math.round(totals.carbs / numServings * 10) / 10,
      fat: Math.round(totals.fat / numServings * 10) / 10,
      totalCalories: Math.round(totals.calories),
    };
  }, [ingredients, servings]);

  // Handle scan nutrition label
  const handleScanLabel = useCallback(async () => {
    hapticLight();
    Alert.alert(
      'Scan Nutrition Label',
      'Take a photo of a nutrition label and AI will extract the data automatically.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open Camera',
          onPress: () => {
            router.push({
              pathname: '/scan',
              params: { mode: 'nutrition-label', returnTo: 'create-food-enhanced' },
            });
          },
        },
      ],
    );
  }, [router]);

  // Add ingredient to recipe
  const handleAddIngredient = useCallback(() => {
    hapticLight();
    // Placeholder -- in full implementation, open SmartFoodSearch
    Alert.prompt(
      'Add Ingredient',
      'Enter ingredient name',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add',
          onPress: (ingredientName) => {
            if (ingredientName?.trim()) {
              setIngredients((prev) => [
                ...prev,
                {
                  name: ingredientName.trim(),
                  calories: 0,
                  protein: 0,
                  carbs: 0,
                  fat: 0,
                  serving: '1 serving',
                  quantity: 1,
                },
              ]);
            }
          },
        },
      ],
      'plain-text',
    );
  }, []);

  // Remove ingredient from recipe
  const handleRemoveIngredient = useCallback((index) => {
    hapticLight();
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Build micronutrients object
  const buildMicronutrients = useCallback(() => {
    const micro = {};
    const addIfPresent = (key, val) => {
      const num = parseFloat(val);
      if (!isNaN(num) && num > 0) micro[key] = num;
    };

    addIfPresent('fiber', fiber);
    addIfPresent('sugar', sugar);
    addIfPresent('sodium', sodium);
    addIfPresent('saturated_fat', saturatedFat);
    addIfPresent('cholesterol', cholesterol);
    addIfPresent('calcium', calcium);
    addIfPresent('iron', iron);
    addIfPresent('potassium', potassium);
    addIfPresent('vitaminA', vitaminA);
    addIfPresent('vitaminC', vitaminC);
    addIfPresent('vitaminD', vitaminD);

    return Object.keys(micro).length > 0 ? micro : undefined;
  }, [fiber, sugar, sodium, saturatedFat, cholesterol, calcium, iron, potassium, vitaminA, vitaminC, vitaminD]);

  // Save food
  const handleSave = useCallback(() => {
    const trimmedName = sanitizeFoodName(name);
    if (!trimmedName) {
      Alert.alert('Name Required', 'Please enter a food name.');
      return;
    }

    let foodEntry;

    if (activeTab === 'recipe') {
      if (ingredients.length === 0) {
        Alert.alert('No Ingredients', 'Add at least one ingredient to your recipe.');
        return;
      }

      foodEntry = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
        name: trimmedName,
        emoji: selectedEmoji,
        calories: recipeTotals.calories,
        protein: recipeTotals.protein,
        carbs: recipeTotals.carbs,
        fat: recipeTotals.fat,
        serving: `1 serving (1/${servings} recipe)`,
        servingSize: 1,
        servingUnit: 'serving',
        isRecipe: true,
        ingredients: ingredients.map((i) => ({ ...i })),
        servings: parseInt(servings) || 1,
      };
    } else {
      const cal = parseInt(displayCalories) || 0;
      const prot = parseFloat(protein) || 0;
      const carb = parseFloat(carbs) || 0;
      const fatVal = parseFloat(fat) || 0;

      if (cal === 0 && prot === 0 && carb === 0 && fatVal === 0) {
        Alert.alert('Nutrition Required', 'Please enter at least calories or macros.');
        return;
      }

      foodEntry = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
        name: trimmedName,
        emoji: selectedEmoji,
        calories: cal,
        protein: prot,
        carbs: carb,
        fat: fatVal,
        serving: serving || '1 serving',
        servingSize: 1,
        servingUnit: 'serving',
        micronutrients: buildMicronutrients(),
      };
    }

    addFood(foodEntry, initialMeal);
    hapticSuccess();
    router.back();
  }, [
    name, selectedEmoji, displayCalories, protein, carbs, fat, serving,
    activeTab, ingredients, servings, recipeTotals, initialMeal,
    addFood, router, buildMicronutrients,
  ]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color={Colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Create Food</Text>
          <Pressable style={styles.saveButton} onPress={handleSave}>
            <Check size={20} color="#fff" />
            <Text style={styles.saveButtonText}>Save</Text>
          </Pressable>
        </View>

        {/* Tab Selector */}
        <View style={styles.tabRow}>
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <Pressable
                key={tab.id}
                style={[styles.tab, isActive && styles.tabActive]}
                onPress={() => {
                  hapticLight();
                  setActiveTab(tab.id);
                }}
              >
                <Icon
                  size={16}
                  color={isActive ? Colors.primary : Colors.textSecondary}
                />
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Name & Emoji */}
          <Animated.View entering={FadeInDown.delay(50).duration(300)}>
            <View style={styles.nameRow}>
              <Pressable
                style={styles.emojiButton}
                onPress={() => setShowEmojiPicker(!showEmojiPicker)}
              >
                <Text style={styles.emojiText}>{selectedEmoji}</Text>
              </Pressable>
              <TextInput
                style={styles.nameInput}
                placeholder="Food name"
                placeholderTextColor={Colors.textTertiary}
                value={name}
                onChangeText={setName}
                maxLength={100}
                autoFocus
              />
            </View>

            {showEmojiPicker && (
              <Animated.View entering={FadeIn.duration(200)}>
                <View style={styles.emojiPicker}>
                  {FOOD_EMOJIS.map((emoji) => (
                    <Pressable
                      key={emoji}
                      style={[
                        styles.emojiOption,
                        selectedEmoji === emoji && styles.emojiOptionSelected,
                      ]}
                      onPress={() => {
                        setSelectedEmoji(emoji);
                        setShowEmojiPicker(false);
                      }}
                    >
                      <Text style={styles.emojiOptionText}>{emoji}</Text>
                    </Pressable>
                  ))}
                </View>
              </Animated.View>
            )}
          </Animated.View>

          {/* Serving Size */}
          <Animated.View entering={FadeInDown.delay(100).duration(300)}>
            <View style={styles.servingRow}>
              <Text style={styles.fieldLabel}>Serving Size</Text>
              <TextInput
                style={styles.servingInput}
                value={serving}
                onChangeText={setServing}
                placeholder="e.g. 1 cup, 100g"
                placeholderTextColor={Colors.textTertiary}
                maxLength={50}
              />
            </View>
          </Animated.View>

          {/* === MANUAL TAB === */}
          {activeTab === 'manual' && (
            <Animated.View entering={FadeInDown.delay(150).duration(300)}>
              {/* Calories */}
              <View style={styles.caloriesRow}>
                <View style={[styles.macroInputIcon, { backgroundColor: Colors.secondary + '20' }]}>
                  <Flame size={16} color={Colors.secondary} />
                </View>
                <Text style={styles.macroInputLabel}>Calories</Text>
                <TextInput
                  style={[styles.macroInputField, styles.caloriesField]}
                  value={displayCalories}
                  onChangeText={setCalories}
                  keyboardType="numeric"
                  placeholder={calculatedCalories > 0 ? calculatedCalories.toString() : '0'}
                  placeholderTextColor={Colors.textTertiary}
                  maxLength={5}
                />
                <Text style={styles.macroInputUnit}>kcal</Text>
              </View>

              {calculatedCalories > 0 && !calories && (
                <Text style={styles.autoCalHint}>
                  Auto-calculated from macros
                </Text>
              )}

              {/* Macros */}
              <Text style={styles.sectionLabel}>Macronutrients</Text>
              <MacroInput
                label="Protein"
                value={protein}
                onChange={setProtein}
                color={Colors.protein}
                icon={Beef}
              />
              <MacroInput
                label="Carbs"
                value={carbs}
                onChange={setCarbs}
                color={Colors.carbs}
                icon={Wheat}
              />
              <MacroInput
                label="Fat"
                value={fat}
                onChange={setFat}
                color={Colors.fat}
                icon={Droplets}
              />

              {/* Micronutrients (collapsible) */}
              <Pressable
                style={styles.microsToggle}
                onPress={() => setShowMicros(!showMicros)}
              >
                <Text style={styles.microsToggleText}>Micronutrients</Text>
                {showMicros ? (
                  <ChevronUp size={16} color={Colors.textSecondary} />
                ) : (
                  <ChevronDown size={16} color={Colors.textSecondary} />
                )}
              </Pressable>

              {showMicros && (
                <Animated.View entering={FadeInDown.duration(200)}>
                  <View style={styles.microsGrid}>
                    <MicroInput label="Fiber" value={fiber} onChange={setFiber} unit="g" />
                    <MicroInput label="Sugar" value={sugar} onChange={setSugar} unit="g" />
                    <MicroInput label="Sodium" value={sodium} onChange={setSodium} unit="mg" />
                    <MicroInput label="Sat. Fat" value={saturatedFat} onChange={setSaturatedFat} unit="g" />
                    <MicroInput label="Cholesterol" value={cholesterol} onChange={setCholesterol} unit="mg" />
                    <MicroInput label="Calcium" value={calcium} onChange={setCalcium} unit="mg" />
                    <MicroInput label="Iron" value={iron} onChange={setIron} unit="mg" />
                    <MicroInput label="Potassium" value={potassium} onChange={setPotassium} unit="mg" />
                    <MicroInput label="Vitamin A" value={vitaminA} onChange={setVitaminA} unit="mcg" />
                    <MicroInput label="Vitamin C" value={vitaminC} onChange={setVitaminC} unit="mg" />
                    <MicroInput label="Vitamin D" value={vitaminD} onChange={setVitaminD} unit="mcg" />
                  </View>
                </Animated.View>
              )}
            </Animated.View>
          )}

          {/* === SCAN TAB === */}
          {activeTab === 'scan' && (
            <Animated.View entering={FadeInDown.delay(150).duration(300)}>
              <View style={styles.scanSection}>
                <View style={styles.scanCard}>
                  <Camera size={48} color={Colors.primary} />
                  <Text style={styles.scanTitle}>Scan Nutrition Label</Text>
                  <Text style={styles.scanDescription}>
                    Take a photo of a nutrition facts label and AI will automatically extract
                    all the nutrition data for you.
                  </Text>
                  <Pressable style={styles.scanButton} onPress={handleScanLabel}>
                    <Camera size={20} color="#fff" />
                    <Text style={styles.scanButtonText}>Open Camera</Text>
                  </Pressable>
                </View>

                <View style={styles.scanDivider}>
                  <View style={styles.scanDividerLine} />
                  <Text style={styles.scanDividerText}>OR</Text>
                  <View style={styles.scanDividerLine} />
                </View>

                <Pressable
                  style={styles.barcodeButton}
                  onPress={() => router.push('/barcode')}
                >
                  <ScanBarcode size={20} color={Colors.primary} />
                  <Text style={styles.barcodeButtonText}>Scan Barcode Instead</Text>
                </Pressable>
              </View>
            </Animated.View>
          )}

          {/* === RECIPE TAB === */}
          {activeTab === 'recipe' && (
            <Animated.View entering={FadeInDown.delay(150).duration(300)}>
              {/* Servings */}
              <View style={styles.servingsRow}>
                <Text style={styles.fieldLabel}>Servings in recipe</Text>
                <View style={styles.servingsControls}>
                  <Pressable
                    style={styles.servingsBtn}
                    onPress={() => {
                      hapticLight();
                      setServings((prev) =>
                        Math.max(1, parseInt(prev) - 1).toString(),
                      );
                    }}
                  >
                    <Minus size={16} color={Colors.text} />
                  </Pressable>
                  <TextInput
                    style={styles.servingsInput}
                    value={servings}
                    onChangeText={setServings}
                    keyboardType="numeric"
                    maxLength={3}
                  />
                  <Pressable
                    style={styles.servingsBtn}
                    onPress={() => {
                      hapticLight();
                      setServings((prev) =>
                        Math.min(100, parseInt(prev) + 1).toString(),
                      );
                    }}
                  >
                    <Plus size={16} color={Colors.text} />
                  </Pressable>
                </View>
              </View>

              {/* Ingredients list */}
              <Text style={styles.sectionLabel}>Ingredients</Text>

              {ingredients.length === 0 ? (
                <View style={styles.emptyIngredients}>
                  <ChefHat size={32} color={Colors.textTertiary} />
                  <Text style={styles.emptyIngredientsText}>
                    No ingredients added yet
                  </Text>
                  <Text style={styles.emptyIngredientsHint}>
                    Add ingredients to auto-calculate nutrition
                  </Text>
                </View>
              ) : (
                <>
                  {ingredients.map((ingredient, index) => (
                    <IngredientItem
                      key={`${ingredient.name}-${index}`}
                      ingredient={ingredient}
                      onRemove={handleRemoveIngredient}
                      index={index}
                    />
                  ))}

                  {/* Recipe Totals */}
                  <View style={styles.recipeTotals}>
                    <Text style={styles.recipeTotalsTitle}>Per Serving</Text>
                    <View style={styles.recipeTotalsRow}>
                      <View style={styles.recipeTotalItem}>
                        <Text style={styles.recipeTotalValue}>{recipeTotals.calories}</Text>
                        <Text style={styles.recipeTotalLabel}>kcal</Text>
                      </View>
                      <View style={styles.recipeTotalItem}>
                        <Text style={[styles.recipeTotalValue, { color: Colors.protein }]}>
                          {recipeTotals.protein}g
                        </Text>
                        <Text style={styles.recipeTotalLabel}>Protein</Text>
                      </View>
                      <View style={styles.recipeTotalItem}>
                        <Text style={[styles.recipeTotalValue, { color: Colors.carbs }]}>
                          {recipeTotals.carbs}g
                        </Text>
                        <Text style={styles.recipeTotalLabel}>Carbs</Text>
                      </View>
                      <View style={styles.recipeTotalItem}>
                        <Text style={[styles.recipeTotalValue, { color: Colors.fat }]}>
                          {recipeTotals.fat}g
                        </Text>
                        <Text style={styles.recipeTotalLabel}>Fat</Text>
                      </View>
                    </View>
                  </View>
                </>
              )}

              <Pressable style={styles.addIngredientBtn} onPress={handleAddIngredient}>
                <Plus size={20} color={Colors.primary} />
                <Text style={styles.addIngredientText}>Add Ingredient</Text>
              </Pressable>
            </Animated.View>
          )}

          {/* Bottom spacer */}
          <View style={styles.bottomSpacer} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    ...Shadows.button,
  },
  saveButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: '#fff',
  },

  // Tabs
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xs,
    marginBottom: Spacing.md,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  tabActive: {
    backgroundColor: Colors.surfaceElevated,
  },
  tabText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
  },

  // Content
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: Spacing.md,
  },

  // Name & Emoji
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  emojiButton: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emojiText: {
    fontSize: 28,
  },
  nameInput: {
    flex: 1,
    height: 52,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emojiPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emojiOption: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiOptionSelected: {
    backgroundColor: Colors.primary + '20',
    borderWidth: 1,
    borderColor: Colors.primary + '60',
  },
  emojiOptionText: {
    fontSize: 24,
  },

  // Serving
  servingRow: {
    marginBottom: Spacing.lg,
  },
  fieldLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  servingInput: {
    height: 44,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  // Macro inputs
  sectionLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  macroInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  macroInputIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  macroInputLabel: {
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.text,
    marginLeft: Spacing.sm,
  },
  macroInputField: {
    width: 80,
    height: 40,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    textAlign: 'right',
  },
  macroInputUnit: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginLeft: Spacing.xs,
    width: 30,
  },

  // Calories row
  caloriesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    marginBottom: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.secondary + '30',
  },
  caloriesField: {
    borderWidth: 1,
    borderColor: Colors.secondary + '30',
  },
  autoCalHint: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    textAlign: 'right',
    marginBottom: Spacing.sm,
  },

  // Micronutrients
  microsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: Spacing.md,
  },
  microsToggleText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  microsGrid: {
    gap: Spacing.sm,
  },
  microInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  microInputLabel: {
    flex: 1,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.text,
  },
  microInputField: {
    width: 60,
    height: 36,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.xs,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    textAlign: 'right',
  },
  microInputUnit: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginLeft: 4,
    width: 28,
  },

  // Scan section
  scanSection: {
    marginTop: Spacing.md,
  },
  scanCard: {
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
    borderStyle: 'dashed',
  },
  scanTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginTop: Spacing.md,
  },
  scanDescription: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xs,
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    ...Shadows.button,
  },
  scanButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: '#fff',
  },
  scanDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.lg,
    gap: Spacing.sm,
  },
  scanDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  scanDividerText: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    fontWeight: FontWeight.medium,
  },
  barcodeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary + '15',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.primary + '40',
  },
  barcodeButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },

  // Recipe section
  servingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  servingsControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  servingsBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  servingsInput: {
    width: 50,
    height: 40,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    textAlign: 'center',
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  // Ingredients
  emptyIngredients: {
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    marginBottom: Spacing.md,
  },
  emptyIngredientsText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
  emptyIngredientsHint: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  ingredientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  ingredientInfo: {
    flex: 1,
  },
  ingredientName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  ingredientServing: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  ingredientMacros: {
    marginRight: Spacing.sm,
  },
  ingredientCal: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  ingredientRemove: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.error + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addIngredientBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary + '15',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.primary + '40',
    borderStyle: 'dashed',
  },
  addIngredientText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },

  // Recipe Totals
  recipeTotals: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  recipeTotalsTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  recipeTotalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  recipeTotalItem: {
    alignItems: 'center',
  },
  recipeTotalValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  recipeTotalLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  bottomSpacer: {
    height: 120,
  },
});

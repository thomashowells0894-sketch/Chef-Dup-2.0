/**
 * Food Comparison Tool - Side-by-Side Nutritional Comparison
 *
 * Features:
 * - Two food slots with search functionality
 * - Built-in database of 40 common foods
 * - Side-by-side macro comparison with proportional bars
 * - Winner badges for key nutritional metrics
 * - Swap button to switch food positions
 * - Quick swap suggestions for similar foods
 * - Recent comparisons saved to AsyncStorage
 * - Glass card styling with FadeInDown animations
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import ReAnimated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  Scale,
  Search,
  X,
  ArrowLeftRight,
  Trophy,
  Flame,
  Zap,
  Leaf,
  Droplets,
  RotateCcw,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Award,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
import { hapticLight, hapticSuccess } from '../lib/haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SLOT_WIDTH = (SCREEN_WIDTH - Spacing.md * 3) / 2;
const STORAGE_KEY = '@vibefit_recent_comparisons';

// ---------------------------------------------------------------------------
// Built-in food database (40 common foods)
// ---------------------------------------------------------------------------
const COMMON_FOODS = [
  { name: 'Chicken Breast', emoji: '\uD83C\uDF57', serving: '100g', calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0 },
  { name: 'Brown Rice', emoji: '\uD83C\uDF5A', serving: '100g', calories: 123, protein: 2.7, carbs: 25.6, fat: 1, fiber: 1.6 },
  { name: 'Salmon', emoji: '\uD83D\uDC1F', serving: '100g', calories: 208, protein: 20, carbs: 0, fat: 13, fiber: 0 },
  { name: 'Egg', emoji: '\uD83E\uDD5A', serving: '1 large', calories: 72, protein: 6.3, carbs: 0.4, fat: 5, fiber: 0 },
  { name: 'Banana', emoji: '\uD83C\uDF4C', serving: '1 medium', calories: 105, protein: 1.3, carbs: 27, fat: 0.4, fiber: 3.1 },
  { name: 'Apple', emoji: '\uD83C\uDF4E', serving: '1 medium', calories: 95, protein: 0.5, carbs: 25, fat: 0.3, fiber: 4.4 },
  { name: 'Greek Yogurt', emoji: '\uD83E\uDD5B', serving: '170g', calories: 100, protein: 17, carbs: 6, fat: 0.7, fiber: 0 },
  { name: 'Oatmeal', emoji: '\uD83E\uDD63', serving: '100g', calories: 68, protein: 2.4, carbs: 12, fat: 1.4, fiber: 1.7 },
  { name: 'Sweet Potato', emoji: '\uD83C\uDF60', serving: '100g', calories: 86, protein: 1.6, carbs: 20, fat: 0.1, fiber: 3 },
  { name: 'Broccoli', emoji: '\uD83E\uDD66', serving: '100g', calories: 34, protein: 2.8, carbs: 7, fat: 0.4, fiber: 2.6 },
  { name: 'Avocado', emoji: '\uD83E\uDD51', serving: '100g', calories: 160, protein: 2, carbs: 8.5, fat: 14.7, fiber: 6.7 },
  { name: 'Almonds', emoji: '\uD83C\uDF30', serving: '28g', calories: 164, protein: 6, carbs: 6, fat: 14, fiber: 3.5 },
  { name: 'Tofu', emoji: '\uD83E\uDDC8', serving: '100g', calories: 76, protein: 8, carbs: 1.9, fat: 4.8, fiber: 0.3 },
  { name: 'Beef Steak', emoji: '\uD83E\uDD69', serving: '100g', calories: 271, protein: 26, carbs: 0, fat: 18, fiber: 0 },
  { name: 'Pasta', emoji: '\uD83C\uDF5D', serving: '100g', calories: 131, protein: 5, carbs: 25, fat: 1.1, fiber: 1.8 },
  { name: 'White Rice', emoji: '\uD83C\uDF5A', serving: '100g', calories: 130, protein: 2.7, carbs: 28, fat: 0.3, fiber: 0.4 },
  { name: 'Bread (Whole Wheat)', emoji: '\uD83C\uDF5E', serving: '1 slice', calories: 81, protein: 4, carbs: 14, fat: 1, fiber: 2 },
  { name: 'Peanut Butter', emoji: '\uD83E\uDD5C', serving: '2 tbsp', calories: 188, protein: 8, carbs: 6, fat: 16, fiber: 2 },
  { name: 'Cottage Cheese', emoji: '\uD83E\uDDC0', serving: '100g', calories: 98, protein: 11, carbs: 3.4, fat: 4.3, fiber: 0 },
  { name: 'Quinoa', emoji: '\uD83C\uDF3E', serving: '100g', calories: 120, protein: 4.4, carbs: 21, fat: 1.9, fiber: 2.8 },
  { name: 'Spinach', emoji: '\uD83E\uDD6C', serving: '100g', calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4, fiber: 2.2 },
  { name: 'Turkey Breast', emoji: '\uD83E\uDD83', serving: '100g', calories: 135, protein: 30, carbs: 0, fat: 1, fiber: 0 },
  { name: 'Tuna (canned)', emoji: '\uD83D\uDC1F', serving: '100g', calories: 116, protein: 26, carbs: 0, fat: 1, fiber: 0 },
  { name: 'Milk (2%)', emoji: '\uD83E\uDD5B', serving: '240ml', calories: 122, protein: 8, carbs: 12, fat: 5, fiber: 0 },
  { name: 'Orange', emoji: '\uD83C\uDF4A', serving: '1 medium', calories: 62, protein: 1.2, carbs: 15, fat: 0.2, fiber: 3.1 },
  { name: 'Blueberries', emoji: '\uD83E\uDED0', serving: '100g', calories: 57, protein: 0.7, carbs: 14, fat: 0.3, fiber: 2.4 },
  { name: 'Lentils', emoji: '\uD83E\uDED8', serving: '100g', calories: 116, protein: 9, carbs: 20, fat: 0.4, fiber: 7.9 },
  { name: 'Chickpeas', emoji: '\uD83E\uDED8', serving: '100g', calories: 164, protein: 8.9, carbs: 27, fat: 2.6, fiber: 7.6 },
  { name: 'Dark Chocolate', emoji: '\uD83C\uDF6B', serving: '28g', calories: 155, protein: 1.4, carbs: 17, fat: 9, fiber: 2 },
  { name: 'Protein Shake', emoji: '\uD83E\uDD64', serving: '1 scoop', calories: 120, protein: 24, carbs: 3, fat: 1.5, fiber: 0 },
  { name: 'Bacon', emoji: '\uD83E\uDD53', serving: '3 slices', calories: 161, protein: 12, carbs: 0.4, fat: 12, fiber: 0 },
  { name: 'Potato', emoji: '\uD83E\uDD54', serving: '1 medium', calories: 161, protein: 4.3, carbs: 37, fat: 0.2, fiber: 3.8 },
  { name: 'Shrimp', emoji: '\uD83E\uDD90', serving: '100g', calories: 99, protein: 24, carbs: 0.2, fat: 0.3, fiber: 0 },
  { name: 'Hummus', emoji: '\uD83E\uDED5', serving: '2 tbsp', calories: 70, protein: 2, carbs: 6, fat: 5, fiber: 1 },
  { name: 'Granola', emoji: '\uD83E\uDD63', serving: '50g', calories: 225, protein: 5, carbs: 32, fat: 9, fiber: 3 },
  { name: 'Sushi Roll', emoji: '\uD83C\uDF63', serving: '6 pieces', calories: 250, protein: 9, carbs: 38, fat: 7, fiber: 2 },
  { name: 'Pizza Slice', emoji: '\uD83C\uDF55', serving: '1 slice', calories: 285, protein: 12, carbs: 36, fat: 10, fiber: 2 },
  { name: 'Ice Cream', emoji: '\uD83C\uDF66', serving: '100g', calories: 207, protein: 3.5, carbs: 24, fat: 11, fiber: 0 },
  { name: 'Popcorn', emoji: '\uD83C\uDF7F', serving: '28g', calories: 106, protein: 3, carbs: 19, fat: 1.2, fiber: 3.6 },
  { name: 'Coconut Water', emoji: '\uD83E\uDD65', serving: '240ml', calories: 46, protein: 1.7, carbs: 9, fat: 0.5, fiber: 2.6 },
];

// ---------------------------------------------------------------------------
// Similar food categories for "Compare with..." suggestions
// ---------------------------------------------------------------------------
const FOOD_CATEGORIES = {
  protein: ['Chicken Breast', 'Turkey Breast', 'Salmon', 'Tuna (canned)', 'Beef Steak', 'Shrimp', 'Egg', 'Tofu', 'Protein Shake'],
  grains: ['Brown Rice', 'White Rice', 'Pasta', 'Quinoa', 'Oatmeal', 'Bread (Whole Wheat)'],
  dairy: ['Greek Yogurt', 'Cottage Cheese', 'Milk (2%)', 'Ice Cream'],
  fruits: ['Banana', 'Apple', 'Orange', 'Blueberries', 'Coconut Water'],
  vegetables: ['Broccoli', 'Sweet Potato', 'Spinach', 'Potato', 'Avocado'],
  legumes: ['Lentils', 'Chickpeas', 'Hummus'],
  nuts: ['Almonds', 'Peanut Butter'],
  snacks: ['Dark Chocolate', 'Popcorn', 'Granola', 'Bacon', 'Pizza Slice', 'Sushi Roll'],
};

function getCategoryForFood(foodName) {
  for (const [category, foods] of Object.entries(FOOD_CATEGORIES)) {
    if (foods.includes(foodName)) return category;
  }
  return null;
}

function getSuggestionsForFood(food) {
  if (!food) return [];
  const category = getCategoryForFood(food.name);
  if (!category) return [];
  return FOOD_CATEGORIES[category]
    .filter((n) => n !== food.name)
    .slice(0, 4)
    .map((name) => COMMON_FOODS.find((f) => f.name === name))
    .filter(Boolean);
}

// ---------------------------------------------------------------------------
// Macro comparison configuration
// ---------------------------------------------------------------------------
const MACROS = [
  { key: 'calories', label: 'Calories', unit: 'kcal', icon: Flame, positiveWhen: 'lower', color: Colors.secondary },
  { key: 'protein', label: 'Protein', unit: 'g', icon: Zap, positiveWhen: 'higher', color: Colors.protein },
  { key: 'carbs', label: 'Carbs', unit: 'g', icon: Droplets, positiveWhen: 'lower', color: Colors.carbs },
  { key: 'fat', label: 'Fat', unit: 'g', icon: Droplets, positiveWhen: 'lower', color: Colors.fat },
  { key: 'fiber', label: 'Fiber', unit: 'g', icon: Leaf, positiveWhen: 'higher', color: Colors.success },
];

function getWinnerBadges(foodA, foodB) {
  if (!foodA || !foodB) return [];
  const badges = [];

  if (foodA.protein > foodB.protein) {
    badges.push({ label: `${foodA.emoji} Higher Protein`, color: Colors.success, side: 'A' });
  } else if (foodB.protein > foodA.protein) {
    badges.push({ label: `${foodB.emoji} Higher Protein`, color: Colors.success, side: 'B' });
  }

  if (foodA.calories < foodB.calories) {
    badges.push({ label: `${foodA.emoji} Lower Calorie`, color: Colors.primary, side: 'A' });
  } else if (foodB.calories < foodA.calories) {
    badges.push({ label: `${foodB.emoji} Lower Calorie`, color: Colors.primary, side: 'B' });
  }

  if (foodA.fiber > foodB.fiber) {
    badges.push({ label: `${foodA.emoji} More Fiber`, color: Colors.success, side: 'A' });
  } else if (foodB.fiber > foodA.fiber) {
    badges.push({ label: `${foodB.emoji} More Fiber`, color: Colors.success, side: 'B' });
  }

  if (foodA.fat < foodB.fat) {
    badges.push({ label: `${foodA.emoji} Lower Fat`, color: Colors.primary, side: 'A' });
  } else if (foodB.fat < foodA.fat) {
    badges.push({ label: `${foodB.emoji} Lower Fat`, color: Colors.primary, side: 'B' });
  }

  if (foodA.carbs < foodB.carbs) {
    badges.push({ label: `${foodA.emoji} Lower Carbs`, color: Colors.primary, side: 'A' });
  } else if (foodB.carbs < foodA.carbs) {
    badges.push({ label: `${foodB.emoji} Lower Carbs`, color: Colors.primary, side: 'B' });
  }

  return badges;
}

// ---------------------------------------------------------------------------
// FoodSlot -- search + select + display for one side
// ---------------------------------------------------------------------------
function FoodSlot({ food, onSelect, onClear, slotLabel, index }) {
  const [query, setQuery] = useState('');
  const [showResults, setShowResults] = useState(false);

  const filteredFoods = useMemo(() => {
    if (!query.trim()) return COMMON_FOODS.slice(0, 10);
    const lowerQ = query.toLowerCase();
    return COMMON_FOODS.filter((f) =>
      f.name.toLowerCase().includes(lowerQ)
    ).slice(0, 8);
  }, [query]);

  const handleSelect = useCallback(
    async (item) => {
      await hapticLight();
      onSelect(item);
      setQuery('');
      setShowResults(false);
    },
    [onSelect]
  );

  const handleClear = useCallback(async () => {
    await hapticLight();
    onClear();
    setQuery('');
    setShowResults(false);
  }, [onClear]);

  if (food) {
    return (
      <ReAnimated.View
        entering={FadeInDown.delay(index * 80 + 100).springify().mass(0.5).damping(10)}
        style={styles.slotContainer}
      >
        <LinearGradient
          colors={Gradients.card}
          style={styles.slotCard}
        >
          <View style={styles.slotLabelRow}>
            <Text style={styles.slotLabel}>{slotLabel}</Text>
            <Pressable onPress={handleClear} hitSlop={8}>
              <X size={16} color={Colors.textTertiary} />
            </Pressable>
          </View>

          <Text style={styles.selectedEmoji}>{food.emoji}</Text>
          <Text style={styles.selectedName} numberOfLines={2}>{food.name}</Text>
          <Text style={styles.selectedServing}>{food.serving}</Text>

          <View style={styles.selectedMacros}>
            <View style={styles.macroChip}>
              <Text style={[styles.macroChipValue, { color: Colors.secondary }]}>{food.calories}</Text>
              <Text style={styles.macroChipLabel}>cal</Text>
            </View>
            <View style={styles.macroChip}>
              <Text style={[styles.macroChipValue, { color: Colors.protein }]}>{food.protein}g</Text>
              <Text style={styles.macroChipLabel}>pro</Text>
            </View>
            <View style={styles.macroChip}>
              <Text style={[styles.macroChipValue, { color: Colors.carbs }]}>{food.carbs}g</Text>
              <Text style={styles.macroChipLabel}>carb</Text>
            </View>
            <View style={styles.macroChip}>
              <Text style={[styles.macroChipValue, { color: Colors.fat }]}>{food.fat}g</Text>
              <Text style={styles.macroChipLabel}>fat</Text>
            </View>
          </View>

          {food.fiber > 0 && (
            <View style={styles.fiberRow}>
              <Leaf size={12} color={Colors.success} />
              <Text style={styles.fiberText}>{food.fiber}g fiber</Text>
            </View>
          )}
        </LinearGradient>
      </ReAnimated.View>
    );
  }

  return (
    <ReAnimated.View
      entering={FadeInDown.delay(index * 80 + 100).springify().mass(0.5).damping(10)}
      style={styles.slotContainer}
    >
      <LinearGradient
        colors={Gradients.card}
        style={[styles.slotCard, styles.slotCardEmpty]}
      >
        <Text style={styles.slotLabel}>{slotLabel}</Text>

        <View style={styles.searchContainer}>
          <Search size={14} color={Colors.textTertiary} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={(text) => {
              setQuery(text);
              setShowResults(true);
            }}
            onFocus={() => setShowResults(true)}
            placeholder="Search food..."
            placeholderTextColor={Colors.textTertiary}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable onPress={() => { setQuery(''); }} hitSlop={8}>
              <X size={14} color={Colors.textTertiary} />
            </Pressable>
          )}
        </View>

        {showResults && (
          <ScrollView
            style={styles.resultsList}
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {filteredFoods.length === 0 ? (
              <Text style={styles.noResults}>No foods found</Text>
            ) : (
              filteredFoods.map((item) => (
                <Pressable
                  key={item.name}
                  style={styles.resultItem}
                  onPress={() => handleSelect(item)}
                >
                  <Text style={styles.resultEmoji}>{item.emoji}</Text>
                  <View style={styles.resultInfo}>
                    <Text style={styles.resultName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.resultCals}>{item.calories} cal</Text>
                  </View>
                </Pressable>
              ))
            )}
          </ScrollView>
        )}

        {!showResults && (
          <View style={styles.emptyHint}>
            <Scale size={28} color={Colors.textTertiary} />
            <Text style={styles.emptyHintText}>Tap search to add food</Text>
          </View>
        )}
      </LinearGradient>
    </ReAnimated.View>
  );
}

// ---------------------------------------------------------------------------
// MacroComparisonBar -- proportional bars for a single macro
// ---------------------------------------------------------------------------
function MacroComparisonBar({ macro, foodA, foodB, index }) {
  const valA = foodA[macro.key];
  const valB = foodB[macro.key];
  const maxVal = Math.max(valA, valB, 1);

  const widthA = (valA / maxVal) * 100;
  const widthB = (valB / maxVal) * 100;

  const aWins = macro.positiveWhen === 'higher' ? valA > valB : valA < valB;
  const bWins = macro.positiveWhen === 'higher' ? valB > valA : valB < valA;
  const tied = valA === valB;

  const highlightColorA = aWins ? Colors.success : Colors.warning;
  const highlightColorB = bWins ? Colors.success : Colors.warning;
  const IconComponent = macro.icon;

  return (
    <ReAnimated.View
      entering={FadeInDown.delay(index * 60 + 300).springify().mass(0.5).damping(10)}
      style={styles.comparisonRow}
    >
      <View style={styles.comparisonHeader}>
        <View style={styles.comparisonLabelRow}>
          <IconComponent size={14} color={macro.color} />
          <Text style={styles.comparisonLabel}>{macro.label}</Text>
        </View>
      </View>

      <View style={styles.barsContainer}>
        {/* Food A bar */}
        <View style={styles.barRow}>
          <Text style={[
            styles.barValue,
            !tied && aWins && { color: Colors.success },
            !tied && !aWins && { color: Colors.textSecondary },
          ]}>
            {valA}{macro.unit === 'kcal' ? '' : macro.unit}
          </Text>
          <View style={styles.barTrack}>
            <LinearGradient
              colors={tied ? [macro.color + '80', macro.color + '40'] : aWins ? [Colors.success + 'CC', Colors.success + '60'] : [highlightColorA + '60', highlightColorA + '30']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.barFill, { width: `${Math.max(widthA, 4)}%` }]}
            />
          </View>
        </View>

        {/* Food B bar */}
        <View style={styles.barRow}>
          <Text style={[
            styles.barValue,
            !tied && bWins && { color: Colors.success },
            !tied && !bWins && { color: Colors.textSecondary },
          ]}>
            {valB}{macro.unit === 'kcal' ? '' : macro.unit}
          </Text>
          <View style={styles.barTrack}>
            <LinearGradient
              colors={tied ? [macro.color + '80', macro.color + '40'] : bWins ? [Colors.success + 'CC', Colors.success + '60'] : [highlightColorB + '60', highlightColorB + '30']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.barFill, { width: `${Math.max(widthB, 4)}%` }]}
            />
          </View>
        </View>
      </View>
    </ReAnimated.View>
  );
}

// ---------------------------------------------------------------------------
// WinnerBadge component
// ---------------------------------------------------------------------------
function WinnerBadge({ badge, index }) {
  return (
    <ReAnimated.View
      entering={FadeInDown.delay(index * 50 + 500).springify().mass(0.5).damping(10)}
    >
      <View style={[styles.winnerBadge, { borderColor: badge.color + '40' }]}>
        <Award size={12} color={badge.color} />
        <Text style={[styles.winnerBadgeText, { color: badge.color }]}>
          {badge.label}
        </Text>
      </View>
    </ReAnimated.View>
  );
}

// ---------------------------------------------------------------------------
// QuickSwapSuggestion component
// ---------------------------------------------------------------------------
function QuickSwapSuggestion({ food, onSelect, index }) {
  return (
    <Pressable
      style={styles.suggestionChip}
      onPress={() => onSelect(food)}
    >
      <Text style={styles.suggestionEmoji}>{food.emoji}</Text>
      <Text style={styles.suggestionName} numberOfLines={1}>{food.name}</Text>
      <ChevronRight size={12} color={Colors.textTertiary} />
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------
export default function FoodCompareScreen() {
  const [foodA, setFoodA] = useState(null);
  const [foodB, setFoodB] = useState(null);
  const [recentComparisons, setRecentComparisons] = useState([]);

  // Load recent comparisons from AsyncStorage
  useEffect(() => {
    loadRecentComparisons();
  }, []);

  const loadRecentComparisons = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        setRecentComparisons(JSON.parse(stored));
      }
    } catch {
      // Ignore storage errors
    }
  };

  const saveComparison = useCallback(async (a, b) => {
    try {
      const entry = { a: a.name, b: b.name, timestamp: Date.now() };
      const updated = [entry, ...recentComparisons.filter(
        (r) => !(r.a === a.name && r.b === b.name) && !(r.a === b.name && r.b === a.name)
      )].slice(0, 10);
      setRecentComparisons(updated);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Ignore storage errors
    }
  }, [recentComparisons]);

  // When both foods are selected, save comparison
  useEffect(() => {
    if (foodA && foodB) {
      saveComparison(foodA, foodB);
    }
  }, [foodA, foodB]);

  const handleSwap = useCallback(async () => {
    await hapticLight();
    const tempA = foodA;
    setFoodA(foodB);
    setFoodB(tempA);
  }, [foodA, foodB]);

  const handleReset = useCallback(async () => {
    await hapticLight();
    setFoodA(null);
    setFoodB(null);
  }, []);

  const handleSelectRecentComparison = useCallback(async (recent) => {
    await hapticLight();
    const a = COMMON_FOODS.find((f) => f.name === recent.a);
    const b = COMMON_FOODS.find((f) => f.name === recent.b);
    if (a && b) {
      setFoodA(a);
      setFoodB(b);
    }
  }, []);

  const handleQuickSwapA = useCallback(async (food) => {
    await hapticLight();
    setFoodA(food);
  }, []);

  const handleQuickSwapB = useCallback(async (food) => {
    await hapticLight();
    setFoodB(food);
  }, []);

  const bothSelected = foodA && foodB;
  const winnerBadges = useMemo(() => getWinnerBadges(foodA, foodB), [foodA, foodB]);
  const suggestionsA = useMemo(() => getSuggestionsForFood(foodA), [foodA]);
  const suggestionsB = useMemo(() => getSuggestionsForFood(foodB), [foodB]);

  // Determine overall winner
  const overallWinner = useMemo(() => {
    if (!bothSelected) return null;
    let scoreA = 0;
    let scoreB = 0;
    winnerBadges.forEach((badge) => {
      if (badge.side === 'A') scoreA++;
      if (badge.side === 'B') scoreB++;
    });
    if (scoreA > scoreB) return 'A';
    if (scoreB > scoreA) return 'B';
    return 'tie';
  }, [winnerBadges, bothSelected]);

  return (
    <ScreenWrapper>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
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
            <Scale size={22} color={Colors.primary} />
            <Text style={styles.title}>Compare Foods</Text>
            {bothSelected && (
              <Pressable
                style={styles.resetButton}
                onPress={handleReset}
              >
                <RotateCcw size={16} color={Colors.textSecondary} />
              </Pressable>
            )}
          </ReAnimated.View>

          {/* Two Food Slots -- side by side */}
          <View style={styles.slotsRow}>
            <FoodSlot
              food={foodA}
              onSelect={setFoodA}
              onClear={() => setFoodA(null)}
              slotLabel="Food A"
              index={0}
            />
            <FoodSlot
              food={foodB}
              onSelect={setFoodB}
              onClear={() => setFoodB(null)}
              slotLabel="Food B"
              index={1}
            />
          </View>

          {/* Swap Button (visible when both selected) */}
          {bothSelected && (
            <ReAnimated.View
              entering={FadeInDown.delay(200).springify().mass(0.5).damping(10)}
            >
              <Pressable
                style={styles.swapButton}
                onPress={handleSwap}
              >
                <LinearGradient
                  colors={Gradients.primarySoft}
                  style={styles.swapButtonGradient}
                >
                  <ArrowLeftRight size={18} color={Colors.primary} />
                  <Text style={styles.swapButtonText}>Swap Positions</Text>
                </LinearGradient>
              </Pressable>
            </ReAnimated.View>
          )}

          {/* Comparison View */}
          {bothSelected && (
            <>
              {/* Overall Winner Card */}
              {overallWinner && overallWinner !== 'tie' && (
                <ReAnimated.View
                  entering={FadeInDown.delay(250).springify().mass(0.5).damping(10)}
                >
                  <LinearGradient
                    colors={[Colors.successSoft, 'rgba(0, 230, 118, 0.02)']}
                    style={styles.overallWinnerCard}
                  >
                    <Trophy size={20} color={Colors.success} />
                    <View style={styles.overallWinnerInfo}>
                      <Text style={styles.overallWinnerTitle}>
                        {overallWinner === 'A' ? foodA.emoji : foodB.emoji}{' '}
                        {overallWinner === 'A' ? foodA.name : foodB.name}
                      </Text>
                      <Text style={styles.overallWinnerSubtitle}>
                        Wins more nutritional categories
                      </Text>
                    </View>
                  </LinearGradient>
                </ReAnimated.View>
              )}

              {overallWinner === 'tie' && (
                <ReAnimated.View
                  entering={FadeInDown.delay(250).springify().mass(0.5).damping(10)}
                >
                  <LinearGradient
                    colors={[Colors.primarySoft, 'rgba(0, 212, 255, 0.02)']}
                    style={styles.overallWinnerCard}
                  >
                    <Scale size={20} color={Colors.primary} />
                    <View style={styles.overallWinnerInfo}>
                      <Text style={styles.overallWinnerTitle}>It's a Tie!</Text>
                      <Text style={styles.overallWinnerSubtitle}>
                        Both foods are evenly matched
                      </Text>
                    </View>
                  </LinearGradient>
                </ReAnimated.View>
              )}

              {/* Macro-by-Macro Comparison */}
              <ReAnimated.View
                entering={FadeInDown.delay(280).springify().mass(0.5).damping(10)}
              >
                <Text style={styles.sectionTitle}>Nutrition Breakdown</Text>

                {/* Food labels row */}
                <View style={styles.foodLabelsRow}>
                  <View style={styles.foodLabelLeft}>
                    <Text style={styles.foodLabelEmoji}>{foodA.emoji}</Text>
                    <Text style={styles.foodLabelName} numberOfLines={1}>{foodA.name}</Text>
                  </View>
                  <Text style={styles.vsText}>vs</Text>
                  <View style={styles.foodLabelRight}>
                    <Text style={styles.foodLabelEmoji}>{foodB.emoji}</Text>
                    <Text style={styles.foodLabelName} numberOfLines={1}>{foodB.name}</Text>
                  </View>
                </View>
              </ReAnimated.View>

              {MACROS.map((macro, i) => (
                <MacroComparisonBar
                  key={macro.key}
                  macro={macro}
                  foodA={foodA}
                  foodB={foodB}
                  index={i}
                />
              ))}

              {/* Winner Badges */}
              {winnerBadges.length > 0 && (
                <ReAnimated.View
                  entering={FadeInDown.delay(480).springify().mass(0.5).damping(10)}
                >
                  <Text style={styles.sectionTitle}>Highlights</Text>
                  <View style={styles.winnerBadgesContainer}>
                    {winnerBadges.map((badge, i) => (
                      <WinnerBadge key={badge.label} badge={badge} index={i} />
                    ))}
                  </View>
                </ReAnimated.View>
              )}

              {/* Calorie Density Info */}
              <ReAnimated.View
                entering={FadeInDown.delay(550).springify().mass(0.5).damping(10)}
              >
                <LinearGradient
                  colors={Gradients.card}
                  style={styles.densityCard}
                >
                  <Text style={styles.densityTitle}>Calorie Difference</Text>
                  <View style={styles.densityRow}>
                    <View style={styles.densityItem}>
                      <Text style={styles.densityEmoji}>{foodA.emoji}</Text>
                      <Text style={styles.densityValue}>{foodA.calories}</Text>
                      <Text style={styles.densityUnit}>kcal</Text>
                    </View>
                    <View style={styles.densityDivider}>
                      <Text style={styles.densityDiff}>
                        {Math.abs(foodA.calories - foodB.calories) === 0
                          ? '='
                          : foodA.calories > foodB.calories
                          ? `+${foodA.calories - foodB.calories}`
                          : `-${foodB.calories - foodA.calories}`}
                      </Text>
                    </View>
                    <View style={styles.densityItem}>
                      <Text style={styles.densityEmoji}>{foodB.emoji}</Text>
                      <Text style={styles.densityValue}>{foodB.calories}</Text>
                      <Text style={styles.densityUnit}>kcal</Text>
                    </View>
                  </View>
                </LinearGradient>
              </ReAnimated.View>

              {/* Quick Swap Suggestions */}
              {(suggestionsA.length > 0 || suggestionsB.length > 0) && (
                <ReAnimated.View
                  entering={FadeInDown.delay(600).springify().mass(0.5).damping(10)}
                >
                  <Text style={styles.sectionTitle}>Compare With...</Text>

                  {suggestionsA.length > 0 && (
                    <View style={styles.suggestionsGroup}>
                      <Text style={styles.suggestionsLabel}>
                        Swap {foodA.emoji} {foodA.name} with:
                      </Text>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.suggestionsScroll}
                      >
                        {suggestionsA.map((s, i) => (
                          <QuickSwapSuggestion
                            key={s.name}
                            food={s}
                            onSelect={handleQuickSwapA}
                            index={i}
                          />
                        ))}
                      </ScrollView>
                    </View>
                  )}

                  {suggestionsB.length > 0 && (
                    <View style={styles.suggestionsGroup}>
                      <Text style={styles.suggestionsLabel}>
                        Swap {foodB.emoji} {foodB.name} with:
                      </Text>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.suggestionsScroll}
                      >
                        {suggestionsB.map((s, i) => (
                          <QuickSwapSuggestion
                            key={s.name}
                            food={s}
                            onSelect={handleQuickSwapB}
                            index={i}
                          />
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </ReAnimated.View>
              )}
            </>
          )}

          {/* Recent Comparisons (shown when not both selected) */}
          {!bothSelected && recentComparisons.length > 0 && (
            <ReAnimated.View
              entering={FadeInDown.delay(200).springify().mass(0.5).damping(10)}
            >
              <Text style={styles.sectionTitle}>Recent Comparisons</Text>
              {recentComparisons.map((recent, i) => {
                const rA = COMMON_FOODS.find((f) => f.name === recent.a);
                const rB = COMMON_FOODS.find((f) => f.name === recent.b);
                if (!rA || !rB) return null;
                return (
                  <Pressable
                    key={`${recent.a}-${recent.b}-${i}`}
                    style={styles.recentItem}
                    onPress={() => handleSelectRecentComparison(recent)}
                  >
                    <LinearGradient
                      colors={Gradients.card}
                      style={styles.recentItemGradient}
                    >
                      <Text style={styles.recentEmoji}>{rA.emoji}</Text>
                      <Text style={styles.recentName} numberOfLines={1}>{rA.name}</Text>
                      <Text style={styles.recentVs}>vs</Text>
                      <Text style={styles.recentEmoji}>{rB.emoji}</Text>
                      <Text style={styles.recentName} numberOfLines={1}>{rB.name}</Text>
                      <ChevronRight size={14} color={Colors.textTertiary} />
                    </LinearGradient>
                  </Pressable>
                );
              })}
            </ReAnimated.View>
          )}

          {/* Empty State hint */}
          {!bothSelected && recentComparisons.length === 0 && (
            <ReAnimated.View
              entering={FadeInDown.delay(200).springify().mass(0.5).damping(10)}
              style={styles.emptyState}
            >
              <LinearGradient
                colors={Gradients.card}
                style={styles.emptyStateCard}
              >
                <Scale size={40} color={Colors.textTertiary} />
                <Text style={styles.emptyStateTitle}>Compare Foods</Text>
                <Text style={styles.emptyStateSubtitle}>
                  Select two foods above to see a detailed nutritional comparison side by side
                </Text>
              </LinearGradient>
            </ReAnimated.View>
          )}

          {/* Popular Comparisons (shown when nothing selected) */}
          {!foodA && !foodB && (
            <ReAnimated.View
              entering={FadeInDown.delay(300).springify().mass(0.5).damping(10)}
            >
              <Text style={styles.sectionTitle}>Popular Comparisons</Text>
              {[
                { a: 'Chicken Breast', b: 'Tofu' },
                { a: 'Brown Rice', b: 'Quinoa' },
                { a: 'Salmon', b: 'Tuna (canned)' },
                { a: 'Greek Yogurt', b: 'Cottage Cheese' },
                { a: 'Banana', b: 'Apple' },
              ].map((pair, i) => {
                const pA = COMMON_FOODS.find((f) => f.name === pair.a);
                const pB = COMMON_FOODS.find((f) => f.name === pair.b);
                if (!pA || !pB) return null;
                return (
                  <Pressable
                    key={`${pair.a}-${pair.b}`}
                    style={styles.recentItem}
                    onPress={async () => {
                      await hapticLight();
                      setFoodA(pA);
                      setFoodB(pB);
                    }}
                  >
                    <LinearGradient
                      colors={Gradients.card}
                      style={styles.recentItemGradient}
                    >
                      <Text style={styles.recentEmoji}>{pA.emoji}</Text>
                      <Text style={styles.recentName} numberOfLines={1}>{pA.name}</Text>
                      <Text style={styles.recentVs}>vs</Text>
                      <Text style={styles.recentEmoji}>{pB.emoji}</Text>
                      <Text style={styles.recentName} numberOfLines={1}>{pB.name}</Text>
                      <ChevronRight size={14} color={Colors.textTertiary} />
                    </LinearGradient>
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

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
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
    flex: 1,
  },
  resetButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Slots Row
  slotsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },

  // Slot Card
  slotContainer: {
    flex: 1,
  },
  slotCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 200,
  },
  slotCardEmpty: {
    minHeight: 280,
  },
  slotLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  slotLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
  },

  // Selected food display
  selectedEmoji: {
    fontSize: 36,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  selectedName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 2,
  },
  selectedServing: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  selectedMacros: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  macroChip: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    minWidth: 44,
  },
  macroChipValue: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  macroChipLabel: {
    fontSize: 9,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 1,
  },
  fiberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: Spacing.sm,
  },
  fiberText: {
    fontSize: FontSize.xs,
    color: Colors.success,
    fontWeight: FontWeight.medium,
  },

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.text,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },

  // Search results
  resultsList: {
    maxHeight: 160,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  resultEmoji: {
    fontSize: 18,
    marginRight: Spacing.sm,
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.text,
  },
  resultCals: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: 1,
  },
  noResults: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    textAlign: 'center',
    paddingVertical: Spacing.lg,
  },

  // Empty hint
  emptyHint: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
  },
  emptyHintText: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    textAlign: 'center',
  },

  // Swap Button
  swapButton: {
    marginBottom: Spacing.lg,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.primary + '25',
  },
  swapButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm + 2,
    gap: Spacing.sm,
  },
  swapButtonText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },

  // Overall Winner Card
  overallWinnerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.2)',
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  overallWinnerInfo: {
    flex: 1,
  },
  overallWinnerTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  overallWinnerSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  // Section Title
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Food Labels Row
  foodLabelsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.xs,
  },
  foodLabelLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flex: 1,
  },
  foodLabelRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flex: 1,
    justifyContent: 'flex-end',
  },
  foodLabelEmoji: {
    fontSize: 18,
  },
  foodLabelName: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    maxWidth: 100,
  },
  vsText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.textTertiary,
    marginHorizontal: Spacing.sm,
    textTransform: 'uppercase',
  },

  // Comparison Row
  comparisonRow: {
    marginBottom: Spacing.md,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  comparisonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  comparisonLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  comparisonLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },

  // Bars
  barsContainer: {
    gap: Spacing.sm,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  barValue: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    minWidth: 48,
    textAlign: 'right',
  },
  barTrack: {
    flex: 1,
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 5,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 5,
  },

  // Winner Badges
  winnerBadgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  winnerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
  },
  winnerBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },

  // Density Card
  densityCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  densityTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  densityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  densityItem: {
    alignItems: 'center',
    flex: 1,
  },
  densityEmoji: {
    fontSize: 28,
    marginBottom: Spacing.xs,
  },
  densityValue: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  densityUnit: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  densityDivider: {
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
  },
  densityDiff: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },

  // Suggestions
  suggestionsGroup: {
    marginBottom: Spacing.md,
  },
  suggestionsLabel: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginBottom: Spacing.sm,
  },
  suggestionsScroll: {
    gap: Spacing.sm,
    paddingRight: Spacing.md,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  suggestionEmoji: {
    fontSize: 16,
  },
  suggestionName: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Colors.text,
    maxWidth: 100,
  },

  // Recent Comparisons
  recentItem: {
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  recentItemGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  recentEmoji: {
    fontSize: 20,
  },
  recentName: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.text,
    flex: 1,
  },
  recentVs: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
  },

  // Empty State
  emptyState: {
    marginBottom: Spacing.lg,
  },
  emptyStateCard: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    gap: Spacing.md,
  },
  emptyStateTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  emptyStateSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Bottom
  bottomSpacer: {
    height: 120,
  },
});

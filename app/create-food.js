import React, { useState, useMemo } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Check, Flame, Beef, Wheat, Droplets } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors, Gradients, Spacing, FontSize, FontWeight, BorderRadius } from '../constants/theme';
import { useFood } from '../context/FoodContext';
import { hapticSuccess, hapticLight } from '../lib/haptics';

const FOOD_EMOJIS = [
  '\u{1F37D}\u{FE0F}', '\u{1F357}', '\u{1F969}', '\u{1F41F}', '\u{1F95A}', '\u{1F957}',
  '\u{1F35A}', '\u{1F35D}', '\u{1F355}', '\u{1F96A}', '\u{1F34E}', '\u{1F964}',
];

const QUICK_TEMPLATES = [
  {
    name: 'Chicken Breast',
    emoji: '\u{1F357}',
    calories: 165,
    protein: 31,
    carbs: 0,
    fat: 3.6,
    serving: '100g',
  },
  {
    name: 'White Rice',
    emoji: '\u{1F35A}',
    calories: 206,
    protein: 4.3,
    carbs: 45,
    fat: 0.4,
    serving: '1 cup',
  },
  {
    name: 'Egg',
    emoji: '\u{1F95A}',
    calories: 78,
    protein: 6,
    carbs: 0.6,
    fat: 5,
    serving: '1 large',
  },
  {
    name: 'Banana',
    emoji: '\u{1F34C}',
    calories: 105,
    protein: 1.3,
    carbs: 27,
    fat: 0.4,
    serving: '1 medium',
  },
];

function getDefaultMealByTime() {
  const hour = new Date().getHours();
  if (hour < 11) return 'breakfast';
  if (hour < 15) return 'lunch';
  if (hour < 20) return 'dinner';
  return 'snacks';
}

export default function CreateFoodScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { addFood } = useFood();

  const meal = params.meal || getDefaultMealByTime();

  const [selectedEmoji, setSelectedEmoji] = useState(FOOD_EMOJIS[0]);
  const [name, setName] = useState('');
  const [serving, setServing] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');

  const calculatedCalories = useMemo(() => {
    const p = parseFloat(protein) || 0;
    const c = parseFloat(carbs) || 0;
    const f = parseFloat(fat) || 0;
    return Math.round(p * 4 + c * 4 + f * 9);
  }, [protein, carbs, fat]);

  const enteredCalories = parseInt(calories) || 0;
  const hasMacros = (parseFloat(protein) || 0) > 0 || (parseFloat(carbs) || 0) > 0 || (parseFloat(fat) || 0) > 0;
  const showCalorieComparison = hasMacros && enteredCalories > 0 && enteredCalories !== calculatedCalories;

  const handleSelectEmoji = (emoji) => {
    hapticLight();
    setSelectedEmoji(emoji);
  };

  const handleApplyTemplate = (template) => {
    hapticLight();
    setName(template.name);
    setSelectedEmoji(template.emoji);
    setCalories(String(template.calories));
    setProtein(String(template.protein));
    setCarbs(String(template.carbs));
    setFat(String(template.fat));
    setServing(template.serving);
  };

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Missing Name', 'Please enter a name for this food.');
      return;
    }
    if (!calories || parseInt(calories) <= 0) {
      Alert.alert('Missing Calories', 'Please enter the calorie count.');
      return;
    }

    const food = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      name: name.trim(),
      emoji: selectedEmoji,
      calories: parseInt(calories) || 0,
      protein: parseFloat(protein) || 0,
      carbs: parseFloat(carbs) || 0,
      fat: parseFloat(fat) || 0,
      serving: serving.trim() || '1 serving',
      servingSize: 1,
      servingUnit: 'serving',
    };

    addFood(food, meal);
    hapticSuccess();
    router.back();
  };

  // Calculate bar widths for macro visualization
  const maxCal = Math.max(enteredCalories, calculatedCalories, 1);
  const enteredBarWidth = enteredCalories > 0 ? (enteredCalories / maxCal) * 100 : 0;
  const calculatedBarWidth = calculatedCalories > 0 ? (calculatedCalories / maxCal) * 100 : 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable style={styles.headerButton} onPress={() => router.back()} hitSlop={8}>
            <ArrowLeft size={24} color={Colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Create Food</Text>
          <Pressable style={styles.headerSaveButton} onPress={handleSave} hitSlop={8}>
            <Check size={24} color={Colors.primary} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Emoji Picker */}
          <Animated.View entering={FadeInDown.delay(50).duration(400)}>
            <Text style={styles.sectionLabel}>Icon</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.emojiRow}
            >
              {FOOD_EMOJIS.map((emoji, index) => (
                <Pressable
                  key={index}
                  style={[
                    styles.emojiButton,
                    selectedEmoji === emoji && styles.emojiButtonSelected,
                  ]}
                  onPress={() => handleSelectEmoji(emoji)}
                >
                  <Text style={styles.emojiText}>{emoji}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </Animated.View>

          {/* Name Input */}
          <Animated.View entering={FadeInDown.delay(100).duration(400)}>
            <Text style={styles.sectionLabel}>Name</Text>
            <View style={styles.glassInput}>
              <TextInput
                style={styles.textInput}
                placeholder="Food name (e.g. Grilled Chicken)"
                placeholderTextColor={Colors.textTertiary}
                value={name}
                onChangeText={setName}
                returnKeyType="next"
              />
            </View>
          </Animated.View>

          {/* Serving Size Input */}
          <Animated.View entering={FadeInDown.delay(150).duration(400)}>
            <Text style={styles.sectionLabel}>Serving Size</Text>
            <View style={styles.glassInput}>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. 100g, 1 cup, 1 piece"
                placeholderTextColor={Colors.textTertiary}
                value={serving}
                onChangeText={setServing}
                returnKeyType="next"
              />
            </View>
          </Animated.View>

          {/* Nutrition Inputs - 2x2 Grid */}
          <Animated.View entering={FadeInDown.delay(200).duration(400)}>
            <Text style={styles.sectionLabel}>Nutrition</Text>
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
                />
                <Text style={styles.nutritionUnit}>kcal</Text>
              </View>

              {/* Protein */}
              <View style={styles.nutritionCard}>
                <View style={styles.nutritionHeader}>
                  <Beef size={16} color="#FF6B9D" />
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
                />
                <Text style={styles.nutritionUnit}>g</Text>
              </View>

              {/* Carbs */}
              <View style={styles.nutritionCard}>
                <View style={styles.nutritionHeader}>
                  <Wheat size={16} color="#64D2FF" />
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
                />
                <Text style={styles.nutritionUnit}>g</Text>
              </View>

              {/* Fat */}
              <View style={styles.nutritionCard}>
                <View style={styles.nutritionHeader}>
                  <Droplets size={16} color="#FFD93D" />
                  <Text style={styles.nutritionLabel}>Fat</Text>
                </View>
                <TextInput
                  style={styles.nutritionInput}
                  placeholder="0"
                  placeholderTextColor={Colors.textTertiary}
                  value={fat}
                  onChangeText={setFat}
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                />
                <Text style={styles.nutritionUnit}>g</Text>
              </View>
            </View>
          </Animated.View>

          {/* Macro Visualization */}
          {hasMacros && (
            <Animated.View entering={FadeInDown.delay(250).duration(400)} style={styles.macroVizContainer}>
              <View style={styles.macroBarRow}>
                {enteredCalories > 0 && (
                  <View style={styles.macroBarGroup}>
                    <Text style={styles.macroBarLabel}>Entered</Text>
                    <View style={styles.macroBarTrack}>
                      <View
                        style={[
                          styles.macroBarFill,
                          { width: `${enteredBarWidth}%`, backgroundColor: Colors.primary },
                        ]}
                      />
                    </View>
                    <Text style={styles.macroBarValue}>{enteredCalories} cal</Text>
                  </View>
                )}
                <View style={styles.macroBarGroup}>
                  <Text style={styles.macroBarLabel}>From macros</Text>
                  <View style={styles.macroBarTrack}>
                    <View
                      style={[
                        styles.macroBarFill,
                        { width: `${calculatedBarWidth}%`, backgroundColor: Colors.success },
                      ]}
                    />
                  </View>
                  <Text style={styles.macroBarValue}>{calculatedCalories} cal</Text>
                </View>
              </View>
              {showCalorieComparison && (
                <Text style={styles.macroHint}>
                  Macros = {calculatedCalories} cal (P{parseFloat(protein) || 0}*4 + C{parseFloat(carbs) || 0}*4 + F{parseFloat(fat) || 0}*9)
                </Text>
              )}
            </Animated.View>
          )}

          {/* Quick Templates */}
          <Animated.View entering={FadeInDown.delay(300).duration(400)}>
            <Text style={styles.sectionLabel}>Quick Templates</Text>
            <View style={styles.templateRow}>
              {QUICK_TEMPLATES.map((template, index) => (
                <Pressable
                  key={index}
                  style={styles.templateChip}
                  onPress={() => handleApplyTemplate(template)}
                >
                  <Text style={styles.templateEmoji}>{template.emoji}</Text>
                  <Text style={styles.templateName} numberOfLines={1}>
                    {template.name} {template.serving}
                  </Text>
                  <Text style={styles.templateCal}>{template.calories} cal</Text>
                </Pressable>
              ))}
            </View>
          </Animated.View>

          {/* Save Button */}
          <Animated.View entering={FadeInDown.delay(350).duration(400)} style={styles.saveButtonContainer}>
            <Pressable onPress={handleSave}>
              <LinearGradient
                colors={Gradients.primary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.saveButton}
              >
                <Check size={20} color={Colors.background} />
                <Text style={styles.saveButtonText}>Save Food</Text>
              </LinearGradient>
            </Pressable>
          </Animated.View>

          {/* Bottom spacer */}
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

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
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  headerSaveButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,212,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
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

  // Emoji Picker
  emojiRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  emojiButton: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.lg,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiButtonSelected: {
    backgroundColor: 'rgba(0,212,255,0.15)',
    borderColor: Colors.primary,
  },
  emojiText: {
    fontSize: 24,
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

  // Macro Visualization
  macroVizContainer: {
    marginTop: Spacing.md,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  macroBarRow: {
    gap: Spacing.sm,
  },
  macroBarGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  macroBarLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    width: 70,
  },
  macroBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  macroBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  macroBarValue: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    width: 55,
    textAlign: 'right',
  },
  macroHint: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },

  // Quick Templates
  templateRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  templateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm + 4,
    paddingVertical: Spacing.sm,
  },
  templateEmoji: {
    fontSize: 16,
  },
  templateName: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.text,
    flexShrink: 1,
  },
  templateCal: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },

  // Save Button
  saveButtonContainer: {
    marginTop: Spacing.lg,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    height: 56,
    borderRadius: BorderRadius.lg,
  },
  saveButtonText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.background,
  },
});

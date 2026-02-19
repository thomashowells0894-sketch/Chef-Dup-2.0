/**
 * VibeFit - Recipe URL Import Screen
 *
 * Paste a recipe URL and let AI extract the recipe name, ingredients,
 * nutrition info, and per-serving macros. Review, edit, then save or
 * add to diary.
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  Keyboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import ReAnimated, { FadeInDown } from 'react-native-reanimated';
import {
  ArrowLeft,
  Link,
  Clipboard,
  ChefHat,
  AlertCircle,
  RefreshCw,
  Save,
  Plus,
  Minus,
  PenLine,
  Flame,
} from 'lucide-react-native';
import * as ClipboardAPI from 'expo-clipboard';
import ScreenWrapper from '../components/ScreenWrapper';
import ScreenErrorBoundary from '../components/ScreenErrorBoundary';
import GlassCard from '../components/ui/GlassCard';
import {
  Colors,
  Spacing,
  FontSize,
  FontWeight,
  BorderRadius,
  Shadows,
} from '../constants/theme';
import { hapticLight, hapticSuccess, hapticError } from '../lib/haptics';
import { importRecipeFromURL } from '../services/ai';
import { useRecipes } from '../context/RecipeContext';
import { useMeals } from '../context/MealContext';

// ---------------------------------------------------------------------------
// URL Validation
// ---------------------------------------------------------------------------

function isValidURL(str) {
  try {
    const url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Ingredient Row
// ---------------------------------------------------------------------------

function IngredientRow({ ingredient, index }) {
  return (
    <ReAnimated.View
      entering={FadeInDown.delay(Math.min(index * 40, 300)).springify().damping(14)}
      style={styles.ingredientRow}
    >
      <View style={styles.ingredientLeft}>
        <View style={styles.ingredientBullet} />
        <View style={styles.ingredientInfo}>
          <Text style={styles.ingredientName}>{ingredient.name}</Text>
          <Text style={styles.ingredientQuantity}>
            {ingredient.quantity} {ingredient.unit}
          </Text>
        </View>
      </View>
      <View style={styles.ingredientMacros}>
        <Text style={styles.ingredientCal}>{ingredient.calories} cal</Text>
        <View style={styles.ingredientMacroPills}>
          <View style={[styles.microPill, { backgroundColor: 'rgba(255, 107, 157, 0.15)' }]}>
            <Text style={[styles.microPillText, { color: Colors.protein }]}>
              {ingredient.protein}g P
            </Text>
          </View>
          <View style={[styles.microPill, { backgroundColor: 'rgba(100, 210, 255, 0.15)' }]}>
            <Text style={[styles.microPillText, { color: Colors.carbs }]}>
              {ingredient.carbs}g C
            </Text>
          </View>
          <View style={[styles.microPill, { backgroundColor: 'rgba(255, 217, 61, 0.15)' }]}>
            <Text style={[styles.microPillText, { color: Colors.fat }]}>
              {ingredient.fat}g F
            </Text>
          </View>
        </View>
      </View>
    </ReAnimated.View>
  );
}

// ---------------------------------------------------------------------------
// Macro Summary Card
// ---------------------------------------------------------------------------

function MacroSummaryCard({ label, totals }) {
  return (
    <GlassCard style={styles.macroSummaryCard}>
      <Text style={styles.macroSummaryLabel}>{label}</Text>
      <View style={styles.macroSummaryRow}>
        <View style={styles.macroSumItem}>
          <Flame size={14} color={Colors.secondary} />
          <Text style={styles.macroSumValue}>{totals.calories}</Text>
          <Text style={styles.macroSumUnit}>cal</Text>
        </View>
        <View style={styles.macroSumItem}>
          <View style={[styles.macroDot, { backgroundColor: Colors.protein }]} />
          <Text style={styles.macroSumValue}>{totals.protein}g</Text>
          <Text style={styles.macroSumUnit}>protein</Text>
        </View>
        <View style={styles.macroSumItem}>
          <View style={[styles.macroDot, { backgroundColor: Colors.carbs }]} />
          <Text style={styles.macroSumValue}>{totals.carbs}g</Text>
          <Text style={styles.macroSumUnit}>carbs</Text>
        </View>
        <View style={styles.macroSumItem}>
          <View style={[styles.macroDot, { backgroundColor: Colors.fat }]} />
          <Text style={styles.macroSumValue}>{totals.fat}g</Text>
          <Text style={styles.macroSumUnit}>fat</Text>
        </View>
      </View>
    </GlassCard>
  );
}

// ---------------------------------------------------------------------------
// Main Screen (Inner)
// ---------------------------------------------------------------------------

function RecipeImportInner() {
  const router = useRouter();
  const { saveRecipe } = useRecipes();
  const { addFood, getDefaultMealType } = useMeals();

  // Screen state: 'input' | 'loading' | 'review' | 'error'
  const [screenState, setScreenState] = useState('input');
  const [url, setUrl] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [saving, setSaving] = useState(false);

  // Parsed recipe data
  const [recipe, setRecipe] = useState(null);
  const [editableName, setEditableName] = useState('');
  const [editableServings, setEditableServings] = useState(1);

  const urlInputRef = useRef(null);

  // -- Handlers --

  const handleBack = useCallback(async () => {
    await hapticLight();
    router.back();
  }, [router]);

  const handlePasteFromClipboard = useCallback(async () => {
    try {
      await hapticLight();
      const text = await ClipboardAPI.getStringAsync();
      if (text) {
        setUrl(text.trim());
      }
    } catch {
      // Clipboard access may fail silently
    }
  }, []);

  const handleImport = useCallback(async () => {
    Keyboard.dismiss();
    const trimmed = url.trim();

    if (!trimmed) {
      setErrorMessage('Please enter a recipe URL.');
      setScreenState('error');
      await hapticError();
      return;
    }

    if (!isValidURL(trimmed)) {
      setErrorMessage('Please enter a valid URL (starting with http:// or https://).');
      setScreenState('error');
      await hapticError();
      return;
    }

    setScreenState('loading');
    setErrorMessage('');

    try {
      const result = await importRecipeFromURL(trimmed);
      setRecipe(result);
      setEditableName(result.name);
      setEditableServings(result.servings);
      setScreenState('review');
      await hapticSuccess();
    } catch (err) {
      const message = err?.message || 'Something went wrong.';
      if (message.includes('parse') || message.includes('extract') || message.includes('identify')) {
        setErrorMessage("Couldn't parse this recipe. The page may not contain a standard recipe format.");
      } else if (message.includes('timed out') || message.includes('network') || message.includes('Network')) {
        setErrorMessage('Network error. Please check your connection and try again.');
      } else {
        setErrorMessage(message);
      }
      setScreenState('error');
      await hapticError();
    }
  }, [url]);

  const handleRetry = useCallback(() => {
    setScreenState('input');
    setErrorMessage('');
  }, []);

  const handleManualEntry = useCallback(async () => {
    await hapticLight();
    router.push('/create-food');
  }, [router]);

  const handleServingsChange = useCallback((delta) => {
    setEditableServings((prev) => Math.max(1, Math.min(50, prev + delta)));
  }, []);

  // Compute per-serving macros from the recipe totals and the editable servings
  const perServing = recipe
    ? {
        calories: Math.round(recipe.totals.calories / editableServings),
        protein: Math.round(recipe.totals.protein / editableServings),
        carbs: Math.round(recipe.totals.carbs / editableServings),
        fat: Math.round(recipe.totals.fat / editableServings),
      }
    : null;

  const handleSaveRecipe = useCallback(async () => {
    if (!recipe || saving) return;
    setSaving(true);

    try {
      const ingredients = recipe.ingredients.map((ing) => ({
        name: `${ing.quantity} ${ing.unit} ${ing.name}`.trim(),
        calories: ing.calories,
        protein: ing.protein,
        carbs: ing.carbs,
        fat: ing.fat,
        serving: `${ing.quantity} ${ing.unit}`,
      }));

      await saveRecipe(editableName, ingredients, editableServings, recipe.emoji || '🍽️');

      Alert.alert(
        'Recipe Saved!',
        `${editableName} has been saved to your recipes.`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (err) {
      Alert.alert('Error', err?.message || 'Failed to save recipe. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [recipe, editableName, editableServings, saveRecipe, saving, router]);

  const handleAddToDiary = useCallback(async () => {
    if (!recipe || !perServing) return;

    const foodItem = {
      name: editableName,
      emoji: recipe.emoji || '🍽️',
      calories: perServing.calories,
      protein: perServing.protein,
      carbs: perServing.carbs,
      fat: perServing.fat,
      serving: `1/${editableServings} recipe`,
    };

    const mealType = getDefaultMealType();
    addFood(foodItem, mealType);
    await hapticSuccess();

    Alert.alert(
      'Added to Diary!',
      `1 serving of ${editableName} added to your ${mealType} diary.`,
      [{ text: 'OK', onPress: () => router.back() }]
    );
  }, [recipe, editableName, editableServings, perServing, addFood, router]);

  // -- Render --

  return (
    <ScreenWrapper>
      {/* Header */}
      <ReAnimated.View entering={FadeInDown.delay(0).springify().damping(12)} style={styles.header}>
        <Pressable onPress={handleBack} style={styles.headerButton}>
          <ArrowLeft size={24} color={Colors.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Import Recipe</Text>
        </View>
        <View style={{ width: 44 }} />
      </ReAnimated.View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ─── INPUT STATE ─── */}
        {screenState === 'input' && (
          <>
            <ReAnimated.View entering={FadeInDown.delay(60).springify().damping(12)}>
              <GlassCard style={styles.inputCard}>
                <View style={styles.inputIconRow}>
                  <View style={styles.iconCircle}>
                    <Link size={24} color={Colors.primary} />
                  </View>
                  <View style={styles.inputTextBlock}>
                    <Text style={styles.inputTitle}>Paste a Recipe URL</Text>
                    <Text style={styles.inputSubtitle}>
                      We'll use AI to extract the recipe, ingredients, and nutrition info.
                    </Text>
                  </View>
                </View>

                <View style={styles.urlInputRow}>
                  <TextInput
                    ref={urlInputRef}
                    style={styles.urlInput}
                    placeholder="https://example.com/recipe..."
                    placeholderTextColor={Colors.textTertiary}
                    value={url}
                    onChangeText={setUrl}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                    returnKeyType="go"
                    onSubmitEditing={handleImport}
                  />
                  <Pressable onPress={handlePasteFromClipboard} style={styles.pasteButton}>
                    <Clipboard size={18} color={Colors.primary} />
                    <Text style={styles.pasteButtonText}>Paste</Text>
                  </Pressable>
                </View>

                <Pressable
                  onPress={handleImport}
                  style={[styles.importButton, !url.trim() && styles.importButtonDisabled]}
                  disabled={!url.trim()}
                >
                  <ChefHat size={20} color="#000" strokeWidth={2.5} />
                  <Text style={styles.importButtonText}>Import Recipe</Text>
                </Pressable>
              </GlassCard>
            </ReAnimated.View>

            <ReAnimated.View entering={FadeInDown.delay(120).springify().damping(12)}>
              <View style={styles.hintBox}>
                <Text style={styles.hintTitle}>Supported sites</Text>
                <Text style={styles.hintText}>
                  Works with most recipe sites: AllRecipes, Food Network, BBC Good Food,
                  Serious Eats, and many more. Just copy the URL and paste it above.
                </Text>
              </View>
            </ReAnimated.View>
          </>
        )}

        {/* ─── LOADING STATE ─── */}
        {screenState === 'loading' && (
          <ReAnimated.View entering={FadeInDown.delay(0).springify().damping(12)}>
            <GlassCard style={styles.loadingCard}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingTitle}>Analyzing Recipe...</Text>
              <Text style={styles.loadingSubtitle}>
                Our AI is reading the page, extracting ingredients, and estimating nutrition.
              </Text>
              <View style={styles.loadingSteps}>
                <Text style={styles.loadingStep}>Fetching recipe page...</Text>
                <Text style={styles.loadingStep}>Identifying ingredients...</Text>
                <Text style={styles.loadingStep}>Estimating nutrition...</Text>
              </View>
            </GlassCard>
          </ReAnimated.View>
        )}

        {/* ─── ERROR STATE ─── */}
        {screenState === 'error' && (
          <ReAnimated.View entering={FadeInDown.delay(0).springify().damping(12)}>
            <GlassCard variant="error" style={styles.errorCard}>
              <View style={styles.errorIconRow}>
                <AlertCircle size={32} color={Colors.error} />
              </View>
              <Text style={styles.errorTitle}>Import Failed</Text>
              <Text style={styles.errorMessage}>{errorMessage}</Text>

              <View style={styles.errorActions}>
                <Pressable onPress={handleRetry} style={styles.retryButton}>
                  <RefreshCw size={18} color={Colors.primary} />
                  <Text style={styles.retryButtonText}>Try Again</Text>
                </Pressable>
                <Pressable onPress={handleManualEntry} style={styles.manualButton}>
                  <PenLine size={18} color={Colors.textSecondary} />
                  <Text style={styles.manualButtonText}>Enter Manually</Text>
                </Pressable>
              </View>
            </GlassCard>
          </ReAnimated.View>
        )}

        {/* ─── REVIEW STATE ─── */}
        {screenState === 'review' && recipe && (
          <>
            {/* Recipe Name */}
            <ReAnimated.View entering={FadeInDown.delay(0).springify().damping(12)}>
              <GlassCard style={styles.nameCard}>
                <View style={styles.nameHeader}>
                  <Text style={styles.recipeEmoji}>{recipe.emoji || '🍽️'}</Text>
                  <View style={styles.nameInputWrap}>
                    <Text style={styles.nameLabel}>RECIPE NAME</Text>
                    <TextInput
                      style={styles.nameInput}
                      value={editableName}
                      onChangeText={setEditableName}
                      placeholder="Recipe name"
                      placeholderTextColor={Colors.textTertiary}
                    />
                  </View>
                </View>

                {/* Servings control */}
                <View style={styles.servingsRow}>
                  <Text style={styles.servingsLabel}>Servings</Text>
                  <View style={styles.servingsControl}>
                    <Pressable
                      onPress={() => handleServingsChange(-1)}
                      style={styles.servingsBtn}
                      disabled={editableServings <= 1}
                    >
                      <Minus size={16} color={editableServings <= 1 ? Colors.textTertiary : Colors.text} />
                    </Pressable>
                    <Text style={styles.servingsValue}>{editableServings}</Text>
                    <Pressable
                      onPress={() => handleServingsChange(1)}
                      style={styles.servingsBtn}
                    >
                      <Plus size={16} color={Colors.text} />
                    </Pressable>
                  </View>
                </View>
              </GlassCard>
            </ReAnimated.View>

            {/* Macro Summaries */}
            <ReAnimated.View entering={FadeInDown.delay(60).springify().damping(12)}>
              <MacroSummaryCard label="Total Recipe" totals={recipe.totals} />
            </ReAnimated.View>

            <ReAnimated.View entering={FadeInDown.delay(100).springify().damping(12)}>
              {perServing && (
                <MacroSummaryCard label={`Per Serving (1/${editableServings})`} totals={perServing} />
              )}
            </ReAnimated.View>

            {/* Ingredients List */}
            <ReAnimated.View entering={FadeInDown.delay(140).springify().damping(12)}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Ingredients</Text>
                <Text style={styles.sectionCount}>{recipe.ingredients.length} items</Text>
              </View>
            </ReAnimated.View>

            {recipe.ingredients.map((ing, idx) => (
              <IngredientRow key={`${ing.name}-${idx}`} ingredient={ing} index={idx} />
            ))}

            {/* Action Buttons */}
            <ReAnimated.View entering={FadeInDown.delay(200).springify().damping(12)} style={styles.actionButtons}>
              <Pressable
                onPress={handleSaveRecipe}
                style={[styles.saveButton, saving && styles.buttonDisabled]}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <Save size={20} color="#000" strokeWidth={2.5} />
                )}
                <Text style={styles.saveButtonText}>
                  {saving ? 'Saving...' : 'Save Recipe'}
                </Text>
              </Pressable>

              <Pressable onPress={handleAddToDiary} style={styles.diaryButton}>
                <Plus size={20} color={Colors.primary} strokeWidth={2.5} />
                <Text style={styles.diaryButtonText}>Add to Diary</Text>
              </Pressable>
            </ReAnimated.View>

            {/* Source URL */}
            <View style={styles.sourceRow}>
              <Link size={12} color={Colors.textTertiary} />
              <Text style={styles.sourceText} numberOfLines={1}>
                {url}
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
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
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    letterSpacing: -0.3,
  },

  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: 120,
  },

  // Input card
  inputCard: {
    marginBottom: Spacing.md,
  },
  inputIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderAccent,
  },
  inputTextBlock: {
    flex: 1,
  },
  inputTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: 4,
  },
  inputSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 18,
  },

  urlInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  urlInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Platform.OS === 'ios' ? Spacing.md : Spacing.sm,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  pasteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primarySoft,
    borderWidth: 1,
    borderColor: Colors.borderAccent,
  },
  pasteButtonText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },

  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    ...Shadows.button,
  },
  importButtonDisabled: {
    opacity: 0.4,
  },
  importButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: '#000',
  },

  // Hint box
  hintBox: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  hintTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  hintText: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    lineHeight: 20,
  },

  // Loading card
  loadingCard: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  loadingTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  loadingSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.md,
  },
  loadingSteps: {
    gap: Spacing.sm,
  },
  loadingStep: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    textAlign: 'center',
  },

  // Error card
  errorCard: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  errorIconRow: {
    marginBottom: Spacing.md,
  },
  errorTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  errorMessage: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.md,
  },
  errorActions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primarySoft,
    borderWidth: 1,
    borderColor: Colors.borderAccent,
  },
  retryButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },
  manualButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  manualButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
  },

  // Review: Name card
  nameCard: {
    marginBottom: Spacing.md,
  },
  nameHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  recipeEmoji: {
    fontSize: 40,
  },
  nameInputWrap: {
    flex: 1,
  },
  nameLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
    letterSpacing: 1,
    marginBottom: 4,
  },
  nameInput: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.10)',
    paddingBottom: 4,
  },
  servingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  servingsLabel: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
  },
  servingsControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  servingsBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  servingsValue: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    minWidth: 30,
    textAlign: 'center',
  },

  // Macro summary card
  macroSummaryCard: {
    marginBottom: Spacing.md,
  },
  macroSummaryLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  macroSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  macroSumItem: {
    alignItems: 'center',
    gap: 4,
  },
  macroDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  macroSumValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  macroSumUnit: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    marginTop: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  sectionCount: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textTertiary,
  },

  // Ingredient rows
  ingredientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: Spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  ingredientLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    flex: 1,
  },
  ingredientBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    marginTop: 7,
  },
  ingredientInfo: {
    flex: 1,
  },
  ingredientName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.text,
    marginBottom: 2,
  },
  ingredientQuantity: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
  },
  ingredientMacros: {
    alignItems: 'flex-end',
    gap: 4,
  },
  ingredientCal: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.secondary,
  },
  ingredientMacroPills: {
    flexDirection: 'row',
    gap: 4,
  },
  microPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  microPillText: {
    fontSize: FontSize.xs - 1,
    fontWeight: FontWeight.semibold,
  },

  // Action buttons
  actionButtons: {
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    ...Shadows.button,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: '#000',
  },
  diaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.primarySoft,
    borderWidth: 1,
    borderColor: Colors.borderAccent,
  },
  diaryButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },

  // Source row
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.04)',
  },
  sourceText: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    maxWidth: '80%',
  },
});

// ---------------------------------------------------------------------------
// Export with Error Boundary
// ---------------------------------------------------------------------------

export default function RecipeImportScreen(props) {
  return (
    <ScreenErrorBoundary screenName="RecipeImport">
      <RecipeImportInner {...props} />
    </ScreenErrorBoundary>
  );
}

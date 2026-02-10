import React, { useState, useEffect, useMemo } from 'react';
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
  Alert,
} from 'react-native';
import {
  X,
  ChefHat,
  Plus,
  Trash2,
  Check,
  ChevronRight,
  Users,
  Flame,
} from 'lucide-react-native';
import { hapticLight, hapticImpact } from '../lib/haptics';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../constants/theme';
import { useFood } from '../context/FoodContext';

// Common recipe emojis
const RECIPE_EMOJIS = ['🍳', '🥗', '🍲', '🍝', '🥘', '🍛', '🍜', '🥧', '🍰', '🥪', '🌮', '🍔'];

function EmojiPicker({ selected, onSelect }) {
  return (
    <View style={styles.emojiPicker}>
      {RECIPE_EMOJIS.map((emoji) => (
        <Pressable
          key={emoji}
          style={[
            styles.emojiOption,
            selected === emoji && styles.emojiOptionSelected,
          ]}
          onPress={() => onSelect(emoji)}
        >
          <Text style={styles.emojiText}>{emoji}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function IngredientItem({ ingredient, onRemove }) {
  return (
    <View style={styles.ingredientItem}>
      <View style={styles.ingredientInfo}>
        <Text style={styles.ingredientName} numberOfLines={1}>
          {ingredient.name}
        </Text>
        <Text style={styles.ingredientServing}>
          {ingredient.quantity || 1} × {ingredient.serving || '1 serving'}
        </Text>
      </View>
      <View style={styles.ingredientMacros}>
        <Text style={styles.ingredientCalories}>{ingredient.calories} cal</Text>
        <View style={styles.ingredientMacroRow}>
          <Text style={[styles.ingredientMacro, { color: Colors.protein }]}>
            P{ingredient.protein}
          </Text>
          <Text style={[styles.ingredientMacro, { color: Colors.carbs }]}>
            C{ingredient.carbs}
          </Text>
          <Text style={[styles.ingredientMacro, { color: Colors.fat }]}>
            F{ingredient.fat}
          </Text>
        </View>
      </View>
      <Pressable style={styles.removeButton} onPress={onRemove}>
        <Trash2 size={18} color={Colors.danger} />
      </Pressable>
    </View>
  );
}

function MacroSummary({ label, totals, servings, showPerServing }) {
  const displayValues = showPerServing && servings > 0
    ? {
        calories: Math.round(totals.calories / servings),
        protein: Math.round(totals.protein / servings),
        carbs: Math.round(totals.carbs / servings),
        fat: Math.round(totals.fat / servings),
      }
    : totals;

  return (
    <View style={styles.macroSummary}>
      <Text style={styles.macroSummaryLabel}>{label}</Text>
      <View style={styles.macroSummaryRow}>
        <View style={styles.macroSummaryItem}>
          <Flame size={16} color={Colors.primary} />
          <Text style={styles.macroSummaryValue}>{displayValues.calories}</Text>
          <Text style={styles.macroSummaryUnit}>cal</Text>
        </View>
        <View style={styles.macroSummaryDivider} />
        <View style={styles.macroSummaryItem}>
          <View style={[styles.macroDot, { backgroundColor: Colors.protein }]} />
          <Text style={styles.macroSummaryValue}>{displayValues.protein}g</Text>
          <Text style={styles.macroSummaryUnit}>protein</Text>
        </View>
        <View style={styles.macroSummaryDivider} />
        <View style={styles.macroSummaryItem}>
          <View style={[styles.macroDot, { backgroundColor: Colors.carbs }]} />
          <Text style={styles.macroSummaryValue}>{displayValues.carbs}g</Text>
          <Text style={styles.macroSummaryUnit}>carbs</Text>
        </View>
        <View style={styles.macroSummaryDivider} />
        <View style={styles.macroSummaryItem}>
          <View style={[styles.macroDot, { backgroundColor: Colors.fat }]} />
          <Text style={styles.macroSummaryValue}>{displayValues.fat}g</Text>
          <Text style={styles.macroSummaryUnit}>fat</Text>
        </View>
      </View>
    </View>
  );
}

export default function RecipeBuilderModal({
  visible,
  onClose,
  onAddIngredient,
  pendingIngredient,
  onClearPendingIngredient,
}) {
  const { saveRecipe } = useFood();

  const [recipeName, setRecipeName] = useState('');
  const [emoji, setEmoji] = useState('🍳');
  const [ingredients, setIngredients] = useState([]);
  const [servings, setServings] = useState('4');
  const [isSaving, setIsSaving] = useState(false);

  // Handle pending ingredient from search/scanner
  useEffect(() => {
    if (pendingIngredient && visible) {
      setIngredients((prev) => [
        ...prev,
        {
          ...pendingIngredient,
          id: `ing-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        },
      ]);
      onClearPendingIngredient?.();
    }
  }, [pendingIngredient, visible, onClearPendingIngredient]);

  // Reset when modal opens
  useEffect(() => {
    if (visible) {
      // Don't reset if we already have data
      if (recipeName === '' && ingredients.length === 0) {
        setRecipeName('');
        setEmoji('🍳');
        setIngredients([]);
        setServings('4');
      }
    }
  }, [visible]);

  // Calculate totals
  const totals = useMemo(() => {
    return ingredients.reduce(
      (acc, ing) => ({
        calories: acc.calories + (ing.calories || 0),
        protein: acc.protein + (ing.protein || 0),
        carbs: acc.carbs + (ing.carbs || 0),
        fat: acc.fat + (ing.fat || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }, [ingredients]);

  const servingsNum = parseInt(servings, 10) || 1;

  const handleRemoveIngredient = async (ingredientId) => {
    await hapticLight();
    setIngredients((prev) => prev.filter((ing) => ing.id !== ingredientId));
  };

  const handleAddIngredient = async () => {
    await hapticImpact();
    onAddIngredient?.();
  };

  const handleSave = async () => {
    if (!recipeName.trim()) {
      Alert.alert('Missing Name', 'Please give your recipe a name.');
      return;
    }

    if (ingredients.length === 0) {
      Alert.alert('No Ingredients', 'Please add at least one ingredient.');
      return;
    }

    setIsSaving(true);
    try {
      await saveRecipe(recipeName.trim(), ingredients, servingsNum, emoji);

      // Reset form
      setRecipeName('');
      setEmoji('🍳');
      setIngredients([]);
      setServings('4');

      onClose();

      Alert.alert(
        'Recipe Saved!',
        `"${recipeName}" has been saved to My Recipes. You can now log it with one tap!`
      );
    } catch (error) {
      if (__DEV__) console.error('Failed to save recipe:', error);
      Alert.alert('Error', 'Failed to save recipe. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (recipeName || ingredients.length > 0) {
      Alert.alert(
        'Discard Recipe?',
        'You have unsaved changes. Are you sure you want to discard this recipe?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              setRecipeName('');
              setEmoji('🍳');
              setIngredients([]);
              setServings('4');
              onClose();
            },
          },
        ]
      );
    } else {
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable style={styles.closeButton} onPress={handleClose}>
            <X size={24} color={Colors.text} />
          </Pressable>
          <View style={styles.headerCenter}>
            <ChefHat size={20} color={Colors.primary} />
            <Text style={styles.headerTitle}>Create Recipe</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Recipe Name */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Recipe Name</Text>
            <View style={styles.nameRow}>
              <Pressable
                style={styles.emojiButton}
                onPress={() => {
                  const currentIndex = RECIPE_EMOJIS.indexOf(emoji);
                  const nextIndex = (currentIndex + 1) % RECIPE_EMOJIS.length;
                  setEmoji(RECIPE_EMOJIS[nextIndex]);
                }}
              >
                <Text style={styles.emojiButtonText}>{emoji}</Text>
              </Pressable>
              <TextInput
                style={styles.nameInput}
                value={recipeName}
                onChangeText={setRecipeName}
                placeholder="e.g., Sunday Chili"
                placeholderTextColor={Colors.textTertiary}
                maxLength={50}
              />
            </View>
          </View>

          {/* Ingredients Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>Ingredients</Text>
              <Text style={styles.ingredientCount}>
                {ingredients.length} item{ingredients.length !== 1 ? 's' : ''}
              </Text>
            </View>

            {ingredients.length === 0 ? (
              <View style={styles.emptyIngredients}>
                <Text style={styles.emptyText}>No ingredients yet</Text>
                <Text style={styles.emptySubtext}>
                  Tap below to search or scan ingredients
                </Text>
              </View>
            ) : (
              <View style={styles.ingredientsList}>
                {ingredients.map((ingredient) => (
                  <IngredientItem
                    key={ingredient.id}
                    ingredient={ingredient}
                    onRemove={() => handleRemoveIngredient(ingredient.id)}
                  />
                ))}
              </View>
            )}

            <Pressable style={styles.addIngredientButton} onPress={handleAddIngredient}>
              <Plus size={20} color={Colors.primary} />
              <Text style={styles.addIngredientText}>Add Ingredient</Text>
              <ChevronRight size={18} color={Colors.textSecondary} />
            </Pressable>
          </View>

          {/* Totals */}
          {ingredients.length > 0 && (
            <View style={styles.section}>
              <MacroSummary
                label="Total Recipe"
                totals={totals}
                servings={1}
                showPerServing={false}
              />
            </View>
          )}

          {/* Servings */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Number of Servings</Text>
            <View style={styles.servingsRow}>
              <Users size={20} color={Colors.textSecondary} />
              <TextInput
                style={styles.servingsInput}
                value={servings}
                onChangeText={setServings}
                keyboardType="number-pad"
                placeholder="4"
                placeholderTextColor={Colors.textTertiary}
                maxLength={2}
                selectTextOnFocus
              />
              <Text style={styles.servingsLabel}>servings</Text>
            </View>
            <Text style={styles.servingsHint}>
              This determines the nutrition per serving when you log this recipe
            </Text>
          </View>

          {/* Per Serving Preview */}
          {ingredients.length > 0 && servingsNum > 0 && (
            <View style={styles.section}>
              <MacroSummary
                label="Per Serving (what you'll log)"
                totals={totals}
                servings={servingsNum}
                showPerServing={true}
              />
            </View>
          )}
        </ScrollView>

        {/* Bottom Action */}
        <View style={styles.bottomAction}>
          <Pressable
            style={[
              styles.saveButton,
              (!recipeName.trim() || ingredients.length === 0 || isSaving) &&
                styles.saveButtonDisabled,
            ]}
            onPress={handleSave}
            disabled={!recipeName.trim() || ingredients.length === 0 || isSaving}
          >
            <Check size={22} color={Colors.background} />
            <Text style={styles.saveButtonText}>
              {isSaving ? 'Saving...' : 'Save Recipe'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

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
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sectionLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  ingredientCount: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    marginBottom: Spacing.sm,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emojiButton: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emojiButtonText: {
    fontSize: 28,
  },
  nameInput: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.medium,
    color: Colors.text,
  },
  emojiPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  emojiOption: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  emojiOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '15',
  },
  emojiText: {
    fontSize: 24,
  },
  emptyIngredients: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  emptyText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
  },
  emptySubtext: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    marginTop: Spacing.xs,
  },
  ingredientsList: {
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  ingredientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
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
    alignItems: 'flex-end',
  },
  ingredientCalories: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  ingredientMacroRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginTop: 2,
  },
  ingredientMacro: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
  removeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.danger + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addIngredientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary + '15',
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  addIngredientText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },
  macroSummary: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  macroSummaryLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  macroSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  macroSummaryItem: {
    alignItems: 'center',
    gap: 2,
  },
  macroSummaryValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  macroSummaryUnit: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },
  macroSummaryDivider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.border,
  },
  macroDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  servingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  servingsInput: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    textAlign: 'center',
    minWidth: 60,
  },
  servingsLabel: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  servingsHint: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  bottomAction: {
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  saveButton: {
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
  saveButtonDisabled: {
    backgroundColor: Colors.surfaceElevated,
    shadowOpacity: 0,
  },
  saveButtonText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.background,
  },
});

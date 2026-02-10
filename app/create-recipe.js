import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  FlatList,
  Modal,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  ChefHat,
  Plus,
  Trash2,
  Check,
  Search,
  X,
  Users,
  Flame,
} from 'lucide-react-native';
import { hapticLight } from '../lib/haptics';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../constants/theme';
import { useFood } from '../context/FoodContext';
import { useAuth } from '../context/AuthContext';
import { searchProductsGlobal, productToFood } from '../services/openFoodFacts';
import { useDebounce } from '../hooks/useDebounce';
import { foodDatabase } from '../data/foods';

const RECIPE_EMOJIS = ['🍳', '🥗', '🍲', '🍝', '🥘', '🍛', '🍜', '🥧', '🍰', '🥪', '🌮', '🍔'];

function IngredientItem({ ingredient, onRemove }) {
  return (
    <View style={styles.ingredientItem}>
      <View style={styles.ingredientInfo}>
        <Text style={styles.ingredientName} numberOfLines={1}>
          {ingredient.name}
        </Text>
        <Text style={styles.ingredientServing}>
          {ingredient.serving || '1 serving'}
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

function MacroTotals({ totals, servings }) {
  const perServing = {
    calories: Math.round(totals.calories / Math.max(1, servings)),
    protein: Math.round(totals.protein / Math.max(1, servings)),
    carbs: Math.round(totals.carbs / Math.max(1, servings)),
    fat: Math.round(totals.fat / Math.max(1, servings)),
  };

  return (
    <View style={styles.macroTotalsContainer}>
      <View style={styles.macroTotalsSection}>
        <Text style={styles.macroTotalsLabel}>Total Recipe</Text>
        <View style={styles.macroTotalsRow}>
          <View style={styles.macroTotalsItem}>
            <Text style={styles.macroTotalsValue}>{totals.calories}</Text>
            <Text style={styles.macroTotalsUnit}>cal</Text>
          </View>
          <View style={styles.macroTotalsDivider} />
          <View style={styles.macroTotalsItem}>
            <Text style={[styles.macroTotalsValue, { color: Colors.protein }]}>{totals.protein}g</Text>
            <Text style={styles.macroTotalsUnit}>protein</Text>
          </View>
          <View style={styles.macroTotalsDivider} />
          <View style={styles.macroTotalsItem}>
            <Text style={[styles.macroTotalsValue, { color: Colors.carbs }]}>{totals.carbs}g</Text>
            <Text style={styles.macroTotalsUnit}>carbs</Text>
          </View>
          <View style={styles.macroTotalsDivider} />
          <View style={styles.macroTotalsItem}>
            <Text style={[styles.macroTotalsValue, { color: Colors.fat }]}>{totals.fat}g</Text>
            <Text style={styles.macroTotalsUnit}>fat</Text>
          </View>
        </View>
      </View>

      {servings > 0 && (
        <View style={[styles.macroTotalsSection, styles.perServingSection]}>
          <Text style={styles.macroTotalsLabel}>Per Serving ({servings} servings)</Text>
          <View style={styles.macroTotalsRow}>
            <View style={styles.macroTotalsItem}>
              <Text style={styles.macroTotalsValueSmall}>{perServing.calories}</Text>
              <Text style={styles.macroTotalsUnit}>cal</Text>
            </View>
            <View style={styles.macroTotalsDivider} />
            <View style={styles.macroTotalsItem}>
              <Text style={styles.macroTotalsValueSmall}>{perServing.protein}g</Text>
              <Text style={styles.macroTotalsUnit}>P</Text>
            </View>
            <View style={styles.macroTotalsDivider} />
            <View style={styles.macroTotalsItem}>
              <Text style={styles.macroTotalsValueSmall}>{perServing.carbs}g</Text>
              <Text style={styles.macroTotalsUnit}>C</Text>
            </View>
            <View style={styles.macroTotalsDivider} />
            <View style={styles.macroTotalsItem}>
              <Text style={styles.macroTotalsValueSmall}>{perServing.fat}g</Text>
              <Text style={styles.macroTotalsUnit}>F</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

function IngredientSearchModal({ visible, onClose, onSelectIngredient }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const debouncedQuery = useDebounce(query, 300);

  // Search when debounced query changes
  React.useEffect(() => {
    async function search() {
      if (!debouncedQuery || debouncedQuery.length < 2) {
        setResults([]);
        return;
      }

      setIsSearching(true);
      try {
        // Use global search for US + UK + EU coverage
        const apiResults = await searchProductsGlobal(debouncedQuery, 20);
        setResults(apiResults.products || []);
      } catch (error) {
        // Silently fail - just show local results
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }

    search();
  }, [debouncedQuery]);

  // Filter local foods
  const localMatches = useMemo(() => {
    if (!query || query.length < 2) return [];
    return foodDatabase
      .filter((f) => f.name.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 5);
  }, [query]);

  const handleSelect = (item, isLocal = false) => {
    const ingredient = isLocal
      ? { ...item, serving: '1 serving' }
      : { ...productToFood(item), serving: item.serving || '100g' };

    onSelectIngredient(ingredient);
    setQuery('');
    setResults([]);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalContainer} edges={['top']}>
        <View style={styles.modalHeader}>
          <Pressable style={styles.modalCloseButton} onPress={onClose}>
            <X size={24} color={Colors.text} />
          </Pressable>
          <Text style={styles.modalTitle}>Add Ingredient</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Search size={20} color={Colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search foods..."
              placeholderTextColor={Colors.textTertiary}
              value={query}
              onChangeText={setQuery}
              autoFocus
              returnKeyType="search"
            />
            {query.length > 0 && (
              <Pressable onPress={() => setQuery('')}>
                <X size={18} color={Colors.textSecondary} />
              </Pressable>
            )}
          </View>
        </View>

        {isSearching ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Searching...</Text>
          </View>
        ) : (
          <ScrollView style={styles.resultsContainer} keyboardShouldPersistTaps="handled">
            {/* Local Foods */}
            {localMatches.length > 0 && (
              <View style={styles.resultsSection}>
                <Text style={styles.resultsSectionLabel}>Quick Add</Text>
                {localMatches.map((item) => (
                  <Pressable
                    key={item.id}
                    style={styles.resultItem}
                    onPress={() => handleSelect(item, true)}
                  >
                    <View style={styles.resultInfo}>
                      <Text style={styles.resultName}>{item.name}</Text>
                      <Text style={styles.resultMacros}>
                        {item.calories} cal · P{item.protein} C{item.carbs} F{item.fat}
                      </Text>
                    </View>
                    <Plus size={20} color={Colors.primary} />
                  </Pressable>
                ))}
              </View>
            )}

            {/* API Results */}
            {results.length > 0 && (
              <View style={styles.resultsSection}>
                <Text style={styles.resultsSectionLabel}>Search Results</Text>
                {results.map((item) => (
                  <Pressable
                    key={item.barcode}
                    style={styles.resultItem}
                    onPress={() => handleSelect(item, false)}
                  >
                    <View style={styles.resultInfo}>
                      <Text style={styles.resultName} numberOfLines={1}>{item.name}</Text>
                      {item.brand && (
                        <Text style={styles.resultBrand}>{item.brand}</Text>
                      )}
                      <Text style={styles.resultMacros}>
                        {item.calories ?? 'N/A'} cal · P{item.protein ?? 0} C{item.carbs ?? 0} F{item.fat ?? 0}
                      </Text>
                    </View>
                    <Plus size={20} color={Colors.primary} />
                  </Pressable>
                ))}
              </View>
            )}

            {query.length >= 2 && !isSearching && results.length === 0 && localMatches.length === 0 && (
              <View style={styles.emptyResults}>
                <Text style={styles.emptyText}>No results found</Text>
                <Text style={styles.emptySubtext}>Try a different search term</Text>
              </View>
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

export default function CreateRecipeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { saveRecipe } = useFood();

  const [recipeName, setRecipeName] = useState('');
  const [emoji, setEmoji] = useState('🍳');
  const [servings, setServings] = useState('4');
  const [ingredients, setIngredients] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [searchModalVisible, setSearchModalVisible] = useState(false);

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

  const handleAddIngredient = useCallback((ingredient) => {
    const newIngredient = {
      ...ingredient,
      id: `ing-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
    setIngredients((prev) => [...prev, newIngredient]);
    hapticLight();
  }, []);

  const handleRemoveIngredient = useCallback((ingredientId) => {
    setIngredients((prev) => prev.filter((ing) => ing.id !== ingredientId));
    hapticLight();
  }, []);

  const handleEmojiChange = useCallback(() => {
    const currentIndex = RECIPE_EMOJIS.indexOf(emoji);
    const nextIndex = (currentIndex + 1) % RECIPE_EMOJIS.length;
    setEmoji(RECIPE_EMOJIS[nextIndex]);
    hapticLight();
  }, [emoji]);

  const handleSave = async () => {
    // Verify user is logged in
    if (!user || !user.id) {
      Alert.alert('Error', 'User not found. Please log in again.');
      return;
    }

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

      Alert.alert(
        'Success',
        `"${recipeName}" has been saved! You can now log it from the Add Food screen.`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      if (__DEV__) console.error('Save failed:', error);
      Alert.alert('Save Failed', error.message || 'Could not save recipe. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBack = () => {
    if (recipeName || ingredients.length > 0) {
      Alert.alert(
        'Discard Recipe?',
        'You have unsaved changes. Are you sure you want to leave?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: () => router.back() },
        ]
      );
    } else {
      router.back();
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={handleBack}>
          <ArrowLeft size={24} color={Colors.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <ChefHat size={20} color={Colors.primary} />
          <Text style={styles.headerTitle}>Create Recipe</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Recipe Name Section */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Recipe Name</Text>
            <View style={styles.nameRow}>
              <Pressable style={styles.emojiButton} onPress={handleEmojiChange}>
                <Text style={styles.emojiText}>{emoji}</Text>
              </Pressable>
              <TextInput
                style={styles.nameInput}
                value={recipeName}
                onChangeText={setRecipeName}
                placeholder="e.g., Morning Oats"
                placeholderTextColor={Colors.textTertiary}
                maxLength={50}
              />
            </View>
          </View>

          {/* Servings Section */}
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
                  Tap below to search and add ingredients
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

            <Pressable
              style={styles.addIngredientButton}
              onPress={() => setSearchModalVisible(true)}
            >
              <Plus size={20} color={Colors.primary} />
              <Text style={styles.addIngredientText}>Add Ingredient</Text>
            </Pressable>
          </View>

          {/* Live Totals */}
          {ingredients.length > 0 && (
            <View style={styles.section}>
              <MacroTotals totals={totals} servings={servingsNum} />
            </View>
          )}
        </ScrollView>

        {/* Save Button */}
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
            {isSaving ? (
              <ActivityIndicator color={Colors.background} />
            ) : (
              <>
                <Check size={22} color={Colors.background} />
                <Text style={styles.saveButtonText}>Save Recipe</Text>
              </>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {/* Ingredient Search Modal */}
      <IngredientSearchModal
        visible={searchModalVisible}
        onClose={() => setSearchModalVisible(false)}
        onSelectIngredient={handleAddIngredient}
      />
    </SafeAreaView>
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
  backButton: {
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
  emojiText: {
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
  emptyIngredients: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    marginBottom: Spacing.sm,
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
    textAlign: 'center',
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
  // Macro Totals
  macroTotalsContainer: {
    gap: Spacing.sm,
  },
  macroTotalsSection: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  perServingSection: {
    backgroundColor: Colors.primary + '10',
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  macroTotalsLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  macroTotalsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  macroTotalsItem: {
    alignItems: 'center',
  },
  macroTotalsValue: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  macroTotalsValueSmall: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  macroTotalsUnit: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  macroTotalsDivider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.border,
  },
  // Bottom Action
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
  },
  saveButtonDisabled: {
    backgroundColor: Colors.surfaceElevated,
  },
  saveButtonText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.background,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  searchContainer: {
    padding: Spacing.md,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    height: 48,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.text,
    height: '100%',
  },
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
  resultsContainer: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },
  resultsSection: {
    marginBottom: Spacing.lg,
  },
  resultsSectionLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  resultBrand: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  resultMacros: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  emptyResults: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
});

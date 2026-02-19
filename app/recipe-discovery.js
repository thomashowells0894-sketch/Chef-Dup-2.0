/**
 * VibeFit - Recipe Discovery Screen
 *
 * Browse 60+ curated recipes with category tabs, tag filters,
 * search, sorting, expandable cards, and add-to-diary functionality.
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  FlatList,
  Alert,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { useRouter } from 'expo-router';
import ReAnimated, { FadeInDown } from 'react-native-reanimated';
import {
  ArrowLeft,
  Search,
  Clock,
  Users as UsersIcon,
  Heart,
  Filter,
  ChevronDown,
  Plus,
  Flame,
} from 'lucide-react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import ScreenErrorBoundary from '../components/ScreenErrorBoundary';
import {
  Colors,
  Spacing,
  FontSize,
  FontWeight,
  BorderRadius,
  Shadows,
} from '../constants/theme';
import { hapticLight, hapticSuccess, hapticMedium } from '../lib/haptics';
import { useMeals } from '../context/MealContext';
import {
  CURATED_RECIPES,
  RECIPE_CATEGORIES,
  RECIPE_TAGS,
} from '../data/curatedRecipes';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fuzzyMatch(text, query) {
  if (!query) return true;
  const lower = text.toLowerCase();
  const q = query.toLowerCase().trim();
  if (!q) return true;
  // Simple substring match on name, then check individual words
  if (lower.includes(q)) return true;
  const words = q.split(/\s+/);
  return words.every((w) => lower.includes(w));
}

const SORT_OPTIONS = [
  { key: 'calories', label: 'Calories', icon: Flame },
  { key: 'protein', label: 'Protein', icon: Flame },
  { key: 'time', label: 'Time', icon: Clock },
];

// ---------------------------------------------------------------------------
// Category Tab
// ---------------------------------------------------------------------------

function CategoryTab({ item, isActive, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.categoryTab, isActive && styles.categoryTabActive]}
    >
      <Text style={styles.categoryEmoji}>{item.emoji}</Text>
      <Text style={[styles.categoryLabel, isActive && styles.categoryLabelActive]}>
        {item.label}
      </Text>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Tag Chip
// ---------------------------------------------------------------------------

function TagChip({ tag, isActive, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.tagChip,
        isActive && { backgroundColor: tag.color + '30', borderColor: tag.color },
      ]}
    >
      <View
        style={[styles.tagDot, { backgroundColor: isActive ? tag.color : Colors.textTertiary }]}
      />
      <Text style={[styles.tagLabel, isActive && { color: tag.color }]}>
        {tag.label}
      </Text>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Recipe Card
// ---------------------------------------------------------------------------

function RecipeCard({ recipe, index, isExpanded, onToggle, isSaved, onToggleSave, onAddToDiary }) {
  const totalTime = recipe.prepTime + recipe.cookTime;

  const handleToggle = useCallback(async () => {
    await hapticLight();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onToggle();
  }, [onToggle]);

  const handleSave = useCallback(async () => {
    await hapticMedium();
    onToggleSave();
  }, [onToggleSave]);

  const handleAdd = useCallback(async () => {
    await hapticSuccess();
    onAddToDiary(recipe);
  }, [onAddToDiary, recipe]);

  return (
    <ReAnimated.View entering={FadeInDown.delay(Math.min(index * 60, 400)).springify().damping(14)}>
      <Pressable onPress={handleToggle} style={styles.recipeCard}>
        {/* Glass border overlay */}
        <View style={styles.cardBorder} />

        {/* Top row: emoji + info + save */}
        <View style={styles.cardHeader}>
          <View style={styles.cardEmojiWrap}>
            <Text style={styles.cardEmoji}>{recipe.emoji}</Text>
          </View>

          <View style={styles.cardInfo}>
            <Text style={styles.cardCategory}>
              {recipe.category.toUpperCase()}
            </Text>
            <Text style={styles.cardName} numberOfLines={2}>
              {recipe.name}
            </Text>
          </View>

          <Pressable onPress={handleSave} style={styles.saveButton}>
            <Heart
              size={20}
              color={isSaved ? '#FF6B6B' : Colors.textTertiary}
              fill={isSaved ? '#FF6B6B' : 'none'}
            />
          </Pressable>
        </View>

        {/* Macro + time row */}
        <View style={styles.macroRow}>
          <View style={styles.macroPill}>
            <Flame size={12} color={Colors.secondary} />
            <Text style={styles.macroText}>{recipe.calories} cal</Text>
          </View>
          <View style={styles.macroPill}>
            <View style={[styles.macroDot, { backgroundColor: Colors.protein }]} />
            <Text style={styles.macroText}>{recipe.protein}g P</Text>
          </View>
          <View style={styles.macroPill}>
            <View style={[styles.macroDot, { backgroundColor: Colors.carbs }]} />
            <Text style={styles.macroText}>{recipe.carbs}g C</Text>
          </View>
          <View style={styles.macroPill}>
            <View style={[styles.macroDot, { backgroundColor: Colors.fat }]} />
            <Text style={styles.macroText}>{recipe.fat}g F</Text>
          </View>
          <View style={styles.timePill}>
            <Clock size={12} color={Colors.textTertiary} />
            <Text style={styles.timeText}>{totalTime}m</Text>
          </View>
        </View>

        {/* Tag chips */}
        <View style={styles.cardTags}>
          {recipe.tags.slice(0, 4).map((tagId) => {
            const tagMeta = RECIPE_TAGS.find((t) => t.id === tagId);
            if (!tagMeta) return null;
            return (
              <View
                key={tagId}
                style={[styles.cardTagChip, { backgroundColor: tagMeta.color + '20' }]}
              >
                <Text style={[styles.cardTagText, { color: tagMeta.color }]}>
                  {tagMeta.label}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Expand indicator */}
        <View style={styles.expandRow}>
          <Text style={styles.expandHint}>
            {isExpanded ? 'Tap to collapse' : 'Tap for details'}
          </Text>
          <ChevronDown
            size={16}
            color={Colors.textTertiary}
            style={isExpanded ? { transform: [{ rotate: '180deg' }] } : undefined}
          />
        </View>

        {/* Expanded content */}
        {isExpanded && (
          <View style={styles.expandedContent}>
            {/* Servings + Fiber */}
            <View style={styles.extraStatsRow}>
              <View style={styles.extraStat}>
                <UsersIcon size={14} color={Colors.primary} />
                <Text style={styles.extraStatText}>{recipe.servings} serving{recipe.servings > 1 ? 's' : ''}</Text>
              </View>
              <View style={styles.extraStat}>
                <Text style={styles.extraStatText}>Fiber: {recipe.fiber}g</Text>
              </View>
              <View style={styles.extraStat}>
                <Clock size={14} color={Colors.textTertiary} />
                <Text style={styles.extraStatText}>Prep {recipe.prepTime}m + Cook {recipe.cookTime}m</Text>
              </View>
            </View>

            {/* Ingredients */}
            <View style={styles.sectionDivider} />
            <Text style={styles.sectionLabel}>Ingredients</Text>
            {recipe.ingredients.map((ing, idx) => (
              <Text key={idx} style={styles.ingredientItem}>
                {'\u2022'} {ing}
              </Text>
            ))}

            {/* Instructions */}
            <View style={styles.sectionDivider} />
            <Text style={styles.sectionLabel}>Instructions</Text>
            {recipe.instructions.map((step, idx) => (
              <View key={idx} style={styles.stepRow}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{idx + 1}</Text>
                </View>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}

            {/* Tips */}
            {recipe.tips && (
              <>
                <View style={styles.sectionDivider} />
                <View style={styles.tipBox}>
                  <Text style={styles.tipLabel}>Pro Tip</Text>
                  <Text style={styles.tipText}>{recipe.tips}</Text>
                </View>
              </>
            )}

            {/* Add to Diary button */}
            <Pressable onPress={handleAdd} style={styles.addButton}>
              <Plus size={18} color="#000" strokeWidth={3} />
              <Text style={styles.addButtonText}>Add to Diary</Text>
            </Pressable>
          </View>
        )}
      </Pressable>
    </ReAnimated.View>
  );
}

// ---------------------------------------------------------------------------
// Main Screen (Inner)
// ---------------------------------------------------------------------------

function RecipeDiscoveryInner() {
  const router = useRouter();
  const { addFood } = useMeals();

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeTags, setActiveTags] = useState(new Set());
  const [expandedRecipeId, setExpandedRecipeId] = useState(null);
  const [savedFavorites, setSavedFavorites] = useState(new Set());
  const [sortMode, setSortMode] = useState('calories');

  // Handlers
  const handleBack = useCallback(async () => {
    await hapticLight();
    router.back();
  }, [router]);

  const handleCategoryPress = useCallback(async (catId) => {
    await hapticLight();
    setActiveCategory(catId);
  }, []);

  const handleTagPress = useCallback(async (tagId) => {
    await hapticLight();
    setActiveTags((prev) => {
      const next = new Set(prev);
      if (next.has(tagId)) {
        next.delete(tagId);
      } else {
        next.add(tagId);
      }
      return next;
    });
  }, []);

  const handleToggleExpand = useCallback((recipeId) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedRecipeId((prev) => (prev === recipeId ? null : recipeId));
  }, []);

  const handleToggleSave = useCallback((recipeId) => {
    setSavedFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(recipeId)) {
        next.delete(recipeId);
      } else {
        next.add(recipeId);
      }
      return next;
    });
  }, []);

  const handleAddToDiary = useCallback(
    (recipe) => {
      const mealTypeMap = {
        breakfast: 'breakfast',
        lunch: 'lunch',
        dinner: 'dinner',
        snack: 'snacks',
        dessert: 'snacks',
        smoothie: 'breakfast',
      };

      const foodItem = {
        name: recipe.name,
        emoji: recipe.emoji,
        calories: recipe.calories,
        protein: recipe.protein,
        carbs: recipe.carbs,
        fat: recipe.fat,
        fiber: recipe.fiber,
        serving: `1 serving (${recipe.servings > 1 ? '1/' + recipe.servings + ' recipe' : 'full recipe'})`,
      };

      const mealType = mealTypeMap[recipe.category] || 'snacks';
      addFood(foodItem, mealType);

      Alert.alert(
        'Added!',
        `${recipe.emoji} ${recipe.name} added to your ${mealType} diary.`,
        [{ text: 'OK' }]
      );
    },
    [addFood]
  );

  const cycleSortMode = useCallback(async () => {
    await hapticLight();
    setSortMode((prev) => {
      if (prev === 'calories') return 'protein';
      if (prev === 'protein') return 'time';
      return 'calories';
    });
  }, []);

  // Filtering + sorting
  const filteredRecipes = useMemo(() => {
    let results = CURATED_RECIPES;

    // Category filter
    if (activeCategory !== 'all') {
      results = results.filter((r) => r.category === activeCategory);
    }

    // Tag filter (intersection: recipe must have ALL selected tags)
    if (activeTags.size > 0) {
      results = results.filter((r) =>
        [...activeTags].every((tag) => r.tags.includes(tag))
      );
    }

    // Search filter
    if (searchQuery.trim()) {
      results = results.filter((r) => {
        const searchable = `${r.name} ${r.ingredients.join(' ')} ${r.tags.join(' ')}`;
        return fuzzyMatch(searchable, searchQuery);
      });
    }

    // Sort
    results = [...results].sort((a, b) => {
      if (sortMode === 'calories') return a.calories - b.calories;
      if (sortMode === 'protein') return b.protein - a.protein;
      return (a.prepTime + a.cookTime) - (b.prepTime + b.cookTime);
    });

    return results;
  }, [activeCategory, activeTags, searchQuery, sortMode]);

  const sortLabel = sortMode === 'calories' ? 'Lowest Cal' : sortMode === 'protein' ? 'Most Protein' : 'Quickest';

  // Render
  const renderRecipe = useCallback(
    ({ item, index }) => (
      <RecipeCard
        recipe={item}
        index={index}
        isExpanded={expandedRecipeId === item.id}
        onToggle={() => handleToggleExpand(item.id)}
        isSaved={savedFavorites.has(item.id)}
        onToggleSave={() => handleToggleSave(item.id)}
        onAddToDiary={handleAddToDiary}
      />
    ),
    [expandedRecipeId, savedFavorites, handleToggleExpand, handleToggleSave, handleAddToDiary]
  );

  const keyExtractor = useCallback((item) => item.id, []);

  return (
    <ScreenWrapper>
      {/* ─── Header ─── */}
      <ReAnimated.View entering={FadeInDown.delay(0).springify().damping(12)} style={styles.header}>
        <Pressable onPress={handleBack} style={styles.headerButton}>
          <ArrowLeft size={24} color={Colors.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Recipe Discovery</Text>
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>{CURATED_RECIPES.length}+</Text>
        </View>
      </ReAnimated.View>

      {/* ─── Search Bar ─── */}
      <ReAnimated.View entering={FadeInDown.delay(60).springify().damping(12)} style={styles.searchWrap}>
        <View style={styles.searchBar}>
          <Search size={18} color={Colors.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search recipes, ingredients..."
            placeholderTextColor={Colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <Text style={styles.clearButton}>Clear</Text>
            </Pressable>
          )}
        </View>
      </ReAnimated.View>

      {/* ─── Category Tabs ─── */}
      <ReAnimated.View entering={FadeInDown.delay(120).springify().damping(12)}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {RECIPE_CATEGORIES.map((cat) => (
            <CategoryTab
              key={cat.id}
              item={cat}
              isActive={activeCategory === cat.id}
              onPress={() => handleCategoryPress(cat.id)}
            />
          ))}
        </ScrollView>
      </ReAnimated.View>

      {/* ─── Tag Filters ─── */}
      <ReAnimated.View entering={FadeInDown.delay(180).springify().damping(12)}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tagScroll}
        >
          {RECIPE_TAGS.map((tag) => (
            <TagChip
              key={tag.id}
              tag={tag}
              isActive={activeTags.has(tag.id)}
              onPress={() => handleTagPress(tag.id)}
            />
          ))}
        </ScrollView>
      </ReAnimated.View>

      {/* ─── Results count + sort ─── */}
      <ReAnimated.View entering={FadeInDown.delay(240).springify().damping(12)} style={styles.resultsRow}>
        <Text style={styles.resultsText}>
          {filteredRecipes.length} recipe{filteredRecipes.length !== 1 ? 's' : ''}
        </Text>
        <Pressable onPress={cycleSortMode} style={styles.sortButton}>
          <Filter size={14} color={Colors.primary} />
          <Text style={styles.sortText}>{sortLabel}</Text>
        </Pressable>
      </ReAnimated.View>

      {/* ─── Recipe List ─── */}
      {filteredRecipes.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>{'\u{1F50D}'}</Text>
          <Text style={styles.emptyTitle}>No recipes found</Text>
          <Text style={styles.emptySubtitle}>
            Try adjusting your filters or search query
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredRecipes}
          renderItem={renderRecipe}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          initialNumToRender={6}
          maxToRenderPerBatch={8}
          windowSize={5}
          ListFooterComponent={
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                {filteredRecipes.length} of {CURATED_RECIPES.length} recipes
              </Text>
              {savedFavorites.size > 0 && (
                <Text style={styles.footerSaved}>
                  {'\u2764\uFE0F'} {savedFavorites.size} saved
                </Text>
              )}
            </View>
          }
        />
      )}
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
  countBadge: {
    backgroundColor: Colors.primarySoft,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.borderAccent,
  },
  countBadgeText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },

  // Search
  searchWrap: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Platform.OS === 'ios' ? Spacing.sm + 2 : 0,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.text,
    paddingVertical: Spacing.sm,
  },
  clearButton: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },

  // Category tabs
  categoryScroll: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  categoryTabActive: {
    backgroundColor: Colors.primarySoft,
    borderColor: Colors.primary,
  },
  categoryEmoji: {
    fontSize: 16,
  },
  categoryLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
  },
  categoryLabelActive: {
    color: Colors.primary,
  },

  // Tag chips
  tagScroll: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  tagDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  tagLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Colors.textTertiary,
  },

  // Results row
  resultsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  resultsText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primarySoft,
  },
  sortText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },

  // List
  listContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: 120,
  },

  // Recipe Card
  recipeCard: {
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: Spacing.lg,
    position: 'relative',
    overflow: 'hidden',
    ...Shadows.card,
  },
  cardBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  cardEmojiWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardEmoji: {
    fontSize: 26,
  },
  cardInfo: {
    flex: 1,
  },
  cardCategory: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
    letterSpacing: 1,
    marginBottom: 2,
  },
  cardName: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    letterSpacing: -0.2,
  },
  saveButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Macros row
  macroRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    flexWrap: 'wrap',
  },
  macroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  macroDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  macroText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
  },
  timePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  timeText: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },

  // Card tags
  cardTags: {
    flexDirection: 'row',
    gap: 6,
    marginTop: Spacing.sm,
    flexWrap: 'wrap',
  },
  cardTagChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  cardTagText: {
    fontSize: FontSize.xs - 1,
    fontWeight: FontWeight.semibold,
  },

  // Expand
  expandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  expandHint: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },

  // Expanded content
  expandedContent: {
    marginTop: Spacing.md,
  },
  extraStatsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  extraStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  extraStatText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginVertical: Spacing.sm,
  },
  sectionLabel: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  ingredientItem: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 22,
    paddingLeft: Spacing.xs,
  },
  stepRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
  },
  stepNumberText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  stepText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  tipBox: {
    backgroundColor: 'rgba(0, 212, 255, 0.08)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.15)',
  },
  tipLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tipText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    ...Shadows.button,
  },
  addButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: '#000',
  },

  // Empty state
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
  },

  // Footer
  footer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.xs,
  },
  footerText: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
  },
  footerSaved: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
});

// ---------------------------------------------------------------------------
// Export with Error Boundary
// ---------------------------------------------------------------------------

export default function RecipeDiscoveryScreen(props) {
  return (
    <ScreenErrorBoundary screenName="RecipeDiscovery">
      <RecipeDiscoveryInner {...props} />
    </ScreenErrorBoundary>
  );
}

/**
 * SmartFoodSearch - Enhanced food search component
 *
 * Features:
 * - Instant results as user types (debounced 300ms)
 * - Section headers: Recent, Frequent, Favorites, Restaurant, Database Results
 * - Quick filters: High Protein, Low Carb, Low Calorie, Keto-Friendly
 * - Multi-select mode: tap multiple foods to add a whole meal at once
 * - Portion picker: smart portions after selecting food
 * - Nutrition preview: cal/protein/carb/fat inline before adding
 * - Voice search button
 * - Photo search button
 * - Meal templates: "Same as yesterday's lunch" shortcut
 * - Barcode scanner inline
 */

import React, { useState, useCallback, memo, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  SectionList,
  ActivityIndicator,
  Keyboard,
  ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import {
  Search,
  X,
  ScanBarcode,
  Camera,
  Mic,
  Filter,
  CheckSquare,
  Square,
  Check,
  Plus,
  Flame,
  Clock,
  Heart,
  Star,
  Utensils,
  TrendingUp,
  Zap,
} from 'lucide-react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius, Shadows } from '../constants/theme';
import { useSmartSearch } from '../hooks/useSmartSearch';
import { hapticLight } from '../lib/haptics';

// ---------------------------------------------------------------------------
// Quick Filter Pills
// ---------------------------------------------------------------------------

const QUICK_FILTERS = [
  { id: 'restaurant', label: 'Restaurant', icon: Utensils, color: Colors.secondary },
  { id: 'high_protein', label: 'High Protein', icon: Flame, color: Colors.protein },
  { id: 'low_carb', label: 'Low Carb', icon: Zap, color: Colors.carbs },
  { id: 'low_calorie', label: 'Low Cal', icon: Star, color: Colors.success },
  { id: 'keto_friendly', label: 'Keto', icon: Filter, color: Colors.warning },
];

const FilterPills = memo(function FilterPills({ activeFilter, onSelect }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filterScroll}
    >
      {QUICK_FILTERS.map((filter) => {
        const Icon = filter.icon;
        const isActive = activeFilter === filter.id;
        return (
          <Pressable
            key={filter.id}
            style={[
              styles.filterPill,
              isActive && { backgroundColor: filter.color + '25', borderColor: filter.color + '60' },
            ]}
            onPress={() => {
              hapticLight();
              onSelect(isActive ? null : filter.id);
            }}
          >
            <Icon size={14} color={isActive ? filter.color : Colors.textSecondary} />
            <Text
              style={[
                styles.filterPillText,
                isActive && { color: filter.color },
              ]}
            >
              {filter.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
});

// ---------------------------------------------------------------------------
// Section Header
// ---------------------------------------------------------------------------

const SECTION_ICONS = {
  Recent: Clock,
  Frequent: Zap,
  Favorites: Heart,
  Restaurant: Utensils,
  Results: Search,
  Trending: TrendingUp,
};

const SectionHeader = memo(function SectionHeader({ title, count }) {
  const Icon = SECTION_ICONS[title] || Search;
  return (
    <View style={styles.sectionHeader}>
      <Icon size={14} color={Colors.primary} />
      <Text style={styles.sectionHeaderText}>{title}</Text>
      {count > 0 && (
        <Text style={styles.sectionHeaderCount}>({count})</Text>
      )}
    </View>
  );
});

// ---------------------------------------------------------------------------
// Search Result Item
// ---------------------------------------------------------------------------

const SearchResultItem = memo(function SearchResultItem({
  item,
  onPress,
  onQuickAdd,
  isSelected,
  multiSelectMode,
  index = 0,
}) {
  const hasCalories = item.calories != null && item.calories > 0;

  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index * 30, 300)).duration(250)}>
      <Pressable
        style={[
          styles.resultItem,
          isSelected && styles.resultItemSelected,
        ]}
        onPress={() => {
          hapticLight();
          if (multiSelectMode) {
            onQuickAdd?.(item);
          } else {
            onPress(item);
          }
        }}
      >
        {/* Multi-select checkbox */}
        {multiSelectMode && (
          <View style={styles.checkboxContainer}>
            {isSelected ? (
              <CheckSquare size={20} color={Colors.primary} />
            ) : (
              <Square size={20} color={Colors.textTertiary} />
            )}
          </View>
        )}

        {/* Image or placeholder */}
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.resultImage} cachePolicy="memory-disk" transition={200} />
        ) : (
          <View style={[styles.resultImage, styles.resultImagePlaceholder]}>
            <Text style={styles.resultImagePlaceholderText}>
              {item.name?.charAt(0) || '?'}
            </Text>
          </View>
        )}

        {/* Info */}
        <View style={styles.resultInfo}>
          <Text style={styles.resultName} numberOfLines={1}>
            {item.name}
          </Text>
          {item.brand && (
            <Text style={styles.resultBrand} numberOfLines={1}>
              {item.brand}
            </Text>
          )}
          {/* Inline macro preview */}
          <View style={styles.macroPreview}>
            <Text style={styles.macroText}>
              <Text style={{ color: Colors.protein }}>P</Text> {item.protein ?? '-'}
            </Text>
            <Text style={styles.macroDot}>|</Text>
            <Text style={styles.macroText}>
              <Text style={{ color: Colors.carbs }}>C</Text> {item.carbs ?? '-'}
            </Text>
            <Text style={styles.macroDot}>|</Text>
            <Text style={styles.macroText}>
              <Text style={{ color: Colors.fat }}>F</Text> {item.fat ?? '-'}
            </Text>
          </View>
        </View>

        {/* Calories */}
        <View style={styles.caloriesContainer}>
          <Text style={[styles.caloriesValue, !hasCalories && styles.caloriesNA]}>
            {hasCalories ? item.calories : '-'}
          </Text>
          {hasCalories && <Text style={styles.caloriesLabel}>kcal</Text>}
        </View>

        {/* Quick add button */}
        {!multiSelectMode && (
          hasCalories ? (
            <Pressable
              style={styles.quickAddButton}
              onPress={(e) => {
                e.stopPropagation?.();
                hapticLight();
                onQuickAdd?.(item);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            >
              <Check size={14} color={Colors.background} />
            </Pressable>
          ) : (
            <View style={styles.addButton}>
              <Plus size={16} color={Colors.background} />
            </View>
          )
        )}
      </Pressable>
    </Animated.View>
  );
});

// ---------------------------------------------------------------------------
// Trending / Recent Searches Chips
// ---------------------------------------------------------------------------

const SearchChips = memo(function SearchChips({ recentSearches, trendingTerms, onSelect }) {
  if (recentSearches.length === 0 && trendingTerms.length === 0) return null;

  return (
    <Animated.View entering={FadeIn.duration(300)}>
      {/* Recent Searches */}
      {recentSearches.length > 0 && (
        <View style={styles.chipsSection}>
          <View style={styles.chipsSectionHeader}>
            <Clock size={12} color={Colors.textSecondary} />
            <Text style={styles.chipsSectionTitle}>Recent Searches</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsScroll}
          >
            {recentSearches.slice(0, 8).map((search) => (
              <Pressable
                key={search.query}
                style={styles.chip}
                onPress={() => {
                  hapticLight();
                  onSelect(search.query);
                }}
              >
                <Text style={styles.chipText}>{search.query}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Trending */}
      {trendingTerms.length > 0 && (
        <View style={styles.chipsSection}>
          <View style={styles.chipsSectionHeader}>
            <TrendingUp size={12} color={Colors.secondary} />
            <Text style={styles.chipsSectionTitle}>Your Top Searches</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsScroll}
          >
            {trendingTerms.slice(0, 6).map((term) => (
              <Pressable
                key={term.term}
                style={[styles.chip, styles.chipTrending]}
                onPress={() => {
                  hapticLight();
                  onSelect(term.term);
                }}
              >
                <Text style={[styles.chipText, styles.chipTextTrending]}>
                  {term.term}
                </Text>
                <Text style={styles.chipCount}>{term.count}x</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
    </Animated.View>
  );
});

// ---------------------------------------------------------------------------
// Multi-Select Bottom Bar
// ---------------------------------------------------------------------------

const MultiSelectBar = memo(function MultiSelectBar({ count, totalCalories, onAddAll, onClear }) {
  if (count === 0) return null;

  return (
    <Animated.View entering={FadeInDown.duration(200)} style={styles.multiSelectBar}>
      <View>
        <Text style={styles.multiSelectCount}>{count} selected</Text>
        {totalCalories > 0 && (
          <Text style={styles.multiSelectCalories}>{totalCalories} kcal total</Text>
        )}
      </View>
      <View style={styles.multiSelectActions}>
        <Pressable style={styles.multiSelectClearBtn} onPress={onClear}>
          <Text style={styles.multiSelectClearText}>Clear</Text>
        </Pressable>
        <Pressable style={styles.multiSelectAddBtn} onPress={onAddAll}>
          <Check size={16} color="#fff" />
          <Text style={styles.multiSelectAddText}>Add All ({totalCalories > 0 ? `${totalCalories} cal` : count})</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
});

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function SmartFoodSearch({
  onSelectFood,
  onQuickAdd,
  onAddMultiple,
  onOpenScanner,
  onOpenCamera,
  onOpenVoice,
  onOpenMealTemplate,
  selectedMeal = 'breakfast',
}) {
  const {
    query,
    setQuery,
    isSearching,
    isTyping,
    error,
    activeFilter,
    setActiveFilter,
    multiSelectMode,
    setMultiSelectMode,
    selectedItems,
    toggleSelection,
    clearSelection,
    results,
    sections,
    sources,
    recentSearches,
    trendingTerms,
  } = useSmartSearch();

  const [showFilters, setShowFilters] = useState(false);

  // Build SectionList data
  const sectionData = useMemo(() => {
    if (query.length < 2) return [];

    const data = [];

    if (sections.favorites.length > 0) {
      data.push({ title: 'Favorites', data: sections.favorites });
    }
    if (sections.frequent.length > 0) {
      data.push({ title: 'Frequent', data: sections.frequent });
    }
    if (sections.restaurant.length > 0) {
      data.push({ title: 'Restaurant', data: sections.restaurant });
    }
    if (sections.database.length > 0) {
      data.push({ title: 'Results', data: sections.database });
    }

    return data;
  }, [query, sections]);

  // Total source info
  const sourceInfo = useMemo(() => {
    const parts = [];
    if (sources.local > 0) parts.push('local');
    if (sources.usda > 0) parts.push('USDA');
    if (sources.fatSecret > 0) parts.push('FatSecret');
    if (sources.openFoodFacts > 0) parts.push('OpenFoodFacts');
    if (sources.nutritionix > 0) parts.push('Nutritionix');
    return parts.join(' + ');
  }, [sources]);

  const handleSelectItem = useCallback(
    (item) => {
      if (multiSelectMode) {
        toggleSelection(item);
      } else {
        onSelectFood?.(item);
      }
    },
    [multiSelectMode, toggleSelection, onSelectFood],
  );

  const handleQuickAddItem = useCallback(
    (item) => {
      if (multiSelectMode) {
        toggleSelection(item);
      } else {
        onQuickAdd?.(item);
      }
    },
    [multiSelectMode, toggleSelection, onQuickAdd],
  );

  const handleAddAllSelected = useCallback(() => {
    if (selectedItems.length > 0) {
      onAddMultiple?.(selectedItems, selectedMeal);
      clearSelection();
      setMultiSelectMode(false);
    }
  }, [selectedItems, selectedMeal, onAddMultiple, clearSelection, setMultiSelectMode]);

  const handleChipSelect = useCallback(
    (term) => {
      setQuery(term);
      Keyboard.dismiss();
    },
    [setQuery],
  );

  const renderItem = useCallback(
    ({ item, index }) => {
      const isSelected = selectedItems.some((s) => s.barcode === item.barcode);
      return (
        <SearchResultItem
          item={item}
          index={index}
          onPress={handleSelectItem}
          onQuickAdd={handleQuickAddItem}
          isSelected={isSelected}
          multiSelectMode={multiSelectMode}
        />
      );
    },
    [handleSelectItem, handleQuickAddItem, selectedItems, multiSelectMode],
  );

  const renderSectionHeader = useCallback(
    ({ section }) => (
      <SectionHeader title={section.title} count={section.data.length} />
    ),
    [],
  );

  const keyExtractor = useCallback((item) => item.barcode || item.name, []);

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchBar}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color={Colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search foods, brands, restaurants..."
            placeholderTextColor={Colors.textTertiary}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            autoCorrect={false}
            maxLength={200}
          />
          {query.length > 0 && (
            <Pressable
              onPress={() => {
                setQuery('');
                Keyboard.dismiss();
              }}
              hitSlop={8}
            >
              <X size={18} color={Colors.textSecondary} />
            </Pressable>
          )}
        </View>

        {/* Action buttons */}
        {onOpenVoice && (
          <Pressable style={styles.actionButton} onPress={onOpenVoice}>
            <Mic size={20} color={Colors.primary} />
          </Pressable>
        )}
        {onOpenCamera && (
          <Pressable style={[styles.actionButton, styles.cameraButton]} onPress={onOpenCamera}>
            <Camera size={20} color="#fff" />
          </Pressable>
        )}
        {onOpenScanner && (
          <Pressable style={styles.actionButton} onPress={onOpenScanner}>
            <ScanBarcode size={20} color={Colors.primary} />
          </Pressable>
        )}
      </View>

      {/* Filter & Multi-select toggles */}
      <View style={styles.controlsRow}>
        <Pressable
          style={[styles.controlButton, showFilters && styles.controlButtonActive]}
          onPress={() => {
            hapticLight();
            setShowFilters(!showFilters);
          }}
        >
          <Filter size={14} color={showFilters ? Colors.primary : Colors.textSecondary} />
          <Text style={[styles.controlText, showFilters && styles.controlTextActive]}>
            Filters
          </Text>
        </Pressable>

        <Pressable
          style={[styles.controlButton, multiSelectMode && styles.controlButtonActive]}
          onPress={() => {
            hapticLight();
            setMultiSelectMode(!multiSelectMode);
            if (multiSelectMode) clearSelection();
          }}
        >
          <CheckSquare size={14} color={multiSelectMode ? Colors.primary : Colors.textSecondary} />
          <Text style={[styles.controlText, multiSelectMode && styles.controlTextActive]}>
            Multi-Add
          </Text>
        </Pressable>

        {onOpenMealTemplate && (
          <Pressable style={styles.controlButton} onPress={onOpenMealTemplate}>
            <Clock size={14} color={Colors.textSecondary} />
            <Text style={styles.controlText}>Yesterday</Text>
          </Pressable>
        )}
      </View>

      {/* Quick Filters */}
      {showFilters && (
        <FilterPills activeFilter={activeFilter} onSelect={setActiveFilter} />
      )}

      {/* Content */}
      {query.length < 2 ? (
        // Show recent/trending when no query
        <ScrollView style={styles.emptyStateScroll} keyboardShouldPersistTaps="handled">
          <SearchChips
            recentSearches={recentSearches}
            trendingTerms={trendingTerms}
            onSelect={handleChipSelect}
          />
        </ScrollView>
      ) : isTyping || isSearching ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>
            {isTyping ? 'Typing...' : 'Searching 17M+ foods...'}
          </Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : sectionData.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No results found</Text>
          <Text style={styles.emptySubtext}>
            Try a different term, scan a barcode, or snap a photo
          </Text>
        </View>
      ) : (
        <>
          {/* Source info */}
          {sourceInfo && (
            <Text style={styles.sourceInfo}>
              {results.length} results from {sourceInfo}
            </Text>
          )}

          <SectionList
            sections={sectionData}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            renderSectionHeader={renderSectionHeader}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            stickySectionHeadersEnabled={false}
            initialNumToRender={10}
            maxToRenderPerBatch={8}
            windowSize={5}
            removeClippedSubviews={true}
          />
        </>
      )}

      {/* Multi-select bottom bar */}
      {multiSelectMode && (
        <MultiSelectBar
          count={selectedItems.length}
          totalCalories={selectedItems.reduce((sum, item) => sum + (item.calories || 0), 0)}
          onAddAll={handleAddAllSelected}
          onClear={clearSelection}
        />
      )}
    </View>
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

  // Search Bar
  searchBar: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  searchInputContainer: {
    flex: 1,
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
  actionButton: {
    width: 48,
    height: 48,
    backgroundColor: Colors.primary + '20',
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary + '40',
  },
  cameraButton: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },

  // Controls Row
  controlsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  controlButtonActive: {
    borderColor: Colors.primary + '50',
    backgroundColor: Colors.primary + '15',
  },
  controlText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
  },
  controlTextActive: {
    color: Colors.primary,
  },

  // Filter Pills
  filterScroll: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterPillText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
  },

  // Section Headers
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: 4,
  },
  sectionHeaderText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionHeaderCount: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },

  // Result Items
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  resultItemSelected: {
    borderWidth: 1,
    borderColor: Colors.primary + '60',
    backgroundColor: Colors.primary + '10',
  },
  checkboxContainer: {
    marginRight: Spacing.sm,
  },
  resultImage: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceElevated,
  },
  resultImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultImagePlaceholderText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.textTertiary,
  },
  resultInfo: {
    flex: 1,
    marginLeft: Spacing.sm,
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
  macroPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  macroText: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },
  macroDot: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },
  caloriesContainer: {
    alignItems: 'flex-end',
    marginRight: Spacing.sm,
  },
  caloriesValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  caloriesNA: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
  },
  caloriesLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  addButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickAddButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.success,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Search Chips
  chipsSection: {
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  chipsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: Spacing.xs,
  },
  chipsSectionTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipsScroll: {
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipTrending: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderColor: Colors.secondary + '30',
    backgroundColor: Colors.secondary + '10',
  },
  chipText: {
    fontSize: FontSize.sm,
    color: Colors.text,
  },
  chipTextTrending: {
    color: Colors.secondaryText,
  },
  chipCount: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },

  // Multi-select Bar
  multiSelectBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceElevated,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    ...Shadows.card,
  },
  multiSelectCount: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  multiSelectCalories: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Colors.primary,
    marginTop: 2,
  },
  multiSelectActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  multiSelectClearBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
  },
  multiSelectClearText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
  },
  multiSelectAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
  },
  multiSelectAddText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: '#fff',
  },

  // Source Info
  sourceInfo: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.xs,
  },

  // List
  listContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: 120,
  },

  // Empty/Loading/Error states
  emptyStateScroll: {
    flex: 1,
    paddingTop: Spacing.md,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  errorText: {
    fontSize: FontSize.md,
    color: Colors.danger,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxl,
  },
  emptyText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  emptySubtext: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});

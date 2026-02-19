/**
 * useSmartSearch - Manages intelligent food search state
 *
 * Features:
 * - Debounced search (300ms)
 * - Multi-source aggregation
 * - Sectioned results: recent, frequent, favorites, restaurant, database
 * - Search analytics tracking
 * - Quick-add support for frequent items
 * - Persisted search preferences via AsyncStorage
 * - Quick filter support (High Protein, Low Carb, etc.)
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDebounce } from './useDebounce';
import { useFrequentFoods } from './useFrequentFoods';
import { useFavoriteFoods } from './useFavoriteFoods';
import { searchAllSources } from '../services/foodSearch';
import {
  getRecentSearches,
  getTrendingTerms,
  type RecentSearch,
  type TrendingTerm,
} from '../services/foodSearch';
import { foodDatabase } from '../data/foods';
import type { ProductResult } from '../services/openFoodFacts';
import { useIsPremium } from '../context/SubscriptionContext';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type QuickFilter =
  | 'high_protein'
  | 'low_carb'
  | 'low_calorie'
  | 'keto_friendly'
  | null;

export interface SearchSections {
  recent: ProductResult[];
  frequent: ProductResult[];
  favorites: ProductResult[];
  restaurant: ProductResult[];
  database: ProductResult[];
}

export interface SmartSearchState {
  /** Current query text */
  query: string;
  /** Set the query text */
  setQuery: (q: string) => void;
  /** Whether a search is actively running */
  isSearching: boolean;
  /** Whether the user is still typing (debounce pending) */
  isTyping: boolean;
  /** Error message if search failed */
  error: string | null;
  /** Active quick filter */
  activeFilter: QuickFilter;
  /** Set quick filter */
  setActiveFilter: (f: QuickFilter) => void;
  /** Multi-select mode */
  multiSelectMode: boolean;
  /** Toggle multi-select mode */
  setMultiSelectMode: (v: boolean) => void;
  /** Selected items in multi-select mode */
  selectedItems: ProductResult[];
  /** Toggle selection of an item */
  toggleSelection: (item: ProductResult) => void;
  /** Clear all selections */
  clearSelection: () => void;
  /** All search results (combined) */
  results: ProductResult[];
  /** Results organized by section */
  sections: SearchSections;
  /** Source counts from last search */
  sources: { local: number; openFoodFacts: number; usda: number; fatSecret: number; nutritionix: number };
  /** Recent search queries */
  recentSearches: RecentSearch[];
  /** Trending search terms */
  trendingTerms: TrendingTerm[];
  /** Load recent/trending data */
  loadSearchMetadata: () => Promise<void>;
  /** Clear search */
  clearSearch: () => void;
}

// ---------------------------------------------------------------------------
// Search Preferences
// ---------------------------------------------------------------------------

const PREFS_KEY = '@vibefit_search_prefs';

interface SearchPrefs {
  lastFilter: QuickFilter;
  preferMultiSelect: boolean;
}

async function loadPrefs(): Promise<SearchPrefs> {
  try {
    const stored = await AsyncStorage.getItem(PREFS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        lastFilter: parsed.lastFilter || null,
        preferMultiSelect: parsed.preferMultiSelect || false,
      };
    }
  } catch {
    // Silent fail
  }
  return { lastFilter: null, preferMultiSelect: false };
}

async function savePrefs(prefs: Partial<SearchPrefs>): Promise<void> {
  try {
    const current = await loadPrefs();
    await AsyncStorage.setItem(PREFS_KEY, JSON.stringify({ ...current, ...prefs }));
  } catch {
    // Silent fail
  }
}

// ---------------------------------------------------------------------------
// Food Index (bigram-based for local database)
// ---------------------------------------------------------------------------

const FOOD_SEARCH_INDEX = (() => {
  const index = new Map<string, number[]>();
  foodDatabase.forEach((food, i) => {
    const name = food.name.toLowerCase();
    for (let j = 0; j <= name.length - 2; j++) {
      const bigram = name.substring(j, j + 2);
      if (!index.has(bigram)) index.set(bigram, []);
      index.get(bigram)!.push(i);
    }
  });
  return index;
})();

function searchLocalFoods(query: string, limit: number = 10): ProductResult[] {
  const q = query.toLowerCase();
  if (q.length < 2) return [];
  const bigram = q.substring(0, 2);
  const candidates = FOOD_SEARCH_INDEX.get(bigram);
  if (!candidates) return [];

  const results: ProductResult[] = [];
  for (const idx of candidates) {
    const food = foodDatabase[idx];
    if (food.name.toLowerCase().includes(q)) {
      results.push({
        barcode: `local-${food.id}`,
        name: food.name,
        brand: null,
        image: null,
        calories: food.calories,
        protein: food.protein,
        carbs: food.carbs,
        fat: food.fat,
        serving: food.serving,
        servingSize: 1,
        servingUnit: 'serving',
      });
      if (results.length >= limit) break;
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// Quick Filters
// ---------------------------------------------------------------------------

function applyQuickFilter(products: ProductResult[], filter: QuickFilter): ProductResult[] {
  if (!filter) return products;

  switch (filter) {
    case 'high_protein':
      return products.filter((p) => {
        const proteinPct = p.calories > 0 ? ((p.protein || 0) * 4 / p.calories) * 100 : 0;
        return proteinPct >= 30;
      });
    case 'low_carb':
      return products.filter((p) => (p.carbs || 0) <= 15);
    case 'low_calorie':
      return products.filter((p) => (p.calories || 0) <= 200);
    case 'keto_friendly':
      return products.filter((p) => {
        const netCarbs = (p.carbs || 0) - (p.micronutrients?.fiber || 0);
        return netCarbs <= 10 && (p.fat || 0) > 0;
      });
    default:
      return products;
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useSmartSearch(): SmartSearchState {
  const { isPremium } = useIsPremium();
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilterState] = useState<QuickFilter>(null);
  const [multiSelectMode, setMultiSelectModeState] = useState(false);
  const [selectedItems, setSelectedItems] = useState<ProductResult[]>([]);
  const [rawResults, setRawResults] = useState<ProductResult[]>([]);
  const [sources, setSources] = useState({ local: 0, openFoodFacts: 0, usda: 0, fatSecret: 0, nutritionix: 0 });
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [trendingTerms, setTrendingTerms] = useState<TrendingTerm[]>([]);

  const debouncedQuery = useDebounce(query, 300);
  const { getTopFoods, getRecentFoods: getRecentFrequent } = useFrequentFoods();
  const { favorites } = useFavoriteFoods();
  const cancelRef = useRef(false);

  const isTyping = query.length >= 2 && query !== debouncedQuery;

  // Load search preferences on mount
  useEffect(() => {
    loadPrefs().then((prefs) => {
      if (prefs.lastFilter) setActiveFilterState(prefs.lastFilter);
      if (prefs.preferMultiSelect) setMultiSelectModeState(true);
    });
  }, []);

  // Load recent/trending metadata
  const loadSearchMetadata = useCallback(async () => {
    const [recent, trending] = await Promise.all([
      getRecentSearches(10),
      getTrendingTerms(8),
    ]);
    setRecentSearches(recent);
    setTrendingTerms(trending);
  }, []);

  // Load metadata on mount
  useEffect(() => {
    loadSearchMetadata();
  }, [loadSearchMetadata]);

  // Set filter with persistence
  const setActiveFilter = useCallback((filter: QuickFilter) => {
    setActiveFilterState(filter);
    savePrefs({ lastFilter: filter }).catch(() => {});
  }, []);

  // Set multi-select with persistence
  const setMultiSelectMode = useCallback((value: boolean) => {
    setMultiSelectModeState(value);
    savePrefs({ preferMultiSelect: value }).catch(() => {});
  }, []);

  // Toggle item selection
  const toggleSelection = useCallback((item: ProductResult) => {
    setSelectedItems((prev) => {
      const exists = prev.some((p) => p.barcode === item.barcode);
      if (exists) {
        return prev.filter((p) => p.barcode !== item.barcode);
      }
      return [...prev, item];
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedItems([]);
  }, []);

  // Perform search when debounced query changes
  useEffect(() => {
    cancelRef.current = false;

    async function performSearch() {
      if (!debouncedQuery || debouncedQuery.length < 2) {
        setRawResults([]);
        setError(null);
        return;
      }

      setError(null);

      // Phase 1: Show local results instantly
      const localMatches = searchLocalFoods(debouncedQuery, 10);
      if (localMatches.length > 0) {
        setRawResults(localMatches);
      }

      // Phase 2: Fetch all sources in parallel
      setIsSearching(true);

      try {
        const result = await searchAllSources(debouncedQuery, localMatches, 25, 4000, isPremium);
        if (cancelRef.current) return;

        setRawResults(result.products);
        setSources(result.sources);

        // Refresh recent searches after a search completes
        loadSearchMetadata().catch(() => {});
      } catch {
        if (cancelRef.current) return;
        if (localMatches.length === 0) {
          setError('Could not reach food databases. Showing local foods only.');
        }
      } finally {
        if (!cancelRef.current) {
          setIsSearching(false);
        }
      }
    }

    performSearch();

    return () => {
      cancelRef.current = true;
    };
  }, [debouncedQuery, loadSearchMetadata]);

  // Apply filter to results
  const filteredResults = useMemo(() => {
    return applyQuickFilter(rawResults, activeFilter);
  }, [rawResults, activeFilter]);

  // Organize results into sections
  const sections: SearchSections = useMemo(() => {
    // If no query, return empty database section
    if (!debouncedQuery || debouncedQuery.length < 2) {
      return {
        recent: [],
        frequent: [],
        favorites: [],
        restaurant: [],
        database: [],
      };
    }

    const queryLower = debouncedQuery.toLowerCase();

    // Frequent foods matching query
    const topFrequent = getTopFoods(20);
    const frequentMatches: ProductResult[] = topFrequent
      .filter((f: { name: string }) => f.name.toLowerCase().includes(queryLower))
      .slice(0, 5)
      .map((f: { id?: string; name: string; calories: number; protein: number; carbs: number; fat: number; serving?: string }) => ({
        barcode: `freq-${f.id || f.name}`,
        name: f.name,
        brand: null,
        image: null,
        calories: f.calories || 0,
        protein: f.protein || 0,
        carbs: f.carbs || 0,
        fat: f.fat || 0,
        serving: f.serving || '1 serving',
        servingSize: 1,
        servingUnit: 'serving',
      }));

    // Favorites matching query
    const favoriteMatches: ProductResult[] = favorites
      .filter((f) => f.name.toLowerCase().includes(queryLower))
      .slice(0, 5)
      .map((f) => ({
        barcode: `fav-${f.name}`,
        name: f.name,
        brand: null,
        image: null,
        calories: f.calories || 0,
        protein: f.protein || 0,
        carbs: f.carbs || 0,
        fat: f.fat || 0,
        serving: f.serving || '1 serving',
        servingSize: 1,
        servingUnit: 'serving',
      }));

    // Restaurant items (from Nutritionix)
    const restaurantItems = filteredResults.filter(
      (p) => p.barcode?.startsWith('nix-'),
    );

    // Database results (everything else, excluding items already in sections)
    const sectionBarcodes = new Set([
      ...frequentMatches.map((f) => f.barcode),
      ...favoriteMatches.map((f) => f.barcode),
      ...restaurantItems.map((f) => f.barcode),
    ]);

    const databaseItems = filteredResults.filter(
      (p) => !sectionBarcodes.has(p.barcode),
    );

    return {
      recent: [], // Recent searches are tracked separately via recentSearches
      frequent: frequentMatches,
      favorites: favoriteMatches,
      restaurant: restaurantItems,
      database: databaseItems,
    };
  }, [debouncedQuery, filteredResults, getTopFoods, favorites]);

  const clearSearch = useCallback(() => {
    setQuery('');
    setRawResults([]);
    setError(null);
    setSources({ local: 0, openFoodFacts: 0, usda: 0, fatSecret: 0, nutritionix: 0 });
    setSelectedItems([]);
  }, []);

  return {
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
    results: filteredResults,
    sections,
    sources,
    recentSearches,
    trendingTerms,
    loadSearchMetadata,
    clearSearch,
  };
}

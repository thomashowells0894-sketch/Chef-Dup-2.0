/**
 * Unified Multi-Source Food Search (Enhanced)
 *
 * Aggregates results from up to 5 food databases in parallel:
 * - Local database (300+ common foods, instant offline results)
 * - USDA FoodData Central (~400K foods, generic + branded)
 * - Open Food Facts (~3M products, global branded foods)
 * - FatSecret (~13M+ foods, largest global database)
 * - Nutritionix (~900K restaurant/chain items)
 *
 * Combined coverage: ~17M+ unique foods
 *
 * Enhanced features:
 * - Bigram fuzzy matching ("chkn breast" -> "chicken breast")
 * - Smart ranking: relevance + popularity + nutrition completeness
 * - Recent search caching (last 50 searches in AsyncStorage)
 * - Trending search tracking across sessions
 * - Serving size normalization (standard + per-100g)
 * - Nutrition completeness scoring
 * - Improved deduplication with brand normalization
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { searchProductsGlobal, type ProductResult, type SearchResult } from './openFoodFacts';
import { searchUSDA } from './usdaFoodData';
import { searchFatSecret, isFatSecretConfigured } from './fatSecret';
import { searchNutritionix, isNutritionixConfigured } from './nutritionix';
import { searchRestaurantFoods, type RestaurantFoodItem } from '../data/restaurantFoods';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MultiSourceSearchResult extends SearchResult {
  sources: {
    local: number;
    restaurant: number;
    openFoodFacts: number;
    usda: number;
    fatSecret: number;
    nutritionix: number;
  };
}

export interface RecentSearch {
  query: string;
  timestamp: number;
  resultCount: number;
}

export interface TrendingTerm {
  term: string;
  count: number;
  lastSearched: number;
}

export interface NormalizedServing {
  /** Original serving string */
  original: string;
  /** Grams per serving */
  gramsPerServing: number;
  /** Calories per 100g */
  caloriesPer100g: number;
  /** Protein per 100g */
  proteinPer100g: number;
  /** Carbs per 100g */
  carbsPer100g: number;
  /** Fat per 100g */
  fatPer100g: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const RECENT_SEARCHES_KEY = '@vibefit_recent_searches';
const TRENDING_TERMS_KEY = '@vibefit_trending_terms';
const MAX_RECENT_SEARCHES = 50;
const MAX_TRENDING_TERMS = 30;

// Common brand name variations to strip during dedup
const BRAND_STRIP_PATTERNS = [
  /\s*-\s*(original|classic|regular|standard|plain)\s*$/i,
  /\s*,\s*(inc|llc|ltd|co|corp|company)\.?\s*$/i,
  /\s*\b(brand|tm|registered)\b\s*/gi,
];

// Common abbreviation mappings for fuzzy matching
const ABBREVIATION_MAP: Record<string, string> = {
  chkn: 'chicken',
  brst: 'breast',
  grnd: 'ground',
  whl: 'whole',
  org: 'organic',
  nat: 'natural',
  pnt: 'peanut',
  bttr: 'butter',
  choc: 'chocolate',
  strwbry: 'strawberry',
  blubrry: 'blueberry',
  brkfst: 'breakfast',
  sndk: 'sandwich',
  yog: 'yogurt',
  yogrt: 'yogurt',
  avocdo: 'avocado',
  avo: 'avocado',
  broc: 'broccoli',
  cauli: 'cauliflower',
  sw: 'sweet',
  pot: 'potato',
  tom: 'tomato',
  sal: 'salmon',
  tuna: 'tuna',
  turk: 'turkey',
  spag: 'spaghetti',
  oatml: 'oatmeal',
  pb: 'peanut butter',
  oj: 'orange juice',
};

// ---------------------------------------------------------------------------
// Bigram Similarity (Fuzzy Matching)
// ---------------------------------------------------------------------------

/**
 * Generate bigrams (character pairs) from a string.
 * "chicken" -> ["ch", "hi", "ic", "ck", "ke", "en"]
 */
function getBigrams(str: string): Set<string> {
  const s = str.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  const bigrams = new Set<string>();
  for (let i = 0; i < s.length - 1; i++) {
    bigrams.add(s.substring(i, i + 2));
  }
  return bigrams;
}

/**
 * Dice coefficient similarity between two strings using bigrams.
 * Returns 0-1 where 1 is identical.
 */
export function bigramSimilarity(a: string, b: string): number {
  const bigramsA = getBigrams(a);
  const bigramsB = getBigrams(b);
  if (bigramsA.size === 0 || bigramsB.size === 0) return 0;

  let intersection = 0;
  for (const bg of bigramsA) {
    if (bigramsB.has(bg)) intersection++;
  }

  return (2 * intersection) / (bigramsA.size + bigramsB.size);
}

/**
 * Expand abbreviations in a query string.
 * "chkn brst" -> "chicken breast"
 */
export function expandAbbreviations(query: string): string {
  const words = query.toLowerCase().trim().split(/\s+/);
  return words
    .map((w) => ABBREVIATION_MAP[w] || w)
    .join(' ');
}

// ---------------------------------------------------------------------------
// Deduplication (Enhanced)
// ---------------------------------------------------------------------------

/**
 * Normalize a food name for deduplication (enhanced).
 * Strips brand info, common suffixes, lowercases, removes extra whitespace.
 */
function normalizeForDedup(name: string): string {
  let normalized = name
    .toLowerCase()
    .replace(/\s*\(.*?\)\s*/g, '')  // Remove parenthetical brand info
    .replace(/[^a-z0-9\s]/g, '')    // Remove special characters
    .replace(/\s+/g, ' ')           // Collapse whitespace
    .trim();

  // Strip common brand variations
  for (const pattern of BRAND_STRIP_PATTERNS) {
    normalized = normalized.replace(pattern, '');
  }

  // Remove trailing size info like "250g" or "16oz"
  normalized = normalized.replace(/\s+\d+\s*(g|oz|ml|kg|lb|lbs)\s*$/i, '');

  return normalized.trim();
}

/**
 * Check if two product names are duplicates using fuzzy matching.
 * Exact normalized match OR bigram similarity >= 0.85
 */
function isDuplicate(nameA: string, nameB: string): boolean {
  const normA = normalizeForDedup(nameA);
  const normB = normalizeForDedup(nameB);

  if (normA === normB) return true;

  // Only use fuzzy matching for shorter names (long names have many false positives)
  if (normA.length < 40 && normB.length < 40) {
    return bigramSimilarity(normA, normB) >= 0.85;
  }

  return false;
}

// ---------------------------------------------------------------------------
// Smart Ranking
// ---------------------------------------------------------------------------

/**
 * Calculate a nutrition completeness score (0-1).
 * Prefers results with full macro + micronutrient data.
 */
export function nutritionCompletenessScore(product: ProductResult): number {
  let score = 0;
  const maxScore = 8; // 4 macros + 4 key micros

  // Macros (must be present and non-zero for full credit)
  if (product.calories != null && product.calories > 0) score += 1;
  if (product.protein != null && product.protein > 0) score += 1;
  if (product.carbs != null && product.carbs > 0) score += 1;
  if (product.fat != null && product.fat > 0) score += 1;

  // Key micronutrients
  if (product.micronutrients) {
    const m = product.micronutrients;
    if (m.fiber !== undefined) score += 0.5;
    if (m.sugar !== undefined) score += 0.5;
    if (m.sodium !== undefined) score += 0.5;
    if (m.saturated_fat !== undefined) score += 0.5;
    // Bonus for vitamins/minerals
    const microCount = Object.keys(m).length;
    if (microCount > 5) score += 0.5;
    if (microCount > 10) score += 0.5;
  }

  return Math.min(1, score / maxScore);
}

/**
 * Calculate relevance score for a product against a query.
 * Combines name match quality + nutrition completeness + serving data quality.
 */
function calculateRelevanceScore(product: ProductResult, query: string): number {
  const queryLower = query.toLowerCase();
  const nameLower = product.name.toLowerCase();
  let score = 0;

  // Exact name match
  if (nameLower === queryLower) {
    score += 100;
  }
  // Name starts with query
  else if (nameLower.startsWith(queryLower)) {
    score += 80;
  }
  // Name contains query as word boundary
  else if (new RegExp(`\\b${queryLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(nameLower)) {
    score += 60;
  }
  // Name contains query
  else if (nameLower.includes(queryLower)) {
    score += 40;
  }
  // Fuzzy match
  else {
    score += bigramSimilarity(nameLower, queryLower) * 30;
  }

  // Nutrition completeness bonus (0-20 points)
  score += nutritionCompletenessScore(product) * 20;

  // Has image bonus
  if (product.image) score += 5;

  // Has serving size info bonus
  if (product.serving && product.serving !== '100g') score += 3;

  // Has brand info bonus (helps users identify products)
  if (product.brand) score += 2;

  return score;
}

/**
 * Rank products by combined relevance score.
 */
function rankProducts(products: ProductResult[], query: string): ProductResult[] {
  return products
    .map((p) => ({ product: p, score: calculateRelevanceScore(p, query) }))
    .sort((a, b) => b.score - a.score)
    .map((item) => item.product);
}

// ---------------------------------------------------------------------------
// Serving Size Normalization
// ---------------------------------------------------------------------------

/**
 * Normalize a product's nutrition to per-100g values.
 * Returns both original serving info and per-100g values.
 */
export function normalizeServing(product: ProductResult): NormalizedServing {
  const gramsPerServing = product.servingSize || 100;
  const factor = gramsPerServing > 0 ? 100 / gramsPerServing : 1;

  return {
    original: product.serving || '100g',
    gramsPerServing,
    caloriesPer100g: Math.round((product.calories || 0) * factor),
    proteinPer100g: Math.round(((product.protein || 0) * factor) * 10) / 10,
    carbsPer100g: Math.round(((product.carbs || 0) * factor) * 10) / 10,
    fatPer100g: Math.round(((product.fat || 0) * factor) * 10) / 10,
  };
}

// ---------------------------------------------------------------------------
// Recent Searches (AsyncStorage persistence)
// ---------------------------------------------------------------------------

let _recentSearchesCache: RecentSearch[] | null = null;

/**
 * Load recent searches from AsyncStorage.
 */
export async function loadRecentSearches(): Promise<RecentSearch[]> {
  if (_recentSearchesCache) return _recentSearchesCache;

  try {
    const stored = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        _recentSearchesCache = parsed.slice(0, MAX_RECENT_SEARCHES);
        return _recentSearchesCache;
      }
    }
  } catch {
    // Silent fail
  }

  _recentSearchesCache = [];
  return _recentSearchesCache;
}

/**
 * Save a search to recent searches history.
 */
export async function saveRecentSearch(query: string, resultCount: number): Promise<void> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return;

  const recent = await loadRecentSearches();

  // Remove existing entry with same query (case-insensitive)
  const filtered = recent.filter(
    (r) => r.query.toLowerCase() !== trimmed.toLowerCase()
  );

  // Prepend new entry
  const updated: RecentSearch[] = [
    { query: trimmed, timestamp: Date.now(), resultCount },
    ...filtered,
  ].slice(0, MAX_RECENT_SEARCHES);

  _recentSearchesCache = updated;

  try {
    await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  } catch {
    // Silent fail
  }
}

/**
 * Get recent searches (most recent first).
 */
export async function getRecentSearches(limit: number = 10): Promise<RecentSearch[]> {
  const searches = await loadRecentSearches();
  return searches.slice(0, limit);
}

/**
 * Clear all recent searches.
 */
export async function clearRecentSearches(): Promise<void> {
  _recentSearchesCache = [];
  try {
    await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
  } catch {
    // Silent fail
  }
}

// ---------------------------------------------------------------------------
// Trending Searches (Session-aggregated)
// ---------------------------------------------------------------------------

let _trendingCache: TrendingTerm[] | null = null;

/**
 * Load trending search terms.
 */
export async function loadTrendingTerms(): Promise<TrendingTerm[]> {
  if (_trendingCache) return _trendingCache;

  try {
    const stored = await AsyncStorage.getItem(TRENDING_TERMS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        _trendingCache = parsed;
        return _trendingCache;
      }
    }
  } catch {
    // Silent fail
  }

  _trendingCache = [];
  return _trendingCache;
}

/**
 * Track a search term for trending calculation.
 */
export async function trackSearchTerm(query: string): Promise<void> {
  const normalized = query.toLowerCase().trim();
  if (normalized.length < 2) return;

  const terms = await loadTrendingTerms();

  const existing = terms.find((t) => t.term === normalized);
  if (existing) {
    existing.count += 1;
    existing.lastSearched = Date.now();
  } else {
    terms.push({ term: normalized, count: 1, lastSearched: Date.now() });
  }

  // Sort by count descending, keep top N
  terms.sort((a, b) => b.count - a.count);
  const trimmed = terms.slice(0, MAX_TRENDING_TERMS);

  _trendingCache = trimmed;

  try {
    await AsyncStorage.setItem(TRENDING_TERMS_KEY, JSON.stringify(trimmed));
  } catch {
    // Silent fail
  }
}

/**
 * Get top trending search terms.
 */
export async function getTrendingTerms(limit: number = 8): Promise<TrendingTerm[]> {
  const terms = await loadTrendingTerms();
  return terms.slice(0, limit);
}

// ---------------------------------------------------------------------------
// Main Search Function (Enhanced)
// ---------------------------------------------------------------------------

/**
 * Search all configured food sources in parallel and return merged,
 * deduplicated, fuzzy-matched, smart-ranked results.
 *
 * Strategy:
 * 1. Expand abbreviations in query
 * 2. Fire all configured API requests simultaneously
 * 3. Merge results with enhanced deduplication (bigram similarity)
 * 4. Smart-rank by relevance + nutrition completeness
 * 5. Cache search to recent history + track trending
 * 6. Priority: local -> USDA -> FatSecret -> OFP -> Nutritionix
 *
 * @param query - Search terms
 * @param localResults - Pre-computed local database matches
 * @param pageSize - Max results from each API source
 * @param timeoutMs - Per-source timeout
 * @returns Merged results with source counts
 */
export async function searchAllSources(
  query: string,
  localResults: ProductResult[] = [],
  pageSize: number = 25,
  timeoutMs: number = 4000,
  isPremium: boolean = false,
): Promise<MultiSourceSearchResult> {
  const sanitizedQuery = (query || '').trim();
  if (!sanitizedQuery) {
    return {
      products: [],
      count: 0,
      sources: { local: 0, restaurant: 0, openFoodFacts: 0, usda: 0, fatSecret: 0, nutritionix: 0 },
    };
  }

  // Expand abbreviations for better API results
  const expandedQuery = expandAbbreviations(sanitizedQuery);
  const searchQuery = expandedQuery !== sanitizedQuery.toLowerCase()
    ? expandedQuery
    : sanitizedQuery;

  // Build array of search promises -- only include configured sources
  const searchPromises: Promise<SearchResult>[] = [
    searchProductsGlobal(searchQuery, pageSize, timeoutMs),
    searchUSDA(searchQuery, pageSize, timeoutMs),
  ];

  const sourceLabels: string[] = ['openFoodFacts', 'usda'];

  if (isPremium && isFatSecretConfigured()) {
    searchPromises.push(searchFatSecret(searchQuery, pageSize, timeoutMs + 1000));
    sourceLabels.push('fatSecret');
  }

  if (isPremium && isNutritionixConfigured()) {
    searchPromises.push(searchNutritionix(searchQuery, 10, timeoutMs + 1000));
    sourceLabels.push('nutritionix');
  }

  // Fire all API searches in parallel -- each has its own timeout
  const results = await Promise.allSettled(searchPromises);

  // Extract products from each source
  const sourceProducts: Record<string, ProductResult[]> = {};
  const sourceTotalCounts: Record<string, number> = {};

  results.forEach((result, index) => {
    const label = sourceLabels[index];
    if (result.status === 'fulfilled') {
      sourceProducts[label] = result.value.products;
      sourceTotalCounts[label] = result.value.count;
    } else {
      sourceProducts[label] = [];
      sourceTotalCounts[label] = 0;
    }
  });

  // Merge all sources with ENHANCED deduplication (fuzzy matching)
  const combined: ProductResult[] = [];
  const addedNames: string[] = [];

  const addProducts = (products: ProductResult[]): number => {
    let added = 0;
    for (const product of products) {
      // Check against all already-added names for fuzzy duplicates
      const isDup = addedNames.some((existing) => isDuplicate(product.name, existing));
      if (!isDup) {
        addedNames.push(product.name);
        combined.push(product);
        added++;
      }
    }
    return added;
  };

  // Priority order for merging:
  // 1. Local results (instant, user-familiar names)
  const localCount = addProducts(localResults);

  // 2. Restaurant chain results (instant, offline, high relevance)
  const restaurantMatches = searchRestaurantFoods(searchQuery).map(
    (r: RestaurantFoodItem): ProductResult => ({
      barcode: r.id,
      name: `${r.name} (${r.chain})`,
      brand: r.chain,
      image: null,
      calories: r.calories,
      protein: r.protein,
      carbs: r.carbs,
      fat: r.fat,
      serving: r.serving,
      servingSize: r.servingSize,
      servingUnit: r.servingUnit,
    }),
  );
  const restaurantCount = addProducts(restaurantMatches);

  // 3. USDA results (authoritative nutrition data)
  const usdaCount = addProducts(sourceProducts['usda'] || []);

  // 4. FatSecret results (largest database)
  const fatSecretCount = addProducts(sourceProducts['fatSecret'] || []);

  // 5. Open Food Facts results (massive branded catalog)
  const offCount = addProducts(sourceProducts['openFoodFacts'] || []);

  // 6. Nutritionix results (restaurant/chain items)
  const nutritionixCount = addProducts(sourceProducts['nutritionix'] || []);

  // Smart-rank all combined results
  const ranked = rankProducts(combined, sanitizedQuery);

  // Calculate total available across all sources
  const totalCount =
    localResults.length +
    (sourceTotalCounts['openFoodFacts'] || 0) +
    (sourceTotalCounts['usda'] || 0) +
    (sourceTotalCounts['fatSecret'] || 0) +
    (sourceTotalCounts['nutritionix'] || 0);

  // Track search for recent/trending (fire and forget)
  saveRecentSearch(sanitizedQuery, ranked.length).catch(() => {});
  trackSearchTerm(sanitizedQuery).catch(() => {});

  return {
    products: ranked,
    count: totalCount + restaurantCount,
    sources: {
      local: localCount,
      restaurant: restaurantCount,
      openFoodFacts: offCount,
      usda: usdaCount,
      fatSecret: fatSecretCount,
      nutritionix: nutritionixCount,
    },
  };
}

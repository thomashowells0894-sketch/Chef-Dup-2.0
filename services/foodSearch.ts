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
import { Sentry } from '../lib/sentry';
import {
  fetchProductByBarcode,
  searchProductsGlobal,
  type ProductResult,
  type SearchResult,
} from './openFoodFacts';
import { searchUSDA } from './usdaFoodData';
import { searchFatSecret, isFatSecretConfigured } from './fatSecret';
import { searchNutritionix, isNutritionixConfigured } from './nutritionix';
import { searchRestaurantFoods, type RestaurantFoodItem } from '../data/restaurantFoods';
import { QUERY_REWRITES, SEARCH_QUALITY_RULES } from '../data/searchQualityCurations';
import { getCuratedSearchAdjustment } from '../lib/foodSearchCurations';

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

export type SearchConfidenceLevel = 'high' | 'medium' | 'review';

export interface SearchTrustAssessment {
  confidenceScore: number;
  confidenceLevel: SearchConfidenceLevel;
  confidenceReason: string;
  qualityIssues: string[];
  exactNameMatch: boolean;
  exactBrandMatch: boolean;
  exactBarcodeMatch: boolean;
}

const WEIGHT_UNIT_TO_GRAMS: Record<string, number> = {
  g: 1,
  gram: 1,
  grams: 1,
  kg: 1000,
  ml: 1,
  oz: 28.3495,
  ounce: 28.3495,
  ounces: 28.3495,
  lb: 453.592,
  lbs: 453.592,
  pound: 453.592,
  pounds: 453.592,
};

export type FoodSearchSource =
  | 'local'
  | 'restaurant'
  | 'open_food_facts'
  | 'usda'
  | 'fatsecret'
  | 'nutritionix';

interface FoodSourceMetadata {
  label: string;
  qualityTag: ProductResult['qualityTag'];
  qualityLabel: string;
  trustScore: number;
  reportable: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const RECENT_SEARCHES_KEY = '@fueliq_recent_searches';
const TRENDING_TERMS_KEY = '@fueliq_trending_terms';
const MAX_RECENT_SEARCHES = 50;
const MAX_TRENDING_TERMS = 30;
const SOURCE_METADATA: Record<FoodSearchSource, FoodSourceMetadata> = {
  local: {
    label: 'FuelIQ',
    qualityTag: 'curated',
    qualityLabel: 'Curated',
    trustScore: 80,
    reportable: true,
  },
  restaurant: {
    label: 'Restaurant',
    qualityTag: 'restaurant',
    qualityLabel: 'Restaurant',
    trustScore: 72,
    reportable: true,
  },
  open_food_facts: {
    label: 'Open Food Facts',
    qualityTag: 'community',
    qualityLabel: 'Community',
    trustScore: 56,
    reportable: true,
  },
  usda: {
    label: 'USDA',
    qualityTag: 'verified',
    qualityLabel: 'Verified',
    trustScore: 100,
    reportable: true,
  },
  fatsecret: {
    label: 'FatSecret',
    qualityTag: 'community',
    qualityLabel: 'Community',
    trustScore: 64,
    reportable: true,
  },
  nutritionix: {
    label: 'Nutritionix',
    qualityTag: 'verified',
    qualityLabel: 'Verified',
    trustScore: 84,
    reportable: true,
  },
};

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

function normalizeBrand(brand: string | null | undefined): string {
  return (brand || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isDuplicateProduct(a: ProductResult, b: ProductResult): boolean {
  if (!isDuplicate(a.name, b.name)) {
    return false;
  }

  const brandA = normalizeBrand(a.brand);
  const brandB = normalizeBrand(b.brand);
  if (brandA && brandB && brandA !== brandB) {
    return false;
  }

  return true;
}

export function normalizeBarcodeQuery(query: string): string {
  return (query || '').replace(/\D/g, '');
}

export function looksLikeBarcodeQuery(query: string): boolean {
  const digits = normalizeBarcodeQuery(query);
  return digits.length >= 8 && digits.length <= 14;
}

function decorateProduct(product: ProductResult, source: FoodSearchSource): ProductResult {
  const metadata = SOURCE_METADATA[source];
  const nutritionCompleteness = nutritionCompletenessScore(product);
  const normalizedServing = normalizeServing(product);
  const curation = getCuratedSearchAdjustment(product.name, {
    name: product.name,
    brand: product.brand,
    source,
    barcode: product.barcode,
    id: product.canonicalId || product.barcode,
  });
  const trustBonus =
    (product.brand ? 2 : 0) +
    (product.image ? 1 : 0) +
    (normalizedServing.gramsPerServing !== 100 ? 1 : 0) +
    curation.trustBoost;
  const canonicalId = product.canonicalId || curation.profileId || null;
  const resultKind =
    source === 'local' || source === 'usda'
      ? 'canonical'
      : source === 'restaurant'
        ? 'restaurant'
        : product.brand
          ? 'branded'
          : 'canonical';

  return {
    ...product,
    canonicalId,
    source,
    sourceLabel: metadata.label,
    qualityTag: metadata.qualityTag,
    qualityLabel: metadata.qualityLabel,
    trustScore: metadata.trustScore + trustBonus,
    nutritionCompleteness,
    normalizedServing,
    reportable: metadata.reportable,
    resultKind,
  };
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

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeForSearch(value: string | null | undefined): string {
  return (value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function applyQueryRewrite(query: string): string {
  const normalizedQuery = normalizeForSearch(query);
  return QUERY_REWRITES[normalizedQuery] || query;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function stripBrandFromQuery(query: string, normalizedBrand: string): string {
  if (!query || !normalizedBrand) {
    return query;
  }

  return query
    .replace(new RegExp(`\\b${escapeRegex(normalizedBrand)}\\b`, 'g'), ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getComparableProductName(product: ProductResult): string {
  const strippedName = (product.name || '')
    .replace(/\s*\([^)]*\)\s*$/g, ' ')
    .replace(/\s+-\s+.*$/g, ' ');
  return normalizeForSearch(strippedName || product.name);
}

function calculateMacroCalories(product: ProductResult): number {
  return ((product.protein || 0) * 4) + ((product.carbs || 0) * 4) + ((product.fat || 0) * 9);
}

function evaluateProductQuality(product: ProductResult): { qualityIssues: string[]; penalty: number } {
  const qualityIssues: string[] = [];
  let penalty = 0;
  const comparableName = getComparableProductName(product);
  const completeness = product.nutritionCompleteness ?? nutritionCompletenessScore(product);
  const normalizedServing = product.normalizedServing || normalizeServing(product);
  const calories = product.calories || 0;
  const macroCalories = calculateMacroCalories(product);

  if (
    comparableName.length < 3 ||
    /^(food|item|product|unknown|scanned item|test)\b/.test(comparableName)
  ) {
    qualityIssues.push('Generic product name');
    penalty += 22;
  }

  if (calories <= 0) {
    qualityIssues.push('Calories missing or zero');
    penalty += 36;
  }

  if (!product.serving || !product.servingSize || product.servingSize <= 0) {
    qualityIssues.push('Serving data looks weak');
    penalty += 12;
  }

  if (normalizedServing.gramsPerServing < 1 || normalizedServing.gramsPerServing > 2000) {
    if (!qualityIssues.includes('Serving data looks weak')) {
      qualityIssues.push('Serving data looks weak');
    }
    penalty += 10;
  }

  if (
    normalizedServing.caloriesPer100g > 950 ||
    (normalizedServing.caloriesPer100g < 1 && calories > 0)
  ) {
    qualityIssues.push('Nutrition looks implausible');
    penalty += 28;
  }

  if (calories > 0 && macroCalories > 0) {
    const deviation = Math.abs(calories - macroCalories) / Math.max(calories, macroCalories);
    if (deviation > 0.45) {
      qualityIssues.push('Calories do not match macros');
      penalty += 18;
    }
  }

  if (completeness < 0.25) {
    qualityIssues.push('Limited nutrition data');
    penalty += 14;
  }

  return { qualityIssues, penalty };
}

export function assessSearchResultTrust(
  product: ProductResult,
  query: string,
): SearchTrustAssessment {
  const normalizedQuery = normalizeForSearch(expandAbbreviations(query));
  const comparableName = getComparableProductName(product);
  const normalizedName = normalizeForSearch(product.name);
  const normalizedBrand = normalizeBrand(product.brand);
  const queryWithoutBrand = stripBrandFromQuery(normalizedQuery, normalizedBrand);
  const normalizedBarcodeQuery = normalizeBarcodeQuery(query);
  const exactBarcodeMatch =
    Boolean(normalizedBarcodeQuery) &&
    Boolean(product.barcode) &&
    normalizeBarcodeQuery(product.barcode) === normalizedBarcodeQuery;
  const queryForNameMatch = queryWithoutBrand || normalizedQuery;
  const exactNameMatch =
    Boolean(queryForNameMatch) &&
    (comparableName === queryForNameMatch || normalizedName === queryForNameMatch);
  const exactBrandMatch =
    Boolean(normalizedBrand) &&
    Boolean(normalizedQuery) &&
    new RegExp(`\\b${escapeRegex(normalizedBrand)}\\b`).test(normalizedQuery);
  const { qualityIssues, penalty } = evaluateProductQuality(product);
  const completeness = product.nutritionCompleteness ?? nutritionCompletenessScore(product);
  const fuzzyScore = bigramSimilarity(comparableName || normalizedName, queryForNameMatch);
  const queryTokens = queryForNameMatch.split(' ').filter(Boolean);
  const containsAllTokens =
    queryTokens.length > 0 &&
    queryTokens.every((token) => comparableName.includes(token) || normalizedName.includes(token));

  let matchScore = 0;
  let confidenceReason = qualityIssues[0] || 'Review nutrition before logging';

  if (exactBarcodeMatch) {
    matchScore += 70;
    confidenceReason = 'Exact barcode match';
  } else if (exactNameMatch && exactBrandMatch) {
    matchScore += 48;
    confidenceReason = 'Exact brand and name match';
  } else if (exactNameMatch) {
    matchScore += 38;
    confidenceReason = 'Exact name match';
  } else if (exactBrandMatch && containsAllTokens) {
    matchScore += 28;
    confidenceReason = 'Brand-aligned match';
  } else if (comparableName.startsWith(normalizedQuery) || normalizedName.startsWith(normalizedQuery)) {
    matchScore += 22;
    confidenceReason = 'Strong name match';
  } else if (containsAllTokens) {
    matchScore += 16;
    confidenceReason = 'All search terms matched';
  } else if (fuzzyScore >= 0.88) {
    matchScore += 10;
    confidenceReason = 'Strong fuzzy match';
  } else if (fuzzyScore >= 0.72) {
    matchScore += 5;
    confidenceReason = 'Close fuzzy match';
  } else if (product.qualityTag === 'verified') {
    confidenceReason = 'Verified nutrition data';
  } else if (product.qualityTag === 'curated') {
    confidenceReason = 'Curated nutrition data';
  }

  const confidenceScore = clamp(
    (product.trustScore || 50) +
      matchScore +
      (completeness * 18) +
      (product.image ? 4 : 0) +
      (product.brand ? 4 : 0) -
      penalty,
    0,
    100,
  );

  const boundedScore =
    qualityIssues.includes('Nutrition looks implausible') || qualityIssues.includes('Calories missing or zero')
      ? Math.min(confidenceScore, 54)
      : confidenceScore;

  return {
    confidenceScore: boundedScore,
    confidenceLevel:
      boundedScore >= 85 ? 'high' : boundedScore >= 65 ? 'medium' : 'review',
    confidenceReason,
    qualityIssues,
    exactNameMatch,
    exactBrandMatch,
    exactBarcodeMatch,
  };
}

function calculateRelevanceScore(
  product: ProductResult,
  query: string,
  curationAdjustment?: ReturnType<typeof getCuratedSearchAdjustment>,
): number {
  const curation = curationAdjustment || getCuratedSearchAdjustment(query, product);
  const trust = assessSearchResultTrust(
    curationAdjustment
      ? product
      : {
        ...product,
        trustScore: clamp((product.trustScore || 50) + curation.trustBoost, 0, 100),
      },
    query,
  );
  const completeness = product.nutritionCompleteness ?? nutritionCompletenessScore(product);
  const normalizedQuery = normalizeForSearch(expandAbbreviations(query));
  const comparableName = getComparableProductName(product);
  const normalizedBrand = normalizeBrand(product.brand);
  const queryForNameMatch = stripBrandFromQuery(normalizedQuery, normalizedBrand) || normalizedQuery;
  const fuzzyScore = bigramSimilarity(comparableName, queryForNameMatch);
  const queryTerms = queryForNameMatch.split(' ').filter(Boolean);

  let score = trust.confidenceScore + (completeness * 12) + ((product.trustScore || 0) * 0.1);
  score += curation.rankingBoost;

  if (trust.exactBarcodeMatch) score += 220;
  if (trust.exactNameMatch) score += 90;
  if (trust.exactBrandMatch) score += 35;
  if (fuzzyScore >= 0.88) score += 14;
  if (product.image) score += 3;

  SEARCH_QUALITY_RULES.forEach((rule) => {
    const matchesRule =
      rule.queryTerms.length > 0 &&
      rule.queryTerms.every((term) => queryTerms.includes(term));
    if (!matchesRule) {
      return;
    }

    if (rule.preferredSources?.includes(product.source || '')) {
      score += rule.boost;
    }

    if (
      rule.preferredBrands?.some((brand) => normalizedBrand.includes(normalizeBrand(brand)))
    ) {
      score += Math.round(rule.boost * 0.7);
    }

    if (
      rule.preferredNameTerms?.every((term) => comparableName.includes(term))
    ) {
      score += Math.round(rule.boost * 0.55);
    }
  });

  return score;
}

/**
 * Rank products by combined relevance score.
 */
function rankProducts(products: ProductResult[], query: string): ProductResult[] {
  return products
    .map((product) => {
      const curation = getCuratedSearchAdjustment(query, product);
      const adjustedProduct = curation.trustBoost > 0
        ? {
          ...product,
          trustScore: clamp((product.trustScore || 50) + curation.trustBoost, 0, 100),
        }
        : product;
      const trust = assessSearchResultTrust(adjustedProduct, query);
      return {
        product: {
          ...adjustedProduct,
          confidenceScore: trust.confidenceScore,
          confidenceLevel: trust.confidenceLevel,
          confidenceReason: trust.confidenceReason,
          qualityIssues: trust.qualityIssues,
        },
        score: calculateRelevanceScore(adjustedProduct, query, curation),
      };
    })
    .sort((a, b) => b.score - a.score)
    .map((item) => item.product);
}

function shouldReplaceDuplicate(
  existing: ProductResult,
  candidate: ProductResult,
  query: string,
): boolean {
  return calculateRelevanceScore(candidate, query) > calculateRelevanceScore(existing, query);
}

// ---------------------------------------------------------------------------
// Serving Size Normalization
// ---------------------------------------------------------------------------

/**
 * Normalize a product's nutrition to per-100g values.
 * Returns both original serving info and per-100g values.
 */
export function normalizeServing(product: ProductResult): NormalizedServing {
  const servingUnit = (product.servingUnit || '').toLowerCase();
  const servingSize = Number(product.servingSize);
  const unitMultiplier = WEIGHT_UNIT_TO_GRAMS[servingUnit];
  const servingMatch = (product.serving || '').match(
    /(?:^|[\s(])(\d+(?:\.\d+)?)\s*(g|gram|grams|kg|ml|oz|ounce|ounces|lb|lbs|pound|pounds)\b/i,
  );
  const parsedServingWeight = servingMatch
    ? parseFloat(servingMatch[1]) *
      WEIGHT_UNIT_TO_GRAMS[servingMatch[2].toLowerCase()]
    : null;
  const gramsPerServing =
    Number.isFinite(servingSize) && servingSize > 0 && unitMultiplier
      ? servingSize * unitMultiplier
      : parsedServingWeight && parsedServingWeight > 0
        ? Math.round(parsedServingWeight * 10) / 10
        : 100;
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
  } catch (e) {
    Sentry.captureException(e);
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
  } catch (e) {
    Sentry.captureException(e);
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
  } catch (e) {
    Sentry.captureException(e);
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
  } catch (e) {
    Sentry.captureException(e);
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
  } catch (e) {
    Sentry.captureException(e);
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
  const rewrittenQuery = applyQueryRewrite(sanitizedQuery);
  const expandedQuery = expandAbbreviations(rewrittenQuery);
  const searchQuery = expandedQuery !== sanitizedQuery.toLowerCase()
    ? expandedQuery
    : sanitizedQuery;
  const directBarcodeLookup = looksLikeBarcodeQuery(sanitizedQuery)
    ? fetchProductByBarcode(normalizeBarcodeQuery(sanitizedQuery)).catch(() => null)
    : Promise.resolve(null);

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
  const [directBarcodeProduct, results] = await Promise.all([
    directBarcodeLookup,
    Promise.allSettled(searchPromises),
  ]);

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

  const addProducts = (products: ProductResult[]): number => {
    let added = 0;
    for (const product of products) {
      const existingIndex = combined.findIndex((existing) => isDuplicateProduct(existing, product));
      if (existingIndex === -1) {
        combined.push(product);
        added++;
      } else if (shouldReplaceDuplicate(combined[existingIndex], product, sanitizedQuery)) {
        combined[existingIndex] = product;
      }
    }
    return added;
  };

  // Priority order for merging:
  // 1. Local results (instant, user-familiar names)
  const localCount = addProducts(localResults.map((product) => decorateProduct(product, 'local')));

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
  ).map((product) => decorateProduct(product, 'restaurant'));
  const restaurantCount = addProducts(restaurantMatches);

  // 3. Exact barcode lookup result (best possible intent match for numeric queries)
  if (directBarcodeProduct) {
    addProducts([decorateProduct(directBarcodeProduct, 'open_food_facts')]);
  }

  // 4. USDA results (authoritative nutrition data)
  const usdaCount = addProducts(
    (sourceProducts['usda'] || []).map((product) => decorateProduct(product, 'usda'))
  );

  // 5. FatSecret results (largest database)
  const fatSecretCount = addProducts(
    (sourceProducts['fatSecret'] || []).map((product) => decorateProduct(product, 'fatsecret'))
  );

  // 6. Open Food Facts results (massive branded catalog)
  const offCount = addProducts(
    (sourceProducts['openFoodFacts'] || []).map((product) => decorateProduct(product, 'open_food_facts'))
  );

  // 7. Nutritionix results (restaurant/chain items)
  const nutritionixCount = addProducts(
    (sourceProducts['nutritionix'] || []).map((product) => decorateProduct(product, 'nutritionix'))
  );

  // Smart-rank all combined results
  const ranked = rankProducts(combined, searchQuery);

  // Calculate total available across all sources
  const totalCount =
    localResults.length +
    (directBarcodeProduct ? 1 : 0) +
    (sourceTotalCounts['openFoodFacts'] || 0) +
    (sourceTotalCounts['usda'] || 0) +
    (sourceTotalCounts['fatSecret'] || 0) +
    (sourceTotalCounts['nutritionix'] || 0);

  // Track search for recent/trending (fire and forget)
  saveRecentSearch(sanitizedQuery, ranked.length).catch((e) => { if (__DEV__) console.warn('[foodSearch] Failed to save recent search:', e); });
  trackSearchTerm(sanitizedQuery).catch((e) => { if (__DEV__) console.warn('[foodSearch] Failed to track search term:', e); });

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

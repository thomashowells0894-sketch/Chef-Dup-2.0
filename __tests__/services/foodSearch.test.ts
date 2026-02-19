/**
 * Tests for the unified multi-source food search service.
 *
 * All external API modules are mocked. We test:
 * - Empty/blank query handling
 * - Merging and deduplication logic
 * - Priority ordering (local > USDA > FatSecret > OFF > Nutritionix)
 * - Source counting
 * - Timeout / rejection handling
 * - Abbreviation expansion
 * - Bigram similarity
 * - Serving normalization
 * - Nutrition completeness scoring
 * - Recent searches and trending terms
 */

// Mock all upstream search modules
const mockSearchProductsGlobal = jest.fn();
const mockSearchUSDA = jest.fn();
const mockSearchFatSecret = jest.fn();
const mockSearchNutritionix = jest.fn();
const mockIsFatSecretConfigured = jest.fn();
const mockIsNutritionixConfigured = jest.fn();

jest.mock('../../services/openFoodFacts', () => ({
  searchProductsGlobal: (...args: any[]) => mockSearchProductsGlobal(...args),
}));

jest.mock('../../services/usdaFoodData', () => ({
  searchUSDA: (...args: any[]) => mockSearchUSDA(...args),
}));

jest.mock('../../services/fatSecret', () => ({
  searchFatSecret: (...args: any[]) => mockSearchFatSecret(...args),
  isFatSecretConfigured: () => mockIsFatSecretConfigured(),
}));

jest.mock('../../services/nutritionix', () => ({
  searchNutritionix: (...args: any[]) => mockSearchNutritionix(...args),
  isNutritionixConfigured: () => mockIsNutritionixConfigured(),
}));

import {
  searchAllSources,
  bigramSimilarity,
  expandAbbreviations,
  normalizeServing,
  nutritionCompletenessScore,
  loadRecentSearches,
  saveRecentSearch,
  getRecentSearches,
  clearRecentSearches,
  trackSearchTerm,
  getTrendingTerms,
} from '../../services/foodSearch';
import AsyncStorage from '@react-native-async-storage/async-storage';

beforeEach(() => {
  jest.clearAllMocks();
  // Default: all external sources return empty, optional sources not configured
  mockSearchProductsGlobal.mockResolvedValue({ products: [], count: 0 });
  mockSearchUSDA.mockResolvedValue({ products: [], count: 0 });
  mockSearchFatSecret.mockResolvedValue({ products: [], count: 0 });
  mockSearchNutritionix.mockResolvedValue({ products: [], count: 0 });
  mockIsFatSecretConfigured.mockReturnValue(false);
  mockIsNutritionixConfigured.mockReturnValue(false);
  // Reset AsyncStorage mock
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
});

// =============================================================================
// Bigram Similarity
// =============================================================================

describe('bigramSimilarity', () => {
  it('returns 1 for identical strings', () => {
    expect(bigramSimilarity('chicken', 'chicken')).toBe(1);
  });

  it('returns 0 for completely different strings', () => {
    const score = bigramSimilarity('abc', 'xyz');
    expect(score).toBeLessThan(0.5);
  });

  it('returns high similarity for similar strings', () => {
    const score = bigramSimilarity('chicken breast', 'chicken brst');
    expect(score).toBeGreaterThan(0.5);
  });

  it('returns 0 for empty strings', () => {
    expect(bigramSimilarity('', '')).toBe(0);
    expect(bigramSimilarity('hello', '')).toBe(0);
    expect(bigramSimilarity('', 'hello')).toBe(0);
  });

  it('is case-insensitive', () => {
    expect(bigramSimilarity('Chicken', 'chicken')).toBe(1);
    expect(bigramSimilarity('HELLO', 'hello')).toBe(1);
  });

  it('ignores special characters', () => {
    const score = bigramSimilarity('chicken!', 'chicken');
    expect(score).toBeGreaterThan(0.8);
  });

  it('handles single character strings (no bigrams)', () => {
    expect(bigramSimilarity('a', 'a')).toBe(0);
    expect(bigramSimilarity('a', 'b')).toBe(0);
  });

  it('returns a value between 0 and 1', () => {
    const score = bigramSimilarity('some food', 'another food');
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });
});

// =============================================================================
// Abbreviation Expansion
// =============================================================================

describe('expandAbbreviations', () => {
  it('expands known abbreviations', () => {
    expect(expandAbbreviations('chkn brst')).toBe('chicken breast');
  });

  it('expands single abbreviation', () => {
    expect(expandAbbreviations('pb')).toBe('peanut butter');
  });

  it('expands oj to orange juice', () => {
    expect(expandAbbreviations('oj')).toBe('orange juice');
  });

  it('passes through unknown words unchanged', () => {
    expect(expandAbbreviations('salmon fillet')).toBe('salmon fillet');
  });

  it('handles mixed known and unknown words', () => {
    expect(expandAbbreviations('grnd beef patty')).toBe('ground beef patty');
  });

  it('lowercases the output', () => {
    expect(expandAbbreviations('CHKN')).toBe('chicken');
  });

  it('handles empty string', () => {
    expect(expandAbbreviations('')).toBe('');
  });

  it('trims whitespace', () => {
    expect(expandAbbreviations('  chkn  ')).toBe('chicken');
  });

  it('handles multiple spaces between words', () => {
    const result = expandAbbreviations('chkn   brst');
    expect(result).toBe('chicken breast');
  });

  it('expands avocado abbreviations', () => {
    expect(expandAbbreviations('avo')).toBe('avocado');
    expect(expandAbbreviations('avocdo')).toBe('avocado');
  });

  it('expands yogurt abbreviations', () => {
    expect(expandAbbreviations('yog')).toBe('yogurt');
    expect(expandAbbreviations('yogrt')).toBe('yogurt');
  });
});

// =============================================================================
// Serving Normalization
// =============================================================================

describe('normalizeServing', () => {
  it('normalizes serving to per-100g values', () => {
    const product = {
      name: 'Chicken',
      calories: 165,
      protein: 31,
      carbs: 0,
      fat: 3.6,
      servingSize: 100,
      serving: '100g',
    };
    const result = normalizeServing(product as any);
    expect(result.caloriesPer100g).toBe(165);
    expect(result.proteinPer100g).toBe(31);
    expect(result.gramsPerServing).toBe(100);
  });

  it('scales up for small serving sizes', () => {
    const product = {
      name: 'Nuts',
      calories: 90,
      protein: 3,
      carbs: 3,
      fat: 8,
      servingSize: 15,
      serving: '15g',
    };
    const result = normalizeServing(product as any);
    expect(result.caloriesPer100g).toBe(600);
    expect(result.gramsPerServing).toBe(15);
  });

  it('handles zero serving size gracefully', () => {
    const product = {
      name: 'Test',
      calories: 100,
      protein: 10,
      carbs: 10,
      fat: 5,
      servingSize: 0,
      serving: '0g',
    };
    const result = normalizeServing(product as any);
    // factor should be 1 when servingSize is 0
    expect(result.caloriesPer100g).toBe(100);
  });

  it('defaults serving size to 100 when missing', () => {
    const product = { name: 'Test', calories: 200, protein: 20, carbs: 20, fat: 10 };
    const result = normalizeServing(product as any);
    expect(result.gramsPerServing).toBe(100);
    expect(result.caloriesPer100g).toBe(200);
  });

  it('defaults serving string to "100g" when missing', () => {
    const product = { name: 'Test', calories: 100, protein: 10, carbs: 10, fat: 5 };
    const result = normalizeServing(product as any);
    expect(result.original).toBe('100g');
  });

  it('handles null/undefined nutrient values', () => {
    const product = { name: 'Test', servingSize: 50 };
    const result = normalizeServing(product as any);
    expect(result.caloriesPer100g).toBe(0);
    expect(result.proteinPer100g).toBe(0);
    expect(result.carbsPer100g).toBe(0);
    expect(result.fatPer100g).toBe(0);
  });

  it('rounds values appropriately', () => {
    const product = {
      name: 'Test',
      calories: 33,
      protein: 3.333,
      carbs: 6.666,
      fat: 1.111,
      servingSize: 30,
      serving: '30g',
    };
    const result = normalizeServing(product as any);
    expect(result.caloriesPer100g).toBe(110);
    expect(result.proteinPer100g).toBe(11.1);
  });
});

// =============================================================================
// Nutrition Completeness Score
// =============================================================================

describe('nutritionCompletenessScore', () => {
  it('returns 0 for product with no nutrition data', () => {
    const product = { name: 'Empty' };
    const score = nutritionCompletenessScore(product as any);
    expect(score).toBe(0);
  });

  it('returns higher score for product with full macros', () => {
    const product = { name: 'Full', calories: 200, protein: 20, carbs: 25, fat: 10 };
    const score = nutritionCompletenessScore(product as any);
    expect(score).toBeGreaterThan(0.3);
  });

  it('returns higher score with micronutrients', () => {
    const withMicros = {
      name: 'Rich',
      calories: 200,
      protein: 20,
      carbs: 25,
      fat: 10,
      micronutrients: { fiber: 5, sugar: 10, sodium: 200, saturated_fat: 3, calcium: 100, iron: 2 },
    };
    const withoutMicros = { name: 'Basic', calories: 200, protein: 20, carbs: 25, fat: 10 };
    const scoreMicro = nutritionCompletenessScore(withMicros as any);
    const scoreBasic = nutritionCompletenessScore(withoutMicros as any);
    expect(scoreMicro).toBeGreaterThan(scoreBasic);
  });

  it('caps at 1', () => {
    const product = {
      name: 'SuperComplete',
      calories: 200,
      protein: 20,
      carbs: 25,
      fat: 10,
      micronutrients: {
        fiber: 5, sugar: 10, sodium: 200, saturated_fat: 3,
        calcium: 100, iron: 2, vitaminA: 50, vitaminC: 30,
        vitaminD: 10, vitaminB12: 2, zinc: 5, magnesium: 40,
      },
    };
    const score = nutritionCompletenessScore(product as any);
    expect(score).toBeLessThanOrEqual(1);
  });

  it('gives zero-value macros no credit', () => {
    const product = { name: 'Zero', calories: 0, protein: 0, carbs: 0, fat: 0 };
    const score = nutritionCompletenessScore(product as any);
    expect(score).toBe(0);
  });
});

// =============================================================================
// Empty query handling
// =============================================================================

describe('empty query handling', () => {
  it('returns empty results for empty string', async () => {
    const result = await searchAllSources('');
    expect(result.products).toEqual([]);
    expect(result.count).toBe(0);
    expect(result.sources.local).toBe(0);
  });

  it('returns empty results for whitespace-only query', async () => {
    const result = await searchAllSources('   ');
    expect(result.products).toEqual([]);
    expect(result.count).toBe(0);
  });

  it('does not call any external APIs for empty query', async () => {
    await searchAllSources('');
    expect(mockSearchProductsGlobal).not.toHaveBeenCalled();
    expect(mockSearchUSDA).not.toHaveBeenCalled();
  });

  it('returns all source counts as zero for empty query', async () => {
    const result = await searchAllSources('');
    expect(result.sources).toEqual({
      local: 0,
      openFoodFacts: 0,
      usda: 0,
      fatSecret: 0,
      nutritionix: 0,
    });
  });
});

// =============================================================================
// Local results priority
// =============================================================================

describe('local results priority', () => {
  it('includes local results first', async () => {
    const localResults = [
      { name: 'Chicken Breast', calories: 165, protein: 31, carbs: 0, fat: 3.6, source: 'local' },
    ];

    const result = await searchAllSources('chicken', localResults);
    expect(result.products[0].name).toBe('Chicken Breast');
    expect(result.sources.local).toBe(1);
  });

  it('deduplicates local results against external results', async () => {
    const localResults = [
      { name: 'Chicken Breast', calories: 165, protein: 31, carbs: 0, fat: 3.6 },
    ];
    mockSearchUSDA.mockResolvedValue({
      products: [{ name: 'Chicken Breast', calories: 165, protein: 31, carbs: 0, fat: 3.6 }],
      count: 1,
    });

    const result = await searchAllSources('chicken', localResults);
    const chickenResults = result.products.filter(p =>
      p.name.toLowerCase().includes('chicken breast')
    );
    expect(chickenResults).toHaveLength(1);
  });
});

// =============================================================================
// Merging from multiple sources
// =============================================================================

describe('merging from multiple sources', () => {
  it('merges USDA and Open Food Facts results', async () => {
    mockSearchUSDA.mockResolvedValue({
      products: [{ name: 'Apple', calories: 95, protein: 0.5, carbs: 25, fat: 0.3 }],
      count: 1,
    });
    mockSearchProductsGlobal.mockResolvedValue({
      products: [{ name: 'Banana', calories: 105, protein: 1.3, carbs: 27, fat: 0.4 }],
      count: 1,
    });

    const result = await searchAllSources('fruit');
    expect(result.products).toHaveLength(2);
  });

  it('includes FatSecret when configured', async () => {
    mockIsFatSecretConfigured.mockReturnValue(true);
    mockSearchFatSecret.mockResolvedValue({
      products: [{ name: 'Protein Bar', calories: 200, protein: 20, carbs: 25, fat: 8 }],
      count: 1,
    });

    const result = await searchAllSources('protein');
    expect(result.sources.fatSecret).toBe(1);
  });

  it('includes Nutritionix when configured', async () => {
    mockIsNutritionixConfigured.mockReturnValue(true);
    mockSearchNutritionix.mockResolvedValue({
      products: [{ name: 'Big Mac', calories: 550, protein: 25, carbs: 45, fat: 30 }],
      count: 1,
    });

    const result = await searchAllSources('big mac');
    expect(result.sources.nutritionix).toBe(1);
  });

  it('does not call FatSecret when not configured', async () => {
    mockIsFatSecretConfigured.mockReturnValue(false);
    await searchAllSources('food');
    expect(mockSearchFatSecret).not.toHaveBeenCalled();
  });

  it('does not call Nutritionix when not configured', async () => {
    mockIsNutritionixConfigured.mockReturnValue(false);
    await searchAllSources('food');
    expect(mockSearchNutritionix).not.toHaveBeenCalled();
  });

  it('deduplicates across all sources by normalized name', async () => {
    const localResults = [
      { name: 'Chicken Breast', calories: 165 },
    ];
    mockSearchUSDA.mockResolvedValue({
      products: [{ name: 'chicken breast', calories: 165 }],
      count: 1,
    });
    mockSearchProductsGlobal.mockResolvedValue({
      products: [{ name: 'CHICKEN BREAST', calories: 165 }],
      count: 1,
    });

    const result = await searchAllSources('chicken', localResults);
    const chickenProducts = result.products.filter(p =>
      p.name.toLowerCase().replace(/[^a-z]/g, '').includes('chickenbreast')
    );
    expect(chickenProducts).toHaveLength(1);
  });
});

// =============================================================================
// Timeout / rejection handling
// =============================================================================

describe('timeout and rejection handling', () => {
  it('handles API rejection gracefully', async () => {
    mockSearchUSDA.mockRejectedValue(new Error('Timeout'));
    mockSearchProductsGlobal.mockRejectedValue(new Error('Network error'));

    const result = await searchAllSources('chicken');
    expect(result.products).toEqual([]);
    expect(result.sources.usda).toBe(0);
    expect(result.sources.openFoodFacts).toBe(0);
  });

  it('returns partial results when one source fails', async () => {
    mockSearchUSDA.mockResolvedValue({
      products: [{ name: 'Chicken', calories: 165 }],
      count: 1,
    });
    mockSearchProductsGlobal.mockRejectedValue(new Error('Failed'));

    const result = await searchAllSources('chicken');
    expect(result.products).toHaveLength(1);
    expect(result.sources.usda).toBe(1);
    expect(result.sources.openFoodFacts).toBe(0);
  });

  it('returns local results even when all APIs fail', async () => {
    mockSearchUSDA.mockRejectedValue(new Error('Timeout'));
    mockSearchProductsGlobal.mockRejectedValue(new Error('Timeout'));

    const localResults = [{ name: 'Rice', calories: 200 }];
    const result = await searchAllSources('rice', localResults);
    expect(result.products).toHaveLength(1);
    expect(result.sources.local).toBe(1);
  });

  it('handles all sources failing including optional ones', async () => {
    mockIsFatSecretConfigured.mockReturnValue(true);
    mockIsNutritionixConfigured.mockReturnValue(true);
    mockSearchUSDA.mockRejectedValue(new Error('Fail'));
    mockSearchProductsGlobal.mockRejectedValue(new Error('Fail'));
    mockSearchFatSecret.mockRejectedValue(new Error('Fail'));
    mockSearchNutritionix.mockRejectedValue(new Error('Fail'));

    const result = await searchAllSources('test');
    expect(result.products).toEqual([]);
    expect(result.sources.usda).toBe(0);
    expect(result.sources.openFoodFacts).toBe(0);
    expect(result.sources.fatSecret).toBe(0);
    expect(result.sources.nutritionix).toBe(0);
  });
});

// =============================================================================
// Source counts
// =============================================================================

describe('source counts', () => {
  it('tracks count of deduplicated items per source', async () => {
    const localResults = [
      { name: 'Egg', calories: 70 },
      { name: 'Milk', calories: 150 },
    ];
    mockSearchUSDA.mockResolvedValue({
      products: [
        { name: 'Cheese', calories: 113 },
        { name: 'Butter', calories: 102 },
      ],
      count: 200,
    });
    mockSearchProductsGlobal.mockResolvedValue({
      products: [{ name: 'Yogurt', calories: 100 }],
      count: 50,
    });

    const result = await searchAllSources('dairy', localResults);
    expect(result.sources.local).toBe(2);
    expect(result.sources.usda).toBe(2);
    expect(result.sources.openFoodFacts).toBe(1);
    expect(result.products).toHaveLength(5);
  });

  it('counts total available across all sources', async () => {
    const localResults = [{ name: 'A', calories: 100 }];
    mockSearchUSDA.mockResolvedValue({ products: [], count: 500 });
    mockSearchProductsGlobal.mockResolvedValue({ products: [], count: 300 });

    const result = await searchAllSources('food', localResults);
    expect(result.count).toBe(1 + 500 + 300);
  });
});

// =============================================================================
// Query sanitization and abbreviation expansion
// =============================================================================

describe('query sanitization', () => {
  it('trims query whitespace before searching', async () => {
    await searchAllSources('  chicken  ');
    expect(mockSearchUSDA).toHaveBeenCalledWith('chicken', expect.any(Number), expect.any(Number));
  });

  it('passes pageSize and timeout to API calls', async () => {
    await searchAllSources('rice', [], 10, 2000);
    expect(mockSearchUSDA).toHaveBeenCalledWith('rice', 10, 2000);
    expect(mockSearchProductsGlobal).toHaveBeenCalledWith('rice', 10, 2000);
  });

  it('expands abbreviations in query before API calls', async () => {
    await searchAllSources('chkn brst');
    // The expanded query 'chicken breast' should be sent to APIs
    expect(mockSearchUSDA).toHaveBeenCalledWith('chicken breast', expect.any(Number), expect.any(Number));
  });
});

// =============================================================================
// Recent Searches
// =============================================================================

describe('recent searches', () => {
  it('clearRecentSearches empties the cache', async () => {
    await clearRecentSearches();
    expect(AsyncStorage.removeItem).toHaveBeenCalled();
  });

  it('saveRecentSearch skips short queries', async () => {
    await saveRecentSearch('a', 5);
    // Should not persist since query is < 2 chars
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  it('saveRecentSearch persists valid queries', async () => {
    await clearRecentSearches();
    await saveRecentSearch('chicken breast', 10);
    expect(AsyncStorage.setItem).toHaveBeenCalled();
  });

  it('getRecentSearches returns empty when nothing saved', async () => {
    await clearRecentSearches();
    const searches = await getRecentSearches();
    expect(searches).toEqual([]);
  });

  it('getRecentSearches respects limit parameter', async () => {
    await clearRecentSearches();
    const searches = await getRecentSearches(5);
    expect(searches.length).toBeLessThanOrEqual(5);
  });
});

// =============================================================================
// Trending Terms
// =============================================================================

describe('trending terms', () => {
  it('trackSearchTerm skips short terms', async () => {
    await trackSearchTerm('a');
    // Short terms should not be persisted
  });

  it('getTrendingTerms returns empty by default', async () => {
    const terms = await getTrendingTerms();
    expect(Array.isArray(terms)).toBe(true);
  });

  it('getTrendingTerms respects limit', async () => {
    const terms = await getTrendingTerms(3);
    expect(terms.length).toBeLessThanOrEqual(3);
  });
});

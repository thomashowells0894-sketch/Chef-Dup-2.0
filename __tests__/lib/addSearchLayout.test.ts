import {
  buildFoodSearchScrollResetKey,
  FOOD_SEARCH_MIN_QUERY_LENGTH,
  buildFoodSearchSections,
  getFoodSearchPresentationState,
  getVisibleFoodSearchResults,
  getVisibleFoodSearchSources,
  shouldRunFoodSearch,
  shouldUseActiveFoodSearchLayout,
} from '../../lib/addSearchLayout';

const EMPTY_SOURCES = {
  local: 0,
  restaurant: 0,
  openFoodFacts: 0,
  usda: 0,
  fatSecret: 0,
  nutritionix: 0,
};

describe('addSearchLayout helpers', () => {
  it('switches the add screen into active food search mode on the first typed character', () => {
    expect(shouldUseActiveFoodSearchLayout('food', 'e')).toBe(true);
    expect(shouldUseActiveFoodSearchLayout('food', '   ')).toBe(false);
    expect(shouldUseActiveFoodSearchLayout('exercise', 'eggs')).toBe(false);
  });

  it('keeps current-query local matches visible while the debounced search is still typing', () => {
    const staleSettledResults = [{ id: 'banana', name: 'Banana' }];
    const instantLocalMatches = [{ id: 'eggs', name: 'Eggs' }];

    expect(getVisibleFoodSearchResults({
      query: 'eggs',
      isTyping: true,
      instantLocalMatches,
      settledResults: staleSettledResults,
    })).toEqual(instantLocalMatches);

    expect(getVisibleFoodSearchResults({
      query: 'eggs',
      isTyping: false,
      instantLocalMatches,
      settledResults: staleSettledResults,
    })).toEqual(staleSettledResults);
  });

  it('does not expose search results or source badges before the minimum query length', () => {
    expect(shouldRunFoodSearch('e')).toBe(false);
    expect(shouldRunFoodSearch('eg')).toBe(true);
    expect(FOOD_SEARCH_MIN_QUERY_LENGTH).toBe(2);

    expect(getVisibleFoodSearchResults({
      query: 'e',
      isTyping: true,
      instantLocalMatches: [{ id: 'eggs' }],
      settledResults: [{ id: 'banana' }],
    })).toEqual([]);

    expect(getVisibleFoodSearchSources({
      query: 'e',
      isTyping: true,
      instantLocalMatches: [{ id: 'eggs' }],
      settledSources: { ...EMPTY_SOURCES, local: 1, usda: 3 },
      emptySources: EMPTY_SOURCES,
    })).toEqual(EMPTY_SOURCES);
  });

  it('never returns a blocking loading state when visible food choices already exist', () => {
    expect(getFoodSearchPresentationState({
      query: 'm&s eggs',
      isTyping: true,
      isSearching: true,
      hasVisibleSearchContent: true,
      hasSearchError: false,
    })).toBe('results');

    expect(getFoodSearchPresentationState({
      query: 'm&s eggs',
      isTyping: true,
      isSearching: true,
      hasVisibleSearchContent: false,
      hasSearchError: false,
    })).toBe('loading');

    expect(getFoodSearchPresentationState({
      query: 'e',
      isTyping: false,
      isSearching: false,
      hasVisibleSearchContent: false,
      hasSearchError: false,
    })).toBe('prompt');
  });

  it('builds search sections with best matches first and history/custom sections after', () => {
    const sections = buildFoodSearchSections({
      searchDisplaySections: [
        {
          key: 'best_matches',
          title: 'Best Matches',
          subtitle: 'Closest trusted results',
          items: [{ id: 'eggs', name: 'Eggs' }],
        },
        {
          key: 'more_results',
          title: 'More Results',
          subtitle: 'Broader matches',
          items: [{ id: 'omelette', name: 'Omelette' }],
        },
      ],
      recentFrequentMatches: [{ id: 'saved-eggs', name: 'Saved Eggs' }],
      customSearchMatches: [{ id: 'custom-eggs', name: 'Custom Eggs' }],
      selectedMealLabel: 'Breakfast',
      searchMatchSourcesLabel: 'FuelIQ + USDA',
    });

    expect(sections.map((section) => section.key)).toEqual([
      'best_matches',
      'recent_frequent',
      'more_results',
      'quick_add_custom',
    ]);
    expect(sections[0].subtitle).toContain('FuelIQ + USDA');
    expect(sections[1].subtitle).toContain('breakfast repeats');
  });

  it('builds a distinct scroll reset key for query, meal, and successful add transitions', () => {
    expect(buildFoodSearchScrollResetKey({
      query: 'eggs',
      mealKey: 'breakfast',
      successVersion: 0,
    })).toBe('eggs::breakfast::0');

    expect(buildFoodSearchScrollResetKey({
      query: 'm&s eggs',
      mealKey: 'breakfast',
      successVersion: 0,
    })).toBe('m&s eggs::breakfast::0');

    expect(buildFoodSearchScrollResetKey({
      query: 'm&s eggs',
      mealKey: 'lunch',
      successVersion: 0,
    })).toBe('m&s eggs::lunch::0');

    expect(buildFoodSearchScrollResetKey({
      query: 'm&s eggs',
      mealKey: 'lunch',
      successVersion: 1,
    })).toBe('m&s eggs::lunch::1');
  });
});

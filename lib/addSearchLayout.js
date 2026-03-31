export const FOOD_SEARCH_MIN_QUERY_LENGTH = 2;

function normalizeSearchQuery(query) {
  return String(query || '').trim();
}

export function shouldUseActiveFoodSearchLayout(mode, query) {
  return mode === 'food' && normalizeSearchQuery(query).length > 0;
}

export function shouldRunFoodSearch(query) {
  return normalizeSearchQuery(query).length >= FOOD_SEARCH_MIN_QUERY_LENGTH;
}

export function getVisibleFoodSearchResults({
  query,
  isTyping,
  instantLocalMatches,
  settledResults,
}) {
  if (!shouldRunFoodSearch(query)) {
    return [];
  }

  return isTyping ? instantLocalMatches : settledResults;
}

export function getVisibleFoodSearchSources({
  query,
  isTyping,
  instantLocalMatches,
  settledSources,
  emptySources,
}) {
  if (!shouldRunFoodSearch(query)) {
    return emptySources;
  }

  if (!isTyping) {
    return settledSources;
  }

  return {
    ...emptySources,
    local: Array.isArray(instantLocalMatches) ? instantLocalMatches.length : 0,
  };
}

export function getFoodSearchPresentationState({
  query,
  isTyping,
  isSearching,
  hasVisibleSearchContent,
  hasSearchError,
}) {
  const trimmedQuery = normalizeSearchQuery(query);

  if (trimmedQuery.length === 0) {
    return 'idle';
  }

  if (trimmedQuery.length < FOOD_SEARCH_MIN_QUERY_LENGTH) {
    return 'prompt';
  }

  if (hasVisibleSearchContent) {
    return 'results';
  }

  if (isTyping || isSearching) {
    return 'loading';
  }

  if (hasSearchError) {
    return 'error';
  }

  return 'empty';
}

export function buildFoodSearchSections({
  searchDisplaySections,
  recentFrequentMatches,
  customSearchMatches,
  selectedMealLabel,
  searchMatchSourcesLabel,
}) {
  const sections = [];
  const mealLabel = String(selectedMealLabel || 'meal').toLowerCase();

  (searchDisplaySections || [])
    .filter((section) => section?.key === 'best_matches')
    .forEach((section) => {
      sections.push({
        key: section.key,
        title: section.title,
        subtitle: searchMatchSourcesLabel
          ? `${section.subtitle} · ${searchMatchSourcesLabel}`
          : section.subtitle,
        data: section.items || [],
        actionType: 'search',
        allowsReport: true,
      });
    });

  if ((recentFrequentMatches || []).length > 0) {
    sections.push({
      key: 'recent_frequent',
      title: 'Recent / Frequent',
      subtitle: `Foods and saved meals you've already logged for faster ${mealLabel} repeats`,
      data: recentFrequentMatches,
      actionType: 'history',
      allowsReport: false,
    });
  }

  (searchDisplaySections || [])
    .filter((section) => section?.key === 'more_results')
    .forEach((section) => {
      sections.push({
        key: section.key,
        title: section.title,
        subtitle: section.subtitle,
        data: section.items || [],
        actionType: 'search',
        allowsReport: true,
      });
    });

  if ((customSearchMatches || []).length > 0) {
    sections.push({
      key: 'quick_add_custom',
      title: 'Quick Add / Custom',
      subtitle: 'Manual entry and your saved custom foods when search is not the fastest path',
      data: customSearchMatches,
      actionType: 'history',
      allowsReport: false,
    });
  }

  return sections.filter((section) => Array.isArray(section.data) && section.data.length > 0);
}

export function buildFoodSearchScrollResetKey({
  query,
  mealKey,
  successVersion = 0,
}) {
  return [
    normalizeSearchQuery(query),
    String(mealKey || ''),
    Number.isFinite(successVersion) ? successVersion : 0,
  ].join('::');
}

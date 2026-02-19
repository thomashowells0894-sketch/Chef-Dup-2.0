/**
 * Central performance configuration constants.
 *
 * Import these values instead of hard-coding numbers throughout the codebase
 * so that tuning is a single-file change.
 */

/** Default props for FlatList / OptimizedFlatList instances. */
export const FLATLIST_CONFIG = {
  removeClippedSubviews: true,
  maxToRenderPerBatch: 10,
  windowSize: 5,
  initialNumToRender: 10,
  updateCellsBatchingPeriod: 50,
} as const;

/** Debounce intervals (milliseconds). */
export const DEBOUNCE_MS = {
  search: 300,
  scroll: 100,
  resize: 200,
} as const;

/** Cache time-to-live values (milliseconds). */
export const CACHE_TTL = {
  aiResponse: 5 * 60 * 1000,        // 5 min
  foodSearch: 15 * 60 * 1000,       // 15 min
  userProfile: 30 * 60 * 1000,      // 30 min
  staticData: 24 * 60 * 60 * 1000,  // 24 hours
} as const;

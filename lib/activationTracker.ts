import AsyncStorage from '@react-native-async-storage/async-storage';
import { trackEvent } from './analytics';
import { Sentry } from './sentry';

export type ActivationStage = 'first_meal' | 'first_barcode' | 'repeat_log' | 'complete';

export interface ActivationState {
  onboardingStartedAt: number | null;
  onboardingCompletedAt: number | null;
  firstFoodLoggedAt: number | null;
  secondFoodLoggedAt: number | null;
  firstBarcodeStartedAt: number | null;
  firstBarcodeFoundAt: number | null;
  firstRepeatLogAt: number | null;
  foodLogCount: number;
  hasViewedValuePaywall: boolean;
  lastPaywallViewedAt: number | null;
  lastPaywallSource: string | null;
  lastPaywallTrigger: string | null;
  todayOpenCount: number;
  addOpenCount: number;
  searchStartCount: number;
  searchCompletedCount: number;
  searchResultSelectionCount: number;
  searchAddSuccessCount: number;
  searchReformulationCount: number;
  searchesWithResultsCount: number;
  searchesWithNoResultsCount: number;
  searchCacheHitCount: number;
  totalSearchLatencyMs: number;
  barcodeStartCount: number;
  barcodeFoundCount: number;
  barcodeNotFoundCount: number;
  barcodeCorrectionCount: number;
  totalBarcodeLookupLatencyMs: number;
  paywallViewCount: number;
  paywallConversionCount: number;
}

export interface CoreLoopMetrics {
  timeToFirstLogMs: number | null;
  timeToSecondLogMs: number | null;
  searchSelectionRate: number | null;
  searchSuccessRate: number | null;
  zeroResultRate: number | null;
  cacheHitRate: number | null;
  avgSearchLatencyMs: number | null;
  barcodeSuccessRate: number | null;
  barcodeCorrectionRate: number | null;
  avgBarcodeLookupLatencyMs: number | null;
  paywallConversionRate: number | null;
}

interface SearchStartInput {
  query: string;
  meal?: string | null;
}

interface SearchResultInput {
  meal?: string | null;
  name?: string | null;
  sourceLabel?: string | null;
  confidenceLevel?: string | null;
  quickAdd?: boolean;
}

interface SearchReformulationInput {
  fromQuery: string;
  toQuery: string;
  meal?: string | null;
  previousResultCount?: number;
}

interface SearchCompleteInput {
  query: string;
  meal?: string | null;
  resultCount?: number;
  latencyMs?: number | null;
  fromCache?: boolean;
  degraded?: boolean;
}

interface SearchAddSuccessInput {
  query?: string | null;
  meal?: string | null;
  sourceLabel?: string | null;
  confidenceLevel?: string | null;
  quickAdd?: boolean;
}

interface FoodLogInput {
  mealType?: string | null;
  calories?: number | null;
  source?: string | null;
}

interface QuickAddInput {
  source: string;
  mealType?: string | null;
  itemCount?: number;
}

interface BarcodeInput {
  meal?: string | null;
  barcode?: string | null;
  source?: string | null;
  latencyMs?: number | null;
}

interface PaywallInput {
  source?: string | null;
  trigger?: string | null;
  plan?: string | null;
}

const STORAGE_KEY = '@fueliq_activation_tracker_v1';

const INITIAL_STATE: ActivationState = {
  onboardingStartedAt: null,
  onboardingCompletedAt: null,
  firstFoodLoggedAt: null,
  secondFoodLoggedAt: null,
  firstBarcodeStartedAt: null,
  firstBarcodeFoundAt: null,
  firstRepeatLogAt: null,
  foodLogCount: 0,
  hasViewedValuePaywall: false,
  lastPaywallViewedAt: null,
  lastPaywallSource: null,
  lastPaywallTrigger: null,
  todayOpenCount: 0,
  addOpenCount: 0,
  searchStartCount: 0,
  searchCompletedCount: 0,
  searchResultSelectionCount: 0,
  searchAddSuccessCount: 0,
  searchReformulationCount: 0,
  searchesWithResultsCount: 0,
  searchesWithNoResultsCount: 0,
  searchCacheHitCount: 0,
  totalSearchLatencyMs: 0,
  barcodeStartCount: 0,
  barcodeFoundCount: 0,
  barcodeNotFoundCount: 0,
  barcodeCorrectionCount: 0,
  totalBarcodeLookupLatencyMs: 0,
  paywallViewCount: 0,
  paywallConversionCount: 0,
};

let cachedState: ActivationState | null = null;
let loadPromise: Promise<ActivationState> | null = null;
let stateUpdateChain: Promise<void> = Promise.resolve();
const listeners = new Set<(state: ActivationState) => void>();
let currentStorageKey = STORAGE_KEY;
let currentScopeToken = 0;
const scopedStateCache = new Map<string, ActivationState>();

function cloneState(state: ActivationState): ActivationState {
  return { ...state };
}

function sanitizeState(value: unknown): ActivationState {
  if (!value || typeof value !== 'object') {
    return cloneState(INITIAL_STATE);
  }

  return {
    ...INITIAL_STATE,
    ...(value as Partial<ActivationState>),
  };
}

function notifyListeners() {
  const snapshot = cloneState(cachedState || INITIAL_STATE);
  listeners.forEach((listener) => listener(snapshot));
}

async function persistState(
  state: ActivationState,
  storageKey: string,
  scopeToken: number
): Promise<void> {
  if (scopeToken !== currentScopeToken || storageKey !== currentStorageKey) {
    return;
  }

  cachedState = state;
  scopedStateCache.set(storageKey, cloneState(state));
  notifyListeners();

  try {
    await AsyncStorage.setItem(storageKey, JSON.stringify(state));
  } catch (error) {
    Sentry.captureException(error);
  }
}

async function readPersistedState(storageKey: string): Promise<ActivationState> {
  const cachedScopeState = scopedStateCache.get(storageKey);
  if (cachedScopeState) {
    return cloneState(cachedScopeState);
  }

  try {
    const saved = await AsyncStorage.getItem(storageKey);
    const parsed = saved ? sanitizeState(JSON.parse(saved)) : cloneState(INITIAL_STATE);
    scopedStateCache.set(storageKey, cloneState(parsed));
    return parsed;
  } catch (error) {
    Sentry.captureException(error);
    return cloneState(INITIAL_STATE);
  }
}

async function ensureStateLoaded(
  storageKey: string,
  scopeToken: number
): Promise<ActivationState> {
  if (
    scopeToken === currentScopeToken &&
    storageKey === currentStorageKey &&
    cachedState
  ) {
    return cloneState(cachedState);
  }

  const loaded = await readPersistedState(storageKey);

  if (scopeToken === currentScopeToken && storageKey === currentStorageKey) {
    cachedState = cloneState(loaded);
  }

  return cloneState(loaded);
}

async function updateState(
  updater: (state: ActivationState) => ActivationState
): Promise<ActivationState> {
  let nextState = cloneState(cachedState || INITIAL_STATE);
  const storageKey = currentStorageKey;
  const scopeToken = currentScopeToken;

  stateUpdateChain = stateUpdateChain
    .catch(() => {})
    .then(async () => {
      const current = await ensureStateLoaded(storageKey, scopeToken);
      if (scopeToken !== currentScopeToken || storageKey !== currentStorageKey) {
        return;
      }

      nextState = sanitizeState(updater(cloneState(current)));
      await persistState(nextState, storageKey, scopeToken);
    });

  await stateUpdateChain;
  return nextState;
}

function fireAndForget(promise: Promise<unknown>): void {
  promise.catch((error) => {
    Sentry.captureException(error);
  });
}

function normalizeSearchQuery(query: string): string {
  return query.trim().toLowerCase().slice(0, 80);
}

function normalizeBarcodeValue(barcode: string): string {
  return (barcode || '').replace(/\D/g, '').slice(0, 32);
}

export function getActivationStateSnapshot(): ActivationState {
  return cloneState(cachedState || INITIAL_STATE);
}

export async function configureActivationTrackerScope(
  userId: string | null | undefined
): Promise<ActivationState> {
  const nextStorageKey = userId ? `${STORAGE_KEY}:${userId}` : STORAGE_KEY;

  if (nextStorageKey === currentStorageKey && cachedState) {
    return cloneState(cachedState);
  }

  currentStorageKey = nextStorageKey;
  currentScopeToken += 1;
  loadPromise = null;
  cachedState = null;
  notifyListeners();

  return loadActivationState();
}

export async function loadActivationState(): Promise<ActivationState> {
  if (cachedState) {
    return cloneState(cachedState);
  }

  const storageKey = currentStorageKey;
  const scopeToken = currentScopeToken;
  if (!loadPromise) {
    loadPromise = (async () => {
      const loaded = await readPersistedState(storageKey);

      if (scopeToken === currentScopeToken && storageKey === currentStorageKey) {
        cachedState = cloneState(loaded);
      }

      return cloneState(loaded);
    })();
  }

  const state = await loadPromise;
  if (scopeToken === currentScopeToken && storageKey === currentStorageKey) {
    loadPromise = null;
    notifyListeners();
  }

  return state;
}

export function subscribeActivationState(
  listener: (state: ActivationState) => void
): () => void {
  listeners.add(listener);

  if (cachedState) {
    listener(cloneState(cachedState));
  }

  return () => {
    listeners.delete(listener);
  };
}

export function getActivationStage(state: ActivationState): ActivationStage {
  if (!state.firstFoodLoggedAt) return 'first_meal';
  if (!state.firstBarcodeFoundAt) return 'first_barcode';
  if (!state.firstRepeatLogAt) return 'repeat_log';
  return 'complete';
}

export function getActivationProgress(state: ActivationState): number {
  return [
    state.firstFoodLoggedAt,
    state.firstBarcodeFoundAt,
    state.firstRepeatLogAt,
  ].filter(Boolean).length;
}

export function shouldShowValuePaywall(state: ActivationState): boolean {
  return (
    state.foodLogCount >= 2 &&
    Boolean(state.firstFoodLoggedAt) &&
    (Boolean(state.firstBarcodeFoundAt) || Boolean(state.firstRepeatLogAt)) &&
    !state.hasViewedValuePaywall
  );
}

function toRate(numerator: number, denominator: number): number | null {
  if (denominator <= 0) {
    return null;
  }

  return Math.round((numerator / denominator) * 100);
}

export function getCoreLoopMetrics(state: ActivationState): CoreLoopMetrics {
  const timeToFirstLogMs =
    state.onboardingCompletedAt && state.firstFoodLoggedAt
      ? Math.max(state.firstFoodLoggedAt - state.onboardingCompletedAt, 0)
      : null;
  const timeToSecondLogMs =
    state.onboardingCompletedAt && state.secondFoodLoggedAt
      ? Math.max(state.secondFoodLoggedAt - state.onboardingCompletedAt, 0)
      : null;

  return {
    timeToFirstLogMs,
    timeToSecondLogMs,
    searchSelectionRate: toRate(state.searchResultSelectionCount, state.searchStartCount),
    searchSuccessRate: toRate(state.searchesWithResultsCount, state.searchCompletedCount),
    zeroResultRate: toRate(state.searchesWithNoResultsCount, state.searchCompletedCount),
    cacheHitRate: toRate(state.searchCacheHitCount, state.searchCompletedCount),
    avgSearchLatencyMs:
      state.searchCompletedCount > 0
        ? Math.round(state.totalSearchLatencyMs / state.searchCompletedCount)
        : null,
    barcodeSuccessRate: toRate(state.barcodeFoundCount, state.barcodeStartCount),
    barcodeCorrectionRate: toRate(
      state.barcodeCorrectionCount,
      state.barcodeFoundCount + state.barcodeNotFoundCount
    ),
    avgBarcodeLookupLatencyMs:
      state.barcodeFoundCount + state.barcodeNotFoundCount > 0
        ? Math.round(
            state.totalBarcodeLookupLatencyMs /
              (state.barcodeFoundCount + state.barcodeNotFoundCount)
          )
        : null,
    paywallConversionRate: toRate(state.paywallConversionCount, state.paywallViewCount),
  };
}

export async function resetActivationState(): Promise<void> {
  await stateUpdateChain.catch(() => {});
  stateUpdateChain = Promise.resolve();
  loadPromise = null;
  cachedState = cloneState(INITIAL_STATE);
  scopedStateCache.delete(currentStorageKey);
  notifyListeners();
  try {
    await AsyncStorage.removeItem(currentStorageKey);
  } catch (error) {
    Sentry.captureException(error);
  }
}

export async function recordOnboardingStarted(): Promise<void> {
  const now = Date.now();
  const state = await loadActivationState();
  if (state.onboardingStartedAt) {
    return;
  }

  await updateState((current) => ({
    ...current,
    onboardingStartedAt: now,
  }));

  trackEvent('conversion', 'onboarding_started');
}

export async function recordOnboardingCompleted(): Promise<void> {
  const now = Date.now();
  await updateState((current) => ({
    ...current,
    onboardingCompletedAt: current.onboardingCompletedAt || now,
  }));

  trackEvent('conversion', 'onboarding_completed');
}

export function recordTodayOpened(): void {
  fireAndForget(
    updateState((current) => ({
      ...current,
      todayOpenCount: current.todayOpenCount + 1,
    }))
  );

  trackEvent('retention', 'today_opened');
}

export function recordAddOpened(source: string, meal?: string | null): void {
  fireAndForget(
    updateState((current) => ({
      ...current,
      addOpenCount: current.addOpenCount + 1,
    }))
  );

  trackEvent('engagement', 'add_opened', {
    metadata: {
      source,
      mealType: meal || 'unknown',
    },
  });
}

export function recordSearchStarted({ query, meal }: SearchStartInput): void {
  const normalizedQuery = normalizeSearchQuery(query);

  fireAndForget(
    updateState((current) => ({
      ...current,
      searchStartCount: current.searchStartCount + 1,
    }))
  );

  trackEvent('engagement', 'search_started', {
    metadata: {
      mealType: meal || 'unknown',
      queryLength: query.trim().length,
      query: normalizedQuery,
    },
  });
}

export async function recordSearchReformulated({
  fromQuery,
  toQuery,
  meal,
  previousResultCount = 0,
}: SearchReformulationInput): Promise<void> {
  const normalizedFromQuery = normalizeSearchQuery(fromQuery);
  const normalizedToQuery = normalizeSearchQuery(toQuery);
  if (!normalizedFromQuery || !normalizedToQuery || normalizedFromQuery === normalizedToQuery) {
    return;
  }

  await updateState((current) => ({
    ...current,
    searchReformulationCount: current.searchReformulationCount + 1,
  }));

  trackEvent('engagement', 'search_query_reformulated', {
    metadata: {
      mealType: meal || 'unknown',
      fromQuery: normalizedFromQuery,
      toQuery: normalizedToQuery,
      previousResultCount: Math.max(Math.round(previousResultCount || 0), 0),
      fromQueryLength: normalizedFromQuery.length,
      toQueryLength: normalizedToQuery.length,
    },
  });
}

export function recordSearchCompleted({
  query,
  meal,
  resultCount = 0,
  latencyMs,
  fromCache = false,
  degraded = false,
}: SearchCompleteInput): void {
  const normalizedLatency = Math.max(Math.round(latencyMs || 0), 0);
  const normalizedResultCount = Math.max(Math.round(resultCount || 0), 0);
  const normalizedQuery = normalizeSearchQuery(query);

  fireAndForget(
    updateState((current) => ({
      ...current,
      searchCompletedCount: current.searchCompletedCount + 1,
      searchesWithResultsCount:
        current.searchesWithResultsCount + (normalizedResultCount > 0 ? 1 : 0),
      searchesWithNoResultsCount:
        current.searchesWithNoResultsCount + (normalizedResultCount === 0 ? 1 : 0),
      searchCacheHitCount: current.searchCacheHitCount + (fromCache ? 1 : 0),
      totalSearchLatencyMs: current.totalSearchLatencyMs + normalizedLatency,
    }))
  );

  trackEvent('performance', 'search_completed', {
    value: normalizedLatency,
    metadata: {
      mealType: meal || 'unknown',
      queryLength: query.trim().length,
      query: normalizedQuery,
      resultCount: normalizedResultCount,
      fromCache,
      degraded,
      durationMs: normalizedLatency,
    },
  });
}

export function recordSearchResultSelected({
  meal,
  name,
  sourceLabel,
  confidenceLevel,
  quickAdd = false,
}: SearchResultInput): void {
  fireAndForget(
    updateState((current) => ({
      ...current,
      searchResultSelectionCount: current.searchResultSelectionCount + 1,
    }))
  );

  trackEvent('engagement', 'search_result_selected', {
    metadata: {
      mealType: meal || 'unknown',
      name: name || 'unknown',
      sourceLabel: sourceLabel || 'unknown',
      confidenceLevel: confidenceLevel || 'unknown',
      quickAdd,
    },
  });
}

export async function recordSearchAddSucceeded({
  query,
  meal,
  sourceLabel,
  confidenceLevel,
  quickAdd = false,
}: SearchAddSuccessInput): Promise<void> {
  const normalizedQuery = normalizeSearchQuery(query || '');

  await updateState((current) => ({
    ...current,
    searchAddSuccessCount: current.searchAddSuccessCount + 1,
  }));

  trackEvent('conversion', 'search_add_succeeded', {
    metadata: {
      mealType: meal || 'unknown',
      query: normalizedQuery || 'unknown',
      queryLength: normalizedQuery.length,
      sourceLabel: sourceLabel || 'unknown',
      confidenceLevel: confidenceLevel || 'unknown',
      quickAdd,
    },
  });
}

export async function recordFoodLogged({
  mealType,
  calories,
  source,
}: FoodLogInput): Promise<ActivationState> {
  const now = Date.now();
  let timeToFirstLog: number | null = null;
  let timeToSecondLog: number | null = null;

  const nextState = await updateState((current) => {
    const updated: ActivationState = {
      ...current,
      foodLogCount: current.foodLogCount + 1,
    };

    if (!current.firstFoodLoggedAt) {
      updated.firstFoodLoggedAt = now;
      if (current.onboardingCompletedAt) {
        timeToFirstLog = now - current.onboardingCompletedAt;
      }
    } else if (!current.secondFoodLoggedAt) {
      updated.secondFoodLoggedAt = now;
      if (current.onboardingCompletedAt) {
        timeToSecondLog = now - current.onboardingCompletedAt;
      }
    }

    return updated;
  });

  trackEvent('engagement', 'food_logged', {
    metadata: {
      mealType: mealType || 'unknown',
      calories: calories || 0,
      source: source || 'unknown',
      foodLogCount: nextState.foodLogCount,
    },
  });

  if (timeToFirstLog !== null) {
    trackEvent('conversion', 'time_to_first_log', {
      value: timeToFirstLog,
      metadata: {
        durationMs: timeToFirstLog,
        mealType: mealType || 'unknown',
      },
    });
  }

  if (timeToSecondLog !== null) {
    trackEvent('conversion', 'time_to_second_log', {
      value: timeToSecondLog,
      metadata: {
        durationMs: timeToSecondLog,
        mealType: mealType || 'unknown',
      },
    });
  }

  return nextState;
}

export function recordQuickAddUsed({
  source,
  mealType,
  itemCount = 1,
}: QuickAddInput): void {
  trackEvent('engagement', 'quick_add_used', {
    metadata: {
      source,
      mealType: mealType || 'unknown',
      itemCount,
    },
  });
}

export async function recordRepeatLogUsed({
  source,
  mealType,
  itemCount = 1,
}: QuickAddInput): Promise<ActivationState> {
  const now = Date.now();
  const nextState = await updateState((current) => ({
    ...current,
    firstRepeatLogAt: current.firstRepeatLogAt || now,
  }));

  trackEvent('engagement', 'repeat_log_used', {
    metadata: {
      source,
      mealType: mealType || 'unknown',
      itemCount,
    },
  });

  return nextState;
}

export async function recordBarcodeStarted({ meal }: BarcodeInput): Promise<void> {
  const now = Date.now();
  await updateState((current) => ({
    ...current,
    firstBarcodeStartedAt: current.firstBarcodeStartedAt || now,
    barcodeStartCount: current.barcodeStartCount + 1,
  }));

  trackEvent('engagement', 'barcode_started', {
    metadata: {
      mealType: meal || 'unknown',
    },
  });
}

export async function recordBarcodeFound({
  meal,
  barcode,
  source,
  latencyMs,
}: BarcodeInput): Promise<ActivationState> {
  const now = Date.now();
  const normalizedLatency = Math.max(Math.round(latencyMs || 0), 0);
  const normalizedBarcode = normalizeBarcodeValue(barcode || '');
  const nextState = await updateState((current) => ({
    ...current,
    firstBarcodeFoundAt: current.firstBarcodeFoundAt || now,
    barcodeFoundCount: current.barcodeFoundCount + 1,
    totalBarcodeLookupLatencyMs:
      current.totalBarcodeLookupLatencyMs + normalizedLatency,
  }));

  trackEvent('engagement', 'barcode_found', {
    metadata: {
      mealType: meal || 'unknown',
      barcodeLength: barcode ? barcode.length : 0,
      barcode: normalizedBarcode,
      source: source || 'unknown',
      durationMs: normalizedLatency,
    },
  });

  return nextState;
}

export function recordBarcodeNotFound({
  meal,
  barcode,
  latencyMs,
}: BarcodeInput): void {
  const normalizedLatency = Math.max(Math.round(latencyMs || 0), 0);
  const normalizedBarcode = normalizeBarcodeValue(barcode || '');

  fireAndForget(
    updateState((current) => ({
      ...current,
      barcodeNotFoundCount: current.barcodeNotFoundCount + 1,
      totalBarcodeLookupLatencyMs:
        current.totalBarcodeLookupLatencyMs + normalizedLatency,
    }))
  );

  trackEvent('engagement', 'barcode_not_found', {
    metadata: {
      mealType: meal || 'unknown',
      barcodeLength: barcode ? barcode.length : 0,
      barcode: normalizedBarcode,
      durationMs: normalizedLatency,
    },
  });
}

export function recordBarcodeCorrected({
  meal,
  barcode,
  source,
  correctedName,
}: BarcodeInput & { correctedName?: string | null }): void {
  const normalizedBarcode = normalizeBarcodeValue(barcode || '');

  fireAndForget(
    updateState((current) => ({
      ...current,
      barcodeCorrectionCount: current.barcodeCorrectionCount + 1,
    }))
  );

  trackEvent('engagement', 'barcode_corrected', {
    metadata: {
      mealType: meal || 'unknown',
      barcodeLength: barcode ? barcode.length : 0,
      barcode: normalizedBarcode,
      source: source || 'unknown',
      correctedName: correctedName || '',
    },
  });
}

export async function recordPaywallViewed({
  source,
  trigger,
}: PaywallInput): Promise<ActivationState> {
  const now = Date.now();
  const normalizedSource = source || 'unknown';
  const normalizedTrigger = trigger || 'direct';

  const nextState = await updateState((current) => ({
    ...current,
    hasViewedValuePaywall:
      current.hasViewedValuePaywall || normalizedTrigger === 'after_value',
    lastPaywallViewedAt: now,
    lastPaywallSource: normalizedSource,
    lastPaywallTrigger: normalizedTrigger,
    paywallViewCount: current.paywallViewCount + 1,
  }));

  trackEvent('conversion', 'paywall_viewed', {
    metadata: {
      source: normalizedSource,
      trigger: normalizedTrigger,
    },
  });

  return nextState;
}

export function recordPaywallDismissed({
  source,
  trigger,
}: PaywallInput): void {
  trackEvent('conversion', 'paywall_dismissed', {
    metadata: {
      source: source || 'unknown',
      trigger: trigger || 'direct',
    },
  });
}

export function recordPaywallConverted({
  source,
  trigger,
  plan,
}: PaywallInput): void {
  fireAndForget(
    updateState((current) => ({
      ...current,
      paywallConversionCount: current.paywallConversionCount + 1,
    }))
  );

  trackEvent('conversion', 'paywall_converted', {
    metadata: {
      source: source || 'unknown',
      trigger: trigger || 'direct',
      plan: plan || 'unknown',
    },
  });
}

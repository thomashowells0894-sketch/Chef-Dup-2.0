import {
  getCoreLoopMetrics,
  getActivationStage,
  getActivationStateSnapshot,
  recordBarcodeFound,
  recordBarcodeNotFound,
  recordBarcodeStarted,
  recordFoodLogged,
  recordOnboardingCompleted,
  recordOnboardingStarted,
  recordPaywallConverted,
  recordPaywallViewed,
  recordRepeatLogUsed,
  recordSearchCompleted,
  recordSearchResultSelected,
  recordSearchStarted,
  resetActivationState,
  shouldShowValuePaywall,
} from '../../lib/activationTracker';

const mockTrackEvent = jest.fn();

jest.mock('../../lib/analytics', () => ({
  trackEvent: (...args: unknown[]) => mockTrackEvent(...args),
}));

async function flushTrackerUpdates() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe('activationTracker', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-12T09:00:00Z'));
    await resetActivationState();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('records first and second log timing from onboarding completion', async () => {
    await recordOnboardingStarted();
    await recordOnboardingCompleted();

    jest.advanceTimersByTime(12_000);
    await recordFoodLogged({ mealType: 'breakfast', calories: 420, source: 'search_result' });

    jest.advanceTimersByTime(8_000);
    await recordFoodLogged({ mealType: 'lunch', calories: 610, source: 'barcode' });

    const state = getActivationStateSnapshot();
    expect(state.foodLogCount).toBe(2);
    expect(state.firstFoodLoggedAt).not.toBeNull();
    expect(state.secondFoodLoggedAt).not.toBeNull();

    expect(mockTrackEvent).toHaveBeenCalledWith(
      'conversion',
      'time_to_first_log',
      expect.objectContaining({
        value: 12_000,
        metadata: expect.objectContaining({ durationMs: 12_000 }),
      })
    );

    expect(mockTrackEvent).toHaveBeenCalledWith(
      'conversion',
      'time_to_second_log',
      expect.objectContaining({
        value: 20_000,
        metadata: expect.objectContaining({ durationMs: 20_000 }),
      })
    );
  });

  it('advances the activation stage and gates the value paywall after value is felt', async () => {
    await recordFoodLogged({ mealType: 'breakfast', calories: 350, source: 'search_result' });
    await recordFoodLogged({ mealType: 'lunch', calories: 550, source: 'search_result' });
    await recordBarcodeFound({ meal: 'lunch', barcode: '1234567890123', source: 'Open Food Facts' });

    let state = getActivationStateSnapshot();
    expect(getActivationStage(state)).toBe('repeat_log');
    expect(shouldShowValuePaywall(state)).toBe(true);

    await recordRepeatLogUsed({ source: 'recent_meal', mealType: 'dinner', itemCount: 2 });

    state = getActivationStateSnapshot();
    expect(getActivationStage(state)).toBe('complete');
    expect(shouldShowValuePaywall(state)).toBe(true);

    await recordPaywallViewed({ source: 'after_value', trigger: 'after_value' });

    state = getActivationStateSnapshot();
    expect(state.hasViewedValuePaywall).toBe(true);
    expect(shouldShowValuePaywall(state)).toBe(false);
  });

  it('computes core-loop rates and latency metrics for the local funnel dashboard', async () => {
    recordSearchStarted({ query: 'protein bar', meal: 'breakfast' });
    recordSearchCompleted({
      query: 'protein bar',
      meal: 'breakfast',
      resultCount: 6,
      latencyMs: 320,
      fromCache: true,
    });
    recordSearchResultSelected({
      meal: 'breakfast',
      name: 'FuelIQ Protein Bar',
      sourceLabel: 'USDA',
      confidenceLevel: 'high',
    });

    await recordBarcodeStarted({ meal: 'lunch' });
    await recordBarcodeFound({
      meal: 'lunch',
      barcode: '501234567890',
      source: 'Open Food Facts',
      latencyMs: 780,
    });

    await recordBarcodeStarted({ meal: 'dinner' });
    recordBarcodeNotFound({
      meal: 'dinner',
      barcode: '4012345678901',
      latencyMs: 1220,
    });

    await recordPaywallViewed({ source: 'after_value', trigger: 'after_value' });
    recordPaywallConverted({ source: 'after_value', trigger: 'after_value', plan: 'annual' });

    await flushTrackerUpdates();

    const state = getActivationStateSnapshot();
    const metrics = getCoreLoopMetrics(state);

    expect(state.searchStartCount).toBe(1);
    expect(state.searchCompletedCount).toBe(1);
    expect(state.searchResultSelectionCount).toBe(1);
    expect(state.searchesWithResultsCount).toBe(1);
    expect(state.searchCacheHitCount).toBe(1);
    expect(state.barcodeStartCount).toBe(2);
    expect(state.barcodeFoundCount).toBe(1);
    expect(state.barcodeNotFoundCount).toBe(1);
    expect(state.paywallViewCount).toBe(1);
    expect(state.paywallConversionCount).toBe(1);

    expect(metrics.searchSelectionRate).toBe(100);
    expect(metrics.searchSuccessRate).toBe(100);
    expect(metrics.zeroResultRate).toBe(0);
    expect(metrics.cacheHitRate).toBe(100);
    expect(metrics.avgSearchLatencyMs).toBe(320);
    expect(metrics.barcodeSuccessRate).toBe(50);
    expect(metrics.avgBarcodeLookupLatencyMs).toBe(1000);
    expect(metrics.paywallConversionRate).toBe(100);
  });
});

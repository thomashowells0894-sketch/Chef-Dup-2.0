jest.mock('../../lib/activationTracker', () => ({
  getActivationProgress: (state: any) => [
    state.firstFoodLoggedAt,
    state.firstBarcodeFoundAt,
    state.firstRepeatLogAt,
  ].filter(Boolean).length,
  getActivationStage: (state: any) => {
    if (!state.firstFoodLoggedAt) return 'first_meal';
    if (!state.firstBarcodeFoundAt) return 'first_barcode';
    if (!state.firstRepeatLogAt) return 'repeat_log';
    return 'complete';
  },
  getCoreLoopMetrics: (state: any) => ({
    timeToFirstLogMs:
      state.onboardingCompletedAt && state.firstFoodLoggedAt
        ? state.firstFoodLoggedAt - state.onboardingCompletedAt
        : null,
    timeToSecondLogMs:
      state.onboardingCompletedAt && state.secondFoodLoggedAt
        ? state.secondFoodLoggedAt - state.onboardingCompletedAt
        : null,
    searchSelectionRate:
      state.searchStartCount > 0
        ? Math.round((state.searchResultSelectionCount / state.searchStartCount) * 100)
        : null,
  }),
  loadActivationState: jest.fn(),
}));

jest.mock('../../lib/supabase', () => ({
  supabase: {},
}));

import { buildOperatorAnalyticsSnapshot } from '../../services/operatorAnalytics';

describe('operator analytics aggregation', () => {
  it('builds funnel, quality, and paywall insights from analytics rows', () => {
    const activationState = {
      onboardingStartedAt: Date.parse('2026-03-12T09:00:00Z'),
      onboardingCompletedAt: Date.parse('2026-03-12T09:02:00Z'),
      firstFoodLoggedAt: Date.parse('2026-03-12T09:05:00Z'),
      secondFoodLoggedAt: Date.parse('2026-03-12T09:08:00Z'),
      firstBarcodeStartedAt: Date.parse('2026-03-12T10:00:00Z'),
      firstBarcodeFoundAt: Date.parse('2026-03-12T10:01:00Z'),
      firstRepeatLogAt: Date.parse('2026-03-13T08:00:00Z'),
      foodLogCount: 2,
      hasViewedValuePaywall: false,
      lastPaywallViewedAt: null,
      lastPaywallSource: null,
      lastPaywallTrigger: null,
      todayOpenCount: 3,
      addOpenCount: 2,
      searchStartCount: 4,
      searchCompletedCount: 4,
      searchResultSelectionCount: 2,
      searchesWithResultsCount: 3,
      searchesWithNoResultsCount: 1,
      searchCacheHitCount: 1,
      totalSearchLatencyMs: 1800,
      barcodeStartCount: 2,
      barcodeFoundCount: 1,
      barcodeNotFoundCount: 1,
      totalBarcodeLookupLatencyMs: 1800,
      paywallViewCount: 1,
      paywallConversionCount: 1,
    };

    const rows = [
      { user_id: 'u1', session_id: 's1', action: 'onboarding_completed', metadata: {}, created_at: '2026-03-12T09:02:00Z' },
      { user_id: 'u1', session_id: 's1', action: 'food_logged', metadata: {}, created_at: '2026-03-12T09:05:00Z' },
      { user_id: 'u1', session_id: 's1', action: 'time_to_second_log', metadata: {}, created_at: '2026-03-12T09:08:00Z' },
      { user_id: 'u1', session_id: 's1', action: 'barcode_found', metadata: { durationMs: 700, barcode: '0123456789012' }, created_at: '2026-03-12T10:01:00Z' },
      { user_id: 'u1', session_id: 's1', action: 'repeat_log_used', metadata: {}, created_at: '2026-03-13T08:00:00Z' },
      {
        user_id: 'u1',
        session_id: 's1',
        action: 'search_completed',
        metadata: { query: 'protein bar', resultCount: 0, durationMs: 320 },
        created_at: '2026-03-12T09:04:00Z',
      },
      {
        user_id: 'u1',
        session_id: 's1',
        action: 'search_completed',
        metadata: { query: 'chicken breast', resultCount: 6, durationMs: 950 },
        created_at: '2026-03-12T09:06:00Z',
      },
      { user_id: 'u1', session_id: 's1', action: 'search_started', metadata: {}, created_at: '2026-03-12T09:03:00Z' },
      { user_id: 'u1', session_id: 's1', action: 'search_started', metadata: {}, created_at: '2026-03-12T09:06:00Z' },
      { user_id: 'u1', session_id: 's1', action: 'search_result_selected', metadata: {}, created_at: '2026-03-12T09:06:20Z' },
      {
        user_id: 'u2',
        session_id: 's2',
        action: 'barcode_started',
        metadata: {},
        created_at: '2026-03-12T11:00:00Z',
      },
      {
        user_id: 'u2',
        session_id: 's2',
        action: 'barcode_not_found',
        metadata: { barcode: '4006381333931', durationMs: 1100 },
        created_at: '2026-03-12T11:00:02Z',
      },
      {
        user_id: 'u1',
        session_id: 's1',
        action: 'paywall_viewed',
        metadata: { source: 'after_value', trigger: 'after_value' },
        created_at: '2026-03-13T09:00:00Z',
      },
      {
        user_id: 'u1',
        session_id: 's1',
        action: 'paywall_converted',
        metadata: { source: 'after_value', trigger: 'after_value' },
        created_at: '2026-03-13T09:02:00Z',
      },
    ];

    const snapshot = buildOperatorAnalyticsSnapshot(rows as any, {
      windowDays: 7,
      source: 'remote',
      activationState: activationState as any,
    });

    expect(snapshot.source).toBe('remote');
    expect(snapshot.actorCount).toBe(2);
    expect(snapshot.funnel.onboardingCompleted).toBe(1);
    expect(snapshot.funnel.firstLog).toBe(1);
    expect(snapshot.funnel.secondLog).toBe(1);
    expect(snapshot.funnel.barcodeFound).toBe(1);
    expect(snapshot.funnel.repeatLog).toBe(1);
    expect(snapshot.funnel.paywallViewed).toBe(1);
    expect(snapshot.funnel.paywallConverted).toBe(1);
    expect(snapshot.search.started).toBe(2);
    expect(snapshot.search.completed).toBe(2);
    expect(snapshot.search.zeroResults).toBe(1);
    expect(snapshot.search.selectionRate).toBe(50);
    expect(snapshot.search.topZeroResultQueries[0]).toEqual(
      expect.objectContaining({ query: 'protein bar', count: 1 })
    );
    expect(snapshot.search.slowQueries[0]).toEqual(
      expect.objectContaining({ query: 'chicken breast' })
    );
    expect(snapshot.barcode.started).toBe(1);
    expect(snapshot.barcode.notFound).toBe(1);
    expect(snapshot.barcode.topMisses[0]).toEqual(
      expect.objectContaining({ barcode: '4006381333931', count: 1 })
    );
    expect(snapshot.paywall.conversionRate).toBe(100);
    expect(snapshot.paywall.sources[0]).toEqual(
      expect.objectContaining({ source: 'after_value', trigger: 'after_value', views: 1, conversions: 1 })
    );
    expect(snapshot.localActivation.stage).toBe('complete');
    expect(snapshot.localActivation.metrics.searchSelectionRate).toBe(50);
  });
});

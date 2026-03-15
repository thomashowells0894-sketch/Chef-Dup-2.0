import {
  getActivationProgress,
  getActivationStage,
  getCoreLoopMetrics,
  loadActivationState,
  type ActivationStage,
  type ActivationState,
  type CoreLoopMetrics,
} from '../lib/activationTracker';
import { Sentry } from '../lib/sentry';
import { supabase } from '../lib/supabase';

interface AnalyticsEventRow {
  user_id?: string | null;
  session_id?: string | null;
  category?: string | null;
  action: string;
  metadata?: Record<string, unknown> | null;
  created_at?: string | null;
}

interface TopQueryInsight {
  query: string;
  count: number;
  avgLatencyMs: number | null;
}

interface TopBarcodeInsight {
  barcode: string;
  count: number;
  avgLatencyMs: number | null;
}

interface PaywallSourceInsight {
  key: string;
  source: string;
  trigger: string;
  views: number;
  conversions: number;
  conversionRate: number | null;
}

interface FunnelStep {
  key: string;
  label: string;
  users: number;
  conversionRate: number | null;
}

export interface OperatorAnalyticsSnapshot {
  source: 'remote' | 'local';
  windowDays: number;
  since: string;
  fetchedAt: string;
  rowCount: number;
  actorCount: number;
  localActivation: {
    stage: ActivationStage;
    progress: number;
    metrics: CoreLoopMetrics;
  };
  funnel: {
    onboardingCompleted: number;
    firstLog: number;
    secondLog: number;
    barcodeFound: number;
    repeatLog: number;
    paywallViewed: number;
    paywallConverted: number;
    steps: FunnelStep[];
  };
  search: {
    started: number;
    completed: number;
    selected: number;
    withResults: number;
    zeroResults: number;
    cacheHits: number;
    selectionRate: number | null;
    successRate: number | null;
    zeroResultRate: number | null;
    avgLatencyMs: number | null;
    topZeroResultQueries: TopQueryInsight[];
    slowQueries: TopQueryInsight[];
  };
  barcode: {
    started: number;
    found: number;
    notFound: number;
    successRate: number | null;
    avgLatencyMs: number | null;
    topMisses: TopBarcodeInsight[];
  };
  paywall: {
    viewed: number;
    converted: number;
    conversionRate: number | null;
    sources: PaywallSourceInsight[];
  };
  fallbackReason?: string;
}

interface BuildSnapshotOptions {
  windowDays: number;
  source: 'remote' | 'local';
  activationState: ActivationState;
  fallbackReason?: string;
}

function toActorKey(row: AnalyticsEventRow, index: number): string {
  return row.user_id || row.session_id || `event-${index}`;
}

function toMetadata(row: AnalyticsEventRow): Record<string, unknown> {
  return row.metadata && typeof row.metadata === 'object' ? row.metadata : {};
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function toText(value: unknown, fallback = 'unknown'): string {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }

  return fallback;
}

function toRate(numerator: number, denominator: number): number | null {
  if (denominator <= 0) {
    return null;
  }

  return Math.round((numerator / denominator) * 100);
}

function averageFrom(total: number, count: number): number | null {
  if (count <= 0) {
    return null;
  }

  return Math.round(total / count);
}

function rankQueryInsights(
  entries: Map<string, { count: number; totalLatencyMs: number }>
): TopQueryInsight[] {
  return [...entries.entries()]
    .map(([query, stats]) => ({
      query,
      count: stats.count,
      avgLatencyMs: averageFrom(stats.totalLatencyMs, stats.count),
    }))
    .sort((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count;
      }

      return (right.avgLatencyMs || 0) - (left.avgLatencyMs || 0);
    })
    .slice(0, 8);
}

function rankBarcodeInsights(
  entries: Map<string, { count: number; totalLatencyMs: number }>
): TopBarcodeInsight[] {
  return [...entries.entries()]
    .map(([barcode, stats]) => ({
      barcode,
      count: stats.count,
      avgLatencyMs: averageFrom(stats.totalLatencyMs, stats.count),
    }))
    .sort((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count;
      }

      return (right.avgLatencyMs || 0) - (left.avgLatencyMs || 0);
    })
    .slice(0, 8);
}

function buildFunnelSteps(counts: {
  onboardingCompleted: number;
  firstLog: number;
  secondLog: number;
  barcodeFound: number;
  repeatLog: number;
  paywallViewed: number;
  paywallConverted: number;
}): FunnelStep[] {
  const steps = [
    { key: 'onboarding_completed', label: 'Onboarding', users: counts.onboardingCompleted },
    { key: 'first_log', label: 'First Log', users: counts.firstLog },
    { key: 'second_log', label: 'Second Log', users: counts.secondLog },
    { key: 'barcode_found', label: 'Barcode Used', users: counts.barcodeFound },
    { key: 'repeat_log', label: 'Repeat Log', users: counts.repeatLog },
    { key: 'paywall_viewed', label: 'Paywall Seen', users: counts.paywallViewed },
    { key: 'paywall_converted', label: 'Paid', users: counts.paywallConverted },
  ];

  return steps.map((step, index) => ({
    ...step,
    conversionRate:
      index === 0 ? null : toRate(step.users, Math.max(steps[index - 1].users, 0)),
  }));
}

export function buildOperatorAnalyticsSnapshot(
  rows: AnalyticsEventRow[],
  options: BuildSnapshotOptions
): OperatorAnalyticsSnapshot {
  const actorKeys = new Set<string>();
  const funnelSets = {
    onboardingCompleted: new Set<string>(),
    firstLog: new Set<string>(),
    secondLog: new Set<string>(),
    barcodeFound: new Set<string>(),
    repeatLog: new Set<string>(),
    paywallViewed: new Set<string>(),
    paywallConverted: new Set<string>(),
  };

  let searchStarted = 0;
  let searchCompleted = 0;
  let searchSelected = 0;
  let searchesWithResults = 0;
  let searchesWithNoResults = 0;
  let searchCacheHits = 0;
  let totalSearchLatencyMs = 0;

  let barcodeStarted = 0;
  let barcodeFound = 0;
  let barcodeNotFound = 0;
  let totalBarcodeLatencyMs = 0;

  let paywallViewed = 0;
  let paywallConverted = 0;

  const zeroResultQueries = new Map<string, { count: number; totalLatencyMs: number }>();
  const slowQueries = new Map<string, { count: number; totalLatencyMs: number }>();
  const barcodeMisses = new Map<string, { count: number; totalLatencyMs: number }>();
  const paywallSources = new Map<string, { source: string; trigger: string; views: number; conversions: number }>();

  rows.forEach((row, index) => {
    const actorKey = toActorKey(row, index);
    actorKeys.add(actorKey);
    const metadata = toMetadata(row);
    const latencyMs = Math.max(toNumber(metadata.durationMs) || 0, 0);

    switch (row.action) {
      case 'onboarding_completed':
        funnelSets.onboardingCompleted.add(actorKey);
        break;
      case 'food_logged':
        funnelSets.firstLog.add(actorKey);
        break;
      case 'time_to_second_log':
        funnelSets.secondLog.add(actorKey);
        break;
      case 'barcode_found':
        funnelSets.barcodeFound.add(actorKey);
        barcodeFound += 1;
        totalBarcodeLatencyMs += latencyMs;
        break;
      case 'repeat_log_used':
        funnelSets.repeatLog.add(actorKey);
        break;
      case 'paywall_viewed': {
        funnelSets.paywallViewed.add(actorKey);
        paywallViewed += 1;
        const source = toText(metadata.source);
        const trigger = toText(metadata.trigger, 'direct');
        const key = `${source}|${trigger}`;
        const current = paywallSources.get(key) || { source, trigger, views: 0, conversions: 0 };
        current.views += 1;
        paywallSources.set(key, current);
        break;
      }
      case 'paywall_converted': {
        funnelSets.paywallConverted.add(actorKey);
        paywallConverted += 1;
        const source = toText(metadata.source);
        const trigger = toText(metadata.trigger, 'direct');
        const key = `${source}|${trigger}`;
        const current = paywallSources.get(key) || { source, trigger, views: 0, conversions: 0 };
        current.conversions += 1;
        paywallSources.set(key, current);
        break;
      }
      case 'search_started':
        searchStarted += 1;
        break;
      case 'search_completed': {
        searchCompleted += 1;
        totalSearchLatencyMs += latencyMs;
        const resultCount = Math.max(toNumber(metadata.resultCount) || 0, 0);
        const query = toText(metadata.query, 'unknown');

        if (metadata.fromCache === true) {
          searchCacheHits += 1;
        }

        const existingSlow = slowQueries.get(query) || { count: 0, totalLatencyMs: 0 };
        existingSlow.count += 1;
        existingSlow.totalLatencyMs += latencyMs;
        slowQueries.set(query, existingSlow);

        if (resultCount > 0) {
          searchesWithResults += 1;
        } else {
          searchesWithNoResults += 1;
          const zeroResult = zeroResultQueries.get(query) || { count: 0, totalLatencyMs: 0 };
          zeroResult.count += 1;
          zeroResult.totalLatencyMs += latencyMs;
          zeroResultQueries.set(query, zeroResult);
        }
        break;
      }
      case 'search_result_selected':
        searchSelected += 1;
        break;
      case 'barcode_started':
        barcodeStarted += 1;
        break;
      case 'barcode_not_found': {
        barcodeNotFound += 1;
        totalBarcodeLatencyMs += latencyMs;
        const barcode = toText(metadata.barcode, 'unknown');
        const current = barcodeMisses.get(barcode) || { count: 0, totalLatencyMs: 0 };
        current.count += 1;
        current.totalLatencyMs += latencyMs;
        barcodeMisses.set(barcode, current);
        break;
      }
      default:
        break;
    }
  });

  const funnelCounts = {
    onboardingCompleted: funnelSets.onboardingCompleted.size,
    firstLog: funnelSets.firstLog.size,
    secondLog: funnelSets.secondLog.size,
    barcodeFound: funnelSets.barcodeFound.size,
    repeatLog: funnelSets.repeatLog.size,
    paywallViewed: funnelSets.paywallViewed.size,
    paywallConverted: funnelSets.paywallConverted.size,
  };

  const sourceBreakdown: PaywallSourceInsight[] = [...paywallSources.entries()]
    .map(([key, value]) => ({
      key,
      source: value.source,
      trigger: value.trigger,
      views: value.views,
      conversions: value.conversions,
      conversionRate: toRate(value.conversions, value.views),
    }))
    .sort((left, right) => {
      if (right.views !== left.views) {
        return right.views - left.views;
      }

      return right.conversions - left.conversions;
    })
    .slice(0, 8);

  return {
    source: options.source,
    windowDays: options.windowDays,
    since: new Date(Date.now() - options.windowDays * 24 * 60 * 60 * 1000).toISOString(),
    fetchedAt: new Date().toISOString(),
    rowCount: rows.length,
    actorCount: actorKeys.size,
    localActivation: {
      stage: getActivationStage(options.activationState),
      progress: getActivationProgress(options.activationState),
      metrics: getCoreLoopMetrics(options.activationState),
    },
    funnel: {
      ...funnelCounts,
      steps: buildFunnelSteps(funnelCounts),
    },
    search: {
      started: searchStarted,
      completed: searchCompleted,
      selected: searchSelected,
      withResults: searchesWithResults,
      zeroResults: searchesWithNoResults,
      cacheHits: searchCacheHits,
      selectionRate: toRate(searchSelected, searchStarted),
      successRate: toRate(searchesWithResults, searchCompleted),
      zeroResultRate: toRate(searchesWithNoResults, searchCompleted),
      avgLatencyMs: averageFrom(totalSearchLatencyMs, searchCompleted),
      topZeroResultQueries: rankQueryInsights(zeroResultQueries),
      slowQueries: rankQueryInsights(slowQueries)
        .sort((left, right) => (right.avgLatencyMs || 0) - (left.avgLatencyMs || 0))
        .slice(0, 8),
    },
    barcode: {
      started: barcodeStarted,
      found: barcodeFound,
      notFound: barcodeNotFound,
      successRate: toRate(barcodeFound, barcodeStarted),
      avgLatencyMs: averageFrom(totalBarcodeLatencyMs, barcodeFound + barcodeNotFound),
      topMisses: rankBarcodeInsights(barcodeMisses),
    },
    paywall: {
      viewed: paywallViewed,
      converted: paywallConverted,
      conversionRate: toRate(paywallConverted, paywallViewed),
      sources: sourceBreakdown,
    },
    fallbackReason: options.fallbackReason,
  };
}

export async function fetchOperatorAnalytics(
  windowDays = 7,
  maxRows = 2500
): Promise<OperatorAnalyticsSnapshot> {
  const activationState = await loadActivationState();
  const sinceIso = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString();

  try {
    const { data, error } = await supabase
      .from('analytics_events')
      .select('user_id,session_id,category,action,metadata,created_at')
      .gte('created_at', sinceIso)
      .order('created_at', { ascending: false })
      .limit(maxRows);

    if (error) {
      throw error;
    }

    return buildOperatorAnalyticsSnapshot((data || []) as AnalyticsEventRow[], {
      windowDays,
      source: 'remote',
      activationState,
    });
  } catch (error) {
    Sentry.captureException(error);

    return buildOperatorAnalyticsSnapshot([], {
      windowDays,
      source: 'local',
      activationState,
      fallbackReason:
        error instanceof Error
          ? error.message
          : 'Analytics stream unavailable. Showing device-only activation data.',
    });
  }
}

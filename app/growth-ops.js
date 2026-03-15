import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  BarChart3,
  ChevronRight,
  RefreshCw,
  ScanBarcode,
  Search,
  Target,
  TrendingUp,
} from 'lucide-react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '../constants/theme';
import { fetchOperatorAnalytics } from '../services/operatorAnalytics';

const RANGE_OPTIONS = [
  { label: '7D', value: 7 },
  { label: '30D', value: 30 },
];

function formatRate(value) {
  return typeof value === 'number' ? `${value}%` : '--';
}

function formatLatency(value) {
  if (typeof value !== 'number' || value <= 0) {
    return '--';
  }

  if (value < 1000) {
    return `${value}ms`;
  }

  return `${(value / 1000).toFixed(value >= 10_000 ? 0 : 1)}s`;
}

function formatStage(stage) {
  switch (stage) {
    case 'first_meal':
      return 'Need first meal';
    case 'first_barcode':
      return 'Need first barcode';
    case 'repeat_log':
      return 'Need repeat log';
    default:
      return 'Activated';
  }
}

function SummaryCard({ label, value, hint, tone = Colors.primary }) {
  return (
    <View style={styles.summaryCard}>
      <Text style={[styles.summaryValue, { color: tone }]}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
      {hint ? <Text style={styles.summaryHint}>{hint}</Text> : null}
    </View>
  );
}

function SectionCard({ title, subtitle, children, rightAction }) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderCopy}>
          <Text style={styles.sectionTitle}>{title}</Text>
          {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
        </View>
        {rightAction}
      </View>
      {children}
    </View>
  );
}

function FunnelRow({ step }) {
  return (
    <View style={styles.funnelRow}>
      <View style={styles.funnelCopy}>
        <Text style={styles.funnelLabel}>{step.label}</Text>
        <Text style={styles.funnelCount}>{step.users} users</Text>
      </View>
      <Text style={styles.funnelRate}>{formatRate(step.conversionRate)}</Text>
    </View>
  );
}

function InsightRow({ label, value, secondary }) {
  return (
    <View style={styles.insightRow}>
      <View style={styles.insightCopy}>
        <Text style={styles.insightLabel}>{label}</Text>
        {secondary ? <Text style={styles.insightSecondary}>{secondary}</Text> : null}
      </View>
      <Text style={styles.insightValue}>{value}</Text>
    </View>
  );
}

export default function GrowthOpsScreen() {
  const router = useRouter();
  const [windowDays, setWindowDays] = useState(7);
  const [snapshot, setSnapshot] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadSnapshot = useCallback(async (days, refreshing = false) => {
    if (refreshing) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const next = await fetchOperatorAnalytics(days);
      setSnapshot(next);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadSnapshot(windowDays);
  }, [loadSnapshot, windowDays]);

  const actionCopy = useMemo(() => {
    if (!snapshot) {
      return { title: 'Loading', detail: '' };
    }

    if (snapshot.search.zeroResultRate && snapshot.search.zeroResultRate >= 15) {
      return {
        title: 'Fix zero-result search terms',
        detail: 'The biggest quality leak is still search misses. Use the top zero-result queries below as the immediate backlog.',
      };
    }

    if (snapshot.barcode.successRate !== null && snapshot.barcode.successRate < 80) {
      return {
        title: 'Fix barcode misses',
        detail: 'Barcode trust is still below the target line. Prioritize the repeated misses shown below.',
      };
    }

    if (snapshot.funnel.steps[6]?.conversionRate !== null && (snapshot.funnel.steps[6]?.conversionRate || 0) < 35) {
      return {
        title: 'Tune the post-value paywall',
        detail: 'Users are reaching value but not converting cleanly enough. Test paywall sources and copy next.',
      };
    }

    return {
      title: 'Hold the core loop steady',
      detail: 'The current bottleneck is not obvious. Watch daily drift and keep pressure on trust and repeatability.',
    };
  }, [snapshot]);

  if (isLoading && !snapshot) {
    return (
      <ScreenWrapper>
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingTitle}>Loading Growth Ops</Text>
          <Text style={styles.loadingHint}>Pulling the latest funnel and quality signals.</Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper testID="growth-ops-screen">
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            tintColor={Colors.primary}
            refreshing={isRefreshing}
            onRefresh={() => loadSnapshot(windowDays, true)}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={18} color={Colors.text} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>Growth Ops</Text>
            <Text style={styles.subtitle}>Production truth for funnel, quality, and monetization.</Text>
          </View>
          <Pressable style={styles.refreshButton} onPress={() => loadSnapshot(windowDays, true)}>
            <RefreshCw size={16} color={Colors.primary} />
          </Pressable>
        </View>

        <View style={styles.rangeRow}>
          {RANGE_OPTIONS.map((option) => (
            <Pressable
              key={option.value}
              style={[styles.rangeChip, windowDays === option.value && styles.rangeChipActive]}
              onPress={() => setWindowDays(option.value)}
            >
              <Text style={[styles.rangeChipText, windowDays === option.value && styles.rangeChipTextActive]}>
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {snapshot?.source === 'local' ? (
          <View style={styles.warningBanner}>
            <Text style={styles.warningTitle}>Remote analytics unavailable</Text>
            <Text style={styles.warningBody}>
              {snapshot.fallbackReason || 'Showing device-only activation data until the analytics stream is readable.'}
            </Text>
          </View>
        ) : null}

        <View style={styles.summaryGrid}>
          <SummaryCard
            label="Actors"
            value={String(snapshot?.actorCount || 0)}
            hint={`${snapshot?.windowDays || windowDays}-day scope`}
            tone={Colors.primary}
          />
          <SummaryCard
            label="Events"
            value={String(snapshot?.rowCount || 0)}
            hint={snapshot?.source === 'remote' ? 'analytics_events' : 'device fallback'}
            tone={Colors.secondary}
          />
          <SummaryCard
            label="Device Stage"
            value={formatStage(snapshot?.localActivation.stage)}
            hint={`${snapshot?.localActivation.progress || 0}/3 complete`}
            tone={Colors.success}
          />
        </View>

        <SectionCard
          title="Operator Priority"
          subtitle="What should get fixed next"
          rightAction={
            <View style={styles.priorityBadge}>
              <Target size={14} color={Colors.primary} />
            </View>
          }
        >
          <Text style={styles.priorityTitle}>{actionCopy.title}</Text>
          <Text style={styles.priorityDetail}>{actionCopy.detail}</Text>
        </SectionCard>

        <SectionCard
          title="Funnel"
          subtitle="Users moving from onboarding to paid"
          rightAction={<BarChart3 size={18} color={Colors.primary} />}
        >
          {snapshot?.funnel.steps.map((step) => (
            <FunnelRow key={step.key} step={step} />
          ))}
        </SectionCard>

        <SectionCard
          title="Search Quality"
          subtitle="Trust and speed in the food search loop"
          rightAction={<Search size={18} color={Colors.primary} />}
        >
          <View style={styles.metricRow}>
            <SummaryCard label="Selection" value={formatRate(snapshot?.search.selectionRate)} hint="results selected / searches started" tone={Colors.warning} />
            <SummaryCard label="Zero Results" value={formatRate(snapshot?.search.zeroResultRate)} hint="searches returning nothing" tone={Colors.error} />
          </View>
          <View style={styles.metricRow}>
            <SummaryCard label="Avg Search" value={formatLatency(snapshot?.search.avgLatencyMs)} hint="search completion latency" tone={Colors.primary} />
            <SummaryCard label="Cache Hits" value={formatRate(snapshot?.search.completed ? Math.round((snapshot.search.cacheHits / snapshot.search.completed) * 100) : null)} hint="searches served instantly" tone={Colors.success} />
          </View>
          <Text style={styles.inlineSectionTitle}>Top zero-result queries</Text>
          {snapshot?.search.topZeroResultQueries.length ? (
            snapshot.search.topZeroResultQueries.map((item) => (
              <InsightRow
                key={`zero-${item.query}`}
                label={item.query}
                secondary={item.avgLatencyMs ? `avg ${formatLatency(item.avgLatencyMs)}` : undefined}
                value={`${item.count}x`}
              />
            ))
          ) : (
            <Text style={styles.emptyText}>No zero-result searches in this window.</Text>
          )}
          <Text style={styles.inlineSectionTitle}>Slowest recurring queries</Text>
          {snapshot?.search.slowQueries.length ? (
            snapshot.search.slowQueries.slice(0, 5).map((item) => (
              <InsightRow
                key={`slow-${item.query}`}
                label={item.query}
                secondary={`${item.count} searches`}
                value={formatLatency(item.avgLatencyMs)}
              />
            ))
          ) : (
            <Text style={styles.emptyText}>No slow search patterns yet.</Text>
          )}
        </SectionCard>

        <SectionCard
          title="Barcode Quality"
          subtitle="How often scans turn into trusted results"
          rightAction={<ScanBarcode size={18} color={Colors.primary} />}
        >
          <View style={styles.metricRow}>
            <SummaryCard label="Hit Rate" value={formatRate(snapshot?.barcode.successRate)} hint="barcode found / started" tone={Colors.secondary} />
            <SummaryCard label="Avg Lookup" value={formatLatency(snapshot?.barcode.avgLatencyMs)} hint="barcode lookup latency" tone={Colors.primary} />
          </View>
          <Text style={styles.inlineSectionTitle}>Top missed barcodes</Text>
          {snapshot?.barcode.topMisses.length ? (
            snapshot.barcode.topMisses.map((item) => (
              <InsightRow
                key={`barcode-${item.barcode}`}
                label={item.barcode}
                secondary={item.avgLatencyMs ? `avg ${formatLatency(item.avgLatencyMs)}` : undefined}
                value={`${item.count}x`}
              />
            ))
          ) : (
            <Text style={styles.emptyText}>No barcode misses in this window.</Text>
          )}
        </SectionCard>

        <SectionCard
          title="Monetization"
          subtitle="Where the post-value paywall is working"
          rightAction={<TrendingUp size={18} color={Colors.primary} />}
        >
          <View style={styles.metricRow}>
            <SummaryCard label="Views" value={String(snapshot?.paywall.viewed || 0)} hint="paywall impressions" tone={Colors.primary} />
            <SummaryCard label="Conv." value={formatRate(snapshot?.paywall.conversionRate)} hint="conversions / views" tone={Colors.success} />
          </View>
          {snapshot?.paywall.sources.length ? (
            snapshot.paywall.sources.map((source) => (
              <InsightRow
                key={source.key}
                label={`${source.source} • ${source.trigger}`}
                secondary={`${source.views} views`}
                value={formatRate(source.conversionRate)}
              />
            ))
          ) : (
            <Text style={styles.emptyText}>No paywall source data in this window.</Text>
          )}
        </SectionCard>

        <SectionCard
          title="Retention"
          subtitle="Current device activation state and next nudge"
          rightAction={
            <Pressable style={styles.inlineAction} onPress={() => router.push('/(tabs)/add')}>
              <Text style={styles.inlineActionText}>Open Log</Text>
              <ChevronRight size={14} color={Colors.primary} />
            </Pressable>
          }
        >
          <InsightRow
            label="Activation stage"
            secondary="This device"
            value={formatStage(snapshot?.localActivation.stage)}
          />
          <InsightRow
            label="Time to first log"
            secondary="Onboarding complete to first meal"
            value={formatLatency(snapshot?.localActivation.metrics.timeToFirstLogMs)}
          />
          <InsightRow
            label="Time to second log"
            secondary="Onboarding complete to second meal"
            value={formatLatency(snapshot?.localActivation.metrics.timeToSecondLogMs)}
          />
        </SectionCard>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
  },
  loadingTitle: {
    fontSize: FontSize.lg,
    color: Colors.text,
    fontWeight: FontWeight.bold,
  },
  loadingHint: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  headerCopy: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  rangeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  rangeChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  rangeChipActive: {
    backgroundColor: Colors.primary + '16',
    borderColor: Colors.primary + '40',
  },
  rangeChipText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  rangeChipTextActive: {
    color: Colors.primary,
    fontWeight: FontWeight.bold,
  },
  warningBanner: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.warning + '14',
    borderWidth: 1,
    borderColor: Colors.warning + '30',
    gap: 4,
  },
  warningTitle: {
    fontSize: FontSize.sm,
    color: Colors.warning,
    fontWeight: FontWeight.bold,
  },
  warningBody: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  summaryCard: {
    flexGrow: 1,
    flexBasis: '31%',
    minWidth: 100,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  summaryValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  summaryLabel: {
    marginTop: 4,
    fontSize: FontSize.sm,
    color: Colors.text,
    fontWeight: FontWeight.semibold,
  },
  summaryHint: {
    marginTop: 2,
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },
  sectionCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  sectionHeaderCopy: {
    flex: 1,
    gap: 4,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  sectionSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  priorityBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary + '14',
  },
  priorityTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  priorityDetail: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  funnelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  funnelCopy: {
    gap: 2,
  },
  funnelLabel: {
    fontSize: FontSize.sm,
    color: Colors.text,
    fontWeight: FontWeight.semibold,
  },
  funnelCount: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  funnelRate: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: FontWeight.bold,
  },
  metricRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  inlineSectionTitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: FontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  insightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  insightCopy: {
    flex: 1,
    gap: 2,
  },
  insightLabel: {
    fontSize: FontSize.sm,
    color: Colors.text,
    fontWeight: FontWeight.medium,
  },
  insightSecondary: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  insightValue: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: FontWeight.bold,
  },
  emptyText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  inlineAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  inlineActionText: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
  },
});

import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Activity, Clock, ScanBarcode, Search, Sparkles } from 'lucide-react-native';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../constants/theme';

function formatRate(value) {
  if (typeof value !== 'number') {
    return '--';
  }

  return `${value}%`;
}

function formatDuration(value) {
  if (typeof value !== 'number' || value <= 0) {
    return '--';
  }

  if (value < 1000) {
    return '<1s';
  }

  if (value < 60_000) {
    return `${Math.round(value / 1000)}s`;
  }

  const minutes = Math.round(value / 60_000);
  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

function getActionCopy(stage, showValuePaywall) {
  if (stage === 'first_meal') {
    return {
      title: 'Log first meal',
      detail: 'Activation is still blocked on the first successful food log.',
    };
  }

  if (stage === 'first_barcode') {
    return {
      title: 'Scan first barcode',
      detail: 'The next proof point is barcode trust, not more feature browsing.',
    };
  }

  if (stage === 'repeat_log') {
    return {
      title: 'Use repeat logging',
      detail: 'Get the user to reuse a food or meal so the habit gets cheaper on the second day.',
    };
  }

  if (showValuePaywall) {
    return {
      title: 'Open Pro offer',
      detail: 'The user has felt the loop. Monetization timing is now live.',
    };
  }

  return {
    title: 'Open log flow',
    detail: 'Core loop health is live. Keep pressure on speed, trust, and conversion quality.',
  };
}

const MetricTile = memo(function MetricTile({ icon: Icon, label, value, tone = Colors.primary }) {
  return (
    <View style={styles.metricTile}>
      <View style={[styles.metricIconWrap, { backgroundColor: tone + '15' }]}>
        <Icon size={16} color={tone} strokeWidth={2.3} />
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
});

const SecondaryMetric = memo(function SecondaryMetric({ label, value }) {
  return (
    <View style={styles.secondaryMetric}>
      <Text style={styles.secondaryMetricValue}>{value}</Text>
      <Text style={styles.secondaryMetricLabel}>{label}</Text>
    </View>
  );
});

const CoreLoopMetricsCard = memo(function CoreLoopMetricsCard({
  activationStage,
  metrics,
  progress,
  showValuePaywall,
  onPrimaryAction,
}) {
  const actionCopy = useMemo(
    () => getActionCopy(activationStage, showValuePaywall),
    [activationStage, showValuePaywall]
  );

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>Core Loop</Text>
          <Text style={styles.title}>Do users reach value fast enough?</Text>
        </View>
        <View style={styles.deviceBadge}>
          <Text style={styles.deviceBadgeText}>This device</Text>
        </View>
      </View>

      <View style={styles.metricGrid}>
        <MetricTile
          icon={Activity}
          label="Activation"
          value={`${progress}/3`}
          tone={Colors.success}
        />
        <MetricTile
          icon={Clock}
          label="First Log"
          value={formatDuration(metrics.timeToFirstLogMs)}
          tone={Colors.primary}
        />
        <MetricTile
          icon={Search}
          label="Search Select"
          value={formatRate(metrics.searchSelectionRate)}
          tone={Colors.warning}
        />
        <MetricTile
          icon={ScanBarcode}
          label="Barcode Hit"
          value={formatRate(metrics.barcodeSuccessRate)}
          tone={Colors.secondary}
        />
      </View>

      <View style={styles.secondaryRow}>
        <SecondaryMetric
          label="Zero Results"
          value={formatRate(metrics.zeroResultRate)}
        />
        <SecondaryMetric
          label="Avg Search"
          value={formatDuration(metrics.avgSearchLatencyMs)}
        />
        <SecondaryMetric
          label="Paywall Conv."
          value={formatRate(metrics.paywallConversionRate)}
        />
      </View>

      <View style={styles.actionCard}>
        <View style={styles.actionIconWrap}>
          <Sparkles size={16} color={Colors.primary} strokeWidth={2.3} />
        </View>
        <View style={styles.actionCopy}>
          <Text style={styles.actionTitle}>{actionCopy.title}</Text>
          <Text style={styles.actionDetail}>{actionCopy.detail}</Text>
        </View>
      </View>

      <Pressable style={styles.ctaButton} onPress={onPrimaryAction}>
        <Text style={styles.ctaButtonText}>{actionCopy.title}</Text>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  eyebrow: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  deviceBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  deviceBadgeText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  metricTile: {
    flexGrow: 1,
    flexBasis: '47%',
    minWidth: 140,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  metricIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  metricValue: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  metricLabel: {
    marginTop: 4,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  secondaryMetric: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: 2,
  },
  secondaryMetricValue: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  secondaryMetricLabel: {
    marginTop: 2,
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },
  actionCard: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'flex-start',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primary + '10',
    borderWidth: 1,
    borderColor: Colors.primary + '22',
  },
  actionIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  actionCopy: {
    flex: 1,
    gap: 2,
  },
  actionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  actionDetail: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  ctaButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
  },
  ctaButtonText: {
    color: Colors.background,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
});

export default CoreLoopMetricsCard;

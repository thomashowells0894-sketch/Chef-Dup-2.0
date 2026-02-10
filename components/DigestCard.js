import React, { memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  Brain,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  ChevronRight,
} from 'lucide-react-native';
import {
  Colors,
  Spacing,
  FontSize,
  FontWeight,
  BorderRadius,
  Shadows,
} from '../constants/theme';

const TYPE_COLORS = {
  success: Colors.success,
  warning: Colors.warning,
  tip: Colors.primary,
};

const TYPE_ICONS = {
  success: TrendingUp,
  warning: AlertTriangle,
  tip: Lightbulb,
};

function getScoreColor(score) {
  if (score > 70) return Colors.success;
  if (score >= 40) return Colors.warning;
  return Colors.error;
}

function ScoreBadge({ score }) {
  const color = getScoreColor(score);
  return (
    <View style={[styles.scoreBadge, { borderColor: color }]}>
      <Text style={[styles.scoreText, { color }]}>{score}</Text>
    </View>
  );
}

function InsightRow({ insight }) {
  const borderColor = TYPE_COLORS[insight.type] || Colors.primary;
  return (
    <View style={[styles.insightRow, { borderLeftColor: borderColor }]}>
      <Text style={styles.insightEmoji}>{insight.emoji}</Text>
      <View style={styles.insightContent}>
        <Text style={styles.insightTitle} numberOfLines={1}>
          {insight.title}
        </Text>
        <Text style={styles.insightBody} numberOfLines={2}>
          {insight.body}
        </Text>
      </View>
    </View>
  );
}

function LoadingState() {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconCircle}>
            <Brain size={18} color={Colors.primary} />
          </View>
          <Text style={styles.title}>Weekly Insights</Text>
        </View>
      </View>
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={Colors.primary} />
        <Text style={styles.loadingText}>Generating your weekly digest...</Text>
      </View>
    </View>
  );
}

function DigestCard({ digest, onViewFull }) {
  if (!digest) {
    return <LoadingState />;
  }

  const visibleInsights = digest.insights.slice(0, 3);

  return (
    <Animated.View
      entering={FadeInDown.springify().damping(12)}
      style={styles.card}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconCircle}>
            <Brain size={18} color={Colors.primary} />
          </View>
          <Text style={styles.title}>Weekly Insights</Text>
        </View>
        <ScoreBadge score={digest.weeklyScore} />
      </View>

      {/* Headline */}
      <Text style={styles.headline}>{digest.headline}</Text>

      {/* Insights */}
      <View style={styles.insightsContainer}>
        {visibleInsights.map((insight, index) => (
          <InsightRow key={index} insight={insight} />
        ))}
      </View>

      {/* Motivational Quote */}
      {digest.motivationalQuote ? (
        <Text style={styles.quote}>"{digest.motivationalQuote}"</Text>
      ) : null}

      {/* View Full Report */}
      {onViewFull ? (
        <Pressable style={styles.viewFullButton} onPress={onViewFull}>
          <Text style={styles.viewFullText}>View Full Report</Text>
          <ChevronRight size={16} color={Colors.primary} />
        </Pressable>
      ) : null}
    </Animated.View>
  );
}

export default memo(DigestCard);

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceGlass,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    ...Shadows.card,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  scoreBadge: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.full,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  headline: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  insightsContainer: {
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    borderLeftWidth: 3,
    paddingLeft: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  insightEmoji: {
    fontSize: 18,
    marginTop: 1,
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginBottom: 2,
  },
  insightBody: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    lineHeight: FontSize.xs * 1.4,
  },
  quote: {
    fontSize: FontSize.xs,
    fontStyle: 'italic',
    color: Colors.textTertiary,
    textAlign: 'center',
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
  viewFullButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.primarySoft,
    borderRadius: BorderRadius.lg,
  },
  viewFullText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.sm,
  },
  loadingText: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
  },
});

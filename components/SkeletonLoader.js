import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import ReAnimated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, BorderRadius, Spacing } from '../constants/theme';

const SHIMMER_WIDTH = 200;

// Base skeleton element with horizontal shimmer sweep
export function SkeletonBox({ width, height, borderRadius = BorderRadius.md, style }) {
  const shimmer = useSharedValue(-SHIMMER_WIDTH);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    if (containerWidth > 0) {
      shimmer.value = -SHIMMER_WIDTH;
      shimmer.value = withRepeat(
        withTiming(containerWidth, { duration: 1500 }),
        -1,
        false
      );
    }
  }, [containerWidth]);

  const sweepStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmer.value }],
  }));

  return (
    <View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: Colors.surfaceGlass,
          overflow: 'hidden',
        },
        style,
      ]}
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
    >
      <ReAnimated.View style={[{ position: 'absolute', top: 0, bottom: 0, width: SHIMMER_WIDTH }, sweepStyle]}>
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.15)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ flex: 1 }}
        />
      </ReAnimated.View>
    </View>
  );
}

// Common skeleton layouts
export function SkeletonText({ width = '80%', height = 14, style }) {
  return <SkeletonBox width={width} height={height} borderRadius={4} style={style} />;
}

export function SkeletonCircle({ size = 40, style }) {
  return <SkeletonBox width={size} height={size} borderRadius={size / 2} style={style} />;
}

// Pre-built skeleton screens
export function DashboardSkeleton() {
  return (
    <View style={skeletonStyles.container}>
      {/* Header skeleton */}
      <View style={skeletonStyles.row}>
        <SkeletonCircle size={44} />
        <View style={{ flex: 1, marginLeft: Spacing.md }}>
          <SkeletonText width="60%" />
          <SkeletonText width="40%" height={12} style={{ marginTop: 6 }} />
        </View>
        <SkeletonCircle size={36} />
      </View>

      {/* Calorie card skeleton */}
      <SkeletonBox width="100%" height={180} borderRadius={BorderRadius.xl} style={{ marginTop: Spacing.lg }} />

      {/* Stats row */}
      <View style={[skeletonStyles.row, { marginTop: Spacing.md }]}>
        <SkeletonBox width="30%" height={80} borderRadius={BorderRadius.lg} />
        <SkeletonBox width="30%" height={80} borderRadius={BorderRadius.lg} />
        <SkeletonBox width="30%" height={80} borderRadius={BorderRadius.lg} />
      </View>

      {/* Action cards */}
      <SkeletonBox width="100%" height={100} borderRadius={BorderRadius.xl} style={{ marginTop: Spacing.md }} />
      <SkeletonBox width="100%" height={100} borderRadius={BorderRadius.xl} style={{ marginTop: Spacing.sm }} />
    </View>
  );
}

export function CardSkeleton() {
  return (
    <View style={skeletonStyles.card}>
      <View style={skeletonStyles.row}>
        <SkeletonCircle size={36} />
        <View style={{ flex: 1, marginLeft: Spacing.sm }}>
          <SkeletonText width="70%" />
          <SkeletonText width="50%" height={12} style={{ marginTop: 6 }} />
        </View>
      </View>
    </View>
  );
}

export function ListSkeleton({ count = 5 }) {
  return (
    <View>
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </View>
  );
}

export function ChartSkeleton() {
  return (
    <View style={skeletonStyles.chartContainer}>
      <SkeletonText width="40%" style={{ marginBottom: Spacing.sm }} />
      <View style={skeletonStyles.chartBars}>
        {[60, 80, 45, 90, 70, 55, 85].map((h, i) => (
          <SkeletonBox key={i} width={24} height={h} borderRadius={4} />
        ))}
      </View>
    </View>
  );
}

export function ProfileSkeleton() {
  return (
    <View style={skeletonStyles.container}>
      {/* Avatar skeleton */}
      <View style={{ alignItems: 'center', marginBottom: Spacing.lg }}>
        <SkeletonCircle size={80} />
        <SkeletonText width="40%" style={{ marginTop: Spacing.md }} />
        <SkeletonText width="60%" height={12} style={{ marginTop: 6 }} />
      </View>

      {/* Level card skeleton */}
      <SkeletonBox width="100%" height={140} borderRadius={BorderRadius.xl} style={{ marginBottom: Spacing.lg }} />

      {/* Form fields skeleton */}
      <SkeletonText width="30%" height={12} style={{ marginBottom: Spacing.sm }} />
      <SkeletonBox width="100%" height={60} borderRadius={BorderRadius.lg} style={{ marginBottom: Spacing.sm }} />
      <SkeletonBox width="100%" height={60} borderRadius={BorderRadius.lg} style={{ marginBottom: Spacing.sm }} />
      <SkeletonBox width="100%" height={60} borderRadius={BorderRadius.lg} style={{ marginBottom: Spacing.lg }} />

      {/* Another section */}
      <SkeletonText width="30%" height={12} style={{ marginBottom: Spacing.sm }} />
      <SkeletonBox width="100%" height={60} borderRadius={BorderRadius.lg} style={{ marginBottom: Spacing.sm }} />
      <SkeletonBox width="100%" height={60} borderRadius={BorderRadius.lg} />
    </View>
  );
}

// Legacy exports for backward compatibility
export const StatCardSkeleton = ({ style }) => (
  <View style={[skeletonStyles.statCard, style]}>
    <SkeletonBox width={32} height={32} borderRadius={16} />
    <SkeletonBox width={60} height={24} style={{ marginTop: Spacing.sm }} />
    <SkeletonBox width={40} height={12} style={{ marginTop: 4 }} />
  </View>
);

export const ListItemSkeleton = ({ style }) => (
  <View style={[skeletonStyles.listItem, style]}>
    <SkeletonBox width={36} height={36} borderRadius={18} />
    <View style={skeletonStyles.listItemContent}>
      <SkeletonBox width={140} height={14} />
      <SkeletonBox width={90} height={11} style={{ marginTop: 4 }} />
    </View>
    <SkeletonBox width={50} height={24} borderRadius={12} />
  </View>
);

export function DiarySkeleton() {
  return (
    <View style={skeletonStyles.container}>
      {/* Date navigator */}
      <View style={[skeletonStyles.row, { justifyContent: 'center', gap: Spacing.lg, marginBottom: Spacing.lg }]}>
        <SkeletonBox width={32} height={32} borderRadius={16} />
        <SkeletonText width={140} height={18} />
        <SkeletonBox width={32} height={32} borderRadius={16} />
      </View>

      {/* Calorie summary */}
      <SkeletonBox width="100%" height={120} borderRadius={BorderRadius.xl} style={{ marginBottom: Spacing.lg }} />

      {/* Meal sections */}
      {['Breakfast', 'Lunch', 'Dinner'].map((meal) => (
        <View key={meal} style={{ marginBottom: Spacing.md }}>
          <View style={[skeletonStyles.row, { marginBottom: Spacing.sm }]}>
            <SkeletonText width={80} height={14} />
            <SkeletonText width={50} height={12} />
          </View>
          <SkeletonBox width="100%" height={60} borderRadius={BorderRadius.lg} style={{ marginBottom: Spacing.xs }} />
          <SkeletonBox width="100%" height={60} borderRadius={BorderRadius.lg} />
        </View>
      ))}
    </View>
  );
}

export function StatsSkeleton() {
  return (
    <View style={skeletonStyles.container}>
      {/* Period selector */}
      <View style={[skeletonStyles.row, { justifyContent: 'center', gap: Spacing.sm, marginBottom: Spacing.lg }]}>
        {['Week', 'Month', '3M', 'Year'].map((p) => (
          <SkeletonBox key={p} width={60} height={32} borderRadius={BorderRadius.full} />
        ))}
      </View>

      {/* Main chart */}
      <SkeletonBox width="100%" height={200} borderRadius={BorderRadius.xl} style={{ marginBottom: Spacing.lg }} />

      {/* Metric cards row */}
      <View style={[skeletonStyles.row, { gap: Spacing.sm, marginBottom: Spacing.lg }]}>
        <SkeletonBox width="48%" height={100} borderRadius={BorderRadius.lg} />
        <SkeletonBox width="48%" height={100} borderRadius={BorderRadius.lg} />
      </View>

      {/* Secondary chart */}
      <SkeletonBox width="100%" height={160} borderRadius={BorderRadius.xl} style={{ marginBottom: Spacing.md }} />

      {/* Insights */}
      <SkeletonBox width="100%" height={80} borderRadius={BorderRadius.lg} style={{ marginBottom: Spacing.sm }} />
      <SkeletonBox width="100%" height={80} borderRadius={BorderRadius.lg} />
    </View>
  );
}

// Default export for backward compatibility
export default SkeletonBox;

const skeletonStyles = StyleSheet.create({
  container: { padding: Spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  card: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  chartContainer: { padding: Spacing.md },
  chartBars: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', height: 100 },
  statCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  listItemContent: {
    flex: 1,
  },
});

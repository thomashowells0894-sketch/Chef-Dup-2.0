import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInUp, FadeOutDown } from 'react-native-reanimated';
import { Award } from 'lucide-react-native';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius, Shadows } from '../constants/theme';

const AUTO_DISMISS_MS = 4000;

const PR_LABELS = {
  weight: 'Weight',
  reps: 'Reps',
  volume: 'Volume',
};

const PR_UNITS = {
  weight: 'lbs',
  reps: 'reps',
  volume: 'lbs total',
};

export default function PRCelebration({ visible, exerciseName, prType, value, onDismiss }) {
  useEffect(() => {
    if (!visible) return;

    const timer = setTimeout(() => {
      onDismiss?.();
    }, AUTO_DISMISS_MS);

    return () => clearTimeout(timer);
  }, [visible, onDismiss]);

  if (!visible) return null;

  const label = PR_LABELS[prType] || 'Record';
  const unit = PR_UNITS[prType] || '';

  return (
    <Animated.View entering={FadeInUp} exiting={FadeOutDown} style={styles.container}>
      <View style={styles.card}>
        {/* Gold accent bar */}
        <View style={styles.accentBar} />

        <View style={styles.content}>
          {/* Trophy icon */}
          <View style={styles.iconContainer}>
            <Award size={24} color={Colors.gold} />
          </View>

          {/* Text content */}
          <View style={styles.textContainer}>
            <Text style={styles.prBadge}>NEW PR!</Text>
            <Text style={styles.exerciseName} numberOfLines={1}>
              {exerciseName}
            </Text>
            <Text style={styles.prDetail}>
              {label}: {value} {unit}
            </Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    left: Spacing.md,
    right: Spacing.md,
    zIndex: 1000,
  },
  card: {
    backgroundColor: Colors.surfaceGlass,
    borderWidth: 1,
    borderColor: Colors.goldSoft,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadows.glowWarning,
  },
  accentBar: {
    height: 3,
    backgroundColor: Colors.gold,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    gap: Spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.goldSoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  prBadge: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.black,
    color: Colors.gold,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  exerciseName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginTop: 2,
  },
  prDetail: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});

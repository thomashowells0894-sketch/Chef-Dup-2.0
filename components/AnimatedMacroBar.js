import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../constants/theme';

const SPRING_CONFIG = { damping: 15, stiffness: 100, mass: 0.5 };

export default function AnimatedMacroBar({
  label,
  current,
  target,
  color,
  unit = 'g',
  delay = 0,
}) {
  const progress = useSharedValue(0);
  const percentage = target > 0 ? Math.min(current / target, 1.5) : 0;
  const isOver = current > target;

  useEffect(() => {
    progress.value = withDelay(delay, withSpring(percentage, SPRING_CONFIG));
  }, [percentage, delay]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${interpolate(progress.value, [0, 1], [0, 100], Extrapolation.CLAMP)}%`,
  }));

  const overflowStyle = useAnimatedStyle(() => {
    const overAmount = interpolate(
      progress.value,
      [1, 1.5],
      [0, 100],
      Extrapolation.CLAMP
    );
    return {
      width: `${overAmount}%`,
      opacity: progress.value > 1 ? 0.4 : 0,
    };
  });

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <View style={styles.labelLeft}>
          <View style={[styles.dot, { backgroundColor: color }]} />
          <Text style={styles.label}>{label}</Text>
        </View>
        <Text style={[styles.value, isOver && styles.valueOver]}>
          {Math.round(current)}{unit} / {Math.round(target)}{unit}
        </Text>
      </View>
      <View style={styles.trackOuter}>
        <LinearGradient
          colors={['rgba(255, 255, 255, 0.06)', 'rgba(255, 255, 255, 0.02)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.track}
        >
          <Animated.View style={[styles.fill, barStyle]}>
            <LinearGradient
              colors={[color, `${color}99`]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.fillGradient}
            />
          </Animated.View>
          <Animated.View style={[styles.overflow, { backgroundColor: Colors.error }, overflowStyle]} />
        </LinearGradient>
        <View style={styles.trackBorder} />
      </View>
    </View>
  );
}

export function MacroBarGroup({ protein, carbs, fat, goals, delay = 0 }) {
  return (
    <View style={styles.group}>
      <AnimatedMacroBar
        label="Protein"
        current={protein}
        target={goals.protein}
        color={Colors.primary}
        delay={delay}
      />
      <AnimatedMacroBar
        label="Carbs"
        current={carbs}
        target={goals.carbs}
        color={Colors.warning}
        delay={delay + 100}
      />
      <AnimatedMacroBar
        label="Fat"
        current={fat}
        target={goals.fat}
        color={Colors.secondary}
        delay={delay + 200}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.sm,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  labelLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
  },
  value: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  valueOver: {
    color: Colors.error,
  },
  trackOuter: {
    position: 'relative',
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
  },
  track: {
    height: 8,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  trackBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    pointerEvents: 'none',
  },
  fill: {
    height: '100%',
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
  },
  fillGradient: {
    flex: 1,
  },
  overflow: {
    height: '100%',
    position: 'absolute',
    right: 0,
    top: 0,
  },
  group: {
    gap: Spacing.sm,
  },
});

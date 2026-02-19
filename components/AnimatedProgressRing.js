/**
 * AnimatedProgressRing - Premium animated circular progress indicator
 * with gradient fill, glow effects, and smooth animations.
 */
import React, { useEffect, useRef, memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useAnimatedProps, useSharedValue, withTiming, Easing, useAnimatedReaction, runOnJS } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { Colors, FontSize, FontWeight } from '../constants/theme';
import { hapticSuccess } from '../lib/haptics';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function AnimatedProgressRing({
  progress = 0,
  size = 120,
  strokeWidth = 10,
  color = Colors.primary,
  gradientEnd,
  backgroundColor = 'rgba(255,255,255,0.08)',
  label,
  value,
  unit,
  subtitle,
  showPercentage = false,
  animationDuration = 1000,
  children,
}) {
  const animatedProgress = useSharedValue(0);
  const hasHapticked = useRef(false);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  useEffect(() => {
    const targetValue = Math.min(1, Math.max(0, progress / 100));
    // Reset haptic flag when progress drops below 100%
    if (progress < 100) hasHapticked.current = false;
    animatedProgress.value = withTiming(targetValue, {
      duration: animationDuration,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });
  }, [progress, animationDuration]);

  // Fire haptic at the exact moment the animation reaches 100%
  useAnimatedReaction(
    () => animatedProgress.value,
    (current, previous) => {
      if (previous !== null && previous < 1 && current >= 1) {
        runOnJS(hapticSuccess)();
      }
    }
  );

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - animatedProgress.value),
  }));

  const gradientId = `grad_${size}_${color.replace('#', '')}`;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Defs>
          <SvgGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={color} />
            <Stop offset="100%" stopColor={gradientEnd || color} />
          </SvgGradient>
        </Defs>
        {/* Background circle */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress circle */}
        <AnimatedCircle
          cx={center}
          cy={center}
          r={radius}
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          rotation="-90"
          origin={`${center}, ${center}`}
        />
      </Svg>
      <View style={styles.content}>
        {children || (
          <>
            {value !== undefined && (
              <View style={styles.valueRow}>
                <Text style={[styles.value, { fontSize: size > 100 ? FontSize.xxl : FontSize.xl }]}>{value}</Text>
                {unit && <Text style={styles.unit}>{unit}</Text>}
              </View>
            )}
            {showPercentage && value === undefined && (
              <Text style={[styles.value, { fontSize: size > 100 ? FontSize.xxl : FontSize.xl }]}>{Math.round(progress)}%</Text>
            )}
            {label && <Text style={styles.label} numberOfLines={1}>{label}</Text>}
            {subtitle && <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { justifyContent: 'center', alignItems: 'center' },
  content: { position: 'absolute', justifyContent: 'center', alignItems: 'center' },
  valueRow: { flexDirection: 'row', alignItems: 'baseline' },
  value: { color: Colors.text, fontWeight: FontWeight.bold },
  unit: { color: Colors.textSecondary, fontSize: FontSize.sm, marginLeft: 2 },
  label: { color: Colors.textSecondary, fontSize: FontSize.xs, marginTop: 2 },
  subtitle: { color: Colors.textTertiary, fontSize: FontSize.xs },
});

export default memo(AnimatedProgressRing);

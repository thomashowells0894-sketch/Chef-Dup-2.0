/**
 * WorkoutTimer - Countdown + Stopwatch modes with animated circular progress ring.
 * Haptic feedback at 3, 2, 1, 0. Customizable duration. Pause/resume/reset.
 */
import React, { useEffect, useRef, memo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
  FadeIn,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { Pause, Play, RotateCcw } from 'lucide-react-native';
import { hapticLight, hapticHeavy, hapticSuccess } from '../lib/haptics';
import {
  Colors,
  Spacing,
  FontSize,
  FontWeight,
  BorderRadius,
} from '../constants/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function WorkoutTimer({
  // Stopwatch mode: mode='stopwatch', elapsedSeconds controls display
  // Countdown mode: mode='countdown', totalSeconds & remainingSeconds control display
  mode = 'stopwatch',
  elapsedSeconds = 0,
  totalSeconds = 60,
  remainingSeconds = 60,
  isPaused = false,
  size = 100,
  strokeWidth = 6,
  color = Colors.primary,
  onPause,
  onResume,
  onReset,
  compact = false,
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  const animatedProgress = useSharedValue(mode === 'stopwatch' ? 1 : 1);
  const lastHapticRef = useRef(-1);

  // Update progress animation
  useEffect(() => {
    if (mode === 'countdown' && totalSeconds > 0) {
      const progress = remainingSeconds / totalSeconds;
      animatedProgress.value = withTiming(Math.max(0, Math.min(1, progress)), {
        duration: 900,
        easing: Easing.linear,
      });
    }
  }, [remainingSeconds, totalSeconds, mode]);

  // Haptic feedback at 3, 2, 1, 0 for countdown
  useEffect(() => {
    if (mode !== 'countdown') return;
    if (remainingSeconds <= 3 && remainingSeconds >= 0 && remainingSeconds !== lastHapticRef.current) {
      lastHapticRef.current = remainingSeconds;
      if (remainingSeconds === 0) {
        hapticSuccess();
      } else {
        hapticHeavy();
      }
    }
  }, [remainingSeconds, mode]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - animatedProgress.value),
  }));

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const displayTime =
    mode === 'stopwatch' ? formatTime(elapsedSeconds) : formatTime(remainingSeconds);

  const label = mode === 'stopwatch' ? 'Elapsed' : 'Rest';

  if (compact) {
    return (
      <Animated.View entering={FadeIn} style={compactStyles.container}>
        <View style={[compactStyles.dot, { backgroundColor: isPaused ? Colors.warning : color }]} />
        <Text style={compactStyles.time}>{displayTime}</Text>
        {onPause && onResume && (
          <Pressable
            style={compactStyles.button}
            onPress={() => {
              hapticLight();
              isPaused ? onResume() : onPause();
            }}
            hitSlop={8}
          >
            {isPaused ? (
              <Play size={14} color={Colors.text} />
            ) : (
              <Pause size={14} color={Colors.text} />
            )}
          </Pressable>
        )}
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={FadeIn} style={styles.container}>
      <View style={[styles.ringContainer, { width: size, height: size }]}>
        <Svg width={size} height={size}>
          {/* Background ring */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Progress ring */}
          <AnimatedCircle
            cx={center}
            cy={center}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={circumference}
            animatedProps={animatedProps}
            rotation="-90"
            origin={`${center}, ${center}`}
          />
        </Svg>
        {/* Center content */}
        <View style={styles.centerContent}>
          <Text style={styles.timeText}>{displayTime}</Text>
          <Text style={styles.label}>{label}</Text>
        </View>
      </View>

      {/* Controls */}
      {(onPause || onResume || onReset) && (
        <View style={styles.controls}>
          {onReset && (
            <Pressable
              style={styles.controlButton}
              onPress={() => {
                hapticLight();
                onReset();
              }}
              hitSlop={8}
            >
              <RotateCcw size={18} color={Colors.textSecondary} />
            </Pressable>
          )}
          {onPause && onResume && (
            <Pressable
              style={[styles.controlButton, styles.mainControlButton, { backgroundColor: color + '20' }]}
              onPress={() => {
                hapticLight();
                isPaused ? onResume() : onPause();
              }}
              hitSlop={8}
            >
              {isPaused ? (
                <Play size={20} color={color} />
              ) : (
                <Pause size={20} color={color} />
              )}
            </Pressable>
          )}
        </View>
      )}
    </Animated.View>
  );
}

const compactStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs + 2,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  time: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    fontVariant: ['tabular-nums'],
  },
  button: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  ringContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContent: {
    position: 'absolute',
    alignItems: 'center',
  },
  timeText: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    fontVariant: ['tabular-nums'],
  },
  label: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: -2,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  controlButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainControlButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
});

export default memo(WorkoutTimer);

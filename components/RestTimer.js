import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import RNAnimated, { FadeInUp, FadeOutDown } from 'react-native-reanimated';
import { hapticSuccess } from '../lib/haptics';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius, Shadows } from '../constants/theme';

const TIMER_SIZE = 100;
const RING_WIDTH = 4;

export default function RestTimer({ seconds = 60, onComplete, onSkip, visible }) {
  const [remaining, setRemaining] = useState(seconds);
  const progressAnim = useRef(new Animated.Value(1)).current;

  // Reset when timer becomes visible or seconds change
  useEffect(() => {
    if (visible) {
      setRemaining(seconds);
      progressAnim.setValue(1);
    }
  }, [visible, seconds]);

  // Countdown interval
  useEffect(() => {
    if (!visible || remaining <= 0) return;

    const interval = setInterval(() => {
      setRemaining((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          clearInterval(interval);
          hapticSuccess();
          onComplete?.();
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [visible, remaining <= 0]);

  // Animate progress ring
  useEffect(() => {
    if (!visible || seconds === 0) return;
    Animated.timing(progressAnim, {
      toValue: remaining / seconds,
      duration: 950,
      useNativeDriver: false,
    }).start();
  }, [remaining, visible]);

  if (!visible) return null;

  const formatTime = (s) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    if (mins > 0) return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    return `${secs}`;
  };

  // Progress ring via border trick (simplified circular progress)
  const ringRotation = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <RNAnimated.View entering={FadeInUp} exiting={FadeOutDown} style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.label}>Rest Timer</Text>

        {/* Circular countdown */}
        <View style={styles.timerRing}>
          {/* Background ring */}
          <View style={styles.ringBackground} />
          {/* Progress ring overlay */}
          <Animated.View
            style={[
              styles.ringProgress,
              { transform: [{ rotate: ringRotation }] },
            ]}
          />
          {/* Center content */}
          <View style={styles.timerCenter}>
            <Text style={styles.timerText}>{formatTime(remaining)}</Text>
            <Text style={styles.timerUnit}>{remaining > 60 ? 'min' : 'sec'}</Text>
          </View>
        </View>

        <Pressable style={styles.skipButton} onPress={onSkip} hitSlop={12}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </View>
    </RNAnimated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 999,
  },
  card: {
    backgroundColor: Colors.surfaceGlass,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    ...Shadows.card,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  timerRing: {
    width: TIMER_SIZE,
    height: TIMER_SIZE,
    borderRadius: TIMER_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  ringBackground: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: TIMER_SIZE / 2,
    borderWidth: RING_WIDTH,
    borderColor: Colors.border,
  },
  ringProgress: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: TIMER_SIZE / 2,
    borderWidth: RING_WIDTH,
    borderColor: Colors.primary,
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  timerCenter: {
    alignItems: 'center',
  },
  timerText: {
    fontSize: FontSize.xxxl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  timerUnit: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: -4,
  },
  skipButton: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
  skipText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.textTertiary,
  },
});

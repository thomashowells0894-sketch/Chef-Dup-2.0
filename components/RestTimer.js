/**
 * RestTimer - Full-screen overlay with circular countdown.
 *
 * Features:
 * - Auto-starts after set completion
 * - Animated circular progress ring
 * - Skip button
 * - Extend +30s button
 * - Haptic feedback at 3, 2, 1, 0
 * - Configurable duration presets
 */
import React, { useEffect, useRef, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions } from 'react-native';
import Animated, { FadeIn, FadeOut, useSharedValue, useAnimatedProps, withTiming, Easing } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { X, Plus, Timer, SkipForward } from 'lucide-react-native';
import { hapticLight, hapticHeavy, hapticSuccess } from '../lib/haptics';
import {
  Colors,
  Spacing,
  FontSize,
  FontWeight,
  BorderRadius,
  Shadows,
} from '../constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const RING_SIZE = Math.min(SCREEN_WIDTH * 0.55, 220);
const RING_STROKE = 8;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const REST_PRESETS = [60, 90, 120, 180];

export default function RestTimer({
  visible,
  seconds = 60,
  remaining,
  totalSeconds,
  onComplete,
  onSkip,
  onExtend,
  // Legacy props (for generate-workout compat)
  onDismiss,
}) {
  const lastHapticRef = useRef(-1);
  const radius = (RING_SIZE - RING_STROKE) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = RING_SIZE / 2;

  // Determine effective values (support both legacy and new API)
  const effectiveTotal = totalSeconds || seconds;
  const effectiveRemaining = remaining !== undefined ? remaining : null;

  // Legacy internal timer state
  const [legacyRemaining, setLegacyRemaining] = React.useState(seconds);
  const isLegacy = remaining === undefined;
  const displayRemaining = isLegacy ? legacyRemaining : effectiveRemaining;

  // Reset legacy timer when visible/seconds change
  useEffect(() => {
    if (isLegacy && visible) {
      setLegacyRemaining(seconds);
      lastHapticRef.current = -1;
    }
  }, [visible, seconds, isLegacy]);

  // Legacy countdown
  useEffect(() => {
    if (!isLegacy || !visible || legacyRemaining <= 0) return;

    const interval = setInterval(() => {
      setLegacyRemaining((prev) => {
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
  }, [visible, legacyRemaining <= 0, isLegacy]);

  // Animated progress
  const animatedProgress = useSharedValue(1);

  useEffect(() => {
    if (!visible || effectiveTotal === 0) return;
    const progress = (displayRemaining || 0) / effectiveTotal;
    animatedProgress.value = withTiming(Math.max(0, Math.min(1, progress)), {
      duration: 900,
      easing: Easing.linear,
    });
  }, [displayRemaining, visible, effectiveTotal]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - animatedProgress.value),
  }));

  // Haptics at 3, 2, 1, 0
  useEffect(() => {
    if (!visible) return;
    const r = displayRemaining || 0;
    if (r <= 3 && r >= 0 && r !== lastHapticRef.current) {
      lastHapticRef.current = r;
      if (r === 0) {
        hapticSuccess();
        if (!isLegacy) onComplete?.();
      } else {
        hapticHeavy();
      }
    }
  }, [displayRemaining, visible]);

  const formatTime = (s) => {
    if (s === null || s === undefined) return '0:00';
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Determine ring color based on remaining time
  const ringColor = useMemo(() => {
    const r = displayRemaining || 0;
    const total = effectiveTotal || 1;
    const ratio = r / total;
    if (ratio > 0.5) return Colors.primary;
    if (ratio > 0.2) return Colors.warning;
    return Colors.error;
  }, [displayRemaining, effectiveTotal]);

  const handleSkip = () => {
    hapticLight();
    if (onSkip) {
      onSkip();
    } else if (onDismiss) {
      onDismiss();
    } else {
      onComplete?.();
    }
  };

  const handleExtend = () => {
    hapticLight();
    if (onExtend) {
      onExtend(30);
    } else if (isLegacy) {
      setLegacyRemaining((prev) => prev + 30);
    }
  };

  if (!visible) return null;

  return (
    <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={styles.overlay}>
      <View style={styles.backdrop} />

      <View style={styles.content}>
        {/* Title */}
        <View style={styles.headerRow}>
          <Timer size={20} color={Colors.textSecondary} />
          <Text style={styles.title}>Rest Timer</Text>
        </View>

        {/* Circular countdown */}
        <View style={[styles.ringContainer, { width: RING_SIZE, height: RING_SIZE }]}>
          <Svg width={RING_SIZE} height={RING_SIZE}>
            {/* Background ring */}
            <Circle
              cx={center}
              cy={center}
              r={radius}
              stroke="rgba(255,255,255,0.08)"
              strokeWidth={RING_STROKE}
              fill="none"
            />
            {/* Progress ring */}
            <AnimatedCircle
              cx={center}
              cy={center}
              r={radius}
              stroke={ringColor}
              strokeWidth={RING_STROKE}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={circumference}
              animatedProps={animatedProps}
              rotation="-90"
              origin={`${center}, ${center}`}
            />
          </Svg>
          <View style={styles.centerContent} accessibilityLiveRegion="polite">
            <Text style={styles.timeText}>{formatTime(displayRemaining)}</Text>
            <Text style={styles.timeSubLabel}>
              of {formatTime(effectiveTotal)}
            </Text>
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.actions}>
          {/* Extend +30s */}
          <Pressable style={styles.extendButton} onPress={handleExtend}>
            <Plus size={18} color={Colors.primary} />
            <Text style={styles.extendText}>+30s</Text>
          </Pressable>

          {/* Skip */}
          <Pressable style={styles.skipButton} onPress={handleSkip}>
            <SkipForward size={18} color={Colors.text} />
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
  },
  content: {
    alignItems: 'center',
    padding: Spacing.xl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  ringContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  centerContent: {
    position: 'absolute',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 56,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    fontVariant: ['tabular-nums'],
  },
  timeSubLabel: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    marginTop: -4,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  extendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.primarySoft,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
  },
  extendText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
  },
  skipText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
});

import React, { useEffect, useCallback, memo } from 'react';
import { StyleSheet, Pressable, View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { hapticImpact } from '../lib/haptics';
import { Colors, Shadows, FontSize, FontWeight, BorderRadius, Spacing } from '../constants/theme';

// Premium accent colors
const ACCENT = Colors.primary; // Electric Blue
const ACCENT_DIM = Colors.primaryDim;

/**
 * AIFab - Animated Floating AI Chat Button with breathing glow.
 *
 * When a proactive coaching message is available (via hasProactiveMessage),
 * shows a notification badge/dot to draw user attention.
 *
 * Props:
 * - onPress: () => void
 * - hasProactiveMessage: boolean (optional) - shows a notification dot
 * - proactivePreview: string (optional) - short text to show near the FAB
 */
const AIFab = memo(function AIFab({ onPress, hasProactiveMessage, proactivePreview }) {
  const scale = useSharedValue(1);
  const glowIntensity = useSharedValue(0);
  const badgePulse = useSharedValue(1);

  useEffect(() => {
    // Breathing glow — runs entirely on UI thread
    glowIntensity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1800 }),
        withTiming(0, { duration: 1800 })
      ),
      -1
    );
  }, []);

  // Pulse the notification badge when a proactive message appears
  useEffect(() => {
    if (hasProactiveMessage) {
      badgePulse.value = withRepeat(
        withSequence(
          withTiming(1.3, { duration: 600 }),
          withTiming(1, { duration: 600 })
        ),
        3 // Pulse 3 times then stop
      );
    }
  }, [hasProactiveMessage]);

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.9, { damping: 12, stiffness: 400 });
  }, []);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 8, stiffness: 200 });
  }, []);

  const handlePress = useCallback(async () => {
    await hapticImpact();
    onPress?.();
  }, [onPress]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const badgeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgePulse.value }],
  }));

  return (
    <View style={styles.fabContainer}>
      {/* Proactive message preview bubble */}
      {hasProactiveMessage && proactivePreview ? (
        <Animated.View style={styles.previewBubble}>
          <Text style={styles.previewText} numberOfLines={2}>
            {proactivePreview}
          </Text>
          <View style={styles.previewArrow} />
        </Animated.View>
      ) : null}

      <Pressable onPress={handlePress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
        <Animated.View
          style={[
            styles.fabButton,
            Shadows.fab,
            animatedStyle,
          ]}
        >
          <LinearGradient
            colors={[ACCENT, ACCENT_DIM]}
            style={styles.fabGradient}
          >
            <Sparkles size={24} color="#000" strokeWidth={2.5} />
          </LinearGradient>

          {/* Notification badge/dot */}
          {hasProactiveMessage && (
            <Animated.View style={[styles.notificationDot, badgeAnimatedStyle]}>
              <View style={styles.notificationDotInner} />
            </Animated.View>
          )}
        </Animated.View>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  fabContainer: {
    alignItems: 'flex-end',
  },
  fabButton: {
    borderRadius: 28,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationDotInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.error,
  },
  previewBubble: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.sm,
    maxWidth: 220,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  previewText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    lineHeight: FontSize.xs * 1.4,
  },
  previewArrow: {
    position: 'absolute',
    bottom: -6,
    right: 20,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: Colors.surfaceElevated,
  },
});

export default AIFab;

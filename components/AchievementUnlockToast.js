/**
 * AchievementUnlockToast
 *
 * Pop-up notification when an achievement is unlocked:
 * - Slides in from top
 * - Achievement icon + name + XP reward
 * - Rarity border color
 * - Tap to view details
 * - Auto-dismiss after 4 seconds
 */

import React, { useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  withSequence,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Trophy, Zap } from 'lucide-react-native';
import { hapticSuccess } from '../lib/haptics';
import { RARITY_COLORS } from '../lib/achievementEngine';
import {
  Colors,
  Spacing,
  FontSize,
  FontWeight,
  BorderRadius,
  Shadows,
} from '../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TOAST_HEIGHT = 84;
const AUTO_DISMISS_MS = 4000;

export default function AchievementUnlockToast({
  visible,
  achievement, // { name, icon, xpReward, rarity }
  onDismiss,
  onPress,
}) {
  const translateY = useSharedValue(-TOAST_HEIGHT - 60);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.9);
  const dismissTimerRef = useRef(null);

  const rarity = achievement?.rarity || 'common';
  const rarityColor = RARITY_COLORS[rarity];

  useEffect(() => {
    if (visible && achievement) {
      hapticSuccess();

      // Slide in from top
      opacity.value = withTiming(1, { duration: 200 });
      translateY.value = withSpring(0, { damping: 14, stiffness: 120 });
      scale.value = withSpring(1, { damping: 12, stiffness: 150 });

      // Auto-dismiss after 4 seconds
      dismissTimerRef.current = setTimeout(() => {
        handleDismiss();
      }, AUTO_DISMISS_MS);

      return () => {
        if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      };
    }
  }, [visible, achievement]);

  const handleDismiss = useCallback(() => {
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);

    translateY.value = withTiming(-TOAST_HEIGHT - 60, {
      duration: 300,
      easing: Easing.in(Easing.ease),
    });
    opacity.value = withDelay(200, withTiming(0, { duration: 100 }));
    scale.value = withTiming(0.9, { duration: 300 });

    setTimeout(() => {
      onDismiss?.();
    }, 350);
  }, [onDismiss]);

  const handlePress = useCallback(() => {
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    onPress?.(achievement);
    handleDismiss();
  }, [achievement, onPress, handleDismiss]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  if (!visible || !achievement) return null;

  return (
    <Animated.View
      style={[styles.container, animatedStyle]}
      pointerEvents="box-none"
    >
      <Pressable onPress={handlePress} style={styles.pressable}>
        <View
          style={[
            styles.toast,
            {
              borderColor: rarityColor.border,
              shadowColor: rarityColor.border,
            },
          ]}
        >
          <LinearGradient
            colors={[rarityColor.bg, 'rgba(0, 0, 0, 0.6)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradient}
          >
            {/* Achievement icon */}
            <View style={[styles.iconContainer, { backgroundColor: rarityColor.bg }]}>
              <Text style={styles.icon}>{achievement.icon}</Text>
            </View>

            {/* Text content */}
            <View style={styles.textContent}>
              <View style={styles.labelRow}>
                <Trophy size={10} color={rarityColor.border} />
                <Text style={[styles.label, { color: rarityColor.border }]}>
                  ACHIEVEMENT UNLOCKED
                </Text>
              </View>
              <Text style={styles.name} numberOfLines={1}>
                {achievement.name}
              </Text>
              {achievement.description && (
                <Text style={styles.description} numberOfLines={1}>
                  {achievement.description}
                </Text>
              )}
            </View>

            {/* XP reward */}
            <View style={styles.xpBadge}>
              <Zap size={12} color={Colors.gold} />
              <Text style={styles.xpText}>+{achievement.xpReward}</Text>
            </View>
          </LinearGradient>

          {/* Rarity border */}
          <View
            style={[
              styles.border,
              { borderColor: rarityColor.border + '60' },
            ]}
          />
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
    paddingHorizontal: Spacing.md,
  },
  pressable: {
    width: '100%',
    maxWidth: 400,
  },
  toast: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 1.5,
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },

  // Icon
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 26,
  },

  // Text
  textContent: {
    flex: 1,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 2,
  },
  label: {
    fontSize: 9,
    fontWeight: FontWeight.heavy,
    letterSpacing: 1,
  },
  name: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  description: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 1,
  },

  // XP badge
  xpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.goldSoft,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  xpText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.gold,
  },

  // Border
  border: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    pointerEvents: 'none',
  },
});

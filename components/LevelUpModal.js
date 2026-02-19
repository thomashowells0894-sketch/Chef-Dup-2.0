/**
 * LevelUpModal
 *
 * Celebration modal when the user levels up.
 * - Confetti animation via reanimated
 * - New level badge with glow effect
 * - New title if applicable
 * - XP milestone display
 * - Perks unlocked at this level
 * - Share button
 * - Haptic feedback
 */

import React, { useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  Dimensions,
  Share,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  ZoomIn,
  SlideInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Star, Share2, X, Zap, Shield, Crown, Award } from 'lucide-react-native';
import { hapticHeavy, hapticSuccess } from '../lib/haptics';
import {
  Colors,
  Spacing,
  FontSize,
  FontWeight,
  BorderRadius,
  Shadows,
} from '../constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Level perks — unlocked at specific levels
const LEVEL_PERKS = {
  2: 'Daily Challenges unlocked',
  5: 'Weekly Challenges unlocked',
  7: 'Share Achievement Cards',
  10: 'Custom Dashboard Layout',
  15: 'Advanced Analytics',
  20: 'Streak Freeze Discount',
  25: 'Achievement Showcase',
  30: 'Community Leaderboard',
  40: 'AI Coach Priority',
  50: 'Exclusive Badge',
  75: 'Legend Status',
  100: 'Hall of Fame',
};

// Titles/Ranks tied to levels
const LEVEL_TITLES = {
  1: 'Beginner',
  5: 'Committed',
  10: 'Dedicated',
  20: 'Elite',
  35: 'Master',
  50: 'Legend',
};

function getTitleForLevel(level) {
  const thresholds = Object.keys(LEVEL_TITLES)
    .map(Number)
    .sort((a, b) => b - a);
  for (const t of thresholds) {
    if (level >= t) return LEVEL_TITLES[t];
  }
  return 'Beginner';
}

function getPerkForLevel(level) {
  return LEVEL_PERKS[level] || null;
}

// Confetti particle
const CONFETTI_COLORS = ['#FFD700', '#00D4FF', '#FF6B35', '#00E676', '#BF5AF2', '#FF5252'];
const PARTICLE_COUNT = 24;

function ConfettiParticle({ index, delay }) {
  const translateY = useSharedValue(-50);
  const translateX = useSharedValue(0);
  const rotation = useSharedValue(0);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(0);

  const startX = (Math.random() - 0.5) * SCREEN_WIDTH;
  const endX = startX + (Math.random() - 0.5) * 100;
  const color = CONFETTI_COLORS[index % CONFETTI_COLORS.length];
  const size = 6 + Math.random() * 8;

  useEffect(() => {
    scale.value = withDelay(delay, withTiming(1, { duration: 200 }));
    translateY.value = withDelay(
      delay,
      withTiming(SCREEN_HEIGHT * 0.6 + Math.random() * 200, {
        duration: 2000 + Math.random() * 1000,
        easing: Easing.out(Easing.quad),
      })
    );
    translateX.value = withDelay(
      delay,
      withTiming(endX, {
        duration: 2000 + Math.random() * 1000,
        easing: Easing.inOut(Easing.sin),
      })
    );
    rotation.value = withDelay(
      delay,
      withRepeat(
        withTiming(360, { duration: 1000 + Math.random() * 1000 }),
        -1,
        false
      )
    );
    opacity.value = withDelay(
      delay + 1500,
      withTiming(0, { duration: 800 })
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: startX + translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotation.value}deg` },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: 0,
          left: SCREEN_WIDTH / 2,
          width: size,
          height: size * 0.6,
          backgroundColor: color,
          borderRadius: 2,
        },
        style,
      ]}
      pointerEvents="none"
    />
  );
}

export default function LevelUpModal({ visible, level, levelName, previousLevel, onDismiss }) {
  const glowPulse = useSharedValue(0);
  const dismissTimeoutRef = useRef(null);

  const title = getTitleForLevel(level || 1);
  const previousTitle = getTitleForLevel(previousLevel || 1);
  const perk = getPerkForLevel(level);
  const hasNewTitle = title !== previousTitle;

  useEffect(() => {
    if (visible) {
      hapticHeavy();
      glowPulse.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 1000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );

      // Auto-dismiss after 8 seconds
      dismissTimeoutRef.current = setTimeout(() => {
        onDismiss?.();
      }, 8000);

      return () => {
        if (dismissTimeoutRef.current) clearTimeout(dismissTimeoutRef.current);
      };
    }
  }, [visible]);

  const glowStyle = useAnimatedStyle(() => ({
    shadowOpacity: interpolate(glowPulse.value, [0, 1], [0.3, 0.8]),
    shadowRadius: interpolate(glowPulse.value, [0, 1], [12, 30]),
  }));

  const handleShare = useCallback(async () => {
    await hapticSuccess();
    try {
      await Share.share({
        message: `I just reached Level ${level} (${title}) in VibeFit! ${perk ? `Unlocked: ${perk}` : ''}`,
      });
    } catch {
      // Share cancelled
    }
  }, [level, title, perk]);

  const handleDismiss = useCallback(() => {
    if (dismissTimeoutRef.current) clearTimeout(dismissTimeoutRef.current);
    onDismiss?.();
  }, [onDismiss]);

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleDismiss}
    >
      <Animated.View entering={FadeIn.duration(300)} style={styles.overlay}>
        {/* Confetti */}
        {Array.from({ length: PARTICLE_COUNT }).map((_, i) => (
          <ConfettiParticle key={i} index={i} delay={100 + i * 50} />
        ))}

        {/* Close button */}
        <Animated.View entering={FadeIn.delay(500)} style={styles.closeButton}>
          <Pressable onPress={handleDismiss} hitSlop={20}>
            <X size={24} color={Colors.textSecondary} />
          </Pressable>
        </Animated.View>

        {/* Main card */}
        <Animated.View
          entering={ZoomIn.delay(200).springify().damping(10)}
          style={styles.cardContainer}
        >
          <LinearGradient
            colors={['rgba(255, 215, 0, 0.15)', 'rgba(255, 215, 0, 0.03)', 'rgba(0, 0, 0, 0.5)']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.card}
            accessibilityViewIsModal={true}
            accessibilityLabel="Level up celebration"
          >
            {/* Level up label */}
            <Animated.View entering={SlideInUp.delay(400).springify()}>
              <Text style={styles.levelUpLabel}>LEVEL UP!</Text>
            </Animated.View>

            {/* Level badge */}
            <Animated.View entering={ZoomIn.delay(500).springify().damping(8)} style={[styles.badgeOuter]}>
              <Animated.View style={[styles.badgeShadow, glowStyle]}>
                <LinearGradient
                  colors={['#FFD700', '#FFA000']}
                  style={styles.badge}
                >
                  <Text style={styles.badgeLevel}>{level}</Text>
                </LinearGradient>
              </Animated.View>
            </Animated.View>

            {/* Level name */}
            <Animated.View entering={FadeIn.delay(700)}>
              <Text style={styles.levelName}>{levelName || title}</Text>
            </Animated.View>

            {/* New title */}
            {hasNewTitle && (
              <Animated.View entering={FadeIn.delay(900)} style={styles.titleBadge}>
                <Crown size={14} color={Colors.gold} />
                <Text style={styles.titleText}>New Title: {title}</Text>
              </Animated.View>
            )}

            {/* Perk unlocked */}
            {perk && (
              <Animated.View entering={FadeIn.delay(1100)} style={styles.perkRow}>
                <View style={styles.perkIconWrap}>
                  <Zap size={16} color={Colors.primary} />
                </View>
                <Text style={styles.perkText}>{perk}</Text>
              </Animated.View>
            )}

            {/* Divider */}
            <View style={styles.divider} />

            {/* Actions row */}
            <View style={styles.actionsRow}>
              <Pressable onPress={handleShare} style={styles.shareButton}>
                <LinearGradient
                  colors={['rgba(0, 212, 255, 0.15)', 'rgba(0, 212, 255, 0.05)']}
                  style={styles.shareGradient}
                >
                  <Share2 size={16} color={Colors.primary} />
                  <Text style={styles.shareText}>Share</Text>
                </LinearGradient>
              </Pressable>

              <Pressable onPress={handleDismiss} style={styles.continueButton}>
                <LinearGradient
                  colors={['#FFD700', '#FFA000']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.continueGradient}
                >
                  <Text style={styles.continueText}>Continue</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </LinearGradient>

          {/* Border */}
          <View style={styles.cardBorder} />
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: Spacing.lg,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContainer: {
    width: '100%',
    maxWidth: 340,
    borderRadius: BorderRadius.xxl,
    overflow: 'hidden',
    position: 'relative',
  },
  card: {
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
  },
  cardBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: BorderRadius.xxl,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 215, 0, 0.4)',
    pointerEvents: 'none',
  },

  // Level up label
  levelUpLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.heavy,
    color: Colors.gold,
    letterSpacing: 4,
    marginBottom: Spacing.lg,
  },

  // Badge
  badgeOuter: {
    marginBottom: Spacing.lg,
  },
  badgeShadow: {
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
    borderRadius: 50,
  },
  badge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  badgeLevel: {
    fontSize: FontSize.xxxl,
    fontWeight: FontWeight.black,
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },

  // Level name
  levelName: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },

  // Title badge
  titleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.goldSoft,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.md,
  },
  titleText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.gold,
  },

  // Perk
  perkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: 'rgba(0, 212, 255, 0.08)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.15)',
    marginTop: Spacing.sm,
  },
  perkIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 212, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  perkText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.primaryText,
    flex: 1,
  },

  // Divider
  divider: {
    width: '60%',
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.lg,
  },

  // Actions
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    width: '100%',
  },
  shareButton: {
    flex: 1,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  shareGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm + 2,
    gap: Spacing.xs,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.2)',
  },
  shareText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },
  continueButton: {
    flex: 1.5,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  continueGradient: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.md,
  },
  continueText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: '#000',
  },
});

import React, { useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  withSequence,
  Easing,
  FadeIn,
  FadeOut,
  SlideInDown,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useCelebration } from '../context/GamificationContext';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../constants/theme';
import { hapticSuccess, hapticHeavy } from '../lib/haptics';

// =============================================================================
// CONSTANTS
// =============================================================================

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const CONFETTI_COLORS = [
  '#FFD700',
  '#FF6B35',
  '#00D4FF',
  '#FF453A',
  '#10B981',
  '#A855F7',
  '#EC4899',
];

const INTENSITY_CONFIG = {
  small: { particleCount: 15, duration: 2000, showCard: false, flash: false, shake: false },
  medium: { particleCount: 50, duration: 3000, showCard: true, flash: false, shake: false },
  large: { particleCount: 150, duration: 4000, showCard: true, flash: true, shake: false },
  epic: { particleCount: 300, duration: 5000, showCard: true, flash: true, shake: true },
};

const TYPE_EMOJI = {
  level_up: '\u2B50',
  streak_milestone: '\uD83D\uDD25',
  streak_tier_upgrade: '\uD83D\uDD25',
  bonus_drop: '\uD83D\uDC8E',
  goal_hit: '\uD83C\uDFAF',
  streak_repaired: '\uD83D\uDEE1\uFE0F',
  first_log_today: '\uD83C\uDF05',
};

// Hellfire tier gets the skull emoji
function getEmojiForCelebration(celebration) {
  if (
    celebration.type === 'streak_tier_upgrade' &&
    celebration.data?.tierName === 'Unstoppable'
  ) {
    return '\uD83D\uDC80';
  }
  return TYPE_EMOJI[celebration.type] || '\uD83C\uDF89';
}

// =============================================================================
// CONFETTI PARTICLE COMPONENT
// Each particle is its own Animated.View with independent shared values so
// reanimated can run all motion on the UI thread.
// =============================================================================

const ConfettiParticle = React.memo(function ConfettiParticle({ seed }) {
  // Capture random params once via useMemo so they stay stable across re-renders.
  const params = useMemo(() => {
    const isCircle = Math.random() > 0.5;
    const color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
    const startX = Math.random() * SCREEN_WIDTH;
    const startY = -(Math.random() * 80 + 20);
    const endY = SCREEN_HEIGHT + 40;
    const horizontalDrift = (Math.random() - 0.5) * SCREEN_WIDTH * 0.6;
    const rotationEnd = (Math.random() - 0.5) * 720;
    const fallDuration = 2000 + Math.random() * 2000;
    const delay = Math.random() * 1200;
    const size = 4 + Math.random() * 4;
    return {
      isCircle,
      color,
      startX,
      startY,
      endY,
      horizontalDrift,
      rotationEnd,
      fallDuration,
      delay,
      size,
    };
  }, [seed]);

  const translateY = useSharedValue(params.startY);
  const translateX = useSharedValue(params.startX);
  const rotation = useSharedValue(0);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(0);

  useEffect(() => {
    const {
      delay,
      endY,
      fallDuration,
      startX,
      horizontalDrift,
      rotationEnd,
    } = params;

    // Pop in
    scale.value = withDelay(delay, withSpring(1, { damping: 8, stiffness: 200 }));

    // Fall down
    translateY.value = withDelay(
      delay,
      withTiming(endY, {
        duration: fallDuration,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      })
    );

    // Horizontal drift
    translateX.value = withDelay(
      delay,
      withTiming(startX + horizontalDrift, {
        duration: fallDuration,
        easing: Easing.bezier(0.33, 0, 0.67, 1),
      })
    );

    // Rotation
    rotation.value = withDelay(
      delay,
      withTiming(rotationEnd, {
        duration: fallDuration,
        easing: Easing.linear,
      })
    );

    // Fade out towards end of fall
    opacity.value = withDelay(
      delay + fallDuration * 0.7,
      withTiming(0, { duration: fallDuration * 0.3 })
    );
  }, [params]);

  const animatedStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotation.value}deg` },
      { scale: scale.value },
    ],
    opacity: opacity.value,
    width: params.size,
    height: params.isCircle ? params.size : params.size * 1.67,
    borderRadius: params.isCircle ? params.size / 2 : 1,
    backgroundColor: params.color,
  }));

  return <Animated.View style={animatedStyle} />;
});

// =============================================================================
// SCREEN FLASH COMPONENT
// =============================================================================

function ScreenFlash() {
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withSequence(
      withTiming(0.6, { duration: 100 }),
      withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) })
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
    opacity: opacity.value,
    zIndex: 10,
  }));

  return <Animated.View style={style} pointerEvents="none" />;
}

// =============================================================================
// SCREEN SHAKE WRAPPER
// =============================================================================

function ScreenShakeWrapper({ enabled, children }) {
  const translateX = useSharedValue(0);

  useEffect(() => {
    if (!enabled) return;

    translateX.value = withSequence(
      withTiming(6, { duration: 40 }),
      withTiming(-6, { duration: 40 }),
      withTiming(5, { duration: 40 }),
      withTiming(-5, { duration: 40 }),
      withTiming(3, { duration: 40 }),
      withTiming(-3, { duration: 40 }),
      withTiming(2, { duration: 40 }),
      withTiming(0, { duration: 40 })
    );
  }, [enabled]);

  const style = useAnimatedStyle(() => ({
    flex: 1,
    transform: [{ translateX: translateX.value }],
  }));

  return <Animated.View style={style}>{children}</Animated.View>;
}

// =============================================================================
// GLOW PULSE (for small intensity -- subtle golden glow at top of screen)
// =============================================================================

function GlowPulse() {
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withSequence(
      withTiming(0.8, { duration: 300 }),
      withTiming(0.3, { duration: 400 }),
      withTiming(0.7, { duration: 300 }),
      withTiming(0, { duration: 600, easing: Easing.out(Easing.cubic) })
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={style} pointerEvents="none">
      <LinearGradient
        colors={['rgba(255, 215, 0, 0.5)', 'rgba(255, 215, 0, 0.15)', 'transparent']}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

// =============================================================================
// EPIC BACKGROUND GRADIENT SHIFT
// =============================================================================

function EpicBackgroundGradient() {
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withSequence(
      withTiming(0.4, { duration: 800, easing: Easing.inOut(Easing.cubic) }),
      withTiming(0.25, { duration: 1200 }),
      withTiming(0.35, { duration: 800 }),
      withTiming(0.2, { duration: 1000 }),
      withTiming(0, { duration: 1200, easing: Easing.out(Easing.cubic) })
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    ...StyleSheet.absoluteFillObject,
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={style} pointerEvents="none">
      <LinearGradient
        colors={['#A855F7', '#FF6B35', '#00D4FF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

// =============================================================================
// CELEBRATION CARD
// =============================================================================

function CelebrationCard({ celebration, onDismiss }) {
  const emoji = getEmojiForCelebration(celebration);
  const isEpic = celebration.intensity === 'epic';

  const cardGradientColors = useMemo(() => {
    if (celebration.data?.tierColors) {
      return [
        celebration.data.tierColors[0] + 'DD',
        celebration.data.tierColors[1] + 'DD',
      ];
    }

    const gradientMap = {
      level_up: ['#1A1040', '#2D1B69'],
      streak_milestone: ['#3D1500', '#5C2200'],
      streak_tier_upgrade: ['#3D0A00', '#5C1500'],
      bonus_drop: ['#0A1A3D', '#152B5C'],
      goal_hit: ['#0A3D1A', '#155C2B'],
      streak_repaired: ['#1A2A3D', '#2B3D5C'],
      first_log_today: ['#2D1B00', '#4A2D00'],
    };

    return gradientMap[celebration.type] || ['#1A1A2E', '#2D2D44'];
  }, [celebration.type, celebration.data?.tierColors]);

  // Bouncy scale-in for the emoji
  const emojiScale = useSharedValue(0);

  useEffect(() => {
    emojiScale.value = withDelay(
      200,
      withSpring(1, { damping: 6, stiffness: 150, mass: 0.8 })
    );
  }, []);

  const emojiStyle = useAnimatedStyle(() => ({
    transform: [{ scale: emojiScale.value }],
  }));

  return (
    <Animated.View
      entering={SlideInDown.springify().damping(14).stiffness(120).mass(0.9)}
      style={styles.cardContainer}
      accessibilityRole="alert"
      accessibilityLabel={`${celebration.title}. ${celebration.subtitle}`}
      accessibilityLiveRegion="polite"
    >
      <LinearGradient
        colors={cardGradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardGradient}
      >
        {/* Grab handle */}
        <View style={styles.cardAccentLine} />

        {/* Emoji */}
        <Animated.View style={[styles.emojiContainer, emojiStyle]}>
          <Text style={[styles.emoji, isEpic && styles.emojiEpic]}>{emoji}</Text>
        </Animated.View>

        {/* Title */}
        <Text style={[styles.cardTitle, isEpic && styles.cardTitleEpic]}>
          {celebration.title}
        </Text>

        {/* Subtitle */}
        <Text style={styles.cardSubtitle}>{celebration.subtitle}</Text>

        {/* Contextual data badges */}
        {celebration.data?.xpAwarded != null && (
          <View style={styles.xpBadge}>
            <Text style={styles.xpBadgeText}>+{celebration.data.xpAwarded} XP</Text>
          </View>
        )}

        {celebration.data?.newLevel != null && celebration.data?.levelName != null && (
          <View style={styles.levelBadge}>
            <Text style={styles.levelBadgeText}>
              Lv. {celebration.data.newLevel} - {celebration.data.levelName}
            </Text>
          </View>
        )}

        {celebration.data?.streakDays != null && celebration.type === 'streak_milestone' && (
          <View style={styles.streakBadge}>
            <Text style={styles.streakBadgeText}>
              {celebration.data.streakDays} day streak
            </Text>
          </View>
        )}

        {celebration.data?.multiplier != null && (
          <View style={styles.multiplierBadge}>
            <Text style={styles.multiplierBadgeText}>
              {celebration.data.multiplier}x Multiplier
            </Text>
          </View>
        )}

        {/* Continue / dismiss button */}
        <TouchableOpacity
          style={styles.continueButton}
          onPress={onDismiss}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Dismiss celebration"
        >
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.15)', 'rgba(255, 255, 255, 0.05)']}
            style={styles.continueButtonGradient}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>
    </Animated.View>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function CelebrationOverlay() {
  const { celebration, dismiss } = useCelebration();
  const dismissTimerRef = useRef(null);
  const hasTriggeredHapticRef = useRef(false);

  const config = celebration ? INTENSITY_CONFIG[celebration.intensity] : null;

  // Build a stable particle list keyed to the current celebration instance.
  // The seed string changes whenever a new celebration fires, which causes
  // useMemo to regenerate the array and give each particle a fresh key.
  const celebrationId = celebration
    ? `${celebration.type}-${celebration.title}-${celebration.intensity}`
    : null;

  const particles = useMemo(() => {
    if (!celebrationId || !config) return [];
    const now = Date.now();
    return Array.from({ length: config.particleCount }, (_, i) => ({
      key: `${celebrationId}-${now}-${i}`,
      seed: `${celebrationId}-${now}-${i}`,
    }));
  }, [celebrationId, config]);

  // Dismiss handler -- clears timer and forwards to context
  const handleDismiss = useCallback(() => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
    hasTriggeredHapticRef.current = false;
    dismiss();
  }, [dismiss]);

  // Auto-dismiss timer & haptics when a celebration appears
  useEffect(() => {
    if (!celebration || !config) {
      hasTriggeredHapticRef.current = false;
      return;
    }

    // Trigger haptics once per celebration
    if (!hasTriggeredHapticRef.current) {
      hasTriggeredHapticRef.current = true;

      if (celebration.intensity === 'medium') {
        hapticSuccess();
      } else if (
        celebration.intensity === 'large' ||
        celebration.intensity === 'epic'
      ) {
        hapticHeavy();
      }
    }

    // Auto-dismiss after the intensity-specific timeout
    dismissTimerRef.current = setTimeout(() => {
      handleDismiss();
    }, config.duration);

    return () => {
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
        dismissTimerRef.current = null;
      }
    };
  }, [celebration, config, handleDismiss]);

  // ------------------------------------------------------------------
  // Render nothing when there is no active celebration
  // ------------------------------------------------------------------
  if (!celebration || !config) {
    return null;
  }

  const isSmall = celebration.intensity === 'small';
  const isEpic = celebration.intensity === 'epic';

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <ScreenShakeWrapper enabled={config.shake}>
        <View style={styles.innerContainer} pointerEvents="box-none">
          {/* Epic: animated background gradient shift */}
          {isEpic && <EpicBackgroundGradient />}

          {/* Large / Epic: white screen flash */}
          {config.flash && <ScreenFlash />}

          {/* Small: golden glow pulse at top of screen */}
          {isSmall && <GlowPulse />}

          {/* Confetti particles layer */}
          <View style={styles.confettiContainer} pointerEvents="none">
            {particles.map((p) => (
              <ConfettiParticle key={p.key} seed={p.seed} />
            ))}
          </View>

          {/* Card overlay for medium / large / epic */}
          {config.showCard && (
            <View style={styles.cardOverlay} pointerEvents="box-none">
              {/* Translucent backdrop -- tap to dismiss */}
              <TouchableOpacity
                style={styles.backdrop}
                activeOpacity={1}
                onPress={handleDismiss}
              />
              <CelebrationCard
                celebration={celebration}
                onDismiss={handleDismiss}
              />
            </View>
          )}

          {/* Small intensity: brief floating title near top of screen */}
          {isSmall && (
            <Animated.View
              entering={FadeIn.duration(300)}
              exiting={FadeOut.duration(400)}
              style={styles.smallTitleContainer}
              pointerEvents="none"
              accessibilityRole="alert"
              accessibilityLabel={`${celebration.title}. ${celebration.subtitle}`}
              accessibilityLiveRegion="polite"
            >
              <Text style={styles.smallTitleEmoji}>
                {getEmojiForCelebration(celebration)}
              </Text>
              <Text style={styles.smallTitle}>{celebration.title}</Text>
              <Text style={styles.smallSubtitle}>{celebration.subtitle}</Text>
            </Animated.View>
          )}
        </View>
      </ScreenShakeWrapper>
    </View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  // Full-screen absolute overlay
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  innerContainer: {
    flex: 1,
  },

  // Confetti
  confettiContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
    overflow: 'hidden',
  },

  // Card overlay
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 60 : 40,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },

  // Card
  cardContainer: {
    width: SCREEN_WIDTH - Spacing.lg * 2,
    maxWidth: 400,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.5,
        shadowRadius: 32,
      },
      android: {
        elevation: 24,
      },
    }),
  },
  cardGradient: {
    padding: Spacing.xl,
    paddingTop: Spacing.lg,
    alignItems: 'center',
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  cardAccentLine: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginBottom: Spacing.lg,
  },

  // Emoji
  emojiContainer: {
    marginBottom: Spacing.md,
  },
  emoji: {
    fontSize: 56,
    textAlign: 'center',
  },
  emojiEpic: {
    fontSize: 72,
  },

  // Card text
  cardTitle: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.sm,
    letterSpacing: 0.5,
  },
  cardTitleEpic: {
    fontSize: FontSize.xxxl,
    fontWeight: FontWeight.black,
    letterSpacing: 1,
  },
  cardSubtitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.regular,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.sm,
  },

  // Data badges
  xpBadge: {
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    marginBottom: Spacing.sm,
  },
  xpBadgeText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: '#FFD700',
    textAlign: 'center',
  },
  levelBadge: {
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.3)',
    marginBottom: Spacing.sm,
  },
  levelBadgeText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: '#A855F7',
    textAlign: 'center',
  },
  streakBadge: {
    backgroundColor: 'rgba(255, 107, 53, 0.15)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.3)',
    marginBottom: Spacing.sm,
  },
  streakBadgeText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: '#FF6B35',
    textAlign: 'center',
  },
  multiplierBadge: {
    backgroundColor: 'rgba(0, 212, 255, 0.15)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.3)',
    marginBottom: Spacing.sm,
  },
  multiplierBadgeText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: '#00D4FF',
    textAlign: 'center',
  },

  // Continue button
  continueButton: {
    width: '100%',
    marginTop: Spacing.md,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  continueButtonGradient: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  continueButtonText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    letterSpacing: 0.3,
  },

  // Small intensity floating title
  smallTitleContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 80 : 50,
    left: Spacing.xl,
    right: Spacing.xl,
    alignItems: 'center',
    zIndex: 10,
  },
  smallTitleEmoji: {
    fontSize: 32,
    marginBottom: Spacing.xs,
  },
  smallTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  smallSubtitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xs,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});

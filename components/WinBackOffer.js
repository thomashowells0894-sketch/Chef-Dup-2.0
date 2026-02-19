/**
 * WinBackOffer - Premium win-back modal for lapsed users.
 *
 * Renders a full-screen modal overlay with a glass-morphism card,
 * gradient accents, and animated sparkle icons. The offer type
 * (discount / extended_trial / feature_preview) drives the visual
 * treatment and copy.
 *
 * Props:
 *   offer: { type, headline, description, ctaText, discount? } | null
 *   onAccept: () => void
 *   onDismiss: () => void
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  FadeIn,
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Sparkles,
  Gift,
  Clock,
  Eye,
  X,
  ChevronRight,
} from 'lucide-react-native';
import {
  Colors,
  Gradients,
  Spacing,
  FontSize,
  FontWeight,
  BorderRadius,
  Shadows,
} from '../constants/theme';
import { hapticImpact } from '../lib/haptics';
import { trackConversion } from '../lib/conversionTracking';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Pick an icon and gradient based on offer type
function getOfferVisuals(type) {
  switch (type) {
    case 'discount':
      return {
        Icon: Gift,
        gradient: Gradients.sunset,
        accentColor: Colors.secondary,
        glowColor: Colors.secondaryGlow,
      };
    case 'extended_trial':
      return {
        Icon: Clock,
        gradient: Gradients.ocean,
        accentColor: Colors.success,
        glowColor: Colors.successGlow,
      };
    case 'feature_preview':
      return {
        Icon: Eye,
        gradient: Gradients.electric,
        accentColor: Colors.primary,
        glowColor: Colors.primaryGlow,
      };
    default:
      return {
        Icon: Sparkles,
        gradient: Gradients.electric,
        accentColor: Colors.primary,
        glowColor: Colors.primaryGlow,
      };
  }
}

export default function WinBackOffer({ offer, onAccept, onDismiss }) {
  const glowPulse = useSharedValue(0.3);
  const sparkleRotation = useSharedValue(0);
  const buttonScale = useSharedValue(1);

  const visible = !!offer;

  // Track shown event
  useEffect(() => {
    if (visible && offer) {
      trackConversion({
        event: 'winback_shown',
        source: 'win_back_modal',
        variant: offer.type,
        metadata: { discount: offer.discount || 0 },
      });
    }
  }, [visible, offer]);

  // Ambient glow animation
  useEffect(() => {
    if (visible) {
      glowPulse.value = withRepeat(
        withSequence(
          withTiming(0.6, { duration: 1800 }),
          withTiming(0.3, { duration: 1800 })
        ),
        -1
      );
      sparkleRotation.value = withRepeat(
        withTiming(360, { duration: 6000 }),
        -1
      );
    }
  }, [visible, glowPulse, sparkleRotation]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowPulse.value,
  }));

  const sparkleStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${sparkleRotation.value}deg` }],
  }));

  const buttonAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const handleAccept = async () => {
    await hapticImpact();
    trackConversion({
      event: 'winback_accepted',
      source: 'win_back_modal',
      variant: offer?.type,
      metadata: { discount: offer?.discount || 0 },
    });
    onAccept?.();
  };

  const handleDismiss = () => {
    trackConversion({
      event: 'winback_dismissed',
      source: 'win_back_modal',
      variant: offer?.type,
    });
    onDismiss?.();
  };

  if (!visible || !offer) return null;

  const { Icon, gradient, accentColor, glowColor } = getOfferVisuals(offer.type);

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <Animated.View entering={FadeIn.duration(250)} style={styles.backdrop}>
        <Animated.View entering={FadeInUp.delay(100).duration(500).springify()} style={styles.cardWrapper}>
          {/* Ambient glow behind card */}
          <Animated.View style={[styles.ambientGlow, glowStyle, { backgroundColor: glowColor }]} />

          {/* Gradient border wrapper */}
          <LinearGradient
            colors={[...gradient, 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientBorder}
          >
            <View style={styles.card}>
              {/* Close button */}
              <Pressable
                style={styles.closeButton}
                onPress={handleDismiss}
                hitSlop={16}
                accessibilityLabel="Dismiss offer"
                accessibilityRole="button"
              >
                <X size={20} color={Colors.textTertiary} />
              </Pressable>

              {/* Icon cluster */}
              <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.iconCluster}>
                <Animated.View style={sparkleStyle}>
                  <Sparkles size={14} color={accentColor} style={styles.sparkleTopLeft} />
                </Animated.View>
                <View style={[styles.iconCircle, { backgroundColor: `${accentColor}15` }]}>
                  <Icon size={32} color={accentColor} />
                </View>
                <Animated.View style={sparkleStyle}>
                  <Sparkles size={10} color={accentColor} style={styles.sparkleBottomRight} />
                </Animated.View>
              </Animated.View>

              {/* Headline */}
              <Animated.Text
                entering={FadeInDown.delay(300).duration(400)}
                style={styles.headline}
              >
                {offer.headline}
              </Animated.Text>

              {/* Discount badge (discount type only) */}
              {offer.type === 'discount' && offer.discount && (
                <Animated.View entering={FadeInDown.delay(350).duration(400)} style={styles.discountBadge}>
                  <LinearGradient
                    colors={gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.discountGradient}
                  >
                    <Text style={styles.discountText}>{offer.discount}% OFF</Text>
                  </LinearGradient>
                </Animated.View>
              )}

              {/* Description */}
              <Animated.Text
                entering={FadeInDown.delay(400).duration(400)}
                style={styles.description}
              >
                {offer.description}
              </Animated.Text>

              {/* CTA button */}
              <Animated.View entering={FadeInDown.delay(500).duration(400)} style={styles.ctaWrap}>
                <Pressable
                  onPress={handleAccept}
                  onPressIn={() => {
                    buttonScale.value = withSpring(0.96, { damping: 12 });
                  }}
                  onPressOut={() => {
                    buttonScale.value = withSpring(1, { damping: 8 });
                  }}
                  accessibilityLabel={offer.ctaText}
                  accessibilityRole="button"
                >
                  <Animated.View style={buttonAnimStyle}>
                    <LinearGradient
                      colors={gradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.ctaButton}
                    >
                      <Text style={styles.ctaButtonText}>{offer.ctaText}</Text>
                      <ChevronRight size={18} color="#fff" />
                    </LinearGradient>
                  </Animated.View>
                </Pressable>
              </Animated.View>

              {/* Dismiss link */}
              <Pressable onPress={handleDismiss} style={styles.dismissButton}>
                <Text style={styles.dismissText}>No thanks</Text>
              </Pressable>
            </View>
          </LinearGradient>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    padding: Spacing.lg,
  },
  cardWrapper: {
    width: '100%',
    maxWidth: 380,
    position: 'relative',
  },
  ambientGlow: {
    position: 'absolute',
    top: -30,
    left: '15%',
    width: '70%',
    height: 120,
    borderRadius: 60,
  },
  gradientBorder: {
    borderRadius: BorderRadius.xl + 1,
    padding: 1,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    ...Shadows.cardElevated,
  },
  closeButton: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    zIndex: 1,
    padding: 4,
  },
  iconCluster: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
    position: 'relative',
    width: 80,
    height: 80,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  sparkleTopLeft: {
    position: 'absolute',
    top: -6,
    left: -6,
  },
  sparkleBottomRight: {
    position: 'absolute',
    bottom: -4,
    right: -4,
  },
  headline: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  discountBadge: {
    marginBottom: Spacing.md,
  },
  discountGradient: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  discountText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.heavy,
    color: '#fff',
    letterSpacing: 2,
  },
  description: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: FontSize.md * 1.6,
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.sm,
  },
  ctaWrap: {
    width: '100%',
    marginBottom: Spacing.md,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: 16,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
    ...Shadows.button,
  },
  ctaButtonText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: '#fff',
  },
  dismissButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  dismissText: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
  },
});

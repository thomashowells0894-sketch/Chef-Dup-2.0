/**
 * PremiumPreview — "Velvet Rope" paywall component
 *
 * Shows a blurred preview of premium content (AI results, insights, etc.)
 * with a glowing upgrade CTA. The user can SEE what they're missing,
 * creating desire without frustration.
 *
 * Usage:
 *   <PremiumPreview
 *     visible={!isPremium}
 *     previewContent={<MacroBreakdown data={scanResult} />}
 *     featureName="AI Food Scanner"
 *     onUpgrade={() => router.push('/paywall')}
 *   />
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Lock, Sparkles, ChevronRight } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  FadeIn,
} from 'react-native-reanimated';
import { hapticImpact } from '../lib/haptics';
import {
  Colors,
  Gradients,
  Spacing,
  BorderRadius,
  FontSize,
  FontWeight,
  Shadows,
} from '../constants/theme';
import { trackConversion } from '../lib/conversionTracking';

export default function PremiumPreview({
  visible = true,
  previewContent,
  featureName = 'This Feature',
  description,
  onUpgrade,
  onDismiss,
  monthlyPrice = '$9.99',
}) {
  const glowPulse = useSharedValue(0.4);
  const buttonScale = useSharedValue(1);

  // Track paywall_shown once when the component becomes visible
  const hasTrackedShown = useRef(false);
  useEffect(() => {
    if (visible && !hasTrackedShown.current) {
      hasTrackedShown.current = true;
      trackConversion({
        event: 'paywall_shown',
        source: featureName,
      });
    }
  }, [visible, featureName]);

  useEffect(() => {
    if (visible) {
      glowPulse.value = withRepeat(
        withSequence(
          withTiming(0.7, { duration: 1500 }),
          withTiming(0.4, { duration: 1500 }),
        ),
        -1
      );
    }
  }, [visible, glowPulse]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowPulse.value,
  }));

  const buttonAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const handleUpgradePress = async () => {
    trackConversion({
      event: 'paywall_cta_tapped',
      source: featureName,
    });
    await hapticImpact();
    onUpgrade?.();
  };

  const handleDismissPress = () => {
    trackConversion({
      event: 'paywall_dismissed',
      source: featureName,
    });
    onDismiss?.();
  };

  if (!visible) return null;

  return (
    <View style={styles.container}>
      {/* The blurred preview content */}
      <View style={styles.previewContainer}>
        {previewContent && (
          <View style={styles.previewContent}>
            {previewContent}
          </View>
        )}

        {/* Blur overlay */}
        {Platform.OS === 'ios' ? (
          <BlurView intensity={20} tint="dark" style={styles.blurOverlay} />
        ) : (
          <View style={styles.blurFallback} />
        )}

        {/* Gradient fade overlay */}
        <LinearGradient
          colors={['transparent', 'rgba(10, 10, 14, 0.7)', 'rgba(10, 10, 14, 0.95)']}
          style={styles.gradientOverlay}
        />

        {/* Lock badge */}
        <View style={styles.lockBadge}>
          <Lock size={14} color={Colors.primary} />
          <Text style={styles.lockText}>PRO</Text>
        </View>
      </View>

      {/* Upgrade CTA */}
      <Animated.View entering={FadeIn.delay(300).duration(400)} style={styles.ctaContainer}>
        {/* Ambient glow behind CTA */}
        <Animated.View style={[styles.ctaGlow, glowStyle]} />

        <View style={styles.ctaContent}>
          <Sparkles size={20} color={Colors.primary} />
          <Text style={styles.ctaTitle}>Unlock {featureName}</Text>
          <Text style={styles.ctaDescription}>
            {description || `Get instant access to ${featureName.toLowerCase()} and all premium features.`}
          </Text>

          <Pressable
            onPress={handleUpgradePress}
            onPressIn={() => { buttonScale.value = withSpring(0.96, { damping: 12 }); }}
            onPressOut={() => { buttonScale.value = withSpring(1, { damping: 8 }); }}
          >
            <Animated.View style={buttonAnimStyle}>
              <LinearGradient
                colors={Gradients.electric}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.upgradeButton}
              >
                <Text style={styles.upgradeButtonText}>Upgrade to Pro</Text>
                <Text style={styles.upgradePrice}>{monthlyPrice}/mo</Text>
                <ChevronRight size={18} color="#fff" />
              </LinearGradient>
            </Animated.View>
          </Pressable>

          {onDismiss && (
            <Pressable onPress={handleDismissPress} style={styles.dismissButton}>
              <Text style={styles.dismissText}>Maybe Later</Text>
            </Pressable>
          )}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.15)',
    ...Shadows.glowPrimary,
  },
  // Blurred preview area
  previewContainer: {
    minHeight: 120,
    position: 'relative',
    overflow: 'hidden',
  },
  previewContent: {
    padding: Spacing.lg,
  },
  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  blurFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 10, 14, 0.85)',
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  lockBadge: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 212, 255, 0.15)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.25)',
  },
  lockText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
    letterSpacing: 1,
  },
  // Upgrade CTA
  ctaContainer: {
    padding: Spacing.lg,
    position: 'relative',
  },
  ctaGlow: {
    position: 'absolute',
    top: -40,
    left: '25%',
    width: '50%',
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primaryGlow,
  },
  ctaContent: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  ctaTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    textAlign: 'center',
  },
  ctaDescription: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
    ...Shadows.button,
  },
  upgradeButtonText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: '#fff',
  },
  upgradePrice: {
    fontSize: FontSize.sm,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: FontWeight.medium,
  },
  dismissButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.xs,
  },
  dismissText: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
  },
});

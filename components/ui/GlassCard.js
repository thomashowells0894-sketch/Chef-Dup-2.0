import React, { useCallback, useMemo } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AdaptiveBlur from './AdaptiveBlur';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
} from 'react-native-reanimated';
import { hapticLight, hapticImpact } from '../../lib/haptics';
import { Colors, Gradients, BorderRadius, Shadows, Spacing, Glass } from '../../constants/theme';

/**
 * Premium GlassCard Component
 * A sleek card with gradient background, glow effects, and haptic feedback
 */
export default function GlassCard({
  children,
  style,
  variant = 'default', // 'default', 'elevated', 'accent', 'success', 'warning', 'error'
  glow = false,
  onPress,
  onLongPress,
  animated = true,
  breathe = false,
  disabled = false,
}) {
  const scale = useSharedValue(1);
  const breatheScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0);

  // Breathing animation for special cards
  React.useEffect(() => {
    if (breathe && animated) {
      breatheScale.value = withRepeat(
        withSequence(
          withTiming(1.02, { duration: 2000 }),
          withTiming(1, { duration: 2000 })
        ),
        -1
      );
    } else {
      breatheScale.value = withTiming(1, { duration: 200 });
    }
  }, [breathe, animated]);

  const handlePressIn = useCallback(() => {
    if (disabled || !animated) return;
    scale.value = withSpring(0.97, { damping: 12, stiffness: 400 });
  }, [disabled, animated]);

  const handlePressOut = useCallback(() => {
    if (disabled || !animated) return;
    scale.value = withSpring(1, { damping: 8, stiffness: 200 });
  }, [disabled, animated]);

  const handlePress = useCallback(async () => {
    if (disabled) return;
    await hapticLight();

    // Flash glow on press
    if (glow) {
      glowOpacity.value = 1;
      glowOpacity.value = withTiming(0, { duration: 400 });
    }

    onPress?.();
  }, [disabled, glow, onPress]);

  const handleLongPress = useCallback(async () => {
    if (disabled) return;
    await hapticImpact();
    onLongPress?.();
  }, [disabled, onLongPress]);

  // Get gradient and shadow based on variant
  const variantStyles = useMemo(() => {
    switch (variant) {
      case 'elevated':
        return {
          gradient: Gradients.cardHover,
          shadow: Shadows.cardElevated,
          glowColor: Colors.primaryGlow,
        };
      case 'accent':
        return {
          gradient: Gradients.primarySoft,
          shadow: glow ? Shadows.glowPrimary : Shadows.card,
          glowColor: Colors.primaryGlow,
        };
      case 'success':
        return {
          gradient: Gradients.successSoft,
          shadow: glow ? Shadows.glowSuccess : Shadows.card,
          glowColor: Colors.successGlow,
        };
      case 'warning':
        return {
          gradient: Gradients.warningSoft,
          shadow: glow ? Shadows.glowWarning : Shadows.card,
          glowColor: Colors.warningGlow,
        };
      case 'error':
        return {
          gradient: Gradients.errorSoft,
          shadow: glow ? Shadows.glowError : Shadows.card,
          glowColor: Colors.errorGlow,
        };
      default:
        return {
          gradient: Gradients.card,
          shadow: Shadows.card,
          glowColor: Colors.primaryGlow,
        };
    }
  }, [variant, glow]);

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value * breatheScale.value }],
    opacity: disabled ? 0.5 : 1,
  }));

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const CardContent = (
    <Animated.View
      style={[
        styles.container,
        variantStyles.shadow,
        containerAnimatedStyle,
        style,
      ]}
    >
      <LinearGradient
        colors={variantStyles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.gradient}
      >
        {/* Glass blur layer */}
        <AdaptiveBlur intensity={80} tint="dark" />

        {/* Glow overlay */}
        {glow && (
          <Animated.View
            style={[
              styles.glowOverlay,
              { backgroundColor: variantStyles.glowColor },
              glowAnimatedStyle,
            ]}
          />
        )}

        {/* Border effect */}
        <View style={styles.borderOverlay} />

        {/* Content */}
        <View style={styles.content}>
          {children}
        </View>
      </LinearGradient>
    </Animated.View>
  );

  if (onPress || onLongPress) {
    return (
      <Pressable
        onPress={handlePress}
        onLongPress={handleLongPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
      >
        {CardContent}
      </Pressable>
    );
  }

  return CardContent;
}

const CARD_RADIUS = 24;

const styles = StyleSheet.create({
  container: {
    borderRadius: CARD_RADIUS,
    overflow: 'hidden',
  },
  gradient: {
    borderRadius: CARD_RADIUS,
    position: 'relative',
  },
  borderOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  glowOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: CARD_RADIUS,
  },
  content: {
    padding: Spacing.lg,
  },
});

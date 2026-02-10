import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Animated, Pressable, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
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
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const breatheAnim = useRef(new Animated.Value(1)).current;

  // Breathing animation for special cards
  useEffect(() => {
    if (breathe && animated) {
      const breatheLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(breatheAnim, {
            toValue: 1.02,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(breatheAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      );
      breatheLoop.start();
      return () => breatheLoop.stop();
    }
  }, [breathe, animated, breatheAnim]);

  const handlePressIn = () => {
    if (disabled || !animated) return;
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      friction: 8,
      tension: 400,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    if (disabled || !animated) return;
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 4,
      tension: 200,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = async () => {
    if (disabled) return;
    await hapticLight();

    // Flash glow on press
    if (glow) {
      glowAnim.setValue(1);
      Animated.timing(glowAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }

    onPress?.();
  };

  const handleLongPress = async () => {
    if (disabled) return;
    await hapticImpact();
    onLongPress?.();
  };

  // Get gradient and shadow based on variant
  const getVariantStyles = () => {
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
  };

  const variantStyles = getVariantStyles();

  const CardContent = (
    <Animated.View
      style={[
        styles.container,
        variantStyles.shadow,
        {
          transform: [
            { scale: Animated.multiply(scaleAnim, breatheAnim) },
          ],
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      <LinearGradient
        colors={variantStyles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.gradient}
      >
        {/* Glass blur layer - iOS only */}
        {Platform.OS === 'ios' && (
          <BlurView
            intensity={80}
            tint="dark"
            style={StyleSheet.absoluteFill}
          />
        )}

        {/* Glow overlay */}
        {glow && (
          <Animated.View
            style={[
              styles.glowOverlay,
              {
                backgroundColor: variantStyles.glowColor,
                opacity: glowAnim,
              },
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

// Flash animation helper - can be called from parent
export const flashCard = (glowAnim) => {
  glowAnim.setValue(1);
  Animated.timing(glowAnim, {
    toValue: 0,
    duration: 500,
    useNativeDriver: true,
  }).start();
};

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

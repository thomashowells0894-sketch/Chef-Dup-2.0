import React, { useRef, useEffect } from 'react';
import { Text, StyleSheet, Pressable, Animated, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { hapticLight } from '../../lib/haptics';
import { Colors, Gradients, BorderRadius, Shadows, Spacing, FontSize, FontWeight } from '../../constants/theme';

/**
 * Premium Button Component
 * A sleek button with gradient, glow, animations, and haptic feedback
 */
export default function PremiumButton({
  title,
  onPress,
  variant = 'primary', // 'primary', 'secondary', 'success', 'warning', 'error', 'ghost', 'outline'
  size = 'medium', // 'small', 'medium', 'large'
  icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  fullWidth = false,
  breathe = false,
  style,
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.35)).current;
  const breatheAnim = useRef(new Animated.Value(1)).current;

  // Breathing animation for CTA buttons
  useEffect(() => {
    if (breathe && !disabled && !loading) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(breatheAnim, {
            toValue: 1.03,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(breatheAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
  }, [breathe, disabled, loading, breatheAnim]);

  // Glow pulse for primary buttons
  useEffect(() => {
    if (variant === 'primary' && !disabled && !loading) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 0.5,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.35,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
  }, [variant, disabled, loading, glowAnim]);

  const handlePressIn = () => {
    if (disabled || loading) return;
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      friction: 8,
      tension: 400,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    if (disabled || loading) return;
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 4,
      tension: 200,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = async () => {
    if (disabled || loading) return;
    await hapticLight();
    onPress?.();
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'secondary':
        return {
          gradient: Gradients.secondary,
          shadow: Shadows.glowSecondary,
          textColor: Colors.text,
        };
      case 'success':
        return {
          gradient: Gradients.success,
          shadow: Shadows.glowSuccess,
          textColor: Colors.text,
        };
      case 'warning':
        return {
          gradient: Gradients.warning,
          shadow: Shadows.glowWarning,
          textColor: Colors.background,
        };
      case 'error':
        return {
          gradient: Gradients.error,
          shadow: Shadows.glowError,
          textColor: Colors.text,
        };
      case 'ghost':
        return {
          gradient: ['transparent', 'transparent'],
          shadow: {},
          textColor: Colors.primary,
        };
      case 'outline':
        return {
          gradient: ['transparent', 'transparent'],
          shadow: {},
          textColor: Colors.primary,
          borderColor: Colors.primary,
        };
      default: // primary
        return {
          gradient: Gradients.primary,
          shadow: Shadows.glowPrimary,
          textColor: Colors.background,
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          paddingVertical: Spacing.sm,
          paddingHorizontal: Spacing.md,
          fontSize: FontSize.sm,
          borderRadius: BorderRadius.md,
        };
      case 'large':
        return {
          paddingVertical: Spacing.lg,
          paddingHorizontal: Spacing.xl,
          fontSize: FontSize.lg,
          borderRadius: BorderRadius.xl,
        };
      default: // medium
        return {
          paddingVertical: Spacing.md,
          paddingHorizontal: Spacing.lg,
          fontSize: FontSize.md,
          borderRadius: BorderRadius.lg,
        };
    }
  };

  const variantStyles = getVariantStyles();
  const sizeStyles = getSizeStyles();

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      style={[fullWidth && styles.fullWidth, style]}
    >
      <Animated.View
        style={[
          variantStyles.shadow,
          {
            transform: [{ scale: Animated.multiply(scaleAnim, breatheAnim) }],
            opacity: disabled ? 0.5 : 1,
            borderRadius: sizeStyles.borderRadius,
          },
        ]}
      >
        <LinearGradient
          colors={variantStyles.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[
            styles.gradient,
            {
              paddingVertical: sizeStyles.paddingVertical,
              paddingHorizontal: sizeStyles.paddingHorizontal,
              borderRadius: sizeStyles.borderRadius,
              borderWidth: variantStyles.borderColor ? 1.5 : 0,
              borderColor: variantStyles.borderColor || 'transparent',
            },
          ]}
        >
          {loading ? (
            <ActivityIndicator size="small" color={variantStyles.textColor} />
          ) : (
            <>
              {icon && iconPosition === 'left' && (
                <Animated.View style={styles.iconLeft}>{icon}</Animated.View>
              )}
              <Text
                style={[
                  styles.text,
                  {
                    fontSize: sizeStyles.fontSize,
                    color: variantStyles.textColor,
                  },
                ]}
              >
                {title}
              </Text>
              {icon && iconPosition === 'right' && (
                <Animated.View style={styles.iconRight}>{icon}</Animated.View>
              )}
            </>
          )}
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fullWidth: {
    width: '100%',
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: FontWeight.bold,
    textAlign: 'center',
  },
  iconLeft: {
    marginRight: Spacing.sm,
  },
  iconRight: {
    marginLeft: Spacing.sm,
  },
});

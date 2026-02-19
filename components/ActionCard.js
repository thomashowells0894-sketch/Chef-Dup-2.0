import React, { useEffect, useCallback, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { ChevronRight } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { hapticImpact } from '../lib/haptics';
import {
  Colors,
  Spacing,
  FontSize,
  FontWeight,
  BorderRadius,
  Shadows,
} from '../constants/theme';

// Premium Action Card (AI Trainer / Chef)
const ActionCard = memo(function ActionCard({
  icon: Icon,
  title,
  subtitle,
  gradientColors,
  onPress,
  badge,
}) {
  const scale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.3);

  useEffect(() => {
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: 2000 }),
        withTiming(0.3, { duration: 2000 })
      ),
      -1
    );
  }, []);

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.97, { damping: 12, stiffness: 400 });
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

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.actionCardPressable}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}`}
      accessibilityHint={`Navigate to ${title}`}
    >
      <Animated.View style={[styles.actionCardOuter, animatedStyle]}>
        <LinearGradient
          colors={[gradientColors[0] + '25', gradientColors[1] + '12']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.actionCard}
        >
          {/* Glass blur layer */}
          {Platform.OS === 'ios' && (
            <BlurView
              intensity={80}
              tint="dark"
              style={StyleSheet.absoluteFill}
            />
          )}

          {/* Badge */}
          {badge && (
            <View style={styles.actionBadge} accessibilityLabel={`${badge} badge`}>
              <LinearGradient
                colors={gradientColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.actionBadgeGradient}
              >
                <Text style={styles.actionBadgeText}>{badge}</Text>
              </LinearGradient>
            </View>
          )}

          {/* Icon */}
          <View style={styles.actionIconContainer}>
            <LinearGradient
              colors={gradientColors}
              style={styles.actionIconGradient}
            >
              <Icon size={32} color="#000" strokeWidth={2} />
            </LinearGradient>
          </View>

          {/* Text */}
          <Text style={styles.actionTitle} maxFontSizeMultiplier={1.5}>{title}</Text>
          <Text style={styles.actionSubtitle} maxFontSizeMultiplier={1.5}>{subtitle}</Text>

          {/* Arrow */}
          <View style={styles.actionArrow}>
            <ChevronRight size={24} color={Colors.textTertiary} />
          </View>

          {/* Border */}
          <View style={[styles.actionCardBorder, { borderColor: gradientColors[0] + '40' }]} />
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  actionCardPressable: {
    flex: 1,
  },
  actionCardOuter: {
    borderRadius: 24,
    position: 'relative',
    ...Shadows.card,
  },
  actionCard: {
    borderRadius: 24,
    padding: Spacing.xl,
    paddingVertical: Spacing.lg,
    position: 'relative',
    overflow: 'hidden',
    minHeight: 120,
    justifyContent: 'center',
  },
  actionCardBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 24,
    borderWidth: 1,
  },
  actionBadge: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
  },
  actionBadgeGradient: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  actionBadgeText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    color: Colors.background,
    letterSpacing: 1,
  },
  actionIconContainer: {
    marginBottom: Spacing.md,
  },
  actionIconGradient: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  actionSubtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  actionArrow: {
    position: 'absolute',
    right: Spacing.lg,
    bottom: Spacing.lg,
  },
});

export default ActionCard;

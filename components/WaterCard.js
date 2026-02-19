import React, { useEffect, useCallback, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  interpolate,
} from 'react-native-reanimated';
import { Droplets, Plus, GlassWater, Waves } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '../constants/theme';
import { hapticImpact, hapticWarning } from '../lib/haptics';
import { useWaterProgress } from '../context/MealContext';

// Memoized Water button component
const WaterButton = memo(function WaterButton({ emoji, label, amount, onPress, style }) {
  const scaleAnim = useSharedValue(1);
  const glowAnim = useSharedValue(0);

  const handlePressIn = useCallback(() => {
    scaleAnim.value = withSpring(0.92, { damping: 8, stiffness: 400 });
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    scaleAnim.value = withSpring(1, { damping: 4, stiffness: 200 });
  }, [scaleAnim]);

  const handlePress = useCallback(async () => {
    // Glow animation
    glowAnim.value = 1;
    glowAnim.value = withTiming(0, { duration: 400 });

    await hapticImpact();

    onPress(amount);
  }, [glowAnim, amount, onPress]);

  const animatedScaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleAnim.value }],
  }));

  const animatedGlowStyle = useAnimatedStyle(() => ({
    opacity: glowAnim.value,
  }));

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={style}
      accessibilityRole="button"
      accessibilityLabel={`Add ${amount} milliliters of water`}
    >
      <Animated.View
        style={[
          styles.waterButton,
          animatedScaleStyle,
        ]}
      >
        <Animated.View
          style={[
            styles.buttonGlow,
            animatedGlowStyle,
          ]}
        />
        <Text style={styles.buttonEmoji}>{emoji}</Text>
        <Text style={styles.buttonLabel}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
});

// Memoized WaterCard - re-renders only when waterProgress changes
function WaterCard() {
  const { waterProgress, addWater, resetWater } = useWaterProgress();

  // Animation values
  const fillWidth = useSharedValue(0);
  const waveOffset = useSharedValue(0);
  const splashScale = useSharedValue(1);

  // Animate fill width when water changes (scaleX)
  useEffect(() => {
    fillWidth.value = withSpring(Math.min(waterProgress.percentage / 100, 1), {
      damping: 8,
      stiffness: 40,
    });
  }, [waterProgress.percentage, fillWidth]);

  // Continuous wave animation
  useEffect(() => {
    waveOffset.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2000 }),
        withTiming(0, { duration: 2000 }),
      ),
      -1,
    );
  }, [waveOffset]);

  const handleAddWater = useCallback(async (amount) => {
    // Splash animation
    splashScale.value = 0.95;
    splashScale.value = withSpring(1, { damping: 3, stiffness: 200 });

    await addWater(amount);
  }, [addWater, splashScale]);

  const handleLongPress = useCallback(async () => {
    await hapticWarning();

    fillWidth.value = withTiming(0, { duration: 300 });

    await resetWater();
  }, [resetWater, fillWidth]);

  // Animated styles
  const animatedFillStyle = useAnimatedStyle(() => ({
    width: '100%',
    transform: [{ scaleX: fillWidth.value }],
    transformOrigin: 'left',
  }));

  const animatedWaveStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(waveOffset.value, [0, 1], [0, 5]) }],
  }));

  const animatedSplashStyle = useAnimatedStyle(() => ({
    transform: [{ scale: splashScale.value }],
  }));

  // Format numbers with comma
  const formatMl = (ml) => ml.toLocaleString();

  // Calculate percentage
  const percentage = Math.round(waterProgress.percentage);
  const isComplete = percentage >= 100;

  return (
    <Pressable
      style={styles.card}
      onLongPress={handleLongPress}
      delayLongPress={500}
      accessibilityRole="button"
      accessibilityLabel={`Water: ${waterProgress.glasses} of ${waterProgress.glassesGoal} glasses. ${formatMl(waterProgress.ml)} of ${formatMl(waterProgress.goal)} milliliters`}
      accessibilityHint="Tap to log water"
    >
      {/* Glass blur layer */}
      {Platform.OS === 'ios' && (
        <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
      )}

      <Animated.View style={[styles.cardInner, animatedSplashStyle]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.iconContainer}>
              <Droplets size={18} color="#64D2FF" strokeWidth={2.5} />
            </View>
            <Text style={styles.title}>Hydration</Text>
          </View>
          {isComplete && (
            <View style={styles.completeBadge}>
              <Text style={styles.completeBadgeText}>Done!</Text>
            </View>
          )}
        </View>

        {/* Stats */}
        <View style={styles.statsContainer} accessibilityLiveRegion="polite">
          <Text style={styles.currentMl}>{formatMl(waterProgress.ml)}</Text>
          <Text style={styles.goalMl}> / {formatMl(waterProgress.goal)} ml</Text>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressFillContainer,
                animatedFillStyle,
              ]}
            >
              <LinearGradient
                colors={['#64D2FF', '#5AC8FA', '#32ADE6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.progressGradient}
              />
              {/* Wave effect at the end */}
              <Animated.View
                style={[
                  styles.waveIndicator,
                  animatedWaveStyle,
                ]}
              >
                <Waves size={12} color="rgba(255,255,255,0.6)" />
              </Animated.View>
            </Animated.View>
          </View>
          <Text style={styles.percentageText}>{percentage}%</Text>
        </View>

        {/* Quick Add Buttons */}
        <View style={styles.buttonsRow}>
          <WaterButton
            emoji="🥤"
            label="+250ml"
            amount={250}
            onPress={handleAddWater}
            style={styles.buttonWrapper}
          />
          <WaterButton
            emoji="💧"
            label="+500ml"
            amount={500}
            onPress={handleAddWater}
            style={styles.buttonWrapper}
          />
        </View>

        {/* Glasses indicator */}
        <View style={styles.glassesRow}>
          <GlassWater size={12} color={Colors.textTertiary} />
          <Text style={styles.glassesText}>
            {waterProgress.glasses} of {waterProgress.glassesGoal} glasses
          </Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

// Export with memo wrapper
export default memo(WaterCard);

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 24,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  cardInner: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(100, 210, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  completeBadge: {
    backgroundColor: '#64D2FF',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  completeBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.background,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: Spacing.sm,
  },
  currentMl: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: '#64D2FF',
  },
  goalMl: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  progressTrack: {
    flex: 1,
    height: 12,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFillContainer: {
    height: '100%',
    borderRadius: 6,
    overflow: 'hidden',
    position: 'relative',
  },
  progressGradient: {
    flex: 1,
    borderRadius: 6,
  },
  waveIndicator: {
    position: 'absolute',
    right: -2,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  percentageText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: '#64D2FF',
    minWidth: 40,
    textAlign: 'right',
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  buttonWrapper: {
    flex: 1,
  },
  waterButton: {
    backgroundColor: 'rgba(100, 210, 255, 0.12)',
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(100, 210, 255, 0.25)',
    position: 'relative',
    overflow: 'hidden',
  },
  buttonGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(100, 210, 255, 0.4)',
  },
  buttonEmoji: {
    fontSize: 18,
  },
  buttonLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: '#64D2FF',
  },
  glassesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  glassesText: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },
});

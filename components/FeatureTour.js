/**
 * FeatureTour - Feature Discovery / App Tour Overlay
 *
 * A premium full-screen tour overlay with Future Glass dark design.
 * Animated glass cards, step indicators, spring emoji animations,
 * and smooth slide transitions between steps.
 *
 * Props:
 *   steps  - Array of { title, description, icon, color, emoji }
 *   onComplete - Called when the user finishes or skips the tour
 *   visible - Boolean controlling overlay visibility
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Dimensions,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  interpolate,
  Extrapolation,
  runOnJS,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { ChevronRight, X } from 'lucide-react-native';
import { hapticLight, hapticSuccess } from '../lib/haptics';
import {
  Colors,
  Spacing,
  FontSize,
  FontWeight,
  BorderRadius,
  Shadows,
  Gradients,
} from '../constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - Spacing.xl * 2;

const SPRING_CONFIG = {
  damping: 14,
  stiffness: 120,
  mass: 0.8,
};

const EMOJI_SPRING = {
  damping: 8,
  stiffness: 150,
  mass: 0.6,
};

export default function FeatureTour({ steps = [], onComplete, visible }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(visible);

  // Animated values
  const overlayOpacity = useSharedValue(0);
  const cardTranslateX = useSharedValue(0);
  const cardScale = useSharedValue(0.85);
  const cardOpacity = useSharedValue(0);
  const emojiScale = useSharedValue(0);
  const emojiRotate = useSharedValue(-15);
  const dotIndicatorOpacity = useSharedValue(0);
  const buttonOpacity = useSharedValue(0);

  const isLast = currentStep === steps.length - 1;
  const step = steps[currentStep];

  // Show/hide the modal
  useEffect(() => {
    if (visible) {
      setIsVisible(true);
      setCurrentStep(0);
      // Entry animation sequence
      overlayOpacity.value = withTiming(1, { duration: 350 });
      cardScale.value = withDelay(150, withSpring(1, SPRING_CONFIG));
      cardOpacity.value = withDelay(150, withTiming(1, { duration: 300 }));
      cardTranslateX.value = 0;
      emojiScale.value = withDelay(350, withSpring(1, EMOJI_SPRING));
      emojiRotate.value = withDelay(350, withSpring(0, EMOJI_SPRING));
      dotIndicatorOpacity.value = withDelay(400, withTiming(1, { duration: 250 }));
      buttonOpacity.value = withDelay(500, withTiming(1, { duration: 250 }));
    } else {
      // Exit animation
      overlayOpacity.value = withTiming(0, { duration: 250 });
      cardScale.value = withTiming(0.85, { duration: 250 });
      cardOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [visible]);

  // Animate emoji when step changes
  useEffect(() => {
    emojiScale.value = 0;
    emojiRotate.value = -15;
    emojiScale.value = withDelay(100, withSpring(1, EMOJI_SPRING));
    emojiRotate.value = withDelay(100, withSpring(0, EMOJI_SPRING));
  }, [currentStep]);

  const handleNext = useCallback(async () => {
    await hapticLight();

    if (isLast) {
      // Complete the tour
      await hapticSuccess();
      // Exit animation then dismiss
      overlayOpacity.value = withTiming(0, { duration: 300 });
      cardScale.value = withSpring(0.8, { damping: 12, stiffness: 200 });
      cardOpacity.value = withTiming(0, { duration: 250 });
      buttonOpacity.value = withTiming(0, { duration: 150 });
      dotIndicatorOpacity.value = withTiming(0, { duration: 150 });

      setTimeout(() => {
        setIsVisible(false);
        onComplete?.();
      }, 350);
      return;
    }

    // Slide out to left
    cardTranslateX.value = withTiming(-SCREEN_WIDTH * 0.3, { duration: 200 });
    cardOpacity.value = withTiming(0.3, { duration: 200 });
    emojiScale.value = withTiming(0, { duration: 150 });

    setTimeout(() => {
      setCurrentStep((prev) => prev + 1);
      // Reset position to right, then slide in
      cardTranslateX.value = SCREEN_WIDTH * 0.3;
      cardOpacity.value = 0.3;
      cardTranslateX.value = withSpring(0, SPRING_CONFIG);
      cardOpacity.value = withTiming(1, { duration: 300 });
    }, 220);
  }, [isLast, onComplete]);

  const handleSkip = useCallback(async () => {
    await hapticLight();
    // Quick exit animation
    overlayOpacity.value = withTiming(0, { duration: 250 });
    cardScale.value = withTiming(0.85, { duration: 200 });
    cardOpacity.value = withTiming(0, { duration: 200 });
    buttonOpacity.value = withTiming(0, { duration: 100 });
    dotIndicatorOpacity.value = withTiming(0, { duration: 100 });

    setTimeout(() => {
      setIsVisible(false);
      onComplete?.();
    }, 300);
  }, [onComplete]);

  const handlePrev = useCallback(async () => {
    if (currentStep === 0) return;
    await hapticLight();

    // Slide out to right
    cardTranslateX.value = withTiming(SCREEN_WIDTH * 0.3, { duration: 200 });
    cardOpacity.value = withTiming(0.3, { duration: 200 });
    emojiScale.value = withTiming(0, { duration: 150 });

    setTimeout(() => {
      setCurrentStep((prev) => prev - 1);
      // Reset position to left, then slide in
      cardTranslateX.value = -SCREEN_WIDTH * 0.3;
      cardOpacity.value = 0.3;
      cardTranslateX.value = withSpring(0, SPRING_CONFIG);
      cardOpacity.value = withTiming(1, { duration: 300 });
    }, 220);
  }, [currentStep]);

  // --- Animated styles ---
  const overlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: cardTranslateX.value },
      { scale: cardScale.value },
    ],
    opacity: cardOpacity.value,
  }));

  const emojiAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: emojiScale.value },
      { rotate: `${emojiRotate.value}deg` },
    ],
  }));

  const dotsAnimatedStyle = useAnimatedStyle(() => ({
    opacity: dotIndicatorOpacity.value,
  }));

  const buttonsAnimatedStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
  }));

  if (!isVisible || steps.length === 0) return null;

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleSkip}
    >
      {/* Dark overlay */}
      <Animated.View style={[styles.overlay, overlayAnimatedStyle]}>
        {Platform.OS === 'ios' && (
          <BlurView
            intensity={30}
            tint="dark"
            style={StyleSheet.absoluteFill}
          />
        )}

        <View style={styles.content}>
          {/* Step counter */}
          <Animated.View style={[styles.stepCounterContainer, dotsAnimatedStyle]}>
            <Text style={styles.stepCounter}>
              {currentStep + 1} of {steps.length}
            </Text>
          </Animated.View>

          {/* Step indicator dots */}
          <Animated.View style={[styles.dotsContainer, dotsAnimatedStyle]}>
            {steps.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  index === currentStep && styles.dotActive,
                  index === currentStep && { backgroundColor: step?.color || Colors.primary },
                  index < currentStep && styles.dotCompleted,
                ]}
              />
            ))}
          </Animated.View>

          {/* Glass card */}
          <Animated.View style={[styles.cardWrapper, cardAnimatedStyle]}>
            <View style={[styles.card, { borderColor: (step?.color || Colors.primary) + '30' }]}>
              {Platform.OS === 'ios' && (
                <BlurView
                  intensity={60}
                  tint="dark"
                  style={StyleSheet.absoluteFill}
                />
              )}

              {/* Colored glow accent behind card */}
              <View
                style={[
                  styles.cardGlow,
                  { backgroundColor: (step?.color || Colors.primary) + '10' },
                ]}
              />

              {/* Emoji / Icon */}
              <Animated.View style={[styles.emojiContainer, emojiAnimatedStyle]}>
                <View
                  style={[
                    styles.emojiBg,
                    { backgroundColor: (step?.color || Colors.primary) + '18' },
                  ]}
                >
                  <Text style={styles.emoji}>{step?.emoji}</Text>
                </View>
              </Animated.View>

              {/* Title */}
              <Text style={styles.title}>{step?.title}</Text>

              {/* Color accent line */}
              <View
                style={[
                  styles.accentLine,
                  { backgroundColor: step?.color || Colors.primary },
                ]}
              />

              {/* Description */}
              <Text style={styles.description}>{step?.description}</Text>
            </View>
          </Animated.View>

          {/* Bottom buttons */}
          <Animated.View style={[styles.buttonsContainer, buttonsAnimatedStyle]}>
            {/* Next / Get Started button */}
            <Pressable onPress={handleNext} style={styles.nextButtonPressable}>
              <LinearGradient
                colors={
                  isLast
                    ? [step?.color || Colors.primary, (step?.color || Colors.primary) + 'CC']
                    : Gradients.primary
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.nextButton}
              >
                <Text style={styles.nextButtonText}>
                  {isLast ? 'Get Started!' : 'Next'}
                </Text>
                {!isLast && (
                  <ChevronRight
                    size={20}
                    color={Colors.background}
                    strokeWidth={2.5}
                  />
                )}
              </LinearGradient>
            </Pressable>

            {/* Skip link (hidden on last step) */}
            {!isLast && (
              <Pressable onPress={handleSkip} style={styles.skipButton}>
                <Text style={styles.skipText}>Skip Tour</Text>
              </Pressable>
            )}
          </Animated.View>

          {/* Close X button top-right */}
          <Pressable
            onPress={handleSkip}
            style={styles.closeButton}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <View style={styles.closeButtonInner}>
              <X size={18} color={Colors.textSecondary} strokeWidth={2.5} />
            </View>
          </Pressable>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },

  // Step counter
  stepCounterContainer: {
    marginBottom: Spacing.md,
  },
  stepCounter: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textTertiary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  // Dots
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.surfaceBright,
  },
  dotActive: {
    width: 24,
    height: 8,
    borderRadius: 4,
  },
  dotCompleted: {
    backgroundColor: Colors.textTertiary,
  },

  // Card
  cardWrapper: {
    width: CARD_WIDTH,
    marginBottom: Spacing.xxl,
  },
  card: {
    borderRadius: BorderRadius.xxl,
    padding: Spacing.xl,
    paddingVertical: Spacing.xxl,
    backgroundColor: Platform.OS === 'ios' ? 'transparent' : Colors.surface,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    ...Shadows.cardElevated,
  },
  cardGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: BorderRadius.xxl,
  },

  // Emoji
  emojiContainer: {
    marginBottom: Spacing.lg,
  },
  emojiBg: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 48,
  },

  // Title
  title: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.md,
    letterSpacing: -0.5,
  },

  // Accent line
  accentLine: {
    width: 40,
    height: 3,
    borderRadius: 2,
    marginBottom: Spacing.md,
  },

  // Description
  description: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.regular,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 26,
    paddingHorizontal: Spacing.sm,
  },

  // Buttons
  buttonsContainer: {
    alignItems: 'center',
    width: '100%',
    gap: Spacing.md,
  },
  nextButtonPressable: {
    width: '100%',
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.button,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md + 2,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
    gap: Spacing.xs,
  },
  nextButtonText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.background,
    letterSpacing: 0.3,
  },
  skipButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  skipText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.textTertiary,
  },

  // Close button
  closeButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    right: Spacing.lg,
    zIndex: 10,
  },
  closeButtonInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

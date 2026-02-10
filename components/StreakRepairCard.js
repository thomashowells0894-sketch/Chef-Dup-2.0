import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { hapticHeavy, hapticSuccess } from '../lib/haptics';
import { Flame, AlertCircle, Sparkles } from 'lucide-react-native';
import { useGamification } from '../context/GamificationContext';
import {
  Colors,
  Gradients,
  Spacing,
  BorderRadius,
  FontSize,
  FontWeight,
  Shadows,
} from '../constants/theme';

export default function StreakRepairCard() {
  const { brokenStreak, canRepairStreak, repairStreak, currentStreak } = useGamification();
  const [isRepairing, setIsRepairing] = useState(false);
  const [repaired, setRepaired] = useState(false);

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (canRepairStreak && brokenStreak) {
      // Entry animation
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 100,
        useNativeDriver: true,
      }).start();

      // Pulse animation for urgency
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.02,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();

      // Shake animation for the broken flame
      const shake = Animated.loop(
        Animated.sequence([
          Animated.timing(shakeAnim, { toValue: 3, duration: 100, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: -3, duration: 100, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 2, duration: 100, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: -2, duration: 100, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
          Animated.delay(2000),
        ])
      );
      shake.start();

      return () => {
        pulse.stop();
        shake.stop();
      };
    }
  }, [canRepairStreak, brokenStreak, scaleAnim, pulseAnim, shakeAnim]);

  const handleRepair = async () => {
    if (isRepairing) return;

    await hapticHeavy();

    setIsRepairing(true);

    const success = await repairStreak();

    if (success) {
      setRepaired(true);
      await hapticSuccess();

      // Animate out after success
      setTimeout(() => {
        Animated.timing(scaleAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }, 2000);
    }

    setIsRepairing(false);
  };

  // Don't render if no broken streak or already repaired
  if (!canRepairStreak || !brokenStreak || repaired) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ scale: scaleAnim }, { scale: pulseAnim }],
          opacity: scaleAnim,
        },
      ]}
    >
      <BlurView intensity={25} tint="dark" style={styles.blurContainer}>
        <LinearGradient
          colors={['rgba(255, 82, 82, 0.2)', 'rgba(255, 107, 53, 0.1)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          {/* Warning glow */}
          <View style={styles.warningGlow} />

          <View style={styles.content}>
            {/* Broken streak icon */}
            <Animated.View
              style={[
                styles.iconContainer,
                { transform: [{ translateX: shakeAnim }] },
              ]}
            >
              <LinearGradient
                colors={['#FF5252', '#FF6B35']}
                style={styles.iconGradient}
              >
                <Flame size={28} color="#fff" strokeWidth={2.5} />
              </LinearGradient>
              <View style={styles.brokenBadge}>
                <AlertCircle size={14} color="#fff" />
              </View>
            </Animated.View>

            {/* Text */}
            <View style={styles.textContainer}>
              <Text style={styles.title}>Streak Broken!</Text>
              <Text style={styles.subtitle}>
                Your {brokenStreak.previousStreak}-day streak ended. Repair it now!
              </Text>
            </View>
          </View>

          {/* Repair button */}
          <Pressable
            onPress={handleRepair}
            disabled={isRepairing}
            style={styles.buttonWrapper}
          >
            <LinearGradient
              colors={isRepairing ? ['#666', '#555'] : ['#FF6B35', '#FF453A']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.repairButton}
            >
              {isRepairing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Sparkles size={18} color="#fff" />
                  <Text style={styles.buttonText}>Repair Streak</Text>
                </>
              )}
            </LinearGradient>
          </Pressable>

          {/* Border */}
          <View style={styles.border} />
        </LinearGradient>
      </BlurView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadows.glowError,
  },
  blurContainer: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  gradient: {
    padding: Spacing.lg,
    position: 'relative',
    overflow: 'hidden',
  },
  warningGlow: {
    position: 'absolute',
    top: -30,
    left: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 82, 82, 0.3)',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  iconContainer: {
    position: 'relative',
    marginRight: Spacing.md,
  },
  iconGradient: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brokenBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.background,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  buttonWrapper: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    ...Shadows.glowSecondary,
  },
  repairButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  buttonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: '#fff',
  },
  border: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 82, 82, 0.3)',
    pointerEvents: 'none',
  },
});

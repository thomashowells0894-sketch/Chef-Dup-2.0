import React, { memo, useRef, useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Platform } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { BlurView } from 'expo-blur';
import { Timer, Play, Square, Flame } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '../constants/theme';
import { useFasting, calculateFastingProgress, formatTime } from '../context/FastingContext';

// Fasting orange color
const FASTING_COLOR = '#FF9500';
const FASTING_COLOR_LIGHT = 'rgba(255, 149, 0, 0.15)';

// Animated circle component
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function CircularProgress({ progress, size = 100, strokeWidth = 8 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <Svg width={size} height={size}>
      {/* Background circle */}
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={Colors.surfaceElevated}
        strokeWidth={strokeWidth}
        fill="none"
      />
      {/* Progress circle */}
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={FASTING_COLOR}
        strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        rotation="-90"
        origin={`${size / 2}, ${size / 2}`}
      />
    </Svg>
  );
}

function FastingCard() {
  const {
    isFasting,
    fastDuration,
    fastStartTime,
    startFast,
    endFast,
    lastMealTime,
  } = useFasting();

  // Local timer — only this component re-renders every 60s, not the whole app
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!isFasting && !lastMealTime) return;
    const interval = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(interval);
  }, [isFasting, lastMealTime]);

  // Compute progress locally using the exported helper
  const fastingProgress = useMemo(() => {
    const _ = tick; // reference tick to trigger recalc
    return calculateFastingProgress(fastStartTime, fastDuration);
  }, [fastStartTime, fastDuration, tick]);

  const formattedElapsed = useMemo(() => {
    return formatTime(fastingProgress.elapsedHours, fastingProgress.elapsedMinutes);
  }, [fastingProgress.elapsedHours, fastingProgress.elapsedMinutes]);

  const formattedRemaining = useMemo(() => {
    return formatTime(fastingProgress.remainingHours, fastingProgress.remainingMinutes);
  }, [fastingProgress.remainingHours, fastingProgress.remainingMinutes]);

  // Eating window info (when not fasting)
  const eatingWindowInfo = useMemo(() => {
    if (isFasting || !lastMealTime) return null;
    const _ = tick;
    const eatingWindowHours = 24 - fastDuration;
    const timeSince = Date.now() - lastMealTime;
    const hoursEating = timeSince / (1000 * 60 * 60);
    const hoursRemaining = Math.max(eatingWindowHours - hoursEating, 0);
    return {
      totalHours: eatingWindowHours,
      hoursUsed: Math.min(hoursEating, eatingWindowHours),
      hoursRemaining,
      progress: Math.min(hoursEating / eatingWindowHours, 1),
    };
  }, [isFasting, lastMealTime, fastDuration, tick]);

  // Calculate time since last meal for display
  const timeSinceLastMeal = useMemo(() => {
    if (!lastMealTime) return null;
    const _ = tick;
    const hours = Math.floor((Date.now() - lastMealTime) / (1000 * 60 * 60));
    const minutes = Math.floor(((Date.now() - lastMealTime) / (1000 * 60)) % 60);
    if (hours === 0) return `${minutes}m ago`;
    return `${hours}h ${minutes}m ago`;
  }, [lastMealTime, tick]);

  // Animation values
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;

  // Pulse animation when fasting
  useEffect(() => {
    if (isFasting) {
      // Start pulse animation
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();

      // Glow effect
      Animated.timing(glowOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
      glowOpacity.setValue(0);
    }
  }, [isFasting, pulseAnim, glowOpacity]);

  const handleStartFast = () => {
    startFast();
  };

  const handleEndFast = () => {
    endFast();
  };

  return (
    <View style={[styles.card, isFasting && styles.cardFasting]}>
      {/* Glass blur layer */}
      {Platform.OS === 'ios' && (
        <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
      )}

      {/* Glow effect when fasting */}
      {isFasting && (
        <Animated.View
          style={[
            styles.glowEffect,
            { opacity: glowOpacity },
          ]}
        />
      )}

      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.iconContainer, isFasting && styles.iconContainerFasting]}>
            {isFasting ? (
              <Flame size={18} color={FASTING_COLOR} />
            ) : (
              <Timer size={18} color={Colors.textSecondary} />
            )}
          </View>
          <Text style={[styles.title, isFasting && styles.titleFasting]}>
            {isFasting ? 'FASTING' : 'FASTING TIMER'}
          </Text>
          {isFasting && fastingProgress.isComplete && (
            <View style={styles.completeBadge}>
              <Text style={styles.completeBadgeText}>GOAL!</Text>
            </View>
          )}
        </View>

        {isFasting ? (
          // Fasting state - show timer
          <View style={styles.fastingContent}>
            <Animated.View
              style={[
                styles.progressContainer,
                { transform: [{ scale: pulseAnim }] },
              ]}
            >
              <CircularProgress
                progress={fastingProgress.progress}
                size={90}
                strokeWidth={8}
              />
              <View style={styles.progressCenter}>
                <Text style={styles.progressPercent}>
                  {Math.round(fastingProgress.progress * 100)}%
                </Text>
              </View>
            </Animated.View>

            <View style={styles.timeStats}>
              <View style={styles.timeStat}>
                <Text style={styles.timeValue}>{formattedElapsed}</Text>
                <Text style={styles.timeLabel}>Elapsed</Text>
              </View>
              <View style={styles.timeDivider} />
              <View style={styles.timeStat}>
                <Text style={[styles.timeValue, styles.timeValueRemaining]}>
                  {formattedRemaining}
                </Text>
                <Text style={styles.timeLabel}>Remaining</Text>
              </View>
            </View>

            <Pressable style={styles.endButton} onPress={handleEndFast}>
              <Square size={14} color={Colors.background} fill={Colors.background} />
              <Text style={styles.endButtonText}>End Fast</Text>
            </Pressable>
          </View>
        ) : (
          // Not fasting - show eating window or start button
          <View style={styles.idleContent}>
            {eatingWindowInfo ? (
              // Show eating window progress
              <>
                <View style={styles.eatingWindowHeader}>
                  <Text style={styles.eatingWindowTitle}>Eating Window</Text>
                  <Text style={styles.eatingWindowSubtitle}>
                    {Math.round(eatingWindowInfo.hoursRemaining)}h left to eat
                  </Text>
                </View>

                <View style={styles.progressBarContainer}>
                  <View style={styles.progressBarTrack}>
                    <View
                      style={[
                        styles.progressBarFill,
                        { width: `${Math.min(eatingWindowInfo.progress * 100, 100)}%` },
                      ]}
                    />
                  </View>
                  <View style={styles.progressBarLabels}>
                    <Text style={styles.progressBarLabel}>
                      {Math.round(eatingWindowInfo.hoursUsed)}h used
                    </Text>
                    <Text style={styles.progressBarLabel}>
                      {eatingWindowInfo.totalHours}h window
                    </Text>
                  </View>
                </View>

                {timeSinceLastMeal && (
                  <Text style={styles.lastMealText}>Last meal: {timeSinceLastMeal}</Text>
                )}

                <Pressable style={styles.startButton} onPress={handleStartFast}>
                  <Play size={16} color={Colors.background} fill={Colors.background} />
                  <Text style={styles.startButtonText}>Start Fast Now</Text>
                </Pressable>
              </>
            ) : (
              // No eating window data yet
              <>
                <View style={styles.idleInfo}>
                  <Text style={styles.idleTitle}>Ready to Fast?</Text>
                  <Text style={styles.idleSubtitle}>{fastDuration}:{24 - fastDuration} protocol</Text>
                </View>

                <Pressable style={styles.startButton} onPress={handleStartFast}>
                  <Play size={16} color={Colors.background} fill={Colors.background} />
                  <Text style={styles.startButtonText}>Start Fast</Text>
                </Pressable>
              </>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

export default memo(FastingCard);

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 24,
    padding: Spacing.md,
    margin: Spacing.xs,
    flex: 1,
    minHeight: 200,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardFasting: {
    borderWidth: 1,
    borderColor: FASTING_COLOR + '40',
  },
  glowEffect: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: FASTING_COLOR_LIGHT,
    borderRadius: 24,
  },
  content: {
    flex: 1,
    zIndex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainerFasting: {
    backgroundColor: FASTING_COLOR + '20',
  },
  title: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
  },
  titleFasting: {
    color: FASTING_COLOR,
  },
  completeBadge: {
    backgroundColor: FASTING_COLOR,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  completeBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.background,
  },
  // Fasting state styles
  fastingContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressPercent: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: FASTING_COLOR,
  },
  timeStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginVertical: Spacing.sm,
  },
  timeStat: {
    flex: 1,
    alignItems: 'center',
  },
  timeValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  timeValueRemaining: {
    color: FASTING_COLOR,
  },
  timeLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  timeDivider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.border,
  },
  endButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.danger,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    width: '100%',
  },
  endButtonText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.background,
  },
  // Idle state styles
  idleContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  idleInfo: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  idleTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  idleSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    backgroundColor: FASTING_COLOR,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  startButtonText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.background,
  },
  // Eating window styles
  eatingWindowHeader: {
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  eatingWindowTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  eatingWindowSubtitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.success,
    marginTop: 2,
  },
  progressBarContainer: {
    width: '100%',
    marginBottom: Spacing.sm,
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.success,
    borderRadius: 4,
  },
  progressBarLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  progressBarLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  lastMealText: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
});

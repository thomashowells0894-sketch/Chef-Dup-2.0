import React, { memo, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Flame, TrendingUp, Zap } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { hapticImpact } from '../lib/haptics';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '../constants/theme';
import CalorieRing from './CalorieRing';

// Memoized DaySummary - prevents unnecessary re-renders
const DaySummary = memo(function DaySummary({
  consumed,
  goal,
  remaining,
  burned,
  streak,
  onPress,
}) {
  const scale = useSharedValue(1);

  // Memoize computed values
  const isOverGoal = useMemo(() => remaining < 0, [remaining]);
  const percentage = useMemo(() => goal > 0 ? Math.round((consumed / goal) * 100) : 0, [consumed, goal]);

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.98, { damping: 12, stiffness: 300 });
  }, []);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 8, stiffness: 200 });
  }, []);

  const handlePress = useCallback(async () => {
    await hapticImpact();
    if (onPress) onPress();
  }, [onPress]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View
        style={[styles.container, animatedStyle]}
        accessibilityRole="summary"
        accessibilityLabel={`Day summary. ${consumed} of ${goal} calories consumed. ${burned} calories burned from exercise. ${Math.abs(remaining)} calories ${isOverGoal ? 'over' : 'remaining'}. ${streak} day streak.`}
      >
        {/* Glass blur layer */}
        {Platform.OS === 'ios' && (
          <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
        )}

        {/* Streak Badge - Top Right */}
        <View style={styles.streakBadge}>
          <Flame size={14} color={Colors.warning} />
          <Text style={styles.streakText}>{streak}</Text>
        </View>

        {/* Main Content */}
        <View style={styles.content}>
          {/* Calorie Ring */}
          <View style={styles.ringContainer}>
            <CalorieRing
              consumed={consumed}
              goal={goal}
              size={140}
              strokeWidth={12}
            />
          </View>

          {/* Stats */}
          <View style={styles.statsContainer} accessibilityLiveRegion="polite">
            <View style={styles.statRow}>
              <View style={styles.stat}>
                <Text style={styles.statLabel}>Goal</Text>
                <Text style={styles.statValue}>{goal.toLocaleString()}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Text style={styles.statLabel}>Food</Text>
                <Text style={styles.statValue}>{consumed.toLocaleString()}</Text>
              </View>
            </View>

            <View style={styles.statRow}>
              <View style={styles.stat}>
                <View style={styles.statIconRow}>
                  <Zap size={12} color={Colors.primary} />
                  <Text style={styles.statLabel}>Exercise</Text>
                </View>
                <Text style={[styles.statValue, { color: Colors.primary }]}>
                  +{burned}
                </Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <View style={styles.statIconRow}>
                  <TrendingUp size={12} color={isOverGoal ? Colors.danger : Colors.textSecondary} />
                  <Text style={styles.statLabel}>
                    {isOverGoal ? 'Over' : 'Left'}
                  </Text>
                </View>
                <Text style={[
                  styles.statValue,
                  isOverGoal && { color: Colors.danger }
                ]}>
                  {Math.abs(remaining).toLocaleString()}
                </Text>
              </View>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressContainer}>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.min(percentage, 100)}%`,
                      backgroundColor: isOverGoal ? Colors.danger : Colors.primary,
                    },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>{percentage}%</Text>
            </View>
          </View>
        </View>

        {/* Hint */}
        <Text style={styles.hint}>Tap for details</Text>
      </Animated.View>
    </Pressable>
  );
}, (prevProps, nextProps) => {
  // Custom comparison - only re-render when calorie data changes
  return (
    prevProps.consumed === nextProps.consumed &&
    prevProps.goal === nextProps.goal &&
    prevProps.remaining === nextProps.remaining &&
    prevProps.burned === nextProps.burned &&
    prevProps.streak === nextProps.streak
  );
});

export default DaySummary;

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 24,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  streakBadge: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.warning + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    gap: 4,
    zIndex: 1,
  },
  streakText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.warning,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  ringContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsContainer: {
    flex: 1,
    gap: Spacing.md,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stat: {
    flex: 1,
  },
  statIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.sm,
  },
  statLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  statValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    minWidth: 36,
    textAlign: 'right',
  },
  hint: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
});

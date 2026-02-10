import React, { memo, useRef, useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { hapticImpact, hapticLight } from '../lib/haptics';
import {
  ChefHat,
  Dumbbell,
  Trophy,
  Flame,
  Moon,
  Zap,
  Target,
  TrendingUp,
  Sparkles,
  ChevronRight,
  X,
} from 'lucide-react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import { useFood } from '../context/FoodContext';
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

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Smart card configurations
const CARD_CONFIGS = {
  dinnerSuggestion: {
    id: 'dinner',
    icon: ChefHat,
    gradient: ['#FF8C32', '#FF5A1E'],
    glowColor: '#FF8C32',
    title: 'Time for dinner!',
    subtitle: 'Need a high-protein recipe? Let AI Chef help',
    action: '/chef',
    priority: 1,
  },
  workoutReminder: {
    id: 'workout',
    icon: Dumbbell,
    gradient: ['#00D4FF', '#7B61FF'],
    glowColor: '#00D4FF',
    title: 'Keep the streak alive!',
    subtitle: 'Try a quick 15-min blast workout',
    action: '/generate-workout',
    priority: 2,
  },
  goalAchieved: {
    id: 'goal',
    icon: Trophy,
    gradient: ['#FFD700', '#FFA500'],
    glowColor: '#FFD700',
    title: 'Goal Crushed!',
    subtitle: "You've hit your calorie target today",
    action: null,
    priority: 0,
    isVictory: true,
  },
  streakCelebration: {
    id: 'streak',
    icon: Flame,
    gradient: ['#FF6B35', '#FF453A'],
    glowColor: '#FF6B35',
    title: 'Streak On Fire!',
    subtitle: null, // Dynamic
    action: null,
    priority: 0,
  },
  eveningWind: {
    id: 'evening',
    icon: Moon,
    gradient: ['#7B61FF', '#4A148C'],
    glowColor: '#7B61FF',
    title: 'Wind down with yoga',
    subtitle: 'Perfect evening stretch routine',
    action: '/generate-workout',
    actionParams: { goal: 'yoga' },
    priority: 3,
  },
  proteinBoost: {
    id: 'protein',
    icon: Zap,
    gradient: ['#FF6B9D', '#FF8A80'],
    glowColor: '#FF6B9D',
    title: 'Protein running low',
    subtitle: 'Need a protein-rich meal suggestion?',
    action: '/chef',
    priority: 4,
  },
  calorieDeficit: {
    id: 'deficit',
    icon: Target,
    gradient: ['#00E676', '#00C853'],
    glowColor: '#00E676',
    title: 'Room to eat!',
    subtitle: null, // Dynamic
    action: '/add',
    priority: 5,
  },
  weeklyProgress: {
    id: 'weekly',
    icon: TrendingUp,
    gradient: ['#00D4FF', '#00E676'],
    glowColor: '#00D4FF',
    title: 'Great week so far!',
    subtitle: null, // Dynamic
    action: null,
    priority: 6,
  },
};

// Single contextual card component
function ContextCard({ config, onDismiss, onShowConfetti }) {
  const router = useRouter();
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const Icon = config.icon;

  useEffect(() => {
    // Entry animation
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 8,
      tension: 100,
      useNativeDriver: true,
    }).start();

    // Glow pulse for victory cards
    if (config.isVictory) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();

      // Trigger confetti for goal achieved
      if (config.id === 'goal') {
        setTimeout(() => onShowConfetti?.(), 300);
      }

      return () => pulse.stop();
    }
  }, [config.isVictory, config.id, glowAnim, onShowConfetti, scaleAnim]);

  const handlePress = async () => {
    await hapticImpact();

    if (config.action) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
      router.push(config.action);
    }
  };

  const handleDismiss = async () => {
    await hapticLight();

    Animated.timing(scaleAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      onDismiss?.(config.id);
    });
  };

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.6],
  });

  return (
    <Animated.View
      style={[
        styles.cardOuter,
        {
          transform: [{ scale: scaleAnim }],
          opacity: scaleAnim,
        },
      ]}
    >
      <Pressable onPress={handlePress} style={styles.cardPressable}>
        <BlurView intensity={20} tint="dark" style={styles.blurContainer}>
          <LinearGradient
            colors={[`${config.gradient[0]}20`, `${config.gradient[1]}10`]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardGradient}
          >
            {/* Glow effect for victory */}
            {config.isVictory && (
              <Animated.View
                style={[
                  styles.victoryGlow,
                  {
                    backgroundColor: config.glowColor,
                    opacity: glowOpacity,
                  },
                ]}
              />
            )}

            <View style={styles.cardContent}>
              {/* Icon */}
              <View style={styles.iconContainer}>
                <LinearGradient
                  colors={config.gradient}
                  style={styles.iconGradient}
                >
                  <Icon size={24} color="#fff" strokeWidth={2.5} />
                </LinearGradient>
              </View>

              {/* Text */}
              <View style={styles.textContainer}>
                <Text style={styles.cardTitle}>{config.title}</Text>
                {config.subtitle && (
                  <Text style={styles.cardSubtitle}>{config.subtitle}</Text>
                )}
              </View>

              {/* Action indicator */}
              {config.action ? (
                <ChevronRight size={20} color={Colors.textTertiary} />
              ) : (
                <Pressable onPress={handleDismiss} hitSlop={10}>
                  <View style={styles.dismissButton}>
                    <X size={16} color={Colors.textTertiary} />
                  </View>
                </Pressable>
              )}
            </View>

            {/* Border */}
            <View
              style={[
                styles.cardBorder,
                { borderColor: `${config.gradient[0]}30` },
              ]}
            />
          </LinearGradient>
        </BlurView>
      </Pressable>
    </Animated.View>
  );
}

function ContextualCards() {
  const { totals, goals, remaining, exercises, weeklyStats } = useFood();
  const { currentStreak, hasActivityToday } = useGamification();
  const [dismissedCards, setDismissedCards] = useState([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const confettiRef = useRef(null);

  // Get current hour for time-based suggestions
  const currentHour = useMemo(() => new Date().getHours(), []);

  // Smart card logic - determines which cards to show
  const activeCards = useMemo(() => {
    const cards = [];

    // 1. Goal Achieved - Highest priority celebration
    const caloriesConsumed = totals.calories;
    const caloriesGoal = goals.calories;
    const withinGoal = caloriesConsumed >= caloriesGoal * 0.9 && caloriesConsumed <= caloriesGoal * 1.05;

    if (withinGoal && !dismissedCards.includes('goal')) {
      cards.push({
        ...CARD_CONFIGS.goalAchieved,
        subtitle: `${caloriesConsumed} / ${caloriesGoal} cal - Perfect balance!`,
      });
    }

    // 2. Streak celebration (milestone streaks)
    if (currentStreak > 0 && currentStreak % 5 === 0 && !dismissedCards.includes('streak')) {
      cards.push({
        ...CARD_CONFIGS.streakCelebration,
        subtitle: `${currentStreak} day streak! You're unstoppable`,
      });
    }

    // 3. Dinner suggestion (evening + calories remaining)
    const caloriesLeft = remaining.calories;
    if (currentHour >= 17 && currentHour <= 21 && caloriesLeft > 300 && !dismissedCards.includes('dinner')) {
      cards.push({
        ...CARD_CONFIGS.dinnerSuggestion,
        subtitle: `${caloriesLeft} cal remaining - Time for a great meal!`,
      });
    }

    // 4. Workout reminder (no exercise logged today)
    const hasWorkoutToday = exercises && exercises.length > 0;
    if (!hasWorkoutToday && currentHour >= 9 && currentHour <= 20 && !dismissedCards.includes('workout')) {
      cards.push(CARD_CONFIGS.workoutReminder);
    }

    // 5. Evening yoga suggestion (late evening)
    if (currentHour >= 20 && currentHour <= 23 && !dismissedCards.includes('evening')) {
      cards.push(CARD_CONFIGS.eveningWind);
    }

    // 6. Protein boost (protein target < 50%)
    const proteinPercent = (totals.protein / goals.protein) * 100;
    if (proteinPercent < 50 && currentHour >= 12 && !dismissedCards.includes('protein')) {
      const proteinNeeded = Math.round(goals.protein - totals.protein);
      cards.push({
        ...CARD_CONFIGS.proteinBoost,
        subtitle: `${proteinNeeded}g protein to go - Let's find something tasty`,
      });
    }

    // 7. Room to eat (significant deficit, afternoon)
    if (caloriesLeft > 500 && currentHour >= 14 && currentHour <= 18 && !dismissedCards.includes('deficit')) {
      cards.push({
        ...CARD_CONFIGS.calorieDeficit,
        subtitle: `${caloriesLeft} cal remaining - Room for a healthy snack!`,
      });
    }

    // 8. Weekly progress (good week stats)
    if (weeklyStats && weeklyStats.daysOnTrack >= 4 && !dismissedCards.includes('weekly')) {
      cards.push({
        ...CARD_CONFIGS.weeklyProgress,
        subtitle: `${weeklyStats.daysOnTrack} days on target this week!`,
      });
    }

    // Sort by priority and return top 2
    return cards.sort((a, b) => a.priority - b.priority).slice(0, 2);
  }, [
    totals,
    goals,
    remaining,
    exercises,
    currentStreak,
    currentHour,
    weeklyStats,
    dismissedCards,
  ]);

  const handleDismiss = useCallback((cardId) => {
    setDismissedCards((prev) => prev.includes(cardId) ? prev : [...prev, cardId]);
  }, []);

  const handleShowConfetti = useCallback(() => {
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 5000);
  }, []);

  if (activeCards.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Confetti overlay */}
      {showConfetti && (
        <ConfettiCannon
          ref={confettiRef}
          count={100}
          origin={{ x: -10, y: 0 }}
          autoStart={true}
          fadeOut={true}
          explosionSpeed={350}
          fallSpeed={3000}
          colors={['#FFD700', '#FF6B35', '#00D4FF', '#00E676', '#FF6B9D']}
        />
      )}

      {/* Section header */}
      <View style={styles.sectionHeader}>
        <Sparkles size={16} color={Colors.primary} />
        <Text style={styles.sectionTitle}>For You</Text>
      </View>

      {/* Cards */}
      {activeCards.map((card) => (
        <ContextCard
          key={card.id}
          config={card}
          onDismiss={handleDismiss}
          onShowConfetti={handleShowConfetti}
        />
      ))}
    </View>
  );
}

export default memo(ContextualCards);

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  cardOuter: {
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadows.card,
  },
  cardPressable: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  blurContainer: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  cardGradient: {
    padding: Spacing.lg,
    position: 'relative',
    overflow: 'hidden',
  },
  victoryGlow: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 150,
    height: 150,
    borderRadius: 75,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    marginRight: Spacing.md,
  },
  iconGradient: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  dismissButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.surfaceGlass,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    pointerEvents: 'none',
  },
});

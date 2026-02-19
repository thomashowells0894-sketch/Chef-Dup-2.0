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
import { hapticImpact, hapticLight, hapticSuccess } from '../lib/haptics';
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
  Plus,
  Clock,
  UtensilsCrossed,
} from 'lucide-react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import { useMeals } from '../context/MealContext';
import { useGamification } from '../context/GamificationContext';
import { getRecommendations, mealToFood, getSuggestedMealType } from '../services/mealRecommendation';
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

// Card configurations — static cards without meal recommendations
const CARD_CONFIGS = {
  goalAchieved: {
    id: 'goal',
    icon: Trophy,
    gradient: ['#FFD700', '#FFA500'],
    glowColor: '#FFD700',
    title: 'Goal Crushed!',
    subtitle: null,
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
    subtitle: null,
    action: null,
    priority: 0,
  },
  workoutReminder: {
    id: 'workout',
    icon: Dumbbell,
    gradient: ['#00D4FF', '#7B61FF'],
    glowColor: '#00D4FF',
    title: 'No workout logged',
    subtitle: 'Even 15 minutes keeps the habit alive',
    action: '/generate-workout',
    priority: 2,
  },
  eveningWind: {
    id: 'evening',
    icon: Moon,
    gradient: ['#7B61FF', '#4A148C'],
    glowColor: '#7B61FF',
    title: 'Wind down with yoga',
    subtitle: 'Perfect evening stretch routine',
    action: '/generate-workout',
    priority: 6,
  },
  weeklyProgress: {
    id: 'weekly',
    icon: TrendingUp,
    gradient: ['#00D4FF', '#00E676'],
    glowColor: '#00D4FF',
    title: 'Great week so far!',
    subtitle: null,
    action: null,
    priority: 7,
  },
};

// ─────────────────────────────────────────────────────────
// Inline meal recommendation card — the proactive coach
// ─────────────────────────────────────────────────────────
function MealRecommendationCard({ meal, reason, gradient, icon: Icon, onLog, onDismiss }) {
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 8,
      tension: 100,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const handleLog = async () => {
    await hapticSuccess();
    onLog?.(meal);
  };

  const handleDismiss = async () => {
    await hapticLight();
    Animated.timing(scaleAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      onDismiss?.();
    });
  };

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
      <BlurView
        intensity={20}
        tint="dark"
        style={styles.blurContainer}
        accessibilityRole="summary"
        accessibilityLabel={`Meal recommendation: ${meal.name}. ${meal.calories} calories, ${meal.protein} grams protein. ${reason}`}
      >
        <LinearGradient
          colors={[`${gradient[0]}20`, `${gradient[1]}10`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.mealCardGradient}
        >
          {/* Header: Reason + dismiss */}
          <View style={styles.mealCardHeader}>
            <View style={styles.mealReasonRow}>
              <Icon size={14} color={gradient[0]} strokeWidth={2.5} />
              <Text style={[styles.mealReasonText, { color: gradient[0] }]}>{reason}</Text>
            </View>
            <Pressable onPress={handleDismiss} hitSlop={10}>
              <View style={styles.dismissButton}>
                <X size={14} color={Colors.textTertiary} />
              </View>
            </Pressable>
          </View>

          {/* Meal name + macros */}
          <Text style={styles.mealName} numberOfLines={1}>{meal.name}</Text>

          <View style={styles.macroRow}>
            <View style={styles.macroPill}>
              <Text style={styles.macroValue}>{meal.calories}</Text>
              <Text style={styles.macroLabel}>cal</Text>
            </View>
            <View style={[styles.macroPill, styles.macroPillProtein]}>
              <Text style={[styles.macroValue, { color: '#FF6B9D' }]}>{meal.protein}g</Text>
              <Text style={styles.macroLabel}>protein</Text>
            </View>
            <View style={styles.macroPill}>
              <Text style={styles.macroValue}>{meal.carbs}g</Text>
              <Text style={styles.macroLabel}>carbs</Text>
            </View>
            <View style={styles.macroPill}>
              <Text style={styles.macroValue}>{meal.fat}g</Text>
              <Text style={styles.macroLabel}>fat</Text>
            </View>
            {meal.prepTime > 0 && (
              <View style={styles.macroPill}>
                <Clock size={10} color={Colors.textTertiary} />
                <Text style={styles.macroLabel}>{meal.prepTime}m</Text>
              </View>
            )}
          </View>

          {/* Serving info + log button */}
          <View style={styles.mealActionRow}>
            <Text style={styles.servingText}>{meal.serving}</Text>
            <Pressable onPress={handleLog}>
              <LinearGradient
                colors={gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.logButton}
              >
                <Plus size={16} color="#fff" strokeWidth={3} />
                <Text style={styles.logButtonText}>Log This</Text>
              </LinearGradient>
            </Pressable>
          </View>

          {/* Border */}
          <View style={[styles.cardBorder, { borderColor: `${gradient[0]}25` }]} />
        </LinearGradient>
      </BlurView>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────
// Standard contextual card (non-meal)
// ─────────────────────────────────────────────────────────
function ContextCard({ config, onDismiss, onShowConfetti }) {
  const router = useRouter();
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const Icon = config.icon;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 8,
      tension: 100,
      useNativeDriver: true,
    }).start();

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
      <Pressable
        onPress={handlePress}
        style={styles.cardPressable}
        accessibilityRole="summary"
        accessibilityLabel={`${config.title}${config.subtitle ? `. ${config.subtitle}` : ''}`}
      >
        <BlurView intensity={20} tint="dark" style={styles.blurContainer}>
          <LinearGradient
            colors={[`${config.gradient[0]}20`, `${config.gradient[1]}10`]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardGradient}
          >
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
              <View style={styles.iconContainer}>
                <LinearGradient
                  colors={config.gradient}
                  style={styles.iconGradient}
                >
                  <Icon size={24} color="#fff" strokeWidth={2.5} />
                </LinearGradient>
              </View>

              <View style={styles.textContainer}>
                <Text style={styles.cardTitle}>{config.title}</Text>
                {config.subtitle && (
                  <Text style={styles.cardSubtitle}>{config.subtitle}</Text>
                )}
              </View>

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

// ─────────────────────────────────────────────────────────
// Main component — proactive coaching engine
// ─────────────────────────────────────────────────────────
function ContextualCards() {
  const { totals, goals, remaining, exercises, weeklyStats, addFood } = useMeals();
  const { currentStreak } = useGamification();
  const [dismissedCards, setDismissedCards] = useState([]);
  const [dismissedMeals, setDismissedMeals] = useState([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const confettiRef = useRef(null);

  const currentHour = useMemo(() => new Date().getHours(), []);

  // ── Proactive meal recommendations ──
  const mealRec = useMemo(() => {
    const calLeft = remaining.calories;
    const protLeft = Math.max(0, goals.protein - totals.protein);

    // Only recommend if there's meaningful remaining budget
    if (calLeft < 100) return null;

    const mealType = getSuggestedMealType();
    return getRecommendations(calLeft, protLeft, mealType);
  }, [remaining.calories, goals.protein, totals.protein]);

  // Pick the best meal to show based on what the user actually needs
  const proactiveMeal = useMemo(() => {
    if (!mealRec) return null;

    const proteinPercent = goals.protein > 0 ? (totals.protein / goals.protein) * 100 : 100;
    const calLeft = remaining.calories;

    // Protein deficit is the priority — show protein pick
    if (proteinPercent < 60 && mealRec.bestForProtein && !dismissedMeals.includes(mealRec.bestForProtein.id)) {
      const protRemaining = Math.round(goals.protein - totals.protein);
      return {
        meal: mealRec.bestForProtein,
        reason: `${protRemaining}g protein to close — eat this`,
        gradient: ['#FF6B9D', '#FF3D71'],
        icon: Zap,
      };
    }

    // Evening dinner time — show filling option
    if (currentHour >= 17 && currentHour <= 21 && calLeft > 300) {
      const pick = mealRec.mostFilling || mealRec.bestForProtein;
      if (pick && !dismissedMeals.includes(pick.id)) {
        return {
          meal: pick,
          reason: `${calLeft} cal left — your dinner`,
          gradient: ['#FF8C32', '#FF5A1E'],
          icon: UtensilsCrossed,
        };
      }
    }

    // Afternoon with big deficit — show quick option
    if (currentHour >= 12 && currentHour <= 17 && calLeft > 400) {
      const pick = mealRec.quickEasy || mealRec.mostFilling;
      if (pick && !dismissedMeals.includes(pick.id)) {
        return {
          meal: pick,
          reason: `${calLeft} cal remaining — quick fix`,
          gradient: ['#00E676', '#00C853'],
          icon: Target,
        };
      }
    }

    // Morning — show breakfast if nothing logged
    if (currentHour >= 6 && currentHour < 11 && totals.calories === 0) {
      const pick = mealRec.quickEasy || mealRec.bestForProtein;
      if (pick && !dismissedMeals.includes(pick.id)) {
        return {
          meal: pick,
          reason: 'Start your day — log breakfast',
          gradient: ['#FFB300', '#FF8F00'],
          icon: ChefHat,
        };
      }
    }

    return null;
  }, [mealRec, totals, goals, remaining, currentHour, dismissedMeals]);

  // ── Standard contextual cards ──
  const activeCards = useMemo(() => {
    const cards = [];

    // Goal achieved celebration
    const caloriesConsumed = totals.calories;
    const caloriesGoal = goals.calories;
    const withinGoal = caloriesConsumed >= caloriesGoal * 0.9 && caloriesConsumed <= caloriesGoal * 1.05;

    if (withinGoal && !dismissedCards.includes('goal')) {
      cards.push({
        ...CARD_CONFIGS.goalAchieved,
        subtitle: `${caloriesConsumed} / ${caloriesGoal} cal — nailed it`,
      });
    }

    // Streak celebration (milestones)
    if (currentStreak > 0 && currentStreak % 5 === 0 && !dismissedCards.includes('streak')) {
      cards.push({
        ...CARD_CONFIGS.streakCelebration,
        subtitle: `${currentStreak}-day streak. ${currentStreak >= 30 ? 'Top 1%.' : currentStreak >= 14 ? 'Unstoppable.' : 'Keep building.'}`,
      });
    }

    // Workout reminder (no exercise today)
    const hasWorkoutToday = exercises && exercises.length > 0;
    if (!hasWorkoutToday && currentHour >= 9 && currentHour <= 20 && !dismissedCards.includes('workout')) {
      cards.push(CARD_CONFIGS.workoutReminder);
    }

    // Evening yoga (late)
    if (currentHour >= 20 && currentHour <= 23 && !dismissedCards.includes('evening')) {
      cards.push(CARD_CONFIGS.eveningWind);
    }

    // Weekly progress
    if (weeklyStats && weeklyStats.daysOnTrack >= 4 && !dismissedCards.includes('weekly')) {
      cards.push({
        ...CARD_CONFIGS.weeklyProgress,
        subtitle: `${weeklyStats.daysOnTrack} days on target this week`,
      });
    }

    // Max 2 standard cards (meal recommendation gets its own slot)
    return cards.sort((a, b) => a.priority - b.priority).slice(0, 2);
  }, [totals, goals, exercises, currentStreak, currentHour, weeklyStats, dismissedCards]);

  // ── Handlers ──
  const handleDismiss = useCallback((cardId) => {
    setDismissedCards((prev) => prev.includes(cardId) ? prev : [...prev, cardId]);
  }, []);

  const handleDismissMeal = useCallback(() => {
    if (proactiveMeal) {
      setDismissedMeals((prev) => [...prev, proactiveMeal.meal.id]);
    }
  }, [proactiveMeal]);

  const handleLogMeal = useCallback(async (meal) => {
    const food = mealToFood(meal);
    const mealType = getSuggestedMealType();
    try {
      await addFood(food, mealType);
    } catch {
      // MealContext handles error UI
    }
  }, [addFood]);

  const handleShowConfetti = useCallback(() => {
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 5000);
  }, []);

  if (activeCards.length === 0 && !proactiveMeal) {
    return null;
  }

  return (
    <View style={styles.container}>
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

      <View style={styles.sectionHeader}>
        <Sparkles size={16} color={Colors.primary} />
        <Text style={styles.sectionTitle}>Your Coach</Text>
      </View>

      {/* Proactive meal recommendation — top priority */}
      {proactiveMeal && (
        <MealRecommendationCard
          meal={proactiveMeal.meal}
          reason={proactiveMeal.reason}
          gradient={proactiveMeal.gradient}
          icon={proactiveMeal.icon}
          onLog={handleLogMeal}
          onDismiss={handleDismissMeal}
        />
      )}

      {/* Standard contextual cards */}
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
  // Standard card
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
  // ── Meal recommendation card ──
  mealCardGradient: {
    padding: Spacing.lg,
    position: 'relative',
    overflow: 'hidden',
  },
  mealCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  mealReasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mealReasonText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  mealName: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  macroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  macroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  macroPillProtein: {
    backgroundColor: 'rgba(255, 107, 157, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 157, 0.2)',
  },
  macroValue: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  macroLabel: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },
  mealActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  servingText: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
  },
  logButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: BorderRadius.md,
    ...Shadows.button,
  },
  logButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: '#fff',
  },
});

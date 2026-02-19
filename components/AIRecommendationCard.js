import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Brain, ChevronRight, Plus, Utensils, Sparkles } from 'lucide-react-native';
import { hapticLight } from '../lib/haptics';
import {
  getRecommendations,
  getCoachMessage,
  getSuggestedMealType,
  mealToFood,
} from '../services/mealRecommendation';
import { getAIMealRecommendations } from '../services/ai';
import {
  Colors,
  Spacing,
  FontSize,
  FontWeight,
  BorderRadius,
} from '../constants/theme';
import { useIsPremium } from '../context/SubscriptionContext';

/**
 * AIRecommendationCard — Proactive meal suggestions based on remaining macros.
 *
 * Shows when user has >300 cal and >20g protein remaining in the afternoon/evening.
 * Tries AI-powered recommendations first via ai-brain edge function, then falls
 * back to the static mealRecommendation engine on error or timeout.
 *
 * Props:
 * - remainingCalories: number
 * - remainingProtein: number
 * - remainingCarbs: number (optional, used for AI)
 * - remainingFat: number (optional, used for AI)
 * - dietaryPreferences: string[] (optional)
 * - goal: string (optional)
 * - onAddFood: (food) => void — callback to log a recommended meal
 */
function AIRecommendationCard({
  remainingCalories,
  remainingProtein,
  remainingCarbs = 0,
  remainingFat = 0,
  dietaryPreferences,
  goal,
  onAddFood,
}) {
  const { isPremium } = useIsPremium();
  const [dismissed, setDismissed] = useState(false);
  const [isAIPowered, setIsAIPowered] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPicks, setAiPicks] = useState(null);
  const [aiCoachMessage, setAiCoachMessage] = useState('');
  const hasFetchedAI = useRef(false);
  const hour = new Date().getHours();

  // Only show in afternoon/evening when there's meaningful budget left
  const shouldShow =
    !dismissed &&
    hour >= 14 &&
    remainingCalories > 300 &&
    remainingProtein > 20;

  // Static fallback recommendations
  const staticRecommendations = useMemo(() => {
    if (!shouldShow) return null;
    const mealType = getSuggestedMealType();
    return getRecommendations(remainingCalories, remainingProtein, mealType);
  }, [shouldShow, remainingCalories, remainingProtein]);

  const staticCoachMessage = useMemo(() => {
    if (!shouldShow) return '';
    return getCoachMessage(remainingCalories, remainingProtein);
  }, [shouldShow, remainingCalories, remainingProtein]);

  // Try AI-powered recommendations on mount (premium only)
  useEffect(() => {
    if (!shouldShow || hasFetchedAI.current || !isPremium) return;
    hasFetchedAI.current = true;

    let cancelled = false;
    const mealType = getSuggestedMealType();

    (async () => {
      setAiLoading(true);
      try {
        // Timeout at 8 seconds to avoid blocking UI too long
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('AI recommendation timeout')), 8000)
        );

        const result = await Promise.race([
          getAIMealRecommendations({
            remainingCalories,
            remainingProtein,
            remainingCarbs,
            remainingFat,
            mealType,
            dietaryPreferences: dietaryPreferences || [],
            goal: goal || 'maintain',
          }),
          timeoutPromise,
        ]);

        if (cancelled) return;

        if (result.recommendations && result.recommendations.length > 0) {
          setAiPicks(result.recommendations.slice(0, 2));
          setAiCoachMessage(result.coachMessage || '');
          setIsAIPowered(true);
        }
      } catch {
        // Fall through to static recommendations silently
      } finally {
        if (!cancelled) setAiLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [shouldShow, remainingCalories, remainingProtein, remainingCarbs, remainingFat, dietaryPreferences, goal]);

  const handleAddMeal = useCallback(
    (meal) => {
      if (!onAddFood || !meal) return;
      hapticLight();
      if (isAIPowered) {
        // AI recommendations are already in a food-compatible format
        onAddFood({
          id: `${meal.id}-${Date.now()}`,
          name: meal.name,
          emoji: meal.emoji,
          calories: meal.calories,
          protein: meal.protein,
          carbs: meal.carbs,
          fat: meal.fat,
          serving: '1 serving',
          servingSize: 1,
          servingUnit: 'serving',
          category: 'ai-recommended',
          isPerServing: true,
        });
      } else {
        const food = mealToFood(meal);
        onAddFood(food);
      }
    },
    [onAddFood, isAIPowered]
  );

  if (!shouldShow || (!staticRecommendations && !aiPicks)) return null;

  // Determine which picks and message to show
  let picks;
  let displayMessage;

  if (isAIPowered && aiPicks && aiPicks.length > 0) {
    picks = aiPicks;
    displayMessage = aiCoachMessage;
  } else if (staticRecommendations) {
    const { bestForProtein, quickEasy } = staticRecommendations;
    picks = [bestForProtein, quickEasy].filter(Boolean);
    displayMessage = staticCoachMessage;
  } else {
    return null;
  }

  if (picks.length === 0) return null;

  return (
    <Animated.View entering={FadeInDown.duration(400).delay(200)}>
      <View
        style={styles.container}
        accessibilityRole="alert"
        accessibilityLabel={`${isAIPowered ? 'AI-Powered' : 'Smart'} Coach recommendation. ${displayMessage} ${remainingCalories} calories and ${remainingProtein} grams protein remaining`}
      >
        <LinearGradient
          colors={['rgba(0, 212, 255, 0.08)', 'rgba(168, 85, 247, 0.05)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconWrap}>
              {isAIPowered ? (
                <Sparkles size={16} color={Colors.primary} />
              ) : (
                <Brain size={16} color={Colors.primary} />
              )}
            </View>
            <View style={styles.headerText}>
              <View style={styles.titleRow}>
                <Text style={styles.title}>
                  {isAIPowered ? 'AI-Powered' : 'Smart Coach'}
                </Text>
                {isAIPowered && (
                  <View style={styles.aiBadge}>
                    <Sparkles size={8} color={Colors.primary} />
                    <Text style={styles.aiBadgeText}>AI</Text>
                  </View>
                )}
                {aiLoading && (
                  <ActivityIndicator size="small" color={Colors.primary} style={{ marginLeft: 6 }} />
                )}
              </View>
              <Text style={styles.budget}>
                {remainingCalories} cal · {remainingProtein}g protein left
              </Text>
            </View>
            <Pressable
              onPress={() => setDismissed(true)}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Dismiss AI recommendation"
              accessibilityHint="Dismiss this recommendation"
            >
              <Text style={styles.dismissText}>Later</Text>
            </Pressable>
          </View>

          {/* Coach message */}
          <Text style={styles.coachMessage}>{displayMessage}</Text>

          {/* Meal suggestions */}
          <View style={styles.mealsWrap}>
            {picks.map((meal, index) => (
              <Animated.View
                key={meal.id}
                entering={FadeInDown.duration(300).delay(300 + index * 100)}
              >
                <View
                  style={styles.mealCard}
                  accessibilityRole="button"
                  accessibilityLabel={`${meal.name}, ${meal.calories} calories, ${meal.protein} grams protein${meal.prepTime ? `, ${meal.prepTime} minutes prep` : ''}`}
                >
                  <Text style={styles.mealEmoji}>{meal.emoji}</Text>
                  <View style={styles.mealInfo}>
                    <Text style={styles.mealName} numberOfLines={1}>
                      {meal.name}
                    </Text>
                    <Text style={styles.mealMacros}>
                      {meal.calories} cal · {meal.protein}g protein
                      {meal.prepTime ? ` · ${meal.prepTime}min` : ''}
                    </Text>
                    {isAIPowered && meal.reason ? (
                      <Text style={styles.mealReason} numberOfLines={1}>
                        {meal.reason}
                      </Text>
                    ) : null}
                  </View>
                  <Pressable
                    style={styles.addButton}
                    onPress={() => handleAddMeal(meal)}
                    accessibilityRole="button"
                    accessibilityLabel={`Add ${meal.name}, ${meal.calories} calories`}
                  >
                    <Plus size={16} color="#fff" />
                  </Pressable>
                </View>
              </Animated.View>
            ))}
          </View>

          {/* Border */}
          <View style={styles.border} />
        </LinearGradient>
      </View>
    </Animated.View>
  );
}

export default React.memo(AIRecommendationCard);

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  gradient: {
    padding: Spacing.lg,
    position: 'relative',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primarySoft,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
    gap: 2,
  },
  aiBadgeText: {
    fontSize: 9,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  budget: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginTop: 1,
  },
  dismissText: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
  },
  coachMessage: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: FontSize.sm * 1.5,
    marginBottom: Spacing.md,
  },
  mealsWrap: {
    gap: Spacing.sm,
  },
  mealCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: BorderRadius.md,
    padding: Spacing.sm + 2,
    gap: Spacing.sm,
  },
  mealEmoji: {
    fontSize: 28,
    width: 36,
    textAlign: 'center',
  },
  mealInfo: {
    flex: 1,
  },
  mealName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  mealMacros: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  mealReason: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    fontStyle: 'italic',
    marginTop: 2,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  border: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.15)',
    pointerEvents: 'none',
  },
});

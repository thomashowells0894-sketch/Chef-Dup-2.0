import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, { FadeInUp, FadeOutUp, SlideInRight } from 'react-native-reanimated';
import { Zap, ArrowRightLeft, X } from 'lucide-react-native';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../constants/theme';
import { suggestFoodSwaps } from '../services/ai';
import { hapticLight } from '../lib/haptics';

/**
 * FoodCritiqueToast - Proactive nutritional critique after food logs.
 *
 * After a food is logged, evaluates it. If it exceeds nutritional thresholds
 * (>500 cal, >25g fat, or low protein + high cal), shows a brief non-intrusive
 * toast with an AI-generated swap suggestion.
 *
 * Props:
 * - lastLoggedFood: { name, calories, protein, carbs, fat } | null
 * - onSwap: (swap) => void - called when user taps "Swap it"
 * - onDismiss: () => void - called when user dismisses
 */
export default function FoodCritiqueToast({ lastLoggedFood, onSwap, onDismiss }) {
  const [critique, setCritique] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!lastLoggedFood) return;

    // Only critique foods that are nutritionally notable
    const shouldCritique =
      lastLoggedFood.calories > 500 ||
      (lastLoggedFood.fat && lastLoggedFood.fat > 25) ||
      (lastLoggedFood.protein && lastLoggedFood.protein < 5 && lastLoggedFood.calories > 300);

    if (!shouldCritique) return;

    let cancelled = false;
    (async () => {
      try {
        const result = await suggestFoodSwaps({
          foodName: lastLoggedFood.name,
          calories: lastLoggedFood.calories,
          protein: lastLoggedFood.protein,
          carbs: lastLoggedFood.carbs,
          fat: lastLoggedFood.fat,
          goal: 'maintain',
        });
        if (cancelled) return;
        if (result.swaps && result.swaps.length > 0) {
          setCritique({ swap: result.swaps[0], tip: result.tip });
          setVisible(true);
          // Auto-dismiss after 6 seconds
          setTimeout(() => {
            if (!cancelled) setVisible(false);
          }, 6000);
        }
      } catch {
        // Silently fail - this is a non-essential feature
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [lastLoggedFood]);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    onDismiss?.();
  }, [onDismiss]);

  const handleSwap = useCallback(() => {
    hapticLight();
    setVisible(false);
    onSwap?.(critique?.swap);
  }, [critique, onSwap]);

  if (!visible || !critique) return null;

  return (
    <Animated.View
      entering={SlideInRight.duration(300)}
      exiting={FadeOutUp.duration(200)}
      style={styles.container}
    >
      <View style={styles.iconWrap}>
        <Zap size={16} color={Colors.warning} />
      </View>
      <View style={styles.content}>
        <Text style={styles.tip} numberOfLines={2}>
          {critique.tip}
        </Text>
        {critique.swap && (
          <Pressable onPress={handleSwap} style={styles.swapButton}>
            <ArrowRightLeft size={12} color={Colors.primary} />
            <Text style={styles.swapText}>
              Try {critique.swap.name} ({critique.swap.calories} cal)
            </Text>
          </Pressable>
        )}
      </View>
      <Pressable onPress={handleDismiss} hitSlop={8}>
        <X size={16} color={Colors.textTertiary} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    left: Spacing.md,
    right: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.warningSoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: { flex: 1 },
  tip: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: FontSize.sm * 1.4,
  },
  swapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.xs,
  },
  swapText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },
});

import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import ReAnimated, { FadeInDown } from 'react-native-reanimated';
import { Sparkles, X, ArrowRight, TrendingUp, TrendingDown } from 'lucide-react-native';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius, Shadows, Gradients } from '../constants/theme';
import { useProfile } from '../context/ProfileContext';
import { suggestFoodSwaps } from '../services/ai';
import { hapticLight, hapticSuccess } from '../lib/haptics';

/**
 * Maps the profile's currentGoalType (cut/maintain/bulk) to the
 * API's goal parameter (lose/maintain/gain).
 */
function mapGoalType(goalType) {
  switch (goalType) {
    case 'cut': return 'lose';
    case 'bulk': return 'gain';
    default: return 'maintain';
  }
}

/**
 * Renders a single macro value with a delta arrow compared to original.
 */
function MacroDelta({ label, original, swapped, color }) {
  const delta = swapped - original;
  const isPositive = delta > 0;
  const isNeutral = delta === 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;

  return (
    <View style={macroDeltaStyles.container}>
      <Text style={macroDeltaStyles.label}>{label}</Text>
      <Text style={[macroDeltaStyles.value, { color }]}>{swapped}g</Text>
      {!isNeutral && (
        <View style={macroDeltaStyles.deltaRow}>
          <Icon
            size={10}
            color={isPositive ? Colors.success : Colors.error}
          />
          <Text
            style={[
              macroDeltaStyles.deltaText,
              { color: isPositive ? Colors.success : Colors.error },
            ]}
          >
            {isPositive ? '+' : ''}{delta}
          </Text>
        </View>
      )}
    </View>
  );
}

const macroDeltaStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  label: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  value: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  deltaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 1,
  },
  deltaText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
});

/**
 * A single swap card displaying the alternative food and its comparison.
 */
function SwapCard({ swap, originalFood, index, onSwap }) {
  const handleSwap = useCallback(async () => {
    await hapticSuccess();
    onSwap(swap);
  }, [swap, onSwap]);

  return (
    <ReAnimated.View
      entering={FadeInDown.delay(200 + index * 100).springify().mass(0.5).damping(10)}
    >
      <View style={swapCardStyles.card}>
        {/* Header */}
        <View style={swapCardStyles.header}>
          <Text style={swapCardStyles.emoji}>{swap.emoji}</Text>
          <View style={swapCardStyles.headerText}>
            <Text style={swapCardStyles.name} numberOfLines={1}>{swap.name}</Text>
            <Text style={swapCardStyles.serving}>{swap.serving}</Text>
          </View>
          <View style={swapCardStyles.caloriesBadge}>
            <Text style={swapCardStyles.caloriesValue}>{swap.calories}</Text>
            <Text style={swapCardStyles.caloriesUnit}>kcal</Text>
          </View>
        </View>

        {/* Macro comparison row */}
        <View style={swapCardStyles.macroRow}>
          <MacroDelta
            label="Protein"
            original={originalFood.protein}
            swapped={swap.protein}
            color={Colors.protein}
          />
          <MacroDelta
            label="Carbs"
            original={originalFood.carbs}
            swapped={swap.carbs}
            color={Colors.carbs}
          />
          <MacroDelta
            label="Fat"
            original={originalFood.fat}
            swapped={swap.fat}
            color={Colors.fat}
          />
        </View>

        {/* Reason */}
        <Text style={swapCardStyles.reason}>{swap.reason}</Text>

        {/* Improvement badge */}
        {swap.improvement ? (
          <View style={swapCardStyles.improvementBadge}>
            <Text style={swapCardStyles.improvementText}>{swap.improvement}</Text>
          </View>
        ) : null}

        {/* Swap button */}
        <Pressable onPress={handleSwap}>
          <LinearGradient
            colors={Gradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={swapCardStyles.swapButton}
          >
            <Text style={swapCardStyles.swapButtonText}>Swap in Diary</Text>
            <ArrowRight size={16} color={Colors.background} />
          </LinearGradient>
        </Pressable>
      </View>
    </ReAnimated.View>
  );
}

const swapCardStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  emoji: {
    fontSize: 32,
    marginRight: Spacing.sm,
  },
  headerText: {
    flex: 1,
  },
  name: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  serving: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    marginTop: 1,
  },
  caloriesBadge: {
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  caloriesValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  caloriesUnit: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },
  macroRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  reason: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  improvementBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.successSoft,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    marginBottom: Spacing.md,
  },
  improvementText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.success,
  },
  swapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.lg,
  },
  swapButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.background,
  },
});

/**
 * FoodSwapSheet - A modal that displays AI-suggested food swaps.
 */
function FoodSwapSheet({ visible, onClose, food, onSwap }) {
  const { currentGoalType } = useProfile();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  // Cache key to prevent re-fetching for the same food
  const cacheKeyRef = useRef(null);

  useEffect(() => {
    if (!visible || !food) return;

    const cacheKey = `${food.name}-${food.calories}-${food.protein}-${food.carbs}-${food.fat}`;

    // Skip fetch if we already have results for this exact food (unless retrying)
    if (cacheKeyRef.current === cacheKey && result && retryCount === 0) return;

    let cancelled = false;

    async function fetchSwaps() {
      setLoading(true);
      setError(null);

      try {
        const goal = mapGoalType(currentGoalType);
        const data = await suggestFoodSwaps({
          foodName: food.name,
          calories: food.calories || 0,
          protein: food.protein || 0,
          carbs: food.carbs || 0,
          fat: food.fat || 0,
          servingSize: food.serving || '1 serving',
          goal,
        });

        if (!cancelled) {
          setResult(data);
          cacheKeyRef.current = cacheKey;
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to load swap suggestions.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchSwaps();

    return () => {
      cancelled = true;
    };
  }, [visible, food, currentGoalType, retryCount]);

  const handleSwap = useCallback((swapItem) => {
    if (onSwap) {
      onSwap({
        name: swapItem.name,
        emoji: swapItem.emoji,
        calories: swapItem.calories,
        protein: swapItem.protein,
        carbs: swapItem.carbs,
        fat: swapItem.fat,
        serving: swapItem.serving,
      });
    }
    onClose();
  }, [onSwap, onClose]);

  const handleClose = useCallback(async () => {
    await hapticLight();
    onClose();
  }, [onClose]);

  if (!food) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Sparkles size={20} color={Colors.primary} />
            <Text style={styles.headerTitle}>Smarter Swaps</Text>
          </View>
          <Pressable style={styles.closeButton} onPress={handleClose}>
            <X size={22} color={Colors.text} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Original food card */}
          <ReAnimated.View entering={FadeInDown.delay(0).springify().mass(0.5).damping(10)}>
            <View style={styles.originalCard}>
              <Text style={styles.originalLabel}>Original</Text>
              <View style={styles.originalHeader}>
                <Text style={styles.originalEmoji}>{food.emoji || '🍽️'}</Text>
                <View style={styles.originalInfo}>
                  <Text style={styles.originalName} numberOfLines={1}>{food.name}</Text>
                  <Text style={styles.originalCalories}>{food.calories} kcal</Text>
                </View>
              </View>
              <View style={styles.originalMacros}>
                <View style={styles.originalMacroItem}>
                  <View style={[styles.macroDot, { backgroundColor: Colors.protein }]} />
                  <Text style={styles.originalMacroText}>P: {food.protein}g</Text>
                </View>
                <View style={styles.originalMacroItem}>
                  <View style={[styles.macroDot, { backgroundColor: Colors.carbs }]} />
                  <Text style={styles.originalMacroText}>C: {food.carbs}g</Text>
                </View>
                <View style={styles.originalMacroItem}>
                  <View style={[styles.macroDot, { backgroundColor: Colors.fat }]} />
                  <Text style={styles.originalMacroText}>F: {food.fat}g</Text>
                </View>
              </View>
            </View>
          </ReAnimated.View>

          {/* Loading state */}
          {loading && (
            <ReAnimated.View entering={FadeInDown.delay(100).springify().mass(0.5).damping(10)}>
              <View style={styles.loadingCard}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.loadingText}>Finding smarter alternatives...</Text>
              </View>
            </ReAnimated.View>
          )}

          {/* Error state */}
          {error && !loading && (
            <ReAnimated.View entering={FadeInDown.delay(100).springify().mass(0.5).damping(10)}>
              <View style={styles.errorCard}>
                <Text style={styles.errorText}>{error}</Text>
                <Pressable
                  style={styles.retryButton}
                  onPress={() => {
                    cacheKeyRef.current = null;
                    setResult(null);
                    setError(null);
                    setRetryCount((c) => c + 1);
                  }}
                >
                  <Text style={styles.retryText}>Try Again</Text>
                </Pressable>
              </View>
            </ReAnimated.View>
          )}

          {/* Swap results */}
          {result && !loading && (
            <>
              <ReAnimated.View entering={FadeInDown.delay(150).springify().mass(0.5).damping(10)}>
                <Text style={styles.sectionLabel}>Try instead:</Text>
              </ReAnimated.View>

              {result.swaps.map((swap, index) => (
                <SwapCard
                  key={`${swap.name}-${index}`}
                  swap={swap}
                  originalFood={result.originalFood}
                  index={index}
                  onSwap={handleSwap}
                />
              ))}

              {/* AI tip */}
              {result.tip && (
                <ReAnimated.View entering={FadeInDown.delay(500).springify().mass(0.5).damping(10)}>
                  <View style={styles.tipCard}>
                    <Sparkles size={14} color={Colors.primary} />
                    <Text style={styles.tipText}>{result.tip}</Text>
                  </View>
                </ReAnimated.View>
              )}
            </>
          )}

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </View>
    </Modal>
  );
}

export default memo(FoodSwapSheet);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
  },
  // Original food card
  originalCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  originalLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  originalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  originalEmoji: {
    fontSize: 36,
    marginRight: Spacing.sm,
  },
  originalInfo: {
    flex: 1,
  },
  originalName: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  originalCalories: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  originalMacros: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  originalMacroItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  macroDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  originalMacroText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  // Section label
  sectionLabel: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  // Loading state
  loadingCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  // Error state
  errorCard: {
    backgroundColor: Colors.errorSoft,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.md,
  },
  errorText: {
    fontSize: FontSize.md,
    color: Colors.error,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  retryText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },
  // Tip card
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.primarySoft,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  tipText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  bottomSpacer: {
    height: Spacing.xxl,
  },
});

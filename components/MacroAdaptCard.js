import React, { memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { TrendingUp, ArrowRight, Check, X } from 'lucide-react-native';
import {
  Colors,
  Spacing,
  FontSize,
  FontWeight,
  BorderRadius,
  Gradients,
  Shadows,
} from '../constants/theme';

function DeltaBadge({ value }) {
  const isPositive = value > 0;
  const color = isPositive ? Colors.success : Colors.warning;
  const sign = isPositive ? '+' : '';
  return (
    <View style={[styles.deltaBadge, { backgroundColor: color + '22' }]}>
      <Text style={[styles.deltaText, { color }]}>
        {sign}{value} kcal
      </Text>
    </View>
  );
}

function MacroMiniCard({ label, current, next, color }) {
  const changed = current !== next;
  return (
    <View style={[styles.macroMini, { borderColor: color + '33' }]}>
      <Text style={[styles.macroMiniLabel, { color }]}>{label}</Text>
      <View style={styles.macroMiniRow}>
        <Text style={styles.macroMiniCurrent}>{current}g</Text>
        {changed ? (
          <>
            <ArrowRight size={10} color={Colors.textTertiary} />
            <Text style={[styles.macroMiniNext, { color }]}>{next}g</Text>
          </>
        ) : null}
      </View>
    </View>
  );
}

function MacroAdaptCard({ recommendation, onApply, onDismiss }) {
  if (!recommendation || !recommendation.shouldAdjust) {
    return null;
  }

  const {
    headline,
    explanation,
    newCalories,
    newProtein,
    newCarbs,
    newFat,
    calorieChange,
    currentCalories,
    currentProtein,
    currentCarbs,
    currentFat,
  } = recommendation;

  return (
    <Animated.View
      entering={FadeInDown.springify().damping(12)}
      style={styles.card}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconCircle}>
            <TrendingUp size={18} color={Colors.primary} />
          </View>
          <Text style={styles.title}>AI Macro Coach</Text>
        </View>
      </View>

      {/* Headline */}
      <Text style={styles.headline}>{headline}</Text>

      {/* Calorie comparison row */}
      <View style={styles.calorieRow}>
        <View style={styles.calorieBlock}>
          <Text style={styles.calorieLabel}>Current</Text>
          <Text style={styles.calorieValue}>{currentCalories || newCalories - (calorieChange || 0)}</Text>
        </View>
        <ArrowRight size={18} color={Colors.textTertiary} />
        <View style={styles.calorieBlock}>
          <Text style={styles.calorieLabel}>New</Text>
          <Text style={[styles.calorieValue, { color: Colors.primary }]}>{newCalories}</Text>
        </View>
        {calorieChange !== 0 ? <DeltaBadge value={calorieChange} /> : null}
      </View>

      {/* Macro breakdown */}
      <View style={styles.macroRow}>
        <MacroMiniCard
          label="P"
          current={currentProtein || newProtein}
          next={newProtein}
          color={Colors.protein}
        />
        <MacroMiniCard
          label="C"
          current={currentCarbs || newCarbs}
          next={newCarbs}
          color={Colors.carbs}
        />
        <MacroMiniCard
          label="F"
          current={currentFat || newFat}
          next={newFat}
          color={Colors.fat}
        />
      </View>

      {/* Explanation */}
      <Text style={styles.explanation}>{explanation}</Text>

      {/* Action buttons */}
      <View style={styles.actions}>
        <Pressable onPress={onApply} style={styles.applyWrapper}>
          <LinearGradient
            colors={Gradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.applyButton}
          >
            <Check size={16} color="#fff" />
            <Text style={styles.applyText}>Apply</Text>
          </LinearGradient>
        </Pressable>
        <Pressable onPress={onDismiss} style={styles.dismissButton}>
          <X size={14} color={Colors.textTertiary} />
          <Text style={styles.dismissText}>Dismiss</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

export default memo(MacroAdaptCard);

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceGlass,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    ...Shadows.card,
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
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  headline: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  calorieRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.surfaceGlassDark,
    borderRadius: BorderRadius.lg,
  },
  calorieBlock: {
    alignItems: 'center',
  },
  calorieLabel: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginBottom: 2,
  },
  calorieValue: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  deltaBadge: {
    marginLeft: 'auto',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  deltaText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  macroRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  macroMini: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    backgroundColor: Colors.surfaceGlass,
  },
  macroMiniLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    marginBottom: 4,
  },
  macroMiniRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  macroMiniCurrent: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  macroMiniNext: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  explanation: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: FontSize.sm * 1.5,
    marginBottom: Spacing.md,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  applyWrapper: {
    flex: 1,
  },
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.lg,
    ...Shadows.button,
  },
  applyText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: '#fff',
  },
  dismissButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  dismissText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textTertiary,
  },
});

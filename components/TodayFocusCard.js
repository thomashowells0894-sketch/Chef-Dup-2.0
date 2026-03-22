import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { isToday } from 'date-fns';
import {
  CheckCircle2,
  ChevronRight,
  Droplets,
  ScanBarcode,
  Sparkles,
  Target,
} from 'lucide-react-native';
import GlassCard from './ui/GlassCard';
import {
  BorderRadius,
  Colors,
  FontSize,
  FontWeight,
  Spacing,
} from '../constants/theme';

const MEAL_LABELS = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snacks: 'Snacks',
};

function getActiveMealType(selectedDate, meals) {
  const fallbackMeal = Object.keys(MEAL_LABELS).find((mealType) => (meals?.[mealType] || []).length === 0);
  if (!selectedDate || !isToday(selectedDate)) {
    return fallbackMeal || 'snacks';
  }

  const hour = new Date().getHours();
  if (hour < 11) return (meals?.breakfast || []).length === 0 ? 'breakfast' : (fallbackMeal || 'snacks');
  if (hour < 15) return (meals?.lunch || []).length === 0 ? 'lunch' : (fallbackMeal || 'snacks');
  if (hour < 20) return (meals?.dinner || []).length === 0 ? 'dinner' : (fallbackMeal || 'snacks');
  return (meals?.snacks || []).length === 0 ? 'snacks' : (fallbackMeal || 'snacks');
}

function buildFocusState({
  priorityAction,
  selectedDate,
  meals,
  goals,
  totals,
  waterProgress,
  onLogMeal,
  onLogWater,
  onOpenCoach,
}) {
  const activeMealType = getActiveMealType(selectedDate, meals);
  const activeMealLabel = MEAL_LABELS[activeMealType];
  const activeMealCount = (meals?.[activeMealType] || []).length;
  const proteinRemaining = Math.max((goals?.protein || 0) - (totals?.protein || 0), 0);
  const hydrationPercent = Math.round(waterProgress?.percentage || 0);
  const caloriesRemaining = Math.max((goals?.calories || 0) - (totals?.calories || 0), 0);

  if (priorityAction) {
    return priorityAction;
  }

  if (!selectedDate || !isToday(selectedDate)) {
    return {
      badge: 'Plan ahead',
      title: `Set up ${activeMealLabel.toLowerCase()} before the day gets noisy`,
      description: 'One deliberate meal now makes calories and protein easier to trust later.',
      supportText: 'Fastest path: add a real meal, then reuse it tomorrow.',
      primaryLabel: `Add ${activeMealLabel}`,
      primaryIcon: Target,
      primaryAction: () => onLogMeal(activeMealType),
      primaryGradient: [Colors.primary, Colors.primaryDim],
    };
  }

  if (activeMealCount === 0) {
    return {
      badge: 'Next best move',
      title: `Win today with ${activeMealLabel.toLowerCase()}`,
      description: `${caloriesRemaining.toLocaleString()} kcal remain. One clean log now gives the coach real signal for the rest of the day.`,
      supportText: 'After the first log, recent foods and repeats get much faster.',
      primaryLabel: `Log ${activeMealLabel}`,
      primaryIcon: Target,
      primaryAction: () => onLogMeal(activeMealType),
      primaryGradient: [Colors.primary, Colors.primaryDim],
    };
  }

  if (proteinRemaining >= 25) {
    return {
      badge: 'High-leverage fix',
      title: `Close the last ${proteinRemaining}g of protein`,
      description: 'A deliberate protein add now beats chasing the target with random snacks tonight.',
      supportText: 'Think yogurt, chicken, eggs, or a shake.',
      primaryLabel: 'Add protein',
      primaryIcon: Sparkles,
      primaryAction: () => onLogMeal('snacks'),
      primaryGradient: ['#FF6B9D', '#FF8A80'],
    };
  }

  if (hydrationPercent < 60) {
    return {
      badge: 'Hydration',
      title: 'Take the easiest win: 250 ml water',
      description: `You are at ${hydrationPercent}% of target. One quick log keeps energy and appetite steadier.`,
      supportText: 'Small logs compound when the day gets busy.',
      primaryLabel: 'Log 250 ml',
      primaryIcon: Droplets,
      primaryAction: onLogWater,
      primaryGradient: ['#64D2FF', Colors.primary],
    };
  }

  return {
    badge: 'On pace',
    title: 'You are in control. Keep repeats simple',
    description: 'Your core targets are stable today. Scan anything new and repeat what already works.',
    supportText: 'You do not need a perfect day, just another clean one.',
    primaryLabel: 'Open coach',
    primaryIcon: CheckCircle2,
    primaryAction: onOpenCoach,
    primaryGradient: [Colors.success, Colors.successDim],
  };
}

const MetricPill = memo(function MetricPill({ label, value }) {
  return (
    <View style={styles.metricPill}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
});

const SecondaryAction = memo(function SecondaryAction({ icon: Icon, label, onPress }) {
  return (
    <Pressable style={styles.secondaryAction} onPress={onPress}>
      <Icon size={16} color={Colors.text} strokeWidth={2.2} />
      <Text style={styles.secondaryActionLabel}>{label}</Text>
    </Pressable>
  );
});

function TodayFocusCard({
  meals,
  goals,
  totals,
  waterProgress,
  selectedDate,
  priorityAction,
  onLogMeal,
  onOpenScanner,
  onLogWater,
  onOpenCoach,
}) {
  const completedMeals = useMemo(
    () => Object.keys(MEAL_LABELS).filter((mealType) => (meals?.[mealType] || []).length > 0).length,
    [meals]
  );
  const proteinRemaining = Math.max((goals?.protein || 0) - (totals?.protein || 0), 0);
  const hydrationPercent = Math.round(waterProgress?.percentage || 0);

  const focus = useMemo(
    () => buildFocusState({
      priorityAction,
      selectedDate,
      meals,
      goals,
      totals,
      waterProgress,
      onLogMeal,
      onLogWater,
      onOpenCoach,
    }),
    [priorityAction, selectedDate, meals, goals, totals, waterProgress, onLogMeal, onLogWater, onOpenCoach]
  );

  const PrimaryIcon = focus.primaryIcon;

  return (
    <GlassCard style={styles.card} variant="accent" glow>
      <View style={styles.eyebrowRow}>
        <Text style={styles.eyebrow}>Today Focus</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{focus.badge}</Text>
        </View>
      </View>

      <Text style={styles.title}>{focus.title}</Text>
      <Text style={styles.description}>{focus.description}</Text>
      {focus.supportText ? (
        <View style={styles.supportPill}>
          <Sparkles size={14} color={Colors.primary} strokeWidth={2.2} />
          <Text style={styles.supportText}>{focus.supportText}</Text>
        </View>
      ) : null}

      <View style={styles.metricsRow}>
        <MetricPill label="Meals logged" value={`${completedMeals}/4`} />
        <MetricPill label="Protein left" value={`${proteinRemaining}g`} />
        <MetricPill label="Hydration" value={`${hydrationPercent}%`} />
      </View>

      <Pressable style={styles.primaryAction} onPress={focus.primaryAction}>
        <LinearGradient
          colors={focus.primaryGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.primaryGradient}
        >
          <View style={styles.primaryLeft}>
            <PrimaryIcon size={18} color="#041015" strokeWidth={2.4} />
            <Text style={styles.primaryLabel}>{focus.primaryLabel}</Text>
          </View>
          <ChevronRight size={18} color="#041015" strokeWidth={2.5} />
        </LinearGradient>
      </Pressable>

      <View style={styles.secondaryRow}>
        <SecondaryAction icon={ScanBarcode} label="Scan" onPress={onOpenScanner} />
        <SecondaryAction icon={Droplets} label="Water" onPress={onLogWater} />
        <SecondaryAction icon={Sparkles} label="Coach" onPress={onOpenCoach} />
      </View>
    </GlassCard>
  );
}

export default memo(TodayFocusCard);

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.md,
  },
  eyebrowRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  eyebrow: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  badgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    lineHeight: 30,
    marginBottom: Spacing.xs,
  },
  description: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  supportPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: Spacing.lg,
  },
  supportText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  metricPill: {
    flex: 1,
    padding: Spacing.sm,
    borderRadius: BorderRadius.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 2,
  },
  metricValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  metricLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  primaryAction: {
    marginBottom: Spacing.md,
  },
  primaryGradient: {
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 56,
  },
  primaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  primaryLabel: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: '#041015',
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  secondaryAction: {
    flex: 1,
    minHeight: 48,
    borderRadius: BorderRadius.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  secondaryActionLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
});

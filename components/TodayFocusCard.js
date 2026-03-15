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

  if (!selectedDate || !isToday(selectedDate)) {
    return {
      badge: 'Plan the day',
      title: `Build ${activeMealLabel.toLowerCase()} before you need it`,
      description: 'Draft the day up front so calories and protein stop drifting later.',
      primaryLabel: `Add ${activeMealLabel}`,
      primaryIcon: Target,
      primaryAction: () => onLogMeal(activeMealType),
      primaryGradient: [Colors.primary, Colors.primaryDim],
    };
  }

  if (activeMealCount === 0) {
    return {
      badge: 'Next best action',
      title: `Log ${activeMealLabel.toLowerCase()} while the day is still in control`,
      description: `${caloriesRemaining.toLocaleString()} kcal remain and you still have room to land the day cleanly.`,
      primaryLabel: `Log ${activeMealLabel}`,
      primaryIcon: Target,
      primaryAction: () => onLogMeal(activeMealType),
      primaryGradient: [Colors.primary, Colors.primaryDim],
    };
  }

  if (proteinRemaining >= 25) {
    return {
      badge: 'Protein gap',
      title: `Close the last ${proteinRemaining}g of protein`,
      description: 'One deliberate add now is better than chasing the target with random snacks later.',
      primaryLabel: 'Add protein',
      primaryIcon: Sparkles,
      primaryAction: () => onLogMeal('snacks'),
      primaryGradient: ['#FF6B9D', '#FF8A80'],
    };
  }

  if (hydrationPercent < 60) {
    return {
      badge: 'Hydration',
      title: 'Catch up on water before energy drops',
      description: `You are only at ${hydrationPercent}% of target. A quick 250 ml log restores momentum.`,
      primaryLabel: 'Log 250 ml',
      primaryIcon: Droplets,
      primaryAction: onLogWater,
      primaryGradient: ['#64D2FF', Colors.primary],
    };
  }

  return {
    badge: 'Locked in',
    title: 'The day is stable, keep it simple',
    description: 'Use scan for anything unlogged or let the coach tune the last 10% for you.',
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
      selectedDate,
      meals,
      goals,
      totals,
      waterProgress,
      onLogMeal,
      onLogWater,
      onOpenCoach,
    }),
    [selectedDate, meals, goals, totals, waterProgress, onLogMeal, onLogWater, onOpenCoach]
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

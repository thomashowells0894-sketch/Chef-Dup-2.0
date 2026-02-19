import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Calendar, Target, TrendingDown, TrendingUp } from 'lucide-react-native';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../constants/theme';

export default function GoalProjection({ currentWeight, targetWeight, weeklyRate, weightUnit = 'lbs' }) {
  const projection = useMemo(() => {
    if (!currentWeight || !targetWeight || !weeklyRate || weeklyRate === 0) return null;

    const weightDiff = Math.abs(currentWeight - targetWeight);
    const weeksToGoal = Math.ceil(weightDiff / Math.abs(weeklyRate));
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + weeksToGoal * 7);

    const isLosing = currentWeight > targetWeight;
    const monthsToGoal = Math.round(weeksToGoal / 4.33);

    return {
      weeksToGoal,
      monthsToGoal,
      targetDate,
      isLosing,
      formattedDate: targetDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    };
  }, [currentWeight, targetWeight, weeklyRate]);

  if (!projection) return null;

  const TrendIcon = projection.isLosing ? TrendingDown : TrendingUp;

  return (
    <Animated.View entering={FadeInDown.duration(400).delay(200)}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Target size={16} color={Colors.primary} />
          <Text style={styles.title}>Your Goal Projection</Text>
        </View>

        <View style={styles.projection}>
          <View style={styles.stat}>
            <TrendIcon size={20} color={Colors.primary} />
            <Text style={styles.statValue}>
              {Math.abs(currentWeight - targetWeight).toFixed(1)} {weightUnit}
            </Text>
            <Text style={styles.statLabel}>{projection.isLosing ? 'to lose' : 'to gain'}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.stat}>
            <Calendar size={20} color={Colors.secondary} />
            <Text style={styles.statValue}>{projection.formattedDate}</Text>
            <Text style={styles.statLabel}>estimated goal date</Text>
          </View>
        </View>

        <Text style={styles.disclaimer}>
          At {Math.abs(weeklyRate)} {weightUnit}/week. Actual results may vary based on adherence.
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  title: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.text },
  projection: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', marginBottom: Spacing.md },
  stat: { alignItems: 'center', gap: 4 },
  statValue: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text, marginTop: 4 },
  statLabel: { fontSize: FontSize.xs, color: Colors.textSecondary },
  divider: { width: 1, height: 50, backgroundColor: Colors.border },
  disclaimer: { fontSize: FontSize.xs, color: Colors.textTertiary, textAlign: 'center', lineHeight: FontSize.xs * 1.5 },
});

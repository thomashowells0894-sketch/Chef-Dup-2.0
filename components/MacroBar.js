import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '../constants/theme';

export default function MacroBar({ label, current, goal, color, unit = 'g' }) {
  const progress = Math.min(current / goal, 1);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.labelRow}>
          <View style={[styles.indicator, { backgroundColor: color }]} />
          <Text style={styles.label}>{label}</Text>
        </View>
        <Text style={styles.values}>
          <Text style={styles.current}>{current}</Text>
          <Text style={styles.separator}> / </Text>
          <Text style={styles.goal}>{goal}{unit}</Text>
        </Text>
      </View>
      <View style={styles.trackContainer}>
        <View style={styles.track}>
          <View
            style={[
              styles.progress,
              { width: `${progress * 100}%`, backgroundColor: color },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: Spacing.xs,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: BorderRadius.full,
  },
  label: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.text,
  },
  values: {
    fontSize: FontSize.sm,
  },
  current: {
    color: Colors.text,
    fontWeight: FontWeight.semibold,
  },
  separator: {
    color: Colors.textTertiary,
  },
  goal: {
    color: Colors.textSecondary,
  },
  trackContainer: {
    paddingLeft: Spacing.md + Spacing.xs,
  },
  track: {
    height: 6,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  progress: {
    height: '100%',
    borderRadius: BorderRadius.full,
  },
});

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Clock } from 'lucide-react-native';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../constants/theme';

/**
 * TrialCountdown - Shows days remaining in trial with a progress bar.
 *
 * Props:
 *   trialEndDate: string | Date - ISO date or Date object for trial expiration
 *   trialDurationDays?: number  - Total trial length for progress calculation (default: 7)
 */
export default function TrialCountdown({ trialEndDate, trialDurationDays = 7 }) {
  const { daysLeft, progress, isExpired, isWarning } = useMemo(() => {
    if (!trialEndDate) {
      return { daysLeft: 0, progress: 0, isExpired: true, isWarning: false };
    }

    const end = new Date(trialEndDate).getTime();
    const now = Date.now();
    const msLeft = end - now;
    const days = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
    const elapsed = trialDurationDays - days;
    const prog = Math.min(1, Math.max(0, elapsed / trialDurationDays));

    return {
      daysLeft: days,
      progress: prog,
      isExpired: days <= 0,
      isWarning: days > 0 && days < 3,
    };
  }, [trialEndDate, trialDurationDays]);

  const barColor = isExpired
    ? Colors.error
    : isWarning
      ? Colors.warning
      : Colors.primary;

  const textColor = isExpired
    ? Colors.error
    : isWarning
      ? Colors.warning
      : Colors.textSecondary;

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Clock size={14} color={barColor} />
        <Text style={[styles.label, { color: textColor }]}>
          {isExpired
            ? 'Trial ended'
            : daysLeft === 1
              ? '1 day left in your trial'
              : `${daysLeft} days left in your trial`}
        </Text>
      </View>
      <View style={styles.trackOuter}>
        <View
          style={[
            styles.trackFill,
            {
              width: `${progress * 100}%`,
              backgroundColor: barColor,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  trackOuter: {
    height: 4,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  trackFill: {
    height: '100%',
    borderRadius: BorderRadius.full,
  },
});

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Clock, Crown } from 'lucide-react-native';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../constants/theme';
import { useSubscription } from '../context/SubscriptionContext';
import { useRouter } from 'expo-router';
import { hapticLight } from '../lib/haptics';

export default function TrialExpirationBanner() {
  const { isTrialing, trialEndDate, isPremium } = useSubscription();
  const router = useRouter();

  const daysRemaining = useMemo(() => {
    if (!isTrialing || !trialEndDate) return null;
    const end = new Date(trialEndDate);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  }, [isTrialing, trialEndDate]);

  if (!isTrialing || daysRemaining === null || daysRemaining > 5 || isPremium) return null;

  const urgency = daysRemaining <= 1 ? 'critical' : daysRemaining <= 3 ? 'warning' : 'info';
  const bgColor = urgency === 'critical' ? Colors.errorSoft : urgency === 'warning' ? Colors.warningSoft : Colors.primarySoft;
  const textColor = urgency === 'critical' ? Colors.error : urgency === 'warning' ? Colors.warning : Colors.primary;

  const message = daysRemaining === 0
    ? 'Your trial expires today!'
    : daysRemaining === 1
    ? 'Last day of your free trial'
    : `${daysRemaining} days left in your trial`;

  return (
    <Animated.View entering={FadeInDown.duration(300)}>
      <Pressable
        style={[styles.container, { backgroundColor: bgColor }]}
        onPress={() => { hapticLight(); router.push('/settings'); }}
        accessibilityRole="button"
        accessibilityLabel={`${message}. Tap to upgrade.`}
      >
        <Clock size={16} color={textColor} />
        <Text style={[styles.text, { color: textColor }]}>{message}</Text>
        <View style={[styles.badge, { backgroundColor: textColor }]}>
          <Crown size={12} color="#fff" />
          <Text style={styles.badgeText}>Upgrade</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  text: { flex: 1, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.full },
  badgeText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: '#fff' },
});

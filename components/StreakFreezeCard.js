import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Shield, Snowflake, Zap } from 'lucide-react-native';
import { useGamification } from '../context/GamificationContext';
import {
  Colors,
  Spacing,
  FontSize,
  FontWeight,
  BorderRadius,
  Shadows,
} from '../constants/theme';

export default function StreakFreezeCard() {
  const {
    currentStreak,
    hasStreakFreeze,
    buyStreakFreeze,
    totalXP,
  } = useGamification();

  // Only show when streak is worth protecting and no freeze is active
  if (currentStreak < 7 || hasStreakFreeze) return null;

  const FREEZE_COST = 200;
  const canAfford = totalXP >= FREEZE_COST;

  return (
    <View
      style={styles.container}
      accessible={true}
      accessibilityLabel={`Protect your ${currentStreak}-day streak. Buy a Streak Freeze for ${FREEZE_COST} XP`}
    >
      <LinearGradient
        colors={['rgba(0, 212, 255, 0.12)', 'rgba(0, 150, 255, 0.05)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <View style={styles.iconWrap}>
            <LinearGradient
              colors={['#00D4FF', '#0088CC']}
              style={styles.iconGradient}
            >
              <Shield size={22} color="#fff" />
            </LinearGradient>
          </View>

          <View style={styles.textWrap}>
            <Text style={styles.title}>
              Protect your {currentStreak}-day streak
            </Text>
            <Text style={styles.subtitle}>
              Buy a Streak Freeze — if you miss a day, it's used automatically.
            </Text>
          </View>
        </View>

        <Pressable
          onPress={buyStreakFreeze}
          disabled={!canAfford}
          style={styles.buttonWrap}
          accessibilityRole="button"
          accessibilityLabel={canAfford ? `Buy Streak Freeze for ${FREEZE_COST} XP` : `Need ${FREEZE_COST} XP to buy Streak Freeze`}
          accessibilityState={{ disabled: !canAfford }}
        >
          <LinearGradient
            colors={canAfford ? ['#00D4FF', '#0088CC'] : ['#444', '#333']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.button}
          >
            <Snowflake size={16} color="#fff" />
            <Text style={styles.buttonText}>
              {canAfford
                ? `Buy Freeze (${FREEZE_COST} XP)`
                : `Need ${FREEZE_COST} XP`}
            </Text>
          </LinearGradient>
        </Pressable>

        {/* XP balance indicator */}
        <View style={styles.xpRow}>
          <Zap size={12} color={Colors.primary} />
          <Text style={styles.xpText}>
            Your balance: {totalXP.toLocaleString()} XP
          </Text>
        </View>

        {/* Border */}
        <View style={styles.border} />
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadows.card,
  },
  gradient: {
    padding: Spacing.lg,
    position: 'relative',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  iconWrap: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  iconGradient: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: FontSize.sm * 1.4,
  },
  buttonWrap: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm + 2,
    gap: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  buttonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: '#fff',
  },
  xpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  xpText: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },
  border: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.2)',
    pointerEvents: 'none',
  },
});

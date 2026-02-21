import React, { forwardRef } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Flame, Target, Zap, Trophy } from 'lucide-react-native';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 48;
const CARD_HEIGHT = CARD_WIDTH * 1.4;

const VictoryCard = forwardRef(({
  streak = 0,
  caloriesConsumed = 0,
  caloriesGoal = 2000,
  protein = 0,
  proteinGoal = 150,
  carbs = 0,
  carbsGoal = 250,
  fat = 0,
  fatGoal = 65,
  date = new Date(),
}, ref) => {
  const calorieProgress = Math.min((caloriesConsumed / caloriesGoal) * 100, 100);
  const proteinProgress = Math.min((protein / proteinGoal) * 100, 100);
  const carbsProgress = Math.min((carbs / carbsGoal) * 100, 100);
  const fatProgress = Math.min((fat / fatGoal) * 100, 100);

  const isOnTrack = caloriesConsumed <= caloriesGoal;
  const dateString = date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  // Determine card theme based on streak
  const getStreakTier = () => {
    if (streak >= 30) return { label: 'LEGENDARY', color: '#FFD700', gradient: ['#1a1a2e', '#16213e', '#0f3460'] };
    if (streak >= 14) return { label: 'ELITE', color: '#E040FB', gradient: ['#1a1a2e', '#2d1b4e', '#1a1a2e'] };
    if (streak >= 7) return { label: 'ON FIRE', color: '#FF6B35', gradient: ['#1a1a2e', '#3d1a1a', '#1a1a2e'] };
    return { label: 'RISING', color: '#00E676', gradient: ['#1a1a2e', '#1a2e1a', '#1a1a2e'] };
  };

  const tier = getStreakTier();

  return (
    <View ref={ref} style={styles.cardWrapper} collapsable={false}>
      <LinearGradient
        colors={tier.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        {/* Decorative elements */}
        <View style={styles.decorativeCircle1} />
        <View style={styles.decorativeCircle2} />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={[styles.tierBadge, { backgroundColor: tier.color + '30' }]}>
              <Zap size={12} color={tier.color} />
              <Text style={[styles.tierText, { color: tier.color }]}>{tier.label}</Text>
            </View>
            <Text style={styles.dateText}>{dateString}</Text>
          </View>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>FuelIQ</Text>
          </View>
        </View>

        {/* Main Content */}
        <View style={styles.mainContent}>
          {/* Streak Display */}
          <View style={styles.streakSection}>
            <View style={styles.streakIconContainer}>
              <Flame size={32} color={Colors.warning} />
            </View>
            <Text style={styles.streakNumber}>{streak}</Text>
            <Text style={styles.streakLabel}>Day Streak</Text>
          </View>

          {/* Calories Ring */}
          <View style={styles.caloriesSection}>
            <View style={styles.caloriesRing}>
              <View style={styles.caloriesInner}>
                <Target size={20} color={isOnTrack ? Colors.success : Colors.error} />
                <Text style={styles.caloriesValue}>{caloriesConsumed.toLocaleString()}</Text>
                <Text style={styles.caloriesLabel}>of {caloriesGoal.toLocaleString()} cal</Text>
              </View>
              {/* Progress ring visual */}
              <View style={[styles.progressRing, { borderColor: isOnTrack ? Colors.success : Colors.error }]}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${calorieProgress}%`,
                      backgroundColor: isOnTrack ? Colors.success : Colors.error,
                    }
                  ]}
                />
              </View>
            </View>
            <Text style={[styles.statusText, { color: isOnTrack ? Colors.success : Colors.error }]}>
              {isOnTrack ? 'On Track!' : 'Over Budget'}
            </Text>
          </View>
        </View>

        {/* Macros Bar */}
        <View style={styles.macrosSection}>
          <Text style={styles.macrosTitle}>MACROS</Text>
          <View style={styles.macrosRow}>
            <View style={styles.macroItem}>
              <View style={styles.macroHeader}>
                <View style={[styles.macroDot, { backgroundColor: Colors.protein }]} />
                <Text style={styles.macroLabel}>Protein</Text>
              </View>
              <Text style={styles.macroValue}>{protein}g</Text>
              <View style={styles.macroBar}>
                <View style={[styles.macroBarFill, { width: `${proteinProgress}%`, backgroundColor: Colors.protein }]} />
              </View>
            </View>
            <View style={styles.macroItem}>
              <View style={styles.macroHeader}>
                <View style={[styles.macroDot, { backgroundColor: Colors.carbs }]} />
                <Text style={styles.macroLabel}>Carbs</Text>
              </View>
              <Text style={styles.macroValue}>{carbs}g</Text>
              <View style={styles.macroBar}>
                <View style={[styles.macroBarFill, { width: `${carbsProgress}%`, backgroundColor: Colors.carbs }]} />
              </View>
            </View>
            <View style={styles.macroItem}>
              <View style={styles.macroHeader}>
                <View style={[styles.macroDot, { backgroundColor: Colors.fat }]} />
                <Text style={styles.macroLabel}>Fat</Text>
              </View>
              <Text style={styles.macroValue}>{fat}g</Text>
              <View style={styles.macroBar}>
                <View style={[styles.macroBarFill, { width: `${fatProgress}%`, backgroundColor: Colors.fat }]} />
              </View>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerLine} />
          <View style={styles.footerContent}>
            <Trophy size={14} color="#888" />
            <Text style={styles.footerText}>FuelIQ - AI Fitness</Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
});

VictoryCard.displayName = 'VictoryCard';

const styles = StyleSheet.create({
  cardWrapper: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 15,
  },
  card: {
    flex: 1,
    padding: Spacing.lg,
    position: 'relative',
    overflow: 'hidden',
  },
  decorativeCircle1: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  headerLeft: {
    gap: 4,
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    gap: 4,
    alignSelf: 'flex-start',
  },
  tierText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    letterSpacing: 1,
  },
  dateText: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
  },
  logoContainer: {
    alignItems: 'flex-end',
  },
  logoText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: '#fff',
    letterSpacing: 1,
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  streakSection: {
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  streakIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,152,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  streakNumber: {
    fontSize: 64,
    fontWeight: FontWeight.bold,
    color: '#fff',
    lineHeight: 70,
  },
  streakLabel: {
    fontSize: FontSize.md,
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  caloriesSection: {
    alignItems: 'center',
    width: '100%',
  },
  caloriesRing: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  caloriesInner: {
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  caloriesValue: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: '#fff',
    marginTop: 4,
  },
  caloriesLabel: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.6)',
  },
  progressRing: {
    width: '80%',
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  statusText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  macrosSection: {
    marginTop: Spacing.md,
  },
  macrosTitle: {
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 2,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  macrosRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  macroItem: {
    flex: 1,
    alignItems: 'center',
  },
  macroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  macroDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  macroLabel: {
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.6)',
  },
  macroValue: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: '#fff',
    marginBottom: 4,
  },
  macroBar: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  macroBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  footer: {
    marginTop: Spacing.lg,
  },
  footerLine: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginBottom: Spacing.sm,
  },
  footerContent: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  footerText: {
    fontSize: FontSize.sm,
    color: '#888',
    letterSpacing: 1,
  },
});

export default VictoryCard;

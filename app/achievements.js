import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import ReAnimated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Trophy, Lock, Sparkles, Star } from 'lucide-react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius, Shadows, Gradients } from '../constants/theme';
import { hapticSuccess, hapticLight } from '../lib/haptics';
import useAchievements, { CATEGORIES } from '../hooks/useAchievements';
import { useGamification } from '../context/GamificationContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = Spacing.sm;
const CARD_WIDTH = (SCREEN_WIDTH - Spacing.md * 2 - CARD_GAP) / 2;

function formatDate(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Category filter pill component
const CategoryPill = React.memo(function CategoryPill({ category, isActive, onPress }) {
  return (
    <Pressable
      style={[styles.pill, isActive && styles.pillActive]}
      onPress={onPress}
    >
      <Text style={[styles.pillText, isActive && styles.pillTextActive]}>
        {category.label}
      </Text>
    </Pressable>
  );
});

// Single achievement card
const AchievementCard = React.memo(function AchievementCard({ achievement, progress, index, onPress }) {
  const isUnlocked = achievement.isUnlocked;
  const isNew = achievement.isNew;

  return (
    <ReAnimated.View
      entering={FadeInDown.delay(80 + index * 40).springify().mass(0.5).damping(10)}
    >
      <Pressable
        style={[
          styles.card,
          isUnlocked && styles.cardUnlocked,
          isNew && styles.cardNew,
        ]}
        onPress={onPress}
      >
        {/* Gold border glow for unlocked */}
        {isUnlocked && (
          <LinearGradient
            colors={['rgba(255, 215, 0, 0.15)', 'rgba(255, 215, 0, 0.03)']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        )}

        {/* NEW badge */}
        {isNew && (
          <View style={styles.newBadge}>
            <Sparkles size={10} color={Colors.gold} />
            <Text style={styles.newBadgeText}>NEW</Text>
          </View>
        )}

        {/* Emoji */}
        <View style={[styles.emojiContainer, !isUnlocked && styles.emojiContainerLocked]}>
          <Text style={[styles.emoji, !isUnlocked && styles.emojiLocked]}>
            {achievement.emoji}
          </Text>
          {!isUnlocked && (
            <View style={styles.lockOverlay}>
              <Lock size={16} color={Colors.textTertiary} />
            </View>
          )}
        </View>

        {/* Title */}
        <Text
          style={[styles.cardTitle, !isUnlocked && styles.cardTitleLocked]}
          numberOfLines={1}
        >
          {achievement.title}
        </Text>

        {/* Description */}
        <Text
          style={[styles.cardDescription, !isUnlocked && styles.cardDescriptionLocked]}
          numberOfLines={2}
        >
          {achievement.description}
        </Text>

        {/* Unlocked date or progress bar */}
        {isUnlocked ? (
          <Text style={styles.unlockedDate}>
            {formatDate(achievement.unlockedAt)}
          </Text>
        ) : progress ? (
          <View style={styles.progressContainer}>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${Math.max(progress.percent * 100, 2)}%` },
                ]}
              />
            </View>
            <Text style={styles.progressLabel}>{progress.label}</Text>
          </View>
        ) : null}
      </Pressable>
    </ReAnimated.View>
  );
});

export default function AchievementsScreen() {
  const router = useRouter();
  const { totalXP, currentStreak } = useGamification();
  const {
    achievements,
    unlockedCount,
    totalCount,
    markSeen,
    markAllSeen,
    getProgress,
  } = useAchievements();

  const [selectedCategory, setSelectedCategory] = useState('all');

  // Build a stats context for progress calculation
  const statsContext = useMemo(() => ({
    streak: currentStreak,
    totalXP,
    // Other stats would come from their respective contexts
    // These are populated by checkAchievements elsewhere; here we use them for progress display
    totalFoodsLogged: 0,
    totalWorkouts: 0,
    waterGoalStreak: 0,
    calorieTargetStreak: 0,
  }), [currentStreak, totalXP]);

  // Mark all new achievements as seen when screen opens
  useEffect(() => {
    const timer = setTimeout(() => {
      markAllSeen();
    }, 2000); // Mark seen after 2 seconds on screen
    return () => clearTimeout(timer);
  }, [markAllSeen]);

  // Filter achievements by category
  const filteredAchievements = useMemo(() => {
    if (selectedCategory === 'all') return achievements;
    return achievements.filter((a) => a.category === selectedCategory);
  }, [achievements, selectedCategory]);

  // Separate unlocked and locked, unlocked first
  const sortedAchievements = useMemo(() => {
    const unlocked = filteredAchievements.filter((a) => a.isUnlocked);
    const locked = filteredAchievements.filter((a) => !a.isUnlocked);
    // New achievements first among unlocked
    unlocked.sort((a, b) => {
      if (a.isNew && !b.isNew) return -1;
      if (!a.isNew && b.isNew) return 1;
      return 0;
    });
    return [...unlocked, ...locked];
  }, [filteredAchievements]);

  const completionPercent = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  const handleCategoryPress = useCallback(async (key) => {
    await hapticLight();
    setSelectedCategory(key);
  }, []);

  const handleCardPress = useCallback(async (achievement) => {
    if (achievement.isNew) {
      await hapticSuccess();
      markSeen(achievement.id);
    } else {
      await hapticLight();
    }
  }, [markSeen]);

  const handleBack = useCallback(async () => {
    await hapticLight();
    router.back();
  }, [router]);

  return (
    <ScreenWrapper>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <ReAnimated.View entering={FadeInDown.delay(0).springify().mass(0.5).damping(10)} style={styles.header}>
          <Pressable style={styles.backButton} onPress={handleBack}>
            <ArrowLeft size={22} color={Colors.text} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Trophy size={22} color={Colors.gold} />
            <Text style={styles.headerTitle}>Achievements</Text>
          </View>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{unlockedCount}/{totalCount}</Text>
          </View>
        </ReAnimated.View>

        {/* Category filter pills */}
        <ReAnimated.View entering={FadeInDown.delay(60).springify().mass(0.5).damping(10)}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pillsContainer}
          >
            {CATEGORIES.map((cat) => (
              <CategoryPill
                key={cat.key}
                category={cat}
                isActive={selectedCategory === cat.key}
                onPress={() => handleCategoryPress(cat.key)}
              />
            ))}
          </ScrollView>
        </ReAnimated.View>

        {/* Achievement Grid - 2 columns */}
        <View style={styles.grid}>
          {sortedAchievements.map((achievement, index) => {
            const progress = !achievement.isUnlocked
              ? getProgress(achievement.id, statsContext)
              : null;

            return (
              <AchievementCard
                key={achievement.id}
                achievement={achievement}
                progress={progress}
                index={index}
                onPress={() => handleCardPress(achievement)}
              />
            );
          })}
        </View>

        {/* Empty state */}
        {sortedAchievements.length === 0 && (
          <ReAnimated.View entering={FadeInDown.delay(120).springify()} style={styles.emptyState}>
            <Trophy size={48} color={Colors.textTertiary} />
            <Text style={styles.emptyText}>No achievements in this category yet</Text>
          </ReAnimated.View>
        )}

        {/* Stats footer */}
        <ReAnimated.View entering={FadeInUp.delay(200).springify().mass(0.5).damping(10)} style={styles.statsFooter}>
          <View style={styles.statsCard}>
            <View style={styles.statsHeader}>
              <Star size={18} color={Colors.gold} />
              <Text style={styles.statsTitle}>
                {unlockedCount} of {totalCount} Achievements Unlocked
              </Text>
            </View>
            <View style={styles.completionBarBg}>
              <LinearGradient
                colors={[Colors.gold, Colors.goldDim]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.completionBarFill, { width: `${Math.max(completionPercent, 2)}%` }]}
              />
            </View>
            <Text style={styles.completionText}>{completionPercent}% Complete</Text>
          </View>
        </ReAnimated.View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surfaceGlass,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  countBadge: {
    backgroundColor: Colors.goldSoft,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  countBadgeText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.gold,
  },

  // Category pills
  pillsContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  pill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pillActive: {
    backgroundColor: Colors.primary + '20',
    borderColor: Colors.primary + '50',
  },
  pillText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
  },
  pillTextActive: {
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
  },

  // Grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CARD_GAP,
  },

  // Achievement card
  card: {
    width: CARD_WIDTH,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    minHeight: 180,
    overflow: 'hidden',
  },
  cardUnlocked: {
    borderColor: 'rgba(255, 215, 0, 0.25)',
    ...Shadows.glowWarning,
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  cardNew: {
    borderColor: 'rgba(255, 215, 0, 0.5)',
    ...Shadows.glowWarning,
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },

  // NEW badge
  newBadge: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: Colors.goldSoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    zIndex: 10,
  },
  newBadgeText: {
    fontSize: 9,
    fontWeight: FontWeight.bold,
    color: Colors.gold,
    letterSpacing: 0.5,
  },

  // Emoji
  emojiContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  emojiContainerLocked: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    opacity: 0.5,
  },
  emoji: {
    fontSize: 28,
  },
  emojiLocked: {
    opacity: 0.4,
  },
  lockOverlay: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },

  // Card text
  cardTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 2,
  },
  cardTitleLocked: {
    color: Colors.textTertiary,
  },
  cardDescription: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 15,
    marginBottom: Spacing.sm,
  },
  cardDescriptionLocked: {
    color: Colors.textMuted,
  },

  // Unlocked date
  unlockedDate: {
    fontSize: 10,
    color: Colors.gold,
    fontWeight: FontWeight.medium,
    marginTop: 'auto',
  },

  // Progress bar (locked cards)
  progressContainer: {
    width: '100%',
    marginTop: 'auto',
    alignItems: 'center',
  },
  progressBarBg: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.surfaceElevated,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: Colors.textTertiary,
  },
  progressLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: FontWeight.medium,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
    gap: Spacing.md,
  },
  emptyText: {
    fontSize: FontSize.md,
    color: Colors.textTertiary,
  },

  // Stats footer
  statsFooter: {
    marginTop: Spacing.xl,
  },
  statsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  statsTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  completionBarBg: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.surfaceElevated,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  completionBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  completionText: {
    fontSize: FontSize.sm,
    color: Colors.gold,
    fontWeight: FontWeight.semibold,
  },

  bottomSpacer: {
    height: 120,
  },
});

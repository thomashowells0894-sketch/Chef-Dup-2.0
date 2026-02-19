import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Pin,
  PinOff,
  Trash2,
  Clock,
  TrendingUp,
  Zap,
  Star,
} from 'lucide-react-native';
import ReAnimated, { FadeInDown } from 'react-native-reanimated';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../constants/theme';
import { hapticLight, hapticSuccess } from '../lib/haptics';
import useFrequentFoods from '../hooks/useFrequentFoods';

// ---- Pinned Food Card (grid) ----
function PinnedFoodCard({ food, onUnpin, index }) {
  return (
    <ReAnimated.View
      entering={FadeInDown.delay(index * 50).springify().mass(0.5).damping(12)}
      style={styles.pinnedCard}
    >
      <View style={styles.pinnedCardInner}>
        <Text style={styles.pinnedEmoji}>{food.emoji || '?'}</Text>
        <Text style={styles.pinnedName} numberOfLines={1}>{food.name}</Text>
        <Text style={styles.pinnedCalories}>{food.calories} kcal</Text>
        <Pressable
          style={styles.pinnedUnpinButton}
          onPress={() => {
            hapticLight();
            onUnpin(food.name);
          }}
          hitSlop={8}
        >
          <PinOff size={14} color={Colors.warning} />
        </Pressable>
      </View>
    </ReAnimated.View>
  );
}

// ---- Most Logged Food Row ----
function MostLoggedRow({ food, rank, onTogglePin, onRemove, index }) {
  const handleRemove = useCallback(() => {
    Alert.alert(
      'Remove Food',
      `Remove "${food.name}" from your frequent foods?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            hapticLight();
            onRemove(food.name);
          },
        },
      ]
    );
  }, [food.name, onRemove]);

  return (
    <ReAnimated.View entering={FadeInDown.delay(index * 40).springify().mass(0.5).damping(12)}>
      <View style={styles.loggedRow}>
        {/* Rank */}
        <View style={styles.loggedRank}>
          <Text style={styles.loggedRankText}>{rank}</Text>
        </View>

        {/* Emoji */}
        <View style={styles.loggedEmojiWrap}>
          <Text style={styles.loggedEmoji}>{food.emoji || '?'}</Text>
        </View>

        {/* Info */}
        <View style={styles.loggedInfo}>
          <Text style={styles.loggedName} numberOfLines={1}>{food.name}</Text>
          <View style={styles.loggedMeta}>
            <View style={styles.countBadge}>
              <TrendingUp size={10} color={Colors.primary} />
              <Text style={styles.countBadgeText}>logged {food.count}x</Text>
            </View>
            <Text style={styles.loggedCalories}>{food.calories} kcal</Text>
          </View>
        </View>

        {/* Pin toggle */}
        <Pressable
          style={[styles.actionButton, food.pinned && styles.actionButtonActive]}
          onPress={() => {
            hapticLight();
            onTogglePin(food.name);
          }}
          hitSlop={6}
        >
          {food.pinned ? (
            <PinOff size={16} color={Colors.warning} />
          ) : (
            <Pin size={16} color={Colors.textTertiary} />
          )}
        </Pressable>

        {/* Remove */}
        <Pressable
          style={styles.actionButton}
          onPress={handleRemove}
          hitSlop={6}
        >
          <Trash2 size={16} color={Colors.textTertiary} />
        </Pressable>
      </View>
    </ReAnimated.View>
  );
}

// ---- Recently Used Food Row ----
function RecentRow({ food, index }) {
  const timeAgo = useMemo(() => {
    if (!food.lastUsed) return '';
    const diff = Date.now() - new Date(food.lastUsed).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    return `${Math.floor(days / 7)}w ago`;
  }, [food.lastUsed]);

  return (
    <ReAnimated.View entering={FadeInDown.delay(index * 40).springify().mass(0.5).damping(12)}>
      <View style={styles.recentRow}>
        <View style={styles.recentEmojiWrap}>
          <Text style={styles.recentEmoji}>{food.emoji || '?'}</Text>
        </View>
        <View style={styles.recentInfo}>
          <Text style={styles.recentName} numberOfLines={1}>{food.name}</Text>
          <View style={styles.recentMeta}>
            <Clock size={11} color={Colors.textTertiary} />
            <Text style={styles.recentTime}>{timeAgo}</Text>
          </View>
        </View>
        <View style={styles.recentCaloriesWrap}>
          <Text style={styles.recentCaloriesValue}>{food.calories}</Text>
          <Text style={styles.recentCaloriesLabel}>kcal</Text>
        </View>
      </View>
    </ReAnimated.View>
  );
}

// ---- Empty State ----
function EmptyState() {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconWrap}>
        <Zap size={48} color={Colors.textTertiary} />
      </View>
      <Text style={styles.emptyTitle}>No Frequent Foods Yet</Text>
      <Text style={styles.emptySubtitle}>
        Your most-used foods will appear here as you log meals. The more you log, the smarter your Quick Log gets.
      </Text>
    </View>
  );
}

// ---- Main Screen ----
export default function FrequentFoodsScreen() {
  const router = useRouter();
  const {
    foods,
    isLoading,
    togglePin,
    removeFood,
    getTopFoods,
    getRecentFoods,
    pinnedFoods,
  } = useFrequentFoods();

  const topFoods = useMemo(() => getTopFoods(20), [getTopFoods]);
  const recentFoods = useMemo(() => getRecentFoods(10), [getRecentFoods]);

  const hasAnyFoods = foods.length > 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={8}
        >
          <ArrowLeft size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Frequent Foods</Text>
        <View style={styles.headerSpacer} />
      </View>

      {!hasAnyFoods && !isLoading ? (
        <EmptyState />
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ---- Pinned Section ---- */}
          {pinnedFoods.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Star size={16} color={Colors.warning} fill={Colors.warning} />
                <Text style={styles.sectionTitle}>Pinned</Text>
                <View style={styles.sectionCount}>
                  <Text style={styles.sectionCountText}>{pinnedFoods.length}</Text>
                </View>
              </View>
              <View style={styles.pinnedGrid}>
                {pinnedFoods.map((food, index) => (
                  <PinnedFoodCard
                    key={food.name}
                    food={food}
                    onUnpin={togglePin}
                    index={index}
                  />
                ))}
              </View>
            </View>
          )}

          {/* ---- Most Logged Section ---- */}
          {topFoods.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <TrendingUp size={16} color={Colors.primary} />
                <Text style={styles.sectionTitle}>Most Logged</Text>
                <View style={styles.sectionCount}>
                  <Text style={styles.sectionCountText}>{topFoods.length}</Text>
                </View>
              </View>
              {topFoods.map((food, index) => (
                <MostLoggedRow
                  key={food.name}
                  food={food}
                  rank={index + 1}
                  onTogglePin={togglePin}
                  onRemove={removeFood}
                  index={index}
                />
              ))}
            </View>
          )}

          {/* ---- Recently Used Section ---- */}
          {recentFoods.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Clock size={16} color={Colors.textSecondary} />
                <Text style={styles.sectionTitle}>Recently Used</Text>
              </View>
              {recentFoods.map((food, index) => (
                <RecentRow
                  key={food.name}
                  food={food}
                  index={index}
                />
              ))}
            </View>
          )}

          {/* Bottom spacer for tab bar */}
          <View style={styles.bottomSpacer} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  // Sections
  section: {
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    flex: 1,
  },
  sectionCount: {
    backgroundColor: Colors.surfaceGlass,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  sectionCountText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
  },
  // Pinned grid
  pinnedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  pinnedCard: {
    width: '47%',
  },
  pinnedCardInner: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,179,0,0.15)',
    position: 'relative',
  },
  pinnedEmoji: {
    fontSize: 32,
    marginBottom: Spacing.xs,
  },
  pinnedName: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    textAlign: 'center',
  },
  pinnedCalories: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  pinnedUnpinButton: {
    position: 'absolute',
    top: Spacing.xs,
    right: Spacing.xs,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,179,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Most logged rows
  loggedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  loggedRank: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.surfaceGlass,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  loggedRankText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.textSecondary,
  },
  loggedEmojiWrap: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceGlass,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  loggedEmoji: {
    fontSize: 20,
  },
  loggedInfo: {
    flex: 1,
  },
  loggedName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  loggedMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: 2,
  },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.primarySoft,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.xs + 2,
    paddingVertical: 1,
  },
  countBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },
  loggedCalories: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Spacing.xs,
  },
  actionButtonActive: {
    backgroundColor: 'rgba(255,179,0,0.1)',
  },
  // Recent rows
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  recentEmojiWrap: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceGlass,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  recentEmoji: {
    fontSize: 20,
  },
  recentInfo: {
    flex: 1,
  },
  recentName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  recentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  recentTime: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },
  recentCaloriesWrap: {
    alignItems: 'flex-end',
  },
  recentCaloriesValue: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  recentCaloriesLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  // Empty state
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  emptyIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.surfaceGlass,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  // Bottom spacer
  bottomSpacer: {
    height: 120,
  },
});

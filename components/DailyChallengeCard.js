/**
 * DailyChallengeCard
 *
 * Dashboard card displaying today's 3 daily challenges.
 * Glass card styling matching the existing premium dark dashboard.
 * Shows progress, XP rewards, and a bonus celebration when all are done.
 */

import React, { memo, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeIn, ZoomIn } from 'react-native-reanimated';
import { Trophy, Check, Circle, Sparkles } from 'lucide-react-native';
import GlassCard from './ui/GlassCard';
import { hapticLight, hapticSuccess } from '../lib/haptics';
import {
  Colors,
  Spacing,
  FontSize,
  FontWeight,
  BorderRadius,
  Shadows,
} from '../constants/theme';

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Single challenge row */
const ChallengeRow = memo(function ChallengeRow({ challenge, onComplete }) {
  const handlePress = useCallback(async () => {
    if (challenge.isCompleted) return;
    await hapticSuccess();
    onComplete?.(challenge.id);
  }, [challenge.id, challenge.isCompleted, onComplete]);

  return (
    <Pressable
      onPress={handlePress}
      style={styles.challengeRow}
      accessibilityRole="button"
      accessibilityLabel={`Challenge: ${challenge.description}, ${challenge.isCompleted ? 'completed' : 'in progress'}. ${challenge.xpReward} XP reward`}
      accessibilityState={{ disabled: challenge.isCompleted }}
    >
      {/* Emoji */}
      <Text style={styles.challengeEmoji}>{challenge.emoji}</Text>

      {/* Text content */}
      <View style={styles.challengeTextColumn}>
        <Text
          style={[
            styles.challengeTitle,
            challenge.isCompleted && styles.challengeTitleCompleted,
          ]}
          numberOfLines={1}
        >
          {challenge.title}
        </Text>
        <Text
          style={[
            styles.challengeDescription,
            challenge.isCompleted && styles.challengeDescriptionCompleted,
          ]}
          numberOfLines={1}
        >
          {challenge.description}
        </Text>
      </View>

      {/* XP badge */}
      <View
        style={[
          styles.xpBadge,
          challenge.isCompleted && styles.xpBadgeCompleted,
        ]}
      >
        <Text
          style={[
            styles.xpBadgeText,
            challenge.isCompleted && styles.xpBadgeTextCompleted,
          ]}
        >
          +{challenge.xpReward}
        </Text>
      </View>

      {/* Check circle */}
      <View style={styles.checkContainer}>
        {challenge.isCompleted ? (
          <Animated.View entering={ZoomIn.springify().damping(10)} style={styles.checkCircleFilled}>
            <Check size={14} color={Colors.background} strokeWidth={3} />
          </Animated.View>
        ) : (
          <View style={styles.checkCircleOutline}>
            <Circle size={20} color={Colors.textTertiary} strokeWidth={1.5} />
          </View>
        )}
      </View>
    </Pressable>
  );
});

/** Bonus celebration row shown when all 3 are complete */
const BonusCelebration = memo(function BonusCelebration() {
  return (
    <Animated.View entering={FadeIn.delay(200).springify()} style={styles.bonusRow}>
      <LinearGradient
        colors={[Colors.goldSoft, 'rgba(255, 215, 0, 0.05)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.bonusGradient}
      >
        <Sparkles size={18} color={Colors.gold} strokeWidth={2} />
        <Text style={styles.bonusText}>All Complete!</Text>
        <View style={styles.bonusXpBadge}>
          <Text style={styles.bonusXpText}>+50 XP Bonus</Text>
        </View>
      </LinearGradient>
    </Animated.View>
  );
});

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

function DailyChallengeCard({
  challenges,
  isLoading,
  completedCount,
  totalCount,
  allComplete,
  onCheckProgress,
  onCompleteChallenge,
}) {
  const handleCheckProgress = useCallback(async () => {
    await hapticLight();
    onCheckProgress?.();
  }, [onCheckProgress]);

  if (isLoading) {
    return (
      <GlassCard style={styles.card}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={Colors.primary} />
        </View>
      </GlassCard>
    );
  }

  if (!challenges || challenges.length === 0) {
    return null;
  }

  return (
    <Animated.View entering={FadeInDown.delay(100).springify().damping(14)}>
      <GlassCard style={styles.card} glow={allComplete} variant={allComplete ? 'success' : 'default'}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Trophy size={18} color={Colors.gold} strokeWidth={2.5} />
            <Text style={styles.headerTitle}>Daily Challenges</Text>
          </View>
          <View style={styles.completionBadge}>
            <Text style={styles.completionBadgeText}>
              {completedCount}/{totalCount}
            </Text>
          </View>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Challenge rows */}
        <View accessibilityRole="list" accessibilityLabel={`Daily challenges, ${completedCount} of ${totalCount} complete`}>
        {challenges.map((challenge, index) => (
          <ChallengeRow
            key={challenge.id}
            challenge={challenge}
            onComplete={onCompleteChallenge}
          />
        ))}
        </View>

        {/* All-complete bonus */}
        {allComplete && <BonusCelebration />}

        {/* Check Progress button (hidden when all complete) */}
        {!allComplete && (
          <Pressable onPress={handleCheckProgress} style={styles.checkProgressButton}>
            <LinearGradient
              colors={[Colors.primarySoft, 'rgba(0, 212, 255, 0.05)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.checkProgressGradient}
            >
              <Sparkles size={14} color={Colors.primary} strokeWidth={2.5} />
              <Text style={styles.checkProgressText}>Check Progress</Text>
            </LinearGradient>
          </Pressable>
        )}
      </GlassCard>
    </Animated.View>
  );
}

export default memo(DailyChallengeCard);

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.md,
  },

  // Loading
  loadingContainer: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  headerTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  completionBadge: {
    backgroundColor: Colors.surfaceGlassLight,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  completionBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.textSecondary,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginBottom: Spacing.sm,
  },

  // Challenge row
  challengeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  challengeEmoji: {
    fontSize: 22,
    width: 30,
    textAlign: 'center',
  },
  challengeTextColumn: {
    flex: 1,
  },
  challengeTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginBottom: 1,
  },
  challengeTitleCompleted: {
    textDecorationLine: 'line-through',
    color: Colors.textTertiary,
  },
  challengeDescription: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },
  challengeDescriptionCompleted: {
    textDecorationLine: 'line-through',
    color: Colors.textMuted,
  },

  // XP badge
  xpBadge: {
    backgroundColor: Colors.primarySoft,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.xs + 2,
    paddingVertical: 2,
  },
  xpBadgeCompleted: {
    backgroundColor: Colors.successSoft,
  },
  xpBadgeText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  xpBadgeTextCompleted: {
    color: Colors.success,
  },

  // Check circle
  checkContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkCircleFilled: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.success,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkCircleOutline: {
    opacity: 0.5,
  },

  // Bonus celebration
  bonusRow: {
    marginTop: Spacing.sm,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
  },
  bonusGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.goldGlow,
  },
  bonusText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.gold,
  },
  bonusXpBadge: {
    backgroundColor: Colors.goldSoft,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.xs + 2,
    paddingVertical: 2,
  },
  bonusXpText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    color: Colors.gold,
  },

  // Check Progress button
  checkProgressButton: {
    marginTop: Spacing.sm,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
  },
  checkProgressGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.borderAccent,
  },
  checkProgressText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },
});

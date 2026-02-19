import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  InteractionManager,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Sun,
  Brain,
  Sparkles,
  X,
  Target,
  Dumbbell,
  Quote,
} from 'lucide-react-native';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius, Shadows, Glass } from '../constants/theme';
import { useProfile } from '../context/ProfileContext';
import { useWeeklyData, useMealTotals } from '../context/MealContext';
import { useGamification } from '../context/GamificationContext';
import { useFasting } from '../context/FastingContext';
import { useIsPremium } from '../context/SubscriptionContext';
import { generateMorningBriefing } from '../services/ai';

const STORAGE_KEY_DISMISSED = '@vibefit_morning_briefing_dismissed';
const STORAGE_KEY_CACHE = '@vibefit_morning_briefing_cache';

// Get today's date key
function getTodayKey() {
  return new Date().toISOString().split('T')[0];
}

// Get yesterday's date key
function getYesterdayKey() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split('T')[0];
}

// Map weeklyGoal to simple goal string
function mapWeeklyGoalToGoal(weeklyGoal) {
  if (!weeklyGoal) return 'maintain';
  if (weeklyGoal.startsWith('lose')) return 'lose';
  if (weeklyGoal.startsWith('gain')) return 'gain';
  return 'maintain';
}

// Get score badge color
function getScoreColor(score) {
  if (score > 70) return Colors.success;
  if (score >= 40) return Colors.warning;
  return Colors.error;
}

// Get score badge background
function getScoreBgColor(score) {
  if (score > 70) return Colors.successSoft;
  if (score >= 40) return Colors.warningSoft;
  return Colors.errorSoft;
}

import { SkeletonBox } from './SkeletonLoader';

function LoadingShimmer() {
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.02)']}
        style={styles.card}
      >
        <View style={styles.shimmerHeader}>
          <SkeletonBox width={40} height={40} borderRadius={BorderRadius.full} />
          <View style={{ flex: 1, gap: Spacing.xs }}>
            <SkeletonBox width="70%" height={FontSize.lg} />
            <SkeletonBox width="90%" height={FontSize.sm} />
          </View>
        </View>
        <SkeletonBox width={60} height={60} style={{ alignSelf: 'center', borderRadius: BorderRadius.full, marginVertical: Spacing.md }} />
        {[1, 2, 3].map((i) => (
          <SkeletonBox
            key={i}
            width="100%"
            height={70}
            style={{ marginBottom: Spacing.sm, borderRadius: BorderRadius.md }}
          />
        ))}
        <SkeletonBox width="100%" height={80} style={{ borderRadius: BorderRadius.md, marginTop: Spacing.sm }} />
      </LinearGradient>
    </View>
  );
}

function MorningBriefing() {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [briefingData, setBriefingData] = useState(null);
  const [error, setError] = useState(false);

  const { isPremium } = useIsPremium();
  const { profile, calculatedGoals, weightStats } = useProfile();
  const { getDayTotals } = useWeeklyData();
  const { goals } = useMealTotals();
  const { currentStreak } = useGamification();
  const { isFasting, fastDuration } = useFasting();

  // Check if briefing should show and load data
  const loadBriefing = useCallback(async () => {
    // Skip AI briefing for free users — silently hide
    if (!isPremium) {
      setVisible(false);
      setLoading(false);
      return;
    }

    try {
      // Defer storage reads until animations complete to avoid blocking JS thread
      const dismissedDate = await new Promise((resolve) => {
        InteractionManager.runAfterInteractions(async () => {
          resolve(await AsyncStorage.getItem(STORAGE_KEY_DISMISSED));
        });
      });
      const today = getTodayKey();

      if (dismissedDate === today) {
        setVisible(false);
        setLoading(false);
        return;
      }

      // Show the card
      setVisible(true);
      setLoading(true);

      // Check for cached briefing for today
      const cachedRaw = await new Promise((resolve) => {
        InteractionManager.runAfterInteractions(async () => {
          resolve(await AsyncStorage.getItem(STORAGE_KEY_CACHE));
        });
      });
      if (cachedRaw) {
        try {
          const cached = JSON.parse(cachedRaw);
          if (cached && cached.date === today && cached.data) {
            setBriefingData(cached.data);
            setLoading(false);
            return;
          }
        } catch {
          // Cache corrupt, continue to generate
        }
      }

      // Gather user data for the AI
      const yesterdayKey = getYesterdayKey();
      const yesterdayTotals = getDayTotals(yesterdayKey);
      const calorieGoal = calculatedGoals?.calories || goals?.calories || 2000;
      const proteinGoal = calculatedGoals?.protein || goals?.protein || 150;

      // Collect last 7 days of meal totals for weekly pattern analysis
      const weeklyPatterns = [];
      let totalWeekCalories = 0;
      let totalWeekProtein = 0;
      let highestCalDay = { date: '', calories: 0 };
      let lowestCalDay = { date: '', calories: Infinity };
      let daysWithData = 0;

      for (let i = 1; i <= 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateKey = d.toISOString().split('T')[0];
        const dayTotals = getDayTotals(dateKey);
        if (dayTotals && dayTotals.calories > 0) {
          daysWithData++;
          totalWeekCalories += dayTotals.calories;
          totalWeekProtein += dayTotals.protein || 0;
          weeklyPatterns.push({
            date: dateKey,
            calories: dayTotals.calories,
            protein: dayTotals.protein || 0,
          });
          if (dayTotals.calories > highestCalDay.calories) {
            highestCalDay = { date: dateKey, calories: dayTotals.calories };
          }
          if (dayTotals.calories < lowestCalDay.calories) {
            lowestCalDay = { date: dateKey, calories: dayTotals.calories };
          }
        }
      }

      const avgWeekCalories = daysWithData > 0 ? Math.round(totalWeekCalories / daysWithData) : 0;
      const avgWeekProtein = daysWithData > 0 ? Math.round(totalWeekProtein / daysWithData) : 0;

      const userData = {
        userName: profile.name || 'Champion',
        yesterdayCalories: yesterdayTotals?.calories || 0,
        calorieGoal,
        yesterdayProtein: yesterdayTotals?.protein || 0,
        proteinGoal,
        currentStreak: currentStreak || 0,
        weightTrend: weightStats?.weeklyChange || 0,
        isFasting: !!isFasting,
        fastDuration: fastDuration || 0,
        dietaryPreferences: profile.dietaryRestrictions || [],
        goal: mapWeeklyGoalToGoal(profile.weeklyGoal),
        // Weekly pattern data for richer AI coaching
        weeklyPatterns: daysWithData > 0 ? {
          avgCalories: avgWeekCalories,
          avgProtein: avgWeekProtein,
          daysTracked: daysWithData,
          highestDay: highestCalDay.calories < Infinity ? highestCalDay : null,
          lowestDay: lowestCalDay.calories < Infinity ? lowestCalDay : null,
          dailyBreakdown: weeklyPatterns,
        } : null,
      };

      const result = await generateMorningBriefing(userData);
      setBriefingData(result);

      // Cache the result (non-blocking)
      InteractionManager.runAfterInteractions(() => {
        AsyncStorage.setItem(
          STORAGE_KEY_CACHE,
          JSON.stringify({ date: today, data: result })
        );
      });

      setLoading(false);
    } catch (err) {
      if (__DEV__) console.error('Morning briefing error:', err);
      setError(true);
      setLoading(false);
    }
  }, [getDayTotals, calculatedGoals, goals, currentStreak, profile, weightStats, isFasting, fastDuration]);

  // Load on mount with slight delay
  useEffect(() => {
    const timer = setTimeout(() => {
      loadBriefing();
    }, 800);
    return () => clearTimeout(timer);
  }, [loadBriefing]);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    InteractionManager.runAfterInteractions(() => {
      const today = getTodayKey();
      AsyncStorage.setItem(STORAGE_KEY_DISMISSED, today);
    });
  }, []);

  // Fallback greeting for error state
  const fallbackGreeting = useMemo(() => {
    const hour = new Date().getHours();
    const name = profile.name ? profile.name.split(' ')[0] : 'Champion';
    if (hour < 12) return `Good morning, ${name}!`;
    if (hour < 17) return `Good afternoon, ${name}!`;
    return `Good evening, ${name}!`;
  }, [profile.name]);

  if (!visible) return null;

  // Loading state
  if (loading) {
    return (
      <Animated.View entering={FadeInDown.duration(400).delay(100)}>
        <LoadingShimmer />
      </Animated.View>
    );
  }

  // Error fallback - simple greeting card
  if (error || !briefingData) {
    return (
      <Animated.View entering={FadeInDown.duration(400).delay(100)}>
        <View style={styles.container}>
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.02)']}
            style={styles.card}
            accessibilityRole="alert"
            accessibilityLabel={`${fallbackGreeting} Ready to make today count? Let's get after it!`}
          >
            <View style={styles.headerRow}>
              <View style={styles.greetingIconWrap}>
                <Sun size={20} color={Colors.warning} />
              </View>
              <Text style={styles.greetingText}>{fallbackGreeting}</Text>
              <Pressable
              onPress={handleDismiss}
              style={styles.dismissButton}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Dismiss morning briefing"
            >
                <X size={18} color={Colors.textSecondary} />
              </Pressable>
            </View>
            <Text style={styles.fallbackMessage}>
              Ready to make today count? Let's get after it!
            </Text>
          </LinearGradient>
        </View>
      </Animated.View>
    );
  }

  const { greeting, headline, insights, todayFocus, motivationalQuote, score } = briefingData;
  const scoreColor = getScoreColor(score);
  const scoreBgColor = getScoreBgColor(score);

  return (
    <Animated.View entering={FadeInDown.duration(500).delay(100)}>
      <View style={styles.container}>
        <LinearGradient
          colors={['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.02)']}
          style={styles.card}
          accessibilityRole="alert"
          accessibilityLabel={`Morning briefing. ${greeting} ${headline}`}
        >
          {/* Header: Greeting + Dismiss */}
          <Animated.View entering={FadeInDown.duration(400).delay(150)} style={styles.headerRow}>
            <View style={styles.greetingIconWrap}>
              <Sparkles size={20} color={Colors.primary} />
            </View>
            <View style={styles.headerTextWrap}>
              <Text style={styles.greetingText} numberOfLines={1}>{greeting}</Text>
              <Text style={styles.headlineText} numberOfLines={2}>{headline}</Text>
            </View>
            <Pressable
              onPress={handleDismiss}
              style={styles.dismissButton}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Dismiss morning briefing"
            >
              <X size={18} color={Colors.textSecondary} />
            </Pressable>
          </Animated.View>

          {/* Score Badge */}
          <Animated.View entering={FadeInDown.duration(400).delay(250)} style={styles.scoreBadgeRow}>
            <View style={[styles.scoreBadge, { backgroundColor: scoreBgColor }]}>
              <Text style={[styles.scoreNumber, { color: scoreColor }]}>{score}</Text>
              <Text style={[styles.scoreLabel, { color: scoreColor }]}>/ 100</Text>
            </View>
            <Text style={styles.scoreCaption}>Yesterday's Score</Text>
          </Animated.View>

          {/* Insight Cards */}
          {insights && insights.length > 0 && (
            <View style={styles.insightsSection}>
              <View style={styles.sectionHeader}>
                <Brain size={14} color={Colors.primary} />
                <Text style={styles.sectionTitle}>AI Insights</Text>
              </View>
              {insights.map((insight, index) => (
                <Animated.View
                  key={index}
                  entering={FadeInDown.duration(400).delay(350 + index * 80)}
                  style={styles.insightCard}
                >
                  <Text style={styles.insightEmoji}>{insight.emoji}</Text>
                  <View style={styles.insightContent}>
                    <Text style={styles.insightTitle}>{insight.title}</Text>
                    <Text style={styles.insightBody}>{insight.body}</Text>
                  </View>
                </Animated.View>
              ))}
            </View>
          )}

          {/* Today's Focus */}
          {todayFocus && (
            <Animated.View entering={FadeInDown.duration(400).delay(600)} style={styles.focusSection}>
              <View style={styles.sectionHeader}>
                <Target size={14} color={Colors.secondary} />
                <Text style={styles.sectionTitle}>Today's Focus</Text>
              </View>
              <View style={styles.focusCard}>
                <View style={styles.focusItem}>
                  <View style={[styles.focusIconWrap, { backgroundColor: Colors.successSoft }]}>
                    <Target size={16} color={Colors.success} />
                  </View>
                  <View style={styles.focusTextWrap}>
                    <Text style={styles.focusLabel}>Nutrition</Text>
                    <Text style={styles.focusText}>{todayFocus.food}</Text>
                  </View>
                </View>
                <View style={styles.focusDivider} />
                <View style={styles.focusItem}>
                  <View style={[styles.focusIconWrap, { backgroundColor: Colors.primarySoft }]}>
                    <Dumbbell size={16} color={Colors.primary} />
                  </View>
                  <View style={styles.focusTextWrap}>
                    <Text style={styles.focusLabel}>Movement</Text>
                    <Text style={styles.focusText}>{todayFocus.workout}</Text>
                  </View>
                </View>
              </View>
            </Animated.View>
          )}

          {/* Motivational Quote */}
          {motivationalQuote && (
            <Animated.View entering={FadeInDown.duration(400).delay(700)} style={styles.quoteSection}>
              <View style={styles.quoteCard}>
                <Quote size={14} color={Colors.textTertiary} />
                <Text style={styles.quoteText}>{motivationalQuote}</Text>
              </View>
            </Animated.View>
          )}

          {/* Dismiss Button */}
          <Animated.View entering={FadeInDown.duration(400).delay(800)}>
            <Pressable
              onPress={handleDismiss}
              style={styles.dismissCta}
              accessibilityRole="button"
              accessibilityLabel="Dismiss morning briefing"
            >
              <Text style={styles.dismissCtaText}>Got it, let's go!</Text>
            </Pressable>
          </Animated.View>
        </LinearGradient>
      </View>
    </Animated.View>
  );
}

export default React.memo(MorningBriefing);

const styles = StyleSheet.create({
  container: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  card: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: Glass.borderWidth,
    borderColor: Glass.borderColor,
    ...Shadows.card,
  },

  // Header
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  greetingIconWrap: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextWrap: {
    flex: 1,
  },
  greetingText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  headlineText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.regular,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  dismissButton: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceGlass,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Score Badge
  scoreBadgeRow: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
  },
  scoreNumber: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
  },
  scoreLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  scoreCaption: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Colors.textTertiary,
    marginTop: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Insights
  insightsSection: {
    marginBottom: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.surfaceGlass,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  insightEmoji: {
    fontSize: FontSize.xl,
    lineHeight: FontSize.xl + 4,
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  insightBody: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.regular,
    color: Colors.textSecondary,
    lineHeight: FontSize.sm * 1.5,
  },

  // Today's Focus
  focusSection: {
    marginBottom: Spacing.md,
  },
  focusCard: {
    backgroundColor: Colors.surfaceGlass,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  focusItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  focusIconWrap: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  focusTextWrap: {
    flex: 1,
  },
  focusLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  focusText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.regular,
    color: Colors.text,
    lineHeight: FontSize.sm * 1.5,
  },
  focusDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.sm,
  },

  // Quote
  quoteSection: {
    marginBottom: Spacing.md,
  },
  quoteCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  quoteText: {
    flex: 1,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.regular,
    fontStyle: 'italic',
    color: Colors.textTertiary,
    lineHeight: FontSize.sm * 1.5,
  },

  // Dismiss CTA
  dismissCta: {
    backgroundColor: Colors.primarySoft,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm + 2,
    alignItems: 'center',
  },
  dismissCtaText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },

  // Fallback
  fallbackMessage: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.regular,
    color: Colors.textSecondary,
    lineHeight: FontSize.md * 1.5,
    marginTop: Spacing.sm,
  },

  // Shimmer
  shimmerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
});

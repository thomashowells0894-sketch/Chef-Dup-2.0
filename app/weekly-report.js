/**
 * Weekly Report Screen
 *
 * A beautiful weekly summary with:
 * - Overall grade (A+ to F)
 * - Calories: avg daily, best/worst day, compliance %
 * - Macros: protein/carb/fat averages vs targets
 * - Exercise: workouts completed, total volume, calories burned
 * - Sleep: avg hours, quality trend (when available)
 * - Weight: change this week, total progress
 * - Top 3 insights from insightGenerator
 * - "Next week focus" -- 1-2 actionable recommendations
 * - Share as image (placeholder for react-native-view-shot)
 */

import React, { useMemo, useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Dimensions,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import ReAnimated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import {
  ChevronLeft,
  Share2,
  Flame,
  Target,
  Dumbbell,
  Moon,
  Scale,
  Lightbulb,
  TrendingUp,
  TrendingDown,
  Award,
  Zap,
  ArrowRight,
} from 'lucide-react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import {
  Colors,
  Gradients,
  Spacing,
  FontSize,
  FontWeight,
  BorderRadius,
} from '../constants/theme';
import { hapticLight } from '../lib/haptics';
import { useMeals } from '../context/MealContext';
import { useProfile } from '../context/ProfileContext';
import { useGamification } from '../context/GamificationContext';
import { generateWeeklyReportCard } from '../lib/analyticsEngine';
import { generateInsights, getNextWeekFocus } from '../lib/insightGenerator';

// Safe optional hooks
let useWorkoutHistory = null;
try { useWorkoutHistory = require('../hooks/useWorkoutHistory').default; } catch {}
let useWeightHistoryHook = null;
try { useWeightHistoryHook = require('../hooks/useWeightHistory').useWeightHistory; } catch {}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Grade ring configuration
const RING_SIZE = 140;
const RING_STROKE = 10;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function GradeRing({ grade, gradeColor, score }) {
  const progress = score / 100;
  const strokeDashoffset = RING_CIRCUMFERENCE * (1 - progress);

  return (
    <View style={styles.gradeRingContainer}>
      <Svg width={RING_SIZE} height={RING_SIZE}>
        <Circle
          cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_RADIUS}
          stroke="rgba(255,255,255,0.06)" strokeWidth={RING_STROKE} fill="transparent"
        />
        <Circle
          cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_RADIUS}
          stroke={gradeColor} strokeWidth={RING_STROKE} fill="transparent"
          strokeDasharray={RING_CIRCUMFERENCE} strokeDashoffset={strokeDashoffset}
          strokeLinecap="round" rotation="-90" origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
        />
      </Svg>
      <View style={styles.gradeOverlay}>
        <Text style={[styles.gradeText, { color: gradeColor }]}>{grade}</Text>
        <Text style={styles.gradeScore}>{score}/100</Text>
      </View>
    </View>
  );
}

function StatRow({ icon: Icon, iconColor, label, value, subValue, good }) {
  return (
    <View style={styles.statRow}>
      <View style={[styles.statIcon, { backgroundColor: iconColor + '15' }]}>
        <Icon size={16} color={iconColor} />
      </View>
      <View style={styles.statContent}>
        <Text style={styles.statLabel}>{label}</Text>
        {subValue ? <Text style={styles.statSub}>{subValue}</Text> : null}
      </View>
      <Text style={[styles.statValue, good !== undefined && { color: good ? Colors.success : Colors.error }]}>
        {value}
      </Text>
    </View>
  );
}

function MacroBar({ label, value, target, color }) {
  const pct = target > 0 ? Math.min(value / target, 1.3) : 0;
  const displayPct = Math.min(pct, 1);
  const isOver = pct > 1.15;
  const isOnTarget = pct >= 0.85 && pct <= 1.15;

  return (
    <View style={styles.macroBarRow}>
      <View style={styles.macroBarHeader}>
        <Text style={styles.macroBarLabel}>{label}</Text>
        <Text style={[styles.macroBarValue, isOnTarget && { color: Colors.success }, isOver && { color: Colors.error }]}>
          {value}g <Text style={styles.macroBarTarget}>/ {target}g</Text>
        </Text>
      </View>
      <View style={styles.macroBarTrack}>
        <View style={[styles.macroBarFill, { width: `${displayPct * 100}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

function InsightItem({ insight, delay }) {
  const typeConfig = {
    positive: { color: Colors.success, bg: Colors.success + '12' },
    warning: { color: Colors.warning, bg: Colors.warning + '12' },
    info: { color: Colors.primary, bg: Colors.primary + '12' },
    achievement: { color: Colors.gold, bg: Colors.gold + '12' },
  };
  const config = typeConfig[insight.type] || typeConfig.info;

  return (
    <ReAnimated.View entering={FadeInDown.delay(delay).springify().damping(12)}>
      <View style={[styles.insightItem, { borderColor: config.color + '30', backgroundColor: config.bg }]}>
        <View style={[styles.insightDot, { backgroundColor: config.color }]} />
        <View style={styles.insightContent}>
          <Text style={[styles.insightTitle, { color: config.color }]}>{insight.title}</Text>
          <Text style={styles.insightDesc}>{insight.description}</Text>
        </View>
      </View>
    </ReAnimated.View>
  );
}

export default function WeeklyReportScreen() {
  const router = useRouter();
  const { weeklyData, goals, dayData } = useMeals();
  const { weeklyWeightData, profile } = useProfile();
  const { currentStreak } = useGamification();

  const workoutResult = useWorkoutHistory ? useWorkoutHistory() : null;
  const workouts = workoutResult?.workouts || [];
  const weightResult = useWeightHistoryHook ? useWeightHistoryHook() : null;

  const handleBack = useCallback(async () => {
    await hapticLight();
    router.back();
  }, [router]);

  // Build report card
  const report = useMemo(() => {
    const dailyData = (weeklyData || []).map(d => ({
      calories: d.calories || 0,
      protein: d.protein || 0,
      carbs: d.carbs || 0,
      fat: d.fat || 0,
      goal: d.goal || goals?.calories || 2000,
    }));

    const now = new Date();
    const oneWeekAgo = new Date(now);
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const weekWorkouts = (workouts || []).filter(w => new Date(w.date) >= oneWeekAgo);

    // Weight
    const weightEntries = weightResult?.entries || [];
    const sortedWeight = [...weightEntries].sort((a, b) => new Date(a.date) - new Date(b.date));
    const recentWeights = sortedWeight.filter(w => new Date(w.date) >= oneWeekAgo);
    const weightStart = recentWeights.length > 0 ? recentWeights[0].weight : (profile?.weight || 0);
    const weightEnd = recentWeights.length > 0 ? recentWeights[recentWeights.length - 1].weight : (profile?.weight || 0);

    return generateWeeklyReportCard({
      dailyData,
      goals: {
        calories: goals?.calories || 2000,
        protein: goals?.protein || 150,
        carbs: goals?.carbs || 200,
        fat: goals?.fat || 65,
      },
      workouts: weekWorkouts.map(w => ({ duration: w.duration || 0, calories: w.calories || 0 })),
      weightStart: weightStart || profile?.weight || 0,
      weightEnd: weightEnd || profile?.weight || 0,
      streak: currentStreak || 0,
    });
  }, [weeklyData, goals, workouts, weightResult, profile, currentStreak]);

  // Generate insights
  const insights = useMemo(() => {
    const dailyDataForInsights = (weeklyData || []).map(d => ({
      date: d.date || new Date().toISOString().split('T')[0],
      calories: d.calories || 0,
      protein: d.protein || 0,
      carbs: d.carbs || 0,
      fat: d.fat || 0,
      goal: d.goal || goals?.calories || 2000,
      proteinGoal: goals?.protein || 150,
    }));

    const loggedDates = dayData
      ? Object.keys(dayData).filter(k => dayData[k]?.totals?.calories > 0)
      : [];

    const weightHistory = weightResult?.entries?.map(e => ({
      date: e.date,
      weight: e.weight,
    })) || [];

    return generateInsights({
      dailyData: dailyDataForInsights,
      weightHistory,
      currentWeight: profile?.weight,
      goalWeight: profile?.goalWeight,
      startWeight: profile?.weight,
      expectedWeeklyRate: 0.5,
      loggedDates,
      streak: currentStreak,
    }, 5);
  }, [weeklyData, goals, dayData, weightResult, profile, currentStreak]);

  const nextWeekFocus = useMemo(() => getNextWeekFocus(insights), [insights]);

  const handleShare = useCallback(() => {
    Alert.alert('Share', 'Weekly report sharing will use react-native-view-shot to capture and share as an image.');
  }, []);

  return (
    <ScreenWrapper>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <ReAnimated.View entering={FadeInDown.delay(0).springify().damping(12)} style={styles.header}>
          <Pressable style={styles.backButton} onPress={handleBack}>
            <ChevronLeft size={24} color={Colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Weekly Report</Text>
          <Pressable style={styles.shareButton} onPress={handleShare}>
            <Share2 size={20} color={Colors.primary} />
          </Pressable>
        </ReAnimated.View>

        {/* Grade Hero */}
        <ReAnimated.View entering={FadeInDown.delay(80).springify().damping(12)}>
          <View style={styles.gradeCard}>
            <LinearGradient
              colors={[report.gradeColor + '12', 'transparent']}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.gradeGlow}
            />
            <GradeRing grade={report.grade} gradeColor={report.gradeColor} score={report.complianceScore} />
            <Text style={styles.gradeLabel}>This Week's Grade</Text>

            {/* Highlights */}
            {report.highlights.length > 0 && (
              <View style={styles.highlightsContainer}>
                {report.highlights.slice(0, 3).map((h, i) => (
                  <View key={i} style={styles.highlightPill}>
                    <Award size={12} color={Colors.success} />
                    <Text style={styles.highlightText}>{h}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </ReAnimated.View>

        {/* Calories Section */}
        <ReAnimated.View entering={FadeInDown.delay(160).springify().damping(12)}>
          <Text style={styles.sectionTitle}>Calories</Text>
          <View style={styles.sectionCard}>
            <StatRow icon={Flame} iconColor={Colors.secondary} label="Daily Average" value={`${report.calorieStats.avg} kcal`} />
            <StatRow icon={TrendingDown} iconColor={Colors.success} label="Best Day (lowest)" value={`${report.calorieStats.best} kcal`} good={true} />
            <StatRow icon={TrendingUp} iconColor={Colors.error} label="Worst Day (highest)" value={`${report.calorieStats.worst} kcal`} good={false} />
            <StatRow icon={Target} iconColor={Colors.primary} label="Compliance" value={`${report.calorieStats.compliance}%`} good={report.calorieStats.compliance >= 70} />
          </View>
        </ReAnimated.View>

        {/* Macros Section */}
        <ReAnimated.View entering={FadeInDown.delay(240).springify().damping(12)}>
          <Text style={styles.sectionTitle}>Macros</Text>
          <View style={styles.sectionCard}>
            <MacroBar label="Protein" value={report.macroStats.avgProtein} target={report.macroStats.proteinTarget} color={Colors.protein} />
            <MacroBar label="Carbs" value={report.macroStats.avgCarbs} target={report.macroStats.carbsTarget} color={Colors.carbs} />
            <MacroBar label="Fat" value={report.macroStats.avgFat} target={report.macroStats.fatTarget} color={Colors.fat} />
          </View>
        </ReAnimated.View>

        {/* Exercise Section */}
        <ReAnimated.View entering={FadeInDown.delay(320).springify().damping(12)}>
          <Text style={styles.sectionTitle}>Exercise</Text>
          <View style={styles.sectionCard}>
            <StatRow icon={Dumbbell} iconColor={Colors.primary} label="Workouts Completed" value={`${report.exerciseStats.workoutsCompleted}`} good={report.exerciseStats.workoutsCompleted >= 3} />
            <StatRow icon={Zap} iconColor={Colors.warning} label="Total Duration" value={`${report.exerciseStats.totalDuration} min`} />
            <StatRow icon={Flame} iconColor={Colors.secondary} label="Calories Burned" value={`${report.exerciseStats.totalCalories} kcal`} />
          </View>
        </ReAnimated.View>

        {/* Weight Section */}
        <ReAnimated.View entering={FadeInDown.delay(400).springify().damping(12)}>
          <Text style={styles.sectionTitle}>Weight</Text>
          <View style={styles.sectionCard}>
            <StatRow
              icon={Scale}
              iconColor={report.weightChange <= 0 ? Colors.success : Colors.warning}
              label="Change This Week"
              value={`${report.weightChange > 0 ? '+' : ''}${report.weightChange} kg`}
              good={report.weightChange <= 0}
            />
          </View>
        </ReAnimated.View>

        {/* Top Insights */}
        {insights.length > 0 && (
          <ReAnimated.View entering={FadeInDown.delay(480).springify().damping(12)}>
            <Text style={styles.sectionTitle}>Key Insights</Text>
            {insights.slice(0, 3).map((insight, i) => (
              <InsightItem key={insight.id} insight={insight} delay={520 + i * 60} />
            ))}
          </ReAnimated.View>
        )}

        {/* Next Week Focus */}
        <ReAnimated.View entering={FadeInDown.delay(700).springify().damping(12)}>
          <View style={styles.focusCard}>
            <LinearGradient
              colors={['rgba(0, 212, 255, 0.10)', 'rgba(0, 212, 255, 0.02)']}
              style={styles.focusGradient}
            >
              <View style={styles.focusHeader}>
                <Lightbulb size={18} color={Colors.primary} />
                <Text style={styles.focusTitle}>Next Week Focus</Text>
              </View>
              {nextWeekFocus.map((item, i) => (
                <View key={i} style={styles.focusItem}>
                  <ArrowRight size={14} color={Colors.primary} />
                  <Text style={styles.focusText}>{item}</Text>
                </View>
              ))}
            </LinearGradient>
          </View>
        </ReAnimated.View>

        {/* Areas to Improve */}
        {report.areasToImprove.length > 0 && (
          <ReAnimated.View entering={FadeInDown.delay(780).springify().damping(12)}>
            <Text style={styles.sectionTitle}>Areas to Improve</Text>
            <View style={styles.sectionCard}>
              {report.areasToImprove.map((area, i) => (
                <View key={i} style={styles.improvementRow}>
                  <View style={styles.improvementDot} />
                  <Text style={styles.improvementText}>{area}</Text>
                </View>
              ))}
            </View>
          </ReAnimated.View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: Spacing.lg, paddingTop: Spacing.xs,
  },
  backButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.surfaceGlass, justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: {
    fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.text, letterSpacing: -0.3,
  },
  shareButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.surfaceGlass, justifyContent: 'center', alignItems: 'center',
  },

  // Grade Card
  gradeCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: BorderRadius.xl,
    padding: Spacing.xl, alignItems: 'center', overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)', marginBottom: Spacing.lg,
  },
  gradeGlow: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 120, borderRadius: BorderRadius.xl,
  },
  gradeRingContainer: {
    width: RING_SIZE, height: RING_SIZE, justifyContent: 'center', alignItems: 'center',
  },
  gradeOverlay: { position: 'absolute', alignItems: 'center' },
  gradeText: { fontSize: 42, fontWeight: FontWeight.black, letterSpacing: -1 },
  gradeScore: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: -2 },
  gradeLabel: {
    fontSize: FontSize.md, color: Colors.textSecondary, marginTop: Spacing.md, fontWeight: FontWeight.medium,
  },
  highlightsContainer: { marginTop: Spacing.md, gap: Spacing.xs, width: '100%' },
  highlightPill: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    backgroundColor: Colors.success + '12', paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2, borderRadius: BorderRadius.full, alignSelf: 'center',
  },
  highlightText: { fontSize: FontSize.sm, color: Colors.success, fontWeight: FontWeight.medium },

  // Section
  sectionTitle: {
    fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text,
    marginBottom: Spacing.sm, marginTop: Spacing.sm, letterSpacing: -0.3,
  },
  sectionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: BorderRadius.xl,
    padding: Spacing.lg, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: Spacing.md,
  },

  // Stat Row
  statRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  statIcon: {
    width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.sm,
  },
  statContent: { flex: 1 },
  statLabel: { fontSize: FontSize.sm, color: Colors.text, fontWeight: FontWeight.medium },
  statSub: { fontSize: FontSize.xs, color: Colors.textTertiary, marginTop: 1 },
  statValue: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.text },

  // Macro Bars
  macroBarRow: { marginBottom: Spacing.md },
  macroBarHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  macroBarLabel: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  macroBarValue: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.text },
  macroBarTarget: { color: Colors.textTertiary, fontWeight: FontWeight.regular },
  macroBarTrack: {
    height: 8, backgroundColor: 'rgba(255, 255, 255, 0.06)', borderRadius: 4, overflow: 'hidden',
  },
  macroBarFill: { height: 8, borderRadius: 4 },

  // Insights
  insightItem: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm,
    borderRadius: BorderRadius.lg, borderWidth: 1, padding: Spacing.md, marginBottom: Spacing.sm,
  },
  insightDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  insightContent: { flex: 1 },
  insightTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, marginBottom: 2 },
  insightDesc: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20 },

  // Focus Card
  focusCard: {
    borderRadius: BorderRadius.xl, overflow: 'hidden',
    borderWidth: 1, borderColor: Colors.primary + '25', marginTop: Spacing.sm, marginBottom: Spacing.md,
  },
  focusGradient: { padding: Spacing.lg },
  focusHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  focusTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.text },
  focusItem: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, marginBottom: Spacing.sm },
  focusText: { fontSize: FontSize.md, color: Colors.textSecondary, lineHeight: 22, flex: 1 },

  // Improvements
  improvementRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xs },
  improvementDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.warning },
  improvementText: { fontSize: FontSize.sm, color: Colors.textSecondary, flex: 1 },

  bottomSpacer: { height: 120 },
});

import React, { memo, useMemo, useState, useCallback } from 'react';
import ScreenErrorBoundary from '../../components/ScreenErrorBoundary';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Pressable,
  Alert,
} from 'react-native';
import { LineChart, BarChart } from 'react-native-gifted-charts';
import { useRouter } from 'expo-router';
import {
  TrendingDown,
  TrendingUp,
  Flame,
  Scale,
  Award,
  Target,
  Pill,
  ChevronRight,
  Download,
  Trophy,
  CalendarDays,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Timer,
  Apple,
  Activity,
  BarChart3,
  FileText,
  Crosshair,
  Dumbbell,
  Brain,
} from 'lucide-react-native';
import Svg, { Line as SvgLine, Rect as SvgRect, Circle as SvgCircle } from 'react-native-svg';
import ReAnimated, { FadeInDown } from 'react-native-reanimated';
import ScreenWrapper from '../../components/ScreenWrapper';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius, Glass, Gradients } from '../../constants/theme';
import { useMeals } from '../../context/MealContext';
import { useProfile } from '../../context/ProfileContext';
import { useGamification } from '../../context/GamificationContext';
import { exportFoodDiaryCSV, exportWeeklySummaryPDF } from '../../services/exportData';
import { hapticLight } from '../../lib/haptics';
import { LinearGradient } from 'expo-linear-gradient';
import usePredictiveAnalytics from '../../hooks/usePredictiveAnalytics';
import InsightCard from '../../components/InsightCard';
import AnimatedProgressRing from '../../components/AnimatedProgressRing';
import HabitHeatmap from '../../components/HabitHeatmap';
import {
  calculateEWMA,
  calculateAdherenceScore,
  analyzeMacroConsistency,
  calculateCorrelation,
  analyzeStreaks,
  calculateProgressRate,
} from '../../lib/analyticsEngine';
import { generateInsights } from '../../lib/insightGenerator';

// Safe hook imports - wrapped in try/catch for optional dependencies
let useWorkoutHistory = null;
try { useWorkoutHistory = require('../../hooks/useWorkoutHistory').default; } catch {}
let useWeightHistoryHook = null;
try { useWeightHistoryHook = require('../../hooks/useWeightHistory').useWeightHistory; } catch {}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - Spacing.md * 4;

const RANGE_OPTIONS = [
  { label: '7 Days', value: 7 },
  { label: '30 Days', value: 30 },
  { label: '90 Days', value: 90 },
];

// Mock weight data for demo when no history exists
const MOCK_WEIGHT_DATA = [
  { value: 75.5, label: 'Mon' },
  { value: 75.2, label: 'Tue' },
  { value: 74.8, label: 'Wed' },
  { value: 74.5, label: 'Thu' },
  { value: 74.9, label: 'Fri' },
  { value: 74.3, label: 'Sat' },
  { value: 74.0, label: 'Sun' },
];

const BigStatCard = memo(function BigStatCard({ icon: Icon, label, value, unit, trend, trendValue, color }) {
  const isPositiveTrend = trend === 'up';
  const TrendIcon = isPositiveTrend ? TrendingUp : TrendingDown;

  return (
    <View style={styles.bigStatCard}>
      <View style={[styles.bigStatIconContainer, { backgroundColor: color + '15' }]}>
        <Icon size={24} color={color} />
      </View>
      <Text style={styles.bigStatLabel}>{label}</Text>
      <View style={styles.bigStatValueRow}>
        <Text style={styles.bigStatValue}>{value}</Text>
        {unit && <Text style={styles.bigStatUnit}>{unit}</Text>}
      </View>
      {trendValue !== undefined && (
        <View style={[
          styles.trendBadge,
          { backgroundColor: isPositiveTrend ? Colors.success + '20' : Colors.error + '20' }
        ]}>
          <TrendIcon size={12} color={isPositiveTrend ? Colors.success : Colors.error} />
          <Text style={[
            styles.trendText,
            { color: isPositiveTrend ? Colors.success : Colors.error }
          ]}>
            {trendValue}
          </Text>
        </View>
      )}
    </View>
  );
});

const RangeSelector = memo(function RangeSelector({ selectedRange, onSelect }) {
  return (
    <View style={styles.rangeSelector}>
      {RANGE_OPTIONS.map((option) => (
        <Pressable
          key={option.value}
          style={[
            styles.rangeOption,
            selectedRange === option.value && styles.rangeOptionActive,
          ]}
          onPress={() => onSelect(option.value)}
        >
          <Text
            style={[
              styles.rangeOptionText,
              selectedRange === option.value && styles.rangeOptionTextActive,
            ]}
          >
            {option.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
});

// ─── Weekly Comparison Card ───
const WeeklyComparisonCard = memo(function WeeklyComparisonCard({ currentWeek, previousWeek, workoutsThisWeek, workoutsLastWeek }) {
  const items = [
    {
      label: 'Avg Calories',
      current: currentWeek.avgCalories,
      previous: previousWeek.avgCalories,
      unit: 'kcal',
      lowerIsBetter: true,
    },
    {
      label: 'Avg Protein',
      current: currentWeek.avgProtein,
      previous: previousWeek.avgProtein,
      unit: 'g',
      lowerIsBetter: false,
    },
    {
      label: 'Workouts',
      current: workoutsThisWeek,
      previous: workoutsLastWeek,
      unit: '',
      lowerIsBetter: false,
    },
  ];

  return (
    <View style={styles.weeklyCompCard}>
      <LinearGradient
        colors={[Colors.primary + '12', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.weeklyCompGradient}
      />
      <Text style={styles.weeklyCompTitle}>This Week vs Last Week</Text>
      <View style={styles.weeklyCompRow}>
        {items.map((item) => {
          const diff = item.current - item.previous;
          const improved = item.lowerIsBetter ? diff <= 0 : diff >= 0;
          const pctChange = item.previous > 0
            ? Math.round(Math.abs(diff / item.previous) * 100)
            : 0;
          return (
            <View key={item.label} style={styles.weeklyCompItem}>
              <Text style={styles.weeklyCompLabel}>{item.label}</Text>
              <Text style={styles.weeklyCompValue}>
                {item.current.toLocaleString()}{item.unit ? ` ${item.unit}` : ''}
              </Text>
              {item.previous > 0 && (
                <View style={[
                  styles.weeklyCompBadge,
                  { backgroundColor: improved ? Colors.success + '20' : Colors.error + '20' },
                ]}>
                  {improved ? (
                    <ArrowUpRight size={10} color={Colors.success} />
                  ) : (
                    <ArrowDownRight size={10} color={Colors.error} />
                  )}
                  <Text style={[
                    styles.weeklyCompBadgeText,
                    { color: improved ? Colors.success : Colors.error },
                  ]}>
                    {pctChange}%
                  </Text>
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
});

// ─── Consistency Score Card ───
const ConsistencyScoreCard = memo(function ConsistencyScoreCard({ loggedDays, totalDays, last14 }) {
  const percentage = totalDays > 0 ? Math.round((loggedDays / totalDays) * 100) : 0;

  return (
    <View style={styles.consistencyCard}>
      <View style={styles.consistencyHeader}>
        <View>
          <Text style={styles.consistencyTitle}>Consistency Score</Text>
          <Text style={styles.consistencySubtitle}>
            {loggedDays} of {totalDays} days logged this month
          </Text>
        </View>
        <View style={[
          styles.consistencyBadge,
          { backgroundColor: percentage >= 80 ? Colors.success + '20' : percentage >= 50 ? Colors.warning + '20' : Colors.error + '20' },
        ]}>
          <Text style={[
            styles.consistencyPercent,
            { color: percentage >= 80 ? Colors.success : percentage >= 50 ? Colors.warning : Colors.error },
          ]}>
            {percentage}%
          </Text>
        </View>
      </View>
      <View style={styles.calendarStrip}>
        {last14.map((day, i) => (
          <View key={i} style={styles.calendarDayCol}>
            <Text style={styles.calendarDayLabel}>{day.label}</Text>
            <View style={[
              styles.calendarDot,
              { backgroundColor: day.logged ? Colors.success : Colors.surfaceBright },
            ]} />
          </View>
        ))}
      </View>
    </View>
  );
});

// ─── Personal Bests Card ───
const PersonalBestsCard = memo(function PersonalBestsCard({ bests }) {
  const bestItems = [
    { label: 'Longest Streak', value: `${bests.longestStreak} days`, icon: Zap, color: Colors.warning },
    { label: 'Best Workout Cal', value: `${bests.maxWorkoutCalories} kcal`, icon: Flame, color: Colors.secondary },
    { label: 'Highest Protein Day', value: `${bests.highestProtein}g`, icon: Target, color: Colors.protein },
    { label: 'Most Consistent Wk', value: `${bests.mostConsistentWeek}/7`, icon: Trophy, color: Colors.gold },
  ];

  return (
    <View style={styles.personalBestsCard}>
      <View style={styles.personalBestsHeader}>
        <Trophy size={20} color={Colors.gold} />
        <Text style={styles.personalBestsTitle}>Personal Bests</Text>
      </View>
      <View style={styles.personalBestsGrid}>
        {bestItems.map((item) => (
          <View key={item.label} style={styles.personalBestItem}>
            <View style={[styles.personalBestIcon, { backgroundColor: item.color + '15' }]}>
              <item.icon size={16} color={item.color} />
            </View>
            <Text style={styles.personalBestValue}>{item.value}</Text>
            <Text style={styles.personalBestLabel}>{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
});

// ─── Macro Sparkline Row ───
const MacroSparklines = memo(function MacroSparklines({ weeklyData }) {
  const macros = [
    { key: 'protein', label: 'Protein', color: Colors.protein, unit: 'g' },
    { key: 'carbs', label: 'Carbs', color: Colors.carbs, unit: 'g' },
    { key: 'fat', label: 'Fat', color: Colors.fat, unit: 'g' },
  ];

  return (
    <View style={styles.sparklineRow}>
      {macros.map((macro) => {
        const data = weeklyData
          .filter(d => !d.noData)
          .map(d => ({ value: d[macro.key] || 0 }));

        if (data.length < 2) return null;

        const first = data[0]?.value || 0;
        const last = data[data.length - 1]?.value || 0;
        const trendUp = last >= first;
        const avg = data.length > 0
          ? Math.round(data.reduce((s, d) => s + d.value, 0) / data.length)
          : 0;

        return (
          <View key={macro.key} style={styles.sparklineCard}>
            <View style={styles.sparklineHeader}>
              <Text style={[styles.sparklineLabel, { color: macro.color }]}>{macro.label}</Text>
              {trendUp ? (
                <ArrowUpRight size={12} color={Colors.success} />
              ) : (
                <ArrowDownRight size={12} color={Colors.error} />
              )}
            </View>
            <View style={styles.sparklineChartWrap}>
              <LineChart
                data={data}
                width={SCREEN_WIDTH / 3 - Spacing.md * 2.5}
                height={40}
                spacing={(SCREEN_WIDTH / 3 - Spacing.md * 3) / Math.max(data.length - 1, 1)}
                initialSpacing={2}
                endSpacing={2}
                thickness={2}
                color={macro.color}
                hideDataPoints
                hideRules
                hideYAxisText
                hideAxesAndRules
                curved
                curvature={0.3}
                startFillColor={macro.color}
                endFillColor="transparent"
                startOpacity={0.2}
                endOpacity={0}
                areaChart
              />
            </View>
            <Text style={styles.sparklineAvg}>avg {avg}{macro.unit}</Text>
          </View>
        );
      })}
    </View>
  );
});

// ─── Quick Navigation Cards ───
const QuickNavGrid = memo(function QuickNavGrid({ router }) {
  const navItems = [
    { emoji: '\uD83D\uDCCA', title: 'Weekly Report', route: '/weekly-report' },
    { emoji: '\u2696\uFE0F', title: 'Weight Tracker', route: '/weight-log' },
    { emoji: '\u23F3', title: 'Fasting Insights', route: '/fasting-analytics' },
    { emoji: '\uD83E\uDD57', title: 'Nutrition Score', route: '/nutrition-insights' },
    { emoji: '\uD83D\uDCC5', title: 'Activity Calendar', route: '/activity-calendar' },
    { emoji: '\uD83D\uDE34', title: 'Mood Insights', route: '/mood-insights' },
  ];

  return (
    <View style={styles.quickNavGrid}>
      {navItems.map((item) => (
        <Pressable
          key={item.route}
          style={styles.quickNavCard}
          onPress={() => {
            hapticLight();
            router.push(item.route);
          }}
        >
          <View style={styles.quickNavLeft}>
            <Text style={styles.quickNavEmoji}>{item.emoji}</Text>
            <Text style={styles.quickNavTitle}>{item.title}</Text>
          </View>
          <ChevronRight size={16} color={Colors.textTertiary} />
        </Pressable>
      ))}
    </View>
  );
});

// ─── Daily Average Card ───
const DailyAverageCard = memo(function DailyAverageCard({ avgCalories, avgProtein, avgCarbs, avgFat, goals }) {
  const items = [
    { label: 'Calories', value: avgCalories, goal: goals.calories, unit: 'kcal', color: Colors.primary },
    { label: 'Protein', value: avgProtein, goal: goals.protein, unit: 'g', color: Colors.protein },
    { label: 'Carbs', value: avgCarbs, goal: goals.carbs, unit: 'g', color: Colors.carbs },
    { label: 'Fat', value: avgFat, goal: goals.fat, unit: 'g', color: Colors.fat },
  ];

  return (
    <View style={styles.dailyAvgCard}>
      <Text style={styles.dailyAvgTitle}>Daily Averages This Week</Text>
      {items.map((item) => {
        const pct = item.goal > 0 ? Math.min(item.value / item.goal, 1) : 0;
        return (
          <View key={item.label} style={styles.dailyAvgRow}>
            <View style={styles.dailyAvgLabelRow}>
              <Text style={styles.dailyAvgLabel}>{item.label}</Text>
              <Text style={styles.dailyAvgValues}>
                {item.value}{item.unit} <Text style={styles.dailyAvgGoal}>/ {item.goal}{item.unit}</Text>
              </Text>
            </View>
            <View style={styles.dailyAvgBarBg}>
              <View style={[styles.dailyAvgBarFill, { width: `${pct * 100}%`, backgroundColor: item.color }]} />
            </View>
          </View>
        );
      })}
    </View>
  );
});

function StatsScreenInner() {
  const router = useRouter();
  const { weeklyData, weeklyStats, goals, isLoading, getCalorieDataForRange, dayData } = useMeals();
  const { weeklyWeightData, profile } = useProfile();
  const { currentStreak, stats: gamificationStats } = useGamification();
  const { weightTrend, plateauStatus, todayNutritionScore, fitnessScore, weeklyInsights } = usePredictiveAnalytics();

  const [selectedRange, setSelectedRange] = useState(7);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPress = useCallback(() => {
    Alert.alert(
      'Export Data',
      'Choose an export format',
      [
        {
          text: 'Export CSV',
          onPress: async () => {
            try {
              setIsExporting(true);
              const end = new Date();
              const start = new Date();
              start.setDate(start.getDate() - 30);
              await exportFoodDiaryCSV(dayData, { start, end });
            } catch (error) {
              Alert.alert('Export Failed', 'Could not export your food diary. Please try again.');
            } finally {
              setIsExporting(false);
            }
          },
        },
        {
          text: 'Export PDF Report',
          onPress: async () => {
            try {
              setIsExporting(true);
              await exportWeeklySummaryPDF(
                {
                  dailyData: weeklyData,
                  stats: weeklyStats,
                  streak: currentStreak,
                  goals,
                },
                profile
              );
            } catch (error) {
              Alert.alert('Export Failed', 'Could not generate your report. Please try again.');
            } finally {
              setIsExporting(false);
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }, [dayData, weeklyData, weeklyStats, currentStreak, goals, profile]);

  // Get calorie data for the selected range
  const rangeData = useMemo(() => {
    if (selectedRange === 7) return weeklyData;
    return getCalorieDataForRange(selectedRange);
  }, [selectedRange, weeklyData, getCalorieDataForRange]);

  const rangeStats = useMemo(() => {
    const daysWithData = rangeData.filter((d) => !d.noData && d.calories > 0);
    if (daysWithData.length === 0) {
      return { totalCalories: 0, avgCalories: 0, daysUnderGoal: 0, daysOverGoal: 0, daysOnTrack: 0, caloriesVsBudget: 0, daysTracked: 0 };
    }
    const totalCalories = daysWithData.reduce((s, d) => s + d.calories, 0);
    const totalGoal = daysWithData.reduce((s, d) => s + d.goal, 0);
    const daysUnderGoal = daysWithData.filter((d) => d.calories <= d.goal).length;
    return {
      totalCalories,
      avgCalories: Math.round(totalCalories / daysWithData.length),
      daysUnderGoal,
      daysOverGoal: daysWithData.filter((d) => d.calories > d.goal).length,
      daysOnTrack: daysUnderGoal,
      caloriesVsBudget: totalGoal - totalCalories,
      daysTracked: daysWithData.length,
    };
  }, [rangeData]);

  // Calculate weight chart data
  const weightChartData = useMemo(() => {
    const hasRealData = weeklyWeightData && weeklyWeightData.some(d => d.weight !== null);

    if (hasRealData) {
      return {
        data: weeklyWeightData.map(d => ({
          value: d.weight || profile?.weight || 70,
          label: d.day,
          dataPointText: d.weight ? `${d.weight}` : '',
        })),
        isReal: true,
      };
    }

    return {
      data: MOCK_WEIGHT_DATA,
      isReal: false,
    };
  }, [weeklyWeightData, profile?.weight]);

  // Calculate calorie bar chart data for selected range
  const calorieChartData = useMemo(() => {
    if (!rangeData || rangeData.length === 0) {
      return {
        data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => ({
          value: 0, label: day, frontColor: Colors.surfaceElevated,
        })),
        maxValue: 2500,
      };
    }

    const goal = goals?.calories || 2000;
    const maxCal = Math.max(...rangeData.map(d => d.calories), goal);

    // For 30/90 day ranges, only show labels every N days
    const showEveryN = selectedRange <= 7 ? 1 : selectedRange <= 30 ? 5 : 15;

    return {
      data: rangeData.map((d, i) => ({
        value: d.calories,
        label: i % showEveryN === 0 ? d.day : '',
        frontColor: d.calories > goal ? Colors.error : Colors.success,
        topLabelComponent: () => (
          selectedRange <= 7 && d.calories > 0 ? (
            <Text style={styles.barTopLabel}>{d.calories}</Text>
          ) : null
        ),
      })),
      maxValue: Math.ceil(maxCal / 500) * 500 + 500,
      goal,
    };
  }, [rangeData, goals?.calories, selectedRange]);

  // Summary stats
  const summaryStats = useMemo(() => {
    const validDays = rangeData?.filter(d => d.calories > 0) || [];
    const avgCalories = validDays.length > 0
      ? Math.round(validDays.reduce((sum, d) => sum + d.calories, 0) / validDays.length)
      : 0;

    let weightChange = 0;
    let weightTrend = 'down';
    if (weightChartData.isReal && weightChartData.data.length >= 2) {
      const firstWeight = weightChartData.data[0].value;
      const lastWeight = weightChartData.data[weightChartData.data.length - 1].value;
      weightChange = parseFloat((lastWeight - firstWeight).toFixed(1));
      weightTrend = weightChange <= 0 ? 'down' : 'up';
    }

    const bestStreak = gamificationStats?.bestStreak || currentStreak;

    return {
      avgCalories,
      weightChange: Math.abs(weightChange),
      weightTrend,
      weightChangeSign: weightChange <= 0 ? '-' : '+',
      bestStreak,
    };
  }, [rangeData, weightChartData, currentStreak, gamificationStats]);

  // Weight min/max for chart scaling
  const weightRange = useMemo(() => {
    const weights = weightChartData.data.map(d => d.value);
    const min = Math.min(...weights);
    const max = Math.max(...weights);
    const padding = (max - min) * 0.2 || 2;
    return {
      min: Math.floor(min - padding),
      max: Math.ceil(max + padding),
    };
  }, [weightChartData]);

  // --- MISSION 3: Weight vs Calories dual-axis data ---
  const weightVsCaloriesData = useMemo(() => {
    if (!weightChartData.isReal) return null;

    const validDays = weeklyData.filter(d => d.calories > 0);
    if (validDays.length < 2) return null;

    // Build calorie line data aligned to weight data days (O(n) via Map)
    const calByDay = new Map(weeklyData.map(cd => [cd.day, cd]));
    const calorieLineData = weightChartData.data.map((wd) => {
      const matchingCalDay = calByDay.get(wd.label);
      return {
        value: matchingCalDay ? matchingCalDay.calories : 0,
        label: wd.label,
      };
    });

    const calValues = calorieLineData.map(d => d.value).filter(v => v > 0);
    if (calValues.length < 2) return null;

    const calMin = Math.min(...calValues);
    const calMax = Math.max(...calValues);

    return {
      calorieData: calorieLineData,
      calMin: Math.floor(calMin / 100) * 100,
      calMax: Math.ceil(calMax / 100) * 100 + 200,
    };
  }, [weightChartData, weeklyData]);

  // Dynamic bar width based on range
  const barWidth = selectedRange <= 7 ? 28 : selectedRange <= 30 ? 8 : 4;
  const barSpacing = selectedRange <= 7 ? CHART_WIDTH / 10 : selectedRange <= 30 ? 4 : 2;

  // ─── Load optional hook data ───
  const workoutHookResult = useWorkoutHistory ? useWorkoutHistory() : null;
  const workoutData = workoutHookResult || { workouts: [], isLoading: false };

  const weightHistoryResult = useWeightHistoryHook ? useWeightHistoryHook() : null;

  // ─── Weekly Report Card (adherence scoring) ───
  const adherenceData = useMemo(() => {
    const valid = weeklyData.filter(d => !d.noData);
    const adData = valid.map(d => ({
      calories: d.calories || 0,
      protein: d.protein || 0,
      goal: d.goal || goals?.calories || 2000,
      proteinGoal: goals?.protein || 150,
    }));
    return calculateAdherenceScore(adData, 7);
  }, [weeklyData, goals]);

  // ─── Goal Progress Tracker ───
  const goalProgress = useMemo(() => {
    if (!profile?.weight || !profile?.goalWeight) return null;
    const entries = weightHistoryResult?.entries || [];
    if (entries.length < 3) return null;

    const sorted = [...entries].sort((a, b) => new Date(a.date) - new Date(b.date));
    const startWeight = sorted[0]?.weight || profile.weight;
    const expectedRate = profile.weeklyGoal === 'lose2' ? 2 : profile.weeklyGoal === 'lose1' ? 1 :
      profile.weeklyGoal === 'lose05' ? 0.5 : profile.weeklyGoal === 'gain1' ? 1 :
      profile.weeklyGoal === 'gain05' ? 0.5 : 0.5;

    return calculateProgressRate(
      profile.weight, profile.goalWeight, startWeight, expectedRate,
      sorted.map(e => ({ date: e.date, weight: e.weight }))
    );
  }, [profile, weightHistoryResult]);

  // ─── EWMA Weight Trend ───
  const ewmaData = useMemo(() => {
    const entries = weightHistoryResult?.entries || [];
    if (entries.length < 5) return null;

    const sorted = [...entries].sort((a, b) => new Date(a.date) - new Date(b.date));
    const weights = sorted.map(e => e.weight);
    const dates = sorted.map(e => e.date);
    const ewma = calculateEWMA(weights, 7, 1.5);

    return {
      ...ewma,
      raw: weights,
      dates,
      labels: dates.map(d => {
        const dt = new Date(d);
        return `${dt.getMonth() + 1}/${dt.getDate()}`;
      }),
    };
  }, [weightHistoryResult]);

  // ─── Macro Consistency ───
  const macroConsistency = useMemo(() => {
    const valid = weeklyData.filter(d => !d.noData && d.calories > 0);
    if (valid.length < 3) return null;
    return analyzeMacroConsistency(valid.map(d => ({
      calories: d.calories || 0,
      protein: d.protein || 0,
      carbs: d.carbs || 0,
      fat: d.fat || 0,
    })));
  }, [weeklyData]);

  // ─── Correlation Insights ───
  const correlationInsights = useMemo(() => {
    const results = [];
    const entries = weightHistoryResult?.entries || [];
    if (entries.length >= 7) {
      // Calorie vs weight change correlation
      const sorted = [...entries].sort((a, b) => new Date(a.date) - new Date(b.date));
      const weightChanges = [];
      for (let i = 1; i < sorted.length; i++) {
        weightChanges.push(sorted[i].weight - sorted[i - 1].weight);
      }
      const calValid = weeklyData.filter(d => !d.noData && d.calories > 0);
      const cals = calValid.map(d => d.calories);
      const minLen = Math.min(cals.length, weightChanges.length);
      if (minLen >= 5) {
        const corr = calculateCorrelation(
          cals.slice(-minLen), weightChanges.slice(-minLen),
          'calorie intake', 'weight change'
        );
        if (corr && corr.strength !== 'none') {
          results.push(corr);
        }
      }
    }
    return results;
  }, [weightHistoryResult, weeklyData]);

  // ─── Deep Insights from insightGenerator ───
  const deepInsights = useMemo(() => {
    const dailyDataForInsights = [];
    if (dayData) {
      const allDates = Object.keys(dayData).sort().slice(-30);
      for (const date of allDates) {
        const d = dayData[date];
        if (d?.totals) {
          dailyDataForInsights.push({
            date,
            calories: d.totals.calories || 0,
            protein: d.totals.protein || 0,
            carbs: d.totals.carbs || 0,
            fat: d.totals.fat || 0,
            goal: goals?.calories || 2000,
            proteinGoal: goals?.protein || 150,
          });
        }
      }
    }

    if (dailyDataForInsights.length < 5) return [];

    const loggedDates = dayData
      ? Object.keys(dayData).filter(k => dayData[k]?.totals?.calories > 0)
      : [];

    const weightHistory = (weightHistoryResult?.entries || []).map(e => ({
      date: e.date, weight: e.weight,
    }));

    return generateInsights({
      dailyData: dailyDataForInsights,
      weightHistory,
      currentWeight: profile?.weight,
      goalWeight: profile?.goalWeight,
      startWeight: profile?.weight,
      expectedWeeklyRate: 0.5,
      loggedDates,
      streak: currentStreak,
    }, 6);
  }, [dayData, goals, weightHistoryResult, profile, currentStreak]);

  // ─── Weekly Comparison Data ───
  const weeklyComparisonData = useMemo(() => {
    const prevWeekData = typeof getCalorieDataForRange === 'function'
      ? getCalorieDataForRange(14).slice(0, 7)
      : [];

    const curValid = weeklyData.filter(d => !d.noData && d.calories > 0);
    const prevValid = prevWeekData.filter(d => !d.noData && d.calories > 0);

    const currentWeek = {
      avgCalories: curValid.length > 0 ? Math.round(curValid.reduce((s, d) => s + d.calories, 0) / curValid.length) : 0,
      avgProtein: curValid.length > 0 ? Math.round(curValid.reduce((s, d) => s + (d.protein || 0), 0) / curValid.length) : 0,
    };
    const previousWeek = {
      avgCalories: prevValid.length > 0 ? Math.round(prevValid.reduce((s, d) => s + d.calories, 0) / prevValid.length) : 0,
      avgProtein: prevValid.length > 0 ? Math.round(prevValid.reduce((s, d) => s + (d.protein || 0), 0) / prevValid.length) : 0,
    };

    // Count workouts per week
    const now = new Date();
    const oneWeekAgo = new Date(now); oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const twoWeeksAgo = new Date(now); twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const allWorkouts = workoutData.workouts || [];
    const workoutsThisWeek = allWorkouts.filter(w => new Date(w.date) >= oneWeekAgo).length;
    const workoutsLastWeek = allWorkouts.filter(w => {
      const d = new Date(w.date);
      return d >= twoWeeksAgo && d < oneWeekAgo;
    }).length;

    return { currentWeek, previousWeek, workoutsThisWeek, workoutsLastWeek };
  }, [weeklyData, getCalorieDataForRange, workoutData.workouts]);

  // ─── Consistency Score Data ───
  const consistencyData = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const dayOfMonth = now.getDate();

    let loggedDays = 0;
    for (let i = 1; i <= dayOfMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const data = dayData?.[dateStr];
      if (data && data.totals && data.totals.calories > 0) {
        loggedDays++;
      }
    }

    // Last 14 days strip
    const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const last14 = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const data = dayData?.[dateStr];
      last14.push({
        label: dayLabels[d.getDay()],
        logged: !!(data && data.totals && data.totals.calories > 0),
      });
    }

    return { loggedDays, totalDays: dayOfMonth, last14 };
  }, [dayData]);

  // ─── Personal Bests Data ───
  const personalBests = useMemo(() => {
    const longestStreak = gamificationStats?.bestStreak || currentStreak || 0;

    // Max workout calories
    const allWorkouts = workoutData.workouts || [];
    const maxWorkoutCalories = allWorkouts.length > 0
      ? Math.max(...allWorkouts.map(w => w.calories || 0))
      : 0;

    // Highest protein day from dayData
    let highestProtein = 0;
    if (dayData) {
      Object.values(dayData).forEach(d => {
        if (d?.totals?.protein > highestProtein) {
          highestProtein = Math.round(d.totals.protein);
        }
      });
    }

    // Most consistent week: sliding window O(n) instead of O(7n)
    let mostConsistentWeek = 0;
    if (dayData) {
      const allDates = Object.keys(dayData).sort();
      const logged = allDates.map(d => (dayData[d]?.totals?.calories > 0) ? 1 : 0);
      if (allDates.length >= 7) {
        let count = 0;
        for (let j = 0; j < 7; j++) count += logged[j];
        mostConsistentWeek = count;
        for (let i = 7; i < allDates.length; i++) {
          count += logged[i] - logged[i - 7];
          if (count > mostConsistentWeek) mostConsistentWeek = count;
        }
      } else {
        mostConsistentWeek = logged.reduce((s, v) => s + v, 0);
      }
    }
    // Also count current week
    const curWeekLogged = weeklyData.filter(d => !d.noData && d.calories > 0).length;
    if (curWeekLogged > mostConsistentWeek) mostConsistentWeek = curWeekLogged;

    return { longestStreak, maxWorkoutCalories, highestProtein, mostConsistentWeek };
  }, [gamificationStats, currentStreak, workoutData.workouts, dayData, weeklyData]);

  // ─── Daily Averages Data ───
  const dailyAverages = useMemo(() => {
    const validDays = weeklyData.filter(d => !d.noData && d.calories > 0);
    if (validDays.length === 0) return { avgCalories: 0, avgProtein: 0, avgCarbs: 0, avgFat: 0 };
    return {
      avgCalories: Math.round(validDays.reduce((s, d) => s + d.calories, 0) / validDays.length),
      avgProtein: Math.round(validDays.reduce((s, d) => s + (d.protein || 0), 0) / validDays.length),
      avgCarbs: Math.round(validDays.reduce((s, d) => s + (d.carbs || 0), 0) / validDays.length),
      avgFat: Math.round(validDays.reduce((s, d) => s + (d.fat || 0), 0) / validDays.length),
    };
  }, [weeklyData]);

  if (isLoading) {
    return (
      <ScreenWrapper>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading your stats...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper testID="stats-screen">
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <ReAnimated.View entering={FadeInDown.delay(0).springify().mass(0.5).damping(10)} style={styles.header}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Stats</Text>
            <Pressable
              onPress={handleExportPress}
              disabled={isExporting}
              style={styles.exportButton}
            >
              {isExporting ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <Download size={20} color={Colors.primary} />
              )}
            </Pressable>
          </View>
          <Text style={styles.subtitle}>Know if you're winning or losing</Text>
        </ReAnimated.View>

        {/* Range Selector */}
        <ReAnimated.View entering={FadeInDown.delay(80).springify().mass(0.5).damping(10)}>
          <RangeSelector selectedRange={selectedRange} onSelect={setSelectedRange} />
        </ReAnimated.View>

        {/* Empty State - shown when fewer than 3 days tracked */}
        {rangeStats.daysTracked < 3 && (
          <ReAnimated.View entering={FadeInDown.delay(120).springify().mass(0.5).damping(10)}>
            <View style={{ alignItems: 'center', paddingVertical: Spacing.xl, paddingHorizontal: Spacing.lg }}>
              <Text style={{ fontSize: FontSize.lg, color: Colors.textSecondary, fontWeight: FontWeight.semibold, marginBottom: Spacing.sm }}>
                Building your insights...
              </Text>
              <Text style={{ fontSize: FontSize.sm, color: Colors.textTertiary, textAlign: 'center' }}>
                Log food for a few more days to unlock trend analysis and personalized insights.
              </Text>
            </View>
          </ReAnimated.View>
        )}

        {/* Fitness & Nutrition Scores */}
        <ReAnimated.View entering={FadeInDown.delay(140).springify().mass(0.5).damping(10)} style={styles.scoreRingRow}>
          <View style={styles.scoreRingCard}>
            <AnimatedProgressRing
              progress={fitnessScore?.score || 0}
              size={80}
              strokeWidth={8}
              color={fitnessScore?.score >= 70 ? Colors.success : fitnessScore?.score >= 40 ? Colors.warning : Colors.error}
            />
            <Text style={styles.scoreRingLabel}>Fitness Score</Text>
            <Text style={styles.scoreRingValue}>{fitnessScore?.score || 0}/100</Text>
          </View>
          <View style={styles.scoreRingCard}>
            <AnimatedProgressRing
              progress={todayNutritionScore?.score || 0}
              size={80}
              strokeWidth={8}
              color={todayNutritionScore?.score >= 70 ? Colors.success : todayNutritionScore?.score >= 40 ? Colors.warning : Colors.error}
            />
            <Text style={styles.scoreRingLabel}>Nutrition Score</Text>
            <Text style={styles.scoreRingValue}>{todayNutritionScore?.score || 0}/100</Text>
          </View>
        </ReAnimated.View>

        {/* Big Summary Stats */}
        <ReAnimated.View entering={FadeInDown.delay(160).springify().mass(0.5).damping(10)} style={styles.summaryRow}>
          <BigStatCard
            icon={Flame}
            label="Avg Calories"
            value={summaryStats.avgCalories.toLocaleString()}
            unit="kcal"
            color={Colors.primary}
          />
          <BigStatCard
            icon={Scale}
            label="Weight Change"
            value={`${summaryStats.weightChangeSign}${summaryStats.weightChange}`}
            unit="kg"
            trend={summaryStats.weightTrend}
            trendValue={summaryStats.weightTrend === 'down' ? 'Losing' : 'Gaining'}
            color={summaryStats.weightTrend === 'down' ? Colors.success : Colors.warning}
          />
          <BigStatCard
            icon={Award}
            label="Best Streak"
            value={summaryStats.bestStreak}
            unit="days"
            color={Colors.warning}
          />
        </ReAnimated.View>

        {/* Weight vs Calories Chart (MISSION 3 - dual-axis) */}
        {weightVsCaloriesData && (
          <View style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <View style={styles.chartTitleRow}>
                <View style={[styles.chartIcon, { backgroundColor: Colors.primary + '20' }]}>
                  <TrendingDown size={18} color={Colors.primary} />
                </View>
                <View>
                  <Text style={styles.chartTitle}>Weight vs Calories</Text>
                  <Text style={styles.chartSubtitle}>See the correlation</Text>
                </View>
              </View>
            </View>

            <View style={styles.chartContainer}>
              <LineChart
                data={weightChartData.data}
                data2={weightVsCaloriesData.calorieData}
                width={CHART_WIDTH}
                height={180}
                spacing={CHART_WIDTH / 8}
                initialSpacing={20}
                endSpacing={20}
                thickness={3}
                thickness2={2}
                color={Colors.success}
                color2={Colors.primary}
                dataPointsColor={Colors.success}
                dataPointsColor2={Colors.primary}
                dataPointsRadius={5}
                dataPointsRadius2={4}
                curved
                curvature={0.2}
                hideRules
                yAxisColor="transparent"
                xAxisColor={Colors.border}
                yAxisTextStyle={styles.axisText}
                xAxisLabelTextStyle={styles.axisText}
                noOfSections={4}
                maxValue={weightRange.max}
                yAxisOffset={weightRange.min}
                secondaryYAxis={{
                  maxValue: weightVsCaloriesData.calMax,
                  noOfSections: 4,
                  yAxisColor: 'transparent',
                  yAxisTextStyle: { ...styles.axisText, color: Colors.primary },
                }}
              />
            </View>

            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: Colors.success }]} />
                <Text style={styles.legendText}>Weight (kg)</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: Colors.primary }]} />
                <Text style={styles.legendText}>Calories</Text>
              </View>
            </View>
          </View>
        )}

        {/* Weight Trend Chart */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <View style={styles.chartTitleRow}>
              <View style={[styles.chartIcon, { backgroundColor: Colors.success + '20' }]}>
                <Scale size={18} color={Colors.success} />
              </View>
              <View>
                <Text style={styles.chartTitle}>Weight Trend</Text>
                <Text style={styles.chartSubtitle}>Last 7 entries</Text>
              </View>
            </View>
            {!weightChartData.isReal && (
              <View style={styles.demoBadge}>
                <Text style={styles.demoBadgeText}>Demo</Text>
              </View>
            )}
          </View>

          <View style={styles.chartContainer}>
            <LineChart
              data={weightChartData.data}
              width={CHART_WIDTH}
              height={180}
              spacing={CHART_WIDTH / 8}
              initialSpacing={20}
              endSpacing={20}
              thickness={3}
              color={Colors.success}
              dataPointsColor={Colors.success}
              dataPointsRadius={5}
              curved
              curvature={0.2}
              startFillColor={Colors.success}
              endFillColor={Colors.surface}
              startOpacity={0.3}
              endOpacity={0.05}
              areaChart
              hideRules
              yAxisColor="transparent"
              xAxisColor={Colors.border}
              yAxisTextStyle={styles.axisText}
              xAxisLabelTextStyle={styles.axisText}
              noOfSections={4}
              maxValue={weightRange.max}
              yAxisOffset={weightRange.min}
              pointerConfig={{
                pointerStripUptoDataPoint: true,
                pointerStripColor: Colors.textTertiary,
                pointerStripWidth: 1,
                pointerColor: Colors.success,
                radius: 6,
                pointerLabelWidth: 80,
                pointerLabelHeight: 30,
                activatePointersOnLongPress: true,
                autoAdjustPointerLabelPosition: true,
                pointerLabelComponent: (items) => (
                  <View style={styles.tooltipContainer}>
                    <Text style={styles.tooltipText}>{items[0].value} kg</Text>
                  </View>
                ),
              }}
            />
          </View>

          {weightChartData.isReal && profile?.weight && (
            <View style={styles.chartFooter}>
              <Text style={styles.currentWeightText}>
                Current: <Text style={styles.currentWeightValue}>{profile.weight} kg</Text>
              </Text>
            </View>
          )}
        </View>

        {plateauStatus?.isPlateau && (
          <ReAnimated.View entering={FadeInDown.delay(350).springify().mass(0.5).damping(10)}>
            <InsightCard
              type="warning"
              title="Weight Plateau Detected"
              body={plateauStatus.suggestion || "Your weight has been stable. Consider adjusting your calorie intake or exercise routine."}
              actionLabel="Get Tips"
              onAction={() => router.push('/chat')}
            />
          </ReAnimated.View>
        )}

        {/* Calorie Intake Chart */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <View style={styles.chartTitleRow}>
              <View style={[styles.chartIcon, { backgroundColor: Colors.primary + '20' }]}>
                <Target size={18} color={Colors.primary} />
              </View>
              <View>
                <Text style={styles.chartTitle}>Calorie Intake</Text>
                <Text style={styles.chartSubtitle}>
                  Last {selectedRange} days vs goal
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.chartContainer}>
            <BarChart
              data={calorieChartData.data}
              width={CHART_WIDTH}
              height={180}
              barWidth={barWidth}
              spacing={barSpacing}
              initialSpacing={25}
              endSpacing={15}
              barBorderRadius={selectedRange <= 7 ? 6 : 3}
              noOfSections={4}
              maxValue={calorieChartData.maxValue}
              yAxisColor="transparent"
              xAxisColor={Colors.border}
              yAxisTextStyle={styles.axisText}
              xAxisLabelTextStyle={styles.axisText}
              hideRules
              showReferenceLine1
              referenceLine1Position={calorieChartData.goal}
              referenceLine1Config={{
                color: Colors.textTertiary,
                dashWidth: 5,
                dashGap: 3,
                thickness: 1.5,
                labelText: `Goal: ${calorieChartData.goal}`,
                labelTextStyle: styles.referenceLineLabel,
              }}
              isAnimated
              animationDuration={800}
            />
          </View>

          {/* Legend */}
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: Colors.success }]} />
              <Text style={styles.legendText}>Under goal</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: Colors.error }]} />
              <Text style={styles.legendText}>Over goal</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDash]} />
              <Text style={styles.legendText}>Daily goal</Text>
            </View>
          </View>
        </View>

        {/* Scorecard */}
        <View style={styles.weeklySummaryCard}>
          <Text style={styles.weeklySummaryTitle}>
            {selectedRange === 7 ? "This Week's" : `Last ${selectedRange} Days`} Scorecard
          </Text>
          <View style={styles.scoreRow}>
            <View style={styles.scoreItem}>
              <Text style={[styles.scoreValue, { color: Colors.success }]}>
                {rangeStats.daysUnderGoal || 0}
              </Text>
              <Text style={styles.scoreLabel}>Days On Track</Text>
            </View>
            <View style={styles.scoreDivider} />
            <View style={styles.scoreItem}>
              <Text style={[styles.scoreValue, { color: Colors.error }]}>
                {rangeStats.daysOverGoal || 0}
              </Text>
              <Text style={styles.scoreLabel}>Days Over</Text>
            </View>
            <View style={styles.scoreDivider} />
            <View style={styles.scoreItem}>
              <Text style={[
                styles.scoreValue,
                { color: (rangeStats.caloriesVsBudget || 0) >= 0 ? Colors.success : Colors.error }
              ]}>
                {(rangeStats.caloriesVsBudget || 0) >= 0 ? '+' : ''}
                {Math.abs(rangeStats.caloriesVsBudget || 0).toLocaleString()}
              </Text>
              <Text style={styles.scoreLabel}>Cal vs Budget</Text>
            </View>
          </View>

          {/* Verdict */}
          <View style={[
            styles.verdictBadge,
            {
              backgroundColor: (rangeStats.daysUnderGoal || 0) >= Math.ceil(selectedRange * 0.6)
                ? Colors.success + '20'
                : Colors.warning + '20'
            }
          ]}>
            <Text style={[
              styles.verdictText,
              {
                color: (rangeStats.daysUnderGoal || 0) >= Math.ceil(selectedRange * 0.6)
                  ? Colors.success
                  : Colors.warning
              }
            ]}>
              {(rangeStats.daysUnderGoal || 0) >= Math.ceil(selectedRange * 0.7)
                ? "You're crushing it!"
                : (rangeStats.daysUnderGoal || 0) >= Math.ceil(selectedRange * 0.5)
                  ? "Solid progress!"
                  : (rangeStats.daysUnderGoal || 0) >= Math.ceil(selectedRange * 0.3)
                    ? "Room for improvement"
                    : "Let's get back on track"}
            </Text>
          </View>
        </View>

        {/* Micronutrient Dashboard Link */}
        <ReAnimated.View entering={FadeInDown.delay(400).springify().mass(0.5).damping(10)}>
          <Pressable
            style={styles.micronutrientButton}
            onPress={() => router.push('/micronutrients')}
          >
            <View style={styles.micronutrientLeft}>
              <View style={[styles.micronutrientIcon, { backgroundColor: Colors.accentPurple + '20' }]}>
                <Pill size={18} color={Colors.accentPurple} />
              </View>
              <View>
                <Text style={styles.micronutrientTitle}>Micronutrient Dashboard</Text>
                <Text style={styles.micronutrientSubtitle}>Vitamins, minerals & more</Text>
              </View>
            </View>
            <ChevronRight size={18} color={Colors.textTertiary} />
          </Pressable>
        </ReAnimated.View>

        {/* ─── Weekly Comparison ─── */}
        <ReAnimated.View entering={FadeInDown.delay(440).springify().mass(0.5).damping(10)}>
          <WeeklyComparisonCard
            currentWeek={weeklyComparisonData.currentWeek}
            previousWeek={weeklyComparisonData.previousWeek}
            workoutsThisWeek={weeklyComparisonData.workoutsThisWeek}
            workoutsLastWeek={weeklyComparisonData.workoutsLastWeek}
          />
        </ReAnimated.View>

        {/* AI-Powered Insights */}
        {weeklyInsights && weeklyInsights.length > 0 && (
          <ReAnimated.View entering={FadeInDown.delay(490).springify().mass(0.5).damping(10)}>
            <Text style={styles.sectionHeading}>AI Insights</Text>
            {weeklyInsights.slice(0, 3).map((insight, i) => (
              <InsightCard
                key={i}
                type={insight.type === 'positive' ? 'success' : insight.type === 'warning' ? 'warning' : 'tip'}
                emoji={insight.emoji}
                title={insight.title}
                body={insight.body}
              />
            ))}
          </ReAnimated.View>
        )}

        {/* ─── Consistency Score ─── */}
        <ReAnimated.View entering={FadeInDown.delay(480).springify().mass(0.5).damping(10)}>
          <ConsistencyScoreCard
            loggedDays={consistencyData.loggedDays}
            totalDays={consistencyData.totalDays}
            last14={consistencyData.last14}
          />
        </ReAnimated.View>

        {/* ─── Personal Bests ─── */}
        <ReAnimated.View entering={FadeInDown.delay(520).springify().mass(0.5).damping(10)}>
          <PersonalBestsCard bests={personalBests} />
        </ReAnimated.View>

        {/* ─── Macro Sparklines ─── */}
        {weeklyData.filter(d => !d.noData && d.calories > 0).length >= 2 && (
          <ReAnimated.View entering={FadeInDown.delay(560).springify().mass(0.5).damping(10)}>
            <Text style={styles.sectionHeading}>Macro Trends (7 Days)</Text>
            <MacroSparklines weeklyData={weeklyData} />
          </ReAnimated.View>
        )}

        {/* ─── Daily Averages ─── */}
        <ReAnimated.View entering={FadeInDown.delay(600).springify().mass(0.5).damping(10)}>
          <DailyAverageCard
            avgCalories={dailyAverages.avgCalories}
            avgProtein={dailyAverages.avgProtein}
            avgCarbs={dailyAverages.avgCarbs}
            avgFat={dailyAverages.avgFat}
            goals={goals}
          />
        </ReAnimated.View>

        {/* ═══════════════════════════════════════════════════════
            NEW DEEP ANALYTICS SECTIONS
            ═══════════════════════════════════════════════════════ */}

        {/* ─── Weekly Report Card ─── */}
        <ReAnimated.View entering={FadeInDown.delay(650).springify().mass(0.5).damping(10)}>
          <View style={styles.reportCardSection}>
            <View style={styles.reportCardHeader}>
              <View style={styles.reportCardTitleRow}>
                <View style={[styles.chartIcon, { backgroundColor: Colors.primary + '20' }]}>
                  <FileText size={18} color={Colors.primary} />
                </View>
                <View>
                  <Text style={styles.chartTitle}>Weekly Report Card</Text>
                  <Text style={styles.chartSubtitle}>Compliance & highlights</Text>
                </View>
              </View>
              <Pressable
                style={styles.reportViewButton}
                onPress={() => { hapticLight(); router.push('/weekly-report'); }}
              >
                <Text style={styles.reportViewText}>Full Report</Text>
                <ChevronRight size={14} color={Colors.primary} />
              </Pressable>
            </View>

            {/* Adherence Score Ring */}
            <View style={styles.reportScoreRow}>
              <AnimatedProgressRing
                progress={adherenceData.overallScore}
                size={90}
                strokeWidth={8}
                color={
                  adherenceData.overallScore >= 80 ? Colors.success :
                  adherenceData.overallScore >= 60 ? Colors.warning : Colors.error
                }
              />
              <View style={styles.reportScoreDetails}>
                <Text style={styles.reportGrade}>{adherenceData.grade}</Text>
                <Text style={styles.reportScoreLabel}>Adherence Score</Text>
                <View style={styles.reportMiniStats}>
                  <View style={styles.reportMiniStat}>
                    <Text style={styles.reportMiniValue}>{adherenceData.calorieAdherence}%</Text>
                    <Text style={styles.reportMiniLabel}>Cal Target</Text>
                  </View>
                  <View style={styles.reportMiniStat}>
                    <Text style={styles.reportMiniValue}>{adherenceData.proteinAdherence}%</Text>
                    <Text style={styles.reportMiniLabel}>Protein</Text>
                  </View>
                  <View style={styles.reportMiniStat}>
                    <Text style={styles.reportMiniValue}>{adherenceData.loggingConsistency}%</Text>
                    <Text style={styles.reportMiniLabel}>Logging</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </ReAnimated.View>

        {/* ─── Goal Progress Tracker ─── */}
        {goalProgress && goalProgress.projectedDate && (
          <ReAnimated.View entering={FadeInDown.delay(690).springify().mass(0.5).damping(10)}>
            <View style={styles.goalProgressCard}>
              <View style={styles.goalProgressHeader}>
                <View style={[styles.chartIcon, { backgroundColor: Colors.success + '20' }]}>
                  <Crosshair size={18} color={Colors.success} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.chartTitle}>Goal Progress</Text>
                  <Text style={styles.chartSubtitle}>
                    {goalProgress.status === 'on_track' || goalProgress.status === 'ahead'
                      ? 'On track!'
                      : goalProgress.status === 'behind' ? 'Behind schedule' : 'Stalled'}
                  </Text>
                </View>
                <View style={[
                  styles.goalStatusBadge,
                  { backgroundColor: goalProgress.status === 'on_track' || goalProgress.status === 'ahead' ? Colors.success + '20' : Colors.warning + '20' }
                ]}>
                  <Text style={[
                    styles.goalStatusText,
                    { color: goalProgress.status === 'on_track' || goalProgress.status === 'ahead' ? Colors.success : Colors.warning }
                  ]}>
                    {goalProgress.percentOfExpected}%
                  </Text>
                </View>
              </View>

              {/* Progress Bar */}
              <View style={styles.goalProgressBarContainer}>
                <View style={styles.goalProgressLabels}>
                  <Text style={styles.goalProgressStartLabel}>
                    {profile?.weight || '--'} kg
                  </Text>
                  <Text style={styles.goalProgressEndLabel}>
                    {profile?.goalWeight || '--'} kg
                  </Text>
                </View>
                <View style={styles.goalProgressBar}>
                  <View
                    style={[
                      styles.goalProgressFill,
                      {
                        width: `${Math.min(100, Math.max(5, goalProgress.percentOfExpected))}%`,
                        backgroundColor: goalProgress.status === 'ahead' ? Colors.success :
                          goalProgress.status === 'on_track' ? Colors.primary : Colors.warning,
                      }
                    ]}
                  />
                  <View style={[styles.goalProgressMarker, { left: `${Math.min(95, Math.max(5, goalProgress.percentOfExpected))}%` }]}>
                    <View style={styles.goalProgressMarkerDot} />
                  </View>
                </View>
                <Text style={styles.goalProjectedDate}>
                  Projected: {goalProgress.projectedDate
                    ? new Date(goalProgress.projectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : '--'}
                </Text>
              </View>

              <Text style={styles.goalRateText}>
                Rate: {goalProgress.actualRatePerWeek} kg/week (target: {goalProgress.expectedRatePerWeek} kg/week)
              </Text>
            </View>
          </ReAnimated.View>
        )}

        {/* ─── EWMA Weight Trend Chart ─── */}
        {ewmaData && ewmaData.smoothed.length >= 5 && (
          <ReAnimated.View entering={FadeInDown.delay(730).springify().mass(0.5).damping(10)}>
            <View style={styles.chartCard}>
              <View style={styles.chartHeader}>
                <View style={styles.chartTitleRow}>
                  <View style={[styles.chartIcon, { backgroundColor: Colors.success + '20' }]}>
                    <Activity size={18} color={Colors.success} />
                  </View>
                  <View>
                    <Text style={styles.chartTitle}>Smoothed Weight Trend</Text>
                    <Text style={styles.chartSubtitle}>EWMA with confidence band</Text>
                  </View>
                </View>
              </View>

              <View style={styles.chartContainer}>
                <LineChart
                  data={ewmaData.smoothed.map((v, i) => ({
                    value: v,
                    label: i % Math.max(1, Math.floor(ewmaData.smoothed.length / 6)) === 0 ? ewmaData.labels[i] : '',
                  }))}
                  data2={ewmaData.upperBand.map(v => ({ value: v }))}
                  data3={ewmaData.lowerBand.map(v => ({ value: v }))}
                  width={CHART_WIDTH}
                  height={180}
                  spacing={Math.max(8, CHART_WIDTH / Math.max(ewmaData.smoothed.length, 1))}
                  initialSpacing={15}
                  endSpacing={15}
                  thickness={3}
                  thickness2={1}
                  thickness3={1}
                  color={Colors.success}
                  color2={Colors.success + '40'}
                  color3={Colors.success + '40'}
                  hideDataPoints
                  hideDataPoints2
                  hideDataPoints3
                  curved
                  curvature={0.2}
                  startFillColor={Colors.success}
                  endFillColor={Colors.surface}
                  startOpacity={0.2}
                  endOpacity={0.02}
                  areaChart
                  hideRules
                  yAxisColor="transparent"
                  xAxisColor={Colors.border}
                  yAxisTextStyle={styles.axisText}
                  xAxisLabelTextStyle={styles.axisText}
                  noOfSections={4}
                />
              </View>

              <View style={styles.legendRow}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: Colors.success }]} />
                  <Text style={styles.legendText}>Smoothed trend</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: Colors.success + '40' }]} />
                  <Text style={styles.legendText}>Confidence band</Text>
                </View>
              </View>
            </View>
          </ReAnimated.View>
        )}

        {/* ─── Macro Consistency Chart ─── */}
        {macroConsistency && macroConsistency.overallConsistency > 0 && (
          <ReAnimated.View entering={FadeInDown.delay(770).springify().mass(0.5).damping(10)}>
            <View style={styles.macroConsistencyCard}>
              <View style={styles.chartHeader}>
                <View style={styles.chartTitleRow}>
                  <View style={[styles.chartIcon, { backgroundColor: Colors.carbs + '20' }]}>
                    <BarChart3 size={18} color={Colors.carbs} />
                  </View>
                  <View>
                    <Text style={styles.chartTitle}>Macro Consistency</Text>
                    <Text style={styles.chartSubtitle}>How stable is your daily intake</Text>
                  </View>
                </View>
                <View style={[
                  styles.consistencyScorePill,
                  { backgroundColor: macroConsistency.overallConsistency >= 70 ? Colors.success + '20' : Colors.warning + '20' }
                ]}>
                  <Text style={[
                    styles.consistencyScoreText,
                    { color: macroConsistency.overallConsistency >= 70 ? Colors.success : Colors.warning }
                  ]}>
                    {macroConsistency.overallConsistency}%
                  </Text>
                </View>
              </View>

              {/* Variance bars */}
              <View style={styles.varianceGrid}>
                {[
                  { label: 'Calories', cv: macroConsistency.calorieCV, color: Colors.primary },
                  { label: 'Protein', cv: macroConsistency.proteinCV, color: Colors.protein },
                  { label: 'Carbs', cv: macroConsistency.carbsCV, color: Colors.carbs },
                  { label: 'Fat', cv: macroConsistency.fatCV, color: Colors.fat },
                ].map(item => {
                  const consistency = Math.max(0, Math.round((1 - item.cv) * 100));
                  return (
                    <View key={item.label} style={styles.varianceItem}>
                      <Text style={styles.varianceLabel}>{item.label}</Text>
                      <View style={styles.varianceBarBg}>
                        <View style={[styles.varianceBarFill, { width: `${consistency}%`, backgroundColor: item.color }]} />
                      </View>
                      <Text style={[styles.varianceValue, { color: consistency >= 70 ? Colors.success : Colors.warning }]}>
                        {consistency}%
                      </Text>
                    </View>
                  );
                })}
              </View>
              <Text style={styles.varianceHint}>
                Higher = more consistent daily intake
              </Text>
            </View>
          </ReAnimated.View>
        )}

        {/* ─── Correlation Insights ─── */}
        {correlationInsights.length > 0 && (
          <ReAnimated.View entering={FadeInDown.delay(810).springify().mass(0.5).damping(10)}>
            <Text style={styles.sectionHeading}>Correlations</Text>
            {correlationInsights.map((corr, i) => (
              <InsightCard
                key={`corr-${i}`}
                type={corr.direction === 'positive' ? 'success' : corr.direction === 'negative' ? 'warning' : 'tip'}
                title={`${corr.strength.charAt(0).toUpperCase() + corr.strength.slice(1)} correlation (r=${corr.coefficient})`}
                body={corr.description}
              />
            ))}
          </ReAnimated.View>
        )}

        {/* ─── Deep Insights from insightGenerator ─── */}
        {deepInsights && deepInsights.length > 0 && (
          <ReAnimated.View entering={FadeInDown.delay(850).springify().mass(0.5).damping(10)}>
            <Text style={styles.sectionHeading}>Deep Insights</Text>
            {deepInsights.slice(0, 4).map((insight, i) => (
              <InsightCard
                key={insight.id}
                type={insight.type === 'positive' ? 'success' : insight.type === 'warning' ? 'warning' : insight.type === 'achievement' ? 'success' : 'tip'}
                title={insight.title}
                body={insight.description}
                actionLabel={insight.actionable ? 'Learn more' : undefined}
                onAction={insight.actionable ? () => router.push('/chat') : undefined}
              />
            ))}
          </ReAnimated.View>
        )}

        {/* ─── Habit Heatmap ─── */}
        <ReAnimated.View entering={FadeInDown.delay(890).springify().mass(0.5).damping(10)}>
          <Text style={styles.sectionHeading}>Activity Heatmap</Text>
          <HabitHeatmap dayData={dayData} currentStreak={currentStreak} />
        </ReAnimated.View>

        {/* ─── Personal Records Section (enhanced) ─── */}
        <ReAnimated.View entering={FadeInDown.delay(930).springify().mass(0.5).damping(10)}>
          <View style={styles.personalRecordsCard}>
            <View style={styles.personalBestsHeader}>
              <Trophy size={20} color={Colors.gold} />
              <Text style={styles.personalBestsTitle}>All-Time Personal Records</Text>
            </View>
            <View style={styles.prGrid}>
              {[
                { label: 'Longest Streak', value: `${personalBests.longestStreak} days`, icon: Zap, color: Colors.warning },
                { label: 'Best Workout Cal', value: `${personalBests.maxWorkoutCalories} kcal`, icon: Flame, color: Colors.secondary },
                { label: 'Highest Protein', value: `${personalBests.highestProtein}g`, icon: Target, color: Colors.protein },
                { label: 'Best Week', value: `${personalBests.mostConsistentWeek}/7`, icon: Trophy, color: Colors.gold },
                { label: 'Adherence Best', value: `${adherenceData.overallScore}%`, icon: Award, color: Colors.primary },
                { label: 'Current Streak', value: `${currentStreak} days`, icon: Flame, color: Colors.success },
              ].map((item) => (
                <View key={item.label} style={styles.prItem}>
                  <View style={[styles.prIcon, { backgroundColor: item.color + '15' }]}>
                    <item.icon size={16} color={item.color} />
                  </View>
                  <Text style={styles.prValue}>{item.value}</Text>
                  <Text style={styles.prLabel}>{item.label}</Text>
                </View>
              ))}
            </View>
          </View>
        </ReAnimated.View>

        {/* ─── Quick Navigation ─── */}
        <ReAnimated.View entering={FadeInDown.delay(970).springify().mass(0.5).damping(10)}>
          <Text style={styles.sectionHeading}>Explore Details</Text>
          <QuickNavGrid router={router} />
        </ReAnimated.View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  header: {
    marginBottom: Spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exportButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceGlass,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  subtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  // Range Selector
  rangeSelector: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.xs,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  rangeOption: {
    flex: 1,
    paddingVertical: Spacing.sm + 2,
    alignItems: 'center',
    borderRadius: BorderRadius.md,
  },
  rangeOptionActive: {
    backgroundColor: Colors.primary,
  },
  rangeOptionText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
  },
  rangeOptionTextActive: {
    color: Colors.background,
  },
  // Big Summary Stats
  summaryRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  bigStatCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  bigStatIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  bigStatLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  bigStatValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  bigStatValue: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  bigStatUnit: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginLeft: 2,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.xs,
    gap: 2,
  },
  trendText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  // Chart Cards
  chartCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  chartTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  chartIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  chartSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  demoBadge: {
    backgroundColor: Colors.warning + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  demoBadgeText: {
    fontSize: FontSize.xs,
    color: Colors.warning,
    fontWeight: FontWeight.bold,
  },
  chartContainer: {
    alignItems: 'center',
    marginLeft: -Spacing.sm,
  },
  axisText: {
    fontSize: 10,
    color: Colors.textTertiary,
  },
  tooltipContainer: {
    backgroundColor: Colors.text,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  tooltipText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.background,
  },
  chartFooter: {
    marginTop: Spacing.md,
    alignItems: 'center',
  },
  currentWeightText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  currentWeightValue: {
    fontWeight: FontWeight.bold,
    color: Colors.success,
  },
  barTopLabel: {
    fontSize: 9,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  referenceLineLabel: {
    fontSize: 10,
    color: Colors.textTertiary,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.lg,
    marginTop: Spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendDash: {
    width: 12,
    height: 2,
    backgroundColor: Colors.textTertiary,
    borderRadius: 1,
  },
  legendText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  // Weekly Summary
  weeklySummaryCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  weeklySummaryTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  scoreItem: {
    alignItems: 'center',
    flex: 1,
  },
  scoreValue: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
  },
  scoreLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  scoreDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.border,
  },
  verdictBadge: {
    marginTop: Spacing.lg,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    alignSelf: 'center',
  },
  verdictText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    textAlign: 'center',
  },
  // ─── Section Heading ───
  sectionHeading: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.md,
    marginTop: Spacing.sm,
  },

  // ─── Weekly Comparison Card ───
  weeklyCompCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginTop: Spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  weeklyCompGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: BorderRadius.xl,
  },
  weeklyCompTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  weeklyCompRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  weeklyCompItem: {
    flex: 1,
    alignItems: 'center',
  },
  weeklyCompLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  weeklyCompValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  weeklyCompBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    marginTop: 4,
    gap: 2,
  },
  weeklyCompBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },

  // ─── Consistency Score ───
  consistencyCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginTop: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  consistencyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  consistencyTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  consistencySubtitle: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  consistencyBadge: {
    paddingHorizontal: Spacing.sm + 4,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
  },
  consistencyPercent: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  calendarStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  calendarDayCol: {
    alignItems: 'center',
    gap: 4,
  },
  calendarDayLabel: {
    fontSize: 9,
    color: Colors.textTertiary,
    fontWeight: FontWeight.medium,
  },
  calendarDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },

  // ─── Personal Bests ───
  personalBestsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginTop: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.gold + '25',
  },
  personalBestsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  personalBestsTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  personalBestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  personalBestItem: {
    width: (SCREEN_WIDTH - Spacing.md * 2 - Spacing.lg * 2 - Spacing.sm) / 2,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  personalBestIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  personalBestValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: 2,
  },
  personalBestLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
  },

  // ─── Macro Sparklines ───
  sparklineRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  sparklineCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  sparklineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sparklineLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  sparklineChartWrap: {
    alignItems: 'center',
    overflow: 'hidden',
    marginVertical: 2,
  },
  sparklineAvg: {
    fontSize: 10,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: 2,
  },

  // ─── Quick Navigation ───
  quickNavGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  quickNavCard: {
    width: (SCREEN_WIDTH - Spacing.md * 2 - Spacing.sm) / 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surfaceGlass,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm + 4,
  },
  quickNavLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  quickNavEmoji: {
    fontSize: 18,
  },
  quickNavTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    flexShrink: 1,
  },

  // ─── Daily Averages ───
  dailyAvgCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  dailyAvgTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  dailyAvgRow: {
    marginBottom: Spacing.sm + 2,
  },
  dailyAvgLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  dailyAvgLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  dailyAvgValues: {
    fontSize: FontSize.sm,
    color: Colors.text,
    fontWeight: FontWeight.semibold,
  },
  dailyAvgGoal: {
    color: Colors.textTertiary,
    fontWeight: FontWeight.regular,
  },
  dailyAvgBarBg: {
    height: 6,
    backgroundColor: Colors.surfaceBright,
    borderRadius: 3,
    overflow: 'hidden',
  },
  dailyAvgBarFill: {
    height: 6,
    borderRadius: 3,
  },

  // ─── Weekly Report Card Section ───
  reportCardSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginTop: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  reportCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  reportCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  reportViewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: Spacing.sm + 4,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
  },
  reportViewText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },
  reportScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  reportScoreDetails: {
    flex: 1,
  },
  reportGrade: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  reportScoreLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  reportMiniStats: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  reportMiniStat: {
    alignItems: 'center',
  },
  reportMiniValue: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  reportMiniLabel: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },

  // ─── Goal Progress Tracker ───
  goalProgressCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginTop: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  goalProgressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  goalStatusBadge: {
    paddingHorizontal: Spacing.sm + 4,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
  },
  goalStatusText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  goalProgressBarContainer: {
    marginBottom: Spacing.sm,
  },
  goalProgressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  goalProgressStartLabel: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },
  goalProgressEndLabel: {
    fontSize: FontSize.xs,
    color: Colors.success,
    fontWeight: FontWeight.semibold,
  },
  goalProgressBar: {
    height: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 5,
    overflow: 'visible',
    position: 'relative',
  },
  goalProgressFill: {
    height: 10,
    borderRadius: 5,
  },
  goalProgressMarker: {
    position: 'absolute',
    top: -3,
    marginLeft: -8,
  },
  goalProgressMarkerDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.text,
    borderWidth: 3,
    borderColor: Colors.primary,
  },
  goalProjectedDate: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
    fontWeight: FontWeight.medium,
  },
  goalRateText: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: 4,
  },

  // ─── Macro Consistency ───
  macroConsistencyCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginTop: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  consistencyScorePill: {
    paddingHorizontal: Spacing.sm + 4,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
  },
  consistencyScoreText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  varianceGrid: {
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  varianceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  varianceLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    width: 65,
    fontWeight: FontWeight.medium,
  },
  varianceBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  varianceBarFill: {
    height: 6,
    borderRadius: 3,
  },
  varianceValue: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    width: 40,
    textAlign: 'right',
  },
  varianceHint: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },

  // ─── Personal Records (enhanced) ───
  personalRecordsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginTop: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.gold + '25',
  },
  prGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  prItem: {
    width: (SCREEN_WIDTH - Spacing.md * 2 - Spacing.lg * 2 - Spacing.sm * 2) / 3,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm + 2,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  prIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  prValue: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: 1,
  },
  prLabel: {
    fontSize: 9,
    color: Colors.textTertiary,
    textAlign: 'center',
  },

  bottomSpacer: {
    height: 140,
  },
  micronutrientButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surfaceGlass,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  micronutrientLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 4,
  },
  micronutrientIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  micronutrientTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  micronutrientSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    marginTop: 1,
  },
  scoreRingRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  scoreRingCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
  scoreRingLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
    fontWeight: FontWeight.medium,
  },
  scoreRingValue: {
    fontSize: FontSize.md,
    color: Colors.text,
    fontWeight: FontWeight.bold,
    marginTop: 2,
  },
});

export default function StatsScreen(props) {
  return (
    <ScreenErrorBoundary screenName="StatsScreen">
      <StatsScreenInner {...props} />
    </ScreenErrorBoundary>
  );
}

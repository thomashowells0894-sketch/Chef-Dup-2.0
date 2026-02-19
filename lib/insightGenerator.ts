/**
 * VibeFit Insight Generator
 * Transforms raw analytics data into human-readable, actionable insights.
 */

import {
  weightedLinearRegression,
  detectAnomalies,
  calculateCorrelation,
  analyzeStreaks,
  analyzeDayPatterns,
  detectPlateauStatistical,
  calculateProgressRate,
  calculateAdherenceScore,
  analyzeMacroConsistency,
} from './analyticsEngine';

// ============================================================================
// TYPES
// ============================================================================

export interface Insight {
  id: string;
  type: 'positive' | 'warning' | 'info' | 'achievement';
  title: string;
  description: string;
  metric?: string;
  trend?: 'up' | 'down' | 'stable';
  actionable?: string;
  priority: number; // 1-10 (10 = highest)
}

export interface InsightGeneratorInput {
  dailyData: Array<{
    date: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    goal: number;
    proteinGoal: number;
  }>;
  weightHistory?: Array<{ date: string; weight: number }>;
  sleepData?: Array<{ date: string; hours: number; quality?: number }>;
  workoutData?: Array<{ date: string; duration: number; calories: number; type?: string }>;
  currentWeight?: number;
  goalWeight?: number;
  startWeight?: number;
  expectedWeeklyRate?: number;
  loggedDates?: string[];
  streak?: number;
}

// ============================================================================
// MAIN GENERATOR
// ============================================================================

/**
 * Generate prioritized, human-readable insights from user data.
 * Returns up to maxInsights sorted by priority (highest first).
 */
export function generateInsights(
  input: InsightGeneratorInput,
  maxInsights: number = 10
): Insight[] {
  const insights: Insight[] = [];

  if (!input.dailyData || input.dailyData.length < 3) return insights;

  // --- Weekend vs weekday calorie pattern ---
  try {
    const dayAnalysis = analyzeDayPatterns(input.dailyData);
    const diff = dayAnalysis.weekendVsWeekday.difference;
    if (Math.abs(diff) > 150 && dayAnalysis.weekendVsWeekday.weekdayAvg > 0) {
      const weeklyImpact = Math.abs(diff) * 2; // 2 weekend days
      if (diff > 0) {
        insights.push({
          id: 'weekend_calories',
          type: 'warning',
          title: `You eat ${Math.abs(diff)} more calories on weekends`,
          description: `Planning ahead could save ${weeklyImpact.toLocaleString()} cal/week. Your weekday average is ${dayAnalysis.weekendVsWeekday.weekdayAvg} vs ${dayAnalysis.weekendVsWeekday.weekendAvg} on weekends.`,
          metric: `+${diff} cal`,
          trend: 'up',
          actionable: 'Prep weekend meals in advance or plan lighter dinners on Saturday.',
          priority: diff > 400 ? 9 : 7,
        });
      }
    }

    // Best/worst day pattern
    if (dayAnalysis.worstDay && dayAnalysis.bestDay && dayAnalysis.worstDay !== dayAnalysis.bestDay) {
      insights.push({
        id: 'day_pattern',
        type: 'info',
        title: `${dayAnalysis.worstDay}s are your toughest day`,
        description: `You average ${dayAnalysis.worstDayAvgCalories} cal on ${dayAnalysis.worstDay}s vs ${dayAnalysis.bestDayAvgCalories} cal on ${dayAnalysis.bestDay}s.`,
        metric: `${dayAnalysis.worstDayAvgCalories} cal`,
        actionable: `Prepare meals for ${dayAnalysis.worstDay}s the night before.`,
        priority: 5,
      });
    }
  } catch {}

  // --- Protein drop-off pattern ---
  try {
    const dayAnalysis = analyzeDayPatterns(input.dailyData);
    const avgEntries = Object.entries(dayAnalysis.dayOfWeekAverages).filter(([, v]) => v.count >= 2);
    if (avgEntries.length >= 5) {
      const overallAvgProtein = avgEntries.reduce((s, [, v]) => s + v.avgProtein, 0) / avgEntries.length;
      for (const [day, data] of avgEntries) {
        if (overallAvgProtein > 0 && data.avgProtein < overallAvgProtein * 0.75) {
          const drop = Math.round((1 - data.avgProtein / overallAvgProtein) * 100);
          insights.push({
            id: `protein_drop_${day}`,
            type: 'warning',
            title: `Protein drops ${drop}% on ${day}s`,
            description: `Your protein intake falls to ${data.avgProtein}g on ${day}s (avg: ${Math.round(overallAvgProtein)}g). This may slow muscle recovery.`,
            metric: `${data.avgProtein}g`,
            trend: 'down',
            actionable: `Add a protein shake or Greek yogurt on ${day}s.`,
            priority: 7,
          });
          break; // Only show worst day
        }
      }
    }
  } catch {}

  // --- Weight progress tracking ---
  try {
    if (
      input.weightHistory && input.weightHistory.length >= 7 &&
      input.currentWeight && input.goalWeight && input.startWeight && input.expectedWeeklyRate
    ) {
      const progressRate = calculateProgressRate(
        input.currentWeight, input.goalWeight, input.startWeight,
        input.expectedWeeklyRate, input.weightHistory
      );

      if (progressRate.status === 'on_track' || progressRate.status === 'ahead') {
        // Calculate 30-day weight change
        const sorted = [...input.weightHistory].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const thirtyAgo = sorted.length >= 30 ? sorted[sorted.length - 30] : sorted[0];
        const latest = sorted[sorted.length - 1];
        const change30 = Math.round((latest.weight - thirtyAgo.weight) * 10) / 10;

        if (Math.abs(change30) > 0.5 && progressRate.projectedDate) {
          const projDate = new Date(progressRate.projectedDate);
          const dateStr = projDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
          insights.push({
            id: 'weight_progress',
            type: 'positive',
            title: `You've ${change30 < 0 ? 'lost' : 'gained'} ${Math.abs(change30)}kg in the last 30 days`,
            description: `On track to hit your goal by ${dateStr}. Keep it up!`,
            metric: `${Math.abs(change30)}kg`,
            trend: change30 < 0 ? 'down' : 'up',
            priority: 8,
          });
        }
      } else if (progressRate.status === 'behind') {
        insights.push({
          id: 'weight_behind',
          type: 'warning',
          title: 'Progress is slower than planned',
          description: progressRate.message,
          metric: `${progressRate.actualRatePerWeek} kg/wk`,
          trend: 'stable',
          actionable: 'Review your calorie target or increase daily activity by 15 minutes.',
          priority: 8,
        });
      }
    }
  } catch {}

  // --- Plateau detection ---
  try {
    if (input.weightHistory && input.weightHistory.length >= 14) {
      const weights = input.weightHistory.map(w => w.weight);
      const plateau = detectPlateauStatistical(weights);
      if (plateau.isPlateau && plateau.plateauDuration >= 14) {
        insights.push({
          id: 'plateau',
          type: 'warning',
          title: `Weight plateau for ${plateau.plateauDuration} days`,
          description: plateau.suggestion || 'Your weight has been stable. Consider adjusting your approach.',
          trend: 'stable',
          actionable: 'Try a 2-day refeed at maintenance calories or increase daily steps by 2,000.',
          priority: 9,
        });
      }
    }
  } catch {}

  // --- TDEE adaptation ---
  try {
    if (input.weightHistory && input.weightHistory.length >= 28 && input.dailyData.length >= 28) {
      const last28Cal = input.dailyData.slice(-28);
      const avgCal = last28Cal.reduce((s, d) => s + d.calories, 0) / last28Cal.length;
      const weights = input.weightHistory.map(w => w.weight);
      const trend14 = weightedLinearRegression(weights, 14);
      const trend30 = weightedLinearRegression(weights, 30);

      if (trend14 && trend30) {
        // If 30-day trend was downward but 14-day has flattened, TDEE may have adapted
        if (trend30.direction === 'decreasing' && trend14.direction === 'stable' && avgCal < 2200) {
          const estimatedAdaptation = Math.round(Math.abs(trend30.slope - (trend14?.slope || 0)) * 500);
          if (estimatedAdaptation > 50) {
            insights.push({
              id: 'tdee_adaptation',
              type: 'warning',
              title: `Your TDEE may have adapted down by ~${Math.min(300, estimatedAdaptation)} cal`,
              description: 'Your body is burning fewer calories as it adapts to your deficit. Consider a strategic diet break.',
              metric: `-${Math.min(300, estimatedAdaptation)} cal`,
              trend: 'down',
              actionable: 'Eat at maintenance for 5-7 days to reset your metabolism.',
              priority: 8,
            });
          }
        }
      }
    }
  } catch {}

  // --- Streak analysis ---
  try {
    if (input.loggedDates && input.loggedDates.length >= 7) {
      const streakData = analyzeStreaks(input.loggedDates);

      // Streak break pattern
      if (streakData.mostLikelyBreakDay && streakData.streakBreakDays[streakData.mostLikelyBreakDay] >= 3) {
        const count = streakData.streakBreakDays[streakData.mostLikelyBreakDay];
        insights.push({
          id: 'streak_break_pattern',
          type: 'warning',
          title: `Streak alert: You tend to break on ${streakData.mostLikelyBreakDay}s`,
          description: `You've broken your logging streak on ${streakData.mostLikelyBreakDay}s ${count} times. Setting a reminder could help.`,
          actionable: `Set an alarm on ${streakData.mostLikelyBreakDay}s to log your meals.`,
          priority: 6,
        });
      }

      // Achievement: long streak
      if (streakData.currentStreak >= 14) {
        insights.push({
          id: 'streak_achievement',
          type: 'achievement',
          title: `${streakData.currentStreak}-day logging streak!`,
          description: `You're in the top tier of consistency. Only 5% of users maintain a streak this long.`,
          metric: `${streakData.currentStreak} days`,
          trend: 'up',
          priority: 6,
        });
      }

      // Personal best streak
      if (streakData.currentStreak > 0 && streakData.currentStreak >= streakData.longestStreak && streakData.longestStreak >= 7) {
        insights.push({
          id: 'streak_pr',
          type: 'achievement',
          title: 'New personal best streak!',
          description: `This is your longest streak ever at ${streakData.currentStreak} days. Do not stop now!`,
          metric: `${streakData.currentStreak} days`,
          trend: 'up',
          priority: 7,
        });
      }
    }
  } catch {}

  // --- Sleep correlation ---
  try {
    if (input.sleepData && input.sleepData.length >= 7 && input.weightHistory && input.weightHistory.length >= 7) {
      const sleepHours = input.sleepData.map(s => s.hours);
      const weightChanges: number[] = [];
      for (let i = 1; i < input.weightHistory.length; i++) {
        weightChanges.push(input.weightHistory[i].weight - input.weightHistory[i - 1].weight);
      }
      const minLen = Math.min(sleepHours.length, weightChanges.length);
      if (minLen >= 5) {
        const corr = calculateCorrelation(
          sleepHours.slice(-minLen),
          weightChanges.slice(-minLen),
          'sleep hours',
          'weight change'
        );
        if (corr && (corr.strength === 'strong' || corr.strength === 'moderate')) {
          const betterSleepDays = input.sleepData.filter(s => s.hours >= 7);
          const worseSleepDays = input.sleepData.filter(s => s.hours < 7);

          if (betterSleepDays.length > 0 && worseSleepDays.length > 0) {
            insights.push({
              id: 'sleep_weight_correlation',
              type: 'info',
              title: 'Your best weight-loss weeks correlate with 7+ hours sleep',
              description: corr.description,
              actionable: 'Aim for 7-9 hours of sleep to support your weight loss goals.',
              priority: 7,
            });
          }
        }
      }
    }
  } catch {}

  // --- Sleep and workout correlation ---
  try {
    if (input.sleepData && input.sleepData.length >= 7 && input.workoutData && input.workoutData.length >= 5) {
      // Check if sleep quality is better on workout days
      const sleepByDate = new Map(input.sleepData.map(s => [s.date, s]));
      const workoutDates = new Set(input.workoutData.map(w => w.date));

      const sleepOnWorkoutDays: number[] = [];
      const sleepOnRestDays: number[] = [];
      for (const [date, sleep] of sleepByDate) {
        if (sleep.quality != null) {
          if (workoutDates.has(date)) {
            sleepOnWorkoutDays.push(sleep.quality);
          } else {
            sleepOnRestDays.push(sleep.quality);
          }
        }
      }

      if (sleepOnWorkoutDays.length >= 3 && sleepOnRestDays.length >= 3) {
        const workoutDayAvg = sleepOnWorkoutDays.reduce((s, v) => s + v, 0) / sleepOnWorkoutDays.length;
        const restDayAvg = sleepOnRestDays.reduce((s, v) => s + v, 0) / sleepOnRestDays.length;
        const improvement = Math.round(((workoutDayAvg - restDayAvg) / restDayAvg) * 100);

        if (improvement > 10) {
          insights.push({
            id: 'sleep_workout',
            type: 'positive',
            title: `Sleep quality improves by ${improvement}% on workout days`,
            description: `Your sleep quality averages ${Math.round(workoutDayAvg)}% on days you exercise vs ${Math.round(restDayAvg)}% on rest days.`,
            actionable: 'Consistent exercise improves sleep. Keep up your workout routine!',
            priority: 6,
          });
        }
      }
    }
  } catch {}

  // --- Macro consistency insight ---
  try {
    const macroData = input.dailyData.filter(d => d.calories > 0);
    if (macroData.length >= 7) {
      const consistency = analyzeMacroConsistency(macroData);
      if (consistency.overallConsistency >= 80) {
        insights.push({
          id: 'macro_consistent',
          type: 'positive',
          title: 'Excellent macro consistency!',
          description: `Your daily macros only vary by ${Math.round(consistency.calorieCV * 100)}%. This consistency accelerates results.`,
          metric: `${consistency.overallConsistency}%`,
          trend: 'stable',
          priority: 5,
        });
      } else if (consistency.overallConsistency < 50) {
        insights.push({
          id: 'macro_inconsistent',
          type: 'warning',
          title: 'Macro intake is inconsistent',
          description: `Your calories vary by ${Math.round(consistency.calorieCV * 100)}% day-to-day. More consistency will improve results.`,
          actionable: 'Try meal prepping 2-3 standard meals you can rotate.',
          priority: 6,
        });
      }
    }
  } catch {}

  // --- Adherence achievement ---
  try {
    if (input.dailyData.length >= 7) {
      const adherence = calculateAdherenceScore(
        input.dailyData.map(d => ({
          calories: d.calories,
          protein: d.protein,
          goal: d.goal,
          proteinGoal: d.proteinGoal,
        })),
        7
      );

      if (adherence.overallScore >= 85) {
        insights.push({
          id: 'adherence_high',
          type: 'achievement',
          title: `${adherence.grade} week: ${adherence.overallScore}% adherence`,
          description: `You hit your calorie target ${adherence.calorieAdherence}% of the time and protein ${adherence.proteinAdherence}%.`,
          metric: `${adherence.overallScore}%`,
          priority: 5,
        });
      }
    }
  } catch {}

  // --- Calorie anomalies ---
  try {
    const cals = input.dailyData.filter(d => d.calories > 0).map(d => d.calories);
    const dates = input.dailyData.filter(d => d.calories > 0).map(d => d.date);
    if (cals.length >= 7) {
      const anomalies = detectAnomalies(cals, 2.0, dates);
      const recentHigh = anomalies.anomalies.filter(a => a.type === 'high').slice(-1)[0];
      if (recentHigh) {
        insights.push({
          id: 'calorie_spike',
          type: 'info',
          title: `Calorie spike detected: ${recentHigh.value} cal`,
          description: `This was ${Math.round((recentHigh.value - anomalies.mean))} calories above your average. One day does not define your progress!`,
          metric: `${recentHigh.value} cal`,
          trend: 'up',
          actionable: 'Get back to your normal intake today. One off-day barely affects weekly averages.',
          priority: 4,
        });
      }
    }
  } catch {}

  // Sort by priority (highest first) and return top N
  insights.sort((a, b) => b.priority - a.priority);
  return insights.slice(0, maxInsights);
}

/**
 * Get a "Next Week Focus" recommendation based on current insights.
 */
export function getNextWeekFocus(insights: Insight[]): string[] {
  const focus: string[] = [];

  const highPriority = insights.filter(i => i.priority >= 7 && i.actionable);
  for (const insight of highPriority.slice(0, 2)) {
    if (insight.actionable) {
      focus.push(insight.actionable);
    }
  }

  if (focus.length === 0) {
    focus.push('Keep up your current routine -- consistency is key.');
  }

  return focus;
}

/**
 * useMoodFoodCorrelation - Correlates mood logs with food/nutrition data
 *
 * Computes analytics such as mood-by-macro-split, best/worst foods for mood,
 * hydration impact, calorie-target impact, and generates textual insights.
 */

import { useMemo } from 'react';
import { useMood } from '../context/MoodContext';
import { useMeals } from '../context/MealContext';

/**
 * Compute overall mood score from a single mood log entry.
 * Score is the average of energyLevel and focusLevel (1-10 scale).
 */
function moodScore(log) {
  return (log.energyLevel + log.focusLevel) / 2;
}

/**
 * Get date string in yyyy-MM-dd form from a timestamp (ms).
 */
function dateKeyFromTimestamp(ts) {
  const d = new Date(ts);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get date string for "today minus N days".
 */
function dateKeyOffset(offset) {
  const d = new Date();
  d.setDate(d.getDate() - offset);
  return dateKeyFromTimestamp(d.getTime());
}

/**
 * Return an emoji for a mood score (1-10).
 */
function emojiForScore(score) {
  if (score >= 8) return '\u{1F929}';  // star-struck
  if (score >= 6.5) return '\u{1F60A}'; // smiling
  if (score >= 5) return '\u{1F610}';   // neutral
  if (score >= 3) return '\u{1F614}';   // pensive
  return '\u{1F629}';                    // weary
}

export default function useMoodFoodCorrelation() {
  const { logs: moodLogs, isLoading: moodLoading } = useMood();
  const {
    dayData,
    goals,
    waterGoal,
    isLoading: mealLoading,
  } = useMeals();

  const isLoading = moodLoading || mealLoading;

  // --- Aggregate mood by date ---
  const moodByDate = useMemo(() => {
    const map = {};
    (moodLogs || []).forEach((log) => {
      const dk = log.date || dateKeyFromTimestamp(log.timestamp);
      if (!map[dk]) map[dk] = [];
      map[dk].push(log);
    });
    return map;
  }, [moodLogs]);

  // Average mood score per date
  const avgMoodByDate = useMemo(() => {
    const result = {};
    Object.entries(moodByDate).forEach(([dk, logs]) => {
      const total = logs.reduce((s, l) => s + moodScore(l), 0);
      result[dk] = total / logs.length;
    });
    return result;
  }, [moodByDate]);

  // Dates that have BOTH mood and food data
  const datesWithBoth = useMemo(() => {
    return Object.keys(avgMoodByDate).filter((dk) => {
      const dd = dayData[dk];
      return dd && dd.totals && dd.totals.calories > 0;
    });
  }, [avgMoodByDate, dayData]);

  const hasEnoughData = datesWithBoth.length >= 3; // relaxed from 7 for usability

  // --- moodByMacroSplit ---
  const moodByMacroSplit = useMemo(() => {
    const buckets = { highProtein: [], highCarb: [], highFat: [], balanced: [] };
    datesWithBoth.forEach((dk) => {
      const { protein, carbs, fat } = dayData[dk].totals;
      const total = protein + carbs + fat;
      if (total === 0) return;
      const pPct = protein / total;
      const cPct = carbs / total;
      const fPct = fat / total;
      const mood = avgMoodByDate[dk];

      if (pPct > 0.35) buckets.highProtein.push(mood);
      else if (cPct > 0.50) buckets.highCarb.push(mood);
      else if (fPct > 0.40) buckets.highFat.push(mood);
      else buckets.balanced.push(mood);
    });

    const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
    return {
      highProtein: { avg: avg(buckets.highProtein), count: buckets.highProtein.length },
      highCarb: { avg: avg(buckets.highCarb), count: buckets.highCarb.length },
      highFat: { avg: avg(buckets.highFat), count: buckets.highFat.length },
      balanced: { avg: avg(buckets.balanced), count: buckets.balanced.length },
    };
  }, [datesWithBoth, dayData, avgMoodByDate]);

  // --- moodByCalories ---
  const moodByCalories = useMemo(() => {
    const target = goals.calories || 2000;
    const margin = target * 0.1; // +/- 10% counts as "on target"
    const buckets = { under: [], onTarget: [], over: [] };

    datesWithBoth.forEach((dk) => {
      const cal = dayData[dk].totals.calories;
      const mood = avgMoodByDate[dk];
      if (cal < target - margin) buckets.under.push(mood);
      else if (cal > target + margin) buckets.over.push(mood);
      else buckets.onTarget.push(mood);
    });

    const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
    return {
      under: { avg: avg(buckets.under), count: buckets.under.length },
      onTarget: { avg: avg(buckets.onTarget), count: buckets.onTarget.length },
      over: { avg: avg(buckets.over), count: buckets.over.length },
    };
  }, [datesWithBoth, dayData, avgMoodByDate, goals.calories]);

  // --- bestFoodsForMood / worstFoodsForMood ---
  const { bestFoodsForMood, worstFoodsForMood } = useMemo(() => {
    // Collect food->mood associations
    const foodMoods = {};

    datesWithBoth.forEach((dk) => {
      const dd = dayData[dk];
      const mood = avgMoodByDate[dk];
      const allItems = [
        ...(dd.meals?.breakfast || []),
        ...(dd.meals?.lunch || []),
        ...(dd.meals?.dinner || []),
        ...(dd.meals?.snacks || []),
      ];
      allItems.forEach((item) => {
        const name = (item.name || '').trim();
        if (!name || name === 'Water') return;
        if (!foodMoods[name]) foodMoods[name] = { moods: [], emoji: item.emoji || '\u{1F37D}\u{FE0F}' };
        foodMoods[name].moods.push(mood);
      });
    });

    // Only consider foods eaten at least twice
    const entries = Object.entries(foodMoods)
      .filter(([, v]) => v.moods.length >= 2)
      .map(([name, v]) => ({
        name,
        emoji: v.emoji,
        avgMood: v.moods.reduce((a, b) => a + b, 0) / v.moods.length,
        frequency: v.moods.length,
      }));

    const sorted = [...entries].sort((a, b) => b.avgMood - a.avgMood);
    return {
      bestFoodsForMood: sorted.slice(0, 5),
      worstFoodsForMood: [...entries].sort((a, b) => a.avgMood - b.avgMood).slice(0, 5),
    };
  }, [datesWithBoth, dayData, avgMoodByDate]);

  // --- moodTrend (7-day moving average) ---
  const moodTrend = useMemo(() => {
    const points = [];
    for (let i = 6; i >= 0; i--) {
      const dk = dateKeyOffset(i);
      const mood = avgMoodByDate[dk];
      const dayLabel = new Date(Date.now() - i * 86400000).toLocaleDateString('en-US', { weekday: 'short' });
      points.push({
        date: dk,
        label: dayLabel,
        value: mood !== undefined ? Math.round(mood * 10) / 10 : null,
        emoji: mood !== undefined ? emojiForScore(mood) : null,
      });
    }
    return points;
  }, [avgMoodByDate]);

  // --- energyByMealTiming ---
  const energyByMealTiming = useMemo(() => {
    // Group mood logs by hour, cross-reference with what meal was closest
    const timeBuckets = { morning: [], midday: [], afternoon: [], evening: [] };

    (moodLogs || []).forEach((log) => {
      const hour = new Date(log.timestamp).getHours();
      const score = moodScore(log);
      if (hour >= 6 && hour < 11) timeBuckets.morning.push(score);
      else if (hour >= 11 && hour < 14) timeBuckets.midday.push(score);
      else if (hour >= 14 && hour < 18) timeBuckets.afternoon.push(score);
      else timeBuckets.evening.push(score);
    });

    const avg = (arr) => (arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : null);
    return {
      morning: { avg: avg(timeBuckets.morning), count: timeBuckets.morning.length },
      midday: { avg: avg(timeBuckets.midday), count: timeBuckets.midday.length },
      afternoon: { avg: avg(timeBuckets.afternoon), count: timeBuckets.afternoon.length },
      evening: { avg: avg(timeBuckets.evening), count: timeBuckets.evening.length },
    };
  }, [moodLogs]);

  // --- moodByHydration ---
  const moodByHydration = useMemo(() => {
    const glassesThreshold = 8; // 8 glasses = 2000ml
    const mlThreshold = glassesThreshold * 250;
    const high = [];
    const low = [];

    datesWithBoth.forEach((dk) => {
      const dd = dayData[dk];
      const water = dd.waterIntake || 0;
      const mood = avgMoodByDate[dk];
      if (water >= mlThreshold) high.push(mood);
      else low.push(mood);
    });

    // Also check dates with mood but maybe no food yet water tracked
    Object.keys(avgMoodByDate).forEach((dk) => {
      if (datesWithBoth.includes(dk)) return; // already counted
      const dd = dayData[dk];
      if (!dd) return;
      const water = dd.waterIntake || 0;
      if (water > 0) {
        const mood = avgMoodByDate[dk];
        if (water >= mlThreshold) high.push(mood);
        else low.push(mood);
      }
    });

    const avg = (arr) => (arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : null);
    return {
      high: { avg: avg(high), count: high.length },
      low: { avg: avg(low), count: low.length },
    };
  }, [datesWithBoth, dayData, avgMoodByDate]);

  // --- weeklyMoodAverage ---
  const weeklyMoodAverage = useMemo(() => {
    const thisWeek = [];
    const lastWeek = [];

    for (let i = 0; i < 7; i++) {
      const dkThis = dateKeyOffset(i);
      const dkLast = dateKeyOffset(i + 7);
      if (avgMoodByDate[dkThis] !== undefined) thisWeek.push(avgMoodByDate[dkThis]);
      if (avgMoodByDate[dkLast] !== undefined) lastWeek.push(avgMoodByDate[dkLast]);
    }

    const avg = (arr) => (arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : null);
    const thisAvg = avg(thisWeek);
    const lastAvg = avg(lastWeek);
    let change = null;
    if (thisAvg !== null && lastAvg !== null && lastAvg > 0) {
      change = Math.round(((thisAvg - lastAvg) / lastAvg) * 100);
    }
    return {
      thisWeek: thisAvg,
      lastWeek: lastAvg,
      change,
      thisWeekDays: thisWeek.length,
      lastWeekDays: lastWeek.length,
    };
  }, [avgMoodByDate]);

  // --- Generated insights ---
  const insights = useMemo(() => {
    const list = [];

    // Macro insight
    const macroEntries = [
      { key: 'highProtein', label: 'high-protein' },
      { key: 'highCarb', label: 'high-carb' },
      { key: 'balanced', label: 'balanced' },
    ];
    const validMacros = macroEntries.filter((e) => moodByMacroSplit[e.key].avg !== null);
    if (validMacros.length >= 2) {
      const best = validMacros.reduce((a, b) =>
        (moodByMacroSplit[a.key].avg || 0) > (moodByMacroSplit[b.key].avg || 0) ? a : b
      );
      list.push(`You tend to feel best on days when you eat more ${best.label} meals.`);
    }

    // Hydration insight
    if (moodByHydration.high.avg !== null && moodByHydration.low.avg !== null) {
      const diff = moodByHydration.high.avg - moodByHydration.low.avg;
      if (diff > 0) {
        const pct = Math.round((diff / moodByHydration.low.avg) * 100);
        list.push(
          `Your mood is ${pct}% higher on days you drink 8+ glasses of water.`
        );
      }
    }

    // Calorie target insight
    if (moodByCalories.onTarget.avg !== null) {
      const onTarget = moodByCalories.onTarget.avg;
      const over = moodByCalories.over.avg || 0;
      const under = moodByCalories.under.avg || 0;
      if (onTarget > over && onTarget > under) {
        list.push('Staying within your calorie target correlates with your highest mood scores.');
      }
    }

    // Meal timing insight
    const timePeriods = [
      { key: 'morning', label: 'morning' },
      { key: 'midday', label: 'midday' },
      { key: 'afternoon', label: 'afternoon' },
      { key: 'evening', label: 'evening' },
    ];
    const validTimes = timePeriods.filter((t) => energyByMealTiming[t.key].avg !== null);
    if (validTimes.length >= 2) {
      const best = validTimes.reduce((a, b) =>
        (energyByMealTiming[a.key].avg || 0) > (energyByMealTiming[b.key].avg || 0) ? a : b
      );
      list.push(`Your energy tends to peak in the ${best.label}.`);
    }

    // Weekly comparison
    if (weeklyMoodAverage.change !== null) {
      if (weeklyMoodAverage.change > 0) {
        list.push(`Your mood is up ${weeklyMoodAverage.change}% compared to last week. Keep it up!`);
      } else if (weeklyMoodAverage.change < 0) {
        list.push(
          `Your mood is down ${Math.abs(weeklyMoodAverage.change)}% from last week. Consider reviewing what changed.`
        );
      }
    }

    // Best food insight
    if (bestFoodsForMood.length > 0) {
      const topFood = bestFoodsForMood[0];
      list.push(
        `${topFood.emoji} ${topFood.name} is associated with your best mood days (avg ${topFood.avgMood.toFixed(1)}/10).`
      );
    }

    // Digestion insight
    const goodDigestion = (moodLogs || []).filter((l) => l.digestionStatus === 'good');
    const badDigestion = (moodLogs || []).filter(
      (l) => l.digestionStatus === 'bloated' || l.digestionStatus === 'upset'
    );
    if (goodDigestion.length >= 3 && badDigestion.length >= 2) {
      const goodAvg = goodDigestion.reduce((s, l) => s + moodScore(l), 0) / goodDigestion.length;
      const badAvg = badDigestion.reduce((s, l) => s + moodScore(l), 0) / badDigestion.length;
      if (goodAvg > badAvg) {
        list.push('Good digestion days correlate with noticeably higher energy and focus.');
      }
    }

    return list;
  }, [
    moodByMacroSplit,
    moodByHydration,
    moodByCalories,
    energyByMealTiming,
    weeklyMoodAverage,
    bestFoodsForMood,
    moodLogs,
  ]);

  return {
    isLoading,
    hasEnoughData,
    datesWithBoth,
    moodByMacroSplit,
    moodByCalories,
    bestFoodsForMood,
    worstFoodsForMood,
    moodTrend,
    energyByMealTiming,
    moodByHydration,
    weeklyMoodAverage,
    insights,
    // Helpers
    emojiForScore,
  };
}

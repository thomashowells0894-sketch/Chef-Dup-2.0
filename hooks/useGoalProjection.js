import { useMemo } from 'react';
import { addDays, differenceInDays } from 'date-fns';

export default function useGoalProjection(weightEntries, weightGoal, dailyCalorieDeficit) {
  // Calculate weekly weight change rate from actual data
  const weeklyRate = useMemo(() => {
    if (!weightEntries || weightEntries.length < 2) return 0;
    const sorted = [...weightEntries].sort((a, b) => new Date(a.date) - new Date(b.date));
    const recent = sorted.slice(-14); // Last 2 weeks
    if (recent.length < 2) return 0;
    const first = recent[0];
    const last = recent[recent.length - 1];
    const days = differenceInDays(new Date(last.date), new Date(first.date));
    if (days === 0) return 0;
    return ((last.weight - first.weight) / days) * 7; // lbs per week
  }, [weightEntries]);

  // Project future weight based on current rate
  const projection = useMemo(() => {
    if (!weightEntries?.length || !weightGoal) return null;
    const sorted = [...weightEntries].sort((a, b) => new Date(b.date) - new Date(a.date));
    const currentWeight = sorted[0]?.weight; // Most recent
    if (!currentWeight) return null;

    const diff = weightGoal - currentWeight;
    if (Math.abs(diff) < 0.5) return { achieved: true, daysRemaining: 0, projectedDate: new Date(), currentWeight, goalWeight: weightGoal, weeklyRate: 0, dataPoints: [], progressPercentage: 100 };

    // Use actual rate if available, otherwise estimate from calorie deficit
    // 3500 cal = 1 lb of fat
    const effectiveRate = weeklyRate !== 0 ? weeklyRate : (dailyCalorieDeficit * 7) / 3500;

    if (effectiveRate === 0) return { achieved: false, daysRemaining: Infinity, projectedDate: null, currentWeight, goalWeight: weightGoal, weeklyRate: 0, dataPoints: [], progressPercentage: 0 };

    // Check if moving in right direction
    const movingRight = (diff > 0 && effectiveRate > 0) || (diff < 0 && effectiveRate < 0);
    if (!movingRight) return { achieved: false, daysRemaining: Infinity, projectedDate: null, wrongDirection: true, currentWeight, goalWeight: weightGoal, weeklyRate: Math.round(effectiveRate * 10) / 10, dataPoints: [], progressPercentage: 0 };

    const weeksNeeded = Math.abs(diff / effectiveRate);
    const daysNeeded = Math.round(weeksNeeded * 7);
    const projectedDate = addDays(new Date(), daysNeeded);

    // Generate projection data points (every week for the chart)
    const dataPoints = [];
    for (let w = 0; w <= Math.min(weeksNeeded, 52); w++) {
      dataPoints.push({
        date: addDays(new Date(), w * 7),
        weight: Math.round((currentWeight + effectiveRate * w) * 10) / 10,
      });
    }

    // Calculate progress: use the oldest entry as starting weight
    const oldestSorted = [...weightEntries].sort((a, b) => new Date(a.date) - new Date(b.date));
    const startWeight = oldestSorted[0]?.weight || currentWeight;
    const totalJourney = Math.abs(startWeight - weightGoal);
    const completed = Math.abs(startWeight - currentWeight);
    const progressPercentage = totalJourney > 0 ? Math.min(100, Math.round((completed / totalJourney) * 100)) : 0;

    return {
      achieved: false,
      currentWeight,
      goalWeight: weightGoal,
      startWeight,
      weeklyRate: Math.round(effectiveRate * 10) / 10,
      daysRemaining: daysNeeded,
      projectedDate,
      dataPoints,
      progressPercentage,
    };
  }, [weightEntries, weightGoal, weeklyRate, dailyCalorieDeficit]);

  return { projection, weeklyRate };
}

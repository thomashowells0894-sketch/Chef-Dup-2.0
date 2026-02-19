import { useMemo } from 'react';

interface CorrelationInsight {
  type: 'positive' | 'negative' | 'neutral';
  title: string;
  description: string;
  suggestion?: string;
}

interface SleepNutritionData {
  sleepHours: number;
  sleepQuality: number; // 0-100
  previousDayCalories: number;
  previousDayCaffeine?: number; // mg
  previousDayAlcohol?: number; // servings
  previousDayLateMealTime?: number; // hour (24h)
  calorieGoal: number;
}

export function useSleepNutritionCorrelation(
  data: SleepNutritionData[],
): CorrelationInsight[] {
  return useMemo(() => {
    if (!data || data.length < 7) return [];

    const insights: CorrelationInsight[] = [];

    // 1. Late eating vs sleep quality
    const lateMeals = data.filter(d => d.previousDayLateMealTime && d.previousDayLateMealTime >= 21);
    const earlyMeals = data.filter(d => d.previousDayLateMealTime && d.previousDayLateMealTime < 21);

    if (lateMeals.length >= 3 && earlyMeals.length >= 3) {
      const lateSleepAvg = lateMeals.reduce((s, d) => s + d.sleepQuality, 0) / lateMeals.length;
      const earlySleepAvg = earlyMeals.reduce((s, d) => s + d.sleepQuality, 0) / earlyMeals.length;

      if (earlySleepAvg - lateSleepAvg > 10) {
        insights.push({
          type: 'negative',
          title: 'Late meals affect your sleep',
          description: `Your sleep quality is ${Math.round(earlySleepAvg - lateSleepAvg)}% lower on nights after eating past 9pm.`,
          suggestion: 'Try finishing your last meal by 8pm.',
        });
      }
    }

    // 2. Calorie surplus vs sleep
    const overEating = data.filter(d => d.previousDayCalories > d.calorieGoal * 1.2);
    const normalEating = data.filter(d =>
      d.previousDayCalories >= d.calorieGoal * 0.8 &&
      d.previousDayCalories <= d.calorieGoal * 1.1
    );

    if (overEating.length >= 3 && normalEating.length >= 3) {
      const overSleepAvg = overEating.reduce((s, d) => s + d.sleepHours, 0) / overEating.length;
      const normalSleepAvg = normalEating.reduce((s, d) => s + d.sleepHours, 0) / normalEating.length;

      if (normalSleepAvg - overSleepAvg > 0.5) {
        insights.push({
          type: 'negative',
          title: 'Overeating reduces sleep duration',
          description: `You sleep ${(normalSleepAvg - overSleepAvg).toFixed(1)}h less on nights after overeating.`,
          suggestion: 'Staying closer to your calorie target may improve sleep.',
        });
      }
    }

    // 3. Good sleep -> better adherence
    const goodSleep = data.filter(d => d.sleepQuality >= 70);
    const poorSleep = data.filter(d => d.sleepQuality < 50);

    if (goodSleep.length >= 3 && poorSleep.length >= 3) {
      const goodAdherence = goodSleep.filter(d =>
        Math.abs(d.previousDayCalories - d.calorieGoal) < d.calorieGoal * 0.1
      ).length / goodSleep.length;
      const poorAdherence = poorSleep.filter(d =>
        Math.abs(d.previousDayCalories - d.calorieGoal) < d.calorieGoal * 0.1
      ).length / poorSleep.length;

      if (goodAdherence - poorAdherence > 0.2) {
        insights.push({
          type: 'positive',
          title: 'Better sleep = better eating',
          description: `You're ${Math.round((goodAdherence - poorAdherence) * 100)}% more likely to hit your calorie target after a good night's sleep.`,
        });
      }
    }

    return insights;
  }, [data]);
}
